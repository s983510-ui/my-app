import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 한글 글꼴 (DESIGN §3.4). 한글 글자는 화면에 필요한 부분만 나눠서 불러와요.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: "variable",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "온비드 물건 주의사항 도우미",
  description: "온비드 물건 정보를 붙여넣으면, 입찰 전에 꼭 확인할 점과 참고 절차·근거를 정리해 드려요. 참고용 안내이며 법률 자문이 아닙니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
