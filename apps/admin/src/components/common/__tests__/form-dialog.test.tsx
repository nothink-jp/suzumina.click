import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormDialog } from "../form-dialog";

// Mock router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: vi.fn(),
	}),
}));

describe("FormDialog", () => {
	const mockOnSave = vi.fn();
	const mockFields = [
		{
			key: "title",
			label: "タイトル",
			type: "text" as const,
			value: "初期値",
		},
		{
			key: "description",
			label: "説明",
			type: "textarea" as const,
			value: "初期説明",
		},
		{
			key: "count",
			label: "数量",
			type: "number" as const,
			value: 10,
		},
		{
			key: "status",
			label: "状態",
			type: "select" as const,
			value: "active",
			options: [
				{ value: "active", label: "アクティブ" },
				{ value: "inactive", label: "非アクティブ" },
			],
		},
	];

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders trigger button with default text", () => {
		render(
			<FormDialog
				title="編集"
				description="フォームを編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		expect(screen.getByRole("button", { name: /編集/ })).toBeInTheDocument();
	});

	it("renders trigger button with custom text", () => {
		render(
			<FormDialog
				title="編集"
				description="フォームを編集"
				fields={mockFields}
				onSave={mockOnSave}
				triggerText="カスタム編集"
			/>,
		);

		expect(screen.getByRole("button", { name: /カスタム編集/ })).toBeInTheDocument();
	});

	it("opens dialog and shows form fields", async () => {
		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("編集フォーム")).toBeInTheDocument();
			expect(screen.getByText("情報を編集")).toBeInTheDocument();
			expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
			expect(screen.getByLabelText("説明")).toBeInTheDocument();
			expect(screen.getByLabelText("数量")).toBeInTheDocument();
			expect(screen.getByLabelText("状態")).toBeInTheDocument();
		});
	});

	it("displays initial field values", async () => {
		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByDisplayValue("初期値")).toBeInTheDocument();
			expect(screen.getByDisplayValue("初期説明")).toBeInTheDocument();
			expect(screen.getByDisplayValue("10")).toBeInTheDocument();
			// Select field value check
			const selectElement = screen.getByLabelText("状態") as HTMLSelectElement;
			expect(selectElement.value).toBe("active");
		});
	});

	it("allows editing form fields", async () => {
		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
		});

		const titleInput = screen.getByLabelText("タイトル");
		fireEvent.change(titleInput, { target: { value: "新しいタイトル" } });

		expect(screen.getByDisplayValue("新しいタイトル")).toBeInTheDocument();
	});

	it("calls onSave with form data when save button is clicked", async () => {
		mockOnSave.mockResolvedValue(true);

		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("編集フォーム")).toBeInTheDocument();
		});

		const titleInput = screen.getByLabelText("タイトル");
		fireEvent.change(titleInput, { target: { value: "更新されたタイトル" } });

		const saveButton = screen.getByRole("button", { name: "保存" });
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(mockOnSave).toHaveBeenCalledWith({
				title: "更新されたタイトル",
				description: "初期説明",
				count: 10,
				status: "active",
			});
		});
	});

	it("shows loading state during save", async () => {
		const slowSave = vi.fn(
			(): Promise<boolean> => new Promise((resolve) => setTimeout(() => resolve(true), 100)),
		);

		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={slowSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("編集フォーム")).toBeInTheDocument();
		});

		const saveButton = screen.getByRole("button", { name: "保存" });
		fireEvent.click(saveButton);

		// Loading state should be visible
		expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
	});

	it("closes dialog on cancel", async () => {
		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByText("編集フォーム")).toBeInTheDocument();
		});

		const cancelButton = screen.getByRole("button", { name: "キャンセル" });
		fireEvent.click(cancelButton);

		// Dialog should close
		await waitFor(() => {
			expect(screen.queryByText("編集フォーム")).not.toBeInTheDocument();
		});
	});

	it("handles number field type correctly", async () => {
		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByLabelText("数量")).toBeInTheDocument();
		});

		const numberInput = screen.getByLabelText("数量");
		fireEvent.change(numberInput, { target: { value: "25" } });

		expect(screen.getByDisplayValue("25")).toBeInTheDocument();
	});

	it("renders select field with options", async () => {
		render(
			<FormDialog
				title="編集フォーム"
				description="情報を編集"
				fields={mockFields}
				onSave={mockOnSave}
			/>,
		);

		const triggerButton = screen.getByRole("button", { name: /編集/ });
		fireEvent.click(triggerButton);

		await waitFor(() => {
			expect(screen.getByLabelText("状態")).toBeInTheDocument();
		});

		const selectElement = screen.getByLabelText("状態");
		expect(selectElement).toBeInTheDocument();
		expect(screen.getByText("アクティブ")).toBeInTheDocument();
		expect(screen.getByText("非アクティブ")).toBeInTheDocument();
	});
});
