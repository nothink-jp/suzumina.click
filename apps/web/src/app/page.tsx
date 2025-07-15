import { HomePage } from "@/components/layout/home-page";
import { getLatestAudioButtons } from "./actions";

// Static generation with ISR for better performance
// Start with 1 minute cache, gradually increase after testing
export const revalidate = 60;

// Server Component として実装し、LCPを改善
export default async function Home() {
	// 🚀 Critical Path: Above the fold用のデータのみ先読み
	// 音声ボタンが最も重要なコンテンツなので優先読み込み
	const latestAudioButtons = await getLatestAudioButtons(10);

	return <HomePage initialAudioButtons={latestAudioButtons} />;
}
