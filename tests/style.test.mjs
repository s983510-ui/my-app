// 화면 코드 색 금지 검사예요 (DESIGN §3.4, §9 색 금지 검사 / Chrome 109 호환).
// 실행: node --test tests/style.test.mjs
// Tailwind 기본 색 이름(oklch로 바뀜)과 "bg-색/50" 같은 투명도 표기(color-mix로 바뀜)를 쓰지 않았는지 봐요.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIRS = ["app", "components"];
const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTIL = "bg|text|border|ring|outline|from|via|to|fill|stroke|divide|placeholder|shadow|decoration|accent|caret";
const DEFAULT_COLOR = new RegExp(`\\b(?:${UTIL})-(?:${PALETTE})-\\d{2,3}\\b`, "g");
const OPACITY = new RegExp(`\\b(?:${UTIL})-[a-z0-9\\-\\[\\]#]+\\/\\d{1,3}\\b`, "g");

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(p);
  }
  return out;
}

test("화면 코드에 Tailwind 기본 색 이름이 없어요", () => {
  const found = [];
  for (const d of DIRS) for (const f of files(join(ROOT, d))) {
    for (const m of readFileSync(f, "utf8").match(DEFAULT_COLOR) ?? []) found.push(`${f.replace(ROOT, "")}: ${m}`);
  }
  assert.deepEqual(found, []);
});

test("화면 코드에 투명도 표기(/숫자)가 없어요", () => {
  const found = [];
  for (const d of DIRS) for (const f of files(join(ROOT, d))) {
    for (const m of readFileSync(f, "utf8").match(OPACITY) ?? []) found.push(`${f.replace(ROOT, "")}: ${m}`);
  }
  assert.deepEqual(found, []);
});

test("색 금지 검사가 실제로 잡아요", () => {
  assert.ok("bg-zinc-50".match(DEFAULT_COLOR));
  assert.ok("bg-black/[.06]".match(OPACITY) || "text-white/50".match(OPACITY));
  assert.equal("bg-navy text-blue".match(DEFAULT_COLOR), null);
});
