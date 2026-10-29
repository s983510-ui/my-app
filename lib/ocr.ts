// 사진(캡처)의 글자를 읽어 글로 바꿔요 (OpenAI 이미지 입력). 글로 바꾼 뒤의 분석은 기존 AI ①이 그대로 해요.
// - 이 함수는 "보이는 글자를 옮겨 적기"만 해요. 요약·판단·보충은 하지 않아요.
// - 키는 서버에서만 읽어요. AI_STUB=1이면(내 PC 시험용) 정해진 글을 돌려줘요. 운영에서는 쓸 수 없어요.
import { AiError, ConfigError } from "./ai.ts";

export const OCR_TIMEOUT_MS = 20000;
const MODEL = "gpt-4o-mini";

const PROMPT = `이 이미지는 온비드 공매 물건 공고 화면을 찍거나 캡처한 것입니다.
이미지에 보이는 글자를 줄바꿈을 살려 그대로 옮겨 적으세요.
요약·해석·추측을 하지 말고, 읽을 수 없는 부분은 건너뛰세요.
글자가 하나도 없으면 빈 문자열만 답하세요.`;

/** 시험용 흉내가 돌려주는 글. 일부러 가짜 전화번호를 넣어 개인정보 지우기를 시험해요. */
export const OCR_STUB_TEXT = `[사진 읽기 시험]
소재지: 경상남도 창녕군 가상면 가상리 101
지목: 답
면적: 1,652 ㎡
최저입찰가: 18,500,000원
문의: 담당자 010-1234-5678 (가상 번호)`;

/** data 주소로 받은 사진에서 글자를 읽어 돌려줘요. */
export async function readImageText(dataUrl: string): Promise<string> {
  if (process.env.AI_STUB === "1") {
    if (process.env.NODE_ENV === "production") throw new ConfigError("AI_STUB는 운영에서 쓸 수 없어요");
    return OCR_STUB_TEXT;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ConfigError("OPENAI_API_KEY가 없어요");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AiError(`OpenAI 응답 ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new AiError("OpenAI 응답 내용이 없어요");
    return content;
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e instanceof Error ? e.name : "unknown");
  } finally {
    clearTimeout(timer);
  }
}
