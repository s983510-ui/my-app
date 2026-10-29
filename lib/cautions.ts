// 주의사항 표에서 종류에 맞는 항목을 찾고, 강조 여부를 정하고, 필수 항목이 빠지지 않았는지 검사해요.
// Design Ref: §4.2 7단계 / PRD must 2 규칙 1·2·5
// 주의사항 내용은 AI가 아니라 이 표에서만 나와요. 검토를 마친(confirmed) 항목만 화면에 보여요(DESIGN 결정 8-가).
import type { CategoryId, CautionItem, PropertyInfo } from "./types.ts";
import { CAUTIONS } from "../data/cautions.ts";
import type { CautionViewData } from "./view-types.ts";

/** 화면으로 보내는 항목 하나 (설명 원문 대신 검토된 쉬운 설명을 보내요) */
export type CautionView = CautionViewData;

export class TableIncompleteError extends Error {
  constructor(category: string) {
    super(`주의사항 표에 ${category}의 필수 항목이 준비되지 않았어요`);
  }
}

/**
 * 검토 전 항목도 보여줄지. 운영(Vercel)에서는 언제나 false예요.
 * 내 PC에서 표 검토 전 화면을 시험할 때만 SHOW_UNREVIEWED=1로 켜요.
 */
export function showUnreviewed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SHOW_UNREVIEWED === "1";
}

function isVisible(item: CautionItem, includeUnreviewed: boolean): boolean {
  return item.status === "confirmed" || includeUnreviewed;
}

/**
 * 강조 조건이 맞는지 봐요. 짐작하지 않고 칸 값만 봐요.
 * - in: 값이 목록 중 하나와 "정확히" 같을 때 (앞뒤 공백만 무시)
 * - includes: 값에 낱말이 그대로 들어 있을 때
 * - ageAtLeast: 값의 네 자리 연도(1950~올해)가 올해보다 그 햇수 이상 오래됐을 때. 연도가 없거나 여러 개면 강조하지 않아요
 */
export function isHighlighted(item: CautionItem, property: PropertyInfo, now: Date = new Date()): boolean {
  const cond = item.highlightWhen;
  if (!cond) return false;
  const value = property[cond.field];
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (cond.in) return cond.in.indexOf(v) !== -1;
  if (cond.includes) return cond.includes.some((word) => v.indexOf(word) !== -1);
  if (cond.ageAtLeast !== undefined) {
    const thisYear = now.getFullYear();
    const years = (v.match(/(?<!\d)(19[5-9]\d|20\d\d)(?!\d)/g) ?? []).map(Number).filter((y) => y <= thisYear);
    if (years.length !== 1) return false;
    return thisYear - years[0] >= cond.ageAtLeast;
  }
  return false;
}

/**
 * 종류에 맞는 주의사항 목록을 만들어요.
 * - 필수 항목이 하나라도 화면에 못 나가면(검토 전이면) TableIncompleteError를 던져요.
 * - 순서: 필수 → 해당 가능성 높음 → 법령·공식 안내 → 경험자 팁, 같으면 항목 번호 순.
 */
export function cautionsFor(
  category: CategoryId,
  property: PropertyInfo,
  table: CautionItem[] = CAUTIONS,
  includeUnreviewed: boolean = showUnreviewed(),
): CautionView[] {
  const ofCategory = table.filter((item) => item.category === category);
  const required = ofCategory.filter((item) => item.required);
  if (required.length === 0 || required.some((item) => !isVisible(item, includeUnreviewed))) {
    throw new TableIncompleteError(category);
  }

  const views: CautionView[] = ofCategory
    .filter((item) => isVisible(item, includeUnreviewed))
    .map((item) => ({
      id: item.id,
      title: item.title,
      plain: item.plain,
      notice: item.notice && (item.noticeStatus === "confirmed" || includeUnreviewed) ? item.notice : "",
      required: item.required,
      tip: item.kind === "tip",
      highlight: isHighlighted(item, property),
      steps: item.steps,
      onSite: item.onSite && (item.onSiteStatus === "confirmed" || includeUnreviewed) ? item.onSite : [],
      agency: item.agency,
      sources: item.sources,
      checkedAt: item.checkedAt,
      unreviewed: item.status !== "confirmed",
    }));

  views.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.highlight !== b.highlight) return a.highlight ? -1 : 1;
    if (a.tip !== b.tip) return a.tip ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return views;
}

/** 화면에 보이는 항목들 중 가장 오래된 확인일. 보이는 항목이 없으면 null이에요. */
export function tableCheckedAt(
  table: CautionItem[] = CAUTIONS,
  includeUnreviewed: boolean = showUnreviewed(),
): string | null {
  let oldest: string | null = null;
  for (const item of table) {
    if (!isVisible(item, includeUnreviewed)) continue;
    if (oldest === null || item.checkedAt < oldest) oldest = item.checkedAt;
  }
  return oldest;
}
