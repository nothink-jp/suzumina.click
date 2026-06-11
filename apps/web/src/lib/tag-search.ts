/**
 * 3層タグ → 動画一覧ページの href ビルダー（純関数）。
 * 層に応じたフィルターパラメータを付与し、VideoTagDisplay の tagHref に渡す。
 * VideoCard・動画タグ表示のタグ遷移先を一元化する（正本）。
 * 遷移先は /videos で、getVideosList の filterVideos が各層タグで絞り込む。
 */
export function buildTagSearchHref(tag: string, layer: "playlist" | "user" | "category") {
	const params = new URLSearchParams();
	switch (layer) {
		case "playlist":
			params.set("playlistTags", tag);
			break;
		case "user":
			params.set("userTags", tag);
			break;
		case "category":
			params.set("categoryNames", tag);
			break;
	}
	return `/videos?${params.toString()}`;
}
