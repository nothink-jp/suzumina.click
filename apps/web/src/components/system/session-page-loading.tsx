import { Skeleton } from "@suzumina.click/ui/components/ui/skeleton";

/**
 * page 直下で uncached / runtime data を await するページの `loading.tsx` 共通フォールバック。
 * 各セグメントの `loading.tsx` から default re-export して使う。
 * 代表例はセッション（`getCurrentUser()` / `ProtectedRoute`）だが、`searchParams`・`cookies()`・
 * `headers()`・キャッシュしない Firestore read なども同じ条件に当たる（例: `/buttons/create` は `searchParams`）。
 *
 * なぜ各セグメントに `loading.tsx` が要るか（Cache Components の規約）:
 * これらは `<Suspense>` の内側に置く必要がある。ルートレイアウトの `<Suspense>` は**直接アクセス**しか
 * 覆わず、クライアント遷移では共有レイアウトより上にあるため効かない（dev の instant navigation 検証が
 * "encountered uncached data" / "encountered runtime data" を出す）。
 * `loading.tsx` は自セグメント内に境界を作るので、どこから遷移してきても覆える。
 * セッションを読まないページでも、page 直下でこれらを await するなら同じく `loading.tsx` を置く
 * （ページ内で自前の `<Suspense>` を切っているなら不要）。
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
