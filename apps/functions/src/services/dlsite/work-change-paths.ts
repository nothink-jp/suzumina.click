/**
 * 既存 works ドキュメントと mapper 出力の差分（変更検知の正本）
 *
 * 「この WorkDocument を `saveWorksToFirestore`（`set(..., { merge: true })`）で書いたら
 * Firestore 上の内容が変わるか」を、追跡フィールドを列挙せずに全フィールドで判定する（SPR-346）。
 * 旧実装は価格・販売状態・タイトル・評価（星差 > 2）・ジャンル追加だけを見ており、
 * 評価・作者・説明・画像の変化が書き込まれなかった。
 *
 * 比較は書き込みの意味論に合わせる:
 * - 値が undefined のフィールドは `ignoreUndefinedProperties` でスキップされ既存値が残るので、比較しない
 *   （ただし {@link WORK_DELETE_ON_ABSENCE_PATHS} は書き込み側が削除するので「既存にあれば変更」）
 * - ネストしたオブジェクトは merge される（既存側だけにあるキーは残る）ので、更新側のキーだけを見る
 * - 配列は丸ごと置き換わるので、要素ごとに完全一致で比べる
 *
 * 内容ハッシュを works に保存する案は採らない。ハッシュは新たな非正規化フィールドで、
 * 既存ドキュメントとの直接比較で同じ判定ができるため（CLAUDE.md 軸1）。
 */

import { isDeepStrictEqual } from "node:util";
import type { WorkDocument } from "@suzumina.click/shared-types";

/**
 * 不在のとき書き込み側（`toWorkWriteData`）が `FieldValue.delete()` を書くフィールド。
 * `toWorkWriteData` と一致させること（dlsite-firestore のテストで突き合わせている）。
 */
export const WORK_DELETE_ON_ABSENCE_PATHS: readonly string[] = [
	"highResImageUrl",
	"price.original",
	"price.discount",
	"price.point",
];

/**
 * 変更検知から外すパス（配列要素は `[]` で表す）。
 *
 * - 取得時刻・作成/更新時刻は毎回変わるため
 * - `price.localePrices` / `localeOfficialPrices` は為替で頻繁に動き、
 *   `languageDownloads[].dlCount` はダウンロード数で常に動く。これらで書き込むと
 *   ほぼ全作品が毎 run 書き込み＋クリエイター再同期になる。他の変化で書き込むときに一緒に更新される
 */
const IGNORED_PATHS: ReadonlySet<string> = new Set([
	"createdAt",
	"updatedAt",
	"lastFetchedAt",
	"dataSources",
	"price.localePrices",
	"price.localeOfficialPrices",
	"languageDownloads[].dlCount",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childPath(parent: string, key: string): string {
	return parent ? `${parent}.${key}` : key;
}

/**
 * 配列要素の比較用に、undefined のキーと無視パスを落とした値を作る。
 * 配列内のオブジェクトは Firestore に undefined のキーが保存されないため。
 */
function normalize(value: unknown, path: string): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => normalize(item, `${path}[]`));
	}
	if (isPlainObject(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			const p = childPath(path, key);
			if (child === undefined || IGNORED_PATHS.has(p)) continue;
			result[key] = normalize(child, p);
		}
		return result;
	}
	return value;
}

/** `parent` の直下にある {@link WORK_DELETE_ON_ABSENCE_PATHS} のキー */
function deleteOnAbsenceChildKeys(parent: string): string[] {
	const prefix = parent ? `${parent}.` : "";
	return WORK_DELETE_ON_ABSENCE_PATHS.filter(
		(p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("."),
	).map((p) => p.slice(prefix.length));
}

function collectChangedPaths(
	existing: unknown,
	updated: unknown,
	path: string,
	changed: string[],
): void {
	if (IGNORED_PATHS.has(path)) return;

	if (updated === undefined) {
		if (WORK_DELETE_ON_ABSENCE_PATHS.includes(path) && existing !== undefined) {
			changed.push(path);
		}
		return;
	}

	if (isPlainObject(updated) && isPlainObject(existing)) {
		// 削除対象のキーは更新側に無くても（= 不在）見る必要がある
		const keys = new Set([...Object.keys(updated), ...deleteOnAbsenceChildKeys(path)]);
		for (const key of keys) {
			collectChangedPaths(existing[key], updated[key], childPath(path, key), changed);
		}
		return;
	}

	if (!isDeepStrictEqual(normalize(existing, path), normalize(updated, path))) {
		changed.push(path);
	}
}

/**
 * `updated` を merge 書き込みしたときに値が変わるフィールドのパスを返す（純粋関数）。
 *
 * @param existing Firestore 上の既存 works ドキュメント
 * @param updated mapper（`WorkMapper.toWork`）の出力
 * @returns 変わるパス（例: `rating.count` / `description` / `price.discount`）。空なら書き込み不要
 */
export function listChangedWorkPaths(existing: WorkDocument, updated: WorkDocument): string[] {
	const changed: string[] = [];
	collectChangedPaths(existing, updated, "", changed);
	return changed;
}
