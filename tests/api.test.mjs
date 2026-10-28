// 서버 API 시험이에요 (L1, DESIGN §9). 시험 모드 개발 서버가 떠 있어야 해요.
// 실행 순서:
//   1) AI_STUB=1 SHOW_UNREVIEWED=1 RATE_LIMIT_PER_MINUTE=30 npm run dev -- -p 3300
//   2) BASE_URL=http://localhost:3300 node --test tests/api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SAMPLES } from "../data/samples.ts";

const BASE = process.env.BASE_URL;
const skip = !BASE && "BASE_URL이 없어서 건너뛰어요 (개발 서버를 띄운 뒤 실행)";
let ipSeq = 0;
const freshIp = () => `10.10.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

async function post(path, body, ip = freshIp()) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test("글자 수가 20자 미만이면 400 TEXT_LENGTH", { skip }, async () => {
  const r = await post("/api/analyze", { text: "짧은 글" });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "TEXT_LENGTH");
});

test("JSON이 아니면 400 BAD_REQUEST", { skip }, async () => {
  const r = await post("/api/analyze", "이건 JSON이 아니에요");
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "BAD_REQUEST");
});

test("정상 요청은 DESIGN §4.5 모양으로 답해요 (농지 → 농지취득자격증명 강조)", { skip }, async () => {
  const r = await post("/api/analyze", { text: SAMPLES[0].text });
  assert.equal(r.status, 200);
  for (const key of ["masked", "property", "aiFallback", "category", "candidates", "cautions", "tableCheckedAt"]) {
    assert.ok(key in r.body, `${key}가 없어요`);
  }
  assert.equal(r.body.category.id, "farmland");
  const first = r.body.cautions[0];
  assert.equal(first.id, "farmland-01");
  assert.equal(first.highlight, true);
  assert.ok(first.sources.length >= 1 && first.checkedAt);
  assert.ok(!("text" in first), "설명 원문은 보내지 않아요");
});

test("개인정보가 든 글은 masked: true, 응답 어디에도 그 번호가 없어요", { skip }, async () => {
  const s = SAMPLES.find((x) => x.id === "S10");
  const r = await post("/api/analyze", { text: s.text });
  assert.equal(r.body.masked, true);
  assert.ok(!JSON.stringify(r.body).includes("900101"));
});

test("애매한 글은 후보 2~3개 또는 8개를 줘요", { skip }, async () => {
  const r = await post("/api/analyze", { text: "물건 설명: 오래된 물건 하나를 매각합니다. 자세한 내용은 현장 확인 바랍니다." });
  assert.equal(r.status, 200);
  assert.equal(r.body.category, null);
  assert.ok(r.body.candidates.length === 8 || (r.body.candidates.length >= 2 && r.body.candidates.length <= 3));
  assert.equal(r.body.cautions, null);
});

test("AI가 실패하면 200 + aiFallback + 단서 기반 후보", { skip }, async () => {
  const r = await post("/api/analyze", { text: SAMPLES[0].text + "\n[AI_FAIL]" });
  assert.equal(r.status, 200);
  assert.equal(r.body.aiFallback, true);
  assert.equal(r.body.candidates[0].id, "farmland");
});

test("후보를 고르면 /api/cautions가 결과를 줘요", { skip }, async () => {
  const r = await post("/api/cautions", { categoryId: "vehicle", property: { 지목: "답", 엉뚱한칸: "x" } });
  assert.equal(r.status, 200);
  assert.equal(r.body.category.id, "vehicle");
  assert.ok(r.body.cautions.every((c) => c.id.startsWith("vehicle-")));
});

test("목록 밖 종류를 고르면 400 BAD_CATEGORY", { skip }, async () => {
  const r = await post("/api/cautions", { categoryId: "apartment", property: {} });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "BAD_CATEGORY");
});

test("같은 접속자가 1분에 너무 많이 보내면 429, 두 API가 횟수를 함께 세요", { skip }, async () => {
  const ip = "10.250.250.250";
  let last;
  for (let i = 0; i < 40; i++) {
    last = await post(i % 2 ? "/api/cautions" : "/api/analyze", i % 2 ? { categoryId: "land", property: {} } : { text: "짧은 글" }, ip);
    if (last.status === 429) break;
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error.code, "RATE_LIMITED");
});
