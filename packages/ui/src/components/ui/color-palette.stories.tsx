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
				<p className="text-gray-600">涼花みなせテーマの桜色パレット</p>
			</div>

			{/* カラーパレット表示 */}
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

export const ColorGroups: Story = {
	render: () => (
		<div className="p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Color Groups</h1>
				<p className="text-gray-600">用途別のカラーグループ</p>
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
