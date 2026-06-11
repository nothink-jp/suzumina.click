import type { FrontendUserData } from "@suzumina.click/shared-types";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnifiedSettingsContent } from "../unified-settings-content";

const { updateAgeVerification, resetAllConsent, updateUserProfile, getCurrentConsentState } =
	vi.hoisted(() => ({
		updateAgeVerification: vi.fn(),
		resetAllConsent: vi.fn(),
		updateUserProfile: vi.fn(),
		getCurrentConsentState: vi.fn(() => null),
	}));

// このコンポーネントが使う lucide アイコンはグローバルモックに揃っていないため、
// 必要なアイコンを no-op コンポーネントとして明示的に上書きする
vi.mock("lucide-react", () => {
	const Icon = () => null;
	return {
		Calendar: Icon,
		ChevronRight: Icon,
		Cookie: Icon,
		Eye: Icon,
		EyeOff: Icon,
		Info: Icon,
		Lock: Icon,
		RotateCcw: Icon,
		Settings: Icon,
		Shield: Icon,
		User: Icon,
		UserCheck: Icon,
	};
});
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/contexts/age-verification-context", () => ({
	useAgeVerification: () => ({ isAdult: true, updateAgeVerification }),
}));
vi.mock("@/lib/consent/google-consent-mode", () => ({
	getCurrentConsentState,
	resetAllConsent,
}));
vi.mock("../../actions", () => ({ updateUserProfile }));

const user = {
	discordId: "123",
	username: "tester",
	displayName: "テスター",
	isPublicProfile: true,
} as unknown as FrontendUserData;

describe("UnifiedSettingsContent のリセット挙動（SPR-177）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"confirm",
			vi.fn(() => true),
		);
	});

	it("リセットはブラウザローカル設定のみ初期化し、サーバープロフィールを更新しない", async () => {
		render(<UnifiedSettingsContent user={user} />);

		const resetButton = await screen.findByRole("button", { name: /ブラウザ設定をリセット/ });
		fireEvent.click(resetButton);

		// ブラウザローカル設定（年齢確認・Cookie同意）はリセットされる
		expect(updateAgeVerification).toHaveBeenCalledWith(false);
		expect(resetAllConsent).toHaveBeenCalledTimes(1);
		// サーバー永続のプロフィール設定には触れない（旧実装の偽リセットを解消）
		expect(updateUserProfile).not.toHaveBeenCalled();
	});

	it("confirm をキャンセルすると何もしない", async () => {
		vi.stubGlobal(
			"confirm",
			vi.fn(() => false),
		);
		render(<UnifiedSettingsContent user={user} />);

		const resetButton = await screen.findByRole("button", { name: /ブラウザ設定をリセット/ });
		fireEvent.click(resetButton);

		expect(updateAgeVerification).not.toHaveBeenCalled();
		expect(resetAllConsent).not.toHaveBeenCalled();
		expect(updateUserProfile).not.toHaveBeenCalled();
	});
});
