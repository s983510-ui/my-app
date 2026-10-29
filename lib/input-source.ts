// 붙여넣기 말고 "사진(캡처)"이나 "링크"로 공고문을 넣을 때 쓰는 검사·변환 규칙이에요.
// 서버가 사용자가 준 주소를 열 때는 아래 허용 목록만 열어요(SSRF 방지). 서버 전용 기능은 쓰지 않아서 화면에서도 불러 써요.

/** 읽어 올 수 있는 사이트: 온비드만이에요. */
export const ALLOWED_LINK_HOSTS = ["www.onbid.co.kr", "onbid.co.kr"];
/** 사진 한 장의 최대 크기(바이트). 화면에서 줄여서 보내므로 보통 훨씬 작아요. */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
/** 사진 요청 본문(글자로 바꾼 사진 포함)의 최대 크기 */
export const IMAGE_BODY_MAX_BYTES = 4_500_000;
/** 링크로 읽어 오는 페이지의 최대 크기(바이트) */
export const PAGE_MAX_BYTES = 1024 * 1024;

/** 사용자가 적은 주소가 읽어도 되는 온비드 주소인지 확인해요. 아니면 null이에요. */
export function parseAllowedLink(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  if (ALLOWED_LINK_HOSTS.indexOf(url.hostname.toLowerCase()) === -1) return null;
  return url;
}

/** 화면에서 보낸 사진(data 주소)이 올바른 모양이고 크기 제한 안인지 확인해요. */
export function checkImageDataUrl(value: unknown): { ok: true; mime: string } | { ok: false } {
  if (typeof value !== "string") return { ok: false };
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!m) return { ok: false };
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes === 0 || bytes > IMAGE_MAX_BYTES) return { ok: false };
  return { ok: true, mime: `image/${m[1]}` };
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** 웹 페이지(HTML)에서 눈에 보이는 글자만 뽑아요. 스크립트·스타일·태그는 버려요. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|table|h[1-6]|section|article|dd|dt)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " : ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, name: string) => {
      if (name[0] === "#") {
        const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
      }
      return ENTITIES[name.toLowerCase()] ?? " ";
    });
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/** 링크를 읽지 못한 이유. 이유마다 사용자에게 다른 안내를 보여줘요. */
export type LinkFailReason =
  | "BLOCKED" // 온비드가 요청을 막음(401·403·429)
  | "NOT_FOUND" // 주소가 없음(404·410)
  | "SERVER" // 온비드 서버 오류(5xx) 등
  | "TIMEOUT" // 너무 늦게 답함
  | "REDIRECT" // 허용되지 않은 주소로 이동하거나 이동이 너무 많음
  | "NOT_TEXT" // 글 페이지가 아님(파일·이미지 등)
  | "EMPTY" // 페이지는 열렸지만 읽을 글이 거의 없음(자바스크립트로 그려지는 화면)
  | "NETWORK"; // 연결 자체가 안 됨

const OTHER_WAYS = " 사진을 올리거나 글을 붙여넣어 주세요.";

const LINK_FAIL_MESSAGES: Record<LinkFailReason, string> = {
  EMPTY: "이 화면은 글이 자바스크립트로 그려져서 링크로는 읽을 수 없었어요." + OTHER_WAYS,
  BLOCKED: "온비드가 이 요청을 막은 것 같아요." + OTHER_WAYS,
  NOT_FOUND: "주소가 맞지 않거나 없어진 물건 같아요. 온비드에서 물건을 열어 주소창의 전체 주소를 다시 복사해 주세요.",
  SERVER: "온비드 서버가 지금 제대로 답하지 않아요. 잠시 후 다시 해 보거나" + OTHER_WAYS,
  TIMEOUT: "온비드가 너무 늦게 답해서 중간에 멈췄어요. 잠시 후 다시 해 보거나" + OTHER_WAYS,
  REDIRECT: "다른 주소로 넘어가는 링크라 읽지 않았어요. 온비드 물건 화면의 주소를 다시 복사해 주세요.",
  NOT_TEXT: "글이 있는 화면이 아니에요(파일이나 이미지 주소 같아요). 온비드 물건 화면의 주소를 넣어 주세요.",
  NETWORK: "온비드에 연결하지 못했어요. 잠시 후 다시 해 보거나" + OTHER_WAYS,
};

export function linkFailMessage(reason: LinkFailReason): string {
  return LINK_FAIL_MESSAGES[reason];
}

/** 온비드 주소인데 물건 번호 같은 주소 뒷부분(?로 시작)이 없으면 true예요. 이런 주소는 빈 화면이라 읽을 글이 없어요. */
export function looksLikeBareOnbidLink(raw: string): boolean {
  const url = parseAllowedLink(raw);
  return url !== null && url.search === "" && url.hash === "";
}
