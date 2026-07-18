import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as events from "@/lib/analytics/events";
import { markLoginFlowStarted } from "@/lib/analytics/login-funnel";
import { LoginErrorTracker } from "../login-error-tracker";

const STORAGE_KEY = "suzumina-login-flow-pending";

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
	sessionStorage.clear();
});

describe("LoginErrorTracker", () => {
	it("error があれば login_error を送り、pending 印を消費する", () => {
		const spy = vi.spyOn(events, "trackLoginError").mockImplementation(() => {});
		markLoginFlowStarted();

		render(<LoginErrorTracker error="AccessDenied" />);

		expect(spy).toHaveBeenCalledWith("AccessDenied");
		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("error が無ければ何もしない（通常の /auth/signin 訪問を誤発火させない）", () => {
		const spy = vi.spyOn(events, "trackLoginError").mockImplementation(() => {});

		render(<LoginErrorTracker />);

		expect(spy).not.toHaveBeenCalled();
	});
});
