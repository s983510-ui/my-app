// 입력 제한: 글자 수와 요청 횟수를 막아서 AI 비용 남용을 줄여요.
// Design Ref: §4.2 1·2단계, §8 횟수 제한 / PRD must 1 규칙 4, 7번
// 횟수는 서버 메모리로 세요. 서버가 다시 켜지면 초기화되고, Vercel 서버가 여러 대면 서버마다 따로 세요(PRD 7번에서 받아들인 한계).

import { TEXT_MAX, TEXT_MIN } from "./limits-shared.ts";

export { TEXT_MAX, TEXT_MIN };

/** 붙여넣은 글의 길이가 20~10,000자인지 확인해요. */
export function isTextLengthOk(text: unknown): text is string {
  return typeof text === "string" && text.trim().length >= TEXT_MIN && text.length <= TEXT_MAX;
}

/** 운영에서는 PRD 숫자(1분 5회·하루 500회)로 고정하고, 내 PC 시험에서만 환경변수로 바꿀 수 있어요. */
function limitFromEnv(name: string, fallback: number): number {
  if (process.env.NODE_ENV === "production") return fallback;
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MINUTE_MS = 60 * 1000;

type Store = { perIp: Map<string, number[]>; day: string; dayCount: number };
const store: Store = { perIp: new Map(), day: "", dayCount: 0 };

/** 한국 시간 기준 날짜 (YYYY-MM-DD). 하루 횟수를 자정에 초기화할 때 써요. */
function koreaDay(now: number): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 접속자 주소: x-forwarded-for의 첫 번째 값을 써요. 없으면 "unknown". */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return "unknown";
}

/** 요청 하나를 세고, 허용되는지 알려줘요. 두 서버 API가 같은 함수를 써서 횟수를 공유해요. */
export function takeRequest(ip: string, now: number = Date.now()): { ok: boolean } {
  const perMinute = limitFromEnv("RATE_LIMIT_PER_MINUTE", 5);
  const perDay = limitFromEnv("RATE_LIMIT_PER_DAY", 500);

  const day = koreaDay(now);
  if (store.day !== day) {
    store.day = day;
    store.dayCount = 0;
  }
  if (store.dayCount >= perDay) return { ok: false };

  const recent = (store.perIp.get(ip) ?? []).filter((t) => now - t < MINUTE_MS);
  if (recent.length >= perMinute) {
    store.perIp.set(ip, recent);
    return { ok: false };
  }
  recent.push(now);
  store.perIp.set(ip, recent);
  store.dayCount += 1;

  // 오래된 접속자 기록은 가끔 정리해서 메모리가 늘지 않게 해요.
  if (store.perIp.size > 5000) {
    for (const [key, times] of store.perIp) {
      if (times.every((t) => now - t >= MINUTE_MS)) store.perIp.delete(key);
    }
  }
  return { ok: true };
}

/** 시험에서만 써요: 기록을 비워요. */
export function resetRateLimitForTest(): void {
  store.perIp.clear();
  store.day = "";
  store.dayCount = 0;
}
