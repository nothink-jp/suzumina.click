// functions/src/common.ts

// --- インターフェース定義 ---

/**
 * Pub/Sub メッセージのデータ構造
 * Cloud Scheduler や Pub/Sub を介して受け取るイベントデータの形式を定義
 */
export interface SimplePubSubData {
	/** Base64 エンコードされたメッセージデータ */
	data?: string;
	/** メッセージID */
	messageId?: string;
	/** 配信時間 */
	publishTime?: string;
	/** メッセージ属性（キーと値のペア） */
	attributes?: { [key: string]: string };
}

// --- 定数 ---
/**
 * 涼花みなせのYouTubeチャンネルID
 * YouTube Data APIでチャンネル情報を取得する際に使用
 */
export const SUZUKA_MINASE_CHANNEL_ID = "UChiMMOhl6FpzjoRqvZ5rcaA";
