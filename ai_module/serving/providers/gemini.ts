import type { ChatMessage, LlmClient, LlmResponse, ProviderHealth } from "../types";

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
}

export function createGeminiClient(): LlmClient {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = normalizeGeminiModel(process.env.GEMINI_MODEL || "gemini-2.5-flash");

  return {
    health(): ProviderHealth {
      return {
        provider: "gemini",
        model,
        hasGeminiKey: Boolean(apiKey),
        missingEnv: apiKey ? undefined : "GEMINI_API_KEY",
      };
    },

    async chat(messages: ChatMessage[]): Promise<LlmResponse> {
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const systemText = messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");

      const contents = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        }));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          system_instruction: systemText ? { parts: [{ text: systemText }] } : undefined,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as GeminiResponse;
      if (!response.ok) {
        throw new Error(data.error?.message || `Gemini request failed with status ${response.status}`);
      }

      const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
      return {
        provider: "gemini",
        model,
        reply: reply || "Gemini did not return text.",
      };
    },
  };
}

function normalizeGeminiModel(model: string): string {
  return model.trim().replace(/^models\//, "") || "gemini-2.5-flash";
}
