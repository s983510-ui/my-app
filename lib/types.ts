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

// ───── 물건 정보 칸 ─────
// Design Ref: §4.5 — AI ①이 공고문에서 뽑는 칸이에요. 없는 칸은 null("공고문에 없음")이에요.

/** 물건 정보 칸 이름 9개 */
export const PROPERTY_FIELDS = [
  "소재지",
  "지목",
  "면적",
  "용도지역",
  "건물 용도",
  "차종·연식",
  "품목",
  "최저입찰가",
  "공고 기관",
] as const;

export type PropertyField = (typeof PROPERTY_FIELDS)[number];

/** 정리된 물건 정보 (칸 이름 → 값, 없으면 null) */
export type PropertyInfo = Partial<Record<PropertyField, string | null>>;

// ───── 주의사항 표 ─────
// Design Ref: §4.5 주의사항 표 항목 — 주의사항 내용은 이 표에서만 나와요(PRD must 2 규칙 1).

/**
 * 이 물건에 해당할 가능성이 높을 때 강조하는 조건 (PRD must 2 규칙 5). 셋 중 하나만 써요.
 * - in: 칸 값이 목록 중 하나와 정확히 같을 때 (예: 지목 "답")
 * - includes: 칸 값에 낱말이 그대로 들어 있을 때 (예: 차종·연식에 "화물") — 2026-10-29 세부 분류용으로 추가
 * - ageAtLeast: 칸 값의 네 자리 연도가 올해보다 이 햇수 이상 오래됐을 때 (예: 10 → 10년 넘은 차)
 */
export type HighlightCondition = {
  field: PropertyField;
  in?: string[];
  includes?: string[];
  ageAtLeast?: number;
};

/** 근거 출처 (PRD must 2 규칙 3: 항목마다 1개 이상) */
export type CautionSource = {
  /** 화면에 보일 이름. 예: "농지법 제8조" */
  label: string;
  /** https로 시작하는 공식 주소 */
  url: string;
};

/** 검토 상태. confirmed만 화면에 보여요 (PRD 7번, DESIGN 결정 8-가) */
export type CautionStatus = "confirmed" | "needs-check";

/** 주의사항 표의 항목 하나 */
export type CautionItem = {
  /** 항목 번호. "종류id-두자리숫자" 예: "farmland-01" */
  id: string;
  /**
   * 항목 종류. 없으면 법령·공식 안내 항목이에요.
   * "tip"은 경험자 팁(법적 근거가 아니라 경험자들이 흔히 보는 점)이에요. 필수가 될 수 없고, 화면에 '경험자 팁' 표시가 붙어요 (2026-10-29 조인우 결정)
   */
  kind?: "tip";
  category: CategoryId;
  /** 제목. 예: "농지취득자격증명" */
  title: string;
  /** 검토된 설명 원문 (법령·공식 안내를 바탕으로 쓴 기준 문장) */
  text: string;
  /** 검토된 쉬운 설명 (200자 이내, text의 숫자·기관·법령·조건어 그대로) */
  plain: string;
  /** 공고문 "기타" 칸에 넣을 공고문 문체 문장(직원용, 쉬운 설명과 같은 내용). noticeStatus가 confirmed일 때만 문안에 들어가요 */
  notice?: string;
  noticeStatus?: CautionStatus;
  /** 이 종류에서 꼭 보여줘야 하는 항목인지 (PRD must 2 규칙 2) */
  required: boolean;
  /** 강조 조건. 없으면 null */
  highlightWhen: HighlightCondition | null;
  /** 참고 절차 (순서대로) */
  steps: string[];
  /** 현장을 직접 볼 때 눈으로 확인할 점 (선택). onSiteStatus가 confirmed일 때만 화면에 나가요 */
  onSite?: string[];
  onSiteStatus?: CautionStatus;
  /** 아직 검토 전인 현장 문장 초안. 화면에는 나가지 않고, 검토를 마치면 onSite로 옮겨요 */
  onSiteDraft?: string[];
  /** 담당 기관 */
  agency: string;
  sources: CautionSource[];
  status: CautionStatus;
  /** 이 항목을 마지막으로 확인한 날 (YYYY-MM-DD) */
  checkedAt: string;
};
