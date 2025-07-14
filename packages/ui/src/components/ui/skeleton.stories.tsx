import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta = {
	title: "UI/Skeleton",
	component: Skeleton,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <Skeleton className="w-[200px] h-4" />,
};

export const BasicShapes: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<h4 className="text-sm font-medium">テキストライン</h4>
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-[90%]" />
					<Skeleton className="h-4 w-[75%]" />
				</div>
			</div>

			<div className="space-y-2">
				<h4 className="text-sm font-medium">ボタン</h4>
				<Skeleton className="h-9 w-24" />
			</div>

			<div className="space-y-2">
				<h4 className="text-sm font-medium">画像・アバター</h4>
				<div className="flex gap-4">
					<Skeleton className="h-12 w-12 rounded-full" />
					<Skeleton className="h-16 w-16 rounded-lg" />
					<Skeleton className="h-20 w-32 rounded-md" />
				</div>
			</div>
		</div>
	),
};

export const CardSkeleton: Story = {
	render: () => (
		<div className="max-w-sm border rounded-lg p-6 space-y-4">
			<div className="flex items-center space-x-4">
				<Skeleton className="h-12 w-12 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-[120px]" />
					<Skeleton className="h-4 w-[80px]" />
				</div>
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-[75%]" />
			</div>
			<div className="flex justify-between">
				<Skeleton className="h-8 w-16" />
				<Skeleton className="h-8 w-20" />
			</div>
		</div>
	),
};

export const UserProfileSkeleton: Story = {
	render: () => (
		<div className="max-w-md border rounded-lg p-6">
			<div className="space-y-6">
				{/* ヘッダー */}
				<div className="flex items-center space-x-4">
					<Skeleton className="h-16 w-16 rounded-full" />
					<div className="space-y-2 flex-1">
						<Skeleton className="h-5 w-[150px]" />
						<Skeleton className="h-4 w-[100px]" />
						<Skeleton className="h-3 w-[80px]" />
					</div>
				</div>

				{/* 統計情報 */}
				<div className="grid grid-cols-3 gap-4">
					<div className="text-center space-y-2">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-3 w-full" />
					</div>
					<div className="text-center space-y-2">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-3 w-full" />
					</div>
					<div className="text-center space-y-2">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-3 w-full" />
					</div>
				</div>

				{/* バイオ */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-[60%]" />
				</div>

				{/* アクションボタン */}
				<div className="flex gap-2">
					<Skeleton className="h-9 flex-1" />
					<Skeleton className="h-9 w-20" />
				</div>
			</div>
		</div>
	),
};

export const ArticleListSkeleton: Story = {
	render: () => (
		<div className="space-y-4 max-w-2xl">
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className="border rounded-lg p-4 space-y-3">
					<div className="flex items-start space-x-4">
						<Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-4 w-[80%]" />
							<div className="flex items-center space-x-4 pt-2">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-12" />
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	),
};

export const TableSkeleton: Story = {
	render: () => (
		<div className="w-full border rounded-lg">
			<div className="border-b p-4">
				<div className="grid grid-cols-4 gap-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
				</div>
			</div>
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="border-b last:border-b-0 p-4">
					<div className="grid grid-cols-4 gap-4">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<div className="flex gap-2">
							<Skeleton className="h-6 w-12" />
							<Skeleton className="h-6 w-12" />
						</div>
					</div>
				</div>
			))}
		</div>
	),
};

export const FormSkeleton: Story = {
	render: () => (
		<div className="max-w-md space-y-6 p-6 border rounded-lg">
			<Skeleton className="h-6 w-32" /> {/* タイトル */}
			<div className="space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" /> {/* ラベル */}
					<Skeleton className="h-9 w-full" /> {/* 入力フィールド */}
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-9 w-full" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-20 w-full" /> {/* テキストエリア */}
				</div>

				<div className="flex items-center space-x-2">
					<Skeleton className="h-4 w-4" /> {/* チェックボックス */}
					<Skeleton className="h-4 w-32" />
				</div>

				<div className="flex gap-2 pt-4">
					<Skeleton className="h-9 w-20" />
					<Skeleton className="h-9 w-24" />
				</div>
			</div>
		</div>
	),
};

export const DashboardSkeleton: Story = {
	render: () => (
		<div className="space-y-6 p-6 max-w-4xl">
			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-9 w-24" />
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="border rounded-lg p-4 space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-8 w-16" />
						<Skeleton className="h-3 w-20" />
					</div>
				))}
			</div>

			{/* チャートエリア */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="border rounded-lg p-4 space-y-4">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="border rounded-lg p-4 space-y-4">
					<Skeleton className="h-5 w-28" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-12" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	),
};

export const LoadingStates: Story = {
	render: () => (
		<div className="space-y-8 max-w-2xl">
			<div>
				<h3 className="text-lg font-semibold mb-4">ページ読み込み中</h3>
				<div className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				</div>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-4">画像読み込み中</h3>
				<div className="grid grid-cols-3 gap-4">
					<Skeleton className="aspect-square w-full rounded-lg" />
					<Skeleton className="aspect-square w-full rounded-lg" />
					<Skeleton className="aspect-square w-full rounded-lg" />
				</div>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-4">リスト読み込み中</h3>
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center space-x-3 p-2">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="space-y-1 flex-1">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-3 w-3/4" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	),
};
