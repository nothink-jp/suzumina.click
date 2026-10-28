import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactForm } from "../contact-form";

// vitest.setup.ts のアイコン mock には Send 等が無いので実物を使う
vi.mock("lucide-react", async () => await vi.importActual("lucide-react"));
vi.mock("../../actions", () => ({ submitContactForm: vi.fn() }));
vi.mock("../turnstile-widget", () => ({
	TurnstileWidget: ({ siteKey }: { siteKey: string }) => (
		<div data-testid="turnstile-widget">{siteKey}</div>
	),
}));

describe("ContactForm の Turnstile", () => {
	it("サイトキーがあればウィジェットを出し、トークンが無いうちは送信できない", () => {
		render(<ContactForm turnstileSiteKey="site-key" />);
		expect(screen.getByTestId("turnstile-widget")).toHaveTextContent("site-key");
		expect(screen.getByRole("button", { name: /送信する/ })).toBeDisabled();
	});

	it("サイトキーが無ければ（本番の設定漏れ）送信できないことを表示する", () => {
		render(<ContactForm />);
		expect(screen.queryByTestId("turnstile-widget")).toBeNull();
		expect(screen.getByText(/送信前の確認を読み込めませんでした/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /送信する/ })).toBeDisabled();
	});
});
