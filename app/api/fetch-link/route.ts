// POST /api/fetch-link — 사용자가 준 온비드 링크의 페이지 글자를 읽어 와요 (온비드 주소만, 개인정보는 지워서 돌려줘요).
// 온비드가 서버의 접근을 막거나 화면이 자바스크립트로 그려지면 글자를 못 읽을 수 있어요. 그때는 사진·붙여넣기로 안내해요.
import { clientIp, takeLightRequest, TEXT_MAX } from "@/lib/rate-limit.ts";
import { maskPersonalInfo } from "@/lib/mask.ts";
import { LinkError, fetchLinkText } from "@/lib/fetch-link.ts";
import { parseAllowedLink } from "@/lib/input-source.ts";
import { errorResponse, readJsonLimited } from "@/lib/api.ts";

export const maxDuration = 15;

export async function POST(request: Request) {
  if (!takeLightRequest(clientIp(request.headers)).ok) return errorResponse("RATE_LIMITED");

  const read = await readJsonLimited(request, 4096);
  if (!read.ok) return errorResponse("BAD_REQUEST");
  const url = parseAllowedLink((read.body as { url?: unknown } | null)?.url);
  if (!url) return errorResponse("LINK_INVALID");

  let raw: string;
  try {
    raw = await fetchLinkText(url);
  } catch (e) {
    if (e instanceof LinkError) return errorResponse("LINK_FAILED");
    throw e;
  }
  const trimmed = raw.trim().slice(0, TEXT_MAX);
  if (trimmed.length < 20) return errorResponse("LINK_FAILED");
  const { text, masked } = maskPersonalInfo(trimmed);
  return Response.json({ text, masked });
}
