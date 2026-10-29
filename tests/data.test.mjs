// 주의사항 표 데이터 시험이에요 (PLAN 작업 3·11).
// 실행: node --test tests/data.test.mjs
// Design Ref: §9 L0 데이터 — 형식, 출처, 종류별 필수 항목, 쉬운 설명 검사 4가지
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAUTIONS } from "../data/cautions.ts";
import { CATEGORY_IDS } from "../data/categories.ts";
import { checkCautionTable } from "../lib/caution-check.ts";
import { checkPlain } from "../lib/plain-check.ts";

test("표의 모든 항목이 형식을 지켜요 (출처 1개 이상, https, 날짜 등)", () => {
  assert.deepEqual(checkCautionTable(CAUTIONS), []);
});

// PRD 6번: 부동산 5종과 차량은 최대 10개, 나머지는 3~6개
const MAX_TEN = ["farmland", "forest", "land", "building-res", "building-nonres", "vehicle"];
test("종류 8개 모두 항목 수가 기준 안이고(부동산 5종·차량 3~10개, 나머지 3~6개), 필수 항목이 1개 이상 있어요", () => {
  for (const id of CATEGORY_IDS) {
    // 경험자 팁(kind: "tip")은 법령·공식 안내 항목 수에 넣지 않고, 종류마다 10개까지 따로 세요 (2026-10-29)
    const items = CAUTIONS.filter((c) => c.category === id && c.kind !== "tip");
    const tips = CAUTIONS.filter((c) => c.category === id && c.kind === "tip");
    const max = MAX_TEN.indexOf(id) !== -1 ? 10 : 6;
    assert.ok(items.length >= 3 && items.length <= max, `${id}: 항목 ${items.length}개 (최대 ${max}개)`);
    assert.ok(tips.length <= 10, `${id}: 경험자 팁 ${tips.length}개 (최대 10개)`);
    assert.ok(items.some((c) => c.required), `${id}: 필수 항목이 없어요`);
  }
});

test("종류마다 필수 항목이 모두 확인 완료(confirmed)예요 (DESIGN §8·§9)", () => {
  for (const id of CATEGORY_IDS) {
    const pending = CAUTIONS.filter((c) => c.category === id && c.required && c.status !== "confirmed").map((c) => c.id);
    assert.deepEqual(pending, [], `${id}: 필수 항목이 검토 전이에요 → 배포하면 "안내를 준비하지 못했어요"가 나와요`);
  }
});

test("쉬운 설명이 원문의 숫자·법령·조문·기관·조건어를 바꾸지 않았어요", () => {
  const problems = CAUTIONS.flatMap((c) => checkPlain(c));
  assert.deepEqual(problems, []);
});

test("쉬운 설명 검사가 실제로 잘못을 잡아요", () => {
  const base = CAUTIONS.find((c) => c.id === "farmland-04");
  const changedNumber = { ...base, plain: base.plain.replace("1년", "2년") };
  assert.ok(checkPlain(changedNumber).some((p) => p.includes('숫자 "1"')));
  const droppedLaw = { ...base, plain: base.plain.replace("농지법", "법") };
  assert.ok(checkPlain(droppedLaw).some((p) => p.includes("농지법")));
  const droppedCondition = { ...base, plain: base.plain.replace(/이내/g, "") };
  assert.ok(checkPlain(droppedCondition).some((p) => p.includes("이내")));
});

test("PRD 예시 항목이 들어 있어요: 농지 → 농지취득자격증명(필수, 지목 강조)", () => {
  const item = CAUTIONS.find((c) => c.id === "farmland-01");
  assert.equal(item.title, "농지취득자격증명");
  assert.equal(item.required, true);
  assert.deepEqual(item.highlightWhen, { field: "지목", in: ["전", "답", "과수원"] });
});

// ── 공고문 문체 문장(notice): 쉬운 설명과 같은 규칙으로 표 내용을 바꾸지 않았는지 검사해요 (직원용 문안, PRD 6번) ──
test("공고문 문장(notice)이 원문의 숫자·법령·조문·기관·조건어를 바꾸지 않았어요", () => {
  const problems = CAUTIONS.filter((c) => c.notice).flatMap((c) => checkPlain({ ...c, plain: c.notice }).map((p) => p.replace(c.id, `${c.id}(공고문)`)));
  assert.deepEqual(problems, []);
});

test("공고문 문장(notice)은 공고문 문체('~합니다·~바랍니다·~있습니다')이고 '~해요'체가 없어요", () => {
  for (const c of CAUTIONS.filter((x) => x.notice)) {
    for (const sentence of c.notice.split(/(?<=[.])\s*/).filter(Boolean)) {
      assert.ok(/(습니다|바랍니다|니다)\.?$/.test(sentence) || /\)\.?$/.test(sentence), `${c.id}: 문장이 공고문 문체로 끝나지 않아요 → ${sentence}`);
      assert.ok(!/(해요|세요|어요|아요|예요|이에요)\.?$/.test(sentence), `${c.id}: '해요'체가 남았어요 → ${sentence}`);
    }
  }
});

test("확인 완료(confirmed) 항목은 모두 공고문 문장이 있고, 검토 상태가 있어요", () => {
  for (const c of CAUTIONS.filter((x) => x.status === "confirmed" && x.kind !== "tip")) {
    assert.ok(c.notice && c.notice.length > 0, `${c.id}: 공고문 문장이 없어요`);
    assert.ok(c.noticeStatus === "confirmed" || c.noticeStatus === "needs-check", `${c.id}: noticeStatus가 없어요`);
  }
});

// ── 경험자 팁 (2026-10-29 조인우 결정: '경험자 팁' 표시, 3단계에 섞기, 판단은 안 함) ──
test("경험자 팁은 필수가 아니고, 출처가 있으며, '사도 된다' 같은 판단 문구가 없어요", () => {
  for (const c of CAUTIONS.filter((x) => x.kind === "tip")) {
    assert.equal(c.required, false, `${c.id}: 경험자 팁은 필수가 될 수 없어요`);
    assert.ok(c.sources.length > 0, `${c.id}: 출처가 없어요`);
    assert.ok(!/(사도 된다|사도 돼요|추천|문제없|좋은 물건|나쁜 물건|가치가 있)/.test(c.plain), `${c.id}: 판단·권유 문구가 있어요`);
  }
});

// ── 부동산 경험자 팁 기준치 (2026-10-29, 조인우 위임) 중 시험으로 잴 수 있는 것 ──
const REAL_ESTATE = ["farmland", "forest", "land", "building-res", "building-nonres"];
test("부동산 경험자 팁은 확정된 것이 종류마다 2개 이상이고, 확정된 팁은 출처가 2곳 이상이에요", () => {
  for (const id of REAL_ESTATE) {
    const tips = CAUTIONS.filter((c) => c.category === id && c.kind === "tip" && c.status === "confirmed");
    assert.ok(tips.length >= 2, `${id}: 확정된 경험자 팁 ${tips.length}개 (2개 이상 필요)`);
    for (const t of tips) assert.ok(t.sources.length >= 2, `${t.id}: 출처가 ${t.sources.length}곳뿐이에요 (2곳 이상 필요)`);
  }
});
