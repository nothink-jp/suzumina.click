import { notFound } from "next/navigation";
import { getWorkById } from "../actions";
import WorkDetail from "./components/work-detail";

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
	return (
		<div className="min-h-screen bg-muted">
			<main className="max-w-7xl mx-auto px-4 py-8">
				<WorkDetail work={work} />
			</main>
		</div>
	);
}

// メタデータ生成
export async function generateMetadata({ params }: WorkDetailPageProps) {
	const resolvedParams = await params;
	const { workId } = resolvedParams;

	const work = await getWorkById(workId);

	if (!work) {
		return {
			title: "作品が見つかりません | すずみなくりっく！",
		};
	}

	return {
		title: `${work.title} | すずみなくりっく！`,
		description:
			work.description || `涼花みなせさんが出演する音声作品「${work.title}」の詳細ページです。`,
		alternates: {
			canonical: `/works/${workId}`,
		},
	};
}
