"use client";
// 화면 1장의 흐름을 관리해요: 붙여넣기 → (종류 확정 또는 후보 고르기) → 결과 (DESIGN §3.2 화면 상태)
import { useState } from "react";
import AppHeader from "./app-header.tsx";
import Disclaimer from "./disclaimer.tsx";
import PasteBox from "./paste-box.tsx";
import PropertyTable from "./property-table.tsx";
import CategoryPicker from "./category-picker.tsx";
import CautionList from "./caution-list.tsx";
import FieldChecklist from "./field-checklist.tsx";
import ResultActions from "./result-actions.tsx";
import type { AnalyzeResponse, CautionsResponse, ErrorResponse, NamedCategory } from "@/lib/view-types.ts";

const NETWORK_ERROR = "연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.";
const TIMEOUT_ERROR = "시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.";
// 서버 제한(10초)보다 조금 길게 기다리고, 그래도 답이 없으면 멈춰요.
const WAIT_MS = 15000;

async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
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
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: controller.signal.aborted ? TIMEOUT_ERROR : NETWORK_ERROR };
  } finally {
    clearTimeout(timer);
  }
}

export default function AuctionHelper({ initialCheckedAt }: { initialCheckedAt: string | null }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [category, setCategory] = useState<NamedCategory | null>(null);
  const [cautions, setCautions] = useState<CautionsResponse["cautions"] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(initialCheckedAt);

  function reset() {
    setText("");
    setError(null);
    setAnalysis(null);
    setCategory(null);
    setCautions(null);
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    setAnalysis(null);
    setCategory(null);
    setCautions(null);
    const r = await postJson<AnalyzeResponse>("/api/analyze", { text });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setAnalysis(r.data);
    if (r.data.category && r.data.cautions) {
      setCategory(r.data.category);
      setCautions(r.data.cautions);
      if (r.data.tableCheckedAt) setCheckedAt(r.data.tableCheckedAt);
    }
  }

  async function pick(c: NamedCategory) {
    if (!analysis) return;
    setBusy(true);
    setError(null);
    const r = await postJson<CautionsResponse>("/api/cautions", { categoryId: c.id, property: analysis.property });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setCategory(r.data.category);
    setCautions(r.data.cautions);
    if (r.data.tableCheckedAt) setCheckedAt(r.data.tableCheckedAt);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5">
        <Disclaimer checkedAt={checkedAt} />
        <PasteBox value={text} onChange={setText} onSubmit={analyze} busy={busy} />
        {error && (
          <p role="alert" className="rounded-xl border border-error-text bg-error-bg px-4 py-3 text-error-text">
            {error}
          </p>
        )}
        {analysis && (
          <PropertyTable
            property={analysis.property}
            category={category}
            masked={analysis.masked}
            aiFallback={analysis.aiFallback}
          />
        )}
        {analysis && analysis.candidates && (
          <CategoryPicker
            candidates={analysis.candidates}
            aiFallback={analysis.aiFallback}
            busy={busy}
            selectedId={category ? category.id : null}
            onPick={pick}
          />
        )}
        {category && cautions && (
          <>
            <CautionList cautions={cautions} />
            <FieldChecklist cautions={cautions} />
            <ResultActions category={category} cautions={cautions} checkedAt={checkedAt} onReset={reset} />
          </>
        )}
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted">입력한 글과 결과는 저장되지 않아요.</footer>
    </>
  );
}
