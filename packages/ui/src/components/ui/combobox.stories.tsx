import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxInputGroup,
	ComboboxItem,
	ComboboxList,
} from "./combobox";

interface Fruit {
	id: string;
	label: string;
}

const fruits: Fruit[] = [
	{ id: "apple", label: "Apple" },
	{ id: "banana", label: "Banana" },
	{ id: "orange", label: "Orange" },
	{ id: "grape", label: "Grape" },
	{ id: "mango", label: "Mango" },
];

// tag-input.tsx と同じ「選択→即クリア」パターン（value を永続制御しない）。
// value/onValueChange で選択状態を持続表示する古典的な single-select パターンは、
// ポップアップを閉じて選択済み item の DOM が消えた後も Base UI が aria-labelledby で
// その id を参照し続け、dangling reference の a11y 違反になる（Base UI 側の既知挙動）。
// 検索してその場で確定・クリアする用途（本コンポーネントの主眼）ではこの問題が出ない。
function BasicCombobox() {
	const [lastPicked, setLastPicked] = useState<string | null>(null);
	return (
		<div className="w-64 space-y-2">
			<Combobox
				items={fruits}
				itemToStringLabel={(f: Fruit) => f.label}
				onValueChange={(item: Fruit | null) => {
					if (item) setLastPicked(item.label);
				}}
			>
				<ComboboxInputGroup>
					<ComboboxInput aria-label="Choose a fruit" placeholder="Choose a fruit" />
				</ComboboxInputGroup>
				<ComboboxContent>
					<ComboboxEmpty>No fruits found.</ComboboxEmpty>
					<ComboboxList aria-label="Fruit results">
						{(fruit: Fruit) => (
							<ComboboxItem key={fruit.id} value={fruit}>
								{fruit.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			{lastPicked && <p className="text-muted-foreground text-sm">Picked: {lastPicked}</p>}
		</div>
	);
}

const meta = {
	title: "UI/Combobox",
	component: Combobox,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Base UI Combobox（@base-ui/react/combobox）のラッパー。ReUI の Combobox プリミティブは license 必須（401）だったため、shadcn 公式パターンに倣い upstream から直接導入した（ADR-012）。IME composition の安全性は入力実装（ComboboxInput）が Autocomplete と共有する箇所で担保される。",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <BasicCombobox />,
};

export const SelectInteraction: Story = {
	render: () => <BasicCombobox />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// ポップアップ（ComboboxContent）は Portal で document.body 直下に描画されるため、
		// canvasElement スコープではなく document.body を対象にクエリする
		const body = within(document.body);
		const input = canvas.getByRole("combobox") as HTMLInputElement;
		await userEvent.click(input);
		fireEvent.change(input, { target: { value: "Man" } });
		await waitFor(() => expect(body.getByText("Mango")).toBeInTheDocument());
		await userEvent.click(body.getByText("Mango"));
		await waitFor(() => expect(canvas.getByText("Picked: Mango")).toBeInTheDocument());
	},
};

export const ImeCompositionDoesNotCommitOnConfirmEnter: Story = {
	render: () => <BasicCombobox />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByRole("combobox") as HTMLInputElement;
		await userEvent.click(input);

		// IME 変換中は候補フィルタが確定しない（Base UI 内部の isComposingRef ガード）
		fireEvent.compositionStart(input, { data: "" });
		fireEvent.change(input, { target: { value: "まんごー" } });
		await waitFor(() => expect(input.value).toBe("まんごー"));

		// 変換確定の Enter（keyCode 229）を送っても選択/クローズが誤発火しないこと
		const imeEnter = new KeyboardEvent("keydown", {
			key: "Enter",
			bubbles: true,
			cancelable: true,
		});
		Object.defineProperty(imeEnter, "which", { value: 229 });
		Object.defineProperty(imeEnter, "keyCode", { value: 229 });
		input.dispatchEvent(imeEnter);
		expect(input.value).toBe("まんごー");

		// compositionend で確定
		fireEvent.change(input, { target: { value: "Mango" } });
		fireEvent.compositionEnd(input, { data: "Mango" });
		await waitFor(() => expect(input.value).toBe("Mango"));
	},
};
