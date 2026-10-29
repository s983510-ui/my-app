// POST /api/ocr — 사진(캡처)에서 글자를 읽어 글로 돌려줘요. 읽은 글은 개인정보를 지워서 돌려줘요.
// 읽은 글을 화면 붙여넣기 칸에 넣어 주면, 사용자가 확인·수정한 뒤 [분석하기]를 눌러요. 사진과 글은 저장하지 않아요.
import { clientIp, takeRequest, TEXT_MAX } from "@/lib/rate-limit.ts";
import { maskPersonalInfo } from "@/lib/mask.ts";
import { AiError, ConfigError } from "@/lib/ai.ts";
import { readImageText } from "@/lib/ocr.ts";
import { IMAGE_BODY_MAX_BYTES, checkImageDataUrl } from "@/lib/input-source.ts";
import { errorResponse, readJsonLimited } from "@/lib/api.ts";

// 사진 읽기는 시간이 더 걸려서 AI ①(6초)보다 길게 잡아요.
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!takeRequest(clientIp(request.headers)).ok) return errorResponse("RATE_LIMITED");

  const read = await readJsonLimited(request, IMAGE_BODY_MAX_BYTES);
  if (!read.ok) return errorResponse(read.reason === "TOO_LARGE" ? "IMAGE_INVALID" : "BAD_REQUEST");
  const body = read.body as { image?: unknown; consent?: unknown } | null;
  // 사진 속 이름·주소 같은 개인정보는 글로 읽기 전에는 지울 수 없어서, 사용자가 전달에 동의했을 때만 AI로 보내요 (PRD 7번).
  if (body?.consent !== true) return errorResponse("CONSENT_REQUIRED");
  const image = body.image;
  if (!checkImageDataUrl(image).ok) return errorResponse("IMAGE_INVALID");

  let raw: string;
  try {
    raw = await readImageText(image as string);
  } catch (e) {
    if (e instanceof ConfigError) return errorResponse("CONFIG");
    if (e instanceof AiError) return errorResponse("OCR_FAILED");
    throw e;
  }
  const trimmed = raw.trim().slice(0, TEXT_MAX);
  if (trimmed.length < 5) return errorResponse("OCR_FAILED");
  const { text, masked } = maskPersonalInfo(trimmed);
  return Response.json({ text, masked });
}
