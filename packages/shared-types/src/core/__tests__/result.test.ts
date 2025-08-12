import { describe, expect, it } from "vitest";
import {
	businessRuleError,
	combineValidationErrors,
	databaseError,
	err,
	isDomainError,
	isValidationError,
	networkError,
	notFoundError,
	ok,
	unauthorizedError,
	validationError,
} from "../result";

describe("Result/Either Pattern", () => {
	describe("Result type from neverthrow", () => {
		it("okで成功結果を作成できる", () => {
			const result = ok("success");
			expect(result.isOk()).toBe(true);
			expect(result.isErr()).toBe(false);
			expect(result._unsafeUnwrap()).toBe("success");
		});

		it("errでエラー結果を作成できる", () => {
			const result = err("error");
			expect(result.isOk()).toBe(false);
			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBe("error");
		});
	});

	describe("Error helpers", () => {
		describe("validationError", () => {
			it("ValidationErrorを作成できる", () => {
				const error = validationError("email", "Invalid email format");
				expect(error).toEqual({
					field: "email",
					message: "Invalid email format",
				});
			});
		});

		describe("notFoundError", () => {
			it("NotFoundErrorを作成できる", () => {
				const error = notFoundError("123", "User");
				expect(error).toEqual({
					type: "NotFound",
					id: "123",
					resource: "User",
				});
			});
		});

		describe("unauthorizedError", () => {
			it("UnauthorizedErrorを作成できる", () => {
				const error = unauthorizedError("Invalid token");
				expect(error).toEqual({
					type: "Unauthorized",
					reason: "Invalid token",
				});
			});

			it("理由なしでUnauthorizedErrorを作成できる", () => {
				const error = unauthorizedError();
				expect(error).toEqual({
					type: "Unauthorized",
					reason: undefined,
				});
			});
		});

		describe("databaseError", () => {
			it("DatabaseErrorを作成できる", () => {
				const error = databaseError("insert", "Connection timeout");
				expect(error).toEqual({
					type: "DatabaseError",
					operation: "insert",
					detail: "Connection timeout",
				});
			});
		});

		describe("networkError", () => {
			it("NetworkErrorを作成できる", () => {
				const error = networkError("Request failed", "https://api.example.com", 500);
				expect(error).toEqual({
					type: "NetworkError",
					url: "https://api.example.com",
					statusCode: 500,
					message: "Request failed",
				});
			});

			it("URLとステータスコードなしでNetworkErrorを作成できる", () => {
				const error = networkError("Network unreachable");
				expect(error).toEqual({
					type: "NetworkError",
					url: undefined,
					statusCode: undefined,
					message: "Network unreachable",
				});
			});
		});

		describe("businessRuleError", () => {
			it("BusinessRuleErrorを作成できる", () => {
				const error = businessRuleError("MAX_ITEMS", "Cannot exceed 100 items");
				expect(error).toEqual({
					type: "BusinessRule",
					rule: "MAX_ITEMS",
					message: "Cannot exceed 100 items",
				});
			});
		});
	});

	describe("Type guards", () => {
		describe("isValidationError", () => {
			it("ValidationErrorを正しく判定する", () => {
				const validError = { field: "email", message: "Invalid" };
				expect(isValidationError(validError)).toBe(true);
			});

			it("ValidationError以外をfalseと判定する", () => {
				expect(isValidationError({ type: "NotFound" })).toBe(false);
				expect(isValidationError("string")).toBe(false);
				expect(isValidationError(null)).toBe(false);
				expect(isValidationError(undefined)).toBe(false);
			});
		});

		describe("isDomainError", () => {
			it("ValidationErrorを正しく判定する", () => {
				const error = { field: "email", message: "Invalid" };
				expect(isDomainError(error)).toBe(true);
			});

			it("type付きエラーを正しく判定する", () => {
				expect(isDomainError({ type: "NotFound" })).toBe(true);
				expect(isDomainError({ type: "DatabaseError" })).toBe(true);
			});

			it("ドメインエラー以外をfalseと判定する", () => {
				expect(isDomainError("string")).toBe(false);
				expect(isDomainError(123)).toBe(false);
				expect(isDomainError(null)).toBe(false);
			});
		});
	});

	describe("combineValidationErrors", () => {
		it("複数のValidationErrorを結合できる", () => {
			const errors = [
				validationError("email", "Invalid format"),
				validationError("password", "Too short"),
				validationError("username", "Already taken"),
			];

			const combined = combineValidationErrors(errors);
			expect(combined.field).toBe("email, password, username");
			expect(combined.message).toBe(
				"email: Invalid format; password: Too short; username: Already taken",
			);
		});

		it("単一のエラーも処理できる", () => {
			const errors = [validationError("email", "Invalid")];
			const combined = combineValidationErrors(errors);
			expect(combined.field).toBe("email");
			expect(combined.message).toBe("email: Invalid");
		});

		it("空配列を処理できる", () => {
			const combined = combineValidationErrors([]);
			expect(combined.field).toBe("");
			expect(combined.message).toBe("");
		});
	});
});
