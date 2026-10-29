// 성공 기준 5개를 샘플 20건으로 재는 평가 스크립트예요 (PLAN 작업 17, PRD 3번 "나").
// Design Ref: §9 평가 — 작업 브랜치의 Vercel 미리보기 주소에 1분 5회 속도로 보내요.
//
// 실행 (실제 AI, 조인우 님 PC):
//   node scripts/eval.mjs https://<미리보기-주소>
// 실행 (이 작업 공간, 시험 모드 서버로 스크립트 자체 확인):
//   node scripts/eval.mjs http://localhost:3300 --local
//   --local: 기다리지 않고, 샘플마다 다른 접속 주소를 붙여 보내요 (내 PC 시험 서버에서만 의미 있어요)
import { mkdirSync, writeFileSync } from "node:fs";
import { SAMPLES } from "../data/samples.ts";
import { CAUTIONS } from "../data/cautions.ts";

const base = (process.argv[2] || "").replace(/\/$/, "");
const local = process.argv.includes("--local");
if (!base.startsWith("http")) {
  console.log("사용법: node scripts/eval.mjs <주소> [--local]");
  process.exit(2);
}

const GAP_MS = local ? 0 : 13000; // 1분 5회 제한 안에서 보내려고 13초 간격
const TIME_LIMIT_MS = 10000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const byId = new Map(CAUTIONS.map((c) => [c.id, c]));

const rows = [];
for (const [i, s] of SAMPLES.entries()) {
  if (i > 0 && GAP_MS) await sleep(GAP_MS);
  const headers = { "Content-Type": "application/json" };
  if (local) headers["x-forwarded-for"] = `10.99.0.${i + 1}`;
  const started = Date.now();
  let status = 0;
  let body = null;
  try {
    const res = await fetch(`${base}/api/analyze`, { method: "POST", headers, body: JSON.stringify({ text: s.text }) });
    status = res.status;
    body = await res.json();
  } catch (e) {
    body = { error: { code: "NETWORK", message: String(e) } };
  }
  const ms = Date.now() - started;

  const row = { id: s.id, title: s.title, answer: s.answer, status, ms, error: body?.error?.code ?? null };
  row.category = body?.category?.id ?? null;
  row.candidates = (body?.candidates ?? []).map((c) => c.id);
  row.correct = row.category === s.answer;
  row.answerInCandidates = row.candidates.includes(s.answer);
  row.masked = body?.masked ?? null;

  const cautions = body?.cautions ?? [];
  // 필수 항목 빠짐: 정답 종류로 확정됐을 때, 표의 필수 항목이 모두 결과에 있는지
  const requiredIds = CAUTIONS.filter((c) => c.category === s.answer && c.required).map((c) => c.id);
  row.missingRequired = row.correct ? requiredIds.filter((id) => !cautions.some((c) => c.id === id)) : [];
  // 출처: 결과의 모든 항목에 출처가 1개 이상
  row.noSource = cautions.filter((c) => !Array.isArray(c.sources) || c.sources.length === 0).map((c) => c.id);
  // 지어내기: 결과 항목이 표에 없거나, 쉬운 설명·종류가 표와 다르면
  row.fabricated = cautions
    .filter((c) => {
      const t = byId.get(c.id);
      return !t || t.plain !== c.plain || t.title !== c.title || (row.category && t.category !== row.category);
    })
    .map((c) => c.id);
  // 강조 기대 항목이 강조됐는지 (참고 지표)
  row.missingHighlight = row.correct ? s.expectHighlight.filter((id) => !cautions.some((c) => c.id === id && c.highlight)) : [];
  rows.push(row);
  console.log(
    `${s.id} ${row.correct ? "✅" : row.answerInCandidates ? "🟡" : "❌"} 정답 ${s.answer} / 결과 ${row.category ?? "후보:" + row.candidates.join(",")} · ${ms}ms${row.error ? " · 오류 " + row.error : ""}`,
  );
}

const n = rows.length;
const accuracy = rows.filter((r) => r.correct).length / n;
const missingRequired = rows.reduce((a, r) => a + r.missingRequired.length, 0);
const totalItems = rows.reduce((a, r) => a + (r.correct ? 1 : 0), 0);
const withSource = rows.every((r) => r.noSource.length === 0);
const slow = rows.filter((r) => r.ms > TIME_LIMIT_MS).length;
const fabricated = rows.reduce((a, r) => a + r.fabricated.length, 0);
const tableIncomplete = rows.filter((r) => r.error === "TABLE_INCOMPLETE").length;

const summary = [
  ["물건 종류 분류 정확도", `${Math.round(accuracy * 100)}% (${rows.filter((r) => r.correct).length}/${n})`, "90% 이상", accuracy >= 0.9],
  ["핵심 주의사항 빠짐", `${missingRequired}건 (확정된 ${totalItems}건 기준)`, "0건", missingRequired === 0],
  ["근거 출처 표시율", withSource ? "100%" : "100% 미만", "100%", withSource],
  ["결과가 나오는 시간", `10초 초과 ${slow}건 (최대 ${Math.max(...rows.map((r) => r.ms))}ms)`, "10초 이내", slow === 0],
  ["표에 없는 내용 지어내기", `${fabricated}건`, "0건", fabricated === 0],
];
console.log("\n성공 기준 결과 (PRD 3번 나)");
for (const [name, value, goal, ok] of summary) console.log(`${ok ? "✅" : "❌"} ${name}: ${value} / 목표 ${goal}`);
if (tableIncomplete) console.log(`\n⚠ ${tableIncomplete}건은 표 검토 전이라 결과가 나오지 않았어요(TABLE_INCOMPLETE). 표 검토(작업 4) 후 다시 재 주세요.`);
console.log(`(참고) 후보에 정답이 들어 있던 건: ${rows.filter((r) => !r.correct && r.answerInCandidates).length}건, 개인정보 지움: ${rows.filter((r) => r.masked).length}건`);

mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true });
const out = new URL(`../test-results/eval-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`, import.meta.url);
writeFileSync(out, JSON.stringify({ base, local, summary, rows }, null, 2));
console.log(`\n자세한 기록: ${out.pathname}`);
process.exit(summary.every((s) => s[3]) ? 0 : 1);
