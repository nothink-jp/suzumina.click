/**
 * トップページや重要なセクションで使用するHeroコンポーネント
 * DaisyUIのheroコンポーネントをベースにしています
 */
export interface HeroProps {
  /** メインタイトル */
  title: string;
  /** サブタイトルや説明文 */
  subtitle?: string;
  /** 追加のコンテンツ（ボタンなど） */
  children?: React.ReactNode;
  /** 背景画像のURL（指定しない場合はデフォルトのスタイルが適用される） */
  backgroundImage?: string;
  /** コンテンツの配置（中央揃えまたは左揃え） */
  alignment?: "center" | "start";
}

export default function Hero({
  title,
  subtitle,
  children,
  backgroundImage,
  alignment = "center",
}: HeroProps) {
  // テキストの配置スタイル
  const textAlignmentClass =
    alignment === "center" ? "text-center" : "text-left";

  // 背景スタイル
  const backgroundStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` }
    : undefined;

  return (
    <div
      className={`hero ${backgroundImage ? "min-h-[400px] bg-cover bg-center" : "bg-base-200"} mb-8 rounded-lg`}
      style={backgroundStyle}
    >
      <div
        className={`hero-overlay ${backgroundImage ? "bg-opacity-60 rounded-lg" : "bg-opacity-0"}`}
      />
      <div className="hero-content text-neutral-content">
        <div className={`max-w-md ${textAlignmentClass}`}>
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          {subtitle && <p className="mb-6 text-lg">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
