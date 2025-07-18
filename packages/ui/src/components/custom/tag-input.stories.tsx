import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TagInput } from "./tag-input";

const meta: Meta<typeof TagInput> = {
	title: "Custom/TagInput",
	component: TagInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"汎用的なタグ入力コンポーネント。タグの追加・削除、入力値検証、制限管理を提供します。",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		tags: {
			description: "現在のタグ配列",
			control: { type: "object" },
		},
		onTagsChange: {
			description: "タグ変更時のコールバック関数",
			action: "tags changed",
		},
		maxTags: {
			description: "最大タグ数",
			control: { type: "number", min: 1, max: 50 },
		},
		maxTagLength: {
			description: "各タグの最大文字数",
			control: { type: "number", min: 1, max: 100 },
		},
		placeholder: {
			description: "プレースホルダーテキスト",
			control: { type: "text" },
		},
		disabled: {
			description: "入力無効状態",
			control: { type: "boolean" },
		},
		className: {
			description: "追加のCSSクラス",
			control: { type: "text" },
		},
	},
};

export default meta;
type Story = StoryObj<typeof TagInput>;

// インタラクティブなコンポーネント用のラッパー
function TagInputWrapper(
	props: Omit<React.ComponentProps<typeof TagInput>, "tags" | "onTagsChange">,
) {
	const [tags, setTags] = useState<string[]>([]);
	return <TagInput {...props} tags={tags} onTagsChange={setTags} />;
}

export const Default: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "タグを入力...",
		maxTags: 15,
		maxTagLength: 30,
		disabled: false,
	},
};

export const WithInitialTags: Story = {
	render: (args) => {
		const [tags, setTags] = useState<string[]>(["React", "TypeScript", "JavaScript"]);
		return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
	},
	args: {
		placeholder: "タグを入力...",
		maxTags: 15,
		maxTagLength: 30,
		disabled: false,
	},
};

export const SmallLimit: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "最大3個まで",
		maxTags: 3,
		maxTagLength: 10,
		disabled: false,
	},
};

export const LongTags: Story = {
	render: (args) => {
		const [tags, setTags] = useState<string[]>([
			"非常に長いタグ名の例です",
			"これも長いタグ",
			"短い",
		]);
		return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
	},
	args: {
		placeholder: "長いタグも対応",
		maxTags: 15,
		maxTagLength: 50,
		disabled: false,
	},
};

export const Disabled: Story = {
	render: (args) => {
		const [tags, setTags] = useState<string[]>(["読み取り専用", "編集不可"]);
		return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
	},
	args: {
		placeholder: "無効状態",
		maxTags: 15,
		maxTagLength: 30,
		disabled: true,
	},
};

export const NearLimit: Story = {
	render: (args) => {
		const [tags, setTags] = useState<string[]>([
			"タグ1",
			"タグ2",
			"タグ3",
			"タグ4",
			"タグ5",
			"タグ6",
			"タグ7",
			"タグ8",
			"タグ9",
			"タグ10",
			"タグ11",
			"タグ12",
			"タグ13",
			"タグ14",
		]);
		return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
	},
	args: {
		placeholder: "制限まであと1個",
		maxTags: 15,
		maxTagLength: 30,
		disabled: false,
	},
};

export const CustomPlaceholder: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "カスタムプレースホルダー：音声ボタンのタグを入力してEnter",
		maxTags: 15,
		maxTagLength: 30,
		disabled: false,
	},
};
