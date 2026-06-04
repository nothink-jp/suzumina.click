import { type Firestore, GeoPoint, Timestamp } from "@google-cloud/firestore";
import { describe, expect, it } from "vitest";
import { type CollectionFixture, decodeValue, encodeValue } from "../serialize";

// decodeValue の "ref" ケースだけが firestore.doc() を必要とする。
// 実接続は不要なので、path を保持するだけのスタブを渡す。
const firestoreStub = {
	doc: (path: string) => ({ path, __isRef: true }),
} as unknown as Firestore;

/** encode → JSON 文字列化 → parse → decode を通す（実際のフィクスチャ往復を再現） */
function roundTrip(value: unknown): unknown {
	const encoded = JSON.parse(JSON.stringify(encodeValue(value)));
	return decodeValue(encoded, firestoreStub);
}

describe("serialize: encodeValue/decodeValue round-trip", () => {
	it("プリミティブをそのまま往復する", () => {
		expect(roundTrip("text")).toBe("text");
		expect(roundTrip(42)).toBe(42);
		expect(roundTrip(0)).toBe(0);
		expect(roundTrip(true)).toBe(true);
		expect(roundTrip(false)).toBe(false);
		expect(roundTrip(null)).toBe(null);
	});

	it("undefined は null にエンコードされる", () => {
		expect(encodeValue(undefined)).toBe(null);
		expect(roundTrip(undefined)).toBe(null);
	});

	it("Timestamp を Timestamp として復元する（秒・ナノ秒を保持）", () => {
		const ts = new Timestamp(1753096381, 161000000);
		const result = roundTrip(ts);

		expect(result).toBeInstanceOf(Timestamp);
		expect((result as Timestamp).seconds).toBe(1753096381);
		expect((result as Timestamp).nanoseconds).toBe(161000000);
	});

	it("GeoPoint を GeoPoint として復元する", () => {
		const gp = new GeoPoint(35.681236, 139.767125);
		const result = roundTrip(gp);

		expect(result).toBeInstanceOf(GeoPoint);
		expect((result as GeoPoint).latitude).toBeCloseTo(35.681236);
		expect((result as GeoPoint).longitude).toBeCloseTo(139.767125);
	});

	it("Buffer(Bytes) を base64 経由で復元する", () => {
		const buf = Buffer.from("hello firestore", "utf-8");
		const result = roundTrip(buf);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect((result as Buffer).equals(buf)).toBe(true);
	});

	it("DocumentReference は path を保持して doc() で復元する", () => {
		// path/firestore を持つ duck-typed の参照
		const ref = { path: "works/RJ01000639", firestore: {} };
		const result = roundTrip(ref) as { path: string };

		expect(result.path).toBe("works/RJ01000639");
	});

	it("ネストしたオブジェクト・配列の中の特殊型も復元する", () => {
		const value = {
			title: "古本少女",
			price: 1100,
			liveStreamingDetails: {
				actualStartTime: new Timestamp(1700000000, 0),
				scheduledStartTime: new Timestamp(1700000001, 500),
			},
			tags: ["a", "b"],
			snapshots: [{ at: new Timestamp(1700000002, 0), value: 10 }],
		};

		const result = roundTrip(value) as typeof value;

		expect(result.title).toBe("古本少女");
		expect(result.price).toBe(1100);
		expect(result.liveStreamingDetails.actualStartTime).toBeInstanceOf(Timestamp);
		expect(result.liveStreamingDetails.actualStartTime.seconds).toBe(1700000000);
		expect(result.liveStreamingDetails.scheduledStartTime.nanoseconds).toBe(500);
		expect(result.tags).toEqual(["a", "b"]);
		expect(result.snapshots[0].at).toBeInstanceOf(Timestamp);
		expect(result.snapshots[0].value).toBe(10);
	});

	it("CollectionFixture 全体（複数ドキュメント）を往復しても整合する", () => {
		// dump.ts と同様に encodeValue でフィクスチャの data を組む（生の Timestamp を直接入れない）
		const fixture: CollectionFixture = {
			collection: "videos",
			docs: [
				{ id: "v1", data: encodeValue({ publishedAt: new Timestamp(1, 0), title: "t1" }) },
				{ id: "v2", data: encodeValue({ publishedAt: new Timestamp(2, 0), title: "t2" }) },
			] as CollectionFixture["docs"],
		};

		const encoded = JSON.parse(JSON.stringify(fixture)) as CollectionFixture;
		const decodedFirst = decodeValue(encoded.docs[0].data, firestoreStub) as {
			publishedAt: Timestamp;
			title: string;
		};

		expect(encoded.collection).toBe("videos");
		expect(encoded.docs).toHaveLength(2);
		expect(decodedFirst.publishedAt).toBeInstanceOf(Timestamp);
		expect(decodedFirst.publishedAt.seconds).toBe(1);
		expect(decodedFirst.title).toBe("t1");
	});
});
