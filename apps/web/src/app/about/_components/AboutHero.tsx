/**
 * Aboutページのヒーローセクションを表示するコンポーネント
 * サイトの主要な紹介とビジュアルを提供します
 */
export default function AboutHero() {
  return (
    <div className="hero bg-base-200 rounded-box mb-12">
      <div className="hero-content flex-col lg:flex-row-reverse py-12">
        <div className="w-full max-w-sm lg:max-w-md">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl">
            {/* プレースホルダー画像 - 実際の画像に置き換えることができます */}
            <div className="bg-primary-content w-full h-full flex items-center justify-center">
              <span className="text-lg text-primary">イメージ</span>
            </div>
          </div>
        </div>
        <div className="lg:pr-8">
          <h1 className="text-5xl font-bold mb-6">
            すずみなくりっく！について
          </h1>
          <p className="text-xl mb-4">
            「すずみなくりっく！」は涼花みなせさんの活動を応援する非公式ファンサイトです。
          </p>
          <p className="mb-6">
            ファンによって運営されるこのサイトでは、涼花みなせさんの活動情報を集約し、
            ファンコミュニティの交流の場を提供することを目指しています。
            最新の情報や過去のアーカイブなど、様々なコンテンツを通して応援の輪を広げていきたいと考えています。
          </p>
          <a href="#about-project" className="btn btn-primary">
            もっと詳しく
          </a>
        </div>
      </div>
    </div>
  );
}
