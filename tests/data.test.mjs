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

test("종류 8개 모두 항목이 3~6개이고, 필수 항목이 1개 이상 있어요", () => {
  for (const id of CATEGORY_IDS) {
    const items = CAUTIONS.filter((c) => c.category === id);
    assert.ok(items.length >= 3 && items.length <= 6, `${id}: 항목 ${items.length}개`);
    assert.ok(items.some((c) => c.required), `${id}: 필수 항목이 없어요`);
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
