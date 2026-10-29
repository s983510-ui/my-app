// 배포해도 되는지 표 검토 상태를 알려주는 스크립트예요 (PLAN 작업 4·18).
// 실행: node scripts/check-release.mjs
// 필수 항목이 모두 검토 완료(confirmed)여야 운영에서 결과가 나와요 (DESIGN §8 표 품질).
// 이 스크립트는 검증 루프의 시험이 아니라, 배포 전에 따로 돌리는 점검표예요.
import { CAUTIONS } from "../data/cautions.ts";
import { CATEGORIES } from "../data/categories.ts";

let blocked = 0;
console.log("종류별 검토 현황 (검토 완료 / 전체, 필수 중 검토 전)\n");
for (const c of CATEGORIES) {
  const items = CAUTIONS.filter((i) => i.category === c.id);
  const done = items.filter((i) => i.status === "confirmed").length;
  const pendingRequired = items.filter((i) => i.required && i.status !== "confirmed");
  if (pendingRequired.length > 0) blocked += 1;
  const mark = pendingRequired.length === 0 ? "✅" : "⛔";
  console.log(`${mark} ${c.name}: ${done}/${items.length}` + (pendingRequired.length ? ` · 필수 검토 전: ${pendingRequired.map((i) => i.id).join(", ")}` : ""));
}
console.log(blocked === 0 ? "\n배포 가능: 모든 종류의 필수 항목이 검토를 마쳤어요." : `\n배포 전 검토 필요: ${blocked}개 종류의 필수 항목이 아직 검토 전이에요. 이대로 배포하면 그 종류는 "안내를 준비하지 못했어요"로 나와요.`);
process.exit(blocked === 0 ? 0 : 1);
