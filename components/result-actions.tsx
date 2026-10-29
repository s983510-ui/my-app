"use client";
// E. 결과 복사·인쇄·처음부터 다시 (DESIGN §3.1, PRD 4번 흐름 B)
import { useState } from "react";
import type { CautionViewData, NamedCategory } from "@/lib/view-types.ts";

type Props = { category: NamedCategory; cautions: CautionViewData[]; checkedAt: string | null; onReset: () => void };

function toText(category: NamedCategory, cautions: CautionViewData[], checkedAt: string | null): string {
  const lines = [`[온비드 물건 주의사항 도우미] 종류: ${category.name}`, "※ 참고용 안내이며 법률 자문이 아닙니다. 최종 확인은 공고문과 관할 기관에서 해 주세요.", `주의사항 표 마지막 확인일: ${checkedAt ?? "검토 중"}`, ""];
  cautions.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.required ? "[필수] " : ""}${c.highlight ? "[해당 가능성 높음] " : ""}${c.title}`);
    lines.push(`   ${c.plain}`);
    if (c.steps.length > 0) lines.push(`   참고 절차: ${c.steps.map((s, n) => `${n + 1}) ${s}`).join(" ")}`);
    lines.push(`   담당 기관: ${c.agency}`);
    lines.push(`   근거: ${c.sources.map((s) => `${s.label} ${s.url}`).join(", ")}`);
    lines.push(`   확인일: ${c.checkedAt}`);
  });
  const field = cautions.filter((c) => c.onSite.length > 0);
  if (field.length > 0) {
    lines.push("", "[현장에서 볼 점]");
    field.forEach((c) => {
      lines.push(`- ${c.title}`);
      c.onSite.forEach((l) => lines.push(`  □ ${l}`));
    });
  }
  return lines.join("\n");
}

export default function ResultActions({ category, cautions, checkedAt, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(toText(category, cautions, checkedAt));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  const button = "rounded-lg border border-blue bg-white px-4 py-2 font-semibold text-blue";
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" onClick={copy} className={button}>
        {copied ? "복사했어요" : "결과 복사"}
      </button>
      <button type="button" onClick={() => window.print()} className={button}>
        인쇄
      </button>
      <button type="button" onClick={onReset} className={button}>
        처음부터 다시
      </button>
    </div>
  );
}
