// 화면 확인용 스크립트: 휴대폰(390px)·PC(1280px)·Chrome 109 흉내 브라우저로 페이지를 열어
// 확인할 문구가 보이는지, 가로 스크롤이 없는지, 오류가 없는지 검사하고 캡처를 test-results/에 남겨요.
// 사용법: node tests/check-screen.mjs <주소> <확인할 문구>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Playwright는 앱 의존성이 아니라 이 작업 공간에 설치된 것을 불러와요.
const loadModule = createRequire(import.meta.url);
const { chromium } = loadModule("playwright");
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const url = process.argv[2] || "http://localhost:3000/";
const expectText = process.argv[3] || "";
const shim = fs.readFileSync(path.join(__dirname, "chrome109-shim.js"), "utf8");
const outDir = path.join(__dirname, "..", "test-results");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  let failed = false;
  const cases = [
    { name: "mobile-390", width: 390, old: false },
    { name: "desktop-1280", width: 1280, old: false },
    { name: "chrome109-390", width: 390, old: true },
  ];
  for (const c of cases) {
    const page = await browser.newPage({ viewport: { width: c.width, height: 844 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (c.old) await page.addInitScript(shim);
    await page.goto(url, { waitUntil: "networkidle" });
    const visible = expectText ? await page.getByText(expectText, { exact: true }).first().isVisible() : true;
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({ path: path.join(outDir, `${c.name}.png`), fullPage: true });
    const ok = visible && scrollWidth <= c.width && errors.length === 0;
    if (!ok) failed = true;
    console.log(`${ok ? "통과" : "실패"} ${c.name}: 문구 보임=${visible}, 가로폭=${scrollWidth}, 오류=${errors.length ? errors.join(" | ") : "없음"}`);
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
