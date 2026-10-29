// 서버 API 파일에서 maxDuration(초) 값을 읽어 와요. 시험이 숫자를 따로 적지 않게 하려는 도우미예요.
import { readFileSync } from "node:fs";

export async function maxDurationOfFetchLinkRoute() {
  const src = readFileSync(new URL("../../app/api/fetch-link/route.ts", import.meta.url), "utf8");
  const m = /export const maxDuration = (\d+);/.exec(src);
  if (!m) throw new Error("maxDuration을 찾지 못했어요");
  return Number(m[1]);
}
