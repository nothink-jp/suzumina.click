import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, TrashIcon } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./alert-dialog";
import { Button } from "./button";

const meta = {
	title: "UI/AlertDialog",
	component: AlertDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">アラートを表示</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>確認</AlertDialogTitle>
					<AlertDialogDescription>
						この操作を実行してもよろしいですか？この操作は取り消すことができません。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction>実行</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const DeleteConfirmation: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="destructive">
					<TrashIcon className="mr-2 h-4 w-4" />
					削除
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="h-5 w-5 text-red-500" />
						項目の削除
					</AlertDialogTitle>
					<AlertDialogDescription>
						この項目を削除してもよろしいですか？削除された項目は復元できません。
						関連するデータもすべて削除されます。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const LogoutConfirmation: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="ghost">ログアウト</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ログアウト</AlertDialogTitle>
					<AlertDialogDescription>
						ログアウトしてもよろしいですか？ 保存されていない変更は失われる可能性があります。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction>ログアウト</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const SaveChanges: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">ページを離れる</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<InfoIcon className="h-5 w-5 text-blue-500" />
						変更を保存
					</AlertDialogTitle>
					<AlertDialogDescription>
						未保存の変更があります。ページを離れる前に変更を保存しますか？
						保存しない場合、変更内容は失われます。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>変更を破棄</AlertDialogCancel>
					<AlertDialogAction>保存して続行</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const PublishContent: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button>記事を公開</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<CheckCircleIcon className="h-5 w-5 text-green-500" />
						記事の公開
					</AlertDialogTitle>
					<AlertDialogDescription>
						記事を公開してもよろしいですか？公開された記事は全てのユーザーに表示されます。
						公開後も編集は可能ですが、SEOやシェア情報に影響する場合があります。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>下書きのまま</AlertDialogCancel>
					<AlertDialogAction className="bg-green-600 hover:bg-green-700">
						公開する
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const AccountDeletion: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="destructive">アカウント削除</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2 text-red-600">
						<AlertTriangleIcon className="h-5 w-5" />
						アカウントの削除
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-2">
						<p>アカウントを削除すると、以下のデータが完全に削除されます：</p>
						<ul className="list-disc list-inside space-y-1 text-sm">
							<li>プロフィール情報</li>
							<li>作成したコンテンツ</li>
							<li>お気に入り・ブックマーク</li>
							<li>メッセージ履歴</li>
							<li>購入履歴</li>
						</ul>
						<p className="font-medium text-red-600">この操作は取り消すことができません。</p>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction className="bg-red-600 hover:bg-red-700">削除する</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const DataExport: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">データをエクスポート</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>データのエクスポート</AlertDialogTitle>
					<AlertDialogDescription>
						アカウントのデータをエクスポートします。処理には数分かかる場合があります。
						エクスポートが完了すると、メールでダウンロードリンクをお送りします。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction>エクスポート開始</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const ResetSettings: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">設定をリセット</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>設定のリセット</AlertDialogTitle>
					<AlertDialogDescription>
						すべての設定を初期値に戻してもよろしいですか？
						カスタマイズした設定、テーマ、通知設定などがすべて削除されます。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction>リセット実行</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const CustomStyling: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">カスタムスタイル</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-blue-900">プレミアム機能</AlertDialogTitle>
					<AlertDialogDescription className="text-blue-700">
						この機能を使用するにはプレミアムプランへのアップグレードが必要です。
						プレミアムプランでは追加の機能と優先サポートをご利用いただけます。
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel className="border-blue-200 text-blue-700 hover:bg-blue-100">
						後で
					</AlertDialogCancel>
					<AlertDialogAction className="bg-blue-600 hover:bg-blue-700">
						アップグレード
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const MultipleActions: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">ファイル処理</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ファイルの処理方法</AlertDialogTitle>
					<AlertDialogDescription>
						同名のファイルが既に存在します。どのように処理しますか？
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex-col gap-2 sm:flex-row">
					<AlertDialogCancel>キャンセル</AlertDialogCancel>
					<AlertDialogAction variant="outline">名前を変更</AlertDialogAction>
					<AlertDialogAction variant="outline">スキップ</AlertDialogAction>
					<AlertDialogAction>上書き</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};
