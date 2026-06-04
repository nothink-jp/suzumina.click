/**
 * Firestore ドキュメント値 ⇄ JSON フィクスチャ の相互変換。
 *
 * Timestamp / GeoPoint / DocumentReference / Bytes は素の JSON で表現できないため、
 * `__type__` センチネルでエンコードして可逆にする。dump.ts と seed.ts の正本。
 */

import { type Firestore, GeoPoint, Timestamp } from "@google-cloud/firestore";

type Encoded = unknown;

/** Firestore の値を JSON 化可能な形へエンコードする */
export function encodeValue(value: unknown): Encoded {
	if (value === null || value === undefined) {
		return null;
	}
	if (value instanceof Timestamp) {
		return { __type__: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
	}
	if (value instanceof GeoPoint) {
		return { __type__: "geopoint", latitude: value.latitude, longitude: value.longitude };
	}
	if (Buffer.isBuffer(value)) {
		return { __type__: "bytes", base64: value.toString("base64") };
	}
	// DocumentReference は path を持つ（循環参照を避けるため構造はたどらない）
	if (typeof value === "object" && value !== null && "path" in value && "firestore" in value) {
		return { __type__: "ref", path: (value as { path: string }).path };
	}
	if (Array.isArray(value)) {
		return value.map(encodeValue);
	}
	if (typeof value === "object") {
		const out: Record<string, Encoded> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = encodeValue(v);
		}
		return out;
	}
	return value;
}

/** エンコード済みの値を Firestore 書き込み可能な形へ復元する */
export function decodeValue(value: Encoded, firestore: Firestore): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((v) => decodeValue(v, firestore));
	}
	const obj = value as Record<string, unknown>;
	switch (obj.__type__) {
		case "timestamp":
			return new Timestamp(Number(obj.seconds), Number(obj.nanoseconds));
		case "geopoint":
			return new GeoPoint(Number(obj.latitude), Number(obj.longitude));
		case "bytes":
			return Buffer.from(String(obj.base64), "base64");
		case "ref":
			return firestore.doc(String(obj.path));
		default: {
			const out: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(obj)) {
				out[k] = decodeValue(v, firestore);
			}
			return out;
		}
	}
}

/** フィクスチャファイルの形 */
export interface CollectionFixture {
	collection: string;
	docs: Array<{ id: string; data: Record<string, Encoded> }>;
}
