"use client";
// D. 종류가 애매할 때 후보 고르기 (DESIGN §3.1, PRD 4번 흐름 C, must 1 규칙 3)
import type { NamedCategory } from "@/lib/view-types.ts";

type Props = {
  candidates: NamedCategory[];
  aiFallback: boolean;
  busy: boolean;
  /** 이미 골라서 결과가 나온 종류 (없으면 null) */
  selectedId: string | null;
  onPick: (c: NamedCategory) => void;
};

export default function CategoryPicker({ candidates, aiFallback, busy, selectedId, onPick }: Props) {
  return (
    <section className="no-print rounded-xl border border-blue bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">어떤 종류에 가까운지 골라 주세요</h2>
      {selectedId && <p className="mt-1 text-sm text-muted">다른 종류를 누르면 그 종류의 안내로 바뀌어요.</p>}
      <p className="mt-1 text-sm text-muted">
        {aiFallback ? "종류를 자동으로 정하지 못했어요. 가까운 종류를 골라 주세요." : "공고문만으로는 종류를 확실히 정하기 어려워요."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            aria-pressed={c.id === selectedId}
            onClick={() => onPick(c)}
            className={`rounded-lg border border-blue px-4 py-3 font-semibold disabled:text-muted ${c.id === selectedId ? "bg-blue text-white" : "bg-white text-blue"}`}
          >
            {c.name}{c.id === selectedId ? " ✓" : ""}
          </button>
        ))}
      </div>
    </section>
  );
}
