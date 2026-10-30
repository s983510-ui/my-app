// 서버 규칙 시험이에요 (PLAN 작업 6~10).
// 실행: node --test tests/rules.test.mjs
// Design Ref: §9 L0 규칙
import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPersonalInfo, MASK_TOKEN } from "../lib/mask.ts";
import { isTextLengthOk, takeRequest, takeLightRequest, clientIp, resetRateLimitForTest, TEXT_MAX } from "../lib/rate-limit.ts";

// ── 작업 6: 개인정보 지우기 (DESIGN §4.4 표의 예 전부) ──
const shouldMask = [
  "900101-1234567", "900101 1234567", "9001011234567",
  "010-1234-5678", "010 1234 5678", "01012345678", "010.1234.5678", "011-123-4567",
  "02-123-4567", "055 123 4567", "031-1234-5678",
  "070-1234-5678", "080-123-4567", "0505-123-4567", "1588-1234",
];
for (const v of shouldMask) {
  test(`개인정보 "${v}"는 지워요`, () => {
    const r = maskPersonalInfo(`문의: ${v} 로 연락`);
    assert.equal(r.masked, true);
    assert.equal(r.text, `문의: ${MASK_TOKEN} 로 연락`);
  });
}
const shouldKeep = ["1,234㎡", "12,340,000원", "123-4", "산 12-3", "2026-11-01", "2026-0101-001234", "제8조", "1,000,000,000원", "1,588 1234", "2026 1500"];
for (const v of shouldKeep) {
  test(`"${v}"는 지우지 않아요`, () => {
    const r = maskPersonalInfo(`정보: ${v}`);
    assert.equal(r.masked, false);
    assert.equal(r.text, `정보: ${v}`);
  });
}
test("한 글에 여러 개 있어도 모두 지워요", () => {
  const r = maskPersonalInfo("소유자 900101-1234567, 연락처 010-1234-5678, 면적 1,234㎡");
  assert.equal(r.text, `소유자 ${MASK_TOKEN}, 연락처 ${MASK_TOKEN}, 면적 1,234㎡`);
});

// ── 작업 7: 글자 수·요청 횟수 제한 ──
test("글자 수는 20~10,000자만 통과해요", () => {
  assert.equal(isTextLengthOk("가".repeat(19)), false);
  assert.equal(isTextLengthOk("가".repeat(20)), true);
  assert.equal(isTextLengthOk("가".repeat(TEXT_MAX)), true);
  assert.equal(isTextLengthOk("가".repeat(TEXT_MAX + 1)), false);
  assert.equal(isTextLengthOk(" ".repeat(30)), false);
  assert.equal(isTextLengthOk(123), false);
});

test("같은 접속자는 1분에 5번까지, 6번째는 막혀요", () => {
  resetRateLimitForTest();
  const t0 = Date.UTC(2026, 9, 28, 3, 0, 0);
  for (let i = 0; i < 5; i++) assert.equal(takeRequest("1.1.1.1", t0 + i).ok, true);
  assert.equal(takeRequest("1.1.1.1", t0 + 10).ok, false);
  assert.equal(takeRequest("2.2.2.2", t0 + 10).ok, true, "다른 접속자는 따로 세요");
});

test("1분이 지나면 다시 받아요", () => {
  resetRateLimitForTest();
  const t0 = Date.UTC(2026, 9, 28, 3, 0, 0);
  for (let i = 0; i < 5; i++) takeRequest("1.1.1.1", t0);
  assert.equal(takeRequest("1.1.1.1", t0 + 59_000).ok, false);
  assert.equal(takeRequest("1.1.1.1", t0 + 60_001).ok, true);
});

test("사이트 전체 하루 500번을 넘으면 막고, 한국 날짜가 바뀌면 다시 받아요", () => {
  resetRateLimitForTest();
  const t0 = Date.UTC(2026, 9, 28, 3, 0, 0);
  for (let i = 0; i < 500; i++) assert.equal(takeRequest(`10.0.${Math.floor(i / 250)}.${i % 250}`, t0).ok, true);
  assert.equal(takeRequest("9.9.9.9", t0).ok, false);
  const nextKoreaDay = Date.UTC(2026, 9, 28, 15, 0, 1); // 한국 시간 10월 29일 0시 0분 1초
  assert.equal(takeRequest("9.9.9.9", nextKoreaDay).ok, true);
});

test("접속자 주소는 x-forwarded-for의 첫 번째 값을 써요", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" })), "3.3.3.3");
  assert.equal(clientIp(new Headers({ "x-real-ip": "5.5.5.5" })), "unknown", "x-real-ip는 쓰지 않아요 (DESIGN §6.2)");
  assert.equal(clientIp(new Headers()), "unknown");
});

// ── 작업 8: 표 찾기·강조·필수 검사 (시험용 가상 표) ──
import { cautionsFor, isHighlighted, tableCheckedAt, TableIncompleteError } from "../lib/cautions.ts";

function item(id, overrides = {}) {
  return {
    id, category: id.replace(/-\d+$/, ""), title: id, text: "원문", plain: "쉬운 설명",
    required: false, highlightWhen: null, steps: [], agency: "기관",
    sources: [{ label: "출처", url: "https://www.law.go.kr/" }],
    status: "confirmed", checkedAt: "2026-10-28", ...overrides,
  };
}
const farmlandRule = { field: "지목", in: ["전", "답", "과수원"] };
const table = [
  item("farmland-01", { required: true, highlightWhen: farmlandRule, checkedAt: "2026-10-20" }),
  item("farmland-02", { required: true }),
  item("farmland-03"),
  item("farmland-04", { status: "needs-check" }),
  item("forest-01", { required: true, status: "needs-check" }),
  item("vehicle-01"),
];

test("지목이 정확히 '답'이면 강조하고, '답변' 같은 비슷한 글자는 강조하지 않아요", () => {
  assert.equal(isHighlighted(table[0], { 지목: "답" }), true);
  assert.equal(isHighlighted(table[0], { 지목: " 답 " }), true);
  assert.equal(isHighlighted(table[0], { 지목: "답변" }), false);
  assert.equal(isHighlighted(table[0], { 지목: null }), false);
  assert.equal(isHighlighted(table[0], {}), false);
});

test("그 종류의 검토 완료 항목만, 필수 → 강조 → 번호 순으로 보여줘요", () => {
  const views = cautionsFor("farmland", { 지목: "답" }, table, false);
  assert.deepEqual(views.map((v) => v.id), ["farmland-01", "farmland-02", "farmland-03"]);
  assert.equal(views[0].highlight, true);
  assert.ok(!views.some((v) => v.id === "farmland-04"), "검토 전 항목은 빠져요");
  assert.ok(!("text" in views[0]), "설명 원문은 화면으로 보내지 않아요");
});

test("필수 항목이 검토 전이면 표가 준비되지 않았다고 알려요", () => {
  assert.throws(() => cautionsFor("forest", {}, table, false), TableIncompleteError);
});

test("필수 항목이 아예 없는 종류도 표가 준비되지 않았다고 알려요", () => {
  assert.throws(() => cautionsFor("vehicle", {}, table, false), TableIncompleteError);
});

test("내 PC 시험에서는 검토 전 항목도 '검토 전' 표시와 함께 볼 수 있어요", () => {
  const views = cautionsFor("forest", {}, table, true);
  assert.equal(views.length, 1);
  assert.equal(views[0].unreviewed, true);
});

test("운영(production)에서는 검토 전 항목 보기가 절대 켜지지 않아요", async () => {
  const { showUnreviewed } = await import("../lib/cautions.ts");
  const old = { env: process.env.NODE_ENV, flag: process.env.SHOW_UNREVIEWED };
  process.env.SHOW_UNREVIEWED = "1";
  process.env.NODE_ENV = "production";
  assert.equal(showUnreviewed(), false);
  process.env.NODE_ENV = "development";
  assert.equal(showUnreviewed(), true);
  process.env.NODE_ENV = old.env;
  if (old.flag === undefined) delete process.env.SHOW_UNREVIEWED; else process.env.SHOW_UNREVIEWED = old.flag;
});

test("표 확인일은 보이는 항목 중 가장 오래된 날이에요", () => {
  assert.equal(tableCheckedAt(table, false), "2026-10-20");
  assert.equal(tableCheckedAt([], false), null);
});

// ── 작업 9·10: AI 결과 검사, 종류 확정·후보 ──
import { sanitizeExtraction, decideCategory, pickCandidates, emptyProperty, readConfidence } from "../lib/categorize.ts";
import { isInSource } from "../lib/match.ts";
import { stubExtract, AiError } from "../lib/ai.ts";

const src = "물건관리번호: 2026-0101-001234\n소재지: 경상남도 창녕군 가상면 가상리 123\n지목: 답\n면적: 1,234 ㎡\n최저입찰가: 12,340,000원";

test("원문 비교: 공백·쉼표를 빼고 같으면 원문에 있는 값이에요", () => {
  assert.equal(isInSource("1234㎡", src), true);
  assert.equal(isInSource("1,234㎡", src), true);
  assert.equal(isInSource("경상남도 창녕군 가상면 가상리 123", src), true);
  assert.equal(isInSource("경상남도 창녕군 다른면", src), false);
  assert.equal(isInSource("", src), false);
});

test("AI가 원문에 없는 값을 넣으면 비우고, 목록 밖 지목·종류는 버려요", () => {
  const ex = sanitizeExtraction(
    {
      property: { 소재지: "경상남도 창녕군 다른면 999", 지목: "답", 면적: "1234㎡", 용도지역: "농림지역", 엉뚱한칸: "x" },
      category: "apartment",
      confidence: 150,
      clues: ["답", "지어낸단서"],
      candidates: ["farmland", "farmland", "nope", "land"],
    },
    src,
  );
  assert.equal(ex.property["소재지"], null, "원문에 없는 소재지는 비워요");
  assert.equal(ex.property["지목"], "답");
  assert.equal(ex.property["면적"], "1234㎡");
  assert.equal(ex.property["용도지역"], null);
  assert.ok(!("엉뚱한칸" in ex.property));
  assert.equal(ex.category, null, "목록 밖 종류는 버려요");
  assert.equal(ex.confidence, 0, "범위 밖(100 초과) 확신도는 0으로 봐요");
  assert.deepEqual(ex.clues, ["답"], "원문에 없는 단서는 빼요");
  assert.deepEqual(ex.candidates, ["farmland", "land"]);
});

test("지목 칸에 지목 28가지가 아닌 값이 오면 비워요", () => {
  const ex = sanitizeExtraction({ property: { 지목: "농지" } }, "지목: 농지");
  assert.equal(ex.property["지목"], null);
});

test("모양이 엉망인 AI 응답도 안전하게 빈 결과가 돼요", () => {
  for (const raw of [null, "문자열", 42, [], { property: "x", clues: "x", candidates: 3 }]) {
    const ex = sanitizeExtraction(raw, src);
    assert.equal(ex.category, null);
    assert.deepEqual(ex.clues, []);
  }
});

test("확신도 0.9 + 원문에 있는 단서 → 확정해요", () => {
  const ex = sanitizeExtraction({ category: "farmland", confidence: 0.9, clues: ["답"], property: { 지목: "답" } }, src);
  assert.deepEqual(decideCategory(ex, src), { category: "farmland", candidates: null });
});

test("확신도 0.9라도 원문에 있는 단서가 없으면 후보로 보내요 (PLAN 질문 3-나)", () => {
  const ex = sanitizeExtraction({ category: "farmland", confidence: 0.9, clues: ["지어낸단서"] }, src);
  const d = decideCategory(ex, src);
  assert.equal(d.category, null);
  assert.equal(d.candidates[0], "farmland", "AI가 짚은 종류는 맨 앞");
  assert.equal(d.candidates.length, 8, "원문에 맞는 단서가 하나도 없으면 8개 전체");
});

test("확신도 읽기: 퍼센트·글자 숫자는 0~1로 바꾸고, 이상한 값은 0이에요", () => {
  assert.equal(readConfidence(0.9), 0.9);
  assert.equal(readConfidence(85), 0.85);
  assert.equal(readConfidence("0.9"), 0.9);
  assert.equal(readConfidence("85"), 0.85);
  assert.equal(readConfidence(1), 1);
  assert.equal(readConfidence(-1), 0);
  assert.equal(readConfidence(101), 0);
  assert.equal(readConfidence("높음"), 0);
  assert.equal(readConfidence(""), 0);
  assert.equal(readConfidence(null), 0);
});

test("확신도 0.6이면 후보 2~3개로 보내요", () => {
  const ex = sanitizeExtraction({ category: "land", confidence: 0.6, clues: ["답"], candidates: ["farmland"] }, src);
  const d = decideCategory(ex, src);
  assert.equal(d.category, null);
  assert.deepEqual(d.candidates.slice(0, 2), ["land", "farmland"]);
});

test("AI가 실패하면 판정 단서로 후보 2~3개를 뽑아요", () => {
  const property = emptyProperty();
  property["지목"] = "답";
  const c = pickCandidates("지목: 답, 논으로 쓰이는 농지", property, []);
  assert.equal(c[0], "farmland");
  assert.ok(c.length >= 2 && c.length <= 3);
});

test("단서가 하나도 안 맞으면 8개 전체를 보여줘요", () => {
  assert.equal(pickCandidates("아무 단서 없는 글입니다", emptyProperty(), []).length, 8);
});

test("시험용 흉내(AI_STUB): 칸을 읽고 종류를 정해요, [AI_FAIL]이면 실패해요", () => {
  const raw = stubExtract(src);
  const ex = sanitizeExtraction(raw, src);
  assert.equal(ex.property["지목"], "답");
  assert.equal(decideCategory(ex, src).category, "farmland");
  assert.throws(() => stubExtract(src + "\n[AI_FAIL]"), AiError);
});

test("AI를 안 쓰는 요청(후보 고르기·링크)은 AI 횟수와 따로 세요 (1분 20회)", () => {
  resetRateLimitForTest();
  const t0 = Date.UTC(2026, 9, 29, 3, 0, 0);
  for (let i = 0; i < 20; i++) assert.equal(takeLightRequest("5.5.5.5", t0 + i).ok, true);
  assert.equal(takeLightRequest("5.5.5.5", t0 + 100).ok, false, "21번째는 막아요");
  assert.equal(takeLightRequest("6.6.6.6", t0 + 100).ok, true, "다른 접속자는 따로 세요");
  assert.equal(takeLightRequest("5.5.5.5", t0 + 60_001).ok, true, "1분이 지나면 다시 돼요");
  // AI 횟수는 줄지 않아요
  resetRateLimitForTest();
  for (let i = 0; i < 20; i++) takeLightRequest("7.7.7.7", t0);
  for (let i = 0; i < 5; i++) assert.equal(takeRequest("7.7.7.7", t0 + i).ok, true, "AI 요청 5회는 그대로 쓸 수 있어요");
  assert.equal(takeRequest("7.7.7.7", t0 + 10).ok, false);
});

// ── 세부 분류 강조(2026-10-29): 낱말 포함(includes), 오래된 정도(ageAtLeast), 경험자 팁 순서 ──
test("includes: 칸 값에 낱말이 들어 있으면 강조해요 (예: 차종·연식에 '화물')", () => {
  const it = item("vehicle-08", { highlightWhen: { field: "차종·연식", includes: ["화물"] } });
  assert.equal(isHighlighted(it, { "차종·연식": "화물 / 2016년식" }), true);
  assert.equal(isHighlighted(it, { "차종·연식": "승용 / 2016년식" }), false);
  assert.equal(isHighlighted(it, {}), false);
});

test("ageAtLeast: 연도가 올해보다 그 햇수 이상 오래됐을 때만 강조하고, 연도가 없거나 여러 개면 강조하지 않아요", () => {
  const it = item("vehicle-11", { highlightWhen: { field: "차종·연식", ageAtLeast: 10 } });
  const now = new Date(Date.UTC(2026, 9, 29));
  assert.equal(isHighlighted(it, { "차종·연식": "화물 / 2016년식" }, now), true);
  assert.equal(isHighlighted(it, { "차종·연식": "승용 / 2017년식" }, now), false);
  assert.equal(isHighlighted(it, { "차종·연식": "승용" }, now), false);
  assert.equal(isHighlighted(it, { "차종·연식": "2010년식, 2020년 등록" }, now), false);
  assert.equal(isHighlighted(it, { "차종·연식": "모델 20160" }, now), false);
});

test("경험자 팁은 tip 표시가 붙고, 같은 조건이면 법령·공식 안내 항목 뒤에 와요", () => {
  const t2 = [
    item("vehicle-01", { required: true }),
    item("vehicle-02", { kind: "tip" }),
    item("vehicle-03"),
    item("vehicle-04", { kind: "tip", highlightWhen: { field: "차종·연식", includes: ["화물"] } }),
  ];
  const views = cautionsFor("vehicle", { "차종·연식": "화물 / 2016년식" }, t2, false);
  assert.deepEqual(views.map((v) => v.id), ["vehicle-01", "vehicle-04", "vehicle-03", "vehicle-02"]);
  assert.deepEqual(views.map((v) => v.tip), [false, true, false, true]);
});

// ── 주행거리 칸과 kmAtLeast 강조 (2026-10-30) ──
import { readKm } from "../lib/cautions.ts";
test("주행거리 글을 km로 읽어요 (쉼표·만 단위), 숫자가 둘 이상이거나 마일이면 읽지 않아요", () => {
  assert.equal(readKm("약 98,000km"), 98000);
  assert.equal(readKm("98000 km"), 98000);
  assert.equal(readKm("9.8만 km"), 98000);
  assert.equal(readKm("12만km"), 120000);
  assert.equal(readKm("5만~6만km"), null);
  assert.equal(readKm("60,000마일"), null);
  assert.equal(readKm("확인 불가"), null);
});
test("kmAtLeast: 주행거리가 기준 이상일 때만 강조해요", () => {
  const it = item("vehicle-12", { highlightWhen: { field: "주행거리", kmAtLeast: 100000 } });
  assert.equal(isHighlighted(it, { 주행거리: "약 123,456km" }), true);
  assert.equal(isHighlighted(it, { 주행거리: "10만 km" }), true);
  assert.equal(isHighlighted(it, { 주행거리: "약 98,000km" }), false);
  assert.equal(isHighlighted(it, {}), false);
});
test("시험용 흉내도 '주행거리:' 줄을 읽어요", () => {
  const r = stubExtract("물건명: 승용차\n차종·연식: 승용 / 2019년식\n주행거리: 약 98,000km\n최저입찰가: 8,200,000원");
  assert.equal(r.property["주행거리"], "약 98,000km");
});
