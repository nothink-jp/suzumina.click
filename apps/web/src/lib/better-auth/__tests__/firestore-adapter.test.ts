import type { Firestore } from "@google-cloud/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import {
	type AdapterWhere,
	applySort,
	evalClause,
	firestoreOps,
	matchesWhere,
	normalizeDoc,
	normalizeValue,
	pickPrefilter,
	stripUndefined,
} from "../firestore-adapter";

type Row = Record<string, unknown>;

// --- 最小 fake Firestore（アダプタが使う API サブセットのみ） ---
class FakeFirestore {
	private cols = new Map<string, Map<string, Row>>();
	private seq = 0;

	private store(name: string): Map<string, Row> {
		let c = this.cols.get(name);
		if (!c) {
			c = new Map();
			this.cols.set(name, c);
		}
		return c;
	}

	collection(name: string) {
		const store = this.store(name);
		const self = this;
		return {
			doc(id?: string) {
				const docId = id ?? `auto_${++self.seq}`;
				return {
					id: docId,
					get: async () => ({
						id: docId,
						exists: store.has(docId),
						data: () => store.get(docId),
					}),
					set: async (data: Row) => {
						store.set(docId, { ...data });
					},
					update: async (patch: Row) => {
						store.set(docId, { ...(store.get(docId) ?? {}), ...patch });
					},
					delete: async () => {
						store.delete(docId);
					},
				};
			},
			where(field: string, _op: string, value: unknown) {
				return {
					get: async () => ({
						docs: [...store.entries()]
							.filter(([id, d]) => (field === "id" ? id : d[field]) === value)
							.map(([id, d]) => ({ id, exists: true, data: () => d })),
					}),
				};
			},
			get: async () => ({
				docs: [...store.entries()].map(([id, d]) => ({ id, exists: true, data: () => d })),
			}),
		};
	}

	// テスト用
	raw(name: string): Map<string, Row> {
		return this.store(name);
	}
}

function makeOps(db: FakeFirestore) {
	return firestoreOps({ getDb: () => db as unknown as Firestore });
}

const w = (
	field: string,
	value: AdapterWhere["value"],
	operator: AdapterWhere["operator"] = "eq",
	connector: AdapterWhere["connector"] = "AND",
): AdapterWhere => ({ field, value, operator, connector });

describe("firestore-adapter pure helpers", () => {
	describe("normalizeValue", () => {
		it("Timestamp 風オブジェクト(toDate)を Date に変換する", () => {
			const date = new Date("2026-01-02T03:04:05Z");
			expect(normalizeValue({ toDate: () => date })).toBe(date);
		});
		it("通常値・null はそのまま返す", () => {
			expect(normalizeValue("x")).toBe("x");
			expect(normalizeValue(null)).toBeNull();
			expect(normalizeValue(42)).toBe(42);
		});
	});

	it("normalizeDoc は id を付与する", () => {
		expect(normalizeDoc("abc", { a: 1 })).toEqual({ a: 1, id: "abc" });
	});

	it("stripUndefined は undefined を除去する", () => {
		expect(stripUndefined({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
	});

	describe("evalClause", () => {
		const rec = { name: "Alice", age: 30, tag: null as string | null };
		it("eq / ne", () => {
			expect(evalClause(rec, w("name", "Alice"))).toBe(true);
			expect(evalClause(rec, w("name", "Bob"))).toBe(false);
			expect(evalClause(rec, w("name", "Bob", "ne"))).toBe(true);
		});
		it("eq で null 一致", () => {
			expect(evalClause(rec, w("tag", null))).toBe(true);
			expect(evalClause(rec, w("name", null))).toBe(false);
		});
		it("数値比較 gt/gte/lt/lte", () => {
			expect(evalClause(rec, w("age", 20, "gt"))).toBe(true);
			expect(evalClause(rec, w("age", 30, "gte"))).toBe(true);
			expect(evalClause(rec, w("age", 30, "lt"))).toBe(false);
			expect(evalClause(rec, w("age", 30, "lte"))).toBe(true);
		});
		it("in / not_in", () => {
			expect(evalClause(rec, w("name", ["Alice", "Bob"], "in"))).toBe(true);
			expect(evalClause(rec, w("name", ["Bob"], "not_in"))).toBe(true);
			expect(() => evalClause(rec, w("name", "x" as never, "in"))).toThrow();
			expect(() => evalClause(rec, w("name", "x" as never, "not_in"))).toThrow();
		});
		it("contains / starts_with / ends_with", () => {
			expect(evalClause(rec, w("name", "lic", "contains"))).toBe(true);
			expect(evalClause(rec, w("name", "Al", "starts_with"))).toBe(true);
			expect(evalClause(rec, w("name", "ce", "ends_with"))).toBe(true);
		});
		it("insensitive モードで大小無視", () => {
			expect(evalClause(rec, { ...w("name", "alice"), mode: "insensitive" })).toBe(true);
			expect(evalClause(rec, { ...w("name", "ALI", "starts_with"), mode: "insensitive" })).toBe(
				true,
			);
			expect(evalClause(rec, { ...w("name", ["ALICE"], "in"), mode: "insensitive" })).toBe(true);
		});
	});

	describe("matchesWhere", () => {
		const rec = { a: 1, b: 2 };
		it("空 where は常に true", () => {
			expect(matchesWhere(rec, [])).toBe(true);
			expect(matchesWhere(rec, undefined)).toBe(true);
		});
		it("AND は全条件一致で true", () => {
			expect(matchesWhere(rec, [w("a", 1), w("b", 2)])).toBe(true);
			expect(matchesWhere(rec, [w("a", 1), w("b", 9)])).toBe(false);
		});
		it("OR は片方一致で true", () => {
			expect(matchesWhere(rec, [w("a", 9), w("b", 2, "eq", "OR")])).toBe(true);
		});
	});

	describe("applySort", () => {
		it("文字列 asc/desc", () => {
			const rows = [{ n: "b" }, { n: "a" }, { n: "c" }];
			expect(applySort(rows, { field: "n", direction: "asc" }).map((r) => r.n)).toEqual([
				"a",
				"b",
				"c",
			]);
			expect(applySort(rows, { field: "n", direction: "desc" }).map((r) => r.n)).toEqual([
				"c",
				"b",
				"a",
			]);
		});
		it("Date / number / null を扱える", () => {
			const rows = [
				{ d: new Date(3), x: 2 },
				{ d: new Date(1), x: 1 },
			];
			expect(applySort(rows, { field: "d", direction: "asc" })[0].x).toBe(1);
			const nullRows = [{ x: 1 }, { x: null }];
			expect(applySort(nullRows, { field: "x", direction: "asc" })[0].x).toBeNull();
		});
		it("sortBy 無しはそのまま", () => {
			const rows = [{ n: 2 }, { n: 1 }];
			expect(applySort(rows)).toBe(rows);
		});
	});

	describe("pickPrefilter", () => {
		it("単一 id eq → id プラン", () => {
			expect(pickPrefilter([w("id", "u1")])).toEqual({ kind: "id", id: "u1" });
		});
		it("等価条件 → eq プラン", () => {
			expect(pickPrefilter([w("token", "t1")])).toEqual({
				kind: "eq",
				field: "token",
				value: "t1",
			});
		});
		it("OR を含む → scan", () => {
			expect(pickPrefilter([w("a", 1), w("b", 2, "eq", "OR")]).kind).toBe("scan");
		});
		it("等価が無い → scan", () => {
			expect(pickPrefilter([w("age", 1, "gt")]).kind).toBe("scan");
			expect(pickPrefilter([]).kind).toBe("scan");
		});
	});
});

describe("firestoreOps (fake Firestore)", () => {
	let db: FakeFirestore;
	let ops: ReturnType<typeof makeOps>;
	beforeEach(() => {
		db = new FakeFirestore();
		ops = makeOps(db);
	});

	it("create は id を採用して保存し、ba_ 接頭辞コレクションに入る", async () => {
		const created = await ops.create({ model: "user", data: { id: "u1", name: "A", x: undefined } });
		expect(created).toEqual({ id: "u1", name: "A" });
		expect(db.raw("ba_user").get("u1")).toEqual({ id: "u1", name: "A" });
	});

	it("create は id 未指定なら自動採番", async () => {
		const created = await ops.create({ model: "session", data: { token: "t" } });
		expect(typeof created.id).toBe("string");
		expect(db.raw("ba_session").size).toBe(1);
	});

	it("findOne は id プランで取得", async () => {
		await ops.create({ model: "user", data: { id: "u1", name: "A" } });
		expect(await ops.findOne({ model: "user", where: [w("id", "u1")] })).toMatchObject({
			name: "A",
		});
		expect(await ops.findOne({ model: "user", where: [w("id", "zzz")] })).toBeNull();
	});

	it("findOne は eq プラン(単一フィールド)で取得", async () => {
		await ops.create({ model: "session", data: { id: "s1", token: "tok", userId: "u1" } });
		expect(await ops.findOne({ model: "session", where: [w("token", "tok")] })).toMatchObject({
			userId: "u1",
		});
	});

	it("findMany は scan + 追加条件のメモリ評価 + sort/limit/offset", async () => {
		await ops.create({ model: "account", data: { id: "a1", userId: "u1", providerId: "discord" } });
		await ops.create({ model: "account", data: { id: "a2", userId: "u1", providerId: "google" } });
		await ops.create({ model: "account", data: { id: "a3", userId: "u2", providerId: "discord" } });

		// userId=u1 AND providerId=discord（複合だが index-free: 片方サーバ、片方メモリ）
		const r = await ops.findMany({
			model: "account",
			where: [w("userId", "u1"), w("providerId", "discord")],
		});
		expect(r).toHaveLength(1);
		expect(r[0].id).toBe("a1");

		const sorted = await ops.findMany({
			model: "account",
			sortBy: { field: "id", direction: "desc" },
			limit: 2,
			offset: 1,
		});
		expect(sorted.map((x) => x.id)).toEqual(["a2", "a1"]);
	});

	it("count は該当数を返す", async () => {
		await ops.create({ model: "account", data: { id: "a1", userId: "u1" } });
		await ops.create({ model: "account", data: { id: "a2", userId: "u1" } });
		await ops.create({ model: "account", data: { id: "a3", userId: "u2" } });
		expect(await ops.count({ model: "account", where: [w("userId", "u1")] })).toBe(2);
		expect(await ops.count({ model: "account" })).toBe(3);
	});

	it("update は1件更新し更新後を返す / 不一致は null", async () => {
		await ops.create({ model: "user", data: { id: "u1", name: "A" } });
		const updated = await ops.update({
			model: "user",
			where: [w("id", "u1")],
			update: { name: "B" },
		});
		expect(updated).toMatchObject({ id: "u1", name: "B" });
		expect(await ops.update({ model: "user", where: [w("id", "zzz")], update: { name: "x" } })).toBeNull();
	});

	it("updateMany / deleteMany は件数を返す", async () => {
		await ops.create({ model: "session", data: { id: "s1", userId: "u1" } });
		await ops.create({ model: "session", data: { id: "s2", userId: "u1" } });
		expect(
			await ops.updateMany({ model: "session", where: [w("userId", "u1")], update: { live: false } }),
		).toBe(2);
		expect(db.raw("ba_session").get("s1")).toMatchObject({ live: false });
		expect(await ops.deleteMany({ model: "session", where: [w("userId", "u1")] })).toBe(2);
		expect(db.raw("ba_session").size).toBe(0);
	});

	it("delete は該当行を削除する", async () => {
		await ops.create({ model: "user", data: { id: "u1" } });
		await ops.delete({ model: "user", where: [w("id", "u1")] });
		expect(db.raw("ba_user").size).toBe(0);
	});
});
