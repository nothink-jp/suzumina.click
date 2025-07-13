import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../confirm-dialog";

// Mock router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: vi.fn(),
	}),
}));

describe("ConfirmDialog", () => {
	const mockOnConfirm = vi.fn();

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders trigger button with default text", () => {
		render(<ConfirmDialog title="Test" description="Test description" onConfirm={mockOnConfirm} />);

		expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
	});

	it("renders trigger button with custom text", () => {
		render(
			<ConfirmDialog
				title="Test"
				description="Test description"
				onConfirm={mockOnConfirm}
				triggerText="カスタム削除"
			/>,
		);

		expect(screen.getByRole("button", { name: /カスタム削除/ })).toBeInTheDocument();
	});

	it("opens dialog when trigger button is clicked", async () => {
		render(<ConfirmDialog title="確認" description="削除しますか？" onConfirm={mockOnConfirm} />);

		const triggerButton = screen.getByRole("button", { name: /削除/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("確認")).toBeInTheDocument();
			expect(screen.getByText("削除しますか？")).toBeInTheDocument();
		});
	});

	it("shows warning text when provided", async () => {
		render(
			<ConfirmDialog
				title="確認"
				description="削除しますか？"
				warningText="この操作は取り消せません"
				onConfirm={mockOnConfirm}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /削除/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("この操作は取り消せません")).toBeInTheDocument();
		});
	});

	it("calls onConfirm when confirm button is clicked", async () => {
		mockOnConfirm.mockResolvedValue(true);

		render(<ConfirmDialog title="確認" description="削除しますか？" onConfirm={mockOnConfirm} />);

		const triggerButton = screen.getByRole("button", { name: /削除/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("確認")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", { name: "削除" });
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(mockOnConfirm).toHaveBeenCalledTimes(1);
		});
	});

	it("shows loading state during confirmation", async () => {
		const slowConfirm = vi.fn(
			(): Promise<boolean> => new Promise((resolve) => setTimeout(() => resolve(true), 100)),
		);

		render(<ConfirmDialog title="確認" description="削除しますか？" onConfirm={slowConfirm} />);

		const triggerButton = screen.getByRole("button", { name: /削除/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("確認")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", { name: "削除" });
		fireEvent.click(confirmButton);

		// Loading state should be visible
		expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();
	});

	it("closes dialog on cancel", async () => {
		render(<ConfirmDialog title="確認" description="削除しますか？" onConfirm={mockOnConfirm} />);

		const triggerButton = screen.getByRole("button", { name: /削除/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("確認")).toBeInTheDocument();
		});

		const cancelButton = screen.getByRole("button", { name: "キャンセル" });
		fireEvent.click(cancelButton);

		// Dialog should close
		await waitFor(() => {
			expect(screen.queryByText("確認")).not.toBeInTheDocument();
		});
	});

	it("uses custom button texts", async () => {
		render(
			<ConfirmDialog
				title="確認"
				description="削除しますか？"
				onConfirm={mockOnConfirm}
				confirmText="実行"
				cancelText="戻る"
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /削除/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "実行" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "戻る" })).toBeInTheDocument();
		});
	});
});
