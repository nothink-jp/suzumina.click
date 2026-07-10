"use client";

import { Dialog, DialogContent, DialogTitle } from "@suzumina.click/ui/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface AudioButtonDetailModalProps {
	audioButtonId: string;
	children: ReactNode;
}

/**
 * 一覧文脈の上に重ねる詳細モーダルの殻（SPR-252）。
 * - 閉じる操作は router.back() = 履歴を戻す（一覧のフィルタ・ページネーション・スクロールは App Router が復元）
 * - モバイルは全画面シート、sm 以上は中央のラージダイアログ
 * - 「ページで開く」は同一 URL への soft nav ではモーダルが解除されないため、素の <a>（フルロード）で
 *   フル詳細ページ（関連ボタン・サイドバー付き）へ遷移させる
 */
export function AudioButtonDetailModal({ audioButtonId, children }: AudioButtonDetailModalProps) {
	const router = useRouter();
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) router.back();
			}}
		>
			<DialogContent className="top-0 left-0 h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none p-0 sm:top-[50%] sm:left-[50%] sm:h-auto sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg">
				<DialogTitle className="sr-only">音声ボタン詳細</DialogTitle>
				<div className="flex items-center border-b border-border px-4 py-2.5 pr-12">
					<a
						href={`/buttons/${audioButtonId}`}
						className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<ExternalLink className="h-4 w-4" />
						ページで開く
					</a>
				</div>
				{children}
			</DialogContent>
		</Dialog>
	);
}
