import type { UserSession } from "@suzumina.click/shared-types";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as events from "@/lib/analytics/events";
import { markLoginFlowStarted } from "@/lib/analytics/login-funnel";
import { useSessionState } from "@/lib/auth/client";
import { LoginSuccessTracker } from "../login-success-tracker";

vi.mock("@/lib/auth/client");

const mockUser = { discordId: "1", displayName: "テストユーザー" } as UserSession;

function setSessionState(state: { user: UserSession | null; isPending: boolean }) {
	vi.mocked(useSessionState).mockReturnValue(state);
}

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
	sessionStorage.clear();
});

describe("LoginSuccessTracker", () => {
	it("pending 印がある状態でセッション解決＝ログイン成功として login_success を送る", () => {
		const spy = vi.spyOn(events, "trackLoginSuccess").mockImplementation(() => {});
		markLoginFlowStarted();
		setSessionState({ user: mockUser, isPending: false });

		render(<LoginSuccessTracker />);

		expect(spy).toHaveBeenCalledWith("discord");
	});

	it("pending 印が無ければ、ログイン済みでの通常ページ読み込みでは送らない", () => {
		const spy = vi.spyOn(events, "trackLoginSuccess").mockImplementation(() => {});
		setSessionState({ user: mockUser, isPending: false });

		render(<LoginSuccessTracker />);

		expect(spy).not.toHaveBeenCalled();
	});

	it("セッション解決前（isPending）では送らない", () => {
		const spy = vi.spyOn(events, "trackLoginSuccess").mockImplementation(() => {});
		markLoginFlowStarted();
		setSessionState({ user: null, isPending: true });

		render(<LoginSuccessTracker />);

		expect(spy).not.toHaveBeenCalled();
	});

	it("未ログイン（解決済み・user=null）では送らない", () => {
		const spy = vi.spyOn(events, "trackLoginSuccess").mockImplementation(() => {});
		markLoginFlowStarted();
		setSessionState({ user: null, isPending: false });

		render(<LoginSuccessTracker />);

		expect(spy).not.toHaveBeenCalled();
	});
});
