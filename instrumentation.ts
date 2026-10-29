// 서버가 시작될 때 한 번 실행돼요 (Next.js instrumentation).
// Design Ref: §8 보안 — 시험용 AI 흉내(AI_STUB)가 운영에서 켜져 있으면 시작을 거부해요.
export function register() {
  if (process.env.NODE_ENV === "production" && process.env.AI_STUB === "1") {
    throw new Error("AI_STUB는 운영에서 쓸 수 없어요. 환경변수에서 지워 주세요.");
  }
}
