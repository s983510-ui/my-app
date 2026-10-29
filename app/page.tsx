// 화면 1장 (DESIGN §3). 표 마지막 확인일은 서버에서 계산해서 넘겨줘요.
import AuctionHelper from "@/components/auction-helper.tsx";
import { tableCheckedAt } from "@/lib/cautions.ts";

export default function Home() {
  // Vercel이 배포할 때 넣어 주는 커밋 번호예요. 내 PC에서는 없어서 "내 PC"로 보여줘요.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return <AuctionHelper initialCheckedAt={tableCheckedAt()} version={sha ? sha.slice(0, 7) : "내 PC"} />;
}
