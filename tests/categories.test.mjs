// 물건 종류 목록(data/categories.ts) 시험이에요.
// 실행: node --test tests/categories.test.mjs
// Design Ref: §4.5 물건 종류 표, §9 L0 데이터 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, CATEGORY_IDS, isCategoryId, getCategory } from "../data/categories.ts";

// DESIGN.md §4.5에 적힌 순서 그대로예요. 바뀌면 이 시험이 알려줘요.
const DESIGN_IDS = [
  "farmland",
  "forest",
  "land",
  "building-res",
  "building-nonres",
  "vehicle",
  "machinery",
  "movable-etc",
];

// 지목 28가지 (공간정보의 구축 및 관리 등에 관한 법률)
const ALL_LAND_CATEGORIES = [
  "전", "답", "과수원", "목장용지", "임야", "광천지", "염전", "대", "공장용지", "학교용지",
  "주차장", "주유소용지", "창고용지", "도로", "철도용지", "제방", "하천", "구거", "유지", "양어장",
  "수도용지", "공원", "체육용지", "유원지", "종교용지", "사적지", "묘지", "잡종지",
];

test("종류는 DESIGN에 적힌 8개 그대로예요", () => {
  assert.deepEqual(CATEGORY_IDS, DESIGN_IDS);
});

test("종류마다 이름·설명·묶음이 채워져 있어요", () => {
  for (const c of CATEGORIES) {
    assert.ok(c.name.trim().length > 0, `${c.id} 이름이 비었어요`);
    assert.ok(c.description.trim().length > 0, `${c.id} 설명이 비었어요`);
    assert.ok(c.group === "부동산" || c.group === "동산", `${c.id} 묶음이 이상해요`);
  }
});

test("종류마다 판정 단서(키워드)가 1개 이상 있어요", () => {
  for (const c of CATEGORIES) {
    assert.ok(c.clues.keywords.length > 0, `${c.id} 키워드가 없어요`);
  }
});

test("지목 28가지가 빠짐없이, 한 종류에만 들어 있어요", () => {
  const seen = new Map();
  for (const c of CATEGORIES) {
    for (const lc of c.clues.landCategories) {
      assert.ok(!seen.has(lc), `지목 "${lc}"이(가) ${seen.get(lc)}와 ${c.id}에 겹쳐요`);
      seen.set(lc, c.id);
    }
  }
  assert.deepEqual([...seen.keys()].sort(), [...ALL_LAND_CATEGORIES].sort());
});

test("농지는 지목 전·답·과수원으로 판정해요 (PRD 1번 예시)", () => {
  assert.deepEqual(getCategory("farmland").clues.landCategories, ["전", "답", "과수원"]);
});

test("같은 키워드가 두 종류에 겹치지 않아요 (후보가 헷갈리지 않게)", () => {
  const seen = new Map();
  for (const c of CATEGORIES) {
    for (const k of c.clues.keywords) {
      assert.ok(!seen.has(k), `키워드 "${k}"이(가) ${seen.get(k)}와 ${c.id}에 겹쳐요`);
      seen.set(k, c.id);
    }
  }
});

test("동산 종류에는 지목 단서가 없어요", () => {
  for (const c of CATEGORIES.filter((x) => x.group === "동산")) {
    assert.equal(c.clues.landCategories.length, 0, `${c.id}에 지목이 들어 있어요`);
  }
});

test("목록 밖 종류는 걸러내요 (AI 결과 검사에 쓰여요)", () => {
  assert.equal(isCategoryId("farmland"), true);
  assert.equal(isCategoryId("apartment"), false);
  assert.equal(isCategoryId(""), false);
  assert.equal(isCategoryId(null), false);
  assert.equal(getCategory("없는종류"), null);
});
