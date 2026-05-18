import { createGeminiClient } from "./providers/gemini";
import type { ChatMessage, LlmClient, ProviderHealth } from "./types";

export function getLlmClient(): LlmClient {
  return createGeminiClient();
}

export function getProviderHealth(): ProviderHealth {
  return getLlmClient().health();
}

export async function chatWithLlm(messages: ChatMessage[]) {
  const normalized = normalizeMessages(messages);
  if (normalized.length === 0) {
    throw new Error("No chat messages provided");
  }
  return getLlmClient().chat(normalized);
}

function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((message) => {
      return (
        message &&
        ["system", "user", "assistant"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 12000),
    }))
    .slice(-12);
}
