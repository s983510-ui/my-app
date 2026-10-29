// AI가 뽑은 값이 붙여넣은 글(원문)에 실제로 있는지 비교해요.
// Design Ref: §4.3 원문 비교 규칙 — 공백·쉼표·가운뎃점을 빼고, 영문은 소문자로 바꿔 비교해요.

/** 비교용으로 글을 정리해요: 공백·쉼표(,)·가운뎃점(·) 제거, 영문 소문자. 숫자와 단위는 그대로. */
export function normalizeForMatch(value: string): string {
  return value.replace(/[\s,·]/g, "").toLowerCase();
}

/** 정리한 값이 정리한 원문 안에 그대로 들어 있으면 true예요. 빈 값은 false. */
export function isInSource(value: string, source: string): boolean {
  const v = normalizeForMatch(value);
  if (v.length === 0) return false;
  return normalizeForMatch(source).includes(v);
}
