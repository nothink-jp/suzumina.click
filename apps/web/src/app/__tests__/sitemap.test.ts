import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	log: vi.fn(),
}));

import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";
import sitemap from "../sitemap";

type SnapshotDoc = { id: string; data: () => Record<string, unknown> };

function buildSnapshot(docs: SnapshotDoc[]) {
	return { docs };
}

function buildCollectionResolvers(
	resolvers: Record<string, () => Promise<{ docs: SnapshotDoc[] }>>,
) {
	return {
		collection: (name: string) => {
			const resolver = resolvers[name];
			if (!resolver) {
				throw new Error(`Unexpected collection: ${name}`);
			}
			return {
				where: () => ({
					limit: () => ({
						get: () => resolver(),
					}),
				}),
			};
		},
	};
}

const STATIC_PATHS = [
	"",
	"/buttons",
	"/videos",
	"/works",
	"/circles",
	"/creators",
	"/search",
	"/about",
	"/contact",
	"/terms",
	"/privacy",
];

describe("sitemap", () => {
	const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.NEXT_PUBLIC_APP_URL = "https://suzumina.click";
	});

	afterEach(() => {
		if (originalAppUrl === undefined) {
			delete process.env.NEXT_PUBLIC_APP_URL;
		} else {
			process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
		}
	});

	it("正常系: 静的ページと videos/works/audioButtons の動的 URL を結合した配列を返す", async () => {
		const firestoreMock = buildCollectionResolvers({
			videos: async () =>
				buildSnapshot([
					{
						id: "video-1",
						data: () => ({ updatedAt: "2024-01-01T00:00:00Z" }),
					},
					{
						id: "video-2",
						data: () => ({ createdAt: "2024-02-01T00:00:00Z" }),
					},
				]),
			works: async () =>
				buildSnapshot([
					{
						id: "RJ123456",
						data: () => ({ updatedAt: "2024-03-01T00:00:00Z" }),
					},
				]),
			audioButtons: async () =>
				buildSnapshot([
					{
						id: "audio-1",
						data: () => ({ updatedAt: "2024-04-01T00:00:00Z" }),
					},
				]),
		});

		(getFirestore as any).mockReturnValue(firestoreMock);

		const result = await sitemap();
		const urls = result.map((entry) => entry.url);

		expect(urls).toContain("https://suzumina.click/videos/video-1");
		expect(urls).toContain("https://suzumina.click/videos/video-2");
		expect(urls).toContain("https://suzumina.click/works/RJ123456");
		expect(urls).toContain("https://suzumina.click/buttons/audio-1");
		expect(result.length).toBe(STATIC_PATHS.length + 4);
	});

	it("Firestore 障害時の fallback: getFirestore が throw した場合は静的ページのみを返す", async () => {
		(getFirestore as any).mockImplementation(() => {
			throw new Error("Firestore unavailable");
		});

		const result = await sitemap();
		const urls = result.map((entry) => entry.url);

		expect(result.length).toBe(STATIC_PATHS.length);
		for (const path of STATIC_PATHS) {
			expect(urls).toContain(`https://suzumina.click${path}`);
		}
		// 動的 URL が混ざっていないこと
		expect(urls.every((url) => !url.match(/\/videos\/[^/]+$/))).toBe(true);
		expect(urls.every((url) => !url.match(/\/works\/[^/]+$/))).toBe(true);
		expect(urls.every((url) => !url.match(/\/buttons\/[^/]+$/))).toBe(true);
		// fallback パスを通ったことを保証
		expect(logger.warn).toHaveBeenCalledWith(
			"Failed to fetch dynamic content for sitemap:",
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});

	it("個別コレクション失敗時の fallback: videos が throw しても works/audioButtons の URL は含まれる", async () => {
		const firestoreMock = buildCollectionResolvers({
			videos: async () => {
				throw new Error("videos query failed");
			},
			works: async () =>
				buildSnapshot([
					{
						id: "RJ999999",
						data: () => ({ updatedAt: "2024-05-01T00:00:00Z" }),
					},
				]),
			audioButtons: async () =>
				buildSnapshot([
					{
						id: "audio-recovered",
						data: () => ({ updatedAt: "2024-06-01T00:00:00Z" }),
					},
				]),
		});

		(getFirestore as any).mockReturnValue(firestoreMock);

		const result = await sitemap();
		const urls = result.map((entry) => entry.url);

		expect(urls).toContain("https://suzumina.click/works/RJ999999");
		expect(urls).toContain("https://suzumina.click/buttons/audio-recovered");
		expect(urls.every((url) => !url.match(/\/videos\/[^/]+$/))).toBe(true);
	});

	it("staticPages の保証: 公開ページ一覧が必ず含まれる", async () => {
		const firestoreMock = buildCollectionResolvers({
			videos: async () => buildSnapshot([]),
			works: async () => buildSnapshot([]),
			audioButtons: async () => buildSnapshot([]),
		});

		(getFirestore as any).mockReturnValue(firestoreMock);

		const result = await sitemap();
		const urls = result.map((entry) => entry.url);

		for (const path of STATIC_PATHS) {
			expect(urls).toContain(`https://suzumina.click${path}`);
		}
	});

	it("除外確認: 静的ページ・動的ページのいずれも非公開パスを生まない", async () => {
		// 動的データを与えても、静的リストと動的 URL 生成ロジックが
		// disallow 配下のパスを作らないことを確認する。
		const firestoreMock = buildCollectionResolvers({
			videos: async () =>
				buildSnapshot([{ id: "video-x", data: () => ({ updatedAt: "2024-01-01T00:00:00Z" }) }]),
			works: async () =>
				buildSnapshot([{ id: "RJ000001", data: () => ({ updatedAt: "2024-01-01T00:00:00Z" }) }]),
			audioButtons: async () =>
				buildSnapshot([{ id: "audio-x", data: () => ({ updatedAt: "2024-01-01T00:00:00Z" }) }]),
		});

		(getFirestore as any).mockReturnValue(firestoreMock);

		const result = await sitemap();
		const urls = result.map((entry) => entry.url);

		expect(urls).not.toContain("https://suzumina.click/buttons/create");
		expect(urls).not.toContain("https://suzumina.click/auth/signin");
		expect(urls.every((url) => !url.startsWith("https://suzumina.click/admin"))).toBe(true);
		expect(urls.every((url) => !url.startsWith("https://suzumina.click/api"))).toBe(true);
		expect(urls.every((url) => !url.startsWith("https://suzumina.click/auth"))).toBe(true);
	});

	// 本体側で予約パスのガードを行うと挙動が変わるため、その際は本テストも見直すこと。
	it("既知の挙動: audioButton.id が予約パスと衝突した場合は現状そのまま URL 化される", async () => {
		const firestoreMock = buildCollectionResolvers({
			videos: async () => buildSnapshot([]),
			works: async () => buildSnapshot([]),
			audioButtons: async () =>
				buildSnapshot([{ id: "create", data: () => ({ updatedAt: "2024-01-01T00:00:00Z" }) }]),
		});

		(getFirestore as any).mockReturnValue(firestoreMock);

		const result = await sitemap();
		const urls = result.map((entry) => entry.url);

		expect(urls).toContain("https://suzumina.click/buttons/create");
	});
});
