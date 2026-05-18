import { NextResponse } from "next/server";
import { chatWithLlm } from "@/lib/server/llm/llm_provider";
import type { ChatMessage } from "@/lib/server/llm/types";
import { getCurrentUser } from "@/lib/server/auth/session";
import { retrieveRagContext, toPublicRagPayload, type RagRetrievalResult } from "@/lib/server/rag/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerStyle = "concise" | "detailed" | "steps";

interface ChatRequestBody {
  messages?: ChatMessage[];
  question?: string;
  answerStyle?: AnswerStyle;
  officialOnly?: boolean;
  limit?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ChatRequestBody;
    const messages = Array.isArray(body.messages) ? normalizeMessages(body.messages) : [];
    const question = (body.question ?? latestUserQuestion(messages)).trim();

    if (!question) {
      return NextResponse.json({ error: "question or user message is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const retrieval = await retrieveRagContext(question, {
      limit: body.limit ?? 6,
      officialOnly: body.officialOnly ?? true,
      userId: user?.profileId,
    });

    if (retrieval.status !== "ready") {
      const answer = insufficientDataAnswer(retrieval);
      return NextResponse.json({
        ...toPublicRagPayload(retrieval),
        answer,
        reply: answer,
        status: "insufficient_data",
        retrievalStatus: retrieval.status,
        provider: "rag",
        model: "retrieval",
      });
    }

    const result = await chatWithLlm([
      {
        role: "system",
        content: buildGroundedSystemInstruction(body.answerStyle ?? "concise", body.officialOnly ?? true),
      },
      {
        role: "user",
        content: buildGroundedUserPrompt(question, retrieval),
      },
    ]);
    const answer = ensureCitationMarkers(result.reply, retrieval);

    return NextResponse.json({
      ...toPublicRagPayload(retrieval),
      answer,
      reply: answer,
      status: "answered",
      retrievalStatus: retrieval.status,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed";
    const status = message.startsWith("Missing") || message.includes("question") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function latestUserQuestion(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
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

function buildGroundedSystemInstruction(answerStyle: AnswerStyle, officialOnly: boolean) {
  const styleInstruction =
    answerStyle === "steps"
      ? "Trình bày theo các bước rõ ràng."
      : answerStyle === "detailed"
        ? "Trả lời chi tiết, có cấu trúc."
        : "Trả lời ngắn gọn, đi thẳng vào câu hỏi.";

  return [
    "Bạn là Lumi, trợ lý AI tiếng Việt cho tri thức học thuật HUS.",
    "Chỉ trả lời dựa trên phần NGUỒN TRUY XUẤT được cung cấp trong prompt.",
    "Mọi thông tin quan trọng phải có citation marker đúng dạng [1], [2] tương ứng với nguồn.",
    "Không tự tạo nguồn, đường dẫn, ngày tháng, quy định hoặc dữ kiện không có trong nguồn.",
    "Nếu nguồn không đủ để trả lời chắc chắn, hãy nói rõ là chưa đủ dữ liệu thay vì suy đoán.",
    officialOnly ? "Ưu tiên ngôn ngữ thận trọng cho nguồn chính thức." : "Có thể diễn giải tự nhiên nhưng vẫn phải bám nguồn.",
    styleInstruction,
  ].join(" ");
}

function buildGroundedUserPrompt(question: string, retrieval: RagRetrievalResult) {
  return [
    `CÂU HỎI: ${question}`,
    "",
    "NGUỒN TRUY XUẤT:",
    retrieval.contextText,
    "",
    "YÊU CẦU:",
    "- Trả lời bằng tiếng Việt.",
    "- Dùng citation marker [n] ngay sau ý được trích dẫn.",
    "- Không nhắc đến nguồn không có trong danh sách.",
  ].join("\n");
}

function insufficientDataAnswer(retrieval: RagRetrievalResult) {
  if (retrieval.total === 0) {
    return "Mình chưa tìm thấy nguồn đủ mạnh trong kho dữ liệu hiện tại để trả lời câu hỏi này. Vui lòng kiểm tra lại nguồn chính thức hoặc bổ sung tài liệu vào Data Layer.";
  }
  return "Mình có tìm thấy một vài đoạn liên quan, nhưng ngữ cảnh chưa đủ mạnh để trả lời chắc chắn. Vui lòng kiểm tra các nguồn gợi ý hoặc bổ sung tài liệu trước khi dùng câu trả lời cho quyết định quan trọng.";
}

function ensureCitationMarkers(answer: string, retrieval: RagRetrievalResult) {
  if (/\[\d+\]/.test(answer) || retrieval.citations.length === 0) return answer;
  const markers = retrieval.citations
    .slice(0, 3)
    .map((citation) => `[${citation.citationIndex}]`)
    .join(" ");
  return `${answer.trim()}\n\nNguồn tham khảo: ${markers}`;
}
