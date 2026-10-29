// F. 현장에서 볼 점 — 방문 때 가져가서 쓰는 체크리스트 (PRD 6번 범위, 인쇄 가능)
// 내용은 검토를 마친 주의사항 표의 onSite 문장만 모아 보여줘요. 결론("괜찮다/위험하다")은 쓰지 않아요.
import type { CautionViewData } from "@/lib/view-types.ts";

export default function FieldChecklist({ cautions }: { cautions: CautionViewData[] }) {
  const rows = cautions.filter((c) => c.onSite.length > 0);
  if (rows.length === 0) return null;
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">④ 현장에서 볼 점</h2>
      <p className="mt-1 text-sm text-muted">현장을 직접 볼 때 눈으로 확인할 곳이에요. 인쇄해서 가져가면 편해요.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((c) => (
          <li key={c.id}>
            <p className="font-semibold text-ink">{c.title}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {c.onSite.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-ink">
                  <input type="checkbox" aria-label={`${line} 확인함`} className="mt-1 h-5 w-5 shrink-0 accent-blue" />
                  <span className="leading-7">{line}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
