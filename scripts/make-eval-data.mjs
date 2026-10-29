// 낮은 버전의 Node에서도 평가를 돌릴 수 있게, 샘플·주의사항 표를 scripts/eval-data.json 으로 뽑아 두는 스크립트예요.
// 표나 샘플을 바꾸면 이 스크립트를 다시 실행해요: node scripts/make-eval-data.mjs
import { writeFileSync } from "node:fs";
import { SAMPLES } from "../data/samples.ts";
import { CAUTIONS } from "../data/cautions.ts";

const cautions = CAUTIONS.map((c) => ({ id: c.id, category: c.category, title: c.title, plain: c.plain, required: c.required }));
writeFileSync(new URL("./eval-data.json", import.meta.url), JSON.stringify({ samples: SAMPLES, cautions }, null, 1));
console.log(`샘플 ${SAMPLES.length}건, 표 ${cautions.length}항목을 eval-data.json에 적었어요.`);
