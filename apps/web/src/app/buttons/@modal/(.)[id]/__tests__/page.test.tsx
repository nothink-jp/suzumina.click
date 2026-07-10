import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InterceptedAudioButtonPage from "../page";

vi.mock("@/app/buttons/actions", () => ({
	getAudioButtonById: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

// 詳細コンテンツ本体（server component ツリー）はモーダル配線の検証には不要
vi.mock("@/components/audio-button-detail", () => ({
	AudioButtonDetailMainContent: ({ audioButton }: { audioButton: { buttonText: string } }) => (
		<div data-testid="main-content">{audioButton.buttonText}</div>
	),
}));

import { getAudioButtonById } from "@/app/buttons/actions";

const mockGet = vi.mocked(getAudioButtonById);

describe("InterceptedAudioButtonPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("取得成功時はモーダルに詳細コンテンツを描画する", async () => {
		mockGet.mockResolvedValue({
			success: true,
			data: { id: "abc123", buttonText: "テストボタン" },
		} as Awaited<ReturnType<typeof getAudioButtonById>>);

		render(await InterceptedAudioButtonPage({ params: Promise.resolve({ id: "abc123" }) }));

		expect(screen.getByTestId("main-content")).toHaveTextContent("テストボタン");
		expect(screen.getByRole("link", { name: /ページで開く/ })).toHaveAttribute(
			"href",
			"/buttons/abc123",
		);
	});

	it("取得失敗（success=false）時は null を返しモーダルを重ねない", async () => {
		mockGet.mockResolvedValue({ success: false, error: "not found" } as Awaited<
			ReturnType<typeof getAudioButtonById>
		>);

		const element = await InterceptedAudioButtonPage({
			params: Promise.resolve({ id: "missing" }),
		});
		expect(element).toBeNull();
	});

	it("取得が reject しても throw せず null を返す", async () => {
		mockGet.mockRejectedValue(new Error("firestore down"));

		const element = await InterceptedAudioButtonPage({
			params: Promise.resolve({ id: "abc123" }),
		});
		expect(element).toBeNull();
	});
});
