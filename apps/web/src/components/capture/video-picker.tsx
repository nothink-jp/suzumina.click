"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark } from "lucide-react";
import Link from "next/link";

interface VideoPickerProps {
	/** ?v= で指定されたが videos に無かった動画ID（理由の提示にだけ使う） */
	notFoundVideoId?: string;
}

/**
 * マーキング対象の動画が未選択のときの案内（導線再設計 段3で縮退）。
 * 「選ぶ」は動画一覧（拾える配信タブ）の仕事になったため、この画面は行き先を指すだけ。
 * URL・ID の直接指定も /videos 側（OpenByVideoId）へ移設済み。
 */
export function VideoPicker({ notFoundVideoId }: VideoPickerProps) {
	return (
		<div className="border rounded-lg p-6 space-y-4 text-center">
			<div className="space-y-1">
				<p className="font-medium">マーキングする動画を選ぶ</p>
				<p className="text-sm text-muted-foreground">
					{notFoundVideoId
						? `指定された動画（${notFoundVideoId}）が見つかりません。まだ取り込まれていない可能性があります。`
						: "配信中・配信予定があれば自動で選ばれます。いまはありません。"}
				</p>
			</div>
			<div className="flex flex-wrap justify-center gap-2">
				<Button
					render={
						<Link href="/videos?videoType=live_archive&sort=least_buttons">
							<Bookmark className="h-4 w-4 mr-2" />
							拾える配信から選ぶ
						</Link>
					}
				/>
				<Button variant="outline" render={<Link href="/videos">動画一覧から選ぶ</Link>} />
			</div>
		</div>
	);
}
