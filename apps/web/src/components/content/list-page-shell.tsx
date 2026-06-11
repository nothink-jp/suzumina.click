"use client";

import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { type ReactNode, Suspense } from "react";

interface ListPageShellProps {
	title: string;
	description: string;
	children: ReactNode;
}

/**
 * 一覧ページ（サークル / クリエイター等）共通の組み立て。
 *
 * circles-page-client / creators-page-client が同型の
 * ListPageLayout + ListPageHeader + ListPageContent + Suspense フォールバックを
 * 重複実装していたため共通化（SPR-191）。差分はタイトル・説明・中身（リスト）だけ。
 */
export function ListPageShell({ title, description, children }: ListPageShellProps) {
	return (
		<ListPageLayout>
			<ListPageHeader title={title} description={description} />
			<ListPageContent>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					{children}
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}
