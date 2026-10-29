// 서버 API의 오류 응답 모양을 한곳에서 만들어요.
// Design Ref: §7.1 오류 코드 — { "error": { "code", "message" } }

export type ErrorCode =
  | "TEXT_LENGTH"
  | "BAD_CATEGORY"
  | "RATE_LIMITED"
  | "TABLE_INCOMPLETE"
  | "CONFIG"
  | "BAD_REQUEST"
  | "CONSENT_REQUIRED"
  | "IMAGE_INVALID"
  | "OCR_FAILED"
  | "LINK_INVALID"
  | "LINK_FAILED";

export const MESSAGES: Record<ErrorCode, string> = {
  TEXT_LENGTH: "20자 이상 10,000자 이하로 붙여넣어 주세요",
  BAD_CATEGORY: "종류를 다시 골라 주세요",
  RATE_LIMITED: "잠시 후 다시 시도해 주세요",
  TABLE_INCOMPLETE: "안내를 준비하지 못했어요. 잠시 후 다시 시도해 주세요",
  CONFIG: "서버 설정이 필요해요",
  BAD_REQUEST: "요청 형식이 올바르지 않아요",
  CONSENT_REQUIRED: "사진이 외부 AI(OpenAI)로 전달되는 것에 동의해 주세요",
  IMAGE_INVALID: "사진을 읽을 수 없어요. jpg·png 사진을 다시 올려 주세요",
  OCR_FAILED: "사진에서 글자를 읽지 못했어요. 더 선명한 사진으로 다시 올리거나 글을 붙여넣어 주세요",
  LINK_INVALID: "온비드(onbid.co.kr) 링크만 불러올 수 있어요",
  LINK_FAILED: "링크에서 글자를 읽지 못했어요. 사진을 올리거나 글을 붙여넣어 주세요",
};

const STATUS: Record<ErrorCode, number> = {
  TEXT_LENGTH: 400,
  BAD_CATEGORY: 400,
  RATE_LIMITED: 429,
  TABLE_INCOMPLETE: 500,
  CONFIG: 500,
  BAD_REQUEST: 400,
  CONSENT_REQUIRED: 400,
  IMAGE_INVALID: 400,
  OCR_FAILED: 502,
  LINK_INVALID: 400,
  LINK_FAILED: 502,
};

/** 오류 응답을 만들어요. 서버 기록에는 붙여넣은 글 없이 오류 코드만 남겨요(DESIGN §8). */
export function errorResponse(code: ErrorCode, message?: string): Response {
  if (STATUS[code] >= 500) console.error(`[auction-caution] ${code}`);
  return Response.json({ error: { code, message: message ?? MESSAGES[code] } }, { status: STATUS[code] });
}

/** 한 번에 받는 요청 본문의 최대 크기(바이트). 한글 10,000자는 30,000바이트라서 여유를 둬요(DESIGN §8). */
export const BODY_MAX_BYTES = 65536;

/**
 * 요청 본문을 크기 제한 안에서만 읽어 JSON으로 바꿔요.
 * 선언된 크기가 크면 읽지 않고, 선언이 없어도 제한을 넘는 순간 멈춰요.
 */
export async function readJsonLimited(
  request: Request,
  maxBytes: number = BODY_MAX_BYTES,
): Promise<{ ok: true; body: unknown } | { ok: false; reason: "TOO_LARGE" | "BAD_JSON" }> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return { ok: false, reason: "TOO_LARGE" };

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, reason: "BAD_JSON" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: "TOO_LARGE" };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, reason: "BAD_JSON" };
  }
}
