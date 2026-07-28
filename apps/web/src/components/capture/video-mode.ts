import type { VideoPlainObject } from "@suzumina.click/shared-types";

/**
 * マーキング画面から見た動画のモード。
 *
 * 判定の正本は `_computed.videoType`（video-card-actions / video-badge と同一）。
 * raw の liveBroadcastContent や `_computed.isLive` は raw を OR するため stale に弱く、
 * アーカイブ済みでも live のまま残ることがあるので使わない。
 *
 * モードは下書きに保存しない。「仕上げてよいか」の実体は *マーク時に配信だったか* ではなく
 * *今アーカイブになっているか* であり、時間で変わる状態を凍結すると配信終了後の遷移を
 * 表現できなくなるため（＝非正規化を増やさない判断でもある）。
 */
export type CaptureVideoMode = "live" | "upcoming" | "archived";

export function resolveCaptureVideoMode(video: VideoPlainObject): CaptureVideoMode {
	const videoType = video._computed.videoType;
	if (videoType === "live" || videoType === "possibly_live") {
		return "live";
	}
	if (videoType === "upcoming") {
		return "upcoming";
	}
	return "archived";
}

/**
 * アーカイブ公開待ち（配信中・配信予定）＝この動画の下書きはまだ音声ボタンに仕上げられない。
 */
export function isAwaitingArchive(video: VideoPlainObject): boolean {
	const mode = resolveCaptureVideoMode(video);
	return mode === "live" || mode === "upcoming";
}
