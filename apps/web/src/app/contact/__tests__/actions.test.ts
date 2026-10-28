import type { ContactFormData } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitContactForm } from "../actions";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendContactNotification: vi.fn() }));
vi.mock("@/lib/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn() }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: vi.fn() }));

const { headers } = vi.mocked(await import("next/headers"));
const { sendContactNotification } = vi.mocked(await import("@/lib/email"));
const { getFirestore } = vi.mocked(await import("@/lib/firestore"));
const { verifyTurnstileToken } = vi.mocked(await import("@/lib/turnstile"));

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
		get: (k: string) =>
			({ "x-forwarded-for": "1.2.3.4, 5.6.7.8", "user-agent": "UA/1.0" })[k] ?? null,
	} as never);
	sendContactNotification.mockResolvedValue(true);
	verifyTurnstileToken.mockResolvedValue(true);
});

describe("submitContactForm", () => {
	it("正常送信で Firestore 保存・メール通知・id 返却", async () => {
		const { add } = setupFirestore();
		const r = await submitContactForm(validData, "tok");
		expect(r).toEqual({ success: true, message: "お問い合わせを受け付けました", id: "doc1" });
		// cf-connecting-ip が無ければ x-forwarded-for の先頭。admin 時代の status/priority は書かない（SPR-241）
		expect(add).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: "1.2.3.4" }));
		expect(add).toHaveBeenCalledWith(expect.not.objectContaining({ status: expect.anything() }));
		expect(sendContactNotification).toHaveBeenCalled();
	});

	it("cf-connecting-ip があれば偽装可能な x-forwarded-for より優先する（SPR-335）", async () => {
		const { add } = setupFirestore();
		const values: Record<string, string> = {
			"cf-connecting-ip": "9.9.9.9",
			"x-forwarded-for": "6.6.6.6, 9.9.9.9",
		};
		headers.mockResolvedValue({ get: (k: string) => values[k] ?? null } as never);
		await submitContactForm(validData, "tok");
		expect(add).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: "9.9.9.9" }));
	});

	it("Turnstile の検証に通らなければ保存もメール送信もしない（SPR-398）", async () => {
		const { add } = setupFirestore();
		verifyTurnstileToken.mockResolvedValue(false);
		const r = await submitContactForm(validData, "bad");
		expect(r).toEqual({
			success: false,
			message: "送信前の確認に失敗しました。もう一度お試しください",
		});
		expect(verifyTurnstileToken).toHaveBeenCalledWith("bad", "1.2.3.4");
		expect(add).not.toHaveBeenCalled();
		expect(sendContactNotification).not.toHaveBeenCalled();
	});

	it("バリデーション失敗（短い content）は errors を返す", async () => {
		const r = await submitContactForm({ ...validData, content: "短い" }, "tok");
		expect(r.success).toBe(false);
		expect(r.message).toBe("入力内容に不備があります");
		expect(r.errors?.length).toBeGreaterThan(0);
	});

	it("メール通知失敗（false）でもメイン処理は成功する", async () => {
		setupFirestore();
		sendContactNotification.mockResolvedValue(false);
		const r = await submitContactForm(validData, "tok");
		expect(r.success).toBe(true);
	});

	it("Firestore 例外は失敗を返す", async () => {
		getFirestore.mockReturnValue({
			collection: vi.fn(() => ({ add: vi.fn().mockRejectedValue(new Error("fs down")) })),
		} as never);
		const r = await submitContactForm(validData, "tok");
		expect(r).toEqual({ success: false, message: "お問い合わせの送信に失敗しました" });
	});
});
