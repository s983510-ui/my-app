"use client";
// C. 붙여넣기 (DESIGN §3.1) — 개인정보 안내, 글자 수, 분석하기 (PRD 7번, must 1 규칙 4)
import { TEXT_MAX, TEXT_MIN } from "@/lib/limits-shared.ts";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
};

export default function PasteBox({ value, onChange, onSubmit, busy }: Props) {
  const length = value.length;
  const canSubmit = !busy && value.trim().length >= TEXT_MIN && length <= TEXT_MAX;
  return (
    <section className="no-print rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold text-navy">① 온비드 물건 정보를 붙여넣어 주세요</h2>
      <p className="mt-2 rounded-lg bg-card px-3 py-2 text-sm leading-6 text-muted">
        ℹ 개인정보(이름·연락처 등)는 지우고 붙여넣어 주세요. 입력한 글은 분석을 위해 외부 AI(OpenAI)로 보내져요.
      </p>
      <label htmlFor="paste" className="sr-only">
        온비드 물건 정보
      </label>
      <textarea
        id="paste"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        maxLength={TEXT_MAX}
        placeholder="온비드 물건 상세 화면의 내용을 복사해서 여기에 붙여넣어 주세요."
        className="mt-3 w-full rounded-lg border border-line bg-white p-3 text-base leading-7 outline-none focus:border-blue"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`text-sm ${length > TEXT_MAX ? "text-error-text" : "text-muted"}`}>
          {length.toLocaleString("ko-KR")} / {TEXT_MAX.toLocaleString("ko-KR")}자
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-blue px-5 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
        >
          {busy ? "분석하는 중… (최대 10초)" : "분석하기"}
        </button>
      </div>
      {length >= TEXT_MAX && (
        <p className="mt-1 text-sm text-error-text">
          {TEXT_MAX.toLocaleString("ko-KR")}자까지만 들어가요. 넘는 부분은 잘렸을 수 있으니 필요한 부분만 붙여넣어 주세요.
        </p>
      )}
      {value.trim().length > 0 && value.trim().length < TEXT_MIN && (
        <p className="mt-1 text-sm text-muted">{TEXT_MIN}자 이상 붙여넣으면 분석할 수 있어요.</p>
      )}
    </section>
  );
}
