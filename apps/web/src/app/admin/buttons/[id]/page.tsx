import {
	convertToFrontendAudioButton,
	type FrontendAudioButtonData,
	getCategoryDisplayName,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Separator } from "@suzumina.click/ui/components/ui/separator";
import {
	ArrowLeft,
	Clock,
	Download,
	Edit,
	ExternalLink,
	FileAudio,
	Music,
	Play,
	Trash2,
	User,
	Youtube,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirestore } from "@/lib/firestore";

type ButtonDetailPageProps = {
	params: {
		id: string;
	};
};

async function getButton(id: string): Promise<FrontendAudioButtonData | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(id).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data();
		return convertToFrontendAudioButton({
			...data,
			id: doc.id,
		});
	} catch {
		return null;
	}
}

export default async function ButtonDetailPage({ params }: ButtonDetailPageProps) {
	const button = await getButton(params.id);

	if (!button) {
		notFound();
	}

	return (
		<div className="p-6 max-w-4xl mx-auto space-y-6">
			{/* ナビゲーション */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/admin/buttons" className="flex items-center gap-2">
						<ArrowLeft className="h-4 w-4" />
						音声ボタン一覧に戻る
					</Link>
				</Button>
			</div>

			{/* ヘッダー */}
			<div className="space-y-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold text-foreground mb-2">音声ボタン詳細</h1>
						<div className="flex items-center gap-2">
							<Badge
								variant={
									button.category === "special"
										? "default"
										: button.category === "normal"
											? "secondary"
											: "outline"
								}
							>
								{getCategoryDisplayName(button.category)}
							</Badge>
							<Badge variant="outline" className="flex items-center gap-1">
								{button.audioFileUrl ? (
									<>
										<FileAudio className="h-3 w-3" />
										音声ファイル
									</>
								) : (
									<>
										<Youtube className="h-3 w-3" />
										YouTube
									</>
								)}
							</Badge>
						</div>
					</div>

					{/* アクションボタン */}
					<div className="flex gap-2">
						<Button variant="default" className="flex items-center gap-2">
							<Play className="h-4 w-4" />
							再生
						</Button>
						<Button variant="outline" className="flex items-center gap-2">
							<Edit className="h-4 w-4" />
							編集
						</Button>
						<Button variant="destructive" className="flex items-center gap-2">
							<Trash2 className="h-4 w-4" />
							削除
						</Button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* メインコンテンツ */}
				<div className="lg:col-span-2 space-y-6">
					{/* タイトル・説明 */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Music className="h-5 w-5" />
								ボタン情報
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="font-semibold text-lg mb-2">{button.title}</h3>
								<Separator />
							</div>
							{button.description && (
								<div className="prose prose-sm max-w-none">
									<div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
										{button.description}
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* 音声設定 */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								{button.audioFileUrl ? (
									<FileAudio className="h-5 w-5" />
								) : (
									<Youtube className="h-5 w-5" />
								)}
								音声設定
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{button.audioFileUrl ? (
								<div className="space-y-3">
									<div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
										<FileAudio className="h-5 w-5 text-green-600" />
										<div>
											<div className="font-medium text-green-800">音声ファイル</div>
											<div className="text-sm text-green-600">直接再生・高品質</div>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="font-medium">ファイル形式:</span>
											<span className="ml-2">音声ファイル (.mp3/.wav)</span>
										</div>
										{button.duration && (
											<div>
												<span className="font-medium">再生時間:</span>
												<span className="ml-2">{button.duration}秒</span>
											</div>
										)}
									</div>
								</div>
							) : (
								button.youtubeVideoId && (
									<div className="space-y-3">
										<div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
											<Youtube className="h-5 w-5 text-blue-600" />
											<div>
												<div className="font-medium text-blue-800">YouTube参照</div>
												<div className="text-sm text-blue-600">動画の指定区間を再生</div>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<span className="font-medium">開始時間:</span>
												<span className="ml-2">{button.startTime}秒</span>
											</div>
											<div>
												<span className="font-medium">終了時間:</span>
												<span className="ml-2">{button.endTime}秒</span>
											</div>
										</div>
										{button.videoTitle && (
											<div className="text-sm">
												<span className="font-medium">動画タイトル:</span>
												<div className="mt-1 p-2 bg-muted rounded">{button.videoTitle}</div>
											</div>
										)}
									</div>
								)
							)}
						</CardContent>
					</Card>

					{/* 利用履歴 */}
					<Card>
						<CardHeader>
							<CardTitle>利用統計</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-suzuka-500 rounded-full" />
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">ボタン作成</span>
											<span className="text-xs text-muted-foreground">
												{new Date(button.createdAt).toLocaleString("ja-JP")}
											</span>
										</div>
										<p className="text-xs text-muted-foreground">ユーザーによって作成されました</p>
									</div>
								</div>

								{/* ここに将来的に再生履歴や統計を追加 */}
								<div className="text-center text-sm text-muted-foreground py-4">
									まだ利用履歴はありません
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* サイドバー */}
				<div className="space-y-6">
					{/* 基本情報 */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">基本情報</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<div>
									<div className="font-medium">作成日時</div>
									<div className="text-muted-foreground">
										{new Date(button.createdAt).toLocaleString("ja-JP")}
									</div>
								</div>
							</div>

							{button.userName && (
								<div className="flex items-center gap-2 text-sm">
									<User className="h-4 w-4 text-muted-foreground" />
									<div>
										<div className="font-medium">作成者</div>
										<div className="text-muted-foreground">{button.userName}</div>
									</div>
								</div>
							)}

							<div className="flex items-center gap-2 text-sm">
								<Music className="h-4 w-4 text-muted-foreground" />
								<div>
									<div className="font-medium">ボタンID</div>
									<div className="text-muted-foreground font-mono text-xs break-all">
										{button.id}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* アクション */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">管理アクション</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Button variant="outline" className="w-full" asChild>
								<Link
									href={`/buttons/${button.id}`}
									className="flex items-center gap-2"
									target="_blank"
								>
									<ExternalLink className="h-4 w-4" />
									ユーザー画面で表示
								</Link>
							</Button>

							{button.audioFileUrl && (
								<Button variant="outline" className="w-full">
									<Download className="h-4 w-4 mr-2" />
									音声ファイルをダウンロード
								</Button>
							)}

							<Button variant="outline" className="w-full">
								<Edit className="h-4 w-4 mr-2" />
								編集
							</Button>

							<Button variant="destructive" className="w-full">
								削除
							</Button>
						</CardContent>
					</Card>

					{/* カテゴリ別の管理ガイド */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">管理ガイド</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-xs space-y-2">
								{button.category === "special" && (
									<div className="space-y-1">
										<div className="font-medium text-suzuka-600">特別ボタン</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• 高品質・特別な音声</li>
											<li>• 削除時は慎重に判断</li>
											<li>• ユーザー体験への影響大</li>
										</ul>
									</div>
								)}
								{button.category === "normal" && (
									<div className="space-y-1">
										<div className="font-medium text-blue-600">通常ボタン</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• 一般的な音声ボタン</li>
											<li>• 品質確認を定期実施</li>
											<li>• 重複チェック推奨</li>
										</ul>
									</div>
								)}
								{button.audioFileUrl ? (
									<div className="space-y-1">
										<div className="font-medium text-green-600">音声ファイル</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• 高品質な音声</li>
											<li>• ストレージ使用量に注意</li>
											<li>• バックアップ推奨</li>
										</ul>
									</div>
								) : (
									<div className="space-y-1">
										<div className="font-medium text-blue-600">YouTube参照</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• 元動画の可用性に依存</li>
											<li>• 定期的な動作確認</li>
											<li>• 時間指定の精度確認</li>
										</ul>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
