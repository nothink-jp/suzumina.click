import { Button } from "@suzumina.click/ui/components/ui/button";
import { ArrowLeft, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlaylistTagManagement } from "@/app/actions/video-actions";
import { RefreshButton } from "@/components/actions/RefreshButton";
import { PlaylistTagManagementInterface } from "@/components/management/PlaylistTagManagementInterface";
import { auth } from "@/lib/auth";

export default async function PlaylistTagsPage() {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	const playlistTags = await getPlaylistTagManagement();

	if (!playlistTags) {
		return (
			<div className="p-6">
				<div className="text-center py-8">
					<div className="text-red-600 mb-4">
						<RefreshCw className="h-8 w-8 mx-auto" />
					</div>
					<p className="text-red-600">プレイリストタグデータの取得に失敗しました</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/videos" className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						動画管理に戻る
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
						<Play className="h-8 w-8" />
						プレイリストタグ管理
					</h1>
					<p className="text-muted-foreground mt-1">
						YouTubeプレイリストから自動生成されるタグの表示設定を管理
					</p>
				</div>
				<RefreshButton />
			</div>

			{/* 管理インターフェース */}
			<PlaylistTagManagementInterface tags={playlistTags} />
		</div>
	);
}
