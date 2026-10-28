// 화면 시험이에요 (L2·L3·호환성, DESIGN §3.5 점검 목록·§9). 시험 모드 개발 서버가 떠 있어야 해요.
// 실행: BASE_URL=http://localhost:3300 node --test tests/ui.test.mjs
// 휴대폰 390px·PC 1280px·Chrome 109 흉내(390px) 세 가지로 같은 시나리오를 돌려요.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { SAMPLES } from "../data/samples.ts";

const BASE = process.env.BASE_URL;
const skip = !BASE && "BASE_URL이 없어서 건너뛰어요 (개발 서버를 띄운 뒤 실행)";
const shim = readFileSync(new URL("./chrome109-shim.js", import.meta.url), "utf8");
const OUT = new URL("../test-results/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const cases = [
  { name: "mobile-390", width: 390, old: false },
  { name: "desktop-1280", width: 1280, old: false },
  { name: "chrome109-390", width: 390, old: true },
];

for (const c of cases) {
  test(`화면 시나리오 (${c.name})`, { skip, timeout: 120000 }, async () => {
    const { chromium } = createRequire(import.meta.url)("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: c.width, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (c.old) await page.addInitScript(shim);
    try {
      await page.goto(BASE + "/");

      // 처음: A·B·C만, 20자 미만이면 분석하기 꺼짐
      await page.getByText("공매 물건 주의사항 도우미").first().waitFor();
      assert.ok(await page.getByText("참고용 안내이며 법률 자문이 아닙니다").isVisible());
      assert.ok(await page.getByText("주의사항 표 마지막 확인일").isVisible());
      assert.ok(await page.getByText("외부 AI(OpenAI)로 보내져요").isVisible());
      await page.fill("#paste", "짧은 글");
      assert.equal(await page.getByRole("button", { name: "분석하기" }).isDisabled(), true);
      assert.ok(await page.getByText("4 / 10,000자").isVisible());

      // 시나리오 1: 붙여넣기 → 결과 (농지, 개인정보 있음)
      await page.fill("#paste", SAMPLES.find((s) => s.id === "S02").text);
      await page.getByRole("button", { name: "분석하기" }).click();
      await page.getByText("③ 이 물건에서 꼭 확인할 점").waitFor({ timeout: 15000 });
      assert.ok(await page.getByText("개인정보를 지우고 분석했어요").isVisible());
      assert.ok(await page.getByText("공고문에 없음").first().isVisible());
      const firstItem = page.locator("main li").first();
      assert.ok((await firstItem.innerText()).includes("농지취득자격증명"));
      assert.ok(await firstItem.getByText("필수").isVisible());
      assert.ok(await firstItem.getByText("해당 가능성 높음").isVisible());
      assert.ok((await firstItem.locator("a[href^='https://']").count()) >= 1);
      assert.ok(await firstItem.getByText(/확인일: \d{4}-\d{2}-\d{2}/).isVisible());
      for (const label of ["결과 복사", "인쇄", "처음부터 다시"]) assert.ok(await page.getByRole("button", { name: label }).isVisible());
      await page.screenshot({ path: `${OUT}ui-${c.name}-result.png`, fullPage: true });

      // 시나리오 2: 애매 → 후보 → 결과
      await page.getByRole("button", { name: "처음부터 다시" }).click();
      await page.fill("#paste", "물건 설명: 오래된 물건 하나를 매각합니다. 자세한 내용은 현장 확인 바랍니다.");
      await page.getByRole("button", { name: "분석하기" }).click();
      await page.getByText("어떤 종류에 가까운지 골라 주세요").waitFor();
      await page.getByRole("button", { name: "차량" }).click();
      await page.getByText("③ 이 물건에서 꼭 확인할 점").waitFor();
      assert.ok((await page.locator("main li").first().innerText()).includes("이전등록"));

      // 시나리오 3: AI 실패 → 후보 → 결과
      await page.getByRole("button", { name: "처음부터 다시" }).click();
      await page.fill("#paste", SAMPLES[0].text + "\n[AI_FAIL]");
      await page.getByRole("button", { name: "분석하기" }).click();
      await page.getByText("종류를 자동으로 정하지 못했어요").waitFor();
      await page.getByRole("button", { name: "농지(전·답·과수원)" }).click();
      await page.getByText("③ 이 물건에서 꼭 확인할 점").waitFor();

      // 가로 스크롤 없음, 오류 없음
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= c.width, `가로 폭 ${scrollWidth}px`);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
