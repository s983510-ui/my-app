// 사진·링크 입력 규칙 시험이에요 (lib/input-source.ts). 실행: node --test tests/input.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAllowedLink, checkImageDataUrl, htmlToText, IMAGE_MAX_BYTES } from "../lib/input-source.ts";

test("링크: 온비드 https 주소만 허용해요", () => {
  assert.ok(parseAllowedLink("https://www.onbid.co.kr/op/cta/cltrdtl/collateralRealEstateDetail.do?cltrNo=1"));
  assert.ok(parseAllowedLink("  https://onbid.co.kr/x  "));
  assert.ok(parseAllowedLink("https://WWW.ONBID.CO.KR/x"));
});

test("링크: 다른 사이트·http·내부 주소·꼼수 주소는 막아요 (SSRF 방지)", () => {
  const bad = [
    "http://www.onbid.co.kr/x",
    "https://evil.com/",
    "https://www.onbid.co.kr.evil.com/",
    "https://evil.com/www.onbid.co.kr",
    "https://www.onbid.co.kr@evil.com/",
    "https://user:pw@www.onbid.co.kr/",
    "https://www.onbid.co.kr:8443/",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://169.254.169.254/latest/meta-data/",
    "https://[::1]/",
    "ftp://www.onbid.co.kr/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "www.onbid.co.kr",
    "",
    null,
    123,
  ];
  for (const b of bad) assert.equal(parseAllowedLink(b), null, `막혀야 해요: ${b}`);
});

test("사진: jpeg·png·webp data 주소만 받고, 크기 제한을 지켜요", () => {
  const ok = "data:image/jpeg;base64," + "A".repeat(400);
  assert.equal(checkImageDataUrl(ok).ok, true);
  assert.equal(checkImageDataUrl("data:image/png;base64," + "A".repeat(40)).ok, true);
  assert.equal(checkImageDataUrl("data:image/webp;base64," + "A".repeat(40)).ok, true);
  assert.equal(checkImageDataUrl("data:image/gif;base64,AAAA").ok, false);
  assert.equal(checkImageDataUrl("data:image/svg+xml;base64,AAAA").ok, false);
  assert.equal(checkImageDataUrl("data:text/html;base64,AAAA").ok, false);
  assert.equal(checkImageDataUrl("https://example.com/a.jpg").ok, false);
  assert.equal(checkImageDataUrl("data:image/jpeg;base64,").ok, false);
  assert.equal(checkImageDataUrl("data:image/jpeg;base64,@@@@").ok, false);
  assert.equal(checkImageDataUrl(null).ok, false);
  const tooBig = "data:image/jpeg;base64," + "A".repeat(Math.ceil((IMAGE_MAX_BYTES * 4) / 3) + 8);
  assert.equal(checkImageDataUrl(tooBig).ok, false);
});

test("HTML에서 보이는 글만 뽑아요 (스크립트·스타일 제거, 표 칸 구분)", () => {
  const html = `<html><head><style>.a{color:red}</style><script>var x="비밀"</script></head>
  <body><h1>물건 상세</h1><table><tr><th>소재지</th><td>경상남도&nbsp;창녕군</td></tr><tr><th>지목</th><td>답</td></tr></table>
  <p>면적 1,652&#32;㎡</p><!-- 주석 --><noscript>켜 주세요</noscript></body></html>`;
  const text = htmlToText(html);
  assert.ok(text.includes("물건 상세"));
  assert.ok(text.includes("소재지 : 경상남도 창녕군"));
  assert.ok(text.includes("지목 : 답"));
  assert.ok(text.includes("면적 1,652 ㎡"));
  for (const gone of ["비밀", "color:red", "주석", "켜 주세요", "<", ">"]) assert.ok(!text.includes(gone), `${gone}이(가) 남았어요`);
});

// ── 링크 읽기의 시간·이동 제한 (lib/fetch-link.ts). 내 PC의 시험용 서버만 열어요. ──
import { createServer } from "node:http";
import { fetchLinkText, LinkError, LINK_TOTAL_MS } from "../lib/fetch-link.ts";
import { maxDurationOfFetchLinkRoute } from "./helpers/route-duration.mjs";

function listen(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve({ server, url: new URL(`http://127.0.0.1:${server.address().port}/`) }));
  });
}

test("링크 읽기: 답이 없으면 정해진 시간 안에 포기해요", async () => {
  const { server, url } = await listen(() => {}); // 답을 주지 않아요
  const started = Date.now();
  try {
    await assert.rejects(fetchLinkText(url, { hopMs: 300, totalMs: 600 }), LinkError);
  } finally {
    server.closeAllConnections();
    server.close();
  }
  assert.ok(Date.now() - started < 2000, `${Date.now() - started}ms 걸렸어요`);
});

test("링크 읽기: 이동을 거듭해도 전체 시간을 넘기지 않아요", async () => {
  let n = 0;
  const { server, url } = await listen((req, res) => {
    // 자기 자신으로 계속 이동시켜요. 이동 주소가 허용 목록 밖이라 첫 이동에서 막혀야 해요.
    n += 1;
    res.writeHead(302, { Location: `http://127.0.0.1:${server.address().port}/${n}` });
    res.end();
  });
  try {
    await assert.rejects(fetchLinkText(url, { hopMs: 300, totalMs: 600 }), LinkError);
  } finally {
    server.close();
  }
  assert.equal(n, 1, "허용되지 않은 주소로 이동하면 따라가지 않아요");
});

test("링크 읽기: 전체 제한(12초)이 서버 제한(maxDuration)보다 짧아요", async () => {
  const max = await maxDurationOfFetchLinkRoute();
  assert.ok(LINK_TOTAL_MS / 1000 < max, `전체 ${LINK_TOTAL_MS / 1000}초는 maxDuration ${max}초보다 짧아야 해요`);
});

// ── 링크를 읽지 못한 이유별 안내 ──
import { linkFailMessage, looksLikeBareOnbidLink } from "../lib/input-source.ts";

test("링크 실패 안내: 이유마다 다른 문구이고, 사진·붙여넣기 같은 다음 방법을 알려줘요", () => {
  const reasons = ["BLOCKED", "NOT_FOUND", "SERVER", "TIMEOUT", "REDIRECT", "NOT_TEXT", "EMPTY", "NETWORK"];
  const seen = new Set();
  for (const r of reasons) {
    const m = linkFailMessage(r);
    assert.ok(m.length > 10, r);
    seen.add(m);
  }
  assert.equal(seen.size, reasons.length, "이유마다 문구가 달라야 해요");
  for (const r of ["EMPTY", "BLOCKED", "SERVER", "TIMEOUT", "NETWORK"]) assert.ok(linkFailMessage(r).includes("사진을 올리거나"), r);
  for (const r of ["NOT_FOUND", "REDIRECT", "NOT_TEXT"]) assert.ok(linkFailMessage(r).includes("주소"), r);
});

test("물건 번호가 없는 온비드 주소는 미리 알아봐요", () => {
  assert.equal(looksLikeBareOnbidLink("https://www.onbid.co.kr/op/cltrpbancinf/cltrdtl/CltrDtlController/mvmnCltrDtl.do"), true);
  assert.equal(looksLikeBareOnbidLink("https://www.onbid.co.kr/op/x.do?cltrNo=123&cltrHistNo=45"), false);
  assert.equal(looksLikeBareOnbidLink("https://evil.com/a"), false, "온비드가 아니면 여기서 판단하지 않아요");
  assert.equal(looksLikeBareOnbidLink("그냥 글"), false);
});

test("링크 읽기 실패 이유: 서버 응답에 따라 BLOCKED·NOT_FOUND·SERVER·NOT_TEXT·REDIRECT로 나눠요", async () => {
  const cases = [
    { status: 403, headers: {}, reason: "BLOCKED" },
    { status: 404, headers: {}, reason: "NOT_FOUND" },
    { status: 500, headers: {}, reason: "SERVER" },
    { status: 200, headers: { "Content-Type": "application/pdf" }, reason: "NOT_TEXT" },
    { status: 302, headers: { Location: "http://127.0.0.1:1/x" }, reason: "REDIRECT" },
  ];
  for (const c of cases) {
    const { server, url } = await listen((req, res) => {
      res.writeHead(c.status, c.headers);
      res.end("x");
    });
    try {
      await assert.rejects(fetchLinkText(url, { hopMs: 1000, totalMs: 2000 }), (e) => e instanceof LinkError && e.reason === c.reason, `${c.status} → ${c.reason}`);
    } finally {
      server.close();
    }
  }
});

test("링크 읽기 실패 이유: 답이 없으면 TIMEOUT, 연결이 안 되면 NETWORK", async () => {
  const slow = await listen(() => {});
  try {
    await assert.rejects(fetchLinkText(slow.url, { hopMs: 200, totalMs: 400 }), (e) => e instanceof LinkError && e.reason === "TIMEOUT");
  } finally {
    slow.server.closeAllConnections();
    slow.server.close();
  }
  await assert.rejects(fetchLinkText(new URL("http://127.0.0.1:1/"), { hopMs: 500, totalMs: 800 }), (e) => e instanceof LinkError && e.reason === "NETWORK");
});
