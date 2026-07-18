import { describe, expect, it, vi } from "vitest";

// ImageResponse は実描画せず、渡された element / options を検証できる形で捕捉する
vi.mock("next/og", () => ({
	ImageResponse: class {
		element: React.ReactElement;
		options: { fonts?: unknown[] } | undefined;
		constructor(element: React.ReactElement, options?: { fonts?: unknown[] }) {
			this.element = element;
			this.options = options;
		}
	},
}));
vi.mock("@/lib/user-firestore", () => ({ getUserByDiscordId: vi.fn() }));
vi.mock("@/lib/og-font", () => ({ loadMPlusRoundedSubset: vi.fn() }));
// vitest では "use cache" ディレクティブは no-op になり cacheLife が cache スコープ外呼び出しになるためモックする
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import { loadMPlusRoundedSubset } from "@/lib/og-font";
import { getUserByDiscordId } from "@/lib/user-firestore";
import Image, { alt, contentType, size } from "../opengraph-image";

type OgCardProps = {
	title: string;
	secondaryLine?: string;
	imageDataUri: string | null;
};

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		displayName: "テストユーザー",
		isPublicProfile: true,
		avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
		...overrides,
	};
}

describe("ユーザープロフィールの OG 画像（app/users/[userId]/opengraph-image.tsx）", () => {
	it("1200×630 の PNG を宣言している", () => {
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
		expect(alt).toContain("ユーザープロフィール");
	});

	it("公開プロフィールは表示名・アバターを描画する", async () => {
		vi.mocked(getUserByDiscordId).mockResolvedValueOnce(makeUser() as never);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers({ "content-type": "image/png" }),
			}),
		);

		const response = (await Image({
			params: Promise.resolve({ userId: "123456789" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("テストユーザー");
		expect(response.element.props.secondaryLine).toBe("音声ボタン作成メンバー");
		expect(response.element.props.imageDataUri).toMatch(/^data:image\/png;base64,/);
		// secondaryLine の文字が regular(400) サブセットに含まれること（欠けると tofu 化する）
		expect(loadMPlusRoundedSubset).toHaveBeenCalledWith(
			400,
			expect.stringContaining("音声ボタン作成メンバー"),
		);

		vi.unstubAllGlobals();
	});

	it("アバター未設定でも og:image を返す（名前入りテキストのみカード）", async () => {
		vi.mocked(getUserByDiscordId).mockResolvedValueOnce(
			makeUser({ avatarUrl: undefined }) as never,
		);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const response = (await Image({
			params: Promise.resolve({ userId: "123456789" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.element.props.title).toBe("テストユーザー");
		expect(response.element.props.imageDataUri).toBeNull();

		vi.unstubAllGlobals();
	});

	it("非公開プロフィールは表示名・アバターを出さずサイト名版に落とす", async () => {
		vi.mocked(getUserByDiscordId).mockResolvedValueOnce(
			makeUser({ isPublicProfile: false }) as never,
		);
		vi.mocked(loadMPlusRoundedSubset).mockClear().mockResolvedValue(new ArrayBuffer(8));
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const response = (await Image({
			params: Promise.resolve({ userId: "123456789" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.element.props.title).toBe("すずみなくりっく！");
		expect(response.element.props.secondaryLine).toBe("");
		expect(response.element.props.imageDataUri).toBeNull();
		// セカンダリ行が無いため regular(400) のフェッチ自体を省く
		expect(loadMPlusRoundedSubset).not.toHaveBeenCalledWith(400, expect.anything());

		vi.unstubAllGlobals();
	});

	it("ユーザーが見つからない場合はサイト名版にフォールバックする", async () => {
		vi.mocked(getUserByDiscordId).mockResolvedValueOnce(null);
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ userId: "unknown" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("すずみなくりっく！");
	});

	it("取得エラー（throw）でも 500 にせずサイト名版に落とす", async () => {
		vi.mocked(getUserByDiscordId).mockRejectedValueOnce(new Error("firestore error"));
		vi.mocked(loadMPlusRoundedSubset).mockResolvedValue(new ArrayBuffer(8));

		const response = (await Image({
			params: Promise.resolve({ userId: "123456789" }),
		})) as unknown as { element: React.ReactElement<OgCardProps> };

		expect(response.element.props.title).toBe("すずみなくりっく！");
	});

	it("フォント取得失敗でも 500 にせず ASCII 縮退版を描画する", async () => {
		vi.mocked(getUserByDiscordId).mockResolvedValueOnce(
			makeUser({ displayName: "Ascii User", avatarUrl: undefined }) as never,
		);
		vi.mocked(loadMPlusRoundedSubset).mockRejectedValue(new Error("font error"));

		const response = (await Image({
			params: Promise.resolve({ userId: "123456789" }),
		})) as unknown as { element: React.ReactElement<OgCardProps>; options: { fonts?: unknown[] } };

		expect(response.element.props.title).toBe("Ascii User");
		expect(response.options.fonts).toBeUndefined();
	});
});
