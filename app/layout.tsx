import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

const origin = process.env.APP_URL || "https://hisgreatlovechurch-meals.web.app";
const description = "그 사랑교회 식사 신청. 함께 갈 사람과 먹고 싶은 메뉴를 골라 주세요.";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "그 사랑교회 Meals",
  description,
  robots: { index: false, follow: false },
  openGraph: { title: "그 사랑교회 Meals", description, siteName: "그 사랑교회 Meals", locale: "ko_KR", type: "website" },
  twitter: { card: "summary_large_image", title: "그 사랑교회 Meals", description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
