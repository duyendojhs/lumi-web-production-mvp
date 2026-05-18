export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type LlmProviderName = "gemini";

export interface ProviderHealth {
  provider: LlmProviderName;
  model: string;
  hasGeminiKey: boolean;
  missingEnv?: string;
}

export interface LlmResponse {
  reply: string;
  provider: LlmProviderName;
  model: string;
}

export interface LlmClient {
  chat(messages: ChatMessage[]): Promise<LlmResponse>;
  health(): ProviderHealth;
}
