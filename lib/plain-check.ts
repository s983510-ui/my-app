// 표에 미리 넣은 쉬운 설명(plain)이 설명 원문(text)의 내용을 바꾸지 않았는지 검사해요.
// Design Ref: §5.2 쉬운 설명 규칙 / PRD must 2 규칙 4
// 검사 4가지: 200자 이내, 숫자 그대로, 법령 이름·조문·기관 이름 그대로, 조건어 그대로.
import type { CautionItem } from "./types.ts";
import { PLAIN_MAX_LENGTH } from "./caution-check.ts";

/** text에 있으면 plain에도 꼭 있어야 하는 조건어 */
// "안에"는 "땅 안에"처럼 장소를 뜻할 때가 많아 넣지 않았어요. 기한은 숫자 검사로 지켜요.
export const CONDITION_WORDS = ["없으면", "않으면", "못하면", "전에", "이내", "반드시", "까지"];

/** text에 있으면 plain에도 꼭 있어야 하는 기관 이름 */
export const AGENCY_WORDS = [
  "시·군·구청",
  "시·구·읍·면",
  "읍·면·동",
  "시·도",
  "등기소",
  "법원",
  "관리사무소",
  "차량등록사업소",
  "한국자산관리공사",
  "온비드",
  "보험회사",
];

/** 글 속 숫자들 (쉼표 뺀 모양) */
function numbersIn(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
}

/** 출처 이름에서 법령 이름만 뽑아요. 예: "농지법 제8조" → "농지법" */
function lawNamesFromSources(item: CautionItem): string[] {
  const names: string[] = [];
  for (const s of item.sources) {
    const m = /^(.+?(?:법률|법|령))(?:\s|$)/.exec(s.label.trim());
    if (m) names.push(m[1]);
  }
  return names;
}

/** 쉬운 설명 검사. 빈 목록이면 통과예요. */
export function checkPlain(item: CautionItem): string[] {
  const problems: string[] = [];
  const { id, text, plain } = item;

  if (plain.length > PLAIN_MAX_LENGTH) problems.push(`${id}: 쉬운 설명이 ${PLAIN_MAX_LENGTH}자를 넘어요`);

  const plainNumbers = numbersIn(plain);
  for (const n of numbersIn(text)) {
    if (plainNumbers.indexOf(n) === -1) problems.push(`${id}: 원문의 숫자 "${n}"이(가) 쉬운 설명에 없어요`);
  }
  for (const law of lawNamesFromSources(item)) {
    if (text.includes(law) && !plain.includes(law)) problems.push(`${id}: 법령 이름 "${law}"이(가) 쉬운 설명에 없어요`);
  }
  for (const ref of text.match(/제\d+조(?:의\d+)?/g) ?? []) {
    if (!plain.includes(ref)) problems.push(`${id}: 조문 "${ref}"이(가) 쉬운 설명에 없어요`);
  }
  for (const word of AGENCY_WORDS) {
    if (text.includes(word) && !plain.includes(word)) problems.push(`${id}: 기관 이름 "${word}"이(가) 쉬운 설명에 없어요`);
  }
  for (const word of CONDITION_WORDS) {
    if (text.includes(word) && !plain.includes(word)) problems.push(`${id}: 조건어 "${word}"이(가) 쉬운 설명에 없어요`);
  }
  return problems;
}
