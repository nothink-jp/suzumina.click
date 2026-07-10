"use client";

import { Dialog, DialogContent, DialogTitle } from "@suzumina.click/ui/components/ui/dialog";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 詳細モーダルの殻（SPR-251 spike）。
 * 閉じる操作は router.back() = 履歴を一覧に戻す（スクロール位置・フィルタは App Router が復元する）。
 */
export function AudioButtonDetailModal({ children }: { children: ReactNode }) {
	const router = useRouter();
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) router.back();
			}}
		>
			<DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
				<DialogTitle className="sr-only">音声ボタン詳細</DialogTitle>
				{children}
			</DialogContent>
		</Dialog>
	);
}
