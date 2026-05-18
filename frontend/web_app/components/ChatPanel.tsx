"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  Microscope,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import type { HealthResponse, UiMessage } from "@/lib/types";

type AnswerStyle = "concise" | "detailed" | "steps";
type SourceState = "idle" | "loading" | "weak" | "ready" | "error";
type ChatResponseStatus = "answered" | "insufficient_data";

interface ChatMessage extends UiMessage {
  id: string;
  createdAt: string;
  citations?: Citation[];
  sourceCards?: Citation[];
  responseStatus?: ChatResponseStatus;
  retrievalMode?: string;
}

interface Citation {
  citationIndex?: number | null;
  chunkId?: string | null;
  documentId?: string | null;
  title?: string | null;
  sourceUrl?: string | null;
  source_url?: string | null;
  sourceDomain?: string | null;
  category?: string | null;
  fileType?: string | null;
  documentType?: string | null;
  document_type?: string | null;
  preview?: string | null;
  score?: number | null;
}

const starterGroups: Array<{
  label: string;
  icon: LucideIcon;
  prompts: string[];
}> = [
  {
    label: "Tuyển sinh",
    icon: GraduationCap,
    prompts: [
      "Tóm tắt các mốc tuyển sinh đại học cần chú ý.",
      "Làm sao để kiểm tra thông báo tuyển sinh mới nhất?",
    ],
  },
  {
    label: "Chương trình đào tạo",
    icon: BookOpenCheck,
    prompts: [
      "Cho tôi biết các ngành đào tạo liên quan đến khoa học dữ liệu.",
      "So sánh thông tin chương trình đại học và sau đại học.",
    ],
  },
  {
    label: "Dịch vụ sinh viên",
    icon: ShieldCheck,
    prompts: [
      "Sinh viên cần chuẩn bị giấy tờ gì khi nhập học?",
      "Tìm hướng dẫn về ký túc xá, học phí hoặc biểu mẫu sinh viên.",
    ],
  },
  {
    label: "Nghiên cứu",
    icon: Microscope,
    prompts: [
      "Tìm thông tin về phòng thí nghiệm và hướng nghiên cứu.",
      "Liệt kê các nguồn liên quan đến nghiên cứu môi trường.",
    ],
  },
  {
    label: "Quy định",
    icon: FileSearch,
    prompts: [
      "Tóm tắt quy định hoặc thông báo quan trọng cho sinh viên.",
      "Khi câu trả lời thiếu nguồn chính thức, hãy nói rõ thiếu dữ liệu.",
    ],
  },
];

const routeSteps = [
  "Phân loại câu hỏi",
  "Tìm nguồn phù hợp",
  "Tạo câu trả lời",
  "Kiểm tra độ tin cậy",
];

const answerStyleLabels: Record<AnswerStyle, string> = {
  concise: "Ngắn gọn",
  detailed: "Chi tiết",
  steps: "Theo bước",
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowLabel() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("concise");
  const [officialOnly, setOfficialOnly] = useState(true);
  const [sourceState, setSourceState] = useState<SourceState>("idle");
  const [citations, setCitations] = useState<Citation[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: HealthResponse) => setHealth(data))
      .catch(() => setHealthError("Không đọc được /api/health."));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const missingProviderKey = health ? !health.hasGeminiKey : false;
  const hasMessages = messages.length > 0;
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  const providerLabel = useMemo(() => {
    if (!health) return "Đang kiểm tra provider";
    return `${health.provider} / ${health.model}`;
  }, [health]);

  async function sendMessage(rawContent: string) {
    const content = rawContent.trim();
    if (!content || isLoading) return;

    if (missingProviderKey) {
      setInput(content);
      setChatError("Chưa cấu hình GEMINI_API_KEY trên server. Không thể gửi câu hỏi lên LLM.");
      setSourceState("error");
      return;
    }

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content,
      createdAt: nowLabel(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setChatError(null);
    setCitations([]);
    setSourceState("loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answerStyle,
          officialOnly,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        answer?: string;
        reply?: string;
        error?: string;
        status?: ChatResponseStatus;
        retrievalMode?: string;
        retrievalStatus?: string;
        sourceCards?: Citation[];
        citations?: Citation[];
      };
      if (!response.ok) {
        throw new Error(data.error || "Không gửi được yêu cầu chat");
      }

      const nextCitations = data.citations ?? data.sourceCards ?? [];
      const reply = data.answer || data.reply || "LLM không trả về nội dung.";
      setCitations(nextCitations);
      setSourceState(data.status === "insufficient_data" || data.retrievalStatus === "weak" ? "weak" : nextCitations.length > 0 ? "ready" : "weak");
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          content: reply,
          createdAt: nowLabel(),
          citations: nextCitations,
          sourceCards: data.sourceCards ?? nextCitations,
          responseStatus: data.status,
          retrievalMode: data.retrievalMode,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không gọi được API chat.";
      setChatError(message);
      setSourceState("error");
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          content: `Chưa gọi được LLM: ${message}`,
          createdAt: nowLabel(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleStarterPrompt(prompt: string) {
    if (missingProviderKey) {
      setInput(prompt);
      setChatError("Chưa cấu hình GEMINI_API_KEY trên server. Prompt đã được đưa vào ô nhập để dùng sau.");
      return;
    }
    void sendMessage(prompt);
  }

  return (
    <AppFrame
      contentClassName="lg:py-4"
      rightRailTitle="Nguồn và kiểm chứng"
      rightRail={
        <ChatInspector
          health={health}
          healthError={healthError}
          providerLabel={providerLabel}
          sourceState={sourceState}
          citations={citations}
          isLoading={isLoading}
          hasMessages={hasMessages}
          officialOnly={officialOnly}
          answerStyle={answerStyle}
          lastAssistant={lastAssistant}
        />
      }
    >
      <div className="flex h-[calc(100dvh-5.5rem)] min-h-[680px] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-panel lg:h-[calc(100dvh-2rem)]">
        <header className="border-b border-line bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal text-ink">Lumi Chat</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Trợ lý AI tiếng Việt cho tri thức HUS, ưu tiên câu trả lời rõ nguồn và trạng thái kiểm chứng.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusPill tone="neutral" label={providerLabel} />
              <StatusPill
                tone={health?.hasGeminiKey ? "success" : "warning"}
                label={health?.hasGeminiKey ? "LLM sẵn sàng" : "Thiếu GEMINI_API_KEY"}
              />
              <StatusPill tone={health?.mode === "production_db" ? "success" : "neutral"} label={health?.mode ?? "runtime"} />
            </div>
          </div>

          {missingProviderKey ? (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <KeyRound className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <p>
                Chưa có `GEMINI_API_KEY` trong server environment. UI vẫn hoạt động để kiểm thử production shell,
                nhưng gửi chat sẽ bị chặn cho đến khi cấu hình key.
              </p>
            </div>
          ) : null}
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto bg-mist/60 px-3 py-4 sm:px-5">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {!hasMessages ? <EmptyChatState onPrompt={handleStarterPrompt} /> : null}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {sourceState === "weak" && lastAssistant ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                Ngữ cảnh truy xuất chưa đủ mạnh. Lumi sẽ không bịa câu trả lời; hãy kiểm tra nguồn chính thức hoặc bổ sung tài liệu vào Data Layer.
              </div>
            ) : null}

            {isLoading ? <LoadingState /> : null}
            <div ref={scrollRef} />
          </div>
        </section>

        <footer className="border-t border-line bg-white px-3 py-3 sm:px-5">
          {chatError ? (
            <div className="mx-auto mb-3 flex max-w-4xl items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span>{chatError}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mx-auto grid max-w-4xl gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-mist p-1">
                {(Object.keys(answerStyleLabels) as AnswerStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setAnswerStyle(style)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      answerStyle === style ? "bg-white text-teal shadow-sm" : "text-slate-600 hover:text-ink"
                    }`}
                  >
                    {answerStyleLabels[style]}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={officialOnly}
                  onChange={(event) => setOfficialOnly(event.target.checked)}
                  className="h-4 w-4 accent-teal"
                />
                Chỉ ưu tiên nguồn chính thức
              </label>
            </div>

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                className="min-h-[56px] flex-1 resize-none rounded-lg border border-line bg-mist px-3 py-3 text-sm leading-6 text-ink placeholder:text-slate-400 focus:border-teal focus:bg-white"
                placeholder="Nhập câu hỏi cho Lumi..."
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || input.trim().length === 0 || missingProviderKey}
                className="grid h-[56px] w-[56px] place-items-center rounded-lg bg-teal text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:bg-slate-300"
                title="Gửi tin nhắn"
                aria-label="Gửi tin nhắn"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </form>
        </footer>
      </div>
    </AppFrame>
  );
}

function EmptyChatState({ onPrompt }: Readonly<{ onPrompt: (prompt: string) => void }>) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-teal text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-ink">Bắt đầu với một câu hỏi có thể kiểm chứng</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Chọn một nhóm prompt hoặc nhập trực tiếp. Lumi sẽ truy xuất nguồn trước, trả lời bằng Gemini server-side, rồi gắn citation nếu có ngữ cảnh đủ mạnh.
          </p>
        </div>
        <span className="rounded-lg border border-line bg-mist px-3 py-2 text-xs font-semibold text-slate-600">
          Chat trống
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {starterGroups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.label} className="rounded-lg border border-line bg-mist p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-teal">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-semibold text-ink">{group.label}</h3>
              </div>
              <div className="grid gap-2">
                {group.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPrompt(prompt)}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-left text-sm leading-5 text-slate-700 transition hover:border-teal hover:text-ink"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ message }: Readonly<{ message: ChatMessage }>) {
  const isUser = message.role === "user";
  const citations = message.role === "assistant" ? message.citations ?? [] : [];
  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span className="mt-1 grid h-9 w-9 flex-none place-items-center rounded-lg bg-teal text-white">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
      <div className={`max-w-[86%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-lg px-4 py-3 text-sm leading-6 ${
            isUser ? "bg-ink text-white" : "border border-line bg-white text-slate-800 shadow-sm"
          }`}
        >
          <CitedText text={message.content} citations={citations} />
        </div>
        {!isUser && citations.length > 0 ? (
          <div className="grid w-full gap-2">
            {citations.slice(0, 3).map((citation, index) => (
              <SourceMiniCard key={`${citation.chunkId ?? citation.title ?? "source"}-${index}`} citation={citation} />
            ))}
          </div>
        ) : null}
        <span className="px-1 text-[11px] font-medium text-slate-500">{message.createdAt}</span>
      </div>
      {isUser ? (
        <span className="mt-1 grid h-9 w-9 flex-none place-items-center rounded-lg bg-slate-200 text-ink">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
    </article>
  );
}

function CitedText({ text, citations }: Readonly<{ text: string; citations: Citation[] }>) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        const citationIndex = Number(match[1]);
        const citation = citations.find((item) => item.citationIndex === citationIndex);
        return (
          <span
            key={`${part}-${index}`}
            title={citation?.title ?? `Nguồn ${citationIndex}`}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal px-1.5 text-[11px] font-semibold text-white"
          >
            {citationIndex}
          </span>
        );
      })}
    </p>
  );
}

function SourceMiniCard({ citation }: Readonly<{ citation: Citation }>) {
  const href = getCitationUrl(citation);
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink">
          [{citation.citationIndex ?? "?"}] {citation.title ?? "Nguồn chưa đặt tên"}
        </p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="grid h-6 w-6 flex-none place-items-center rounded-md text-teal hover:bg-mist" title="Mở nguồn">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 leading-5 text-slate-600">{citation.preview ?? "Không có preview."}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Loader2 className="h-4 w-4 animate-spin text-teal" aria-hidden="true" />
        Lumi đang xử lý
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {routeSteps.map((step, index) => (
          <div key={step} className="rounded-lg bg-mist px-3 py-2 text-xs font-medium text-slate-600">
            <span className="mb-1 block text-[11px] font-semibold text-teal">0{index + 1}</span>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatInspector({
  health,
  healthError,
  providerLabel,
  sourceState,
  citations,
  isLoading,
  hasMessages,
  officialOnly,
  answerStyle,
  lastAssistant,
}: Readonly<{
  health: HealthResponse | null;
  healthError: string | null;
  providerLabel: string;
  sourceState: SourceState;
  citations: Citation[];
  isLoading: boolean;
  hasMessages: boolean;
  officialOnly: boolean;
  answerStyle: AnswerStyle;
  lastAssistant?: ChatMessage;
}>) {
  const warnings = health?.warnings ?? [];

  return (
    <div className="grid gap-3">
      <section className="rounded-lg border border-line bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Sẵn sàng runtime</h2>
          <StatusDot ready={Boolean(health?.hasGeminiKey)} />
        </div>
        <div className="mt-3 grid gap-2 text-xs">
          <ReadinessRow label="LLM" value={providerLabel} ready={Boolean(health?.hasGeminiKey)} />
          <ReadinessRow label="CSDL" value={health?.hasDatabase ? "đã cấu hình" : "chưa cấu hình"} ready={Boolean(health?.hasDatabase)} />
          <ReadinessRow label="Lưu trữ" value={health?.hasStorage ? "đã cấu hình" : "chưa cấu hình"} ready={Boolean(health?.hasStorage)} />
          <ReadinessRow label="Auth" value={health?.authProvider ?? "đang kiểm tra"} ready={Boolean(health?.hasAuth)} />
        </div>
        {healthError ? <p className="mt-3 text-xs leading-5 text-rose-700">{healthError}</p> : null}
      </section>

      <section className="rounded-lg border border-line bg-white p-3">
        <h2 className="text-sm font-semibold text-ink">Chế độ ngữ cảnh</h2>
        <div className="mt-3 grid gap-2 text-xs text-slate-600">
          <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
            <span>Nguồn chính thức</span>
            <strong className="text-ink">{officialOnly ? "Bật" : "Tắt"}</strong>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
            <span>Kiểu trả lời</span>
            <strong className="text-ink">{answerStyleLabels[answerStyle]}</strong>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Kiểm chứng nguồn</h2>
          <SourceStateBadge state={sourceState} isLoading={isLoading} />
        </div>
        <div className="mt-3">
          {sourceState === "idle" && !hasMessages ? (
            <InspectorEmpty icon={Database} title="Chưa truy xuất nguồn" text="Nguồn và citation sẽ xuất hiện ở đây sau khi có câu trả lời." />
          ) : null}
          {sourceState === "loading" ? (
            <InspectorEmpty icon={Clock3} title="Đang kiểm tra ngữ cảnh" text="Lumi đang chạy luồng hỏi đáp và chuẩn bị trạng thái kiểm chứng." />
          ) : null}
          {sourceState === "weak" ? (
            <div className="grid gap-2">
              <InspectorEmpty
                icon={CircleAlert}
                title="Nguồn truy xuất yếu"
                text="Retrieval không tìm được ngữ cảnh đủ mạnh. Chat trả về insufficient_data thay vì tạo câu trả lời không có căn cứ."
              />
              {citations.map((citation, index) => (
                <SourceDrawerCard key={`${citation.chunkId ?? citation.title ?? "weak-source"}-${index}`} citation={citation} index={index} />
              ))}
            </div>
          ) : null}
          {sourceState === "error" ? (
            <InspectorEmpty icon={AlertCircle} title="Không hoàn tất kiểm chứng" text="Kiểm tra cấu hình provider hoặc phản hồi lỗi từ API chat." />
          ) : null}
          {sourceState === "ready" ? (
            <div className="grid gap-2">
              {citations.map((citation, index) => (
                <SourceDrawerCard key={`${citation.chunkId ?? citation.title ?? "source"}-${index}`} citation={citation} index={index} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-3">
        <h2 className="text-sm font-semibold text-ink">Chất lượng trả lời</h2>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
          <QualityItem ready={Boolean(lastAssistant)} text={lastAssistant ? "Đã có câu trả lời mới nhất." : "Chưa có câu trả lời."} />
          <QualityItem ready={sourceState === "ready"} text={sourceState === "ready" ? "Có citation và source card đi kèm." : "Chưa có ngữ cảnh đủ mạnh để trích dẫn."} />
          <QualityItem ready={!warnings.length} text={warnings.length ? `${warnings.length} cảnh báo runtime.` : "Không có cảnh báo runtime từ /api/health."} />
        </div>
      </section>
    </div>
  );
}

function SourceDrawerCard({ citation, index }: Readonly<{ citation: Citation; index: number }>) {
  const href = getCitationUrl(citation);
  const score = typeof citation.score === "number" ? citation.score.toFixed(2) : null;
  const fileType = citation.fileType ?? citation.documentType ?? citation.document_type ?? null;
  return (
    <article className="rounded-lg border border-line bg-mist p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase text-teal">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nguồn [{citation.citationIndex ?? index + 1}]</span>
          </div>
          <p className="font-semibold leading-5 text-ink">{citation.title ?? `Nguồn ${index + 1}`}</p>
        </div>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="grid h-7 w-7 flex-none place-items-center rounded-md text-teal hover:bg-white" title="Mở nguồn">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-4 leading-5 text-slate-600">{citation.preview ?? href ?? "Không có preview."}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {citation.category ? <SourceTag label={citation.category} /> : null}
        {fileType ? <SourceTag label={fileType} /> : null}
        {score ? <SourceTag label={`điểm ${score}`} /> : null}
      </div>
    </article>
  );
}

function SourceTag({ label }: Readonly<{ label: string }>) {
  return <span className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">{label}</span>;
}

function StatusPill({ tone, label }: Readonly<{ tone: "success" | "warning" | "neutral"; label: string }>) {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-line bg-mist text-slate-700",
  };
  return <span className={`rounded-lg border px-3 py-2 font-semibold ${classes[tone]}`}>{label}</span>;
}

function StatusDot({ ready }: Readonly<{ ready: boolean }>) {
  return <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />;
}

function ReadinessRow({ label, value, ready }: Readonly<{ label: string; value: string; ready: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-mist px-3 py-2">
      <span className="font-medium text-slate-600">{label}</span>
      <span className={`truncate text-right font-semibold ${ready ? "text-emerald-700" : "text-amber-800"}`}>{value}</span>
    </div>
  );
}

function SourceStateBadge({ state, isLoading }: Readonly<{ state: SourceState; isLoading: boolean }>) {
  const labelByState: Record<SourceState, string> = {
    idle: "chờ",
    loading: "đang tải",
    weak: "nguồn yếu",
    ready: "sẵn sàng",
    error: "lỗi",
  };
  const label = isLoading ? labelByState.loading : labelByState[state];
  const tone = state === "ready"
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : state === "weak" || state === "error"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-slate-600 bg-mist border-line";
  return <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${tone}`}>{label}</span>;
}

function InspectorEmpty({
  icon: Icon,
  title,
  text,
}: Readonly<{
  icon: LucideIcon;
  title: string;
  text: string;
}>) {
  return (
    <div className="rounded-lg bg-mist p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="h-4 w-4 text-teal" aria-hidden="true" />
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function QualityItem({ ready, text }: Readonly<{ ready: boolean; text: string }>) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-mist px-3 py-2">
      {ready ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 flex-none text-amber-700" aria-hidden="true" />
      )}
      <span>{text}</span>
    </div>
  );
}

function getCitationUrl(citation: Citation) {
  return citation.sourceUrl ?? citation.source_url ?? null;
}
