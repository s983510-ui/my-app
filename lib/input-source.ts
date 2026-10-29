// 붙여넣기 말고 "사진(캡처)"이나 "링크"로 공고문을 넣을 때 쓰는 검사·변환 규칙이에요.
// 화면과 서버가 함께 쓰지 않아요(서버 전용). 서버가 사용자가 준 주소를 열 때는 아래 허용 목록만 열어요(SSRF 방지).

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
