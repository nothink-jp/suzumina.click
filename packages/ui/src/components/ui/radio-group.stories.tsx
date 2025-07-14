import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
	title: "UI/RadioGroup",
	component: RadioGroup,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		defaultValue: {
			control: "text",
			description: "デフォルトで選択される値",
		},
		disabled: {
			control: "boolean",
			description: "無効状態",
		},
		orientation: {
			control: "radio",
			options: ["horizontal", "vertical"],
			description: "レイアウトの向き",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<RadioGroup defaultValue="option1">
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option1" id="option1" />
				<Label htmlFor="option1">オプション 1</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option2" id="option2" />
				<Label htmlFor="option2">オプション 2</Label>
			</div>
			<div className="flex items-center space-x-2">
				<RadioGroupItem value="option3" id="option3" />
				<Label htmlFor="option3">オプション 3</Label>
			</div>
		</RadioGroup>
	),
};

export const PaymentMethods: Story = {
	render: () => {
		const [selectedMethod, setSelectedMethod] = useState("card");

		return (
			<div className="space-y-4 w-[400px]">
				<h3 className="text-lg font-semibold">お支払い方法</h3>
				<RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="card" id="card" />
						<Label htmlFor="card">クレジットカード</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="paypal" id="paypal" />
						<Label htmlFor="paypal">PayPal</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="bank" id="bank" />
						<Label htmlFor="bank">銀行振込</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="convenience" id="convenience" />
						<Label htmlFor="convenience">コンビニ決済</Label>
					</div>
				</RadioGroup>
				<p className="text-sm text-muted-foreground">選択された方法: {selectedMethod}</p>
			</div>
		);
	},
};

export const SurveyQuestion: Story = {
	render: () => (
		<div className="space-y-4 w-[500px]">
			<h3 className="text-lg font-semibold">サービスの満足度をお聞かせください</h3>
			<RadioGroup defaultValue="satisfied">
				<div className="flex items-center space-x-3">
					<RadioGroupItem value="very-satisfied" id="very-satisfied" />
					<Label htmlFor="very-satisfied" className="cursor-pointer">
						非常に満足
					</Label>
				</div>
				<div className="flex items-center space-x-3">
					<RadioGroupItem value="satisfied" id="satisfied" />
					<Label htmlFor="satisfied" className="cursor-pointer">
						満足
					</Label>
				</div>
				<div className="flex items-center space-x-3">
					<RadioGroupItem value="neutral" id="neutral" />
					<Label htmlFor="neutral" className="cursor-pointer">
						どちらでもない
					</Label>
				</div>
				<div className="flex items-center space-x-3">
					<RadioGroupItem value="dissatisfied" id="dissatisfied" />
					<Label htmlFor="dissatisfied" className="cursor-pointer">
						不満
					</Label>
				</div>
				<div className="flex items-center space-x-3">
					<RadioGroupItem value="very-dissatisfied" id="very-dissatisfied" />
					<Label htmlFor="very-dissatisfied" className="cursor-pointer">
						非常に不満
					</Label>
				</div>
			</RadioGroup>
		</div>
	),
};

export const PlanSelection: Story = {
	render: () => {
		const [selectedPlan, setSelectedPlan] = useState("standard");

		const plans = [
			{
				id: "basic",
				name: "ベーシック",
				price: "¥980",
				features: ["基本機能", "5GBストレージ", "メールサポート"],
			},
			{
				id: "standard",
				name: "スタンダード",
				price: "¥1,980",
				features: ["全基本機能", "50GBストレージ", "優先サポート", "高度な分析"],
			},
			{
				id: "premium",
				name: "プレミアム",
				price: "¥3,980",
				features: ["全機能", "無制限ストレージ", "24/7サポート", "カスタム統合"],
			},
		];

		return (
			<div className="space-y-4 w-[600px]">
				<h3 className="text-lg font-semibold">プランを選択</h3>
				<RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
					<div className="grid gap-4">
						{plans.map((plan) => (
							<div key={plan.id}>
								<Label htmlFor={plan.id} className="cursor-pointer">
									<Card
										className={`p-4 transition-all hover:shadow-md ${
											selectedPlan === plan.id ? "border-primary bg-primary/5" : "border-border"
										}`}
									>
										<div className="flex items-start space-x-3">
											<RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
											<div className="flex-1 space-y-2">
												<div className="flex items-center justify-between">
													<h4 className="font-semibold">{plan.name}</h4>
													<span className="text-lg font-bold text-primary">{plan.price}</span>
												</div>
												<ul className="text-sm text-muted-foreground space-y-1">
													{plan.features.map((feature, index) => (
														<li key={index} className="flex items-center">
															<span className="mr-2">•</span>
															{feature}
														</li>
													))}
												</ul>
											</div>
										</div>
									</Card>
								</Label>
							</div>
						))}
					</div>
				</RadioGroup>
			</div>
		);
	},
};

export const NotificationSettings: Story = {
	render: () => (
		<div className="space-y-6 w-[400px]">
			<h3 className="text-lg font-semibold">通知設定</h3>

			<div className="space-y-4">
				<div>
					<h4 className="font-medium mb-3">メール通知の頻度</h4>
					<RadioGroup defaultValue="daily">
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="realtime" id="realtime" />
							<Label htmlFor="realtime">リアルタイム</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="daily" id="daily" />
							<Label htmlFor="daily">1日1回</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="weekly" id="weekly" />
							<Label htmlFor="weekly">週1回</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="never" id="never" />
							<Label htmlFor="never">受信しない</Label>
						</div>
					</RadioGroup>
				</div>

				<div>
					<h4 className="font-medium mb-3">プッシュ通知</h4>
					<RadioGroup defaultValue="important">
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="all" id="all" />
							<Label htmlFor="all">すべての通知</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="important" id="important" />
							<Label htmlFor="important">重要な通知のみ</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="none" id="none" />
							<Label htmlFor="none">通知なし</Label>
						</div>
					</RadioGroup>
				</div>
			</div>
		</div>
	),
};

export const Horizontal: Story = {
	render: () => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">評価</h3>
			<RadioGroup defaultValue="good" className="flex space-x-6">
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="excellent" id="excellent" />
					<Label htmlFor="excellent">優秀</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="good" id="good" />
					<Label htmlFor="good">良い</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="average" id="average" />
					<Label htmlFor="average">普通</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="poor" id="poor" />
					<Label htmlFor="poor">悪い</Label>
				</div>
			</RadioGroup>
		</div>
	),
};

export const DisabledState: Story = {
	render: () => (
		<div className="space-y-4 w-[300px]">
			<h3 className="text-lg font-semibold">設定（読み取り専用）</h3>
			<RadioGroup defaultValue="option2" disabled>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="option1" id="disabled1" />
					<Label htmlFor="disabled1">オプション 1</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="option2" id="disabled2" />
					<Label htmlFor="disabled2">オプション 2（選択済み）</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="option3" id="disabled3" />
					<Label htmlFor="disabled3">オプション 3</Label>
				</div>
			</RadioGroup>
			<p className="text-sm text-muted-foreground">この設定は管理者によって固定されています。</p>
		</div>
	),
};

export const FormExample: Story = {
	render: () => {
		const [formData, setFormData] = useState({
			size: "medium",
			color: "blue",
			delivery: "standard",
		});

		const handleSubmit = () => {
			alert(
				`選択内容:\nサイズ: ${formData.size}\n色: ${formData.color}\n配送: ${formData.delivery}`,
			);
		};

		return (
			<div className="space-y-6 w-[400px] p-6 border rounded-lg">
				<h3 className="text-lg font-semibold">商品カスタマイズ</h3>

				<div className="space-y-4">
					<div>
						<Label className="text-base font-medium mb-3 block">サイズ</Label>
						<RadioGroup
							value={formData.size}
							onValueChange={(value) => setFormData((prev) => ({ ...prev, size: value }))}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="small" id="small" />
								<Label htmlFor="small">Sサイズ</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="medium" id="medium" />
								<Label htmlFor="medium">Mサイズ</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="large" id="large" />
								<Label htmlFor="large">Lサイズ</Label>
							</div>
						</RadioGroup>
					</div>

					<div>
						<Label className="text-base font-medium mb-3 block">カラー</Label>
						<RadioGroup
							value={formData.color}
							onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
							className="flex space-x-4"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="red" id="red" />
								<Label htmlFor="red">レッド</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="blue" id="blue" />
								<Label htmlFor="blue">ブルー</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="green" id="green" />
								<Label htmlFor="green">グリーン</Label>
							</div>
						</RadioGroup>
					</div>

					<div>
						<Label className="text-base font-medium mb-3 block">配送オプション</Label>
						<RadioGroup
							value={formData.delivery}
							onValueChange={(value) => setFormData((prev) => ({ ...prev, delivery: value }))}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="standard" id="standard" />
								<Label htmlFor="standard">通常配送（無料）</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="express" id="express" />
								<Label htmlFor="express">速達配送（¥500）</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="overnight" id="overnight" />
								<Label htmlFor="overnight">翌日配送（¥1,000）</Label>
							</div>
						</RadioGroup>
					</div>
				</div>

				<Button onClick={handleSubmit} className="w-full">
					注文を確定
				</Button>
			</div>
		);
	},
};
