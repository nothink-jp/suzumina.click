import { HomePage } from "@/components/home/home-page";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "./actions";

// Static generation with ISR for better performance
// 5 minute cache to reduce Firestore queries and improve LCP
export const revalidate = 300;

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
