/**
 * ローカル開発ログインのセッション発行（dev 専用 / 有効化条件は `@/lib/dev-auth/guard`）。
 *
 * better-auth の**本物のセッション**を作る。トークン生成・有効期限・行の形は
 * `internalAdapter.createSession()` に任せ、cookie 名と属性も `authCookies` から読むため、
 * Discord ログインで発行されるセッションと同一の形になる（＝この層に仕様の写しを持たない）。
 * 結果として `getCurrentUser()` / `ProtectedRoute` / クライアントの `useSession()` には分岐が要らない。
 *
 * dev 専用でありながらこのディレクトリに置くのは、better-auth 実装（auth / firestore-adapter）に
 * 触れるコードの置き場が SPR-168 の抽象境界でここに限られているため（guild-sync 等と同じ扱い）。
 * 環境ゲートは provider 非依存なので `lib/dev-auth/guard.ts` 側に分けてある。
 *
 * 呼び出し側（`/api/dev/signin`）もゲートするが、この関数自身も入口で `isDevAuthEnabled()` を検証する。
 * 実セッションを発行する以上、呼び出し側の規律だけに依存させない（呼び出し元が増えたときの取りこぼし防止）。
 */
import { makeSignature } from "better-auth/crypto";
import {
	DEV_AUTH_BA_USER_ID,
	DEV_AUTH_DISCORD_ID,
	DEV_AUTH_EMAIL,
	DEV_AUTH_NAME,
	isDevAuthEnabled,
} from "@/lib/dev-auth/guard";
import { warn } from "@/lib/logger";
import { auth } from "./auth";
import { firestoreOps } from "./firestore-adapter";

/** Next の `cookies.set()` にそのまま渡せる形（属性の実値は better-auth 由来）。 */
export interface DevSessionCookie {
	name: string;
	value: string;
	options: {
		path?: string;
		domain?: string;
		maxAge?: number;
		httpOnly?: boolean;
		secure?: boolean;
		sameSite?: "lax" | "strict" | "none";
	};
}

// better-auth 標準モデル(user 等)へのアクセスはアダプタ境界(firestoreOps)を共有する（guild-sync と同方針）。
const ops = firestoreOps();

/**
 * better-auth の user 行（`ba_user`）を固定 ID で冪等に用意する。
 *
 * `discordId` は additionalField（`input:false`）で、本番では account.create フックが充填する。
 * dev では Discord 連携が無いためここで直接書く。これが無いと enrich-session が
 * `users/{discordId}` を引けず appUser が null になり、ログインしていない状態と区別がつかなくなる。
 */
async function ensureDevAuthUser(): Promise<void> {
	const existing = await ops.findOne({
		model: "user",
		where: [{ field: "id", value: DEV_AUTH_BA_USER_ID, operator: "eq", connector: "AND" }],
	});
	if (existing) {
		return;
	}
	const now = new Date();
	await ops.create({
		model: "user",
		data: {
			id: DEV_AUTH_BA_USER_ID,
			name: DEV_AUTH_NAME,
			email: DEV_AUTH_EMAIL,
			emailVerified: true,
			discordId: DEV_AUTH_DISCORD_ID,
			createdAt: now,
			updatedAt: now,
		},
	});
}

/**
 * 開発用ユーザーの better-auth セッションを作成し、ブラウザへ載せる cookie を返す。
 * `account` 行は作らない（＝ account.create フックを踏まない）。dev ではアクセストークンが無く
 * guild 同期は best-effort で素通りするため、セッション成立には user 行だけで足りる。
 *
 * @throws ローカル開発ログインが無効な環境（本番を含む）で呼ばれた場合
 */
export async function issueDevSessionCookie(): Promise<DevSessionCookie> {
	// 呼び出し側のゲートと二重になるが、認証バイパスを発行する関数自体が最後の砦を持つ。
	if (!isDevAuthEnabled()) {
		throw new Error("dev-auth: ローカル開発ログインが無効な環境では呼び出せません");
	}

	await ensureDevAuthUser();

	const ctx = await auth.$context;
	const session = await ctx.internalAdapter.createSession(DEV_AUTH_BA_USER_ID);
	const { name, attributes } = ctx.authCookies.sessionToken;

	if (attributes.secure) {
		// secure cookie は http://localhost へ送信されず「押しても何も起きない」無言の失敗になる。
		warn("dev-auth: セッション cookie に secure が付くためローカルではログインが成立しません", {
			hint: "BETTER_AUTH_URL を http://localhost:3000 にしてください",
		});
	}

	// better-call が読む形式 `<token>.<HMAC-SHA256 の base64>`。URL エンコードは Next の
	// cookies.set() 側が行う（better-call の signCookieValue と同じく 1 回）ため、ここでは掛けない。
	const signature = await makeSignature(session.token, ctx.secret);

	return {
		name,
		value: `${session.token}.${signature}`,
		options: {
			path: attributes.path,
			domain: attributes.domain,
			maxAge: attributes.maxAge,
			httpOnly: attributes.httpOnly,
			secure: attributes.secure,
			// better-auth 側は "Lax" 等の大文字始まりも取りうるが Next の型は小文字のみ。
			sameSite: attributes.sameSite?.toLowerCase() as DevSessionCookie["options"]["sameSite"],
		},
	};
}
