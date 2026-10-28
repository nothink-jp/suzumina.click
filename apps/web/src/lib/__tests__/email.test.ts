import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
	Resend: class {
		emails = { send };
	},
}));
vi.mock("../logger", () => ({ error: vi.fn() }));

const { sendContactNotification } = await import("../email");

const base = {
	category: "bug",
	subject: "件名",
	content: "本文です",
	ipAddress: "1.2.3.4",
	userAgent: "UA/1.0",
	timestamp: "2026-10-28T00:00:00.000Z",
};

const sentMail = () => send.mock.calls[0]?.[0] as { html: string; text: string; subject: string };

beforeEach(() => {
	send.mockReset();
	send.mockResolvedValue({ id: "mail1" });
});

describe("sendContactNotification", () => {
	it("件名・本文の <script> / <a href> は HTML 版でエスケープされる（SPR-335）", async () => {
		const ok = await sendContactNotification({
			...base,
			subject: "<script>alert(1)</script>",
			content: '<a href="https://evil.example">click</a>',
		});
		expect(ok).toBe(true);
		const { html } = sentMail();
		expect(html).not.toContain("<script>");
		expect(html).not.toContain("<a href");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(html).toContain("&lt;a href=&quot;https://evil.example&quot;&gt;click&lt;/a&gt;");
	});

	it("User-Agent など送信者が決められる他の値も HTML 版でエスケープされる", async () => {
		await sendContactNotification({ ...base, userAgent: "<img src=x onerror=alert(1)>" });
		expect(sentMail().html).not.toContain("<img");
	});

	it("テキスト版は生のまま入る", async () => {
		await sendContactNotification({ ...base, subject: "<b>太字</b>" });
		expect(sentMail().text).toContain("件名: <b>太字</b>");
	});

	it("送信失敗は false を返す", async () => {
		send.mockRejectedValue(new Error("resend down"));
		expect(await sendContactNotification(base)).toBe(false);
	});
});
