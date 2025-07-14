import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";
import { Toaster } from "./sonner";

const meta = {
	title: "UI/Sonner (Toast)",
	component: Toaster,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

// ストーリーごとにToasterコンポーネントを含める必要があります
const ToastDemo = ({ children }: { children: React.ReactNode }) => (
	<div>
		{children}
		<Toaster />
	</div>
);

export const Basic: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button onClick={() => toast("基本的なトースト通知です")}>基本</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast("カスタムメッセージ", {
							description: "これは詳細な説明文です。",
						})
					}
				>
					説明付き
				</Button>
			</div>
		</ToastDemo>
	),
};

export const Types: Story = {
	render: () => (
		<ToastDemo>
			<div className="grid grid-cols-2 gap-2">
				<Button variant="default" onClick={() => toast.success("操作が完了しました")}>
					<CheckCircleIcon className="mr-2 h-4 w-4" />
					成功
				</Button>
				<Button variant="destructive" onClick={() => toast.error("エラーが発生しました")}>
					<XCircleIcon className="mr-2 h-4 w-4" />
					エラー
				</Button>
				<Button variant="outline" onClick={() => toast.info("新しい情報があります")}>
					<InfoIcon className="mr-2 h-4 w-4" />
					情報
				</Button>
				<Button variant="secondary" onClick={() => toast.warning("注意が必要です")}>
					<AlertTriangleIcon className="mr-2 h-4 w-4" />
					警告
				</Button>
			</div>
		</ToastDemo>
	),
};

export const WithActions: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button
					onClick={() =>
						toast("ファイルを削除しますか？", {
							action: {
								label: "削除",
								onClick: () => toast.success("ファイルが削除されました"),
							},
						})
					}
				>
					アクション付き
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast("変更を保存しますか？", {
							description: "保存されていない変更があります。",
							action: {
								label: "保存",
								onClick: () => toast.success("変更が保存されました"),
							},
							cancel: {
								label: "キャンセル",
								onClick: () => toast("キャンセルされました"),
							},
						})
					}
				>
					複数アクション
				</Button>
			</div>
		</ToastDemo>
	),
};

export const Duration: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button onClick={() => toast("短い通知（2秒）", { duration: 2000 })}>短い</Button>
				<Button variant="outline" onClick={() => toast("長い通知（10秒）", { duration: 10000 })}>
					長い
				</Button>
				<Button variant="secondary" onClick={() => toast("永続的な通知", { duration: Infinity })}>
					永続的
				</Button>
			</div>
		</ToastDemo>
	),
};

export const Positioning: Story = {
	render: () => (
		<ToastDemo>
			<div className="grid grid-cols-3 gap-2">
				<Button
					onClick={() => {
						toast.dismiss();
						toast("上左", { position: "top-left" });
					}}
				>
					上左
				</Button>
				<Button
					onClick={() => {
						toast.dismiss();
						toast("上中央", { position: "top-center" });
					}}
				>
					上中央
				</Button>
				<Button
					onClick={() => {
						toast.dismiss();
						toast("上右", { position: "top-right" });
					}}
				>
					上右
				</Button>
				<Button
					onClick={() => {
						toast.dismiss();
						toast("下左", { position: "bottom-left" });
					}}
				>
					下左
				</Button>
				<Button
					onClick={() => {
						toast.dismiss();
						toast("下中央", { position: "bottom-center" });
					}}
				>
					下中央
				</Button>
				<Button
					onClick={() => {
						toast.dismiss();
						toast("下右", { position: "bottom-right" });
					}}
				>
					下右
				</Button>
			</div>
		</ToastDemo>
	),
};

export const LoadingToast: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button
					onClick={() => {
						const id = toast.loading("ファイルをアップロード中...");
						setTimeout(() => {
							toast.success("アップロード完了", { id });
						}, 3000);
					}}
				>
					ローディング → 成功
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						const id = toast.loading("データを処理中...");
						setTimeout(() => {
							toast.error("処理に失敗しました", { id });
						}, 3000);
					}}
				>
					ローディング → エラー
				</Button>
			</div>
		</ToastDemo>
	),
};

export const FormSubmission: Story = {
	render: () => (
		<ToastDemo>
			<div className="space-y-4 w-[300px]">
				<h3 className="font-semibold">フォーム送信例</h3>
				<Button
					className="w-full"
					onClick={() => {
						const id = toast.loading("フォームを送信中...");

						// 成功パターン
						setTimeout(() => {
							toast.success("送信が完了しました", {
								id,
								description: "確認メールをお送りしました。",
								action: {
									label: "詳細",
									onClick: () => toast.info("詳細ページを開きました"),
								},
							});
						}, 2000);
					}}
				>
					フォーム送信（成功）
				</Button>
				<Button
					variant="outline"
					className="w-full"
					onClick={() => {
						const id = toast.loading("フォームを送信中...");

						// エラーパターン
						setTimeout(() => {
							toast.error("送信に失敗しました", {
								id,
								description: "ネットワークエラーが発生しました。",
								action: {
									label: "再試行",
									onClick: () => toast.info("再試行しています..."),
								},
							});
						}, 2000);
					}}
				>
					フォーム送信（エラー）
				</Button>
			</div>
		</ToastDemo>
	),
};

export const CustomContent: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button
					onClick={() =>
						toast.custom((t) => (
							<div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
									<span className="font-medium">カスタムトースト</span>
								</div>
								<p className="text-sm mt-1 opacity-90">カスタムデザインのトースト通知です</p>
								<button
									onClick={() => toast.dismiss(t)}
									className="mt-2 text-xs bg-white/20 px-2 py-1 rounded"
								>
									閉じる
								</button>
							</div>
						))
					}
				>
					カスタムデザイン
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast(
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
									<InfoIcon className="w-5 h-5 text-blue-600" />
								</div>
								<div>
									<p className="font-medium">新機能のお知らせ</p>
									<p className="text-sm text-muted-foreground">
										ダークモードが利用可能になりました
									</p>
								</div>
							</div>,
						)
					}
				>
					リッチコンテンツ
				</Button>
			</div>
		</ToastDemo>
	),
};

export const Promises: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button
					onClick={() => {
						const promise = new Promise<string>((resolve) => {
							setTimeout(() => resolve("データの取得が完了しました"), 3000);
						});

						toast.promise(promise, {
							loading: "データを取得中...",
							success: (data) => data,
							error: "取得に失敗しました",
						});
					}}
				>
					Promise（成功）
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						const promise = new Promise<string>((_, reject) => {
							setTimeout(() => reject(new Error("サーバーエラー")), 3000);
						});

						toast.promise(promise, {
							loading: "データを取得中...",
							success: "取得が完了しました",
							error: (err) => `エラー: ${err.message}`,
						});
					}}
				>
					Promise（エラー）
				</Button>
			</div>
		</ToastDemo>
	),
};

export const Multiple: Story = {
	render: () => (
		<ToastDemo>
			<div className="flex gap-2">
				<Button
					onClick={() => {
						toast.success("1つ目の通知");
						toast.info("2つ目の通知");
						toast.warning("3つ目の通知");
					}}
				>
					複数通知
				</Button>
				<Button variant="outline" onClick={() => toast.dismiss()}>
					全て削除
				</Button>
			</div>
		</ToastDemo>
	),
};
