"use client";
// E. 이 물건에서 꼭 확인할 점 (DESIGN §3.1) — 필수·해당 표시, 쉬운 설명, 절차, 기관, 출처, 항목별 확인일 (PRD must 2)
// 결과가 길어지지 않게 항목은 제목만 보이고 눌러서 펼쳐요(필수 항목은 처음부터 펼쳐져 있어요). 인쇄할 때는 모두 펼쳐요.
import { useEffect, useRef } from "react";
import type { CautionViewData } from "@/lib/view-types.ts";

function CautionItem({ item }: { item: CautionViewData }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" aria-label={`${item.title} 확인함`} className="mt-1 h-5 w-5 shrink-0 accent-blue" />
        <details className="detail-box min-w-0 flex-1" open={item.required}>
          <summary className="detail-summary">
            {item.required && <span className="mr-2 inline-block rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">필수</span>}
            {item.highlight && <span className="mr-2 inline-block rounded bg-good px-2 py-0.5 text-xs font-bold text-white">해당 가능성 높음</span>}
            {item.tip && <span className="mr-2 inline-block rounded bg-navy px-2 py-0.5 text-xs font-bold text-white">경험자 팁</span>}
            {item.unreviewed && <span className="mr-2 inline-block rounded bg-muted px-2 py-0.5 text-xs font-bold text-white">검토 전 (시험용)</span>}
            <h3 className="inline font-bold text-ink">{item.title}</h3>
          </summary>
          <p className="mt-2 leading-7 text-ink">{item.plain}</p>
          {item.tip && <p className="mt-1 text-xs text-muted">법적 근거가 아니라 경험자들이 흔히 확인하는 점이에요. 참고만 하시고, 판단은 직접 해 주세요.</p>}
          {item.steps.length > 0 && (
            <div className="mt-2 text-sm leading-6">
              <p className="font-semibold text-navy">▸ 참고 절차</p>
              <ol className="ml-5 list-decimal text-ink">
                {item.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          <p className="mt-2 text-sm text-ink">
            <span className="font-semibold text-navy">▸ 담당 기관: </span>
            {item.agency}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold text-navy">{item.tip ? "▸ 참고 자료: " : "▸ 근거: "}</span>
            {item.sources.map((s, i) => (
              <span key={s.url + i}>
                {i > 0 && " · "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue underline">
                  {s.label} ↗
                </a>
              </span>
            ))}
          </p>
          <p className="mt-1 text-xs text-muted">확인일: {item.checkedAt}</p>
        </details>
      </div>
    </li>
  );
}

export default function CautionList({ cautions }: { cautions: CautionViewData[] }) {
  const box = useRef<HTMLElement>(null);

  function setAll(open: boolean) {
    box.current?.querySelectorAll("details").forEach((d) => {
      d.open = open;
    });
  }

  // 인쇄할 때는 접힌 칸도 모두 펼치고, 인쇄가 끝나면 원래대로 돌려놔요.
  useEffect(() => {
    let before: boolean[] = [];
    const onBefore = () => {
      const all = Array.from(box.current?.querySelectorAll("details") ?? []);
      before = all.map((d) => d.open);
      all.forEach((d) => {
        d.open = true;
      });
    };
    const onAfter = () => {
      Array.from(box.current?.querySelectorAll("details") ?? []).forEach((d, i) => {
        d.open = before[i] ?? d.open;
      });
    };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  const button = "rounded-lg border border-blue bg-white px-3 py-1 text-sm font-semibold text-blue";
  return (
    <section ref={box} className="rounded-xl border border-line bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy">③ 이 물건에서 꼭 확인할 점</h2>
        <div className="no-print flex gap-2">
          <button type="button" onClick={() => setAll(true)} className={button}>
            모두 펼치기
          </button>
          <button type="button" onClick={() => setAll(false)} className={button}>
            모두 접기
          </button>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {cautions.map((c) => (
          <CautionItem key={c.id} item={c} />
        ))}
      </ul>
    </section>
  );
}
