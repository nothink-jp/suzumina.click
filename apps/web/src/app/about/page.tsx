import Hero from "@/components/ui/Hero";

/**
 * Aboutページ
 * サイトについての情報を表示するページ
 */
export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <Hero
        title="すずみなくりっく！"
        subtitle="ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。"
        alignment="center"
      />

      {/* コンテンツセクション */}
      <div className="mt-12 prose max-w-none">
        <p>
          このサイトはファンによる非公式コンテンツです。Lorem ipsum dolor sit
          amet, consectetur adipiscing elit.
        </p>
      </div>
    </main>
  );
}
