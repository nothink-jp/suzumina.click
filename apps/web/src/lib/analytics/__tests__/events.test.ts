import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CREATE_ENTRY } from "../create-entry";
import {
	trackCreateError,
	trackCreateStart,
	trackCreateSuccess,
	trackFavoriteToggle,
	trackLoginError,
	trackLoginStart,
	trackLoginSuccess,
	trackMarkDraft,
	trackPlayButton,
	trackSuggestionApply,
	trackSuggestionGenerate,
} from "../events";

const gtag = vi.fn();

function grantAnalyticsConsent() {
	localStorage.setItem("consent-state", JSON.stringify({ analytics: true }));
}

beforeEach(() => {
	vi.clearAllMocks();
	(window as unknown as { gtag: typeof gtag }).gtag = gtag;
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

describe("GA4 カスタムイベント語彙 (SPR-149)", () => {
	// SPR-299: consent ゲートは撤廃済み。同意の有無で送信可否は変わらず、
	// Cookie/識別子の可否だけが GA4 の consent mode 側で切り替わる。
	it("consent 未取得でもイベントを送る（ゲートは撤廃済み）", () => {
		trackPlayButton("ab1");
		trackCreateStart({ videoId: "vid00000001", fromDraft: false, entry: CREATE_ENTRY.detailClip });
		expect(gtag).toHaveBeenCalledWith("event", "play_button", { audio_button_id: "ab1" });
		expect(gtag).toHaveBeenCalledWith("event", "create_start", {
			video_id: "vid00000001",
			from_draft: false,
			create_entry: "detail_clip",
		});
	});

	it("play_button: audio_button_id を送る", () => {
		grantAnalyticsConsent();
		trackPlayButton("ab1");
		expect(gtag).toHaveBeenCalledWith("event", "play_button", { audio_button_id: "ab1" });
	});

	it("create ファネル: start / success（from_draft・create_entry 付き） / error を送る", () => {
		grantAnalyticsConsent();
		trackCreateStart({ videoId: "vid00000001", fromDraft: true, entry: CREATE_ENTRY.watchBulk });
		trackCreateSuccess({
			audioButtonId: "ab1",
			videoId: "vid00000001",
			fromDraft: true,
			entry: CREATE_ENTRY.watchBulk,
		});
		trackCreateError("vid00000001", "認証エラー");

		expect(gtag).toHaveBeenCalledWith("event", "create_start", {
			video_id: "vid00000001",
			from_draft: true,
			create_entry: "watch_bulk",
		});
		expect(gtag).toHaveBeenCalledWith("event", "create_success", {
			audio_button_id: "ab1",
			video_id: "vid00000001",
			from_draft: true,
			create_entry: "watch_bulk",
		});
		expect(gtag).toHaveBeenCalledWith("event", "create_error", {
			video_id: "vid00000001",
			reason: "認証エラー",
		});
	});

	it("create_error: reason は GA4 のパラメータ上限（100文字）に切り詰める", () => {
		grantAnalyticsConsent();
		trackCreateError("vid00000001", "x".repeat(150));
		const call = gtag.mock.calls.find((c) => c[1] === "create_error");
		expect((call?.[2] as { reason: string } | undefined)?.reason).toHaveLength(100);
	});

	it("favorite: 追加/削除でイベント名を分ける", () => {
		grantAnalyticsConsent();
		trackFavoriteToggle("ab1", true);
		trackFavoriteToggle("ab1", false);
		expect(gtag).toHaveBeenCalledWith("event", "add_to_favorite", { audio_button_id: "ab1" });
		expect(gtag).toHaveBeenCalledWith("event", "remove_from_favorite", {
			audio_button_id: "ab1",
		});
	});

	it("mark_draft: 壁時計のみモードを has_player_time=false で区別する", () => {
		grantAnalyticsConsent();
		trackMarkDraft("vid00000001", false);
		expect(gtag).toHaveBeenCalledWith("event", "mark_draft", {
			video_id: "vid00000001",
			has_player_time: false,
		});
	});

	it("ログインファネル: start / success / error を送る", () => {
		grantAnalyticsConsent();
		trackLoginStart("discord");
		trackLoginSuccess("discord");
		trackLoginError("AccessDenied");

		expect(gtag).toHaveBeenCalledWith("event", "login_start", { provider: "discord" });
		expect(gtag).toHaveBeenCalledWith("event", "login_success", { provider: "discord" });
		expect(gtag).toHaveBeenCalledWith("event", "login_error", { reason: "AccessDenied" });
	});

	it("login_error: reason は GA4 のパラメータ上限（100文字）に切り詰める", () => {
		grantAnalyticsConsent();
		trackLoginError("x".repeat(150));
		const call = gtag.mock.calls.find((c) => c[1] === "login_error");
		expect((call?.[2] as { reason: string } | undefined)?.reason).toHaveLength(100);
	});

	it("suggestion_generate (SPR-148): 成功時は reason なし、失敗時は reason を送る", () => {
		grantAnalyticsConsent();
		trackSuggestionGenerate({ videoId: "vid00000001", success: true });
		trackSuggestionGenerate({
			videoId: "vid00000001",
			success: false,
			reason: "ログインが必要です",
		});

		expect(gtag).toHaveBeenCalledWith("event", "suggestion_generate", {
			video_id: "vid00000001",
			success: true,
		});
		expect(gtag).toHaveBeenCalledWith("event", "suggestion_generate", {
			video_id: "vid00000001",
			success: false,
			reason: "ログインが必要です",
		});
	});

	it("suggestion_generate: reason は GA4 のパラメータ上限（100文字）に切り詰める", () => {
		grantAnalyticsConsent();
		trackSuggestionGenerate({ videoId: "vid00000001", success: false, reason: "x".repeat(150) });
		const call = gtag.mock.calls.find((c) => c[1] === "suggestion_generate");
		expect((call?.[2] as { reason: string } | undefined)?.reason).toHaveLength(100);
	});

	it("suggestion_apply: target(title/tag) で内訳を分ける", () => {
		grantAnalyticsConsent();
		trackSuggestionApply("vid00000001", "title");
		trackSuggestionApply("vid00000001", "tag");

		expect(gtag).toHaveBeenCalledWith("event", "suggestion_apply", {
			video_id: "vid00000001",
			target: "title",
		});
		expect(gtag).toHaveBeenCalledWith("event", "suggestion_apply", {
			video_id: "vid00000001",
			target: "tag",
		});
	});
});
