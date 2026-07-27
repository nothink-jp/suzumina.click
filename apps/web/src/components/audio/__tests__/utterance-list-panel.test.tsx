import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UtteranceListPanel } from "../utterance-list-panel";

describe("UtteranceListPanel", () => {
	const utterances = [
		{ start: 601.5, end: 603.5, text: "こんにちは" },
		{ start: 605, end: 607, text: "今日はゲームやるよ" },
	];
	const defaultProps = {
		utterances,
		loadedRanges: [{ start: 600, end: 1200 }],
		isLoading: false,
		error: null,
		currentTime: 700,
		isLoadedAt: vi.fn(() => true),
		onLoadAt: vi.fn(),
		onSelect: vi.fn(),
		onLoadAllCached: vi.fn(),
		hasLoadedAllCached: false,
		onSearchHitsChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("発話リストが時刻・テキスト・長さつきで表示される", () => {
		render(<UtteranceListPanel {...defaultProps} />);

		expect(screen.getByText("セリフから選ぶ")).toBeInTheDocument();
		expect(screen.getByText("こんにちは")).toBeInTheDocument();
		expect(screen.getByText("10:01")).toBeInTheDocument();
		expect(screen.getAllByText("2.0秒")).toHaveLength(2);
		expect(screen.getByText(/読み込み済み: 10:00〜20:00/)).toBeInTheDocument();
	});

	it("行クリックで onSelect が呼ばれる（Shift で extend）", () => {
		render(<UtteranceListPanel {...defaultProps} />);

		const rows = screen.getAllByTestId("utterance-row");
		fireEvent.click(rows[0]!);
		expect(defaultProps.onSelect).toHaveBeenCalledWith(utterances[0], false);

		fireEvent.click(rows[1]!, { shiftKey: true });
		expect(defaultProps.onSelect).toHaveBeenCalledWith(utterances[1], true);
	});

	it("未読み込み位置では読み込みボタンが出て onLoadAt が呼ばれる", () => {
		const isLoadedAt = vi.fn(() => false);
		render(<UtteranceListPanel {...defaultProps} isLoadedAt={isLoadedAt} />);

		const button = screen.getByRole("button", { name: /再生位置の周辺の発話を読み込む/ });
		fireEvent.click(button);
		expect(defaultProps.onLoadAt).toHaveBeenCalledWith(700);
	});

	it("読み込み中は進捗表示になり読み込みボタンは出ない", () => {
		render(<UtteranceListPanel {...defaultProps} isLoading isLoadedAt={() => false} />);

		expect(screen.getByText(/初回は30秒ほどかかります/)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /再生位置の周辺の発話を読み込む/ }),
		).not.toBeInTheDocument();
	});

	it("エラーが表示される", () => {
		render(<UtteranceListPanel {...defaultProps} error="文字起こしの取得に失敗しました" />);

		expect(screen.getByText("文字起こしの取得に失敗しました")).toBeInTheDocument();
	});

	it("disabled 中は行・ボタンとも無効", () => {
		render(<UtteranceListPanel {...defaultProps} disabled isLoadedAt={() => false} />);

		for (const row of screen.getAllByTestId("utterance-row")) {
			expect(row).toBeDisabled();
		}
		expect(screen.getByRole("button", { name: /再生位置の周辺の発話を読み込む/ })).toBeDisabled();
	});

	describe("セリフ検索 (SPR-293)", () => {
		it("検索でかな正規化の部分一致に絞り込み、ヒット位置を通知する", () => {
			render(<UtteranceListPanel {...defaultProps} hasLoadedAllCached />);

			const input = screen.getByPlaceholderText(/セリフで探す/);
			// カタカナ入力でもひらがな発話にヒットする
			fireEvent.change(input, { target: { value: "コンニチハ" } });

			expect(screen.getAllByTestId("utterance-row")).toHaveLength(1);
			expect(screen.getByText("こんにちは")).toBeInTheDocument();
			expect(screen.getByText(/1件ヒット/)).toBeInTheDocument();
			expect(defaultProps.onSearchHitsChange).toHaveBeenLastCalledWith([601.5]);
		});

		it("検索を消すと全件表示に戻りヒット通知は空になる", () => {
			render(<UtteranceListPanel {...defaultProps} hasLoadedAllCached />);

			const input = screen.getByPlaceholderText(/セリフで探す/);
			fireEvent.change(input, { target: { value: "こんにちは" } });
			fireEvent.change(input, { target: { value: "" } });

			expect(screen.getAllByTestId("utterance-row")).toHaveLength(2);
			expect(defaultProps.onSearchHitsChange).toHaveBeenLastCalledWith([]);
		});

		it("初回の検索入力でキャッシュ済み全チャンクの読み込みが走る", () => {
			render(<UtteranceListPanel {...defaultProps} />);

			fireEvent.change(screen.getByPlaceholderText(/セリフで探す/), {
				target: { value: "あはは" },
			});

			expect(defaultProps.onLoadAllCached).toHaveBeenCalled();
			expect(screen.getByText(/全編読み込み中/)).toBeInTheDocument();
		});

		it("読み込み済みなら再読み込みしない", () => {
			render(<UtteranceListPanel {...defaultProps} hasLoadedAllCached />);

			fireEvent.change(screen.getByPlaceholderText(/セリフで探す/), {
				target: { value: "あはは" },
			});

			expect(defaultProps.onLoadAllCached).not.toHaveBeenCalled();
			expect(screen.getByText("ヒットなし")).toBeInTheDocument();
		});
	});
});
