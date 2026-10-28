// E. 이 물건에서 꼭 확인할 점 (DESIGN §3.1) — 필수·해당 표시, 쉬운 설명, 절차, 기관, 출처, 항목별 확인일 (PRD must 2)
import type { CautionViewData } from "@/lib/view-types.ts";

function CautionItem({ item }: { item: CautionViewData }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="checkbox" aria-label={`${item.title} 확인함`} className="h-5 w-5 accent-blue" />
        {item.required && <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-white">필수</span>}
        {item.highlight && <span className="rounded bg-good px-2 py-0.5 text-xs font-bold text-white">해당 가능성 높음</span>}
        {item.unreviewed && <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-white">검토 전 (시험용)</span>}
        <h3 className="font-bold text-ink">{item.title}</h3>
      </div>
      <p className="mt-2 leading-7 text-ink">{item.plain}</p>
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
        <span className="font-semibold text-navy">▸ 근거: </span>
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
    </li>
  );
}

export default function CautionList({ cautions }: { cautions: CautionViewData[] }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">③ 이 물건에서 꼭 확인할 점</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {cautions.map((c) => (
          <CautionItem key={c.id} item={c} />
        ))}
      </ul>
    </section>
  );
}
