// AI ① 결과를 서버에서 다시 검사하고, 종류를 확정할지 후보를 보여줄지 정해요.
// Design Ref: §4.2 5·6단계, §4.3 / PRD must 1 규칙 1~3
// - 목록 밖 종류는 버리고, 원문에 없는 값·단서는 비워요("공고문에 없음").
// - 확정 조건: 확신도 0.7 이상 + 원문에 있는 단서 1개 이상 (PLAN 질문 3-나)
// - 아니면 후보 2~3개: AI 후보 → 부족하면 판정 단서가 원문에 많이 나온 순서로 채워요. 단서가 하나도 없으면 8개 전체.
import type { CategoryId, PropertyInfo } from "./types.ts";
import { PROPERTY_FIELDS } from "./types.ts";
import { CATEGORIES, CATEGORY_IDS, isCategoryId } from "../data/categories.ts";
import { isInSource, normalizeForMatch } from "./match.ts";

export const CONFIDENCE_THRESHOLD = 0.7;
const VALUE_MAX = 100;

/** 지목 28가지 (data/categories.ts의 지목 단서를 모은 것) */
const ALL_LAND_CATEGORIES: string[] = CATEGORIES.flatMap((c) => c.clues.landCategories);

export type Extraction = {
  property: PropertyInfo;
  category: CategoryId | null;
  confidence: number;
  clues: string[];
  candidates: CategoryId[];
};

export type Decision =
  | { category: CategoryId; candidates: null }
  | { category: null; candidates: CategoryId[] };

/** 빈 물건 정보 (모든 칸 null) */
export function emptyProperty(): PropertyInfo {
  const p: PropertyInfo = {};
  for (const f of PROPERTY_FIELDS) p[f] = null;
  return p;
}

/**
 * 확신도를 0~1 숫자로 읽어요. AI가 "0.9"처럼 글자로 주면 숫자로 바꾸고,
 * 85처럼 퍼센트(1 초과 100 이하)로 주면 100으로 나눠요. 읽을 수 없거나 범위 밖이면 0이에요.
 */
export function readConfidence(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100) return 0;
  return n > 1 ? n / 100 : n;
}

/** AI ① 결과(모양을 믿을 수 없는 값)를 원문과 대조해 깨끗하게 만들어요. */
export function sanitizeExtraction(raw: unknown, source: string): Extraction {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawProperty =
    obj.property && typeof obj.property === "object" ? (obj.property as Record<string, unknown>) : {};

  const property = emptyProperty();
  for (const field of PROPERTY_FIELDS) {
    const v = rawProperty[field];
    if (typeof v !== "string") continue;
    const value = v.trim().slice(0, VALUE_MAX);
    if (!isInSource(value, source)) continue;
    if (field === "지목" && ALL_LAND_CATEGORIES.indexOf(value) === -1) continue;
    property[field] = value;
  }

  const category = isCategoryId(obj.category) ? obj.category : null;
  const confidence = readConfidence(obj.confidence);
  const clues = Array.isArray(obj.clues)
    ? obj.clues.filter((c): c is string => typeof c === "string" && isInSource(c, source)).slice(0, 10)
    : [];
  const candidates: CategoryId[] = [];
  if (Array.isArray(obj.candidates)) {
    for (const c of obj.candidates) {
      if (isCategoryId(c) && candidates.indexOf(c) === -1) candidates.push(c);
    }
  }
  return { property, category, confidence, clues, candidates };
}

/** 판정 단서 점수: 지목이 정확히 맞으면 3점, 키워드가 원문에 나올 때마다 1점. 0점은 빼요. */
export function scoreByClues(source: string, property: PropertyInfo): { id: CategoryId; score: number }[] {
  const text = normalizeForMatch(source);
  const scores = CATEGORIES.map((c) => {
    let score = 0;
    const landCategory = property["지목"];
    if (typeof landCategory === "string" && c.clues.landCategories.indexOf(landCategory) !== -1) score += 3;
    for (const k of c.clues.keywords) {
      const key = normalizeForMatch(k);
      if (key.length === 0) continue;
      let from = 0;
      while (true) {
        const at = text.indexOf(key, from);
        if (at === -1) break;
        score += 1;
        from = at + key.length;
      }
    }
    return { id: c.id, score };
  });
  return scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

/** 후보 2~3개를 만들어요. 단서가 하나도 없으면 8개 전체예요. */
export function pickCandidates(source: string, property: PropertyInfo, first: CategoryId[]): CategoryId[] {
  const list: CategoryId[] = [];
  const add = (id: CategoryId) => {
    if (list.length < 3 && list.indexOf(id) === -1) list.push(id);
  };
  const ranked = scoreByClues(source, property);
  // 판정 단서가 원문에 하나도 안 맞으면 어느 쪽도 믿기 어려워서 8개 전체를 보여줘요 (DESIGN §4.2 6단계).
  // AI가 짚은 종류는 맨 앞에 두어 찾기 쉽게 해요.
  if (ranked.length === 0) {
    const head = first.filter((id, i) => first.indexOf(id) === i);
    return [...head, ...CATEGORY_IDS.filter((id) => head.indexOf(id) === -1)];
  }
  first.forEach(add);
  ranked.forEach((r) => add(r.id));
  if (list.length === 0) return [...CATEGORY_IDS];
  if (list.length === 1) {
    // 후보가 하나뿐이면 같은 묶음(부동산/동산)에서 하나를 더해 고를 수 있게 해요.
    const group = CATEGORIES.find((c) => c.id === list[0])?.group;
    const sibling = CATEGORIES.find((c) => c.group === group && c.id !== list[0]);
    if (sibling) add(sibling.id);
  }
  return list;
}

/** 종류를 확정할지, 후보를 보여줄지 정해요. */
export function decideCategory(ex: Extraction, source: string): Decision {
  if (ex.category && ex.confidence >= CONFIDENCE_THRESHOLD && ex.clues.length >= 1) {
    return { category: ex.category, candidates: null };
  }
  const first = ex.category ? [ex.category, ...ex.candidates] : ex.candidates;
  return { category: null, candidates: pickCandidates(source, ex.property, first) };
}
