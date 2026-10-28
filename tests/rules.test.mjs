// 서버 규칙 시험이에요 (PLAN 작업 6~10).
// 실행: node --test tests/rules.test.mjs
// Design Ref: §9 L0 규칙
import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPersonalInfo, MASK_TOKEN } from "../lib/mask.ts";
import { isTextLengthOk, takeRequest, clientIp, resetRateLimitForTest, TEXT_MAX } from "../lib/rate-limit.ts";

// ── 작업 6: 개인정보 지우기 (DESIGN §4.4 표의 예 전부) ──
const shouldMask = [
  "900101-1234567", "900101 1234567", "9001011234567",
  "010-1234-5678", "010 1234 5678", "01012345678", "010.1234.5678", "011-123-4567",
  "02-123-4567", "055 123 4567", "031-1234-5678",
];
for (const v of shouldMask) {
  test(`개인정보 "${v}"는 지워요`, () => {
    const r = maskPersonalInfo(`문의: ${v} 로 연락`);
    assert.equal(r.masked, true);
    assert.equal(r.text, `문의: ${MASK_TOKEN} 로 연락`);
  });
}
const shouldKeep = ["1,234㎡", "12,340,000원", "123-4", "산 12-3", "2026-11-01", "2026-0101-001234", "제8조", "1,000,000,000원"];
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
  assert.equal(clientIp(new Headers({ "x-real-ip": "5.5.5.5" })), "5.5.5.5");
  assert.equal(clientIp(new Headers()), "unknown");
});
