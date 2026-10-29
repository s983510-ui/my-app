// 주의사항 표 항목이 정해진 형식을 지켰는지 검사해요.
// 표를 쓰거나 고칠 때(PLAN 작업 3·4), 데이터 시험이 이 함수로 문제를 찾아요.
// Design Ref: §4.5 주의사항 표 항목, §8 표 품질 — 출처 없는 항목, 형식이 틀린 항목은 시험에서 실패해요.
// 쉬운 설명의 내용 검사(숫자·기관·법령·조건어 보존)는 PLAN 작업 11에서 더해요.
import type { CautionItem } from "./types.ts";
import { PROPERTY_FIELDS } from "./types.ts";
import { isCategoryId } from "../data/categories.ts";

/** 쉬운 설명 최대 글자 수 (PRD must 2 규칙 4) */
export const PLAIN_MAX_LENGTH = 200;

const ID_PATTERN = /^([a-z-]+)-(\d{2})$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 있을 수 있는 날짜인지 (예: 2026-02-30은 안 돼요) */
function isRealDate(value: string): boolean {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function isFilledText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 항목 하나를 검사해서 문제 목록을 돌려줘요. 빈 목록이면 통과예요. */
export function checkCautionItem(item: CautionItem): string[] {
  const problems: string[] = [];
  const where = isFilledText(item.id) ? item.id : "(id 없음)";

  if (!isCategoryId(item.category)) {
    problems.push(`${where}: 종류 "${item.category}"는 8개 목록에 없어요`);
  }
  const idMatch = ID_PATTERN.exec(item.id ?? "");
  if (!idMatch) {
    problems.push(`${where}: id는 "종류id-두자리숫자" 형식이어야 해요 (예: farmland-01)`);
  } else if (idMatch[1] !== item.category) {
    problems.push(`${where}: id 앞부분이 종류(${item.category})와 달라요`);
  }

  if (!isFilledText(item.title)) problems.push(`${where}: 제목이 비었어요`);
  if (!isFilledText(item.text)) problems.push(`${where}: 설명 원문이 비었어요`);
  if (!isFilledText(item.plain)) {
    problems.push(`${where}: 쉬운 설명이 비었어요`);
  } else if (item.plain.length > PLAIN_MAX_LENGTH) {
    problems.push(`${where}: 쉬운 설명이 ${PLAIN_MAX_LENGTH}자를 넘어요 (${item.plain.length}자)`);
  }
  if (typeof item.required !== "boolean") problems.push(`${where}: 필수 여부는 true/false여야 해요`);

  if (item.highlightWhen !== null) {
    const h = item.highlightWhen;
    if (!h || (PROPERTY_FIELDS as readonly string[]).indexOf(h.field) === -1) {
      problems.push(`${where}: 강조 조건의 칸 이름이 물건 정보 칸 목록에 없어요`);
    }
    const kinds = h ? [h.in, h.includes, h.ageAtLeast].filter((v) => v !== undefined).length : 0;
    if (kinds !== 1) {
      problems.push(`${where}: 강조 조건은 in·includes·ageAtLeast 중 하나만 써야 해요`);
    } else if (h && h.ageAtLeast !== undefined) {
      if (!Number.isInteger(h.ageAtLeast) || h.ageAtLeast < 1) problems.push(`${where}: ageAtLeast는 1 이상의 정수여야 해요`);
    } else {
      const list = h ? (h.in ?? h.includes) : undefined;
      if (!Array.isArray(list) || list.length === 0 || !list.every(isFilledText)) {
        problems.push(`${where}: 강조 조건의 값 목록이 비었어요`);
      }
    }
  }
  if (item.kind !== undefined && item.kind !== "tip") problems.push(`${where}: 항목 종류(kind)는 "tip"만 쓸 수 있어요`);
  if (item.kind === "tip" && item.required) problems.push(`${where}: 경험자 팁은 필수 항목이 될 수 없어요`);

  if (!Array.isArray(item.steps) || !item.steps.every(isFilledText)) {
    problems.push(`${where}: 참고 절차에 빈 단계가 있어요`);
  }
  if (item.onSite !== undefined) {
    if (!Array.isArray(item.onSite) || item.onSite.length === 0 || !item.onSite.every((l) => isFilledText(l) && l.length <= 80)) {
      problems.push(`${where}: 현장에서 볼 점은 80자 이내의 빈 칸 없는 문장이어야 해요`);
    }
    if (item.onSiteStatus !== "confirmed" && item.onSiteStatus !== "needs-check") {
      problems.push(`${where}: 현장에서 볼 점의 검토 상태(onSiteStatus)가 필요해요`);
    }
  }
  if (item.notice !== undefined) {
    if (!isFilledText(item.notice) || item.notice.length > PLAIN_MAX_LENGTH) {
      problems.push(`${where}: 공고문 문장은 비어 있지 않고 ${PLAIN_MAX_LENGTH}자 이내여야 해요`);
    }
    if (item.noticeStatus !== "confirmed" && item.noticeStatus !== "needs-check") {
      problems.push(`${where}: 공고문 문장의 검토 상태(noticeStatus)가 필요해요`);
    }
  }
  if (item.onSiteDraft !== undefined && (!Array.isArray(item.onSiteDraft) || !item.onSiteDraft.every((l) => isFilledText(l) && l.length <= 80))) {
    problems.push(`${where}: 현장 문장 초안은 80자 이내의 빈 칸 없는 문장이어야 해요`);
  }
  if (!isFilledText(item.agency)) problems.push(`${where}: 담당 기관이 비었어요`);

  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    problems.push(`${where}: 출처가 없어요 (1개 이상 필요)`);
  } else {
    for (const s of item.sources) {
      if (!isFilledText(s.label)) problems.push(`${where}: 출처 이름이 비었어요`);
      if (typeof s.url !== "string" || !s.url.startsWith("https://")) {
        problems.push(`${where}: 출처 주소는 https://로 시작해야 해요`);
      }
    }
  }

  if (item.status !== "confirmed" && item.status !== "needs-check") {
    problems.push(`${where}: 검토 상태는 confirmed 또는 needs-check여야 해요`);
  }
  if (!isRealDate(item.checkedAt ?? "")) {
    problems.push(`${where}: 확인일은 있는 날짜를 YYYY-MM-DD로 적어야 해요`);
  }

  return problems;
}

/** 표 전체를 검사해요: 항목마다 형식 + id 겹침. 빈 목록이면 통과예요. */
export function checkCautionTable(items: CautionItem[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    problems.push(...checkCautionItem(item));
    if (seen.has(item.id)) problems.push(`${item.id}: 같은 id가 두 번 있어요`);
    seen.add(item.id);
  }
  return problems;
}
