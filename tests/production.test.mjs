// 운영 모드 시험이에요 (DESIGN §8·§9): 검토 전(needs-check) 항목이 운영에서는 절대 안 나가는지 봐요.
// 시험용 서버(ui·api 시험)는 SHOW_UNREVIEWED=1로 돌아서 이걸 못 봐요. 그래서 운영과 같은 모드로 따로 띄워요.
// 실행 순서:
//   1) npm run build
//   2) SHOW_UNREVIEWED=1 AI_STUB=1 npm run start -- -p 3301    (일부러 시험용 스위치를 켜 둬요. 운영 모드라 무시돼야 해요)
//   3) PROD_URL=http://localhost:3301 node --test tests/production.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAUTIONS } from "../data/cautions.ts";
import { CATEGORY_IDS } from "../data/categories.ts";

const BASE = process.env.PROD_URL;
const skip = !BASE && "PROD_URL이 없어서 건너뛰어요 (운영 모드 서버를 띄운 뒤 실행)";
let seq = 0;

async function cautionsOf(categoryId) {
  const res = await fetch(`${BASE}/api/cautions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.20.0.${++seq}` },
    body: JSON.stringify({ categoryId, property: {} }),
  });
  return { status: res.status, body: await res.json() };
}

for (const id of CATEGORY_IDS) {
  test(`운영 모드: ${id}는 확인 완료(confirmed) 항목만 나가요`, { skip }, async () => {
    const r = await cautionsOf(id);
    assert.equal(r.status, 200);
    const shown = r.body.cautions.map((c) => c.id).sort();
    const expected = CAUTIONS.filter((c) => c.category === id && c.status === "confirmed").map((c) => c.id).sort();
    assert.deepEqual(shown, expected);
    assert.ok(r.body.cautions.every((c) => !c.unreviewed), "검토 전 표시가 붙은 항목이 나왔어요");
    const required = CAUTIONS.filter((c) => c.category === id && c.required).map((c) => c.id);
    for (const rid of required) assert.ok(shown.includes(rid), `${rid} 필수 항목이 빠졌어요`);
  });
}

test("운영 모드: 검토 전 항목 id는 응답 어디에도 없어요", { skip }, async () => {
  const hidden = CAUTIONS.filter((c) => c.status !== "confirmed").map((c) => c.id);
  assert.ok(hidden.length > 0, "검토 전 항목이 하나도 없으면 이 시험은 의미가 없어요");
  for (const id of CATEGORY_IDS) {
    const r = await cautionsOf(id);
    const raw = JSON.stringify(r.body);
    for (const h of hidden) assert.ok(!raw.includes(`"${h}"`), `${h}가 응답에 들어 있어요`);
  }
});

test("운영 모드: 시험용 AI 흉내(AI_STUB)는 막혀서 CONFIG 오류가 나요", { skip }, async () => {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.20.1.${++seq}` },
    body: JSON.stringify({ text: "지목: 답. 소재지: 가상면 가상리 101 농지 1,652㎡ 매각 공고" }),
  });
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.equal(body.error.code, "CONFIG");
});
