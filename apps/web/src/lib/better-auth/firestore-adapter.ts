/**
 * better-auth 用 Firestore カスタムアダプタ（SPR-156 Phase 1）
 *
 * 設計の正本:
 * - better-auth の標準モデル（user/session/account/verification）だけを CRUD する**汎用**アダプタ。
 *   アプリ固有の `users` コレクションには触れない（そちらは customSession の enrich 層で読む）。
 * - 後で Cloud SQL(Kysely) へ差し替える際の影響を局所化するため、ここに業務ロジックを持ち込まない。
 * - **index-free**: Firestore のサーバ側クエリは「単一フィールドの等価」または doc ID 取得のみ。
 *   複合条件は取得後にメモリ上で評価する（複合インデックス未作成による本番 FAILED_PRECONDITION を避ける）。
 *   認証系コレクションは小さいため許容。
 *
 * where 評価は better-auth 公式 memory-adapter の評価規則に合わせている（演算子・AND/OR の畳み込み）。
 */
import type { Firestore } from "@google-cloud/firestore";
import { type CustomAdapter, createAdapterFactory } from "better-auth/adapters";
import { getFirestore } from "@/lib/firestore";

/** better-auth core の WhereOperator と一致 */
export type WhereOperator =
	| "eq"
	| "ne"
	| "lt"
	| "lte"
	| "gt"
	| "gte"
	| "in"
	| "not_in"
	| "contains"
	| "starts_with"
	| "ends_with";

/** createAdapterFactory が渡す CleanedWhere（field は解決済み DB フィールド名） */
export interface AdapterWhere {
	field: string;
	value: string | number | boolean | string[] | number[] | Date | null;
	operator: WhereOperator;
	connector: "AND" | "OR";
	mode?: "sensitive" | "insensitive";
}

type Row = Record<string, unknown>;

/** Firestore Timestamp 等を JS Date へ正規化（書き込みは Date、読みは Timestamp になるため） */
export function normalizeValue(value: unknown): unknown {
	if (
		value !== null &&
		typeof value === "object" &&
		typeof (value as { toDate?: unknown }).toDate === "function"
	) {
		return (value as { toDate: () => Date }).toDate();
	}
	return value;
}

/** ドキュメント全体を正規化（id を付与しつつ Timestamp→Date 変換） */
export function normalizeDoc(id: string, data: Row): Row {
	const out: Row = {};
	for (const [k, v] of Object.entries(data)) {
		out[k] = normalizeValue(v);
	}
	out.id = id;
	return out;
}

/** Firestore は undefined を拒否するため事前に除去（fake/実体の双方で挙動を揃える） */
export function stripUndefined(data: Row): Row {
	const out: Row = {};
	for (const [k, v] of Object.entries(data)) {
		if (v !== undefined) out[k] = v;
	}
	return out;
}

function lower(v: unknown): string {
	return typeof v === "string" ? v.toLowerCase() : "";
}

/** in/not_in は配列必須。memory-adapter と同じく非配列はエラー */
function requireArray(value: AdapterWhere["value"], op: "in" | "not_in"): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${op} 演算子の value は配列である必要があります`);
	return value;
}

type ClauseHandler = (
	recordVal: unknown,
	value: AdapterWhere["value"],
	insensitive: boolean,
) => boolean;

/**
 * 演算子ごとの評価ロジック（memory-adapter の評価規則に対応）。
 * 1 演算子 = 1 ハンドラに分解し、evalClause の複雑度を抑える。挙動は switch 版と等価。
 */
const CLAUSE_HANDLERS: Record<WhereOperator, ClauseHandler> = {
	in: (recordVal, value, insensitive) => {
		const arr = requireArray(value, "in");
		return insensitive ? arr.some((v) => lower(recordVal) === lower(v)) : arr.includes(recordVal);
	},
	not_in: (recordVal, value, insensitive) => {
		const arr = requireArray(value, "not_in");
		return insensitive ? !arr.some((v) => lower(recordVal) === lower(v)) : !arr.includes(recordVal);
	},
	contains: (recordVal, value, insensitive) =>
		insensitive
			? lower(recordVal).includes(lower(value))
			: typeof recordVal === "string" && recordVal.includes(value as string),
	starts_with: (recordVal, value, insensitive) =>
		insensitive
			? lower(recordVal).startsWith(lower(value))
			: typeof recordVal === "string" && recordVal.startsWith(value as string),
	ends_with: (recordVal, value, insensitive) =>
		insensitive
			? lower(recordVal).endsWith(lower(value))
			: typeof recordVal === "string" && recordVal.endsWith(value as string),
	ne: (recordVal, value, insensitive) =>
		insensitive ? lower(recordVal) !== lower(value) : recordVal !== value,
	gt: (recordVal, value) => value != null && (recordVal as number) > (value as number),
	gte: (recordVal, value) => value != null && (recordVal as number) >= (value as number),
	lt: (recordVal, value) => value != null && (recordVal as number) < (value as number),
	lte: (recordVal, value) => value != null && (recordVal as number) <= (value as number),
	eq: (recordVal, value, insensitive) => {
		if (insensitive) return lower(recordVal) === lower(value);
		if (value === null) return recordVal == null;
		return recordVal === value;
	},
};

/** 単一 where 条件の評価（memory-adapter と同じ規則） */
export function evalClause(record: Row, clause: AdapterWhere): boolean {
	const { field, value, operator } = clause;
	const recordVal = record[field];
	const insensitive =
		clause.mode === "insensitive" &&
		(typeof value === "string" ||
			(Array.isArray(value) && value.every((v) => typeof v === "string")));
	// 未知の演算子は switch 版の default と同じく eq 相当で評価
	const handler = CLAUSE_HANDLERS[operator] ?? CLAUSE_HANDLERS.eq;
	return handler(recordVal, value, insensitive);
}

/** where 配列の畳み込み（先頭を起点に各 clause を connector で結合：memory-adapter 準拠） */
export function matchesWhere(record: Row, where?: AdapterWhere[]): boolean {
	if (!where || where.length === 0) return true;
	let result = true;
	let initialized = false;
	for (const clause of where) {
		const r = evalClause(record, clause);
		if (!initialized) {
			result = r;
			initialized = true;
		} else {
			result = clause.connector === "OR" ? result || r : result && r;
		}
	}
	return result;
}

/** boolean 比較（false < true） */
function compareBoolean(a: boolean, b: boolean): number {
	if (a === b) return 0;
	return a ? 1 : -1;
}

/** null/undefined を含む比較。両者が非 null なら null を返し、型別比較へ委譲する */
function compareNullable(av: unknown, bv: unknown): number | null {
	if (av == null && bv == null) return 0;
	if (av == null) return -1;
	if (bv == null) return 1;
	return null;
}

/** 同型優先の比較（string/Date/number/boolean、それ以外は文字列化して比較） */
function compareTyped(av: unknown, bv: unknown): number {
	if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv);
	if (av instanceof Date && bv instanceof Date) return av.getTime() - bv.getTime();
	if (typeof av === "number" && typeof bv === "number") return av - bv;
	if (typeof av === "boolean" && typeof bv === "boolean") return compareBoolean(av, bv);
	return String(av).localeCompare(String(bv));
}

/** 2 値比較（null 優先 → 型別）。旧 applySort の if/else 連鎖と等価 */
function compareValues(av: unknown, bv: unknown): number {
	return compareNullable(av, bv) ?? compareTyped(av, bv);
}

/** sortBy をメモリ上で適用 */
export function applySort(
	records: Row[],
	sortBy?: { field: string; direction: "asc" | "desc" },
): Row[] {
	if (!sortBy) return records;
	const { field, direction } = sortBy;
	return [...records].sort((a, b) => {
		const cmp = compareValues(a[field], b[field]);
		return direction === "asc" ? cmp : -cmp;
	});
}

/**
 * index-free なサーバ側プリフィルタの選択。
 * - 単一 `id eq` → doc ID 取得
 * - OR を含まない等価条件が1つ以上 → 最初の等価1件のみ `.where(==)`（単一フィールド＝複合index不要）
 * - それ以外 → コレクション全走査（認証系は小さい）
 */
export function pickPrefilter(
	where?: AdapterWhere[],
): { kind: "id"; id: string } | { kind: "eq"; field: string; value: unknown } | { kind: "scan" } {
	if (!where || where.length === 0) return { kind: "scan" };
	const hasOr = where.some((w) => w.connector === "OR");
	if (hasOr) return { kind: "scan" };
	const idEq = where.find((w) => w.field === "id" && w.operator === "eq" && w.value != null);
	if (idEq) return { kind: "id", id: String(idEq.value) };
	const eq = where.find((w) => w.operator === "eq" && w.value != null);
	if (eq) return { kind: "eq", field: eq.field, value: eq.value };
	return { kind: "scan" };
}

export interface FirestoreAdapterConfig {
	/** コレクション名の接頭辞（既存 `users` 等との衝突回避 / better-auth 所有を明示） */
	collectionPrefix?: string;
	/** テスト用に Firestore を差し替えるための注入口 */
	getDb?: () => Firestore;
	debugLogs?: boolean;
}

/** createAdapterFactory のクロージャから切り出した、テスト可能な生 CRUD 群 */
export interface FirestoreOps {
	create: (args: { model: string; data: Row }) => Promise<Row>;
	findOne: (args: { model: string; where?: AdapterWhere[] }) => Promise<Row | null>;
	findMany: (args: {
		model: string;
		where?: AdapterWhere[];
		limit?: number;
		sortBy?: { field: string; direction: "asc" | "desc" };
		offset?: number;
	}) => Promise<Row[]>;
	count: (args: { model: string; where?: AdapterWhere[] }) => Promise<number>;
	update: (args: { model: string; where?: AdapterWhere[]; update: Row }) => Promise<Row | null>;
	updateMany: (args: { model: string; where?: AdapterWhere[]; update: Row }) => Promise<number>;
	delete: (args: { model: string; where?: AdapterWhere[] }) => Promise<void>;
	deleteMany: (args: { model: string; where?: AdapterWhere[] }) => Promise<number>;
}

/**
 * Firestore に対する生 CRUD。better-auth 非依存なので fake Firestore で直接テストできる。
 */
export function firestoreOps(config: FirestoreAdapterConfig = {}): FirestoreOps {
	const prefix = config.collectionPrefix ?? "ba_";
	const getDb = config.getDb ?? getFirestore;
	const col = (model: string) => getDb().collection(`${prefix}${model}`);

	async function resolveRows(model: string, where?: AdapterWhere[]): Promise<Row[]> {
		const plan = pickPrefilter(where);
		let candidates: Row[] = [];

		if (plan.kind === "id") {
			const snap = await col(model).doc(plan.id).get();
			if (snap.exists) candidates = [normalizeDoc(snap.id, (snap.data() as Row) ?? {})];
		} else if (plan.kind === "eq") {
			const qs = await col(model).where(plan.field, "==", plan.value).get();
			candidates = qs.docs.map((d) => normalizeDoc(d.id, (d.data() as Row) ?? {}));
		} else {
			const qs = await col(model).get();
			candidates = qs.docs.map((d) => normalizeDoc(d.id, (d.data() as Row) ?? {}));
		}

		return candidates.filter((r) => matchesWhere(r, where));
	}

	return {
		create: async ({ model, data }) => {
			const row = stripUndefined(data);
			const id = row.id != null ? String(row.id) : col(model).doc().id;
			row.id = id;
			await col(model).doc(id).set(row);
			return normalizeDoc(id, row);
		},

		findOne: async ({ model, where }) => {
			const rows = await resolveRows(model, where);
			return rows[0] ?? null;
		},

		findMany: async ({ model, where, limit, sortBy, offset }) => {
			let rows = applySort(await resolveRows(model, where), sortBy);
			if (offset) rows = rows.slice(offset);
			if (typeof limit === "number") rows = rows.slice(0, limit);
			return rows;
		},

		count: async ({ model, where }) => (await resolveRows(model, where)).length,

		update: async ({ model, where, update }) => {
			const target = (await resolveRows(model, where))[0];
			if (!target) return null;
			const patch = stripUndefined(update);
			await col(model).doc(String(target.id)).update(patch);
			return normalizeDoc(String(target.id), { ...target, ...patch });
		},

		updateMany: async ({ model, where, update }) => {
			const rows = await resolveRows(model, where);
			const patch = stripUndefined(update);
			await Promise.all(rows.map((r) => col(model).doc(String(r.id)).update(patch)));
			return rows.length;
		},

		delete: async ({ model, where }) => {
			const rows = await resolveRows(model, where);
			await Promise.all(rows.map((r) => col(model).doc(String(r.id)).delete()));
		},

		deleteMany: async ({ model, where }) => {
			const rows = await resolveRows(model, where);
			await Promise.all(rows.map((r) => col(model).doc(String(r.id)).delete()));
			return rows.length;
		},
	};
}

/**
 * better-auth に渡す Firestore アダプタ（createAdapterFactory ラッパ）。
 */
export const firestoreAdapter = (config: FirestoreAdapterConfig = {}) =>
	createAdapterFactory({
		config: {
			adapterId: "firestore",
			adapterName: "Firestore Adapter",
			usePlural: false,
			supportsArrays: true,
			supportsJSON: true,
			supportsDates: true,
			supportsBooleans: true,
			// Firestore に跨る実トランザクションは Phase 1 では未対応（逐次実行へフォールバック）。
			transaction: false,
			debugLogs: config.debugLogs ?? false,
		},
		adapter: () => firestoreOps(config) as unknown as CustomAdapter,
	});
