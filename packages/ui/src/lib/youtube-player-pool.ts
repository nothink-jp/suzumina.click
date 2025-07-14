/**
 * YouTube Player プール管理システム
 *
 * 設計目標:
 * - メモリ使用量: 200-400MB → 25-50MB (90%削減)
 * - DOM要素: 50個 → 5個 (90%削減)
 * - endTime監視: 50個のタイマー → 1個のタイマー (98%削減)
 */

// 既存のyoutube-typesを再利用
import type { YTPlayer, YTPlayerConfig } from "../components/custom/youtube-types";

interface PlayerData {
	player: YTPlayer;
	lastUsed: number;
	element: HTMLDivElement;
	isPlaying: boolean;
	currentVideoId: string;
}

interface SegmentPlayback {
	videoId: string;
	endTime: number;
	intervalId: NodeJS.Timeout;
	callbacks: {
		onPlay?: () => void;
		onPause?: () => void;
		onEnd?: () => void;
	};
}

export interface PlaySegmentCallbacks {
	onPlay?: () => void;
	onPause?: () => void;
	onEnd?: () => void;
}

/**
 * YouTube Player プール管理クラス（シングルトン）
 */
export class YouTubePlayerPool {
	private static instance: YouTubePlayerPool | null = null;
	private players = new Map<string, PlayerData>();
	private activeSegment: SegmentPlayback | null = null;
	private readonly maxPoolSize = 5;
	private readonly monitoringInterval = 250; // 250ms間隔で監視
	private isAPIReady = false;
	private readyCallbacks: (() => void)[] = [];

	private constructor() {
		this.initializeYouTubeAPI();
	}

	static getInstance(): YouTubePlayerPool {
		if (!YouTubePlayerPool.instance) {
			YouTubePlayerPool.instance = new YouTubePlayerPool();
		}
		return YouTubePlayerPool.instance;
	}

	/**
	 * YouTube IFrame APIの初期化
	 */
	private initializeYouTubeAPI(): void {
		if (typeof window === "undefined") return;

		// 既にAPIが読み込まれている場合
		if (window.YT?.Player) {
			this.isAPIReady = true;
			this.executeReadyCallbacks();
			return;
		}

		// APIの読み込み
		if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
			const tag = document.createElement("script");
			tag.src = "https://www.youtube.com/iframe_api";
			const firstScriptTag = document.getElementsByTagName("script")[0];
			if (firstScriptTag?.parentNode) {
				firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
			}
		}

		// グローバルコールバックの設定
		window.onYouTubeIframeAPIReady = () => {
			this.isAPIReady = true;
			this.executeReadyCallbacks();
		};
	}

	/**
	 * API準備完了時の処理
	 */
	private executeReadyCallbacks(): void {
		for (const callback of this.readyCallbacks) {
			try {
				callback();
			} catch (error) {
				console.error("YouTube API ready callback error:", error);
			}
		}
		this.readyCallbacks = [];
	}

	/**
	 * YouTube API準備完了を待つ
	 */
	public onReady(callback: () => void): void {
		if (this.isAPIReady) {
			callback();
		} else {
			this.readyCallbacks.push(callback);
		}
	}

	/**
	 * プレイヤーを取得または作成
	 */
	async getOrCreatePlayer(videoId: string): Promise<YTPlayer> {
		return new Promise((resolve, reject) => {
			this.onReady(async () => {
				try {
					if (!this.players.has(videoId)) {
						if (this.players.size >= this.maxPoolSize) {
							this.removeLeastUsedPlayer();
						}
						const playerData = await this.createPlayer(videoId);
						this.players.set(videoId, playerData);
					}

					const playerData = this.players.get(videoId);
					if (playerData) {
						playerData.lastUsed = Date.now();
						resolve(playerData.player);
					} else {
						reject(new Error(`Player for video ${videoId} not found`));
					}
				} catch (error) {
					reject(error);
				}
			});
		});
	}

	/**
	 * 音声セグメントを再生
	 */
	async playSegment(
		videoId: string,
		startTime: number,
		endTime: number,
		callbacks: PlaySegmentCallbacks = {},
	): Promise<void> {
		try {
			// 既存の再生を停止
			this.stopCurrentSegment();

			// プレイヤーを取得
			const player = await this.getOrCreatePlayer(videoId);

			// 再生開始
			player.seekTo(startTime, true);
			player.playVideo();

			// endTime監視を開始
			this.startEndTimeMonitoring(player, videoId, endTime, callbacks);

			// プレイヤーの状態を更新
			const playerData = this.players.get(videoId);
			if (playerData) {
				playerData.isPlaying = true;
			}

			callbacks.onPlay?.();
		} catch (error) {
			console.error("Failed to play segment:", error);
			callbacks.onEnd?.();
		}
	}

	/**
	 * 現在の再生を停止
	 */
	public stopCurrentSegment(): void {
		if (this.activeSegment) {
			clearInterval(this.activeSegment.intervalId);

			// プレイヤーを停止
			const playerData = this.players.get(this.activeSegment.videoId);
			if (playerData) {
				playerData.player.pauseVideo();
				playerData.isPlaying = false;
			}

			this.activeSegment.callbacks.onEnd?.();
			this.activeSegment = null;
		}
	}

	/**
	 * プレイヤーの作成
	 */
	private async createPlayer(videoId: string): Promise<PlayerData> {
		return new Promise((resolve, reject) => {
			try {
				// 完全に隠された要素を作成
				const element = document.createElement("div");
				element.id = `youtube-player-pool-${videoId}-${Date.now()}`;
				element.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
          overflow: hidden;
        `;
				document.body.appendChild(element);

				// 最小設定でプレイヤーを作成
				const player = new window.YT.Player(element.id, {
					height: 1,
					width: 1,
					videoId,
					playerVars: {
						autoplay: 0,
						controls: 0,
						disablekb: 1,
						enablejsapi: 1,
						fs: 0,
						modestbranding: 1,
						rel: 0,
						origin: window.location.origin,
					},
					events: {
						onReady: () => {
							const playerData: PlayerData = {
								player,
								lastUsed: Date.now(),
								element,
								isPlaying: false,
								currentVideoId: videoId,
							};
							resolve(playerData);
						},
						onError: (event) => {
							console.error("YouTube Player error:", event);
							element.remove();
							reject(new Error(`YouTube Player error: ${event.data}`));
						},
					},
				} as YTPlayerConfig);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * endTime監視の開始
	 */
	private startEndTimeMonitoring(
		player: YTPlayer,
		videoId: string,
		endTime: number,
		callbacks: PlaySegmentCallbacks,
	): void {
		this.activeSegment = {
			videoId,
			endTime,
			intervalId: setInterval(() => {
				try {
					const currentTime = player.getCurrentTime();

					if (currentTime >= endTime) {
						this.stopCurrentSegment();
					}
				} catch (error) {
					console.error("Error monitoring playback time:", error);
					this.stopCurrentSegment();
				}
			}, this.monitoringInterval),
			callbacks,
		};
	}

	/**
	 * 最も使用頻度の低いプレイヤーを削除
	 */
	private removeLeastUsedPlayer(): void {
		let oldestKey = "";
		let oldestTime = Number.POSITIVE_INFINITY;

		for (const [videoId, data] of this.players) {
			// 再生中のプレイヤーは削除対象外
			if (data.isPlaying) continue;

			if (data.lastUsed < oldestTime) {
				oldestTime = data.lastUsed;
				oldestKey = videoId;
			}
		}

		if (oldestKey) {
			this.destroyPlayer(oldestKey);
		}
	}

	/**
	 * プレイヤーを破棄
	 */
	private destroyPlayer(videoId: string): void {
		const playerData = this.players.get(videoId);
		if (playerData) {
			try {
				playerData.player.destroy();
				playerData.element.remove();
			} catch (error) {
				console.error("Error destroying player:", error);
			}
			this.players.delete(videoId);
		}
	}

	/**
	 * 全てのプレイヤーを破棄
	 */
	public destroyAll(): void {
		this.stopCurrentSegment();

		for (const videoId of this.players.keys()) {
			this.destroyPlayer(videoId);
		}

		this.players.clear();
	}

	/**
	 * プールの統計情報を取得
	 */
	public getStats() {
		const totalPlayers = this.players.size;
		const playingPlayers = Array.from(this.players.values()).filter((p) => p.isPlaying).length;
		const hasActiveSegment = this.activeSegment !== null;

		return {
			totalPlayers,
			playingPlayers,
			hasActiveSegment,
			maxPoolSize: this.maxPoolSize,
			isAPIReady: this.isAPIReady,
			activeSegmentVideoId: this.activeSegment?.videoId || null,
		};
	}

	/**
	 * クリーンアップ（使用頻度の低いプレイヤーを削除）
	 */
	public cleanup(maxAge = 300000): void {
		// 5分間未使用で削除
		const now = Date.now();
		const toRemove: string[] = [];

		for (const [videoId, data] of this.players) {
			if (!data.isPlaying && now - data.lastUsed > maxAge) {
				toRemove.push(videoId);
			}
		}

		for (const videoId of toRemove) {
			this.destroyPlayer(videoId);
		}
	}
}

/**
 * グローバルインスタンスへのアクセス
 */
export const youTubePlayerPool = YouTubePlayerPool.getInstance();
