import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Borders & Shadows",
	parameters: {
		docs: {
			description: {
				component: "suzumina.clickのボーダー・影・角丸システム - 視覚的階層と深度の表現",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

// ボーダー幅の定義
const borderWidths = [
	{ name: "None", class: "border-0", value: "0px", usage: "ボーダーを削除" },
	{ name: "Thin", class: "border", value: "1px", usage: "標準的な境界線" },
	{ name: "Medium", class: "border-2", value: "2px", usage: "強調した境界線" },
	{ name: "Thick", class: "border-4", value: "4px", usage: "非常に強い境界線" },
	{ name: "Extra Thick", class: "border-8", value: "8px", usage: "特別な強調" },
];

// 角丸の定義
const borderRadius = [
	{ name: "None", class: "rounded-none", value: "0px", usage: "角丸なし、シャープな印象" },
	{ name: "Small", class: "rounded-sm", value: "2px", usage: "微細な角丸" },
	{ name: "Default", class: "rounded", value: "4px", usage: "標準的なボタン・カード" },
	{ name: "Medium", class: "rounded-md", value: "6px", usage: "中程度のコンポーネント" },
	{ name: "Large", class: "rounded-lg", value: "8px", usage: "大きなカード・ダイアログ" },
	{ name: "Extra Large", class: "rounded-xl", value: "12px", usage: "特別なコンポーネント" },
	{ name: "2XL", class: "rounded-2xl", value: "16px", usage: "大きなコンテナ" },
	{ name: "3XL", class: "rounded-3xl", value: "24px", usage: "非常に大きな要素" },
	{ name: "Full", class: "rounded-full", value: "50%", usage: "円形、アバター、ピル型ボタン" },
];

// 影の定義
const shadows = [
	{ name: "None", class: "shadow-none", usage: "影なし" },
	{ name: "Small", class: "shadow-sm", usage: "微細な影、カード境界" },
	{ name: "Default", class: "shadow", usage: "標準的なカード影" },
	{ name: "Medium", class: "shadow-md", usage: "浮いた要素" },
	{ name: "Large", class: "shadow-lg", usage: "モーダル、ドロップダウン" },
	{ name: "Extra Large", class: "shadow-xl", usage: "重要なオーバーレイ" },
	{ name: "2XL", class: "shadow-2xl", usage: "最高レベルの階層" },
	{ name: "Inner", class: "shadow-inner", usage: "凹んだ効果" },
];

// ボーダーカラーの定義（suzukaカラー）
const borderColors = [
	{ name: "Gray 200", class: "border-gray-200", color: "#e5e7eb", usage: "標準的な境界線" },
	{ name: "Gray 300", class: "border-gray-300", color: "#d1d5db", usage: "強調した境界線" },
	{
		name: "Suzuka 200",
		class: "border-suzuka-200",
		color: "#ffc2d9",
		usage: "ブランドカラー境界線",
	},
	{ name: "Suzuka 300", class: "border-suzuka-300", color: "#ff9ebf", usage: "アクセント境界線" },
	{ name: "Suzuka 500", class: "border-suzuka-500", color: "#ff4785", usage: "強いブランド強調" },
];

// ボーダーデモコンポーネント
const BorderDemo = ({
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
	<div className="p-4">
		<div
			className={`${className} border-gray-400 w-24 h-16 flex items-center justify-center bg-gray-50`}
		>
			<span className="text-xs text-gray-600">{value}</span>
		</div>
		<div className="mt-2">
			<div className="font-medium text-sm">{name}</div>
			<code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{className}</code>
			<div className="text-xs text-gray-600 mt-1">{usage}</div>
		</div>
	</div>
);

// 角丸デモコンポーネント
const RadiusDemo = ({
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
	<div className="p-4">
		<div
			className={`${className} border-2 border-suzuka-300 bg-suzuka-100 w-24 h-16 flex items-center justify-center`}
		>
			<span className="text-xs text-suzuka-800">{value}</span>
		</div>
		<div className="mt-2">
			<div className="font-medium text-sm">{name}</div>
			<code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{className}</code>
			<div className="text-xs text-gray-600 mt-1">{usage}</div>
		</div>
	</div>
);

// 影デモコンポーネント
const ShadowDemo = ({
	name,
	className,
	usage,
}: {
	name: string;
	className: string;
	usage: string;
}) => (
	<div className="p-6">
		<div
			className={`${className} rounded-lg border border-gray-200 bg-white p-4 w-32 h-20 flex items-center justify-center`}
		>
			<span className="text-sm text-gray-700">{name}</span>
		</div>
		<div className="mt-3">
			<div className="font-medium text-sm">{name}</div>
			<code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{className}</code>
			<div className="text-xs text-gray-600 mt-1">{usage}</div>
		</div>
	</div>
);

// ボーダーカラーデモ
const BorderColorDemo = ({
	name,
	className,
	color,
	usage,
}: {
	name: string;
	className: string;
	color: string;
	usage: string;
}) => (
	<div className="p-4">
		<div
			className={`${className} border-2 rounded-lg w-24 h-16 bg-white flex items-center justify-center`}
		>
			<div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
		</div>
		<div className="mt-2">
			<div className="font-medium text-sm">{name}</div>
			<code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{className}</code>
			<div className="text-xs text-gray-600 mt-1">{usage}</div>
		</div>
	</div>
);

export const BorderWidths: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Border Widths</h1>
				<p className="text-gray-600">境界線の太さとその使用用途</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
				{borderWidths.map((border) => (
					<BorderDemo key={border.name} {...border} />
				))}
			</div>

			<div className="mt-12 p-6 bg-gray-50 rounded-lg">
				<h2 className="text-lg font-semibold mb-4">ボーダー使用ガイドライン</h2>
				<ul className="space-y-2 text-sm text-gray-700">
					<li>
						• <strong>border (1px):</strong> 最も一般的、カード・フォーム要素
					</li>
					<li>
						• <strong>border-2 (2px):</strong> 強調したい境界線、アクティブ状態
					</li>
					<li>
						• <strong>border-4以上:</strong> 特別な強調、装飾的な要素
					</li>
					<li>
						• <strong>border-0:</strong> 境界線を削除、ミニマルデザイン
					</li>
				</ul>
			</div>
		</div>
	),
};

export const BorderRadius: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Border Radius</h1>
				<p className="text-gray-600">角丸の種類とUI要素への適用</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{borderRadius.map((radius) => (
					<RadiusDemo key={radius.name} {...radius} />
				))}
			</div>

			<div className="mt-12 space-y-8">
				{/* 実際の使用例 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Real Usage Examples</h3>
					<div className="space-y-6">
						{/* ボタン例 */}
						<div>
							<h4 className="font-medium mb-3">Buttons</h4>
							<div className="flex flex-wrap gap-4">
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded text-sm">
									Standard (rounded)
								</button>
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded-md text-sm">
									Medium (rounded-md)
								</button>
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded-lg text-sm">
									Large (rounded-lg)
								</button>
								<button className="px-4 py-2 bg-suzuka-500 text-white rounded-full text-sm">
									Pill (rounded-full)
								</button>
							</div>
						</div>

						{/* カード例 */}
						<div>
							<h4 className="font-medium mb-3">Cards</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="border border-gray-200 rounded-lg p-4 bg-white">
									<h5 className="font-medium mb-2">Standard Card</h5>
									<p className="text-sm text-gray-600">rounded-lg (8px)</p>
								</div>
								<div className="border border-gray-200 rounded-xl p-4 bg-white">
									<h5 className="font-medium mb-2">Large Card</h5>
									<p className="text-sm text-gray-600">rounded-xl (12px)</p>
								</div>
								<div className="border border-gray-200 rounded-2xl p-4 bg-white">
									<h5 className="font-medium mb-2">Extra Large</h5>
									<p className="text-sm text-gray-600">rounded-2xl (16px)</p>
								</div>
							</div>
						</div>

						{/* アバター・バッジ例 */}
						<div>
							<h4 className="font-medium mb-3">Avatars & Badges</h4>
							<div className="flex items-center space-x-4">
								<div className="w-10 h-10 bg-suzuka-300 rounded-full flex items-center justify-center text-white text-sm font-medium">
									A
								</div>
								<div className="w-12 h-12 bg-suzuka-400 rounded-full flex items-center justify-center text-white font-medium">
									B
								</div>
								<span className="px-2 py-1 bg-suzuka-100 text-suzuka-800 rounded-full text-xs">
									Badge
								</span>
								<span className="px-3 py-1 bg-suzuka-500 text-white rounded-full text-sm">Tag</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const Shadows: Story = {
	render: () => (
		<div className="p-6 bg-gray-100 min-h-screen">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Shadows</h1>
				<p className="text-gray-600">影による視覚的階層と深度の表現</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
				{shadows.map((shadow) => (
					<ShadowDemo key={shadow.name} {...shadow} />
				))}
			</div>

			<div className="mt-12 space-y-8">
				{/* 階層例 */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Shadow Hierarchy</h3>
					<div className="space-y-6">
						<div className="relative">
							<div className="shadow-sm border border-gray-200 rounded-lg p-4 bg-white">
								<h4 className="font-medium mb-2">Level 1 - Cards (shadow-sm)</h4>
								<p className="text-sm text-gray-600">基本的なカード要素</p>
							</div>
						</div>
						<div className="relative">
							<div className="shadow-md border border-gray-200 rounded-lg p-4 bg-white">
								<h4 className="font-medium mb-2">Level 2 - Hover State (shadow-md)</h4>
								<p className="text-sm text-gray-600">ホバー時の浮上効果</p>
							</div>
						</div>
						<div className="relative">
							<div className="shadow-lg border border-gray-200 rounded-lg p-4 bg-white">
								<h4 className="font-medium mb-2">Level 3 - Dropdowns (shadow-lg)</h4>
								<p className="text-sm text-gray-600">ドロップダウンメニュー</p>
							</div>
						</div>
						<div className="relative">
							<div className="shadow-2xl border border-gray-200 rounded-lg p-4 bg-white">
								<h4 className="font-medium mb-2">Level 4 - Modals (shadow-2xl)</h4>
								<p className="text-sm text-gray-600">モーダルダイアログ</p>
							</div>
						</div>
					</div>
				</div>

				{/* インタラクティブ例 */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Interactive Shadows</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-3">Hover Effects</h4>
							<div className="space-y-4">
								<div className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 rounded-lg p-4 bg-white cursor-pointer">
									<p className="text-sm">Hover for shadow increase</p>
								</div>
								<div className="shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200 rounded-lg p-4 bg-white cursor-pointer">
									<p className="text-sm">Card with hover effect</p>
								</div>
							</div>
						</div>
						<div>
							<h4 className="font-medium mb-3">Button States</h4>
							<div className="space-y-4">
								<button className="w-full px-4 py-2 bg-suzuka-500 text-white rounded-lg shadow hover:shadow-md active:shadow-sm transition-shadow">
									Interactive Button
								</button>
								<button className="w-full px-4 py-2 bg-white text-suzuka-600 border border-suzuka-300 rounded-lg shadow-sm hover:shadow active:shadow-inner transition-shadow">
									Outlined Button
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const BorderColors: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Border Colors</h1>
				<p className="text-gray-600">ブランドカラーとニュートラルカラーの境界線</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
				{borderColors.map((color) => (
					<BorderColorDemo key={color.name} {...color} />
				))}
			</div>

			<div className="mt-12 space-y-8">
				{/* 使用パターン */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">Border Color Patterns</h3>
					<div className="space-y-6">
						{/* フォーム例 */}
						<div>
							<h4 className="font-medium mb-3">Form Elements</h4>
							<div className="space-y-3 max-w-sm">
								<input
									type="text"
									placeholder="Default border"
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-suzuka-500 focus:outline-none"
								/>
								<input
									type="text"
									placeholder="Error state"
									className="w-full px-3 py-2 border border-red-300 rounded-md focus:border-red-500 focus:outline-none"
								/>
								<input
									type="text"
									placeholder="Success state"
									className="w-full px-3 py-2 border border-green-300 rounded-md focus:border-green-500 focus:outline-none"
								/>
							</div>
						</div>

						{/* カード例 */}
						<div>
							<h4 className="font-medium mb-3">Card Variations</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="border border-gray-200 rounded-lg p-4 bg-white">
									<h5 className="font-medium mb-2">Default Card</h5>
									<p className="text-sm text-gray-600">border-gray-200</p>
								</div>
								<div className="border border-suzuka-200 rounded-lg p-4 bg-suzuka-50">
									<h5 className="font-medium mb-2">Brand Card</h5>
									<p className="text-sm text-suzuka-700">border-suzuka-200</p>
								</div>
								<div className="border-2 border-suzuka-500 rounded-lg p-4 bg-white">
									<h5 className="font-medium mb-2">Highlighted</h5>
									<p className="text-sm text-suzuka-600">border-suzuka-500</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ステート表現 */}
				<div className="border border-gray-200 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-4">State Representation</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h4 className="font-medium mb-3">Interactive States</h4>
							<div className="space-y-3">
								<div className="border border-gray-200 hover:border-gray-300 rounded-lg p-3 cursor-pointer transition-colors bg-white">
									<p className="text-sm">Default → Hover</p>
								</div>
								<div className="border border-suzuka-200 hover:border-suzuka-300 rounded-lg p-3 cursor-pointer transition-colors bg-suzuka-50">
									<p className="text-sm text-suzuka-700">Brand → Hover</p>
								</div>
								<div className="border-2 border-suzuka-500 rounded-lg p-3 bg-white">
									<p className="text-sm text-suzuka-600">Active/Selected</p>
								</div>
							</div>
						</div>
						<div>
							<h4 className="font-medium mb-3">Feedback States</h4>
							<div className="space-y-3">
								<div className="border border-green-300 rounded-lg p-3 bg-green-50">
									<p className="text-sm text-green-700">✓ Success State</p>
								</div>
								<div className="border border-yellow-300 rounded-lg p-3 bg-yellow-50">
									<p className="text-sm text-yellow-700">⚠ Warning State</p>
								</div>
								<div className="border border-red-300 rounded-lg p-3 bg-red-50">
									<p className="text-sm text-red-700">✗ Error State</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const CombinedExamples: Story = {
	render: () => (
		<div className="p-6 bg-gray-50 min-h-screen">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Combined Examples</h1>
				<p className="text-gray-600">ボーダー・角丸・影を組み合わせた実際のUI例</p>
			</div>

			<div className="space-y-12">
				{/* カードコンポーネント */}
				<div>
					<h3 className="text-lg font-semibold mb-6">Card Components</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* シンプルカード */}
						<div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
							<h4 className="font-medium mb-2">Simple Card</h4>
							<p className="text-sm text-gray-600 mb-4">border + rounded-lg + shadow-sm</p>
							<button className="px-4 py-2 bg-suzuka-500 text-white rounded text-sm">Action</button>
						</div>

						{/* 強調カード */}
						<div className="border-2 border-suzuka-200 rounded-lg p-6 bg-suzuka-50 shadow-md">
							<h4 className="font-medium mb-2">Highlighted Card</h4>
							<p className="text-sm text-suzuka-700 mb-4">border-suzuka + rounded-lg + shadow-md</p>
							<button className="px-4 py-2 bg-suzuka-500 text-white rounded text-sm">Action</button>
						</div>

						{/* プレミアムカード */}
						<div className="border border-suzuka-300 rounded-xl p-6 bg-white shadow-lg">
							<h4 className="font-medium mb-2">Premium Card</h4>
							<p className="text-sm text-gray-600 mb-4">border-suzuka + rounded-xl + shadow-lg</p>
							<button className="px-4 py-2 bg-suzuka-500 text-white rounded-md text-sm">
								Action
							</button>
						</div>
					</div>
				</div>

				{/* ボタンバリエーション */}
				<div>
					<h3 className="text-lg font-semibold mb-6">Button Variations</h3>
					<div className="flex flex-wrap gap-4">
						<button className="px-4 py-2 bg-suzuka-500 text-white rounded shadow-sm hover:shadow-md transition-shadow">
							Primary Button
						</button>
						<button className="px-4 py-2 border border-suzuka-500 text-suzuka-600 bg-white rounded shadow-sm hover:shadow-md transition-shadow">
							Secondary Button
						</button>
						<button className="px-6 py-3 bg-suzuka-500 text-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
							Large Button
						</button>
						<button className="px-4 py-2 bg-suzuka-500 text-white rounded-full shadow-sm hover:shadow-md transition-shadow">
							Pill Button
						</button>
					</div>
				</div>

				{/* フォーム要素 */}
				<div>
					<h3 className="text-lg font-semibold mb-6">Form Elements</h3>
					<div className="max-w-md space-y-4">
						<div>
							<label className="block text-sm font-medium mb-1">Input Field</label>
							<input
								type="text"
								placeholder="Enter text..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-suzuka-500 focus:ring-1 focus:ring-suzuka-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Textarea</label>
							<textarea
								placeholder="Enter message..."
								rows={3}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-suzuka-500 focus:ring-1 focus:ring-suzuka-500 focus:outline-none resize-none"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Select</label>
							<select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-suzuka-500 focus:ring-1 focus:ring-suzuka-500 focus:outline-none">
								<option>Choose option...</option>
								<option>Option 1</option>
								<option>Option 2</option>
							</select>
						</div>
					</div>
				</div>

				{/* アラート・ノーティフィケーション */}
				<div>
					<h3 className="text-lg font-semibold mb-6">Alerts & Notifications</h3>
					<div className="space-y-4 max-w-lg">
						<div className="border border-green-300 rounded-lg p-4 bg-green-50 shadow-sm">
							<div className="flex items-start">
								<div className="text-green-600 mr-2">✓</div>
								<div>
									<h4 className="font-medium text-green-800">Success</h4>
									<p className="text-sm text-green-700">Your action was completed successfully.</p>
								</div>
							</div>
						</div>
						<div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50 shadow-sm">
							<div className="flex items-start">
								<div className="text-yellow-600 mr-2">⚠</div>
								<div>
									<h4 className="font-medium text-yellow-800">Warning</h4>
									<p className="text-sm text-yellow-700">Please check the information carefully.</p>
								</div>
							</div>
						</div>
						<div className="border border-red-300 rounded-lg p-4 bg-red-50 shadow-sm">
							<div className="flex items-start">
								<div className="text-red-600 mr-2">✗</div>
								<div>
									<h4 className="font-medium text-red-800">Error</h4>
									<p className="text-sm text-red-700">Something went wrong. Please try again.</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* モーダル例 */}
				<div>
					<h3 className="text-lg font-semibold mb-6">Modal Dialog</h3>
					<div className="relative max-w-md mx-auto">
						<div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-2xl">
							<h4 className="text-lg font-semibold mb-4">Confirm Action</h4>
							<p className="text-gray-600 mb-6">
								Are you sure you want to delete this item? This action cannot be undone.
							</p>
							<div className="flex space-x-3">
								<button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
									Cancel
								</button>
								<button className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
									Delete
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};
