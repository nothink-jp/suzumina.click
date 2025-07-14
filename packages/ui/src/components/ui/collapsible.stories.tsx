import type { Meta, StoryObj } from "@storybook/react";
import { ChevronDownIcon, FileIcon, FolderIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = {
	title: "UI/Collapsible",
	component: Collapsible,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	render: () => {
		const [isOpen, setIsOpen] = useState(false);

		return (
			<div className="w-[350px]">
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="outline" className="w-full justify-between">
							詳細を表示
							<ChevronDownIcon
								className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
							/>
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 p-4 border rounded-lg bg-muted/30">
						<p className="text-sm">
							これは折りたたみ可能なコンテンツです。ボタンをクリックすることで表示・非表示を切り替えることができます。
						</p>
					</CollapsibleContent>
				</Collapsible>
			</div>
		);
	},
};

export const FAQ: Story = {
	render: () => {
		const [openItems, setOpenItems] = useState<string[]>([]);

		const toggleItem = (item: string) => {
			setOpenItems((prev) =>
				prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
			);
		};

		const faqItems = [
			{
				id: "q1",
				question: "サービスの利用料金はいくらですか？",
				answer:
					"基本プランは月額980円から利用できます。プレミアムプランは月額1,980円で追加機能をご利用いただけます。",
			},
			{
				id: "q2",
				question: "解約はいつでもできますか？",
				answer:
					"はい、いつでも解約可能です。解約手続きは設定ページから簡単に行えます。解約月の末日まで引き続きサービスをご利用いただけます。",
			},
			{
				id: "q3",
				question: "データのバックアップは取られていますか？",
				answer:
					"お客様のデータは定期的にバックアップを取得しており、複数の拠点で安全に保管されています。万が一の際にもデータの復旧が可能です。",
			},
		];

		return (
			<div className="w-[500px] space-y-3">
				{faqItems.map((item) => (
					<Collapsible
						key={item.id}
						open={openItems.includes(item.id)}
						onOpenChange={() => toggleItem(item.id)}
					>
						<CollapsibleTrigger asChild>
							<Button variant="outline" className="w-full justify-between p-4 h-auto text-left">
								<span className="font-medium">{item.question}</span>
								<ChevronDownIcon
									className={`h-4 w-4 transition-transform flex-shrink-0 ml-2 ${
										openItems.includes(item.id) ? "rotate-180" : ""
									}`}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="px-4 pb-4 pt-2">
							<p className="text-sm text-muted-foreground">{item.answer}</p>
						</CollapsibleContent>
					</Collapsible>
				))}
			</div>
		);
	},
};

export const FileExplorer: Story = {
	render: () => {
		const [openFolders, setOpenFolders] = useState<string[]>(["root", "src"]);

		const toggleFolder = (folderId: string) => {
			setOpenFolders((prev) =>
				prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId],
			);
		};

		return (
			<div className="w-[300px] border rounded-lg p-4">
				<div className="space-y-1">
					<Collapsible
						open={openFolders.includes("root")}
						onOpenChange={() => toggleFolder("root")}
					>
						<CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-1 hover:bg-muted rounded">
							<ChevronDownIcon
								className={`h-3 w-3 transition-transform ${
									openFolders.includes("root") ? "rotate-0" : "-rotate-90"
								}`}
							/>
							<FolderIcon className="h-4 w-4 text-blue-500" />
							<span className="text-sm">プロジェクト</span>
						</CollapsibleTrigger>
						<CollapsibleContent className="ml-5 space-y-1">
							<Collapsible
								open={openFolders.includes("src")}
								onOpenChange={() => toggleFolder("src")}
							>
								<CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-1 hover:bg-muted rounded">
									<ChevronDownIcon
										className={`h-3 w-3 transition-transform ${
											openFolders.includes("src") ? "rotate-0" : "-rotate-90"
										}`}
									/>
									<FolderIcon className="h-4 w-4 text-blue-500" />
									<span className="text-sm">src</span>
								</CollapsibleTrigger>
								<CollapsibleContent className="ml-5 space-y-1">
									<div className="flex items-center gap-2 p-1">
										<div className="w-3" />
										<FileIcon className="h-4 w-4 text-green-500" />
										<span className="text-sm">index.ts</span>
									</div>
									<div className="flex items-center gap-2 p-1">
										<div className="w-3" />
										<FileIcon className="h-4 w-4 text-blue-400" />
										<span className="text-sm">App.tsx</span>
									</div>
									<Collapsible
										open={openFolders.includes("components")}
										onOpenChange={() => toggleFolder("components")}
									>
										<CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-1 hover:bg-muted rounded">
											<ChevronDownIcon
												className={`h-3 w-3 transition-transform ${
													openFolders.includes("components") ? "rotate-0" : "-rotate-90"
												}`}
											/>
											<FolderIcon className="h-4 w-4 text-blue-500" />
											<span className="text-sm">components</span>
										</CollapsibleTrigger>
										<CollapsibleContent className="ml-5 space-y-1">
											<div className="flex items-center gap-2 p-1">
												<div className="w-3" />
												<FileIcon className="h-4 w-4 text-blue-400" />
												<span className="text-sm">Button.tsx</span>
											</div>
											<div className="flex items-center gap-2 p-1">
												<div className="w-3" />
												<FileIcon className="h-4 w-4 text-blue-400" />
												<span className="text-sm">Input.tsx</span>
											</div>
										</CollapsibleContent>
									</Collapsible>
								</CollapsibleContent>
							</Collapsible>
							<div className="flex items-center gap-2 p-1">
								<div className="w-3" />
								<FileIcon className="h-4 w-4 text-gray-500" />
								<span className="text-sm">package.json</span>
							</div>
							<div className="flex items-center gap-2 p-1">
								<div className="w-3" />
								<FileIcon className="h-4 w-4 text-gray-500" />
								<span className="text-sm">README.md</span>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>
			</div>
		);
	},
};

export const Settings: Story = {
	render: () => {
		const [openSections, setOpenSections] = useState<string[]>(["account"]);

		const toggleSection = (section: string) => {
			setOpenSections((prev) =>
				prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
			);
		};

		return (
			<div className="w-[400px] space-y-2">
				<h3 className="text-lg font-semibold mb-4">設定</h3>

				<Collapsible
					open={openSections.includes("account")}
					onOpenChange={() => toggleSection("account")}
				>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-muted">
						<div className="flex items-center gap-3">
							<SettingsIcon className="h-5 w-5" />
							<span className="font-medium">アカウント設定</span>
						</div>
						<ChevronDownIcon
							className={`h-4 w-4 transition-transform ${
								openSections.includes("account") ? "rotate-180" : ""
							}`}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 p-4 border rounded-lg bg-muted/30 space-y-3">
						<div className="space-y-2">
							<Button variant="outline" size="sm" className="w-full justify-start">
								プロフィール編集
							</Button>
							<Button variant="outline" size="sm" className="w-full justify-start">
								パスワード変更
							</Button>
							<Button variant="outline" size="sm" className="w-full justify-start">
								メールアドレス変更
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<Collapsible
					open={openSections.includes("privacy")}
					onOpenChange={() => toggleSection("privacy")}
				>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-muted">
						<span className="font-medium">プライバシー</span>
						<ChevronDownIcon
							className={`h-4 w-4 transition-transform ${
								openSections.includes("privacy") ? "rotate-180" : ""
							}`}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 p-4 border rounded-lg bg-muted/30 space-y-3">
						<div className="space-y-2">
							<Button variant="outline" size="sm" className="w-full justify-start">
								公開設定
							</Button>
							<Button variant="outline" size="sm" className="w-full justify-start">
								データダウンロード
							</Button>
							<Button variant="outline" size="sm" className="w-full justify-start">
								アカウント削除
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<Collapsible
					open={openSections.includes("notifications")}
					onOpenChange={() => toggleSection("notifications")}
				>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover:bg-muted">
						<span className="font-medium">通知設定</span>
						<ChevronDownIcon
							className={`h-4 w-4 transition-transform ${
								openSections.includes("notifications") ? "rotate-180" : ""
							}`}
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 p-4 border rounded-lg bg-muted/30 space-y-3">
						<div className="space-y-2">
							<Button variant="outline" size="sm" className="w-full justify-start">
								メール通知
							</Button>
							<Button variant="outline" size="sm" className="w-full justify-start">
								プッシュ通知
							</Button>
							<Button variant="outline" size="sm" className="w-full justify-start">
								通知頻度
							</Button>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		);
	},
};

export const ControlledExample: Story = {
	render: () => {
		const [isOpen, setIsOpen] = useState(false);

		return (
			<div className="w-[350px] space-y-4">
				<div className="flex gap-2">
					<Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
						開く
					</Button>
					<Button onClick={() => setIsOpen(false)} variant="outline" size="sm">
						閉じる
					</Button>
					<span className="text-sm text-muted-foreground flex items-center">
						状態: {isOpen ? "開いている" : "閉じている"}
					</span>
				</div>

				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="outline" className="w-full justify-between">
							制御されたコラプシブル
							<ChevronDownIcon
								className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
							/>
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 p-4 border rounded-lg">
						<p className="text-sm">このコラプシブルは外部のボタンからも制御できます。</p>
					</CollapsibleContent>
				</Collapsible>
			</div>
		);
	},
};

export const AnimationExample: Story = {
	render: () => {
		const [isOpen, setIsOpen] = useState(false);

		return (
			<div className="w-[350px]">
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="outline" className="w-full justify-between">
							アニメーション付き
							<ChevronDownIcon
								className={`h-4 w-4 transition-transform duration-200 ${
									isOpen ? "rotate-180" : ""
								}`}
							/>
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
						<div className="mt-2 p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
							<h4 className="font-medium mb-2">アニメーション</h4>
							<p className="text-sm text-muted-foreground">
								このコラプシブルはスムーズなアニメーションで開閉します。 CSS
								transitionsを使用して滑らかな動作を実現しています。
							</p>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		);
	},
};
