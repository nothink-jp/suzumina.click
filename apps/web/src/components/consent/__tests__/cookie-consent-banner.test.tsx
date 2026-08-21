import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgeVerificationProvider } from "@/contexts/age-verification-context";
import { CookieConsentBanner } from "../cookie-consent-banner";

const gtag = vi.fn();

function consentUpdateCalls() {
	return gtag.mock.calls.filter(
		([command, action]) => command === "consent" && action === "update",
	);
}

function saveConsent(data: Record<string, boolean>, savedAt: Date) {
	localStorage.setItem("consent-state", JSON.stringify(data));
	localStorage.setItem("consent-state-date", savedAt.toISOString());
}

function yearsAgo(years: number) {
	const date = new Date();
	date.setFullYear(date.getFullYear() - years);
	return date;
}

function renderBanner() {
	return render(
		<AgeVerificationProvider>
			<CookieConsentBanner />
		</AgeVerificationProvider>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	(window as unknown as { gtag: typeof gtag }).gtag = gtag;
});

describe("CookieConsentBanner", () => {
	it("同意が無ければバナーを出す", () => {
		renderBanner();
		expect(screen.getByRole("button", { name: "許可" })).toBeInTheDocument();
	});

	// SPR-280: 復元の gtag 反映は ConsentModeScript の役割。ここで再 push すると
	// 二重 push・ユーザー操作でない consent_update イベント・consent-state-date の
	// 更新（＝1年の再確認が永久に来ない）が起きていた
	it("有効な同意が保存済みなら、バナーを出さず gtag も保存も触らない", async () => {
		const savedAt = yearsAgo(0);
		saveConsent({ analytics: true, advertising: false, functional: true }, savedAt);
		const listener = vi.fn();
		window.addEventListener("consentUpdate", listener);

		renderBanner();

		expect(screen.queryByRole("button", { name: "許可" })).not.toBeInTheDocument();
		expect(consentUpdateCalls()).toHaveLength(0);
		expect(gtag).not.toHaveBeenCalledWith("event", "consent_update", expect.anything());
		expect(localStorage.getItem("consent-state-date")).toBe(savedAt.toISOString());
		// page_view 再送の契機としての通知だけは残す（page-view-tracker.tsx）
		expect(listener).toHaveBeenCalledTimes(1);
		window.removeEventListener("consentUpdate", listener);
	});

	// クッキー設定パネルの「設定は1年間保存され、期限後に再確認をお願いします」を実際に効かせる
	it("1年より古い同意は未同意扱いでバナーを出し直す", () => {
		saveConsent({ analytics: true, advertising: false, functional: true }, yearsAgo(2));

		renderBanner();

		expect(screen.getByRole("button", { name: "許可" })).toBeInTheDocument();
	});

	it("「許可」は保存し、広告系は denied のまま gtag に反映する", async () => {
		renderBanner();

		await userEvent.click(screen.getByRole("button", { name: "許可" }));

		expect(JSON.parse(localStorage.getItem("consent-state") || "{}")).toEqual({
			functional: true,
			analytics: true,
			advertising: false,
			personalization: true,
		});
		expect(consentUpdateCalls()).toHaveLength(1);
		expect(gtag).toHaveBeenCalledWith(
			"consent",
			"update",
			expect.objectContaining({
				ad_storage: "denied",
				ad_user_data: "denied",
				ad_personalization: "denied",
				analytics_storage: "granted",
				personalization_storage: "granted",
			}),
		);
	});
});
