import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Color Palette",
	parameters: {
		docs: {
			description: {
				component: "涼花みなせテーマのカラーパレット - suzuka colors",
			},
		},
	},
};

export default meta;
type Story = StoryObj;

// カラーパレットの定義
const suzukaColors = {
	"suzuka-50": "#fff5fa",
	"suzuka-100": "#ffe0ed",
	"suzuka-200": "#ffc2d9",
	"suzuka-300": "#ff9ebf",
	"suzuka-400": "#ff6b9d",
	"suzuka-500": "#ff4785",
	"suzuka-600": "#e0266e",
	"suzuka-700": "#b81d5b",
	"suzuka-800": "#8f1447",
	"suzuka-900": "#660d33",
	"suzuka-950": "#3d0820",
};

// サブカラーパレット（涼花みなせ様のオレンジ系）
const minaseColors = {
	"minase-50": "#fff8f3",
	"minase-100": "#ffedd5",
	"minase-200": "#fed7aa",
	"minase-300": "#fdba74",
	"minase-400": "#fb923c",
	"minase-500": "#ff7e2d", // ホームページのメインオレンジ
	"minase-600": "#ea5a0b",
	"minase-700": "#c2410c",
	"minase-800": "#9a3412",
	"minase-900": "#7c2d12",
	"minase-950": "#431407",
};

const suzukaColorDetails = [
	{ name: "suzuka-50", description: "最も薄い桜色", hex: "#fff5fa" },
	{ name: "suzuka-100", description: "薄い桜色", hex: "#ffe0ed" },
	{ name: "suzuka-200", description: "淡い桜色", hex: "#ffc2d9" },
	{ name: "suzuka-300", description: "桜色", hex: "#ff9ebf" },
	{ name: "suzuka-400", description: "濃い桜色", hex: "#ff6b9d" },
	{ name: "suzuka-500", description: "基準の桜色", hex: "#ff4785" },
	{ name: "suzuka-600", description: "濃い目の桜色", hex: "#e0266e" },
	{ name: "suzuka-700", description: "より濃い桜色", hex: "#b81d5b" },
	{ name: "suzuka-800", description: "かなり濃い桜色", hex: "#8f1447" },
	{ name: "suzuka-900", description: "最も濃い桜色", hex: "#660d33" },
	{ name: "suzuka-950", description: "ほぼ黒に近い桜色", hex: "#3d0820" },
];

// サブカラーパレット詳細（涼花みなせ様のオレンジ系）
const minaseColorDetails = [
	{ name: "minase-50", description: "最も薄いウォーム色", hex: "#fff8f3" },
	{ name: "minase-100", description: "薄いクリーム色", hex: "#ffedd5" },
	{ name: "minase-200", description: "淡いピーチ色", hex: "#fed7aa" },
	{ name: "minase-300", description: "ソフトオレンジ", hex: "#fdba74" },
	{ name: "minase-400", description: "ライトオレンジ", hex: "#fb923c" },
	{ name: "minase-500", description: "メインオレンジ", hex: "#ff7e2d" },
	{ name: "minase-600", description: "濃いオレンジ", hex: "#ea5a0b" },
	{ name: "minase-700", description: "ディープオレンジ", hex: "#c2410c" },
	{ name: "minase-800", description: "ダークオレンジ", hex: "#9a3412" },
	{ name: "minase-900", description: "最も濃いオレンジ", hex: "#7c2d12" },
	{ name: "minase-950", description: "ブラウンオレンジ", hex: "#431407" },
];

const ColorSwatch = ({
	name,
	description,
	hex,
}: {
	name: string;
	description: string;
	hex: string;
}) => (
	<div className="flex flex-col items-center">
		<div
			className={`w-20 h-20 rounded-lg border border-gray-200 shadow-sm mb-2 bg-${name}`}
			style={{ backgroundColor: hex }}
		/>
		<div className="text-center">
			<div className="font-mono text-sm font-medium">{name}</div>
			<div className="text-xs text-gray-600 mb-1">{description}</div>
			<div className="font-mono text-xs text-gray-500">{hex}</div>
		</div>
	</div>
);

export const SuzukaColorPalette: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Suzuka Color Palette</h1>
				<p className="text-gray-600">涼花みなせテーマのメインカラーパレット（桜色系）</p>
			</div>

			{/* メインカラーパレット表示 */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				{suzukaColorDetails.map((color) => (
					<div key={color.name} className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-16 rounded-md mb-3" style={{ backgroundColor: color.hex }} />
						<h4 className="font-semibold text-sm mb-1">{color.name}</h4>
						<p className="text-xs text-gray-600 mb-2">{color.description}</p>
						<code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{color.hex}</code>
					</div>
				))}
			</div>

			<div className="mt-8">
				<h2 className="text-2xl font-bold mb-4">Quick Reference</h2>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
					{suzukaColorDetails.map((color) => (
						<ColorSwatch key={color.name} {...color} />
					))}
				</div>
			</div>

			<div className="mt-12">
				<h2 className="text-2xl font-bold mb-4">Usage Examples</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* Button Examples */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Buttons</h3>
						<button
							type="button"
							className="px-4 py-2 bg-suzuka-500 hover:bg-suzuka-600 text-white rounded-md transition-colors"
						>
							Primary Button
						</button>
						<button
							type="button"
							className="px-4 py-2 bg-suzuka-100 hover:bg-suzuka-200 text-suzuka-700 rounded-md transition-colors"
						>
							Secondary Button
						</button>
						<button
							type="button"
							className="px-4 py-2 border border-suzuka-300 text-suzuka-600 hover:bg-suzuka-50 rounded-md transition-colors"
						>
							Outline Button
						</button>
					</div>

					{/* Card Examples */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Cards</h3>
						<div className="p-4 bg-suzuka-50 border border-suzuka-200 rounded-lg">
							<h4 className="font-medium text-suzuka-800 mb-2">Light Card</h4>
							<p className="text-suzuka-600 text-sm">カード内容のサンプルテキスト</p>
						</div>
						<div className="p-4 bg-suzuka-500 text-white rounded-lg">
							<h4 className="font-medium mb-2">Primary Card</h4>
							<p className="text-suzuka-100 text-sm">カード内容のサンプルテキスト</p>
						</div>
					</div>

					{/* Badge Examples */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Badges</h3>
						<div className="flex flex-wrap gap-2">
							<span className="px-2 py-1 bg-suzuka-100 text-suzuka-700 text-xs font-medium rounded">
								Tag
							</span>
							<span className="px-2 py-1 bg-suzuka-200 text-suzuka-800 text-xs font-medium rounded">
								Category
							</span>
							<span className="px-2 py-1 bg-suzuka-500 text-white text-xs font-medium rounded">
								Active
							</span>
							<span className="px-2 py-1 bg-suzuka-800 text-suzuka-100 text-xs font-medium rounded">
								Important
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-12">
				<h2 className="text-2xl font-bold mb-4">Gradient Examples</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="h-32 rounded-lg suzuka-gradient flex items-center justify-center">
						<span className="font-medium text-suzuka-800">suzuka-gradient</span>
					</div>
					<div className="h-32 rounded-lg suzuka-gradient-subtle flex items-center justify-center">
						<span className="font-medium text-suzuka-800">suzuka-gradient-subtle</span>
					</div>
					<div className="h-32 rounded-lg suzuka-gradient-radial flex items-center justify-center">
						<span className="font-medium text-suzuka-800">suzuka-gradient-radial</span>
					</div>
				</div>
			</div>
		</div>
	),
};

export const DarkMode: Story = {
	parameters: {
		backgrounds: { default: "dark" },
	},
	render: () => (
		<div className="dark p-6 bg-gray-900 text-white min-h-screen">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Suzuka Palette - Dark Mode</h1>
				<p className="text-gray-300">ダークモードでの表示</p>
			</div>

			{/* カラーパレット表示（ダークモード対応） */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				{suzukaColorDetails.map((color) => (
					<div key={color.name} className="border border-gray-600 rounded-lg p-4">
						<div className="w-full h-16 rounded-md mb-3" style={{ backgroundColor: color.hex }} />
						<h4 className="font-semibold text-sm mb-1 text-gray-100">{color.name}</h4>
						<p className="text-xs text-gray-300 mb-2">{color.description}</p>
						<code className="text-xs font-mono bg-gray-800 text-gray-100 px-2 py-1 rounded">
							{color.hex}
						</code>
					</div>
				))}
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
				{suzukaColorDetails.map((color) => (
					<ColorSwatch key={color.name} {...color} />
				))}
			</div>

			<div className="mt-12">
				<h2 className="text-2xl font-bold mb-4">Dark Mode Gradients</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="h-32 rounded-lg suzuka-gradient flex items-center justify-center">
						<span className="font-medium text-suzuka-200">suzuka-gradient</span>
					</div>
					<div className="h-32 rounded-lg suzuka-gradient-subtle flex items-center justify-center">
						<span className="font-medium text-suzuka-200">suzuka-gradient-subtle</span>
					</div>
					<div className="h-32 rounded-lg suzuka-gradient-radial flex items-center justify-center">
						<span className="font-medium text-suzuka-200">suzuka-gradient-radial</span>
					</div>
				</div>
			</div>
		</div>
	),
};

export const MinaseColorPalette: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Minase Color Palette</h1>
				<p className="text-gray-600">涼花みなせテーマのサブカラーパレット（オレンジ・ウォーム系）</p>
			</div>

			{/* サブカラーパレット表示 */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				{minaseColorDetails.map((color) => (
					<div key={color.name} className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-16 rounded-md mb-3" style={{ backgroundColor: color.hex }} />
						<h4 className="font-semibold text-sm mb-1">{color.name}</h4>
						<p className="text-xs text-gray-600 mb-2">{color.description}</p>
						<code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{color.hex}</code>
					</div>
				))}
			</div>

			<div className="mt-8">
				<h2 className="text-2xl font-bold mb-4">Quick Reference</h2>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
					{minaseColorDetails.map((color) => (
						<ColorSwatch key={color.name} {...color} />
					))}
				</div>
			</div>

			<div className="mt-12">
				<h2 className="text-2xl font-bold mb-4">Usage Examples</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* Button Examples */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Buttons</h3>
						<button
							type="button"
							className="px-4 py-2 hover:bg-minase-600 text-white rounded-md transition-colors"
							style={{ backgroundColor: "#ff7e2d" }}
						>
							Primary Button
						</button>
						<button
							type="button"
							className="px-4 py-2 hover:bg-minase-200 rounded-md transition-colors"
							style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}
						>
							Secondary Button
						</button>
						<button
							type="button"
							className="px-4 py-2 border hover:bg-minase-50 rounded-md transition-colors"
							style={{ borderColor: "#fdba74", color: "#ea5a0b" }}
						>
							Outline Button
						</button>
					</div>

					{/* Card Examples */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Cards</h3>
						<div className="p-4 border rounded-lg" style={{ backgroundColor: "#fff8f3", borderColor: "#fed7aa" }}>
							<h4 className="font-medium mb-2" style={{ color: "#9a3412" }}>Light Card</h4>
							<p className="text-sm" style={{ color: "#ea5a0b" }}>カード内容のサンプルテキスト</p>
						</div>
						<div className="p-4 text-white rounded-lg" style={{ backgroundColor: "#ff7e2d" }}>
							<h4 className="font-medium mb-2">Primary Card</h4>
							<p className="text-sm" style={{ color: "#ffedd5" }}>カード内容のサンプルテキスト</p>
						</div>
					</div>

					{/* Badge Examples */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Badges</h3>
						<div className="flex flex-wrap gap-2">
							<span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}>
								Tag
							</span>
							<span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: "#fed7aa", color: "#9a3412" }}>
								Category
							</span>
							<span className="px-2 py-1 text-white text-xs font-medium rounded" style={{ backgroundColor: "#ff7e2d" }}>
								Active
							</span>
							<span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: "#9a3412", color: "#ffedd5" }}>
								Important
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-12">
				<h2 className="text-2xl font-bold mb-4">Color Harmony</h2>
				<div className="p-6 bg-gray-50 rounded-lg">
					<h3 className="text-lg font-semibold mb-4">メインカラーとの組み合わせ</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="p-4 border rounded-lg" style={{ backgroundColor: "#fff5fa", borderColor: "#ffc2d9" }}>
							<div className="flex items-center space-x-2 mb-3">
								<div className="w-4 h-4 rounded" style={{ backgroundColor: "#ff4785" }}></div>
								<div className="w-4 h-4 rounded" style={{ backgroundColor: "#ff7e2d" }}></div>
								<span className="text-sm font-medium">Primary + Accent</span>
							</div>
							<p className="text-sm text-gray-600">桜色とオレンジの調和のとれた組み合わせ</p>
						</div>
						<div className="p-4 border rounded-lg" style={{ backgroundColor: "#fff8f3", borderColor: "#fed7aa" }}>
							<div className="flex items-center space-x-2 mb-3">
								<div className="w-4 h-4 rounded" style={{ backgroundColor: "#ffe0ed" }}></div>
								<div className="w-4 h-4 rounded" style={{ backgroundColor: "#ffedd5" }}></div>
								<span className="text-sm font-medium">Light Tones</span>
							</div>
							<p className="text-sm text-gray-600">柔らかく優しい印象の淡色組み合わせ</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

export const ColorGroups: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Complete Color System</h1>
				<p className="text-gray-600">suzuka（桜色）+ minase（オレンジ）の完全なカラーシステム</p>
			</div>

			{/* カラーシステム概要 */}
			<div className="mb-12">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Suzuka Colors */}
					<div className="border border-gray-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold mb-4 flex items-center">
							<div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: "#ff4785" }}></div>
							Suzuka Colors（メインカラー）
						</h3>
						<div className="flex space-x-1 mb-3">
							{suzukaColorDetails.slice(0, 8).map((color) => (
								<div
									key={color.name}
									className="w-8 h-8 rounded"
									style={{ backgroundColor: color.hex }}
									title={`${color.name}: ${color.hex}`}
								/>
							))}
						</div>
						<p className="text-sm text-gray-600">プライマリアクション、ブランド要素、強調表示</p>
					</div>

					{/* Minase Colors */}
					<div className="border border-gray-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold mb-4 flex items-center">
							<div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: "#ff7e2d" }}></div>
							Minase Colors（サブカラー）
						</h3>
						<div className="flex space-x-1 mb-3">
							{minaseColorDetails.slice(0, 8).map((color) => (
								<div
									key={color.name}
									className="w-8 h-8 rounded"
									style={{ backgroundColor: color.hex }}
									title={`${color.name}: ${color.hex}`}
								/>
							))}
						</div>
						<p className="text-sm text-gray-600">セカンダリアクション、アクセント、ウォーム表現</p>
					</div>
				</div>
			</div>

			{/* 背景色グループ */}
			<div className="mb-8">
				<h3 className="text-lg font-semibold mb-4">Background Colors</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#fff5fa" }} />
						<h4 className="font-semibold text-sm">Main Background</h4>
						<p className="text-xs text-gray-600">bg-suzuka-50</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#ffe0ed" }} />
						<h4 className="font-semibold text-sm">Card Background</h4>
						<p className="text-xs text-gray-600">bg-suzuka-100</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#ffc2d9" }} />
						<h4 className="font-semibold text-sm">Hover Background</h4>
						<p className="text-xs text-gray-600">bg-suzuka-200</p>
					</div>
				</div>
			</div>

			{/* アクションカラーグループ */}
			<div className="mb-8">
				<h3 className="text-lg font-semibold mb-4">Action Colors</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#ff4785" }} />
						<h4 className="font-semibold text-sm">Primary Action</h4>
						<p className="text-xs text-gray-600">bg-suzuka-500</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#e0266e" }} />
						<h4 className="font-semibold text-sm">Primary Hover</h4>
						<p className="text-xs text-gray-600">bg-suzuka-600</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#b81d5b" }} />
						<h4 className="font-semibold text-sm">Primary Active</h4>
						<p className="text-xs text-gray-600">bg-suzuka-700</p>
					</div>
				</div>
			</div>

			{/* テキストカラーグループ */}
			<div className="mb-8">
				<h3 className="text-lg font-semibold mb-4">Text Colors</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#8f1447" }} />
						<h4 className="font-semibold text-sm">Body Text</h4>
						<p className="text-xs text-gray-600">text-suzuka-800</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#660d33" }} />
						<h4 className="font-semibold text-sm">Heading Text</h4>
						<p className="text-xs text-gray-600">text-suzuka-900</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#3d0820" }} />
						<h4 className="font-semibold text-sm">Dark Background Text</h4>
						<p className="text-xs text-gray-600">text-suzuka-950</p>
					</div>
				</div>
			</div>

			{/* ボーダー・アクセントカラーグループ */}
			<div className="mb-8">
				<h3 className="text-lg font-semibold mb-4">Border & Accent Colors</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#ffc2d9" }} />
						<h4 className="font-semibold text-sm">Default Border</h4>
						<p className="text-xs text-gray-600">border-suzuka-200</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#ff9ebf" }} />
						<h4 className="font-semibold text-sm">Hover Border</h4>
						<p className="text-xs text-gray-600">border-suzuka-300</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div className="w-full h-12 rounded-md mb-3" style={{ backgroundColor: "#ff4785" }} />
						<h4 className="font-semibold text-sm">Focus Ring</h4>
						<p className="text-xs text-gray-600">ring-suzuka-500</p>
					</div>
				</div>
			</div>
		</div>
	),
};

export const AccessibilityContrast: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Accessibility & Contrast</h1>
				<p className="text-gray-600">コントラスト比とアクセシビリティの確認</p>
			</div>

			{/* 推奨カラー組み合わせ表示 */}
			<div className="mb-8">
				<h3 className="text-lg font-semibold mb-4">Recommended Color Combinations</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="border border-gray-200 rounded-lg p-4">
						<div
							className="w-full h-12 rounded-md mb-3 flex items-center justify-center text-sm font-medium"
							style={{ backgroundColor: "#fff5fa", color: "#660d33" }}
						>
							Sample Text
						</div>
						<h4 className="font-semibold text-sm">Light Background</h4>
						<p className="text-xs text-gray-600">bg-suzuka-50 + text-suzuka-900</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div
							className="w-full h-12 rounded-md mb-3 flex items-center justify-center text-sm font-medium"
							style={{ backgroundColor: "#ff4785", color: "#ffffff" }}
						>
							Sample Text
						</div>
						<h4 className="font-semibold text-sm">Primary Action</h4>
						<p className="text-xs text-gray-600">bg-suzuka-500 + text-white</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div
							className="w-full h-12 rounded-md mb-3 flex items-center justify-center text-sm font-medium"
							style={{ backgroundColor: "#ffe0ed", color: "#8f1447" }}
						>
							Sample Text
						</div>
						<h4 className="font-semibold text-sm">Secondary Action</h4>
						<p className="text-xs text-gray-600">bg-suzuka-100 + text-suzuka-800</p>
					</div>
					<div className="border border-gray-200 rounded-lg p-4">
						<div
							className="w-full h-12 rounded-md mb-3 flex items-center justify-center text-sm font-medium"
							style={{ backgroundColor: "#e0266e", color: "#ffffff" }}
						>
							Sample Text
						</div>
						<h4 className="font-semibold text-sm">Danger State</h4>
						<p className="text-xs text-gray-600">bg-suzuka-600 + text-white</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				{/* Light text on suzuka backgrounds */}
				<div>
					<h3 className="text-lg font-semibold mb-4">Light Text on Suzuka Backgrounds</h3>
					<div className="space-y-2">
						{suzukaColorDetails.slice(4).map((color) => (
							<div
								key={color.name}
								className="p-3 text-white rounded"
								style={{ backgroundColor: color.hex }}
							>
								<span className="font-medium">{color.name}</span> - White text
							</div>
						))}
					</div>
				</div>

				{/* Dark text on suzuka backgrounds */}
				<div>
					<h3 className="text-lg font-semibold mb-4">Dark Text on Suzuka Backgrounds</h3>
					<div className="space-y-2">
						{suzukaColorDetails.slice(0, 4).map((color) => (
							<div
								key={color.name}
								className="p-3 text-suzuka-900 rounded"
								style={{ backgroundColor: color.hex }}
							>
								<span className="font-medium">{color.name}</span> - Dark text
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	),
};
