import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as events from "@/lib/analytics/events";
import { DiscordSignInButton } from "../discord-signin-button";

const STORAGE_KEY = "suzumina-login-flow-pending";

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
	sessionStorage.clear();
});

describe("DiscordSignInButton", () => {
	it("押下時に login_start を送り、login-funnel の印を付ける", () => {
		const spy = vi.spyOn(events, "trackLoginStart").mockImplementation(() => {});
		render(<DiscordSignInButton className="" label="Discordでログイン" />);

		fireEvent.click(screen.getByRole("button", { name: /Discordでログイン/i }));

		expect(spy).toHaveBeenCalledWith("discord");
		expect(sessionStorage.getItem(STORAGE_KEY)).toBe("1");
	});
});
