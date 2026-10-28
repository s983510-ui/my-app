// 물건 종류 8개와 종류마다의 판정 단서(지목·용도·키워드) 목록이에요.
// Design Ref: §4.5 물건 종류 표 — 이 파일이 종류 목록의 단 하나의 기준이에요.
// Design Ref: §4.2 6단계 — AI가 실패하거나 확신이 낮을 때, 여기 단서가 원문에 많이 나온 순서로 후보를 뽑아요.
// 지목 이름은 「공간정보의 구축 및 관리 등에 관한 법률」의 지목 28가지를 기준으로 나눴어요.
import type { Category, CategoryId } from "../lib/types";

export const CATEGORIES: Category[] = [
  {
    id: "farmland",
    name: "농지(전·답·과수원)",
    group: "부동산",
    description: "논·밭·과수원처럼 농사짓는 땅이에요.",
    clues: {
      landCategories: ["전", "답", "과수원"],
      keywords: ["농지", "논", "밭", "전답", "농경지", "농업진흥구역", "농업보호구역"],
    },
  },
  {
    id: "forest",
    name: "임야",
    group: "부동산",
    description: "산이나 숲으로 된 땅이에요.",
    clues: {
      landCategories: ["임야"],
      keywords: ["임야", "산림", "보전산지", "준보전산지", "보안림"],
    },
  },
  {
    id: "land",
    name: "대지·잡종지",
    group: "부동산",
    description: "집·건물을 지을 수 있는 땅이나, 농지·임야가 아닌 그 밖의 땅이에요.",
    clues: {
      landCategories: [
        "대",
        "잡종지",
        "공장용지",
        "학교용지",
        "주차장",
        "주유소용지",
        "창고용지",
        "도로",
        "철도용지",
        "제방",
        "하천",
        "구거",
        "유지",
        "양어장",
        "수도용지",
        "공원",
        "체육용지",
        "유원지",
        "종교용지",
        "사적지",
        "묘지",
        "목장용지",
        "광천지",
        "염전",
      ],
      keywords: ["대지", "나대지", "잡종지", "건부지"],
    },
  },
  {
    id: "building-res",
    name: "건물(주거)",
    group: "부동산",
    description: "아파트·주택처럼 사람이 사는 건물이에요.",
    clues: {
      landCategories: [],
      keywords: ["아파트", "단독주택", "다가구주택", "다세대주택", "연립주택", "빌라", "주거용", "공동주택"],
    },
  },
  {
    id: "building-nonres",
    name: "건물(비주거)",
    group: "부동산",
    description: "상가·공장·창고처럼 사람이 살지 않는 건물이에요.",
    clues: {
      landCategories: [],
      keywords: ["상가", "근린생활시설", "공장", "창고", "업무시설", "사무실", "숙박시설", "판매시설"],
    },
  },
  {
    id: "vehicle",
    name: "차량",
    group: "동산",
    description: "승용차·화물차·오토바이처럼 도로를 다니는 탈것이에요.",
    clues: {
      landCategories: [],
      keywords: ["자동차", "승용", "승합", "화물차", "차량번호", "차대번호", "이륜자동차", "오토바이"],
    },
  },
  {
    id: "machinery",
    name: "기계·장비",
    group: "동산",
    description: "공장 설비·중장비처럼 일에 쓰는 기계예요.",
    clues: {
      landCategories: [],
      keywords: ["기계", "설비", "중장비", "굴착기", "굴삭기", "지게차", "크레인", "발전기"],
    },
  },
  {
    id: "movable-etc",
    name: "기타 동산",
    group: "동산",
    description: "차량·기계가 아닌 그 밖의 물건이에요(집기·비품·물품 등).",
    clues: {
      landCategories: [],
      keywords: ["동산", "물품", "집기", "비품", "귀금속", "미술품"],
    },
  },
];

/** 종류 id 8개 (화면·검사에서 순서대로 써요) */
export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);

/** 들어온 값이 8개 종류 id 중 하나인지 확인해요 (AI 결과·후보 선택 검사용) */
export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORY_IDS.indexOf(value as CategoryId) !== -1;
}

/** id로 종류 하나를 찾아요. 없으면 null이에요. */
export function getCategory(id: string): Category | null {
  for (const c of CATEGORIES) {
    if (c.id === id) return c;
  }
  return null;
}
