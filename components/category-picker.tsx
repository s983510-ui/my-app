"use client";
// D. 종류가 애매할 때 후보 고르기 (DESIGN §3.1, PRD 4번 흐름 C, must 1 규칙 3)
import type { NamedCategory } from "@/lib/view-types.ts";

type Props = {
  candidates: NamedCategory[];
  aiFallback: boolean;
  busy: boolean;
  onPick: (c: NamedCategory) => void;
};

export default function CategoryPicker({ candidates, aiFallback, busy, onPick }: Props) {
  return (
    <section className="no-print rounded-xl border border-blue bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">어떤 종류에 가까운지 골라 주세요</h2>
      <p className="mt-1 text-sm text-muted">
        {aiFallback ? "종류를 자동으로 정하지 못했어요. 가까운 종류를 골라 주세요." : "공고문만으로는 종류를 확실히 정하기 어려워요."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(c)}
            className="rounded-lg border border-blue bg-white px-4 py-3 font-semibold text-blue disabled:text-muted"
          >
            {c.name}
          </button>
        ))}
      </div>
    </section>
  );
}
