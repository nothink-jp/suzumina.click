/**
 * Cloud Functions の実効設定モジュール
 *
 * SPR-189: 旧 ConfigManager（613行・「統合設定管理」を謳うが本番で読まれる値は3つだけ）を
 * 実効値のみへ縮約した。本番で実際に参照される設定は次の3値:
 *   - dlsite.requestDelay  : work-id-collector の DLsite 連続リクエスト間隔
 *   - dlsite.timeoutMs     : dlsite-ajax-fetcher の AbortSignal タイムアウト
 *   - youtube.maxBatchSize : youtube-api の1バッチ最大件数（YouTube API 上限 50）
 *
 * 実効値は旧 ENVIRONMENT_OVERRIDES の production を正とする:
 *   production : requestDelay=500 / timeoutMs=30000 / maxBatchSize=50
 *   それ以外(dev): requestDelay=2000（ローカル収集ツールの DLsite 配慮）/ 他は同値
 *
 * env 分岐は requestDelay のみ残す（dev=2000 はローカル収集の礼儀として意味がある）。
 * DLSITE_REQUEST_DELAY による上書きも旧実装と同じく許容する。
 */

export interface DLsiteConfig {
	/** DLsite への連続リクエスト間隔(ms) */
	requestDelay: number;
	/** リクエストのタイムアウト(ms) */
	timeoutMs: number;
}

export interface YouTubeConfig {
	/** 1バッチの最大件数（YouTube API 上限 50） */
	maxBatchSize: number;
}

const isProduction = process.env.NODE_ENV === "production";

/** DLsite の連続リクエスト間隔。production=500 / dev=2000。DLSITE_REQUEST_DELAY で上書き可。 */
function resolveRequestDelay(): number {
	const raw = process.env.DLSITE_REQUEST_DELAY;
	if (raw) {
		const parsed = Number.parseInt(raw, 10);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}
	return isProduction ? 500 : 2000;
}

/**
 * DLsite 連携の実効設定を取得する。
 */
export function getDLsiteConfig(): DLsiteConfig {
	return {
		requestDelay: resolveRequestDelay(),
		timeoutMs: 30000,
	};
}

/**
 * YouTube 連携の実効設定を取得する。
 */
export function getYouTubeConfig(): YouTubeConfig {
	return {
		maxBatchSize: 50,
	};
}
