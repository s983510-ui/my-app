// 가상 샘플 공고문 20건과 정답이에요 (PLAN 작업 5). 실제 공고문·실제 개인정보가 아니에요.
// Design Ref: §9 평가 — 분류 정확도·필수 항목 빠짐·출처·시간·지어내기를 이 샘플로 재요.
// 온비드 물건 상세를 흉내 낸 "칸 이름: 값" 모양이에요. 지명은 "가상면·가상리"처럼 일부러 가짜로 적었어요.
// 일부 샘플에는 가짜 전화번호·주민등록번호를 넣어 개인정보 지우기를 시험해요.
import type { CategoryId } from "../lib/types.ts";

export type Sample = {
  id: string;
  /** 시험 기록용 짧은 이름 */
  title: string;
  /** 붙여넣을 공고문 글 */
  text: string;
  /** 정답 종류 */
  answer: CategoryId;
  /** 강조(해당 가능성 높음)되어야 하는 항목 id */
  expectHighlight: string[];
  /** 개인정보 지우기가 일어나야 하는지 */
  expectMasked: boolean;
};

export const SAMPLES: Sample[] = [
  // ── 농지 3건 ──
  {
    id: "S01",
    title: "답 (논)",
    text: `물건관리번호: 2026-0101-000101
물건명: 경상남도 창녕군 가상면 가상리 101 답
소재지: 경상남도 창녕군 가상면 가상리 101
지목: 답
면적: 1,652 ㎡
용도지역: 농림지역
최저입찰가: 18,500,000원
공고 기관: 한국자산관리공사
유의사항: 농지취득자격증명 제출 필요, 미제출 시 매각결정 취소될 수 있음`,
    answer: "farmland",
    expectHighlight: ["farmland-01", "farmland-04"],
    expectMasked: false,
  },
  {
    id: "S02",
    title: "전 (밭), 연락처 포함",
    text: `[국유재산 매각 공고]
소재지: 경상남도 창녕군 가상읍 가상리 22-3
지목: 전
면적: 892㎡
용도지역: 계획관리지역
최저입찰가: 9,800,000원
현황: 밭으로 이용 중, 진입로 확인 필요
문의: 담당자 010-1234-5678 (가상 번호)`,
    answer: "farmland",
    expectHighlight: ["farmland-01", "farmland-04"],
    expectMasked: true,
  },
  {
    id: "S03",
    title: "과수원",
    text: `물건관리번호: 2026-0101-000103
소재지: 경상남도 창원시 진해구 가상동 산 7-1 인근
지목: 과수원
면적: 2,310 ㎡
최저입찰가: 41,000,000원
비고: 감나무 식재, 농업진흥구역 여부 확인 요망`,
    answer: "farmland",
    expectHighlight: ["farmland-01", "farmland-04"],
    expectMasked: false,
  },

  // ── 임야 2건 ──
  {
    id: "S04",
    title: "임야 (보전산지)",
    text: `물건명: 경상남도 창녕군 가상면 가상리 산 45 임야
소재지: 경상남도 창녕군 가상면 가상리 산 45
지목: 임야
면적: 15,870 ㎡
용도지역: 농림지역 (보전산지)
최저입찰가: 32,000,000원
현황: 분묘 2기 소재 추정`,
    answer: "forest",
    expectHighlight: ["forest-01"],
    expectMasked: false,
  },
  {
    id: "S05",
    title: "임야 (진입로 없음)",
    text: `소재지: 경상남도 창원시 진해구 가상동 산 112
지목: 임야
면적: 4,200㎡
최저입찰가: 7,560,000원
유의사항: 맹지이며 현황 도로 없음, 산림 경계 불명확`,
    answer: "forest",
    expectHighlight: ["forest-01"],
    expectMasked: false,
  },

  // ── 대지·잡종지 3건 ──
  {
    id: "S06",
    title: "대지 (나대지)",
    text: `물건관리번호: 2026-0101-000106
소재지: 경상남도 창원시 진해구 가상동 201-4
지목: 대
면적: 330.5 ㎡
용도지역: 제1종일반주거지역
최저입찰가: 99,000,000원
현황: 나대지, 일부 무단 점유 컨테이너 있음`,
    answer: "land",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S07",
    title: "잡종지",
    text: `소재지: 경상남도 창녕군 가상읍 가상리 300
지목: 잡종지
면적: 1,020 ㎡
용도지역: 계획관리지역
최저입찰가: 52,000,000원
비고: 자재 야적장으로 사용 중, 토지거래허가구역 해당 여부 확인`,
    answer: "land",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S08",
    title: "도로 (현황 도로)",
    text: `물건명: 가상리 412-2 도로
소재지: 경상남도 창녕군 가상면 가상리 412-2
지목: 도로
면적: 128㎡
최저입찰가: 1,900,000원
현황: 마을 진입로로 이용 중`,
    answer: "land",
    expectHighlight: [],
    expectMasked: false,
  },

  // ── 건물(주거) 3건 ──
  {
    id: "S09",
    title: "아파트",
    text: `물건명: 가상아파트 103동 1204호
소재지: 경상남도 창원시 진해구 가상동 55, 가상아파트 103동 1204호
건물 용도: 아파트
면적: 전용 84.97 ㎡
최저입찰가: 210,000,000원
임대차 현황: 전입세대 1세대 있음 (대항력 여부 확인 필요)
관리비 체납: 약 3,200,000원`,
    answer: "building-res",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S10",
    title: "다세대주택, 주민번호 포함",
    text: `소재지: 경상남도 창녕군 가상읍 가상리 77-1 가상빌라 201호
건물 용도: 다세대주택
면적: 59.4㎡
최저입찰가: 63,000,000원
점유자: 체납자 본인 거주 (주민등록번호 900101-1234567, 가상 번호)
비고: 명도 책임 매수인`,
    answer: "building-res",
    expectHighlight: [],
    expectMasked: true,
  },
  {
    id: "S11",
    title: "단독주택",
    text: `물건관리번호: 2026-0101-000111
소재지: 경상남도 창녕군 가상면 가상리 520
건물 용도: 단독주택
면적: 대지 412㎡ / 건물 98.3㎡
최저입찰가: 75,000,000원
비고: 건축물대장상 위반건축물 표시 있음`,
    answer: "building-res",
    expectHighlight: [],
    expectMasked: false,
  },

  // ── 건물(비주거) 3건 ──
  {
    id: "S12",
    title: "근린생활시설 상가",
    text: `물건명: 가상프라자 1층 102호
소재지: 경상남도 창원시 진해구 가상동 88, 가상프라자 1층 102호
건물 용도: 제2종 근린생활시설 (상가)
면적: 전용 45.2㎡
최저입찰가: 120,000,000원
임대차 현황: 음식점 영업 중, 상가 임차인 대항력 확인 필요`,
    answer: "building-nonres",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S13",
    title: "공장",
    text: `소재지: 경상남도 창녕군 가상읍 가상공단로 15
건물 용도: 공장
면적: 대지 2,800㎡ / 건물 1,150㎡
최저입찰가: 980,000,000원
비고: 공장 내 기계·설비는 매각 대상에서 제외`,
    answer: "building-nonres",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S14",
    title: "창고",
    text: `물건관리번호: 2026-0101-000114
소재지: 경상남도 창원시 진해구 가상동 301
건물 용도: 창고시설 (창고)
면적: 건물 420㎡
최저입찰가: 150,000,000원
현황: 제3자 물품 적치 중`,
    answer: "building-nonres",
    expectHighlight: [],
    expectMasked: false,
  },

  // ── 차량 2건 ──
  {
    id: "S15",
    title: "승용차",
    text: `물건명: 승용자동차 (가상 중형 세단)
차종·연식: 승용 / 2019년식
차량번호: 12가3456 (가상)
주행거리: 약 98,000km
보관 장소: 가상시 가상 보관소
최저입찰가: 8,200,000원
비고: 열쇠 1개, 현 상태 인도`,
    answer: "vehicle",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S16",
    title: "화물차",
    text: `물건명: 1톤 화물차
차종·연식: 화물 / 2016년식
차대번호: KMHXX00000X000000 (가상)
최저입찰가: 4,500,000원
비고: 압류 등록 다수, 말소 절차는 매각 후 진행`,
    answer: "vehicle",
    expectHighlight: [],
    expectMasked: false,
  },

  // ── 기계·장비 2건 ──
  {
    id: "S17",
    title: "굴착기",
    text: `물건명: 굴착기 (가상 모델 0.6㎥)
품목: 건설기계 굴착기
연식: 2015년식
보관 장소: 경상남도 창녕군 가상읍 가상공단로 15
최저입찰가: 23,000,000원
비고: 작동 여부 미확인, 반출은 낙찰자 부담`,
    answer: "machinery",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S18",
    title: "공장 설비",
    text: `품목: CNC 선반 외 생산설비 일체
수량: 3대
보관 장소: 가상공단 내 공장
최저입찰가: 17,000,000원
비고: 해체·운반 비용 매수인 부담, 기계 설비 현 상태 매각`,
    answer: "machinery",
    expectHighlight: [],
    expectMasked: false,
  },

  // ── 기타 동산 2건 ──
  {
    id: "S19",
    title: "사무용 집기",
    text: `품목: 사무용 집기·비품 일체 (책상 20, 의자 20, 캐비닛 5)
보관 장소: 경상남도 창원시 진해구 가상동 88 3층
최저입찰가: 1,200,000원
비고: 반출 기한 낙찰일로부터 7일`,
    answer: "movable-etc",
    expectHighlight: [],
    expectMasked: false,
  },
  {
    id: "S20",
    title: "귀금속",
    text: `품목: 귀금속 (금반지 3점, 목걸이 1점)
중량: 합계 약 37.5g
최저입찰가: 2,900,000원
비고: 감정서 없음, 진품 여부 보증하지 않음`,
    answer: "movable-etc",
    expectHighlight: [],
    expectMasked: false,
  },
];
