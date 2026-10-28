// D. 정리된 물건 정보 (DESIGN §3.1) — 없는 칸은 "공고문에 없음"(회색) (PRD must 1 규칙 1)
import { PROPERTY_FIELDS } from "@/lib/types.ts";
import type { AnalyzeResponse, NamedCategory } from "@/lib/view-types.ts";

type Props = {
  property: AnalyzeResponse["property"];
  category: NamedCategory | null;
  masked: boolean;
  aiFallback: boolean;
};

export default function PropertyTable({ property, category, masked, aiFallback }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">② 물건 정보</h2>
      {category && (
        <p className="mt-2">
          <span className="text-sm text-muted">종류: </span>
          <span className="inline-block rounded-full bg-navy px-3 py-1 text-sm font-semibold text-white">{category.name}</span>
        </p>
      )}
      {aiFallback ? (
        <p className="mt-3 text-sm text-muted">물건 정보를 자동으로 정리하지 못했어요.</p>
      ) : (
        <table className="mt-3 w-full border-collapse text-sm">
          <tbody>
            {PROPERTY_FIELDS.map((field) => {
              const value = property[field];
              return (
                <tr key={field} className="border-t border-line">
                  <th scope="row" className="w-28 py-2 pr-3 text-left align-top font-medium text-muted">
                    {field}
                  </th>
                  <td className={`py-2 ${value ? "text-ink" : "text-muted"}`}>{value ?? "공고문에 없음"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {masked && <p className="mt-3 text-sm text-good">개인정보를 지우고 분석했어요.</p>}
    </section>
  );
}
