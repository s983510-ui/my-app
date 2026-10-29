// 주의사항 표 형식 시험이에요 (PLAN 작업 2).
// 실행: node --test tests/caution-format.test.mjs
// Design Ref: §4.5 주의사항 표 항목, §8 표 품질, §9 L0 데이터 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCautionItem, checkCautionTable, PLAIN_MAX_LENGTH } from "../lib/caution-check.ts";
import { CAUTIONS } from "../data/cautions.ts";
import { PROPERTY_FIELDS } from "../lib/types.ts";

// 형식을 모두 지킨 시험용 항목 (가상 내용, 실제 표에는 넣지 않아요)
function goodItem(overrides = {}) {
  return {
    id: "farmland-99",
    category: "farmland",
    title: "시험용 항목",
    text: "시험용 설명 원문이에요.",
    plain: "시험용 쉬운 설명이에요.",
    required: true,
    highlightWhen: { field: "지목", in: ["전", "답", "과수원"] },
    steps: ["첫째 단계", "둘째 단계"],
    agency: "시험용 기관",
    sources: [{ label: "시험용 출처", url: "https://www.law.go.kr/" }],
    status: "confirmed",
    checkedAt: "2026-10-28",
    ...overrides,
  };
}

test("형식을 모두 지킨 항목은 통과해요", () => {
  assert.deepEqual(checkCautionItem(goodItem()), []);
});

test("강조 조건이 없으면 null로 둘 수 있어요", () => {
  assert.deepEqual(checkCautionItem(goodItem({ highlightWhen: null })), []);
});

test("물건 정보 칸은 DESIGN에 적힌 9개예요", () => {
  assert.deepEqual([...PROPERTY_FIELDS], [
    "소재지", "지목", "면적", "용도지역", "건물 용도", "차종·연식", "품목", "최저입찰가", "공고 기관",
  ]);
});

const badCases = [
  ["출처가 없으면", { sources: [] }, "출처가 없어요"],
  ["출처 주소가 https가 아니면", { sources: [{ label: "x", url: "http://example.com" }] }, "https://"],
  ["목록 밖 종류면", { category: "apartment", id: "apartment-01" }, "8개 목록에 없어요"],
  ["id 형식이 틀리면", { id: "farmland1" }, "형식이어야"],
  ["id 앞부분이 종류와 다르면", { id: "forest-01" }, "종류(farmland)와 달라요"],
  ["제목이 비면", { title: "  " }, "제목이 비었어요"],
  ["설명 원문이 비면", { text: "" }, "설명 원문이 비었어요"],
  ["쉬운 설명이 비면", { plain: "" }, "쉬운 설명이 비었어요"],
  ["쉬운 설명이 200자를 넘으면", { plain: "가".repeat(PLAIN_MAX_LENGTH + 1) }, "200자를 넘어요"],
  ["필수 여부가 true/false가 아니면", { required: "yes" }, "true/false"],
  ["강조 조건 칸이 목록에 없으면", { highlightWhen: { field: "주소", in: ["답"] } }, "칸 이름"],
  ["강조 조건 값이 비면", { highlightWhen: { field: "지목", in: [] } }, "값 목록이 비었어요"],
  ["절차에 빈 단계가 있으면", { steps: ["첫째", ""] }, "빈 단계"],
  ["담당 기관이 비면", { agency: "" }, "담당 기관이 비었어요"],
  ["검토 상태가 이상하면", { status: "draft" }, "confirmed 또는 needs-check"],
  ["확인일 형식이 틀리면", { checkedAt: "2026/10/28" }, "YYYY-MM-DD"],
  ["없는 날짜면", { checkedAt: "2026-02-30" }, "YYYY-MM-DD"],
];

for (const [name, overrides, expected] of badCases) {
  test(`${name} 문제로 알려줘요`, () => {
    const problems = checkCautionItem(goodItem(overrides));
    assert.ok(problems.some((p) => p.includes(expected)), `기대한 문제("${expected}")가 없어요: ${JSON.stringify(problems)}`);
  });
}

test("표에 같은 id가 두 번 있으면 알려줘요", () => {
  const problems = checkCautionTable([goodItem(), goodItem()]);
  assert.ok(problems.some((p) => p.includes("같은 id")));
});

test("지금 주의사항 표(data/cautions.ts)는 형식을 모두 지켜요", () => {
  assert.deepEqual(checkCautionTable(CAUTIONS), []);
});

test("현장에서 볼 점(onSite): 80자 이내 문장이고 검토 상태가 있어야 해요", () => {
  const base = {
    id: "vehicle-99", category: "vehicle", title: "t", text: "t", plain: "p", required: false, highlightWhen: null,
    steps: ["a"], agency: "기관", sources: [{ label: "출처", url: "https://example.com" }], status: "needs-check", checkedAt: "2026-10-29",
  };
  assert.deepEqual(checkCautionTable([{ ...base, onSite: ["차대번호를 봐요"], onSiteStatus: "needs-check" }]), []);
  assert.ok(checkCautionTable([{ ...base, onSite: ["차대번호를 봐요"] }]).length > 0, "검토 상태가 없으면 걸러요");
  assert.ok(checkCautionTable([{ ...base, onSite: [""], onSiteStatus: "confirmed" }]).length > 0, "빈 문장은 걸러요");
  assert.ok(checkCautionTable([{ ...base, onSite: ["가".repeat(81)], onSiteStatus: "confirmed" }]).length > 0, "너무 긴 문장은 걸러요");
});

// ── 경험자 팁·세부 강조 조건 형식 (2026-10-29) ──
import { checkCautionItem as checkTipItem } from "../lib/caution-check.ts";
const tipBase = {
  id: "vehicle-09", kind: "tip", category: "vehicle", title: "팁", text: "원문", plain: "쉬운 설명",
  required: false, highlightWhen: null, steps: [], agency: "해당 없음",
  sources: [{ label: "참고", url: "https://example.org/" }], status: "needs-check", checkedAt: "2026-10-29",
};
test("경험자 팁은 필수가 될 수 없어요", () => {
  assert.deepEqual(checkTipItem(tipBase), []);
  assert.ok(checkTipItem({ ...tipBase, required: true }).some((p) => p.includes("필수")));
  assert.ok(checkTipItem({ ...tipBase, kind: "other" }).some((p) => p.includes("kind")));
});
test("강조 조건은 in·includes·ageAtLeast 중 하나만 써요", () => {
  assert.deepEqual(checkTipItem({ ...tipBase, highlightWhen: { field: "차종·연식", includes: ["화물"] } }), []);
  assert.deepEqual(checkTipItem({ ...tipBase, highlightWhen: { field: "차종·연식", ageAtLeast: 10 } }), []);
  assert.ok(checkTipItem({ ...tipBase, highlightWhen: { field: "차종·연식", in: ["a"], includes: ["b"] } }).some((p) => p.includes("하나만")));
  assert.ok(checkTipItem({ ...tipBase, highlightWhen: { field: "차종·연식", ageAtLeast: 0 } }).some((p) => p.includes("ageAtLeast")));
  assert.ok(checkTipItem({ ...tipBase, highlightWhen: { field: "차종·연식", includes: [] } }).some((p) => p.includes("비었어요")));
});
