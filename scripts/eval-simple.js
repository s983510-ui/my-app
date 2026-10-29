/* eslint-disable @typescript-eslint/no-require-imports -- 낮은 버전 Node에서 돌려야 해서 require를 써요 */
// 낮은 버전의 Node(12 이상)에서도 도는 평가 스크립트예요. eval.mjs와 같은 기준으로 재요.
// 실행: node scripts/eval-simple.js https://<미리보기-주소>
// 데이터는 scripts/eval-data.json 에서 읽어요(만드는 법: scripts/make-eval-data.mjs).
var fs = require("fs");
var path = require("path");
var https = require("https");
var http = require("http");
var urlMod = require("url");

var data = JSON.parse(fs.readFileSync(path.join(__dirname, "eval-data.json"), "utf8"));
var SAMPLES = data.samples;
var CAUTIONS = data.cautions;
var base = (process.argv[2] || "").replace(/\/$/, "");
var local = process.argv.indexOf("--local") !== -1;
if (base.indexOf("http") !== 0) {
  console.log("사용법: node scripts/eval-simple.js <주소>");
  process.exit(2);
}
var GAP_MS = local ? 0 : 13000;
var TIME_LIMIT_MS = 10000;
var byId = {};
CAUTIONS.forEach(function (c) { byId[c.id] = c; });

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function post(text, extraHeaders) {
  return new Promise(function (resolve) {
    var u = urlMod.parse(base + "/api/analyze");
    var payload = JSON.stringify({ text: text });
    var headers = { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) };
    Object.keys(extraHeaders).forEach(function (k) { headers[k] = extraHeaders[k]; });
    var mod = u.protocol === "https:" ? https : http;
    var req = mod.request(
      { method: "POST", hostname: u.hostname, port: u.port, path: u.path, headers: headers },
      function (res) {
        var chunks = [];
        res.on("data", function (d) { chunks.push(d); });
        res.on("end", function () {
          var body = null;
          try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (e) { body = { error: { code: "NOT_JSON" } }; }
          resolve({ status: res.statusCode, body: body });
        });
      }
    );
    req.setTimeout(30000, function () { req.destroy(new Error("30초 안에 답이 없어요")); });
    req.on("error", function (e) { resolve({ status: 0, body: { error: { code: "NETWORK", message: String(e) } } }); });
    req.write(payload);
    req.end();
  });
}

(async function main() {
  var rows = [];
  for (var i = 0; i < SAMPLES.length; i++) {
    var s = SAMPLES[i];
    if (i > 0 && GAP_MS) await sleep(GAP_MS);
    var h = {};
    if (local) h["x-forwarded-for"] = "10.99.0." + (i + 1);
    var started = Date.now();
    var r = await post(s.text, h);
    var ms = Date.now() - started;
    var body = r.body || {};
    var row = { id: s.id, title: s.title, answer: s.answer, status: r.status, ms: ms, error: body.error ? body.error.code : null };
    row.category = body.category ? body.category.id : null;
    row.candidates = (body.candidates || []).map(function (c) { return c.id; });
    row.correct = row.category === s.answer;
    row.answerInCandidates = row.candidates.indexOf(s.answer) !== -1;
    row.masked = body.masked === undefined ? null : body.masked;
    var cautions = body.cautions || [];
    function has(id, hi) { return cautions.some(function (c) { return c.id === id && (!hi || c.highlight); }); }
    var requiredIds = CAUTIONS.filter(function (c) { return c.category === s.answer && c.required; }).map(function (c) { return c.id; });
    row.missingRequired = row.correct ? requiredIds.filter(function (id) { return !has(id); }) : [];
    row.noSource = cautions.filter(function (c) { return !Array.isArray(c.sources) || c.sources.length === 0; }).map(function (c) { return c.id; });
    row.fabricated = cautions.filter(function (c) {
      var t = byId[c.id];
      return !t || t.plain !== c.plain || t.title !== c.title || (row.category && t.category !== row.category);
    }).map(function (c) { return c.id; });
    row.missingHighlight = row.correct ? s.expectHighlight.filter(function (id) { return !has(id, true); }) : [];
    rows.push(row);
    console.log(s.id + " " + (row.correct ? "✅" : row.answerInCandidates ? "🟡" : "❌") + " 정답 " + s.answer + " / 결과 " + (row.category || "후보:" + row.candidates.join(",")) + " · " + ms + "ms" + (row.error ? " · 오류 " + row.error : ""));
  }

  var n = rows.length;
  var okCount = rows.filter(function (x) { return x.correct; }).length;
  var accuracy = okCount / n;
  var missingRequired = rows.reduce(function (a, x) { return a + x.missingRequired.length; }, 0);
  var withSource = rows.every(function (x) { return x.noSource.length === 0; });
  var slow = rows.filter(function (x) { return x.ms > TIME_LIMIT_MS; }).length;
  var maxMs = Math.max.apply(null, rows.map(function (x) { return x.ms; }));
  var fabricated = rows.reduce(function (a, x) { return a + x.fabricated.length; }, 0);
  var tableIncomplete = rows.filter(function (x) { return x.error === "TABLE_INCOMPLETE"; }).length;
  var summary = [
    ["물건 종류 분류 정확도", Math.round(accuracy * 100) + "% (" + okCount + "/" + n + ")", "90% 이상", accuracy >= 0.9],
    ["핵심 주의사항 빠짐", missingRequired + "건 (확정된 " + okCount + "건 기준)", "0건", missingRequired === 0],
    ["근거 출처 표시율", withSource ? "100%" : "100% 미만", "100%", withSource],
    ["결과가 나오는 시간", "10초 초과 " + slow + "건 (최대 " + maxMs + "ms)", "10초 이내", slow === 0],
    ["표에 없는 내용 지어내기", fabricated + "건", "0건", fabricated === 0],
  ];
  console.log("\n성공 기준 결과 (PRD 3번 나)");
  summary.forEach(function (x) { console.log((x[3] ? "✅" : "❌") + " " + x[0] + ": " + x[1] + " / 목표 " + x[2]); });
  if (tableIncomplete) console.log("\n⚠ " + tableIncomplete + "건은 표 검토 전이라 결과가 나오지 않았어요(TABLE_INCOMPLETE).");
  console.log("(참고) 후보에 정답이 들어 있던 건: " + rows.filter(function (x) { return !x.correct && x.answerInCandidates; }).length + "건, 개인정보 지움: " + rows.filter(function (x) { return x.masked; }).length + "건");
  var dir = path.join(__dirname, "..", "test-results");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  var file = path.join(dir, "eval-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json");
  fs.writeFileSync(file, JSON.stringify({ base: base, summary: summary, rows: rows }, null, 2));
  console.log("\n자세한 기록: " + file);
  process.exit(summary.every(function (x) { return x[3]; }) ? 0 : 1);
})();
