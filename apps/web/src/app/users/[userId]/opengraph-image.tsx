import { MediaOgCard } from "@/lib/og-media-card";
import { loadRemoteImageDataUri } from "@/lib/og-remote-image";
import { buildOgImageResponse, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/lib/og-response";
import { asciiOrEmpty, formatDisplayTitle } from "@/lib/og-text";
import { getUserByDiscordId } from "@/lib/user-firestore";

/**
 * ユーザープロフィールの動的 OG 画像（SPR-268 完了後の残タスク対応）。
 * 従来は generateMetadata がアバターURLを直接 og:image に指定しており、アバター未設定ユーザーは
 * og:image 自体が欠落していた。他詳細ルートと同じ file-convention（MediaOgCard）に統一し、
 * アバター無しでも名前入りのブランドカードを返す。
 * 非公開プロフィール（isPublicProfile=false）はページ同様に個人情報を出さず、サイト名版に落とす。
 * どの失敗経路でも 500 は返さない（未取得/非公開→サイト名版 / アバター取得失敗→画像無し版 / フォント取得失敗→ASCII 縮退版）。
 */

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "ユーザープロフィール - すずみなくりっく！";

const AVATAR_SIZE = 280;
// カード幅1200 - 左右padding128 - アバター280 - gap56 = 736px（名前列の折り返し幅）
const TITLE_MAX_WIDTH = 730;
const TITLE_FONT_SIZE = 48;

// next.config.mjs の images.remotePatterns と同じ許可ホスト（Discord CDN限定）
const ALLOWED_AVATAR_HOSTNAMES = ["cdn.discordapp.com"];

interface OgImageParams {
	params: Promise<{ userId: string }>;
}

export default async function Image({ params }: OgImageParams) {
	const { userId } = await params;

	// getUserByDiscordId は取得失敗時に throw するため null に落とす。
	// 非公開プロフィールはページ（notFound）と同じ扱いで、名前・アバターを画像に出さない
	const user = await getUserByDiscordId(userId).catch(() => null);
	const publicUser = user?.isPublicProfile ? user : null;

	const name = publicUser ? formatDisplayTitle(publicUser.displayName, 30) : "すずみなくりっく！";
	const avatarDataUri = publicUser?.avatarUrl
		? await loadRemoteImageDataUri(publicUser.avatarUrl, ALLOWED_AVATAR_HOSTNAMES)
		: null;

	return buildOgImageResponse({
		size,
		// suzumina.click は底部署名（OgFooter）用
		boldText: `${name}ユーザープロフィールすずみなくりっく！suzumina.click`,
		renderFallback: () => (
			<MediaOgCard
				badgeLabel="USER"
				title={asciiOrEmpty(name) || "suzumina.click"}
				titleMaxWidth={TITLE_MAX_WIDTH}
				titleFontSize={TITLE_FONT_SIZE}
				imageDataUri={avatarDataUri}
				imageWidth={AVATAR_SIZE}
				imageHeight={AVATAR_SIZE}
				ascii
			/>
		),
		renderFull: () => (
			<MediaOgCard
				badgeLabel="ユーザー"
				title={name}
				titleMaxWidth={TITLE_MAX_WIDTH}
				titleFontSize={TITLE_FONT_SIZE}
				imageDataUri={avatarDataUri}
				imageWidth={AVATAR_SIZE}
				imageHeight={AVATAR_SIZE}
				secondaryLine={publicUser ? "音声ボタン作成メンバー" : ""}
			/>
		),
	});
}
