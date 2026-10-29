"use client";
// 붙여넣기 말고 "사진·캡처 올리기"나 "온비드 링크 불러오기"로 글을 넣는 칸이에요 (PRD 6번 입력 방식).
// 읽어 온 글은 붙여넣기 칸에 넣어 주고, 사용자가 확인·수정한 뒤 [분석하기]를 눌러요.
import { useRef, useState } from "react";
import type { ErrorResponse } from "@/lib/view-types.ts";

type Props = { onText: (text: string) => void; disabled: boolean };
type Loaded = { text: string; masked: boolean };

const WAIT_MS = 35000;
const LONG_SIDE = 1600;
const NETWORK_ERROR = "연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.";
const TIMEOUT_ERROR = "시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.";

async function post(url: string, body: unknown): Promise<{ ok: true; data: Loaded } | { ok: false; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WAIT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: (data as ErrorResponse)?.error?.message ?? NETWORK_ERROR };
    return { ok: true, data: data as Loaded };
  } catch {
    return { ok: false, message: controller.signal.aborted ? TIMEOUT_ERROR : NETWORK_ERROR };
  } finally {
    clearTimeout(timer);
  }
}

/** 사진을 긴 쪽 1600px 이하의 jpg로 줄여서 data 주소로 바꿔요 (올리는 크기와 AI 비용을 줄여요). */
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("canvas"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image"));
    };
    img.src = objectUrl;
  });
}

export default function InputSources({ onText, disabled }: Props) {
  const [link, setLink] = useState("");
  const [working, setWorking] = useState<"image" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function done(r: { ok: true; data: Loaded } | { ok: false; message: string }, what: string) {
    setWorking(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onText(r.data.text);
    setNotice(
      `${what}에서 읽은 글을 아래 칸에 넣었어요. 잘못 읽은 곳이 있으면 고친 뒤 [분석하기]를 눌러 주세요.` +
        (r.data.masked ? " 개인정보 모양은 지웠어요." : ""),
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setWorking("image");
    let dataUrl: string;
    try {
      dataUrl = await shrinkImage(file);
    } catch {
      setWorking(null);
      setError("사진을 열 수 없어요. jpg·png 사진을 다시 올려 주세요.");
      return;
    }
    done(await post("/api/ocr", { image: dataUrl, consent: true }), "사진");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onLink() {
    setError(null);
    setNotice(null);
    setWorking("link");
    done(await post("/api/fetch-link", { url: link }), "링크");
  }

  const busy = disabled || working !== null;
  const button = "rounded-lg border border-blue bg-white px-4 py-2 font-semibold text-blue";
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div>
        <label className="flex items-start gap-2 rounded-lg bg-card px-3 py-2 text-sm leading-6 text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={working !== null}
            className="mt-1 h-5 w-5 shrink-0 accent-blue"
          />
          <span>
            사진 속 글자(이름·주소·연락처 등 <b>개인정보가 보이면 그대로</b>)를 읽기 위해 사진을 외부 AI(OpenAI)에 전달하는 것에 동의해요.
            <span className="block text-xs text-muted">전달하기 전에는 가릴 수 없으니, 개인정보는 가리고 올려 주세요. 사진은 저장하지 않아요.</span>
          </span>
        </label>
        <label
          className={`${button} mt-2 inline-block ${agreed && !busy ? "cursor-pointer" : "cursor-not-allowed text-muted"}`}
          aria-disabled={!agreed || busy}
        >
          {working === "image" ? "사진 읽는 중… (최대 30초)" : "📷 사진·캡처 올리기"}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            disabled={busy || !agreed}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="sr-only"
            aria-label="사진 또는 캡처 올리기"
          />
        </label>
        {!agreed && <p className="mt-1 text-xs leading-5 text-muted">위 동의에 체크하면 사진을 올릴 수 있어요.</p>}
      </div>
      <div>
        <div className="flex gap-2">
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={busy}
            placeholder="온비드 물건 주소 (https://www.onbid.co.kr/…)"
            aria-label="온비드 링크"
            className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-blue"
          />
          <button type="button" onClick={onLink} disabled={busy || link.trim().length === 0} className={`${button} shrink-0 disabled:text-muted`}>
            {working === "link" ? "불러오는 중…" : "링크 불러오기"}
          </button>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted">
          온비드 주소만 읽을 수 있어요. 읽지 못하는 화면도 있으니, 안 되면 사진을 올리거나 글을 붙여넣어 주세요.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-error-text bg-error-bg px-3 py-2 text-sm text-error-text">
          {error}
        </p>
      )}
      {notice && <p className="rounded-lg bg-card px-3 py-2 text-sm leading-6 text-good">{notice}</p>}
    </div>
  );
}
