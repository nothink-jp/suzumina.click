import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Spacing",
	parameters: {
		docs: {
			description: {
				component: "suzumina.clickのスペーシングシステム - 一貫性のある間隔・余白設計",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

// スペーシングスケールの定義
const spacingScale = [
	{ name: "0", value: "0px", class: "0", usage: "要素を隣接させる、境界線のリセット" },
	{ name: "0.5", value: "2px", class: "0.5", usage: "極小の調整、細かいアイコン間隔" },
	{ name: "1", value: "4px", class: "1", usage: "最小の間隔、要素間の僅かな分離" },
	{ name: "1.5", value: "6px", class: "1.5", usage: "小さなテキスト要素間" },
	{ name: "2", value: "8px", class: "2", usage: "関連要素間の基本間隔" },
	{ name: "2.5", value: "10px", class: "2.5", usage: "小さなボタンの内余白" },
	{ name: "3", value: "12px", class: "3", usage: "標準的なUI要素間隔" },
	{ name: "3.5", value: "14px", class: "3.5", usage: "中程度の要素分離" },
	{ name: "4", value: "16px", class: "4", usage: "標準的なボタン・カード内余白" },
	{ name: "5", value: "20px", class: "5", usage: "セクション内要素間隔" },
	{ name: "6", value: "24px", class: "6", usage: "カード間隔、リスト項目間" },
	{ name: "7", value: "28px", class: "7", usage: "大きなコンポーネント間隔" },
	{ name: "8", value: "32px", class: "8", usage: "セクション間の基本間隔" },
	{ name: "10", value: "40px", class: "10", usage: "大きなセクション分離" },
	{ name: "12", value: "48px", class: "12", usage: "主要セクション間隔" },
	{ name: "16", value: "64px", class: "16", usage: "大きなレイアウト分離" },
	{ name: "20", value: "80px", class: "20", usage: "ページレベルの分離" },
	{ name: "24", value: "96px", class: "24", usage: "大きなページセクション間" },
];

// Paddingの例
const paddingExamples = [
	{ name: "p-2", class: "p-2", value: "8px", usage: "小さなボタン、バッジ" },
	{ name: "p-3", class: "p-3", value: "12px", usage: "標準的なボタン" },
	{ name: "p-4", class: "p-4", value: "16px", usage: "カード内コンテンツ" },
	{ name: "p-6", class: "p-6", value: "24px", usage: "大きなカード、ダイアログ" },
	{ name: "p-8", class: "p-8", value: "32px", usage: "ページコンテナ" },
];

// Marginの例
const marginExamples = [
	{ name: "mb-2", class: "mb-2", value: "8px", usage: "関連テキスト間" },
	{ name: "mb-4", class: "mb-4", value: "16px", usage: "段落間、標準分離" },
	{ name: "mb-6", class: "mb-6", value: "24px", usage: "セクション内要素分離" },
	{ name: "mb-8", class: "mb-8", value: "32px", usage: "セクション間分離" },
	{ name: "mb-12", class: "mb-12", value: "48px", usage: "大きなセクション分離" },
];

// スペーシングデモコンポーネント
const SpacingDemo = ({
	name,
	value,
	className,
	usage,
}: {
	name: string;
	value: string;
	className: string;
	usage: string;
}) => (
	<div className="border border-gray-200 rounded-lg p-4">
		<div className="flex items-center justify-between mb-3">
			<div>
				<div className="font-medium text-sm">{name}</div>
				<div className="text-xs text-gray-600">{value}</div>
			</div>
			<code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{className}</code>
		</div>
		{/* 視覚的表現 */}
		<div className="flex items-center space-x-2 mb-2">
			<div
				className="bg-suzuka-200 border border-suzuka-300"
				style={{ width: value, height: "8px" }}
			/>
			<span className="text-xs text-gray-500">{value}</span>
		</div>
		<div className="text-xs text-gray-600">
			<strong>用途:</strong> {usage}
		</div>
	</div>
);

// Paddingデモ
const PaddingDemo = ({
	name,
	className,
	value,
	usage,
}: {
	name: string;
	className: string;
	value: string;
	usage: string;
}) => (
	<div className="border border-gray-200 rounded-lg p-3">
		<div className="mb-3">
			<div className="font-medium text-sm">{name}</div>
			<code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{className}</code>
		</div>
		<div className="border-2 border-dashed border-suzuka-300 rounded">
			<div className={`${className} bg-suzuka-100 rounded`}>
				<div className="bg-suzuka-500 text-white text-xs text-center py-1 rounded">
					Content ({value})
				</div>
			</div>
		</div>
		<div className="text-xs text-gray-600 mt-2">
			<strong>用途:</strong> {usage}
		</div>
	</div>
);

// Marginデモ
const MarginDemo = ({
	name,
	className,
	value,
	usage,
}: {
	name: string;
	className: string;
	value: string;
	usage: string;
}) => (
	<div className="border border-gray-200 rounded-lg p-3">
		<div className="mb-3">
			<div className="font-medium text-sm">{name}</div>
			<code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{className}</code>
		</div>
		<div className="border-2 border-dashed border-gray-300 rounded p-2">
			<div className="bg-suzuka-200 text-suzuka-800 text-xs text-center py-1 rounded">
				First Element
			</div>
			<div className={`${className} bg-suzuka-500 text-white text-xs text-center py-1 rounded`}>
				Second Element ({value} margin-bottom)
			</div>
			<div className="bg-suzuka-200 text-suzuka-800 text-xs text-center py-1 rounded">
				Third Element
			</div>
		</div>
		<div className="text-xs text-gray-600 mt-2">
			<strong>用途:</strong> {usage}
		</div>
	</div>
);

export const SpacingScale: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Spacing Scale</h1>
				<p className="text-gray-600">Tailwind CSSベースの一貫性のあるスペーシングシステム</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{spacingScale.map((spacing) => (
					<SpacingDemo
						key={spacing.name}
						name={spacing.name}
						value={spacing.value}
						className={spacing.class}
						usage={spacing.usage}
					/>
				))}
			</div>

			<div className="mt-12 p-6 bg-gray-50 rounded-lg">
				<h2 className="text-lg font-semibold mb-4">スペーシングの原則</h2>
				<ul className="space-y-2 text-sm text-gray-700">
					<li>
						• <strong>4pxベース:</strong> 4の倍数で一貫性を保つ
					</li>
					<li>
						• <strong>階層構造:</strong> 関連要素は小さい間隔、独立要素は大きい間隔
					</li>
					<li>
						• <strong>視覚的グループ化:</strong> 同じ間隔で関連性を表現
					</li>
					<li>
						• <strong>レスポンシブ:</strong> 画面サイズに応じて適切に調整
					</li>
				</ul>
			</div>
		</div>
	),
};

export const PaddingExamples: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Padding Examples</h1>
				<p className="text-gray-600">内余白（padding）の使用パターンとガイドライン</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{paddingExamples.map((example) => (
					<PaddingDemo key={example.name} {...example} />
				))}
			</div>

			<div className="mt-12 space-y-8">
				{/* 実際の使用例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Real Usage Examples</h3>
					<div className="space-y-4">
						{/* ボタン例 */}
						<div>
							<h4 className="font-medium mb-2">Buttons</h4>
							<div className="flex space-x-4">
								<button className="px-3 py-2 bg-suzuka-500 text-white rounded text-sm">
									Small (p-2)
								</button>
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded">
									Medium (px-4 py-2)
								</button>
								<button className="px-6 py-3 bg-suzuka-500 text-white rounded text-lg">
									Large (px-6 py-3)
								</button>
							</div>
						</div>

						{/* カード例 */}
						<div>
							<h4 className="font-medium mb-2">Cards</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="border border-gray-200 rounded-lg p-4">
									<h5 className="font-medium mb-2">Standard Card (p-4)</h5>
									<p className="text-sm text-gray-600">16pxの内余白で適度な余裕</p>
								</div>
								<div className="border border-gray-200 rounded-lg p-6">
									<h5 className="font-medium mb-2">Large Card (p-6)</h5>
									<p className="text-sm text-gray-600">24pxの内余白でゆったりした印象</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const MarginExamples: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Margin Examples</h1>
				<p className="text-gray-600">外余白（margin）の使用パターンとレイアウト構成</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{marginExamples.map((example) => (
					<MarginDemo key={example.name} {...example} />
				))}
			</div>

			<div className="mt-12 space-y-8">
				{/* 実際のレイアウト例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Layout Examples</h3>

					{/* 記事レイアウト */}
					<div className="max-w-2xl">
						<h4 className="text-xl font-bold mb-4">記事レイアウト例</h4>
						<p className="mb-4 text-gray-700">
							これは標準的な段落です。段落間にはmb-4（16px）の間隔を使用し、
							読みやすさを確保しています。
						</p>
						<p className="mb-6 text-gray-700">
							この段落の後にはmb-6（24px）の間隔があり、次のセクションとの
							明確な分離を示しています。
						</p>

						<h5 className="text-lg font-semibold mb-3">サブセクション</h5>
						<p className="mb-4 text-gray-700">
							サブセクションの見出しにはmb-3（12px）を使用し、
							コンテンツとの適切な関係性を表現します。
						</p>

						<div className="mt-8 p-4 bg-gray-50 rounded">
							<h6 className="font-medium mb-2">ボックス内コンテンツ</h6>
							<p className="text-sm text-gray-600">
								mt-8（32px）で大きなセクション分離を行い、 視覚的なグループ化を明確にします。
							</p>
						</div>
					</div>
				</div>

				{/* グリッドレイアウト */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Grid Layout with Gap</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-suzuka-100 p-3 rounded text-center text-sm">gap-4 (16px)</div>
						<div className="bg-suzuka-100 p-3 rounded text-center text-sm">Item 2</div>
						<div className="bg-suzuka-100 p-3 rounded text-center text-sm">Item 3</div>
						<div className="bg-suzuka-100 p-3 rounded text-center text-sm">Item 4</div>
					</div>

					<div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-6">
						<div className="bg-suzuka-200 p-4 rounded text-center text-sm">gap-6 (24px)</div>
						<div className="bg-suzuka-200 p-4 rounded text-center text-sm">Item 2</div>
						<div className="bg-suzuka-200 p-4 rounded text-center text-sm">Item 3</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const ResponsiveSpacing: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Responsive Spacing</h1>
				<p className="text-gray-600">画面サイズに応じたレスポンシブなスペーシング</p>
			</div>

			<div className="space-y-8">
				{/* レスポンシブパディング */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Responsive Padding</h3>
					<div className="p-4 md:p-6 lg:p-8 border-2 border-dashed border-suzuka-300 rounded">
						<div className="bg-suzuka-100 p-4 rounded">
							<h4 className="font-medium mb-2">適応的コンテナ</h4>
							<p className="text-sm text-gray-600">
								<code className="bg-white px-1 rounded">p-4 md:p-6 lg:p-8</code>
								<br />• モバイル: 16px
								<br />• タブレット: 24px
								<br />• デスクトップ: 32px
							</p>
						</div>
					</div>
				</div>

				{/* レスポンシブマージン */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Responsive Margins</h3>
					<div className="space-y-4 sm:space-y-6 lg:space-y-8">
						<div className="bg-suzuka-200 p-3 rounded text-center">セクション 1</div>
						<div className="bg-suzuka-300 p-3 rounded text-center">セクション 2</div>
						<div className="bg-suzuka-400 p-3 rounded text-center text-white">セクション 3</div>
					</div>
					<p className="text-sm text-gray-600 mt-4">
						<code className="bg-gray-100 px-1 rounded">space-y-4 sm:space-y-6 lg:space-y-8</code>
						<br />
						画面サイズに応じて要素間隔が変化します
					</p>
				</div>

				{/* ブレークポイント別ガイドライン */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">ブレークポイント別推奨値</h3>
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left py-2 font-medium">画面サイズ</th>
									<th className="text-left py-2 font-medium">コンテナ</th>
									<th className="text-left py-2 font-medium">セクション間</th>
									<th className="text-left py-2 font-medium">要素間</th>
								</tr>
							</thead>
							<tbody className="text-gray-600">
								<tr className="border-b">
									<td className="py-2">Mobile (~640px)</td>
									<td className="py-2">p-4 (16px)</td>
									<td className="py-2">mb-8 (32px)</td>
									<td className="py-2">mb-4 (16px)</td>
								</tr>
								<tr className="border-b">
									<td className="py-2">Tablet (640px~)</td>
									<td className="py-2">p-6 (24px)</td>
									<td className="py-2">mb-12 (48px)</td>
									<td className="py-2">mb-6 (24px)</td>
								</tr>
								<tr>
									<td className="py-2">Desktop (1024px~)</td>
									<td className="py-2">p-8 (32px)</td>
									<td className="py-2">mb-16 (64px)</td>
									<td className="py-2">mb-8 (32px)</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	),
};

export const SpacingBestPractices: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Spacing Best Practices</h1>
				<p className="text-gray-600">効果的なスペーシングのガイドラインとベストプラクティス</p>
			</div>

			<div className="space-y-8">
				{/* Do's and Don'ts */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Good Examples */}
					<div className="border border-green-200 rounded-lg p-6 bg-green-50">
						<h3 className="text-lg font-semibold mb-4 text-green-800">✅ 良い例</h3>
						<div className="space-y-4">
							<div className="bg-white p-4 rounded border">
								<h4 className="font-medium mb-2">見出し</h4>
								<p className="text-sm text-gray-600 mb-4">適切な間隔で読みやすい段落。</p>
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded text-sm">
									アクション
								</button>
							</div>
						</div>
						<ul className="mt-4 text-sm text-green-700 space-y-1">
							<li>• 一貫したスペーシング</li>
							<li>• 明確な視覚的階層</li>
							<li>• 適切な関係性の表現</li>
						</ul>
					</div>

					{/* Bad Examples */}
					<div className="border border-red-200 rounded-lg p-6 bg-red-50">
						<h3 className="text-lg font-semibold mb-4 text-red-800">❌ 悪い例</h3>
						<div className="space-y-1">
							<div className="bg-white p-1 rounded border">
								<h4 className="font-medium mb-0.5">見出し</h4>
								<p className="text-sm text-gray-600 mb-1">間隔が狭すぎて窮屈。</p>
								<button className="px-1 py-0.5 bg-suzuka-500 text-white rounded text-xs">
									アクション
								</button>
							</div>
						</div>
						<ul className="mt-4 text-sm text-red-700 space-y-1">
							<li>• 間隔が不一致</li>
							<li>• 窮屈で読みにくい</li>
							<li>• 要素の関係が不明</li>
						</ul>
					</div>
				</div>

				{/* ガイドライン */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">スペーシングガイドライン</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-3">階層的スペーシング</h4>
							<ul className="space-y-2 text-sm text-gray-600">
								<li>
									• <strong>関連要素:</strong> 小さな間隔（4-8px）
								</li>
								<li>
									• <strong>グループ要素:</strong> 中程度の間隔（12-16px）
								</li>
								<li>
									• <strong>セクション:</strong> 大きな間隔（24-32px）
								</li>
								<li>
									• <strong>ページレベル:</strong> 最大間隔（48px以上）
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-medium mb-3">一貫性の原則</h4>
							<ul className="space-y-2 text-sm text-gray-600">
								<li>
									• <strong>同じ機能:</strong> 同じスペーシング
								</li>
								<li>
									• <strong>4px単位:</strong> システム全体で統一
								</li>
								<li>
									• <strong>レスポンシブ:</strong> 画面サイズに応じて調整
								</li>
								<li>
									• <strong>コンテキスト:</strong> 用途に応じた適切な選択
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* 実際のプロジェクトでの使用例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">プロジェクト内使用例</h3>
					<div className="space-y-6">
						{/* リストページ */}
						<div>
							<h4 className="font-medium mb-3">リストページレイアウト</h4>
							<div className="border border-gray-100 rounded p-4 bg-gray-50">
								<div className="space-y-4">
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium mb-2">検索・フィルターパネル</h5>
										<p className="text-sm text-gray-600">mb-6でコンテンツと分離</p>
									</div>
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium mb-2">リストヘッダー</h5>
										<p className="text-sm text-gray-600">mb-6でリストと分離</p>
									</div>
									<div className="bg-white p-4 rounded border">
										<h5 className="font-medium mb-2">グリッドアイテム</h5>
										<p className="text-sm text-gray-600">gap-6でアイテム間隔</p>
									</div>
								</div>
							</div>
						</div>

						{/* カードコンポーネント */}
						<div>
							<h4 className="font-medium mb-3">カードコンポーネント</h4>
							<div className="border border-gray-100 rounded p-6 bg-white max-w-sm">
								<h5 className="font-medium mb-2">音声ボタンタイトル</h5>
								<p className="text-sm text-gray-600 mb-3">説明文との間隔 mb-2</p>
								<p className="text-sm text-gray-600 mb-4">コンテンツとボタンの間隔 mb-3</p>
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded text-sm">再生</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};
