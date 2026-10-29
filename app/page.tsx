// 화면 1장 (DESIGN §3). 표 마지막 확인일은 서버에서 계산해서 넘겨줘요.
import AuctionHelper from "@/components/auction-helper.tsx";
import { tableCheckedAt } from "@/lib/cautions.ts";

export default function Home() {
  return <AuctionHelper initialCheckedAt={tableCheckedAt()} />;
}
