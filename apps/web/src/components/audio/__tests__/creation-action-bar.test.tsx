import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreationActionBar } from "../creation-action-bar";

describe("CreationActionBar", () => {
	const defaultProps = {
		startTime: 65.5,
		endTime: 75.5,
		disabledReason: null,
		isCreating: false,
		continueLabel: "作成して次を切り抜く",
		onCancel: vi.fn(),
		onCreate: vi.fn(),
		onCreateAndContinue: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("開始・終了・長さが表示される", () => {
		render(<CreationActionBar {...defaultProps} />);

		expect(screen.getByText("1:05.5")).toBeInTheDocument();
		expect(screen.getByText("1:15.5")).toBeInTheDocument();
		expect(screen.getByText("10.0秒")).toBeInTheDocument();
	});

	it("無効な範囲では長さが — になる", () => {
		render(<CreationActionBar {...defaultProps} startTime={10} endTime={5} />);

		expect(screen.getByText("—")).toBeInTheDocument();
	});

	it("押せない理由があると表示され、作成系ボタンが無効になる", () => {
		render(
			<CreationActionBar {...defaultProps} disabledReason="タイトルを入力すると作成できます" />,
		);

		expect(screen.getByText("タイトルを入力すると作成できます")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /音声ボタンを作成/ })).toBeDisabled();
		expect(screen.getByRole("button", { name: "作成して次を切り抜く" })).toBeDisabled();
		// キャンセルは押せる
		expect(screen.getByRole("button", { name: "キャンセル" })).toBeEnabled();
	});

	it("理由が無ければ表示されず、作成ボタンが有効", () => {
		render(<CreationActionBar {...defaultProps} />);

		expect(screen.queryByText(/作成できます/)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /音声ボタンを作成/ })).toBeEnabled();
	});

	it("continueLabel で副アクションの文字だけがモードに応じて変わる（段4）", () => {
		render(<CreationActionBar {...defaultProps} continueLabel="作成して次の下書きへ（残り6）" />);

		expect(
			screen.getByRole("button", { name: "作成して次の下書きへ（残り6）" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "作成して次を切り抜く" })).not.toBeInTheDocument();
	});

	it("作成中は全ボタンが無効になり「作成中...」表示になる", () => {
		render(<CreationActionBar {...defaultProps} isCreating />);

		expect(screen.getByRole("button", { name: /作成中/ })).toBeDisabled();
		expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "作成して次を切り抜く" })).toBeDisabled();
	});

	it("各ボタンでコールバックが呼ばれる", async () => {
		const user = userEvent.setup();
		render(<CreationActionBar {...defaultProps} />);

		await user.click(screen.getByRole("button", { name: "キャンセル" }));
		expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: "作成して次を切り抜く" }));
		expect(defaultProps.onCreateAndContinue).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("button", { name: /音声ボタンを作成/ }));
		expect(defaultProps.onCreate).toHaveBeenCalledTimes(1);
	});
});
