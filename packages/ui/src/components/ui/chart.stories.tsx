import type { Meta, StoryObj } from "@storybook/react-vite";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";

/**
 * 価格履歴チャート（apps/web/src/components/price-history/price-history-chart.tsx）と同じ構成。
 * 色は ChartConfig 経由で semantic トークン（--info / --destructive）から注入され、
 * コンポーネント側は hex を持たない（ADR-012）。
 */
const chartConfig = {
	regularPrice: { label: "定価", color: "hsl(var(--info))" },
	discountPrice: { label: "セール価格", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const priceHistoryData = [
	{ label: "6/1", regularPrice: 1320 },
	{ label: "6/3", regularPrice: 1320 },
	{ label: "6/5", regularPrice: 1320 },
	{ label: "6/7", regularPrice: 1320, discountPrice: 924 },
	{ label: "6/9", regularPrice: 1320, discountPrice: 924 },
	{ label: "6/11", regularPrice: 1320, discountPrice: 924 },
	{ label: "6/13", regularPrice: 1320, discountPrice: 924 },
	{ label: "6/15", regularPrice: 1320 },
	{ label: "6/17", regularPrice: 1320 },
	{ label: "6/19", regularPrice: 1320 },
];

function PriceHistoryChartExample() {
	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-64 w-[480px]">
			<LineChart data={priceHistoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
				<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
				<XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
				<YAxis
					domain={[0, 1500]}
					tick={{ fontSize: 12 }}
					stroke="hsl(var(--muted-foreground))"
					tickFormatter={(value) => `¥${value.toLocaleString("ja-JP")}`}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<Line
					type="monotone"
					dataKey="regularPrice"
					stroke="var(--color-regularPrice)"
					strokeWidth={2}
					dot={{ r: 3, fill: "var(--color-regularPrice)" }}
					activeDot={{ r: 5, fill: "var(--color-regularPrice)" }}
					connectNulls={false}
				/>
				<Line
					type="monotone"
					dataKey="discountPrice"
					stroke="var(--color-discountPrice)"
					strokeWidth={2}
					strokeDasharray="5 5"
					dot={{ r: 3, fill: "var(--color-discountPrice)" }}
					activeDot={{ r: 5, fill: "var(--color-discountPrice)" }}
					connectNulls={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}

const meta = {
	title: "UI/Chart",
	component: ChartContainer,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"recharts ベースのチャートコンテナ（shadcn/ui 由来）。系列の色は ChartConfig 経由で globals.css の semantic トークンから CSS 変数として注入され、コンポーネント・呼び出し側のどちらも hex を持たない（ADR-012）。",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <PriceHistoryChartExample />,
};

export const TooltipInteraction: Story = {
	render: () => <PriceHistoryChartExample />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await waitFor(() => expect(canvasElement.querySelectorAll(".recharts-line").length).toBe(2));

		// 系列色がハードコードの hex ではなく semantic トークン（--info/--destructive）由来であることを検証する。
		// resolveColor は「今の」トークン値から動的に期待値を算出するため、将来トークンが変わっても壊れず、
		// 逆に誰かが色を hex 直書きに戻すと（トークンと無関係な値になるため）確実に落ちる。
		const resolveColor = (cssValue: string) => {
			const probe = document.createElement("div");
			probe.style.color = cssValue;
			canvasElement.appendChild(probe);
			const resolved = getComputedStyle(probe).color;
			probe.remove();
			return resolved;
		};
		const lines = canvasElement.querySelectorAll<SVGPathElement>(
			".recharts-line path.recharts-curve",
		);
		expect(lines).toHaveLength(2);
		const [regularLine, discountLine] = lines;
		if (!regularLine || !discountLine) throw new Error("価格系列のラインが見つかりません");
		expect(getComputedStyle(regularLine).stroke).toBe(resolveColor("hsl(var(--info))"));
		expect(getComputedStyle(discountLine).stroke).toBe(resolveColor("hsl(var(--destructive))"));

		// ツールチップがホバーで表示され、ChartConfig のラベルが反映されることを検証する。
		// recharts はマウス座標（clientX/Y）を実座標から計算するため、userEvent.hover の要素中心
		// ディスパッチでは座標がプロット領域内に正しく解決されないことがある。
		// wrapper の実測 rect から明示座標で mouseOver → mouseMove を発火する。
		const wrapper = canvasElement.querySelector<HTMLElement>(".recharts-wrapper");
		if (!wrapper) throw new Error("recharts-wrapper が見つかりません");
		const rect = wrapper.getBoundingClientRect();
		const point = { clientX: rect.x + rect.width * 0.4, clientY: rect.y + rect.height * 0.5 };
		fireEvent.mouseOver(wrapper, point);
		fireEvent.mouseMove(wrapper, point);
		await waitFor(() => expect(canvas.getByText("定価")).toBeInTheDocument());
		await waitFor(() => expect(canvas.getByText("セール価格")).toBeInTheDocument());
	},
};
