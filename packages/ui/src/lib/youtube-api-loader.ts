/**
 * YouTube IFrame API ローダー（一元化）。
 *
 * YouTubePlayer と YouTubePlayerPool が個別にスクリプト読み込みと
 * `window.onYouTubeIframeAPIReady` を実装し、上書き / unmount 時の script 除去で
 * 競合していた（cold load で API 読込中に unmount すると後続初期化が「読み込み中…」で
 * 止まる回帰）。本モジュールに統一する（SPR-188）。
 *
 * 設計:
 * - 既に `window.YT.Player` があれば即 `onReady`。
 * - 読み込み中は `window.onYouTubeIframeAPIReady` を**チェーン**する（既存を潰さない）。
 * - script タグは**除去しない**（unmount 競合の回避）。
 */
export function loadYouTubeIframeAPI(onReady: () => void): void {
	if (typeof window === "undefined") {
		return;
	}

	// 既に API 準備済み
	if (window.YT?.Player) {
		onReady();
		return;
	}

	// 既存の callback をチェーン（上書きしない）
	const previous = window.onYouTubeIframeAPIReady;
	window.onYouTubeIframeAPIReady = () => {
		previous?.();
		onReady();
	};

	// スクリプトは未挿入のときだけ挿入し、以後は除去しない
	if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
		const tag = document.createElement("script");
		tag.src = "https://www.youtube.com/iframe_api";
		tag.async = true;
		const firstScriptTag = document.getElementsByTagName("script")[0];
		if (firstScriptTag?.parentNode) {
			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
		} else {
			document.body.appendChild(tag);
		}
	}
}
