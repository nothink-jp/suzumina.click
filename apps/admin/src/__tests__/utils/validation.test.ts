import { describe, expect, it } from "vitest";
import {
	validateAdminNotes,
	validateContactData,
	validateEmail,
	validateLength,
	validatePriority,
	validateRequired,
	validateRole,
	validateStatus,
	validateUserData,
} from "@/lib/validation";

describe("Form Validation Utilities", () => {
	describe("validateEmail", () => {
		it("should validate correct email addresses", () => {
			const validEmails = [
				"test@example.com",
				"user+tag@domain.co.jp",
				"name.surname@subdomain.example.org",
			];

			validEmails.forEach((email) => {
				const result = validateEmail(email);
				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("should reject invalid email addresses", () => {
			const invalidEmails = ["invalid", "@example.com", "test@", "test.example.com", "test@.com"];

			invalidEmails.forEach((email) => {
				const result = validateEmail(email);
				expect(result.isValid).toBe(false);
				expect(result.error).toBe("有効なメールアドレスを入力してください");
			});
		});

		it("should reject empty email", () => {
			const result = validateEmail("");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("メールアドレスは必須です");
		});

		it("should reject whitespace-only email", () => {
			const result = validateEmail("   ");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("メールアドレスは必須です");
		});
	});

	describe("validateRole", () => {
		it("should validate correct roles", () => {
			const validRoles = ["admin", "moderator", "member"];

			validRoles.forEach((role) => {
				const result = validateRole(role);
				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("should reject invalid roles", () => {
			const invalidRoles = ["invalid", "user", "superadmin"];

			invalidRoles.forEach((role) => {
				const result = validateRole(role);
				expect(result.isValid).toBe(false);
				expect(result.error).toBe("無効なロールです");
			});
		});

		it("should reject empty role", () => {
			const result = validateRole("");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("ロールは必須です");
		});
	});

	describe("validateStatus", () => {
		it("should validate correct statuses", () => {
			const validStatuses = ["new", "in_progress", "resolved"];

			validStatuses.forEach((status) => {
				const result = validateStatus(status);
				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("should reject invalid statuses", () => {
			const invalidStatuses = ["invalid", "pending", "closed"];

			invalidStatuses.forEach((status) => {
				const result = validateStatus(status);
				expect(result.isValid).toBe(false);
				expect(result.error).toBe("無効なステータスです");
			});
		});
	});

	describe("validatePriority", () => {
		it("should validate correct priorities", () => {
			const validPriorities = ["high", "medium", "low"];

			validPriorities.forEach((priority) => {
				const result = validatePriority(priority);
				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("should reject invalid priorities", () => {
			const invalidPriorities = ["urgent", "normal", "critical"];

			invalidPriorities.forEach((priority) => {
				const result = validatePriority(priority);
				expect(result.isValid).toBe(false);
				expect(result.error).toBe("無効な優先度です");
			});
		});
	});

	describe("validateRequired", () => {
		it("should validate non-empty strings", () => {
			const result = validateRequired("test", "テストフィールド");
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject empty strings", () => {
			const result = validateRequired("", "テストフィールド");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("テストフィールドは必須です");
		});

		it("should reject whitespace-only strings", () => {
			const result = validateRequired("   ", "テストフィールド");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("テストフィールドは必須です");
		});
	});

	describe("validateLength", () => {
		it("should validate strings within length bounds", () => {
			const result = validateLength("test", 2, 10, "テストフィールド");
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject strings shorter than minimum", () => {
			const result = validateLength("a", 2, 10, "テストフィールド");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("テストフィールドは2文字以上で入力してください");
		});

		it("should reject strings longer than maximum", () => {
			const result = validateLength("this is too long", 2, 10, "テストフィールド");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("テストフィールドは10文字以下で入力してください");
		});
	});

	describe("validateAdminNotes", () => {
		it("should validate notes within length limit", () => {
			const result = validateAdminNotes("短いメモ");
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject notes exceeding length limit", () => {
			const longNotes = "a".repeat(1001);
			const result = validateAdminNotes(longNotes);
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("管理者メモは1000文字以下で入力してください");
		});

		it("should validate empty notes", () => {
			const result = validateAdminNotes("");
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});
	});

	describe("validateUserData", () => {
		it("should validate complete valid user data", () => {
			const userData = {
				name: "Test User",
				email: "test@example.com",
				role: "member",
				isActive: true,
			};

			const result = validateUserData(userData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should detect multiple validation errors", () => {
			const userData = {
				name: "",
				email: "invalid-email",
				role: "invalid-role",
			};

			const result = validateUserData(userData);
			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("名前は必須です");
			expect(result.errors.email).toBe("有効なメールアドレスを入力してください");
			expect(result.errors.role).toBe("無効なロールです");
		});

		it("should validate partial user data", () => {
			const userData = {
				role: "admin",
			};

			const result = validateUserData(userData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});
	});

	describe("validateContactData", () => {
		it("should validate complete valid contact data", () => {
			const contactData = {
				status: "new",
				priority: "high",
				adminNotes: "Important contact",
			};

			const result = validateContactData(contactData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should detect validation errors in contact data", () => {
			const contactData = {
				status: "invalid",
				priority: "invalid",
				adminNotes: "a".repeat(1001),
			};

			const result = validateContactData(contactData);
			expect(result.isValid).toBe(false);
			expect(result.errors.status).toBe("無効なステータスです");
			expect(result.errors.priority).toBe("無効な優先度です");
			expect(result.errors.adminNotes).toBe("管理者メモは1000文字以下で入力してください");
		});

		it("should validate empty contact data", () => {
			const result = validateContactData({});
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});
	});
});
