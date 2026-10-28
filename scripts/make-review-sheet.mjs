// 주의사항 표 검토용 문서(docs/cautions-review.md)를 표에서 바로 만들어요 (PLAN 작업 4).
// 실행: node scripts/make-review-sheet.mjs
// 표를 고친 뒤 다시 실행하면 검토 문서도 같이 맞춰져요.
import { writeFileSync } from "node:fs";
import { CAUTIONS } from "../data/cautions.ts";
import { CATEGORIES } from "../data/categories.ts";

// 2026-10-28 조사 결과 (검색 도구로만 확인, 법령 원문은 직접 열어보지 못함)
const RESEARCH = {
  "farmland-01": "✔ 농지법 제8조(공매도 농취증 필요) 확인. △ 못 받았을 때 보증금 처리는 공식 근거 못 찾음 → 공고문 특별매각조건 확인으로만 적음",
  "farmland-02": "✔ 농지법 제32조 확인",
  "farmland-03": "✔ 농지법 제34조 확인 (제35조 전용신고 대상은 예외)",
  "farmland-04": "✔ 제10조(1년)·제11조(6개월) 확인. 이행강제금은 현행 제63조(옛 제62조)",
  "farmland-05": "✔ 장사법 제27조 제3항, 2001.1.13 기준 확인. 지료는 대법원 2017다228007 전원합의체",
  "forest-01": "✖ 산지관리법 조문 번호(제12조·제14조) 확인 못 함 → 법령 이름만 적음",
  "forest-02": "✔ farmland-05와 같음",
  "land-02": "△ 공매에 인도명령이 없다는 것은 해설 자료로만 확인 (법조문 근거·최근 개정 여부 확인 필요)",
  "land-03": "△ 제14조 제2항 확인. 국세징수법 공매가 시행령 몇 호의 예외인지는 확인 못 함",
  "building-res-01": "△ 주택임대차보호법 제3조 확인. 공매 인수 근거로 국세징수법 제92조 제3항 추가",
  "building-res-02": "△ land-02와 같음 (2차 자료만)",
  "building-res-03": "✔ 집합건물법 제18조 + 대법원 2001다8677 확인 (전유부분·연체료는 승계 대상 아님)",
  "building-res-04": "△ 제79조·제80조 확인. 전 소유자 때 부과된 이행강제금 승계 여부는 확인 못 함",
  "building-nonres-01": "△ 상가임대차법 제3조 확인. 공매 인수는 국세징수법 제92조 제3항",
  "building-nonres-02": "△ land-02와 같음",
  "building-nonres-03": "△ building-res-04와 같음",
  "building-nonres-04": "✔ building-res-03과 같음",
  "vehicle-01": "✔ 자동차관리법 제12조 + 자동차등록령 제26조, 15일 확인",
  "vehicle-02": "△ 자동차손해배상 보장법 제5조는 2차 자료로 확인",
  "vehicle-03": "△ 국세징수법 제92조(저당 등 소멸) 확인. 자동차 말소 실무는 확인 못 함",
  "machinery-02": "△ 2개월 등록 의무는 옛 조문으로만 확인 → 조문 번호 빼고 적음",
  "machinery-01": "✖ '현 상태 매각' 공식 근거 못 찾음 → 공고문 확인으로만 적음",
  "machinery-03": "✖ 반출 조건 공식 근거 못 찾음 → 공고문 확인으로만 적음",
  "movable-etc-01": "✖ machinery-01과 같음",
  "movable-etc-02": "✖ machinery-03과 같음",
};

const lines = [];
lines.push("# 주의사항 표 검토 문서");
lines.push("");
lines.push("> PLAN 작업 4용이에요. `node scripts/make-review-sheet.mjs`로 `data/cautions.ts`에서 자동으로 만들어요.");
lines.push("> 검토 순서: 농지 → 건물(주거·비주거) → 차량 → 기계 → 나머지 (PLAN 질문 2-나)");
lines.push("> 조사 표시: ✔ 검색으로 확인 · △ 일부만 확인/2차 자료 · ✖ 공식 근거 못 찾음 (법령 원문은 직접 열어보지 못했어요)");
lines.push("");
lines.push("**검토 방법:** 항목마다 출처 링크를 열어 원문과 맞는지 보고, 아래 칸에 ✅(맞음) / ✏️(고칠 점 적기) / ❌(빼기)를 적어 주세요.");
lines.push("검토가 끝난 항목은 `status`를 `confirmed`로, `checkedAt`을 검토한 날로 바꿔요.");
lines.push("");
const order = ["farmland", "building-res", "building-nonres", "vehicle", "machinery", "forest", "land", "movable-etc"];
for (const id of order) {
  const cat = CATEGORIES.find((c) => c.id === id);
  lines.push(`## ${cat.name}`);
  lines.push("");
  for (const item of CAUTIONS.filter((c) => c.category === id)) {
    lines.push(`### ${item.id} · ${item.title}${item.required ? " **[필수]**" : ""} — 상태: \`${item.status}\``);
    lines.push("");
    lines.push(`- **설명 원문:** ${item.text}`);
    lines.push(`- **쉬운 설명 (화면에 보임):** ${item.plain}`);
    if (item.highlightWhen) lines.push(`- **강조 조건:** '${item.highlightWhen.field}' 값이 ${item.highlightWhen.in.join("·")} 중 하나일 때`);
    lines.push(`- **참고 절차:** ${item.steps.map((s, i) => `${i + 1}) ${s}`).join(" ")}`);
    lines.push(`- **담당 기관:** ${item.agency}`);
    lines.push(`- **출처:** ${item.sources.map((s) => `[${s.label}](${encodeURI(s.url)})`).join(", ")}`);
    if (RESEARCH[item.id]) lines.push(`- **조사 메모:** ${RESEARCH[item.id]}`);
    lines.push(`- **검토 결과:** ☐ 맞음 ☐ 고칠 점: ________ ☐ 빼기`);
    lines.push("");
  }
}
writeFileSync(new URL("../docs/cautions-review.md", import.meta.url), lines.join("\n"));
console.log("docs/cautions-review.md를 만들었어요.");
