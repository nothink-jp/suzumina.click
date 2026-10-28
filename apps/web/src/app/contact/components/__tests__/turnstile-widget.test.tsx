import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TurnstileWidget } from "../turnstile-widget";

type RenderOptions = Parameters<NonNullable<Window["turnstile"]>["render"]>[1];

const setup = () => {
	let options: RenderOptions | undefined;
	const api = {
		render: vi.fn((_el: HTMLElement, o: RenderOptions) => {
			options = o;
			return "widget-1";
		}),
		reset: vi.fn(),
		remove: vi.fn(),
	};
	window.turnstile = api;
	return { api, getOptions: () => options };
};

const baseProps = () => ({
	siteKey: "site-key",
	onTokenChange: vi.fn(),
	resetSignal: 0,
	onLoadError: vi.fn(),
});

beforeEach(() => {
	window.turnstile = undefined;
	for (const s of document.head.querySelectorAll("script")) s.remove();
});

afterEach(() => {
	window.turnstile = undefined;
});

describe("TurnstileWidget", () => {
	it("サイトキーで描画し、トークン取得・失効・エラーを親へ伝える", async () => {
		const { api, getOptions } = setup();
		const props = baseProps();
		render(<TurnstileWidget {...props} />);
		await waitFor(() => expect(api.render).toHaveBeenCalled());
		expect(getOptions()?.sitekey).toBe("site-key");

		act(() => getOptions()?.callback("tok"));
		expect(props.onTokenChange).toHaveBeenLastCalledWith("tok");
		act(() => getOptions()?.["expired-callback"]());
		expect(props.onTokenChange).toHaveBeenLastCalledWith(null);
		act(() => getOptions()?.["error-callback"]());
		expect(props.onTokenChange).toHaveBeenLastCalledWith(null);
	});

	it("resetSignal が変わるとトークンを捨ててウィジェットをリセットする", async () => {
		const { api } = setup();
		const props = baseProps();
		const { rerender } = render(<TurnstileWidget {...props} />);
		await waitFor(() => expect(api.render).toHaveBeenCalled());
		expect(api.reset).not.toHaveBeenCalled();

		rerender(<TurnstileWidget {...props} resetSignal={1} />);
		expect(api.reset).toHaveBeenCalledWith("widget-1");
		expect(props.onTokenChange).toHaveBeenLastCalledWith(null);
	});

	it("アンマウントでウィジェットを取り除く", async () => {
		const { api } = setup();
		const { unmount } = render(<TurnstileWidget {...baseProps()} />);
		await waitFor(() => expect(api.render).toHaveBeenCalled());
		unmount();
		expect(api.remove).toHaveBeenCalledWith("widget-1");
	});

	it("api.js の読み込みに失敗したら onLoadError を呼ぶ", async () => {
		const props = baseProps();
		render(<TurnstileWidget {...props} />);
		const script = document.head.querySelector<HTMLScriptElement>(
			'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
		);
		expect(script).not.toBeNull();
		act(() => script?.onerror?.(new Event("error")));
		await waitFor(() => expect(props.onLoadError).toHaveBeenCalled());
	});
});
