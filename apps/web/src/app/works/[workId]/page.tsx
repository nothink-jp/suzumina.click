import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getWorkById } from "../actions";
import WorkDetail from "./components/work-detail";
import WorkPriceSummary from "./components/work-price-summary";
import WorkRelatedWorks from "./components/work-related-works";
import { buildWorkStructuredData, serializeStructuredData } from "./structured-data";

interface WorkDetailPageProps {
	params: Promise<{
		workId: string;
	}>;
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
	const resolvedParams = await params;
	const { workId } = resolvedParams;

	const work = await getWorkById(workId);

	if (!work) {
		notFound();
	}

	// per-user の評価はここで取得しない（session を読まない純公開 shell）。
	// WorkEvaluation（client island）が認証時に自分の評価を self-fetch する（SPR-226）。
	const structuredData = buildWorkStructuredData(work, `https://suzumina.click/works/${workId}`);

	return (
		<div className="min-h-screen bg-muted">
			{/* 構造化データ。価格・評価をリッチリザルトの対象にして CTR を上げる狙い
				（順位6〜8位に対し CTR 1.5〜3.0% と低いことが降格の引き金だった・SPR-302） */}
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD は script 要素の中身として埋める必要がある。< は serializeStructuredData でエスケープ済み
				dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }}
			/>
			<main className="max-w-7xl mx-auto px-4 py-8">
				<WorkDetail work={work} />
				{/* 価格推移・関連作品は WorkDetail（client・タブ内）ではなくここで**サーバー描画**する。
					タブ内の client fetch では初期 HTML に出ずクローラから見えないため（SPR-302） */}
				<Suspense fallback={null}>
					<WorkPriceSummary workId={work.productId} title={work.title} />
				</Suspense>
				{work.circleId && (
					<Suspense fallback={null}>
						<WorkRelatedWorks
							circleId={work.circleId}
							circleName={work.circle}
							currentWorkId={work.productId}
						/>
					</Suspense>
				)}
			</main>
		</div>
	);
}

// メタデータ生成
export async function generateMetadata({ params }: WorkDetailPageProps) {
	const resolvedParams = await params;
	const { workId } = resolvedParams;

	const work = await getWorkById(workId);

	// title は layout の title.template がサフィックスを付与するため手書きしない（二重化防止）
	if (!work) {
		return {
			title: "作品が見つかりません",
			robots: { index: false, follow: false },
		};
	}

	return {
		title: work.title,
		description:
			work.description || `涼花みなせさんが出演する音声作品「${work.title}」の詳細ページです。`,
		alternates: {
			canonical: `/works/${workId}`,
		},
	};
}
