/**
 * YouTube Player API の型定義
 * YouTubePlayerとAudioOnlyPlayerで共通利用
 */

declare global {
	interface Window {
		YT: {
			Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer;
			PlayerState: {
				UNSTARTED: -1;
				ENDED: 0;
				PLAYING: 1;
				PAUSED: 2;
				BUFFERING: 3;
				CUED: 5;
			};
			ready: (callback: () => void) => void;
		};
		onYouTubeIframeAPIReady: (() => void) | undefined;
		// エラーハンドリング関連
		onerror:
			| ((
					message: string | Event,
					source?: string,
					lineno?: number,
					colno?: number,
					error?: Error,
			  ) => boolean | undefined)
			| null;
		onunhandledrejection: ((event: PromiseRejectionEvent) => void) | null;
	}
}

export interface YTPlayerConfig {
	height?: string | number;
	width?: string | number;
	videoId: string;
	playerVars?: {
		autoplay?: 0 | 1;
		controls?: 0 | 1;
		disablekb?: 0 | 1;
		enablejsapi?: 0 | 1;
		end?: number;
		fs?: 0 | 1;
		hl?: string;
		iv_load_policy?: 1 | 3;
		list?: string;
		listType?: "playlist" | "user_uploads";
		loop?: 0 | 1;
		modestbranding?: 0 | 1;
		origin?: string;
		playlist?: string;
		playsinline?: 0 | 1;
		rel?: 0 | 1;
		start?: number;
		widget_referrer?: string;
	};
	events?: {
		onReady?: (event: { target: YTPlayer }) => void;
		onStateChange?: (event: { target: YTPlayer; data: number }) => void;
		onPlaybackQualityChange?: (event: { target: YTPlayer; data: string }) => void;
		onPlaybackRateChange?: (event: { target: YTPlayer; data: number }) => void;
		onError?: (event: { target: YTPlayer; data: number }) => void;
		onApiChange?: (event: { target: YTPlayer }) => void;
	};
}

export interface YTPlayer {
	playVideo(): void;
	pauseVideo(): void;
	stopVideo(): void;
	seekTo(seconds: number, allowSeekAhead?: boolean): void;
	clearVideo(): void;
	nextVideo(): void;
	previousVideo(): void;
	playVideoAt(index: number): void;
	mute(): void;
	unMute(): void;
	isMuted(): boolean;
	setVolume(volume: number): void;
	getVolume(): number;
	setSize(width: number, height: number): void;
	getPlaybackRate(): number;
	setPlaybackRate(suggestedRate: number): void;
	getAvailablePlaybackRates(): number[];
	setLoop(loopPlaylists: boolean): void;
	setShuffle(shufflePlaylist: boolean): void;
	getVideoLoadedFraction(): number;
	getPlayerState(): number;
	getCurrentTime(): number;
	getVideoStartBytes(): number;
	getVideoBytesLoaded(): number;
	getVideoBytesTotal(): number;
	getDuration(): number;
	getVideoUrl(): string;
	getVideoEmbedCode(): string;
	getPlaylist(): string[];
	getPlaylistIndex(): number;
	destroy(): void;
	addEventListener(event: string, listener: (event: Event) => void): void;
	removeEventListener(event: string, listener: (event: Event) => void): void;
	getIframe(): HTMLIFrameElement;
	loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
	cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
}
