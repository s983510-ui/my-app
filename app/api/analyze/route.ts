// POST /api/analyze — 붙여넣은 공고문을 정리하고 종류를 정해, 주의사항까지 돌려줘요.
// Design Ref: §4.1 흐름 1~7단계, §4.5 응답 모양, §7 오류 처리, §8 보안
// 붙여넣은 글은 이 요청 안에서만 쓰고 저장하거나 기록하지 않아요.
import { clientIp, isTextLengthOk, takeRequest } from "@/lib/rate-limit.ts";
import { maskPersonalInfo } from "@/lib/mask.ts";
import { AiError, ConfigError, extractWithAi } from "@/lib/ai.ts";
import { decideCategory, emptyProperty, pickCandidates, sanitizeExtraction } from "@/lib/categorize.ts";
import { TableIncompleteError } from "@/lib/cautions.ts";
import { buildCategoryResult, namedCandidates } from "@/lib/result.ts";
import { errorResponse, readJsonLimited } from "@/lib/api.ts";

// 서버가 10초 안에 끝내도록 알려요 (AI 6초 제한 + 여유, DESIGN §7).
export const maxDuration = 10;

export async function POST(request: Request) {
  // 1. 요청 횟수 (두 API 공통)
  if (!takeRequest(clientIp(request.headers)).ok) return errorResponse("RATE_LIMITED");

  // 2. 본문 크기(너무 크면 읽지 않아요) → 글자 수
  const read = await readJsonLimited(request);
  if (!read.ok) return errorResponse(read.reason === "TOO_LARGE" ? "TEXT_LENGTH" : "BAD_REQUEST");
  const text = (read.body as { text?: unknown } | null)?.text;
  if (!isTextLengthOk(text)) return errorResponse("TEXT_LENGTH");

  // 3. 개인정보 지우기
  const { text: masked, masked: didMask } = maskPersonalInfo(text);

  // 4~6. AI ① → 결과 검사 → 확정 또는 후보
  let property = emptyProperty();
  let decision;
  let aiFallback = false;
  try {
    const raw = await extractWithAi(masked);
    const ex = sanitizeExtraction(raw, masked);
    property = ex.property;
    decision = decideCategory(ex, masked);
  } catch (e) {
    if (e instanceof ConfigError) return errorResponse("CONFIG");
    if (!(e instanceof AiError)) throw e;
    aiFallback = true;
    decision = { category: null, candidates: pickCandidates(masked, property, []) };
  }

  const base = { masked: didMask, property, aiFallback };
  if (decision.category === null) {
    return Response.json({
      ...base,
      category: null,
      candidates: namedCandidates(decision.candidates),
      cautions: null,
      tableCheckedAt: null,
    });
  }

  // 7. 주의사항 표에서 찾기
  try {
    return Response.json({ ...base, candidates: null, ...buildCategoryResult(decision.category, property) });
  } catch (e) {
    if (e instanceof TableIncompleteError) return errorResponse("TABLE_INCOMPLETE");
    throw e;
  }
}
