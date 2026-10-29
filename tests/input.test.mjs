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
