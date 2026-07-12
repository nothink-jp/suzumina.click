import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	trackCreateError,
	trackCreateStart,
	trackCreateSuccess,
	trackFavoriteToggle,
	trackMarkDraft,
	trackPlayButton,
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
	it("consent 未取得ならイベントを送らない（sendGoogleAnalyticsEvent のゲートを通る）", () => {
		trackPlayButton("ab1");
		trackCreateStart("vid00000001", false);
		expect(gtag).not.toHaveBeenCalled();
	});

	it("play_button: audio_button_id を送る", () => {
		grantAnalyticsConsent();
		trackPlayButton("ab1");
		expect(gtag).toHaveBeenCalledWith("event", "play_button", { audio_button_id: "ab1" });
	});

	it("create ファネル: start / success（from_draft 付き） / error を送る", () => {
		grantAnalyticsConsent();
		trackCreateStart("vid00000001", true);
		trackCreateSuccess({ audioButtonId: "ab1", videoId: "vid00000001", fromDraft: true });
		trackCreateError("vid00000001", "認証エラー");

		expect(gtag).toHaveBeenCalledWith("event", "create_start", {
			video_id: "vid00000001",
			from_draft: true,
		});
		expect(gtag).toHaveBeenCalledWith("event", "create_success", {
			audio_button_id: "ab1",
			video_id: "vid00000001",
			from_draft: true,
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
});
