import { z } from "zod";
import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * CreatorType Value Object
 *
 * クリエイターの役割を表現する値オブジェクト
 * DLsite作品におけるクリエイターの種類を扱う
 */
export const CreatorRole = z.enum([
	"voice", // 声優
	"illustration", // イラスト
	"scenario", // シナリオ
	"music", // 音楽
	"other", // その他
]);

export type CreatorRole = z.infer<typeof CreatorRole>;

/**
 * クリエイタータイプの日本語ラベル
 */
export const CREATOR_ROLE_LABELS: Record<CreatorRole, string> = {
	voice: "声優",
	illustration: "イラスト",
	scenario: "シナリオ",
	music: "音楽",
	other: "その他",
} as const;

/**
 * クリエイタータイプの優先順位
 * 表示時のソート順に使用
 */
export const CREATOR_ROLE_PRIORITY: Record<CreatorRole, number> = {
	voice: 1,
	scenario: 2,
	illustration: 3,
	music: 4,
	other: 5,
} as const;

/**
 * Creator data interface for internal use
 */
interface CreatorData {
	voice: string[];
	scenario: string[];
	illustration: string[];
	music: string[];
	other: string[];
}

/**
 * Creators Value Object
 *
 * 作品に関わる全クリエイター情報を集約
 * Enhanced with BaseValueObject and Result pattern for type safety
 */
export class CreatorsInfoValueObject
	extends BaseValueObject<CreatorsInfoValueObject>
	implements ValidatableValueObject<CreatorsInfoValueObject>
{
	private constructor(private readonly data: CreatorData) {
		super();
	}

	/**
	 * Creates a CreatorsInfo with validation
	 * @param data - The creator data
	 * @returns Result containing CreatorsInfo or ValidationError
	 */
	static create(data: Partial<CreatorData>): Result<CreatorsInfoValueObject, ValidationError> {
		const validation = CreatorsInfoValueObject.validate(data);
		if (!validation.isValid) {
			return err(
				validationError("creatorsInfo", validation.error ?? "クリエイター情報の検証に失敗しました"),
			);
		}

		const normalizedData: CreatorData = {
			voice: data.voice || [],
			scenario: data.scenario || [],
			illustration: data.illustration || [],
			music: data.music || [],
			other: data.other || [],
		};

		return ok(new CreatorsInfoValueObject(normalizedData));
	}

	/**
	 * Creates a CreatorsInfo from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing CreatorsInfo or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<CreatorsInfoValueObject, ValidationError> {
		if (!obj || typeof obj !== "object") {
			return err(validationError("creatorsInfo", "CreatorsInfo data must be an object"));
		}

		const data = obj as Record<string, unknown>;
		const creatorData: Partial<CreatorData> = {};

		for (const role of ["voice", "scenario", "illustration", "music", "other"] as const) {
			if (role in data) {
				const value = data[role];
				if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
					creatorData[role] = value;
				} else if (value !== undefined) {
					return err(validationError("creatorsInfo", `${role} must be an array of strings`));
				}
			}
		}

		return CreatorsInfoValueObject.create(creatorData);
	}

	/**
	 * Validates creator data
	 */
	private static validate(data: unknown): { isValid: boolean; error?: string } {
		if (!data || typeof data !== "object") {
			return { isValid: false, error: "CreatorsInfo data must be an object" };
		}

		const obj = data as Record<string, unknown>;
		for (const role of ["voice", "scenario", "illustration", "music", "other"] as const) {
			if (role in obj) {
				const value = obj[role];
				if (
					value !== undefined &&
					(!Array.isArray(value) || !value.every((item) => typeof item === "string"))
				) {
					return { isValid: false, error: `${role} must be an array of strings` };
				}
			}
		}

		return { isValid: true };
	}

	// Accessors

	get voice(): string[] {
		return [...this.data.voice];
	}

	get scenario(): string[] {
		return [...this.data.scenario];
	}

	get illustration(): string[] {
		return [...this.data.illustration];
	}

	get music(): string[] {
		return [...this.data.music];
	}

	get other(): string[] {
		return [...this.data.other];
	}

	// Business logic methods

	/**
	 * 全クリエイターを取得
	 */
	getAll(): Array<{ type: CreatorRole; name: string }> {
		const result: Array<{ type: CreatorRole; name: string }> = [];

		(Object.keys(this.data) as CreatorRole[]).forEach((type) => {
			this.data[type].forEach((name) => {
				result.push({ type, name });
			});
		});

		return result.sort((a, b) => CREATOR_ROLE_PRIORITY[a.type] - CREATOR_ROLE_PRIORITY[b.type]);
	}

	/**
	 * クリエイターが存在するか
	 */
	hasCreators(): boolean {
		return Object.values(this.data).some((creators) => creators.length > 0);
	}

	/**
	 * 特定タイプのクリエイター数
	 */
	countByType(type: CreatorRole): number {
		return this.data[type].length;
	}

	/**
	 * 全クリエイター数
	 */
	totalCount(): number {
		return Object.values(this.data).reduce((sum, creators) => sum + creators.length, 0);
	}

	/**
	 * 主要クリエイター（最初の各タイプ1名）を取得
	 */
	getPrimary(): Partial<Record<CreatorRole, string>> {
		const primary: Partial<Record<CreatorRole, string>> = {};

		(Object.keys(this.data) as CreatorRole[]).forEach((type) => {
			if (this.data[type].length > 0) {
				primary[type] = this.data[type][0];
			}
		});

		return primary;
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return CreatorsInfoValueObject.validate(this.data).isValid;
	}

	getValidationErrors(): string[] {
		const validation = CreatorsInfoValueObject.validate(this.data);
		return validation.isValid ? [] : [validation.error ?? "クリエイター情報の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: CreatorsInfoValueObject): boolean {
		if (!other || !(other instanceof CreatorsInfoValueObject)) {
			return false;
		}

		return (Object.keys(this.data) as CreatorRole[]).every((type) => {
			const thisCreators = [...this.data[type]].sort();
			const otherCreators = [...other.data[type]].sort();
			return (
				thisCreators.length === otherCreators.length &&
				thisCreators.every((c, i) => c === otherCreators[i])
			);
		});
	}

	clone(): CreatorsInfoValueObject {
		return new CreatorsInfoValueObject({
			voice: [...this.data.voice],
			scenario: [...this.data.scenario],
			illustration: [...this.data.illustration],
			music: [...this.data.music],
			other: [...this.data.other],
		});
	}

	toPlainObject(): CreatorData {
		return {
			voice: [...this.data.voice],
			scenario: [...this.data.scenario],
			illustration: [...this.data.illustration],
			music: [...this.data.music],
			other: [...this.data.other],
		};
	}
}

// Export the class with a different name to avoid conflicts
export { CreatorsInfoValueObject as CreatorsInfoClass };

/**
 * クリエイターユーティリティ
 */
export const CreatorUtils = {
	/**
	 * クリエイタータイプのラベルを取得
	 */
	getTypeLabel: (type: CreatorRole): string => {
		return CREATOR_ROLE_LABELS[type];
	},

	/**
	 * 複数のクリエイタータイプのラベルを取得
	 */
	getTypeLabels: (types: CreatorRole[]): string => {
		if (types.length === 0) return "";
		if (types.length === 1) {
			const firstType = types[0] as CreatorRole;
			return CREATOR_ROLE_LABELS[firstType] ?? firstType;
		}

		return types
			.map((type) => {
				const roleType = type as CreatorRole;
				return CREATOR_ROLE_LABELS[roleType] ?? type;
			})
			.join(" / ");
	},

	/**
	 * クリエイター配列を統合（重複除去）
	 */
	mergeCreators: (...creatorArrays: string[][]): string[] => {
		const merged = creatorArrays.flat();
		return [...new Set(merged)];
	},

	/**
	 * APIのcreater情報からCreatorsオブジェクトを構築
	 */
	fromApiCreaters: (creaters?: Array<{ type: string; name: string }>): CreatorsInfoValueObject => {
		const result: Record<string, string[]> = {
			voice: [],
			scenario: [],
			illustration: [],
			music: [],
			other: [],
		};

		if (!creaters) {
			const createResult = CreatorsInfoValueObject.create(result);
			if (!createResult.isOk()) {
				throw new Error(createResult.error.message);
			}
			return createResult.value;
		}

		creaters.forEach(({ type, name }) => {
			const normalizedType = type.toLowerCase();
			if (normalizedType in result && result[normalizedType]) {
				result[normalizedType]?.push(name);
			} else if (result.other) {
				result.other.push(name);
			}
		});

		// 重複除去
		Object.keys(result).forEach((type) => {
			result[type] = [...new Set(result[type])];
		});

		const createResult = CreatorsInfoValueObject.create(result);
		if (!createResult.isOk()) {
			throw new Error(createResult.error.message);
		}
		return createResult.value;
	},
};
