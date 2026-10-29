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
      await page.getByText("온비드 물건 주의사항 도우미").first().waitFor();
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
      // 현장에서 볼 점 (시험 서버는 검토 전 문장도 보여줘요)
      assert.ok(await page.getByText("④ 현장에서 볼 점").isVisible());
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

// ── 오류 안내 문구 (DESIGN §3.5·§7.1) ──
// 서버 오류를 흉내 내서, 화면 위쪽 알림 칸에 문구가 그대로 나오는지 봐요.
test("오류 6가지와 연결 문제 문구가 화면에 나와요", { skip, timeout: 120000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const { MESSAGES } = await import("../lib/api.ts");
  const STATUS = { TEXT_LENGTH: 400, BAD_CATEGORY: 400, BAD_REQUEST: 400, RATE_LIMITED: 429, TABLE_INCOMPLETE: 500, CONFIG: 500 };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const text = SAMPLES[0].text;
  try {
    for (const code of ["TEXT_LENGTH", "RATE_LIMITED", "TABLE_INCOMPLETE", "CONFIG", "BAD_REQUEST"]) {
      await page.route("**/api/analyze", (r) =>
        r.fulfill({ status: STATUS[code], contentType: "application/json", body: JSON.stringify({ error: { code, message: MESSAGES[code] } }) }),
      );
      await page.goto(BASE + "/");
      await page.fill("#paste", text);
      await page.getByRole("button", { name: "분석하기" }).click();
      await page.getByRole("alert").filter({ hasText: MESSAGES[code] }).waitFor({ timeout: 5000 });
      await page.unroute("**/api/analyze");
    }

    // 연결이 끊긴 경우
    await page.route("**/api/analyze", (r) => r.abort());
    await page.goto(BASE + "/");
    await page.fill("#paste", text);
    await page.getByRole("button", { name: "분석하기" }).click();
    await page.getByRole("alert").filter({ hasText: "연결에 문제가 있어요" }).waitFor({ timeout: 5000 });
    await page.unroute("**/api/analyze");

    // 후보를 고른 뒤 종류 확인 단계의 오류 (BAD_CATEGORY, TABLE_INCOMPLETE)
    for (const code of ["BAD_CATEGORY", "TABLE_INCOMPLETE"]) {
      await page.route("**/api/cautions", (r) =>
        r.fulfill({ status: STATUS[code], contentType: "application/json", body: JSON.stringify({ error: { code, message: MESSAGES[code] } }) }),
      );
      await page.goto(BASE + "/");
      await page.fill("#paste", "물건 설명: 오래된 물건 하나를 매각합니다. 자세한 내용은 현장 확인 바랍니다.");
      await page.getByRole("button", { name: "분석하기" }).click();
      await page.getByText("어떤 종류에 가까운지 골라 주세요").waitFor();
      await page.getByRole("button", { name: "차량" }).click();
      await page.getByRole("alert").filter({ hasText: MESSAGES[code] }).waitFor({ timeout: 5000 });
      await page.unroute("**/api/cautions");
    }
  } finally {
    await browser.close();
  }
});

// ── Gap 9·10·11: 글자 수 안내, 후보 바꾸기, 응답이 늦을 때 ──
test("10,000자가 차면 안내가 나오고, 후보를 고른 뒤에도 다른 종류로 바꿀 수 있어요", { skip, timeout: 60000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  try {
    await page.goto(BASE + "/");
    await page.fill("#paste", "가".repeat(10500));
    assert.ok(await page.getByText("10,000자까지만 들어가요").isVisible());
    assert.ok(await page.getByText("10,000 / 10,000자").isVisible());

    await page.fill("#paste", "물건 설명: 오래된 물건 하나를 매각합니다. 자세한 내용은 현장 확인 바랍니다.");
    await page.getByRole("button", { name: "분석하기" }).click();
    await page.getByText("어떤 종류에 가까운지 골라 주세요").waitFor();
    await page.getByRole("button", { name: "차량" }).click();
    await page.getByText("③ 이 물건에서 꼭 확인할 점").waitFor();
    assert.ok((await page.locator("main li").first().innerText()).includes("이전등록"));

    // 같은 화면에서 다른 후보로 바꾸기
    await page.getByRole("button", { name: /^농지/ }).click();
    await page.locator("main li").filter({ hasText: "농지취득자격증명" }).first().waitFor();
    assert.equal(await page.getByRole("button", { name: /^농지/ }).getAttribute("aria-pressed"), "true");
  } finally {
    await browser.close();
  }
});

test("서버 응답이 15초 넘게 없으면 오래 걸린다는 안내가 나와요", { skip, timeout: 60000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  try {
    await page.route("**/api/analyze", () => {}); // 답을 주지 않고 붙잡아 둬요
    await page.goto(BASE + "/");
    await page.fill("#paste", SAMPLES[0].text);
    await page.getByRole("button", { name: "분석하기" }).click();
    await page.getByRole("alert").filter({ hasText: "시간이 너무 오래 걸려요" }).waitFor({ timeout: 20000 });
    assert.equal(await page.getByRole("button", { name: "분석하기" }).isEnabled(), true);
  } finally {
    await browser.close();
  }
});

// ── 접고 펼치기: 필수만 펼쳐져 있고, 눌러서 펼치며, 인쇄 때는 모두 펼쳐져요 ──
for (const c of cases) {
  test(`접고 펼치기 (${c.name})`, { skip, timeout: 60000 }, async () => {
    const { chromium } = createRequire(import.meta.url)("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: c.width, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (c.old) await page.addInitScript(shim);
    try {
      await page.goto(BASE + "/");
      await page.fill("#paste", SAMPLES.find((s) => s.id === "S15").text);
      await page.getByRole("button", { name: "분석하기" }).click();
      await page.getByText("③ 이 물건에서 꼭 확인할 점").waitFor({ timeout: 15000 });

      const opens = () => page.locator("main li details").evaluateAll((els) => els.map((e) => e.open));
      const first = await opens();
      const required = await page.locator("main li").evaluateAll((els) => els.filter((e) => e.querySelector("details")).map((e) => /필수/.test(e.innerText)));
      assert.deepEqual(first, required, "필수 항목만 처음부터 펼쳐져 있어야 해요");
      assert.ok(first.some((o) => !o), "접힌 항목이 있어야 해요");

      // 접힌 항목의 제목을 눌러 펼치기
      const closed = page.locator("main li details:not([open]) summary").first();
      await closed.click();
      assert.equal((await opens()).filter(Boolean).length, first.filter(Boolean).length + 1);

      await page.getByRole("button", { name: "모두 펼치기" }).click();
      assert.ok((await opens()).every(Boolean));
      await page.getByRole("button", { name: "모두 접기" }).click();
      assert.ok((await opens()).every((o) => !o));

      // 인쇄 직전에는 모두 펼쳐지고, 끝나면 원래대로 돌아와요
      await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
      assert.ok((await opens()).every(Boolean));
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      assert.ok((await opens()).every((o) => !o));

      assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= c.width);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${OUT}collapse-${c.name}.png`, fullPage: true });
    } finally {
      await browser.close();
    }
  });
}

// ── 사진·링크로 넣기 ──
test("사진을 올리면 읽은 글이 붙여넣기 칸에 들어가요 (개인정보는 지워져요)", { skip, timeout: 60000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(BASE + "/");
    assert.ok(await page.getByText("사진을 외부 AI(OpenAI)에 전달하는 것에 동의해요").isVisible());
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    // 동의에 체크하기 전에는 사진을 올릴 수 없어요
    assert.equal(await page.locator('input[type="file"]').isDisabled(), true);
    assert.ok(await page.getByText("위 동의에 체크하면 사진을 올릴 수 있어요").isVisible());
    await page.getByRole("checkbox", { name: /개인정보가 보이면 그대로/ }).check();
    assert.equal(await page.locator('input[type="file"]').isDisabled(), false);
    await page.setInputFiles('input[type="file"]', { name: "capture.png", mimeType: "image/png", buffer: png });
    await page.getByText("사진에서 읽은 글을 아래 칸에 넣었어요").waitFor({ timeout: 15000 });
    const value = await page.inputValue("#paste");
    assert.ok(value.includes("지목: 답"));
    assert.ok(!value.includes("010-1234-5678"));
    assert.ok(await page.getByText("전화번호·주민등록번호 모양은 지웠어요. 이름·주소 같은 다른 개인정보는 그대로이니 확인해 주세요").isVisible());
    // 읽은 글로 바로 분석할 수 있어요
    await page.getByRole("button", { name: "분석하기" }).click();
    await page.getByText("③ 이 물건에서 꼭 확인할 점").waitFor({ timeout: 15000 });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("사진이 아닌 파일이나 허용되지 않은 링크는 안내가 나와요", { skip, timeout: 60000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  try {
    await page.goto(BASE + "/");
    await page.getByRole("checkbox", { name: /개인정보가 보이면 그대로/ }).check();
    await page.setInputFiles('input[type="file"]', { name: "a.png", mimeType: "image/png", buffer: Buffer.from("사진이 아니에요") });
    await page.getByRole("alert").filter({ hasText: "사진을 열 수 없어요" }).waitFor({ timeout: 10000 });

    await page.fill('input[type="url"]', "https://evil.com/");
    await page.getByRole("button", { name: "링크 불러오기" }).click();
    await page.getByRole("alert").filter({ hasText: "온비드(onbid.co.kr) 링크만" }).waitFor({ timeout: 10000 });
    assert.equal(await page.inputValue("#paste"), "");
  } finally {
    await browser.close();
  }
});

// ── 링크 실패 안내 ──
test("물건 번호가 없는 온비드 주소는 서버에 묻지 않고 안내하고, 실패하면 해 볼 방법을 알려줘요", { skip, timeout: 60000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  let serverCalls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/fetch-link")) serverCalls++;
  });
  try {
    await page.goto(BASE + "/");
    await page.fill('input[type="url"]', "https://www.onbid.co.kr/op/cltrpbancinf/cltrdtl/CltrDtlController/mvmnCltrDtl.do");
    await page.getByRole("button", { name: "링크 불러오기" }).click();
    await page.getByRole("alert").filter({ hasText: "물건 번호가 빠진 주소 같아요" }).waitFor({ timeout: 5000 });
    assert.ok(await page.getByText("링크가 안 읽힐 때는 이렇게 해 보세요").isVisible());
    assert.equal(serverCalls, 0, "번호 없는 주소는 서버에 묻지 않아요");

    // 번호가 있는 주소는 서버가 읽어 봐요. 이 시험 환경에서는 온비드에 연결되지 않으니 실패 안내가 나와요.
    await page.fill('input[type="url"]', "https://www.onbid.co.kr/op/x.do?cltrNo=1");
    await page.getByRole("button", { name: "링크 불러오기" }).click();
    await page.getByRole("alert").filter({ hasText: /온비드|글|사진/ }).first().waitFor({ timeout: 30000 });
    assert.equal(serverCalls, 1);
    assert.ok(await page.getByText("링크가 안 읽힐 때는 이렇게 해 보세요").isVisible());
    const alertText = await page.getByRole("alert").filter({ hasText: /온비드|글|사진/ }).first().innerText();
    assert.ok(alertText.includes("사진") || alertText.includes("주소"), alertText);
  } finally {
    await browser.close();
  }
});

// ── 브라우저 자동 번역 방지: 번역 도구가 한국어 문장을 바꿔 놓지 않게 해요 ──
test("페이지가 자동 번역을 막아요 (translate=no, notranslate)", { skip, timeout: 30000 }, async () => {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(BASE + "/");
    assert.equal(await page.locator("html").getAttribute("lang"), "ko");
    assert.equal(await page.locator("html").getAttribute("translate"), "no");
    assert.equal(await page.locator('meta[name="google"]').getAttribute("content"), "notranslate");
  } finally {
    await browser.close();
  }
});
