export interface UiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface HealthResponse {
  status: "ok";
  provider: "gemini";
  model: string;
  hasGeminiKey: boolean;
  hasDatabase?: boolean;
  hasStorage?: boolean;
  hasAuth?: boolean;
  hasVector?: boolean;
  hasJobs?: boolean;
  authProvider?: string;
  dataRawDetected: boolean;
  mode?: string;
  runtimeMode?: string;
  appEnv?: string;
  warnings?: string[];
}
