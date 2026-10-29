// POST /api/cautions — 후보 중 하나를 고른 뒤, 그 종류의 주의사항을 돌려줘요.
// Design Ref: §4.1 마지막 줄, §4.5 요청·응답 / 요청 횟수는 /api/analyze와 함께 세요.
import { clientIp, takeRequest } from "@/lib/rate-limit.ts";
import { isCategoryId } from "@/data/categories.ts";
import { emptyProperty } from "@/lib/categorize.ts";
import { PROPERTY_FIELDS } from "@/lib/types.ts";
import { TableIncompleteError } from "@/lib/cautions.ts";
import { buildCategoryResult } from "@/lib/result.ts";
import { errorResponse, readJsonLimited } from "@/lib/api.ts";

const VALUE_MAX = 100;

// 서버가 10초 안에 끝내도록 알려요 (AI 6초 제한 + 여유, DESIGN §7).
export const maxDuration = 10;

export async function POST(request: Request) {
  if (!takeRequest(clientIp(request.headers)).ok) return errorResponse("RATE_LIMITED");

  // 이 요청은 종류 id와 짧은 물건 정보뿐이라 본문을 작게 받아요.
  const read = await readJsonLimited(request, 16384);
  if (!read.ok) return errorResponse("BAD_REQUEST");
  const body = read.body as { categoryId?: unknown; property?: unknown } | null;
  if (!isCategoryId(body?.categoryId)) return errorResponse("BAD_CATEGORY");

  // 물건 정보는 강조 조건 대조에만 써요. 정해진 9칸만, 값은 100자까지 받아요.
  const property = emptyProperty();
  const raw = body?.property && typeof body.property === "object" ? (body.property as Record<string, unknown>) : {};
  for (const field of PROPERTY_FIELDS) {
    const v = raw[field];
    if (typeof v === "string") property[field] = v.slice(0, VALUE_MAX);
  }

  try {
    return Response.json(buildCategoryResult(body.categoryId, property));
  } catch (e) {
    if (e instanceof TableIncompleteError) return errorResponse("TABLE_INCOMPLETE");
    throw e;
  }
}
