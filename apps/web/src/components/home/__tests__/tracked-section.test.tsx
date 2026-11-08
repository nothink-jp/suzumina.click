import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrackedSection } from "../tracked-section";

const gtag = vi.fn();

/** IntersectionObserver を手動で発火できる最小のスタブ（本物と同じく disconnect 後は呼ばれない） */
let observerCallback: IntersectionObserverCallback | null = null;
const disconnect = vi.fn(() => {
	observerCallback = null;
});

class StubIntersectionObserver {
	constructor(callback: IntersectionObserverCallback) {
		observerCallback = callback;
	}
	observe() {}
	disconnect = disconnect;
}

function intersect(isIntersecting: boolean) {
	act(() => {
		observerCallback?.(
			[{ isIntersecting } as IntersectionObserverEntry],
			{} as IntersectionObserver,
		);
	});
}

function sectionViewCalls() {
	return gtag.mock.calls.filter((call) => call[1] === "section_view");
}

beforeEach(() => {
	vi.clearAllMocks();
	observerCallback = null;
	vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
	(window as unknown as { gtag: typeof gtag }).gtag = gtag;
	window.gaConfigured = true;
});

afterEach(() => {
	vi.unstubAllGlobals();
	window.gaConfigured = undefined;
});

describe("TrackedSection", () => {
	it("画面の上半分に入ったら section_view を 1 回だけ送る", () => {
		render(
			<TrackedSection section="videos">
				<p>動画</p>
			</TrackedSection>,
		);

		intersect(false);
		expect(sectionViewCalls()).toHaveLength(0);

		intersect(true);
		intersect(true);
		expect(sectionViewCalls()).toEqual([["event", "section_view", { section: "videos" }]]);
		expect(disconnect).toHaveBeenCalled();
	});

	it("GA の config 完了前に見えたら、gaConfigured を待って送る（SPR-317 の欠測を避ける）", () => {
		window.gaConfigured = undefined;
		render(
			<TrackedSection section="hero">
				<p>ヒーロー</p>
			</TrackedSection>,
		);

		intersect(true);
		expect(sectionViewCalls()).toHaveLength(0);

		act(() => {
			window.gaConfigured = true;
			window.dispatchEvent(new Event("gaConfigured"));
		});
		expect(sectionViewCalls()).toEqual([["event", "section_view", { section: "hero" }]]);
	});

	it("子孫のリンクのクリックを、丸めた行き先つきの section_click で送る", () => {
		render(
			<TrackedSection section="works">
				<a href="/works/RJ01679795">
					<span>作品カード</span>
				</a>
			</TrackedSection>,
		);

		fireEvent.click(screen.getByText("作品カード"));
		expect(gtag).toHaveBeenCalledWith("event", "section_click", {
			section: "works",
			destination: "/works/:id",
		});
	});

	it("リンクでない要素（再生ボタンなど）のクリックは送らない", () => {
		render(
			<TrackedSection section="audio_buttons">
				<button type="button">再生</button>
			</TrackedSection>,
		);

		fireEvent.click(screen.getByRole("button", { name: "再生" }));
		expect(gtag.mock.calls.filter((call) => call[1] === "section_click")).toHaveLength(0);
	});

	it("IntersectionObserver が無い環境でも描画できる（section_view は送らない）", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		render(
			<TrackedSection section="community">
				<p>コミュニティ</p>
			</TrackedSection>,
		);

		expect(screen.getByText("コミュニティ")).toBeInTheDocument();
		expect(sectionViewCalls()).toHaveLength(0);
	});
});
