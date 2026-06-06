import type { ContactFormData } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitContactForm } from "../actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendContactNotification: vi.fn() }));
vi.mock("@/lib/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn() }));

const { headers } = vi.mocked(await import("next/headers"));
const { sendContactNotification } = vi.mocked(await import("@/lib/email"));
const { getFirestore } = vi.mocked(await import("@/lib/firestore"));

const validData: ContactFormData = {
	category: "bug",
	subject: "件名です",
	content: "これは十分な長さの本文です。",
};

const setupFirestore = () => {
	const add = vi.fn().mockResolvedValue({ id: "doc1" });
	getFirestore.mockReturnValue({ collection: vi.fn(() => ({ add })) } as never);
	return { add };
};

beforeEach(() => {
	vi.clearAllMocks();
	headers.mockResolvedValue({
		get: (k: string) => (k === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : "UA/1.0"),
	} as never);
	sendContactNotification.mockResolvedValue(undefined as never);
});

describe("submitContactForm", () => {
	it("正常送信で Firestore 保存・メール通知・id 返却", async () => {
		const { add } = setupFirestore();
		const r = await submitContactForm(validData);
		expect(r).toEqual({ success: true, message: "お問い合わせを受け付けました", id: "doc1" });
		// IP は x-forwarded-for の先頭
		expect(add).toHaveBeenCalledWith(
			expect.objectContaining({ ipAddress: "1.2.3.4", status: "new" }),
		);
		expect(sendContactNotification).toHaveBeenCalled();
	});

	it("バリデーション失敗（短い content）は errors を返す", async () => {
		const r = await submitContactForm({ ...validData, content: "短い" });
		expect(r.success).toBe(false);
		expect(r.message).toBe("入力内容に不備があります");
		expect(r.errors?.length).toBeGreaterThan(0);
	});

	it("メール通知失敗でもメイン処理は成功する", async () => {
		setupFirestore();
		sendContactNotification.mockRejectedValue(new Error("smtp down"));
		const r = await submitContactForm(validData);
		expect(r.success).toBe(true);
	});

	it("Firestore 例外は失敗を返す", async () => {
		getFirestore.mockReturnValue({
			collection: vi.fn(() => ({ add: vi.fn().mockRejectedValue(new Error("fs down")) })),
		} as never);
		const r = await submitContactForm(validData);
		expect(r).toEqual({ success: false, message: "お問い合わせの送信に失敗しました" });
	});
});
