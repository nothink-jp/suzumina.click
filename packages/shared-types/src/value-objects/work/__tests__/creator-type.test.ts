import { describe, expect, it } from "vitest";
import { CREATOR_ROLE_LABELS, CreatorsInfoValueObject, CreatorUtils } from "../creator-type";

const create = (data: Parameters<typeof CreatorsInfoValueObject.create>[0]) =>
	CreatorsInfoValueObject.create(data)._unsafeUnwrap();

const sample = () =>
	create({
		voice: ["佐倉", "鈴鹿"],
		scenario: ["脚本家"],
		illustration: ["絵師"],
	});

describe("CreatorsInfoValueObject.create / validate", () => {
	it("正常データで生成できる", () => {
		const result = CreatorsInfoValueObject.create({ voice: ["a"] });
		expect(result.isOk()).toBe(true);
		expect(create({ voice: ["a"] }).voice).toEqual(["a"]);
	});

	it("欠落フィールドは空配列で補完される", () => {
		const vo = create({});
		expect(vo.voice).toEqual([]);
		expect(vo.other).toEqual([]);
	});

	it("配列でない値はバリデーションエラー", () => {
		const result = CreatorsInfoValueObject.create({ voice: "x" as never });
		expect(result.isOk()).toBe(false);
	});
});

describe("fromPlainObject", () => {
	it("オブジェクト以外はエラー", () => {
		expect(CreatorsInfoValueObject.fromPlainObject(null).isOk()).toBe(false);
		expect(CreatorsInfoValueObject.fromPlainObject("x").isOk()).toBe(false);
	});

	it("文字列配列でないフィールドはエラー", () => {
		expect(CreatorsInfoValueObject.fromPlainObject({ voice: [1, 2] }).isOk()).toBe(false);
	});

	it("有効なオブジェクトから復元できる", () => {
		const result = CreatorsInfoValueObject.fromPlainObject({ voice: ["a"], music: ["m"] });
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().music).toEqual(["m"]);
	});
});

describe("アクセサ / ビジネスロジック", () => {
	it("アクセサは内部配列のコピーを返す（不変性）", () => {
		const vo = sample();
		const voices = vo.voice;
		voices.push("改ざん");
		expect(vo.voice).toEqual(["佐倉", "鈴鹿"]);
	});

	it("getAll は優先順位順に全クリエイターを返す", () => {
		const all = sample().getAll();
		expect(all[0]).toEqual({ type: "voice", name: "佐倉" });
		expect(all.map((c) => c.type)).toEqual(["voice", "voice", "scenario", "illustration"]);
	});

	it("hasCreators / countByType / totalCount", () => {
		const vo = sample();
		expect(vo.hasCreators()).toBe(true);
		expect(vo.countByType("voice")).toBe(2);
		expect(vo.countByType("music")).toBe(0);
		expect(vo.totalCount()).toBe(4);
		expect(create({}).hasCreators()).toBe(false);
	});

	it("getPrimary は各タイプ先頭1名を返す", () => {
		expect(sample().getPrimary()).toEqual({
			voice: "佐倉",
			scenario: "脚本家",
			illustration: "絵師",
		});
	});

	it("isValid / getValidationErrors", () => {
		const vo = sample();
		expect(vo.isValid()).toBe(true);
		expect(vo.getValidationErrors()).toEqual([]);
	});
});

describe("equals / clone / toPlainObject", () => {
	it("順序が違っても内容が同じなら equals は true", () => {
		const a = create({ voice: ["x", "y"] });
		const b = create({ voice: ["y", "x"] });
		expect(a.equals(b)).toBe(true);
	});

	it("内容が違えば false / インスタンスでなければ false", () => {
		const a = sample();
		const b = create({ voice: ["z"] });
		expect(a.equals(b)).toBe(false);
		expect(a.equals(null as never)).toBe(false);
	});

	it("clone は等価な別インスタンス", () => {
		const a = sample();
		const c = a.clone();
		expect(c).not.toBe(a);
		expect(a.equals(c)).toBe(true);
	});

	it("toPlainObject は全ロールを含む", () => {
		expect(sample().toPlainObject()).toEqual({
			voice: ["佐倉", "鈴鹿"],
			scenario: ["脚本家"],
			illustration: ["絵師"],
			music: [],
			other: [],
		});
	});
});

describe("CreatorUtils", () => {
	it("getTypeLabel", () => {
		expect(CreatorUtils.getTypeLabel("voice")).toBe(CREATOR_ROLE_LABELS.voice);
	});

	it("getTypeLabels は件数で表記を変える", () => {
		expect(CreatorUtils.getTypeLabels([])).toBe("");
		expect(CreatorUtils.getTypeLabels(["voice"])).toBe("声優");
		expect(CreatorUtils.getTypeLabels(["voice", "music"])).toBe("声優 / 音楽");
	});

	it("mergeCreators は重複除去する", () => {
		expect(CreatorUtils.mergeCreators(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
	});

	it("fromApiCreators は undefined で空 VO を返す", () => {
		expect(CreatorUtils.fromApiCreators().totalCount()).toBe(0);
	});

	it("fromApiCreators は既知タイプへ振り分け、未知は other へ", () => {
		const vo = CreatorUtils.fromApiCreators([
			{ type: "voice", name: "声優A" },
			{ type: "Voice", name: "声優A" }, // 大文字小文字を吸収 + 重複除去
			{ type: "unknown", name: "謎" },
		]);
		expect(vo.voice).toEqual(["声優A"]);
		expect(vo.other).toEqual(["謎"]);
	});
});
