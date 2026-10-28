// 서버 API의 오류 응답 모양을 한곳에서 만들어요.
// Design Ref: §7.1 오류 코드 — { "error": { "code", "message" } }

export type ErrorCode = "TEXT_LENGTH" | "BAD_CATEGORY" | "RATE_LIMITED" | "TABLE_INCOMPLETE" | "CONFIG" | "BAD_REQUEST";

const MESSAGES: Record<ErrorCode, string> = {
  TEXT_LENGTH: "20자 이상 10,000자 이하로 붙여넣어 주세요",
  BAD_CATEGORY: "종류를 다시 골라 주세요",
  RATE_LIMITED: "잠시 후 다시 시도해 주세요",
  TABLE_INCOMPLETE: "안내를 준비하지 못했어요. 잠시 후 다시 시도해 주세요",
  CONFIG: "서버 설정이 필요해요",
  BAD_REQUEST: "요청 형식이 올바르지 않아요",
};

const STATUS: Record<ErrorCode, number> = {
  TEXT_LENGTH: 400,
  BAD_CATEGORY: 400,
  RATE_LIMITED: 429,
  TABLE_INCOMPLETE: 500,
  CONFIG: 500,
  BAD_REQUEST: 400,
};

/** 오류 응답을 만들어요. 서버 기록에는 붙여넣은 글 없이 오류 코드만 남겨요(DESIGN §8). */
export function errorResponse(code: ErrorCode): Response {
  if (STATUS[code] >= 500) console.error(`[auction-caution] ${code}`);
  return Response.json({ error: { code, message: MESSAGES[code] } }, { status: STATUS[code] });
}
