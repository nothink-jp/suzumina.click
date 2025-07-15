import { HomePage } from "@/components/layout/home-page";
import { getLatestAudioButtons, getLatestVideos, getLatestWorks } from "./actions";

// Static generation with ISR for better performance
// Start with 1 minute cache, gradually increase after testing
export const revalidate = 60;

// Server Component として実装し、LCPを改善
export default async function Home() {
	// 新着作品、動画、音声ボタンを並行取得
	// 全年齢版と通常版の両方を取得
	const [latestWorks, allAgesWorks, latestVideos, latestAudioButtons] = await Promise.all([
		getLatestWorks(10, false), // 通常版（R18含む）
		getLatestWorks(10, true), // 全年齢版（R18除外）
		getLatestVideos(10),
		getLatestAudioButtons(10),
	]);

	return (
		<HomePage
			initialWorks={latestWorks}
			allAgesWorks={allAgesWorks}
			initialVideos={latestVideos}
			initialAudioButtons={latestAudioButtons}
		/>
	);
}
