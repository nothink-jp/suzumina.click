import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { recalculateAllVideosAudioButtonCount } from "@/app/buttons/actions";
import { auth } from "@/auth";

export default async function RecalculatePage() {
	const session = await auth();

	// 管理者権限チェック（特定のDiscord IDのみアクセス可能）
	const adminIds = process.env.ADMIN_DISCORD_IDS?.split(",") || [];
	if (!session?.user?.discordId || !adminIds.includes(session.user.discordId)) {
		redirect("/");
	}

	async function handleRecalculate() {
		"use server";
		const result = await recalculateAllVideosAudioButtonCount();
		return result;
	}

	return (
		<div className="container mx-auto px-4 py-8 max-w-2xl">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5" />
						音声ボタン数再計算
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground">
						全動画の音声ボタン数を再計算します。この処理には時間がかかる場合があります。
					</p>
					<form action={handleRecalculate}>
						<Button type="submit" className="w-full">
							<RefreshCw className="h-4 w-4 mr-2" />
							再計算を実行
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
