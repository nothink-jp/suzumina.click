import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "../contact-form";

// vitest.setup.ts のアイコン mock には Send 等が無いので実物を使う
vi.mock("lucide-react", async () => await vi.importActual("lucide-react"));
vi.mock("../../actions", () => ({ submitContactForm: vi.fn() }));
// 種別 Select はポップアップ操作が happy-dom で重いので、値を選ぶボタンだけの代用品にする
vi.mock("@suzumina.click/ui/components/ui/select", () => ({
	Select: ({
		onValueChange,
		children,
	}: {
		onValueChange: (v: string) => void;
		children: React.ReactNode;
	}) => (
		<div>
			<button type="button" onClick={() => onValueChange("bug")}>
				種別にバグ報告を選ぶ
			</button>
			{children}
		</div>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
	SelectContent: () => null,
	SelectItem: () => null,
}));

// 描画のたびに最新の onTokenChange を控え、テストからトークン発行を模す
let emitToken: ((token: string | null) => void) | undefined;
vi.mock("../turnstile-widget", () => ({
	TurnstileWidget: ({
		siteKey,
		onTokenChange,
	}: {
		siteKey: string;
		onTokenChange: (token: string | null) => void;
	}) => {
		emitToken = onTokenChange;
		return <div data-testid="turnstile-widget">{siteKey}</div>;
	},
}));

const { submitContactForm } = vi.mocked(await import("../../actions"));

const submitButton = () => screen.getByRole("button", { name: /送信する/ });

const fillForm = (container: HTMLElement) => {
	fireEvent.click(screen.getByRole("button", { name: "種別にバグ報告を選ぶ" }));
	fireEvent.input(screen.getByPlaceholderText("例: 音声ボタンが再生されない"), {
		target: { value: "件名" },
	});
	fireEvent.input(container.querySelector("textarea") as HTMLTextAreaElement, {
		target: { value: "十分な長さの本文です。" },
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	emitToken = undefined;
});

describe("ContactForm の Turnstile", () => {
	it("サイトキーがあればウィジェットを出し、トークンが無いうちは送信できない", () => {
		render(<ContactForm turnstileSiteKey="site-key" />);
		expect(screen.getByTestId("turnstile-widget")).toHaveTextContent("site-key");
		expect(submitButton()).toBeDisabled();
	});

	it("サイトキーが無ければ（本番の設定漏れ）送信できないことを表示する", () => {
		render(<ContactForm />);
		expect(screen.queryByTestId("turnstile-widget")).toBeNull();
		expect(screen.getByText(/送信前の確認を読み込めませんでした/)).toBeInTheDocument();
		expect(submitButton()).toBeDisabled();
	});

	it("送信成功後に新しいお問い合わせへ戻っても、使用済みトークンでは送信できない", async () => {
		submitContactForm.mockResolvedValue({ success: true, message: "ok", id: "doc1" });
		const { container } = render(<ContactForm turnstileSiteKey="site-key" />);

		fillForm(container);
		act(() => emitToken?.("used-token"));
		await waitFor(() => expect(submitButton()).toBeEnabled());

		fireEvent.click(submitButton());
		await screen.findByText("送信完了");
		expect(submitContactForm).toHaveBeenCalledWith(
			expect.objectContaining({ subject: "件名" }),
			"used-token",
		);

		fireEvent.click(screen.getByRole("button", { name: "新しいお問い合わせを送信" }));
		// 入力を埋め直しても、新しいウィジェットがトークンを出すまでは押せない（使用済みトークンが残っていない）
		fillForm(container);
		await waitFor(() => expect(screen.getByDisplayValue("件名")).toBeInTheDocument());
		expect(submitButton()).toBeDisabled();
		expect(submitButton()).toHaveAttribute("title", "送信前の確認が終わるまでお待ちください");
	});
});
