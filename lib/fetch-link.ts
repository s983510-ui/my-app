// 사용자가 준 온비드 링크의 페이지 글자를 읽어 와요. 허용된 사이트(온비드)만 열고, 크기·시간·이동 횟수를 제한해요.
import { PAGE_MAX_BYTES, htmlToText, parseAllowedLink } from "./input-source.ts";
import type { LinkFailReason } from "./input-source.ts";

/** 주소 한 번 여는 데 쓰는 최대 시간 */
export const LINK_TIMEOUT_MS = 6000;
/** 이동(redirect)까지 합친 전체 최대 시간. 서버 제한(maxDuration 15초)보다 짧게 둬요. */
export const LINK_TOTAL_MS = 12000;
const MAX_REDIRECTS = 3;

/** 링크를 열지 못했거나 글자를 읽지 못했어요. */
export class LinkError extends Error {
  reason: LinkFailReason;
  constructor(message: string, reason: LinkFailReason) {
    super(message);
    this.reason = reason;
  }
}

/** 허용된 주소의 페이지에서 글자만 뽑아 돌려줘요. 다른 사이트로 이동하면 멈춰요. */
export async function fetchLinkText(
  start: URL,
  limits: { hopMs?: number; totalMs?: number } = {},
): Promise<string> {
  const hopMs = limits.hopMs ?? LINK_TIMEOUT_MS;
  const deadline = Date.now() + (limits.totalMs ?? LINK_TOTAL_MS);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new LinkError("시간이 너무 오래 걸려요", "TIMEOUT");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(hopMs, remaining));
    try {
      const res = await fetch(url.href, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html,text/plain", "Accept-Language": "ko-KR,ko;q=0.9" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = parseAllowedLink(new URL(res.headers.get("location") ?? "", url).href);
        if (!next) throw new LinkError("허용되지 않은 주소로 이동해요", "REDIRECT");
        url = next;
        continue;
      }
      if (!res.ok) {
        const reason: LinkFailReason =
          res.status === 401 || res.status === 403 || res.status === 429 ? "BLOCKED" : res.status === 404 || res.status === 410 ? "NOT_FOUND" : "SERVER";
        throw new LinkError(`응답 ${res.status}`, reason);
      }
      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      if (type.indexOf("text/html") === -1 && type.indexOf("text/plain") === -1) throw new LinkError("글 페이지가 아니에요", "NOT_TEXT");

      const reader = res.body?.getReader();
      if (!reader) throw new LinkError("내용이 없어요", "EMPTY");
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > PAGE_MAX_BYTES) {
          await reader.cancel();
          break; // 너무 크면 앞부분만 써요
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }
      const raw = new TextDecoder("utf-8").decode(bytes);
      return type.indexOf("text/html") !== -1 ? htmlToText(raw) : raw;
    } catch (e) {
      if (e instanceof LinkError) throw e;
      // 시간 제한으로 멈춘 경우(AbortError)와 연결 실패를 나눠요.
      throw new LinkError(e instanceof Error ? e.name : "unknown", e instanceof Error && e.name === "AbortError" ? "TIMEOUT" : "NETWORK");
    } finally {
      clearTimeout(timer);
    }
  }
  throw new LinkError("이동이 너무 많아요", "REDIRECT");
}
