"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark, ExternalLink, Loader2 } from "lucide-react";

interface CaptureActionBarProps {
	isMarking: boolean;
	justMarked: boolean;
	onMark: () => void;
	/** まとめて仕上げるの行き先（配信中・下書きゼロのときは null＝出さない） */
	bulkHref: string | null;
	bulkCount: number;
}

/**
 * 集中モードの固定アクションバー（導線再設計 段2）。
 * 主アクション「ここをマーク」を画面最下部＝モバイル縦持ちで親指の届く位置に固定する。
 * 「まとめて仕上げる」は同じバー内の副アクション（誤爆させない小ささに留める）。
 */
export function CaptureActionBar({
	isMarking,
	justMarked,
	onMark,
	bulkHref,
	bulkCount,
}: CaptureActionBarProps) {
	return (
		<div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur">
			<div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
				<Button
					onClick={onMark}
					disabled={isMarking}
					size="lg"
					className={`flex-1 min-h-[64px] md:min-h-[56px] text-lg font-bold transition-colors ${
						justMarked ? "bg-green-600 hover:bg-green-600" : ""
					}`}
				>
					{isMarking ? (
						<Loader2 className="h-5 w-5 mr-2 animate-spin" />
					) : (
						<Bookmark className="h-5 w-5 mr-2" />
					)}
					{justMarked ? "マークしました" : "ここをマーク（M）"}
				</Button>
				{bulkHref && (
					<Button
						variant="outline"
						className="whitespace-nowrap"
						render={
							// フルロード遷移（intercepting route 回避・SPR-252）
							<a href={bulkHref}>
								<ExternalLink className="h-4 w-4 mr-1" />
								まとめて仕上げる（{bulkCount}）
							</a>
						}
					/>
				)}
			</div>
		</div>
	);
}
