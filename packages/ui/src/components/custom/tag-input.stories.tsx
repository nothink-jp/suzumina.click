import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TagInput, type TagSuggestion } from "./tag-input";

const meta: Meta<typeof TagInput> = {
	title: "Custom/TagInput",
	component: TagInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"汎用的なタグ入力コンポーネント。タグの追加・削除、入力値検証、制限管理、オートコンプリート機能を提供します。",
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
		]);
		return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
	},
	args: {
		placeholder: "制限まであと1個",
		maxTags: 10,
		maxTagLength: 30,
		disabled: false,
		enableAutocompletion: false,
	},
};

export const CustomPlaceholder: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "カスタムプレースホルダー：音声ボタンのタグを入力してEnter",
		maxTags: 10,
		maxTagLength: 30,
		disabled: false,
		enableAutocompletion: false,
	},
};

// オートコンプリート機能のストーリー
export const WithAutocompletion: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "タグを入力してください... (例: 挨、応、日など)",
		maxTags: 10,
		maxTagLength: 30,
		disabled: false,
		enableAutocompletion: true,
		onSuggestionsFetch: mockFetchSuggestions,
		debounceMs: 300,
		minSearchLength: 2,
		maxSuggestions: 8,
	},
	parameters: {
		docs: {
			description: {
				story: "オートコンプリート機能が有効なタグ入力。2文字以上で候補が表示されます。",
			},
		},
	},
};

export const AutocompletionWithInitialTags: Story = {
	render: (args) => {
		const [tags, setTags] = useState<string[]>(["挨拶", "応援"]);
		return <TagInput {...args} tags={tags} onTagsChange={setTags} />;
	},
	args: {
		placeholder: "タグを入力... (既存タグは候補から除外されます)",
		maxTags: 10,
		maxTagLength: 30,
		disabled: false,
		enableAutocompletion: true,
		onSuggestionsFetch: mockFetchSuggestions,
		debounceMs: 300,
		minSearchLength: 2,
		maxSuggestions: 8,
	},
	parameters: {
		docs: {
			description: {
				story:
					"既存タグがある状態でのオートコンプリート。重複するタグは候補から自動的に除外されます。",
			},
		},
	},
};

export const FastAutocompletion: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "高速オートコンプリート (100msデバウンス)",
		maxTags: 10,
		maxTagLength: 30,
		disabled: false,
		enableAutocompletion: true,
		onSuggestionsFetch: mockFetchSuggestions,
		debounceMs: 100,
		minSearchLength: 1,
		maxSuggestions: 5,
	},
	parameters: {
		docs: {
			description: {
				story:
					"高速レスポンスのオートコンプリート。1文字から候補を表示し、100msのデバウンスで素早く反応します。",
			},
		},
	},
};

export const SlowAutocompletion: Story = {
	render: (args) => <TagInputWrapper {...args} />,
	args: {
		placeholder: "低速オートコンプリート (800msデバウンス)",
		maxTags: 10,
		maxTagLength: 30,
		disabled: false,
		enableAutocompletion: true,
		onSuggestionsFetch: mockFetchSuggestions,
		debounceMs: 800,
		minSearchLength: 3,
		maxSuggestions: 12,
	},
	parameters: {
		docs: {
			description: {
				story:
					"低速レスポンスのオートコンプリート。3文字から候補を表示し、800msのデバウンスで安定したパフォーマンスを提供します。",
			},
		},
	},
};
