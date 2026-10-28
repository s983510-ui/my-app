// 붙여넣은 글에서 주민등록번호·전화번호 전체 형태를 지워요. AI로 보내기 전에 꼭 거쳐요.
// Design Ref: §4.4 개인정보 지우기 규칙 / PRD must 1 규칙 5
// 면적·금액·지번·날짜·물건관리번호는 지우지 않도록, 숫자 앞뒤가 다른 숫자나 하이픈과 붙어 있으면 건드리지 않아요.

export const MASK_TOKEN = "[지움]";

// (?<![\d-]) / (?![\d-]) : 더 긴 숫자 덩어리(예: 물건관리번호 2026-0101-001234)의 일부는 제외해요.
const PATTERNS: RegExp[] = [
  // 주민등록번호: 숫자 6개 + (하이픈·공백·없음) + 1~8로 시작하는 숫자 7개
  /(?<![\d-])\d{6}[-\s]?[1-8]\d{6}(?![\d-])/g,
  // 휴대전화: 010·011·016·017·018·019 + 숫자 3~4개 + 숫자 4개 (하이픈·공백·점 허용)
  /(?<![\d-])01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?![\d-])/g,
  // 일반전화: 02 또는 0XX 지역번호 + 숫자 3~4개 + 숫자 4개 (하이픈·공백·점 허용)
  /(?<![\d-])0(?:2|[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}(?![\d-])/g,
];

/** 개인정보 형태를 지운 글과, 지운 것이 있었는지를 돌려줘요. */
export function maskPersonalInfo(text: string): { text: string; masked: boolean } {
  let result = text;
  let masked = false;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, () => {
      masked = true;
      return MASK_TOKEN;
    });
  }
  return { text: result, masked };
}
