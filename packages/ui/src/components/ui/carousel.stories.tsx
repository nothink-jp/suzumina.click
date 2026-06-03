import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Card, CardContent } from "./card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "./carousel";

const meta: Meta<typeof Carousel> = {
	title: "UI/Carousel",
	component: Carousel,
	parameters: {
		docs: {
			description: {
				component:
					"カルーセル/スライダーコンポーネント - Embla Carouselベースの高機能スライドコンポーネント",
			},
		},
	},
	argTypes: {
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
			description: "カルーセルの方向",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Carousel>;

// デモ用のサンプルデータ
const sampleCards = Array.from({ length: 8 }, (_, i) => ({
	id: i + 1,
	title: `カード ${i + 1}`,
	content: `これはカード${i + 1}の内容です。カルーセルでスライドできます。`,
}));

export const Default: Story = {
	render: () => (
		<div className="w-full max-w-4xl mx-auto">
			<Carousel className="w-full">
				<CarouselContent>
					{sampleCards.map((card) => (
						<CarouselItem key={card.id} className="md:basis-1/2 lg:basis-1/3">
							<div className="p-1">
								<Card>
									<CardContent className="flex aspect-square items-center justify-center p-6">
										<div className="text-center">
											<h3 className="text-lg font-semibold mb-2">{card.title}</h3>
											<p className="text-sm text-muted-foreground">{card.content}</p>
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const SingleItem: Story = {
	render: () => (
		<div className="w-full max-w-sm mx-auto">
			<Carousel className="w-full">
				<CarouselContent>
					{sampleCards.slice(0, 5).map((card) => (
						<CarouselItem key={card.id}>
							<div className="p-1">
								<Card>
									<CardContent className="flex aspect-square items-center justify-center p-6">
										<div className="text-center">
											<h3 className="text-2xl font-bold">{card.id}</h3>
											<p className="text-muted-foreground">{card.title}</p>
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const MultipleItems: Story = {
	render: () => (
		<div className="w-full max-w-4xl mx-auto">
			<Carousel className="w-full">
				<CarouselContent>
					{sampleCards.map((card) => (
						<CarouselItem key={card.id} className="basis-1/3">
							<div className="p-1">
								<Card>
									<CardContent className="flex aspect-square items-center justify-center p-6">
										<div className="text-center">
											<h3 className="text-xl font-bold">{card.id}</h3>
											<p className="text-sm text-muted-foreground">{card.title}</p>
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className="w-full max-w-xs mx-auto">
			<Carousel orientation="vertical" className="w-full max-w-xs">
				<CarouselContent className="-mt-1 h-[300px]">
					{sampleCards.slice(0, 5).map((card) => (
						<CarouselItem key={card.id} className="pt-1 basis-1/3">
							<div className="p-1">
								<Card>
									<CardContent className="flex items-center justify-center p-6">
										<span className="text-2xl font-semibold">{card.id}</span>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const WithoutControls: Story = {
	render: () => (
		<div className="w-full max-w-4xl mx-auto">
			<Carousel className="w-full">
				<CarouselContent>
					{sampleCards.map((card) => (
						<CarouselItem key={card.id} className="md:basis-1/2 lg:basis-1/3">
							<div className="p-1">
								<Card>
									<CardContent className="flex aspect-square items-center justify-center p-6">
										<div className="text-center">
											<h3 className="text-lg font-semibold mb-2">{card.title}</h3>
											<p className="text-sm text-muted-foreground">{card.content}</p>
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
			</Carousel>
		</div>
	),
};

export const RealWorldExample: Story = {
	render: () => (
		<div className="w-full max-w-6xl mx-auto">
			<div className="mb-6">
				<h2 className="text-2xl font-bold mb-2">注目の動画</h2>
				<p className="text-muted-foreground">涼花みなせの最新動画をチェック</p>
			</div>
			<Carousel className="w-full">
				<CarouselContent>
					{Array.from({ length: 6 }, (_, i) => (
						<CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
							<div className="p-1">
								<Card className="overflow-hidden">
									<div className="aspect-video bg-gradient-to-br from-suzuka-200 to-suzuka-400 flex items-center justify-center">
										<div className="text-white text-center">
											<div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
												▶
											</div>
											<p className="text-sm font-medium">動画 {i + 1}</p>
										</div>
									</div>
									<CardContent className="p-4">
										<h3 className="font-semibold mb-1">サンプル動画タイトル {i + 1}</h3>
										<p className="text-sm text-muted-foreground mb-2">2024年12月25日 公開</p>
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>👁 1,234 回視聴</span>
											<span>💖 89</span>
										</div>
									</CardContent>
								</Card>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
};

export const NavigationInteraction: Story = {
	render: () => (
		<div className="w-full max-w-sm mx-auto">
			<Carousel className="w-full">
				<CarouselContent>
					{sampleCards.slice(0, 3).map((card) => (
						<CarouselItem key={card.id}>
							<Card>
								<CardContent className="flex aspect-square items-center justify-center p-6">
									<h3 className="text-2xl font-bold">スライド {card.id}</h3>
								</CardContent>
							</Card>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const nextBtn = canvas.getByRole("button", { name: /next slide/i });
		// embla の初期化後に canScrollNext が立ち Next が enabled になる。描画タイミングに依存するため待つ
		await waitFor(() => expect(nextBtn).toBeEnabled());
		await userEvent.click(nextBtn);
		const prevBtn = canvas.getByRole("button", { name: /previous slide/i });
		await waitFor(() => expect(prevBtn).toBeEnabled());
	},
};
