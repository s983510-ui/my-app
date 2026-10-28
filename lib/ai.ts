// OpenAI에 공고문 정리·종류 판정(AI ①)을 요청해요. 화면에서 부르는 AI는 이것 하나뿐이에요.
// Design Ref: §4.2 4단계, §5.1 지시문, §6.3 환경변수 / PRD must 1 규칙 1~3
// - 모델 gpt-4o-mini, 온도 0, JSON 응답, 6초 제한
// - 키(OPENAI_API_KEY)는 이 서버 파일에서만 읽어요.
// - AI_STUB=1이면(이 작업 공간 시험용) 인터넷 없이 정해진 규칙으로 흉내 내요. 운영에서는 쓸 수 없어요.
import { PROPERTY_FIELDS } from "./types.ts";
import { CATEGORY_IDS } from "../data/categories.ts";
import { emptyProperty, scoreByClues } from "./categorize.ts";

export const AI_TIMEOUT_MS = 6000;
const MODEL = "gpt-4o-mini";

/** AI 응답을 받지 못했어요 (실패·시간 초과). 화면은 후보 고르기로 넘어가요. */
export class AiError extends Error {}
/** 서버 설정 문제예요 (키 없음, 운영에서 시험 모드). */
export class ConfigError extends Error {}

const SYSTEM_PROMPT = `당신은 온비드 공매 공고문에서 물건 정보를 뽑는 도우미입니다.
[공고문]에 적힌 내용만 그대로 옮기세요. 적혀 있지 않은 칸은 null로 두고, 짐작하지 마세요.
property의 칸 이름은 다음 9개만 쓰세요: ${PROPERTY_FIELDS.join(", ")}
물건 종류는 아래 8개 id 중에서만 고르세요: ${CATEGORY_IDS.join(", ")}
confidence는 0~1 사이 숫자로, 종류 판정을 얼마나 확신하는지 적으세요.
clues에는 판정 근거가 된 [공고문]의 단어를 그대로 적으세요.
확신이 낮으면 candidates에 가능성 높은 순서로 2~3개 id를 적으세요.
JSON으로만 답하세요: {"property": {...}, "category": "...", "confidence": 0.0, "clues": [...], "candidates": [...]}`;

function isStubMode(): boolean {
  return process.env.AI_STUB === "1";
}

/** 공고문(개인정보를 지운 글)을 AI에 보내 정리·판정 결과(JSON)를 받아요. 결과 검사는 categorize.ts에서 해요. */
export async function extractWithAi(maskedText: string): Promise<unknown> {
  if (isStubMode()) {
    if (process.env.NODE_ENV === "production") throw new ConfigError("AI_STUB는 운영에서 쓸 수 없어요");
    return stubExtract(maskedText);
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ConfigError("OPENAI_API_KEY가 없어요");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `[공고문]\n${maskedText}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new AiError(`OpenAI 응답 ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new AiError("OpenAI 응답 내용이 없어요");
    return JSON.parse(content);
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e instanceof Error ? e.name : "unknown");
  } finally {
    clearTimeout(timer);
  }
}

// ───── 시험용 흉내 (AI_STUB=1) ─────
// "칸 이름: 값" 줄을 읽고, 판정 단서 점수로 종류를 정해요. 글에 [AI_FAIL]이 있으면 실패를 흉내 내요.
const LABELS: Record<string, string[]> = {
  소재지: ["소재지", "물건 소재지"],
  지목: ["지목"],
  면적: ["면적", "토지면적", "건물면적"],
  용도지역: ["용도지역"],
  "건물 용도": ["건물 용도", "건물용도", "용도"],
  "차종·연식": ["차종·연식", "차종", "연식"],
  품목: ["품목", "물품명"],
  최저입찰가: ["최저입찰가", "최저입찰가격"],
  "공고 기관": ["공고 기관", "공고기관", "처분기관"],
};

export function stubExtract(text: string): unknown {
  if (text.includes("[AI_FAIL]")) throw new AiError("시험용 실패");
  const property = emptyProperty() as Record<string, string | null>;
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([^:：]+)[:：]\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const label = m[1].trim();
    for (const [field, names] of Object.entries(LABELS)) {
      if (names.indexOf(label) !== -1 && property[field] === null) property[field] = m[2];
    }
  }
  const ranked = scoreByClues(text, property);
  const top = ranked[0];
  const unique = top && (!ranked[1] || ranked[1].score < top.score);
  const category = top ? top.id : null;
  const confidence = top && unique && top.score >= 2 ? 0.9 : 0.5;
  const clues: string[] = [];
  if (category) {
    if (property["지목"]) clues.push(property["지목"] as string);
  }
  // 흉내에서는 원문에 나온 키워드를 단서로 써요.
  for (const r of ranked.slice(0, 1)) {
    for (const word of text.split(/[\s,·:()]+/)) {
      if (word && clues.length < 5 && scoreByClues(word, {}).some((s) => s.id === r.id)) clues.push(word);
    }
  }
  return {
    property,
    category,
    confidence,
    clues,
    candidates: ranked.slice(0, 3).map((r) => r.id),
  };
}
