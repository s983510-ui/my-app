// 주의사항 표예요. 화면에 보이는 주의사항 내용은 모두 여기서만 나와요 (PRD must 2 규칙 1).
// Design Ref: §4.5 주의사항 표 항목 — 형식은 lib/types.ts의 CautionItem, 검사는 lib/caution-check.ts.
// 항목은 PLAN 작업 3에서 농지 → 건물 → 차량 → 기계 → 나머지 순서로 채우고,
// 작업 4에서 조인우 님 검토를 마친 항목만 status를 "confirmed"로 바꿔요.
import type { CautionItem } from "../lib/types.ts";

export const CAUTIONS: CautionItem[] = [];
