import { describe, expect, it } from "vitest";
import { isAuthGatedPath, sanitizeRelativePath } from "../auth-redirect";

describe("isAuthGatedPath", () => {
	it.each([
		"/settings",
		"/settings/account",
		"/favorites",
		"/users/me",
		"/users/me/edit",
		"/buttons/create",
		"/buttons/RJ123456/edit",
	])("認証必須ページ %s は true", (path) => {
		expect(isAuthGatedPath(path)).toBe(true);
	});

	it.each([
		"/",
		"/buttons",
		"/buttons/RJ123456",
		"/videos",
		"/videos/abc123",
		"/works",
		"/users/123456789", // 他ユーザーの公開プロフィールは保護対象外
		"/circles/xyz",
	])("公開ページ %s は false", (path) => {
		expect(isAuthGatedPath(path)).toBe(false);
	});
});

describe("sanitizeRelativePath", () => {
	it.each([
		"/",
		"/buttons",
		"/buttons/RJ123456",
		"/users/me",
	])("同一オリジン相対パス %s はそのまま", (path) => {
		expect(sanitizeRelativePath(path)).toBe(path);
	});

	it.each([
		["https://evil.com", "/"],
		["//evil.com", "/"], // プロトコル相対
		["/\\evil.com", "/"], // バックスラッシュ細工
		["http://example.com/path", "/"],
		["/javascript:alert(1)", "/"], // 先頭セグメントのスキーム偽装
		["", "/"],
		[undefined, "/"],
		[null, "/"],
	])("細工/空 %s は / に倒す", (input, expected) => {
		expect(sanitizeRelativePath(input)).toBe(expected);
	});
});
