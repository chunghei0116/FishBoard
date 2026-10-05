import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FISH LOG · 我的漁獲收藏",
  description: "我的水域，我的漁獲。將每次釣魚回憶，收藏成專屬像素魚類圖鑑。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body className="antialiased">{children}</body>
    </html>
  );
}
