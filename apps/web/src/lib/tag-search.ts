/**
 * 3層タグ → 検索ページの href ビルダー（純関数）。
 * 層に応じたフィルターパラメータを付与し、ThreeLayerTagDisplay の tagHref に渡す。
 * VideoCard・検索結果のタグ遷移先を一元化する（正本）。
 */
export function buildTagSearchHref(tag: string, layer: "playlist" | "user" | "category") {
	const params = new URLSearchParams();
	params.set("q", tag);
	params.set("type", "videos");
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
	return `/search?${params.toString()}`;
}
