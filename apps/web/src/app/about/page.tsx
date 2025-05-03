import type { Metadata } from "next";
import AboutHero from "./_components/AboutHero";
import AboutProject from "./_components/AboutProject";
import AboutTeam from "./_components/AboutTeam";

// メタデータの設定
export const metadata: Metadata = {
  title: "About | すずみなくりっく！",
  description:
    "すずみなくりっく！プロジェクトについて紹介します。涼花みなせさんの活動を応援する非公式ファンサイトです。",
};

/**
 * Aboutページコンポーネント
 * プロジェクトの概要や目的、チーム情報などを表示します
 */
export default function AboutPage() {
  return (
    <div
      className="container mx-auto px-4 py-8"
      data-testid="about-page-container"
    >
      {/* ヒーローセクション */}
      <AboutHero />

      {/* プロジェクト概要セクション */}
      <AboutProject />

      {/* チーム紹介セクション */}
      <AboutTeam />
    </div>
  );
}
