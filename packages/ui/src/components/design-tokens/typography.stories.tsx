import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design Tokens/Typography",
	parameters: {
		docs: {
			description: {
				component:
					"suzumina.clickのタイポグラフィシステム - M PLUS Rounded 1cフォントとアクセシブルなテキストスタイル",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

// タイポグラフィスケールの定義
const typographyScale = [
	{
		name: "Display Large",
		className: "text-4xl font-bold",
		size: "36px",
		lineHeight: "44px",
		fontWeight: "700",
		usage: "ページの主要タイトル、ランディングページヘッダー",
		example: "suzumina.click",
	},
	{
		name: "Display Medium",
		className: "text-3xl font-bold",
		size: "30px",
		lineHeight: "36px",
		fontWeight: "700",
		usage: "セクションの大見出し",
		example: "音声ボタン一覧",
	},
	{
		name: "Display Small",
		className: "text-2xl font-bold",
		size: "24px",
		lineHeight: "32px",
		fontWeight: "700",
		usage: "カードタイトル、サブセクション見出し",
		example: "Color Groups",
	},
	{
		name: "Heading Large",
		className: "text-xl font-semibold",
		size: "20px",
		lineHeight: "28px",
		fontWeight: "600",
		usage: "コンポーネントタイトル、記事見出し",
		example: "Background Colors",
	},
	{
		name: "Heading Medium",
		className: "text-lg font-semibold",
		size: "18px",
		lineHeight: "28px",
		fontWeight: "600",
		usage: "リスト項目見出し、フォームラベル",
		example: "Primary Action",
	},
	{
		name: "Heading Small",
		className: "text-base font-medium",
		size: "16px",
		lineHeight: "24px",
		fontWeight: "500",
		usage: "カード内タイトル、ボタンテキスト",
		example: "音声ボタンを作成",
	},
	{
		name: "Body Large",
		className: "text-base",
		size: "16px",
		lineHeight: "24px",
		fontWeight: "400",
		usage: "標準的な本文テキスト、フォーム入力",
		example: "涼花みなせテーマの桜色パレット - プロジェクト全体で使用される統一カラーシステム",
	},
	{
		name: "Body Medium",
		className: "text-sm",
		size: "14px",
		lineHeight: "20px",
		fontWeight: "400",
		usage: "説明文、キャプション、補助テキスト",
		example: "検索条件を変更するか、新しい音声ボタンを作成してみましょう",
	},
	{
		name: "Body Small",
		className: "text-xs",
		size: "12px",
		lineHeight: "16px",
		fontWeight: "400",
		usage: "ラベル、バッジ、タイムスタンプ",
		example: "2024年12月25日",
	},
];

// フォントウェイトの定義
const fontWeights = [
	{
		name: "Regular",
		className: "font-normal",
		weight: "400",
		usage: "標準的な本文テキスト",
		example: "標準的な読みやすさを重視したテキスト",
	},
	{
		name: "Medium",
		className: "font-medium",
		weight: "500",
		usage: "強調したいテキスト、ラベル",
		example: "重要度の高い情報やUI要素",
	},
	{
		name: "Semibold",
		className: "font-semibold",
		weight: "600",
		usage: "見出し、ナビゲーション",
		example: "セクション見出しやメニュー項目",
	},
	{
		name: "Bold",
		className: "font-bold",
		weight: "700",
		usage: "重要な見出し、CTA",
		example: "ページタイトルや行動喚起テキスト",
	},
];

// TypesetStyleコンポーネント
const TypesetStyle = ({
	name,
	className,
	size,
	lineHeight,
	fontWeight,
	usage,
	example,
}: {
	name: string;
	className: string;
	size: string;
	lineHeight: string;
	fontWeight: string;
	usage: string;
	example: string;
}) => (
	<div className="border border-gray-200 rounded-lg p-6 mb-4">
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* サンプルテキスト */}
			<div>
				<div className={className} style={{ fontFamily: "M PLUS Rounded 1c, sans-serif" }}>
					{example}
				</div>
				<div className="mt-3 text-sm text-gray-600">
					<strong>用途:</strong> {usage}
				</div>
			</div>

			{/* 仕様情報 */}
			<div className="space-y-2 text-sm">
				<div>
					<span className="font-medium text-gray-900">Style:</span> {name}
				</div>
				<div>
					<span className="font-medium text-gray-900">Class:</span>{" "}
					<code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{className}</code>
				</div>
				<div>
					<span className="font-medium text-gray-900">Size:</span> {size}
				</div>
				<div>
					<span className="font-medium text-gray-900">Line Height:</span> {lineHeight}
				</div>
				<div>
					<span className="font-medium text-gray-900">Font Weight:</span> {fontWeight}
				</div>
			</div>
		</div>
	</div>
);

// フォントウェイトコンポーネント
const FontWeightDemo = ({
	name,
	className,
	weight,
	usage,
	example,
}: {
	name: string;
	className: string;
	weight: string;
	usage: string;
	example: string;
}) => (
	<div className="border border-gray-200 rounded-lg p-4">
		<div
			className={`text-lg ${className} mb-2`}
			style={{ fontFamily: "M PLUS Rounded 1c, sans-serif" }}
		>
			{example}
		</div>
		<div className="space-y-1 text-sm text-gray-600">
			<div>
				<span className="font-medium">Weight:</span> {name} ({weight})
			</div>
			<div>
				<span className="font-medium">Class:</span>{" "}
				<code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-xs">{className}</code>
			</div>
			<div>
				<span className="font-medium">用途:</span> {usage}
			</div>
		</div>
	</div>
);

export const TypographyScale: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Typography Scale</h1>
				<p className="text-gray-600">M PLUS Rounded 1cフォントを使用したタイポグラフィスケール</p>
			</div>

			<div className="space-y-6">
				{typographyScale.map((style) => (
					<TypesetStyle key={style.name} {...style} />
				))}
			</div>

			<div className="mt-12 p-6 bg-gray-50 rounded-lg">
				<h2 className="text-lg font-semibold mb-4">アクセシビリティ配慮</h2>
				<ul className="space-y-2 text-sm text-gray-700">
					<li>
						• <strong>行間:</strong> WCAG 2.1 AA準拠（1.5以上）
					</li>
					<li>
						• <strong>フォントサイズ:</strong> 最小12px、推奨16px以上
					</li>
					<li>
						• <strong>コントラスト:</strong> 背景との十分なコントラスト比
					</li>
					<li>
						• <strong>レスポンシブ:</strong> iOS zoomを防ぐ16px設定
					</li>
				</ul>
			</div>
		</div>
	),
};

export const FontWeights: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Font Weights</h1>
				<p className="text-gray-600">M PLUS Rounded 1cで利用可能なフォントウェイト</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{fontWeights.map((weight) => (
					<FontWeightDemo key={weight.name} {...weight} />
				))}
			</div>

			<div className="mt-8 p-6 bg-blue-50 rounded-lg">
				<h3 className="text-lg font-semibold mb-3">使用ガイドライン</h3>
				<div className="space-y-3 text-sm">
					<div>
						<strong>Regular (400):</strong> 本文テキスト、段落、説明文
					</div>
					<div>
						<strong>Medium (500):</strong> ラベル、強調テキスト、重要な情報
					</div>
					<div>
						<strong>Semibold (600):</strong> セクション見出し、ナビゲーション
					</div>
					<div>
						<strong>Bold (700):</strong> ページタイトル、重要な見出し
					</div>
				</div>
			</div>
		</div>
	),
};

export const TypographyExamples: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Typography in Use</h1>
				<p className="text-gray-600">実際のUIコンポーネントでのタイポグラフィ使用例</p>
			</div>

			<div className="space-y-8">
				{/* ヘッダー例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Page Header</h3>
					<div className="space-y-2">
						<h1 className="text-4xl font-bold text-foreground">音声ボタン一覧</h1>
						<p className="text-base text-muted-foreground">
							涼花みなせの音声ボタンを検索・再生できます
						</p>
						<div className="text-sm text-muted-foreground">全 42 件のボタン</div>
					</div>
				</div>

				{/* カード例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Card Content</h3>
					<div className="border border-gray-100 rounded-lg p-4 max-w-sm">
						<h4 className="text-base font-medium text-foreground mb-2">おはよう！</h4>
						<p className="text-sm text-muted-foreground mb-3">朝の挨拶ボイス - 元気いっぱい</p>
						<div className="flex justify-between items-center text-xs text-muted-foreground">
							<span>カテゴリ: 挨拶</span>
							<span>2024/12/25</span>
						</div>
					</div>
				</div>

				{/* フォーム例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Form Elements</h3>
					<div className="space-y-4 max-w-md">
						<div>
							<label
								htmlFor="title-input"
								className="text-sm font-medium text-foreground block mb-1"
							>
								タイトル
							</label>
							<input
								id="title-input"
								type="text"
								placeholder="音声ボタンのタイトルを入力"
								className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
								style={{ fontSize: "16px" }} // iOS zoom防止
							/>
							<p className="text-xs text-muted-foreground mt-1">
								わかりやすいタイトルを入力してください
							</p>
						</div>
						<button
							type="button"
							className="px-4 py-2 bg-suzuka-500 text-white text-base font-medium rounded-md hover:bg-suzuka-600"
						>
							保存
						</button>
					</div>
				</div>

				{/* ナビゲーション例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Navigation</h3>
					<nav className="flex space-x-6">
						<a href="#" className="text-base font-medium text-foreground hover:text-suzuka-600">
							ホーム
						</a>
						<a
							href="#"
							className="text-base font-medium text-muted-foreground hover:text-suzuka-600"
						>
							音声ボタン
						</a>
						<a
							href="#"
							className="text-base font-medium text-muted-foreground hover:text-suzuka-600"
						>
							動画一覧
						</a>
						<a
							href="#"
							className="text-base font-medium text-muted-foreground hover:text-suzuka-600"
						>
							作品一覧
						</a>
					</nav>
				</div>
			</div>
		</div>
	),
};

export const AccessibilityTypography: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Accessibility Features</h1>
				<p className="text-gray-600">アクセシビリティを重視したタイポグラフィ設計</p>
			</div>

			<div className="space-y-8">
				{/* コントラスト例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Color Contrast</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-4">
							<h4 className="font-medium">良いコントラスト例 ✅</h4>
							<div className="bg-white p-4 border rounded">
								<p className="text-gray-900 text-base">濃い文字色と白背景 (21:1)</p>
							</div>
							<div className="bg-suzuka-50 p-4 border rounded">
								<p className="text-suzuka-900 text-base">suzuka-900とsuzuka-50 (12.5:1)</p>
							</div>
						</div>
						<div className="space-y-4">
							<h4 className="font-medium">注意が必要な例 ⚠️</h4>
							<div className="bg-gray-100 p-4 border rounded">
								<p className="text-gray-400 text-base">薄い文字色 (コントラスト不足)</p>
							</div>
							<div className="bg-suzuka-200 p-4 border rounded">
								<p className="text-suzuka-400 text-base">近い色同士の組み合わせ</p>
							</div>
						</div>
					</div>
				</div>

				{/* フォントサイズとアクセシビリティ */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Font Size & Accessibility</h3>
					<div className="space-y-4">
						<div className="p-4 bg-green-50 rounded">
							<h4 className="font-medium text-green-800 mb-2">推奨サイズ</h4>
							<p className="text-base text-green-700">本文は16px以上を使用（text-base以上）</p>
							<p className="text-sm text-green-600 mt-1">説明文は14px以上を使用（text-sm以上）</p>
						</div>
						<div className="p-4 bg-yellow-50 rounded">
							<h4 className="font-medium text-yellow-800 mb-2">注意が必要</h4>
							<p className="text-xs text-yellow-700">12px（text-xs）は補助情報のみに使用</p>
						</div>
					</div>
				</div>

				{/* 行間とレスポンシブ */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Line Height & Responsive</h3>
					<div className="space-y-4">
						<div>
							<h4 className="font-medium mb-2">適切な行間 (1.5以上)</h4>
							<p className="text-base leading-6">
								適切な行間を設定することで、文章の読みやすさが大幅に向上します。
								特に長い文章や複数行にわたるテキストでは、行間の設定が重要になります。 WCAG
								2.1では最低1.5の行間を推奨しています。
							</p>
						</div>
						<div>
							<h4 className="font-medium mb-2">モバイル対応</h4>
							<p className="text-base">
								iOS Safariのズーム防止のため、フォーム要素では16px以上を使用
							</p>
							<input
								type="text"
								placeholder="16px設定でズーム防止"
								className="mt-2 px-3 py-2 border rounded text-base w-full max-w-sm"
								style={{ fontSize: "16px" }}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const DarkModeTypography: Story = {
	parameters: {
		backgrounds: { default: "dark" },
	},
	render: () => (
		<div className="dark p-6 bg-gray-900 text-white min-h-screen">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Typography - Dark Mode</h1>
				<p className="text-gray-300">ダークモードでのタイポグラフィ表示</p>
			</div>

			<div className="space-y-8">
				{/* ダークモードでのヘッダー */}
				<div className="border border-gray-700 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4 text-gray-100">Dark Mode Headers</h3>
					<div className="space-y-3">
						<h1 className="text-4xl font-bold text-gray-100">メインタイトル</h1>
						<h2 className="text-2xl font-bold text-gray-200">セクション見出し</h2>
						<h3 className="text-lg font-semibold text-gray-300">サブセクション</h3>
						<p className="text-base text-gray-400">
							ダークモードでは文字色を調整して適切なコントラストを保ちます
						</p>
					</div>
				</div>

				{/* ダークモードでのカード */}
				<div className="border border-gray-700 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4 text-gray-100">Dark Mode Card</h3>
					<div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-sm">
						<h4 className="text-base font-medium text-gray-100 mb-2">音声ボタンタイトル</h4>
						<p className="text-sm text-gray-300 mb-3">ダークモードでも読みやすい説明文</p>
						<div className="flex justify-between items-center text-xs text-gray-400">
							<span>カテゴリ: 挨拶</span>
							<span>2024/12/25</span>
						</div>
					</div>
				</div>

				{/* コントラスト確認 */}
				<div className="border border-gray-700 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4 text-gray-100">Contrast Check</h3>
					<div className="space-y-3">
						<div className="flex items-center space-x-4">
							<span className="text-gray-100 text-base">Gray-100</span>
							<span className="text-gray-200 text-base">Gray-200</span>
							<span className="text-gray-300 text-base">Gray-300</span>
							<span className="text-gray-400 text-base">Gray-400</span>
						</div>
						<p className="text-sm text-gray-400">
							ダークモードでは gray-100 から gray-400 の範囲で適切なコントラストを確保
						</p>
					</div>
				</div>
			</div>
		</div>
	),
};
