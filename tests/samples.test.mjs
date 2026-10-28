// 가상 샘플 공고문 시험이에요 (PLAN 작업 5).
// 실행: node --test tests/samples.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SAMPLES } from "../data/samples.ts";
import { CATEGORY_IDS } from "../data/categories.ts";
import { CAUTIONS } from "../data/cautions.ts";
import { maskPersonalInfo } from "../lib/mask.ts";
import { isTextLengthOk } from "../lib/rate-limit.ts";

test("샘플은 20건이고 종류마다 2~3건이에요", () => {
  assert.equal(SAMPLES.length, 20);
  for (const id of CATEGORY_IDS) {
    const n = SAMPLES.filter((s) => s.answer === id).length;
    assert.ok(n >= 2 && n <= 3, `${id}: ${n}건`);
  }
  assert.equal(new Set(SAMPLES.map((s) => s.id)).size, 20, "샘플 id가 겹쳐요");
});

test("모든 샘플은 붙여넣기 글자 수 제한(20~10,000자) 안이에요", () => {
  for (const s of SAMPLES) assert.ok(isTextLengthOk(s.text), s.id);
});

test("강조 기대 항목은 표에 있는 정답 종류의 항목이에요", () => {
  for (const s of SAMPLES) {
    for (const id of s.expectHighlight) {
      const item = CAUTIONS.find((c) => c.id === id);
      assert.ok(item, `${s.id}: ${id}가 표에 없어요`);
      assert.equal(item.category, s.answer, `${s.id}: ${id}는 정답 종류의 항목이 아니에요`);
    }
  }
});

test("개인정보가 든 샘플만 지우기가 일어나요 (가짜 번호)", () => {
  for (const s of SAMPLES) {
    assert.equal(maskPersonalInfo(s.text).masked, s.expectMasked, s.id);
  }
});
