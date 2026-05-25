import { HomePage } from "@/components/home/home-page";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "./actions";

// build 時の Firestore アクセスを避けるため force-dynamic を採用 (SPR-60 follow-up)
// CDN 側で s-maxage=300, stale-while-revalidate=600（next.config.mjs）が効くため
// 実質的なキャッシュ挙動は ISR と同等
export const dynamic = "force-dynamic";

// Server Component として実装し、全データを並列取得
export default async function Home() {
	// 🚀 全てのデータを並列で取得（真の並列実行）
	const [audioButtons, videos, works, allAgesWorks] = await Promise.all([
		getLatestAudioButtons(10),
		getLatestVideos(10),
		getLatestWorks(10, false), // 通常版（R18含む）
		getLatestWorks(10, true), // 全年齢版（R18除外）
	]);

	return (
		<HomePage
			initialAudioButtons={audioButtons}
			initialVideos={videos}
			initialWorks={works}
			initialAllAgesWorks={allAgesWorks}
		/>
	);
}
