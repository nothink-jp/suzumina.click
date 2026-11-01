import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

/**
 * セッションを読むページ（`getCurrentUser()` / `ProtectedRoute` を page 直下で await するもの）の
 * `loading.tsx` 共通フォールバック。各セグメントの `loading.tsx` から default re-export して使う。
 *
 * なぜ各セグメントに `loading.tsx` が要るか（Cache Components の規約）:
 * セッション取得は request ごとの Firestore read（uncached）なので `<Suspense>` の内側に置く必要がある。
 * ルートレイアウトの `<Suspense>` は**直接アクセス**しか覆わず、クライアント遷移では共有レイアウトより
 * 上にあるため効かない（dev の instant navigation 検証が "encountered uncached data" を出す）。
 * `loading.tsx` は自セグメント内に境界を作るので、どこから遷移してきても覆える。
 * セッションを読むページを新設したら同じく `loading.tsx` を置く。
 */
export default function SessionPageLoading() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl" role="status" aria-busy="true">
			<span className="sr-only">読み込み中</span>
			<Skeleton className="h-9 w-48 mb-8" />
			<div className="space-y-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		</div>
	);
}
