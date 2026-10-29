// B. 늘 보이는 안내 (DESIGN §3.1) — 참고용·법률 자문 아님, 표 마지막 확인일 (PRD must 2 규칙 6)
export default function Disclaimer({ checkedAt }: { checkedAt: string | null }) {
  return (
    <section className="rounded-xl border border-notice-text bg-notice-bg px-4 py-3 text-sm leading-6 text-notice-text" aria-label="안내">
      <p className="font-semibold">⚠ 참고용 안내이며 법률 자문이 아닙니다.</p>
      <p>최종 확인은 공고문과 관할 기관에서 해 주세요.</p>
      <p>주의사항 표 마지막 확인일: {checkedAt ?? "검토 중 (아직 공개된 항목이 없어요)"}</p>
    </section>
  );
}
