/**
 * YouTube IFrame API のグローバル管理
 * 複数のプレイヤーが同時に存在する場合の競合状態を避ける
 */

export class YouTubeAPIManager {
	private static instance: YouTubeAPIManager | null = null;
	private isAPILoaded = false;
	private isAPILoading = false;
	private callbacks: (() => void)[] = [];

	private constructor() {}

	public static getInstance(): YouTubeAPIManager {
		if (!YouTubeAPIManager.instance) {
			YouTubeAPIManager.instance = new YouTubeAPIManager();
		}
		return YouTubeAPIManager.instance;
	}

	/**
	 * YouTube IFrame API の初期化状態をチェック
	 */
	public isReady(): boolean {
		return this.isAPILoaded && !!window.YT?.Player;
	}

	/**
	 * API読み込み完了時にコールバックを実行
	 */
	public onReady(callback: () => void): void {
		if (this.isReady()) {
			callback();
			return;
		}

		this.callbacks.push(callback);

		// まだ読み込み中でない場合のみ開始
		if (!this.isAPILoading) {
			this.loadAPI();
		}
	}

	/**
	 * YouTube IFrame API を読み込む
	 */
	private loadAPI(): void {
		this.isAPILoading = true;

		// すでにAPIが読み込まれている場合
		if (window.YT?.Player) {
			this.handleAPIReady();
			return;
		}

		// 既存のコールバックを保存
		const existingCallback = window.onYouTubeIframeAPIReady;

		// グローバルコールバックを設定
		window.onYouTubeIframeAPIReady = () => {
			// 既存のコールバックがあれば実行
			if (existingCallback && typeof existingCallback === "function") {
				try {
					existingCallback();
				} catch (error) {
					if (process.env.NODE_ENV === "development") {
						console.warn("Existing YouTube API callback failed:", error);
					}
				}
			}

			this.handleAPIReady();
		};

		// APIスクリプトが既に存在するかチェック
		const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
		if (!existingScript) {
			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			script.async = true;
			script.onerror = () => {
				if (process.env.NODE_ENV === "development") {
					console.error("Failed to load YouTube IFrame API");
				}
				this.isAPILoading = false;
			};
			document.body.appendChild(script);
		}
	}

	/**
	 * API読み込み完了時の処理
	 */
	private handleAPIReady(): void {
		this.isAPILoaded = true;
		this.isAPILoading = false;

		// 待機中のすべてのコールバックを実行
		this.callbacks.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("YouTube API ready callback failed:", error);
				}
			}
		});

		// コールバック配列をクリア
		this.callbacks = [];
	}

	/**
	 * プレイヤーIDの重複を避けるためのユニークIDを生成
	 */
	public generateUniquePlayerId(): string {
		return `yt-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * postMessage エラーかどうかを判定
	 */
	private isPostMessageError(message: string): boolean {
		return (
			message.includes("postMessage") ||
			message.includes("www-widgetapi") ||
			message.includes("The target origin provided") ||
			message.includes("does not match the recipient window's origin")
		);
	}

	/**
	 * Service Worker関連エラーかどうかを判定
	 */
	private isServiceWorkerError(message: string): boolean {
		return message.includes("navigation preload request was cancelled");
	}

	/**
	 * YouTube関連のPromise rejectionかどうかを判定
	 */
	private isYouTubeRejection(reason: unknown): boolean {
		if (!reason || typeof reason !== "object") return false;
		const errorReason = reason as { message?: string };
		if (typeof errorReason.message !== "string") return false;

		return (
			errorReason.message.includes("postMessage") ||
			errorReason.message.includes("youtube.com") ||
			errorReason.message.includes("The target origin provided") ||
			errorReason.message.includes("navigation preload")
		);
	}

	/**
	 * postMessage エラーのログ出力
	 */
	private logPostMessageError(message: string, source?: string): void {
		if (process.env.NODE_ENV === "development") {
			console.debug("[YouTube API Manager] Suppressed postMessage error:", {
				message: message.substring(0, 200),
				source: typeof source === "string" ? source.substring(0, 100) : source,
			});
		}
	}

	/**
	 * Service Worker エラーのログ出力
	 */
	private logServiceWorkerError(message: string): void {
		if (process.env.NODE_ENV === "development") {
			console.debug("[YouTube API Manager] Suppressed Service Worker preload error:", message);
		}
	}

	/**
	 * エラーメッセージの処理
	 */
	private processErrorMessage(message: string, source?: string): boolean {
		if (this.isPostMessageError(message)) {
			this.logPostMessageError(message, source);
			return true;
		}

		if (this.isServiceWorkerError(message)) {
			this.logServiceWorkerError(message);
			return true;
		}

		return false;
	}

	/**
	 * window.onerror ハンドラーをセットアップ
	 */
	private setupWindowErrorHandler(): void {
		const originalError = window.onerror;
		window.onerror = (message, source, lineno, colno, error) => {
			if (typeof message === "string" && this.processErrorMessage(message, source)) {
				return true;
			}

			// その他のエラーは元のハンドラに渡す
			if (originalError) {
				return originalError(message, source, lineno, colno, error);
			}
			return false;
		};
	}

	/**
	 * window.onunhandledrejection ハンドラーをセットアップ
	 */
	private setupUnhandledRejectionHandler(): void {
		const originalUnhandledRejection = window.onunhandledrejection;
		window.onunhandledrejection = (event) => {
			if (this.isYouTubeRejection(event.reason)) {
				if (process.env.NODE_ENV === "development") {
					const reason = event.reason as { message: string; stack?: string };
					console.debug("[YouTube API Manager] Suppressed unhandledrejection:", {
						message: reason.message.substring(0, 200),
						stack: reason.stack?.substring(0, 300),
					});
				}
				event.preventDefault();
				return;
			}

			// その他のエラーは元のハンドラに渡す
			if (originalUnhandledRejection) {
				originalUnhandledRejection(event);
			}
		};
	}

	/**
	 * postMessage エラーを抑制するためのエラーハンドラ
	 */
	public setupErrorSuppression(): void {
		if (typeof window === "undefined") return;

		// すでにセットアップ済みの場合はスキップ
		const extendedWindow = window as Window & { __youtube_error_suppression_setup?: boolean };
		if (extendedWindow.__youtube_error_suppression_setup) return;
		extendedWindow.__youtube_error_suppression_setup = true;

		this.setupWindowErrorHandler();
		this.setupUnhandledRejectionHandler();

		if (process.env.NODE_ENV === "development") {
			console.debug("[YouTube API Manager] Error suppression setup completed");
		}
	}
}

// グローバルインスタンス
export const youTubeAPIManager = YouTubeAPIManager.getInstance();
