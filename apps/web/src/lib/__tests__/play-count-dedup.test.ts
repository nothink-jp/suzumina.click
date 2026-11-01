import { Timestamp } from "@google-cloud/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildPlayCountDedupId,
	claimPlayCount,
	PLAY_COUNT_DEDUP_COLLECTION,
	PLAY_COUNT_DEDUP_WINDOW_MS,
} from "../play-count-dedup";

// トランザクションの読み書きを Map で再現する最小の Firestore フェイク
const store = new Map<string, Record<string, unknown>>();

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: (name: string) => ({
			doc: (id: string) => ({ path: `${name}/${id}` }),
		}),
		runTransaction: async <T>(
			fn: (tx: {
				getAll: (...refs: { path: string }[]) => Promise<unknown[]>;
				set: (ref: { path: string }, data: Record<string, unknown>) => void;
			}) => Promise<T>,
		) =>
			fn({
				getAll: async (...refs) =>
					refs.map((ref) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) })),
				set: (ref, data) => {
					store.set(ref.path, data);
				},
			}),
	}),
}));

const T0 = new Date("2026-11-01T00:00:00Z");

describe("play-count-dedup", () => {
	beforeEach(() => {
		store.clear();
		store.set("audioButtons/ab1", { isPublic: true });
		store.set("audioButtons/ab2", { isPublic: true });
		store.set("audioButtons/private", { isPublic: false });
	});

	describe("buildPlayCountDedupId", () => {
		it("同じ入力なら同じ ID・生の IP を含まない", () => {
			const id = buildPlayCountDedupId("1.2.3.4", "ab1", "s");
			expect(id).toBe(buildPlayCountDedupId("1.2.3.4", "ab1", "s"));
			expect(id).toMatch(/^[0-9a-f]{64}$/);
			expect(id).not.toContain("1.2.3.4");
		});

		it("IP・ボタン・鍵のどれが違っても別 ID", () => {
			const base = buildPlayCountDedupId("1.2.3.4", "ab1", "s");
			expect(buildPlayCountDedupId("1.2.3.5", "ab1", "s")).not.toBe(base);
			expect(buildPlayCountDedupId("1.2.3.4", "ab2", "s")).not.toBe(base);
			expect(buildPlayCountDedupId("1.2.3.4", "ab1", "t")).not.toBe(base);
		});
	});

	describe("claimPlayCount", () => {
		it("同じクライアントが窓内で連打しても計上は 1 回だけ（SPR-334）", async () => {
			const results = [];
			for (let i = 0; i < 20; i++) {
				results.push(await claimPlayCount("ab1", "1.2.3.4", new Date(T0.getTime() + i * 1000)));
			}
			expect(results.filter((r) => r === "claimed")).toHaveLength(1);
			expect(results.slice(1).every((r) => r === "duplicate")).toBe(true);
		});

		it("窓が過ぎれば再び計上できる（TTL 削除前の残骸でも expiresAt で判定）", async () => {
			expect(await claimPlayCount("ab1", "1.2.3.4", T0)).toBe("claimed");
			const justBefore = new Date(T0.getTime() + PLAY_COUNT_DEDUP_WINDOW_MS - 1);
			expect(await claimPlayCount("ab1", "1.2.3.4", justBefore)).toBe("duplicate");
			const after = new Date(T0.getTime() + PLAY_COUNT_DEDUP_WINDOW_MS);
			expect(await claimPlayCount("ab1", "1.2.3.4", after)).toBe("claimed");
		});

		it("別クライアント・別ボタンは独立に計上する", async () => {
			expect(await claimPlayCount("ab1", "1.2.3.4", T0)).toBe("claimed");
			expect(await claimPlayCount("ab1", "5.6.7.8", T0)).toBe("claimed");
			expect(await claimPlayCount("ab2", "1.2.3.4", T0)).toBe("claimed");
		});

		it("存在しない・非公開のボタンは not_found で、抑止ドキュメントも書かない", async () => {
			const before = store.size;
			expect(await claimPlayCount("missing", "1.2.3.4", T0)).toBe("not_found");
			expect(await claimPlayCount("private", "1.2.3.4", T0)).toBe("not_found");
			expect(store.size).toBe(before);
		});

		it("本番で HMAC 鍵が無ければ計上せず throw する（fail-closed）", async () => {
			vi.stubEnv("NODE_ENV", "production");
			vi.stubEnv("BETTER_AUTH_SECRET", "");
			try {
				await expect(claimPlayCount("ab1", "1.2.3.4", T0)).rejects.toThrow("BETTER_AUTH_SECRET");
				expect(store.size).toBe(3);
			} finally {
				vi.unstubAllEnvs();
			}
		});

		it("抑止ドキュメントは expiresAt（Timestamp・TTL 対象）だけを持つ", async () => {
			await claimPlayCount("ab1", "1.2.3.4", T0);
			const [key] = [...store.keys()].filter((k) =>
				k.startsWith(`${PLAY_COUNT_DEDUP_COLLECTION}/`),
			);
			const doc = store.get(key as string) ?? {};
			expect(Object.keys(doc)).toEqual(["expiresAt"]);
			expect(doc.expiresAt).toBeInstanceOf(Timestamp);
			expect((doc.expiresAt as Timestamp).toMillis()).toBe(
				T0.getTime() + PLAY_COUNT_DEDUP_WINDOW_MS,
			);
		});
	});
});
