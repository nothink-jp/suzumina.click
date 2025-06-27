import {
	convertToFrontendAudioButton,
	type FrontendAudioButtonData,
} from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Separator } from "@suzumina.click/ui/components/ui/separator";
import { ArrowLeft, Music } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirestore } from "@/lib/firestore";
import { ButtonAudioSettings } from "./components/ButtonAudioSettings";
import { ButtonDetailHeader } from "./components/ButtonDetailHeader";
import { ButtonSidebar } from "./components/ButtonSidebar";

type ButtonDetailPageProps = {
	params: Promise<{
		id: string;
	}>;
};

async function getButton(id: string): Promise<FrontendAudioButtonData | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(id).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data();
		if (!data) {
			return null;
		}
		return convertToFrontendAudioButton({
			...data,
			id: doc.id,
			// biome-ignore lint/suspicious/noExplicitAny: Firestore document data needs type assertion for convertToFrontendAudioButton
		} as any);
	} catch {
		return null;
	}
}

export default async function ButtonDetailPage({ params }: ButtonDetailPageProps) {
	const { id } = await params;
	const button = await getButton(id);

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
			<ButtonDetailHeader button={button} />

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
					<ButtonAudioSettings button={button} />

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
				<ButtonSidebar button={button} />
			</div>
		</div>
	);
}
