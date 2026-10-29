"use client";
// F. 공고문 "기타" 칸 문안 만들기 (매각 담당 직원용, PRD 6번)
// 직원이 고른 항목의 "공고문 문체 문장"(주의사항 표에서 검토를 마친 것)을 번호를 매겨 이어 붙여요. AI는 쓰지 않아서 표에 없는 내용은 들어가지 않아요.
import { useMemo, useState } from "react";
import type { CautionViewData } from "@/lib/view-types.ts";

type Props = { cautions: CautionViewData[]; categoryName: string };

const HEADING = "[입찰 전 유의사항]";
const FOOTER = "※ 위 내용은 참고용 안내이며 법률 자문이 아닙니다. 입찰 전에 공고문과 관할 기관에서 최종 확인하시기 바랍니다.";

/** 고른 항목들로 문안을 만들어요. 고른 게 없으면 빈 글이에요. */
export function buildNoticeText(items: { title: string; notice: string }[]): string {
  if (items.length === 0) return "";
  const lines = [HEADING];
  items.forEach((c, i) => lines.push(`${i + 1}. ${c.notice}`));
  lines.push("", FOOTER);
  return lines.join("\n");
}

export default function NoticeBuilder({ cautions, categoryName }: Props) {
  const rows = cautions.filter((c) => c.notice.length > 0);
  const [picked, setPicked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    rows.forEach((c) => {
      init[c.id] = c.required;
    });
    return init;
  });
  const [copied, setCopied] = useState(false);

  const chosen = rows.filter((c) => picked[c.id]);
  const text = useMemo(() => buildNoticeText(chosen), [chosen]);
  if (rows.length === 0) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.getElementById("notice-text") as HTMLTextAreaElement | null;
      if (area) {
        area.select();
        document.execCommand("copy");
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const button = "rounded-lg border border-blue bg-white px-4 py-2 font-semibold text-blue disabled:text-muted";
  return (
    <section className="no-print rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">⑤ 공고문 &lsquo;기타&rsquo; 문안 만들기 (매각 담당 직원용)</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        {categoryName} 물건의 공고문 &lsquo;기타&rsquo; 칸에 넣을 글이에요. 넣고 싶은 항목을 고르면 아래 문안이 만들어져요. 복사한 뒤 온비드에서 물건에 맞게 고쳐 쓰세요.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <input
              id={`notice-${c.id}`}
              type="checkbox"
              checked={!!picked[c.id]}
              onChange={(e) => setPicked({ ...picked, [c.id]: e.target.checked })}
              className="mt-1 h-5 w-5 shrink-0 accent-blue"
            />
            <label htmlFor={`notice-${c.id}`} className="leading-7 text-ink">
              {c.required && <span className="mr-2 inline-block rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">필수</span>}
              {c.title}
            </label>
          </li>
        ))}
      </ul>
      <label htmlFor="notice-text" className="mt-4 block text-sm font-semibold text-navy">
        만들어진 문안 ({chosen.length}개 항목 · {text.length.toLocaleString("ko-KR")}자)
      </label>
      <textarea
        id="notice-text"
        readOnly
        value={text}
        rows={Math.min(18, Math.max(5, text.split("\n").length + 3))}
        placeholder="위에서 넣을 항목을 고르면 문안이 여기에 나와요."
        className="mt-1 w-full rounded-lg border border-line bg-card p-3 text-base leading-7 outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={copy} disabled={text.length === 0} className={button}>
          {copied ? "복사했어요" : "문안 복사"}
        </button>
        <span className="text-xs text-muted">검토를 마친 표의 문장만 들어가요. 결론이나 입찰 권유는 들어가지 않아요.</span>
      </div>
    </section>
  );
}
