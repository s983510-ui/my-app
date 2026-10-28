// 앱 전체에서 함께 쓰는 데이터 모양(형식)을 모아 두는 파일이에요.
// Design Ref: §4.5 — 물건 종류 8개는 이 목록 밖으로 늘리지 않아요(바꾸려면 PRD부터).

/** 물건 종류 id 8개 (PRD 5번 must 1 규칙 2) */
export type CategoryId =
  | "farmland"
  | "forest"
  | "land"
  | "building-res"
  | "building-nonres"
  | "vehicle"
  | "machinery"
  | "movable-etc";

/** 부동산인지 동산인지 (화면 묶음·설명용) */
export type CategoryGroup = "부동산" | "동산";

/** 종류를 판정할 때 공고문에서 찾아볼 단서 */
export type CategoryClues = {
  /** 공고문의 "지목" 칸 값이 이 중 하나와 정확히 같으면 이 종류예요 (토지만 해당) */
  landCategories: string[];
  /** 공고문 글에 이 낱말이 들어 있으면 이 종류일 가능성이 높아요 */
  keywords: string[];
};

/** 물건 종류 하나 */
export type Category = {
  id: CategoryId;
  /** 화면에 보여줄 이름 */
  name: string;
  group: CategoryGroup;
  /** 이 종류가 무엇인지 쉬운 말 한 줄 */
  description: string;
  clues: CategoryClues;
};
