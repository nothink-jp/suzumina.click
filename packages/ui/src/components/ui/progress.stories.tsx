import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { Progress } from "./progress";

const meta = {
	title: "UI/Progress",
	component: Progress,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		value: {
			control: { type: "range", min: 0, max: 100, step: 1 },
			description: "進捗の値（0-100）",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: 60,
	},
};

export const BasicValues: Story = {
	render: () => (
		<div className="w-[300px] space-y-4">
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<span>0%</span>
					<span>0/100</span>
				</div>
				<Progress value={0} />
			</div>

			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<span>25%</span>
					<span>25/100</span>
				</div>
				<Progress value={25} />
			</div>

			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<span>50%</span>
					<span>50/100</span>
				</div>
				<Progress value={50} />
			</div>

			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<span>75%</span>
					<span>75/100</span>
				</div>
				<Progress value={75} />
			</div>

			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<span>100%</span>
					<span>100/100</span>
				</div>
				<Progress value={100} />
			</div>
		</div>
	),
};

export const Animated: Story = {
	render: () => {
		const [progress, setProgress] = useState(0);

		useEffect(() => {
			const timer = setTimeout(() => setProgress(66), 500);
			return () => clearTimeout(timer);
		}, []);

		return (
			<div className="w-[300px] space-y-4">
				<div className="flex justify-between text-sm">
					<span>アニメーション付き進捗</span>
					<span>{progress}%</span>
				</div>
				<Progress value={progress} />
				<Button onClick={() => setProgress(Math.floor(Math.random() * 100))}>ランダムに更新</Button>
			</div>
		);
	},
};

export const FileUploadProgress: Story = {
	render: () => {
		const [uploadProgress, setUploadProgress] = useState(0);
		const [isUploading, setIsUploading] = useState(false);

		const startUpload = () => {
			setIsUploading(true);
			setUploadProgress(0);

			const interval = setInterval(() => {
				setUploadProgress((prev) => {
					if (prev >= 100) {
						clearInterval(interval);
						setIsUploading(false);
						return 100;
					}
					return prev + Math.random() * 15;
				});
			}, 300);
		};

		return (
			<div className="w-[400px] space-y-4 p-6 border rounded-lg">
				<h3 className="font-semibold">ファイルアップロード</h3>

				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span>sample-file.pdf</span>
						<span>{Math.round(uploadProgress)}%</span>
					</div>
					<Progress value={uploadProgress} />
					<div className="text-xs text-muted-foreground">
						{isUploading
							? "アップロード中..."
							: uploadProgress === 100
								? "アップロード完了"
								: "アップロード待機中"}
					</div>
				</div>

				<Button onClick={startUpload} disabled={isUploading} className="w-full">
					{isUploading ? "アップロード中..." : "アップロード開始"}
				</Button>
			</div>
		);
	},
};

export const MultipleProgress: Story = {
	render: () => {
		return (
			<div className="w-[400px] space-y-6">
				<div className="space-y-4">
					<h3 className="font-semibold">プロジェクト進捗</h3>

					<div className="space-y-3">
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>UI デザイン</span>
								<span>90%</span>
							</div>
							<Progress value={90} />
						</div>

						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>フロントエンド開発</span>
								<span>75%</span>
							</div>
							<Progress value={75} />
						</div>

						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>バックエンド開発</span>
								<span>60%</span>
							</div>
							<Progress value={60} />
						</div>

						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>テスト</span>
								<span>30%</span>
							</div>
							<Progress value={30} />
						</div>

						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>デプロイ</span>
								<span>0%</span>
							</div>
							<Progress value={0} />
						</div>
					</div>

					<div className="pt-2 border-t">
						<div className="flex justify-between text-sm font-medium">
							<span>全体進捗</span>
							<span>51%</span>
						</div>
						<Progress value={51} className="mt-2" />
					</div>
				</div>
			</div>
		);
	},
};

export const SkillProgress: Story = {
	render: () => {
		const skills = [
			{ name: "JavaScript", level: 90 },
			{ name: "TypeScript", level: 85 },
			{ name: "React", level: 88 },
			{ name: "Node.js", level: 75 },
			{ name: "Python", level: 70 },
			{ name: "SQL", level: 65 },
		];

		return (
			<div className="w-[350px] space-y-4 p-6 border rounded-lg">
				<h3 className="font-semibold">スキルレベル</h3>

				<div className="space-y-4">
					{skills.map((skill, index) => (
						<div key={index} className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>{skill.name}</span>
								<span>{skill.level}%</span>
							</div>
							<Progress value={skill.level} />
						</div>
					))}
				</div>
			</div>
		);
	},
};

export const LoadingSteps: Story = {
	render: () => {
		const [currentStep, setCurrentStep] = useState(0);
		const [isLoading, setIsLoading] = useState(false);

		const steps = [
			"初期化中...",
			"データを読み込み中...",
			"設定を確認中...",
			"接続を確立中...",
			"完了",
		];

		const startProcess = () => {
			setIsLoading(true);
			setCurrentStep(0);

			const interval = setInterval(() => {
				setCurrentStep((prev) => {
					if (prev >= steps.length - 1) {
						clearInterval(interval);
						setIsLoading(false);
						return prev;
					}
					return prev + 1;
				});
			}, 1000);
		};

		const progress = (currentStep / (steps.length - 1)) * 100;

		return (
			<div className="w-[400px] space-y-4 p-6 border rounded-lg">
				<h3 className="font-semibold">セットアップ進捗</h3>

				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span>{steps[currentStep]}</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<Progress value={progress} />
					<div className="text-xs text-muted-foreground">
						ステップ {currentStep + 1} / {steps.length}
					</div>
				</div>

				<Button onClick={startProcess} disabled={isLoading} className="w-full">
					{isLoading ? "処理中..." : "セットアップ開始"}
				</Button>
			</div>
		);
	},
};

export const CustomSizes: Story = {
	render: () => (
		<div className="w-[300px] space-y-6">
			<div className="space-y-2">
				<div className="text-sm font-medium">小（h-1）</div>
				<Progress value={60} className="h-1" />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">デフォルト（h-2）</div>
				<Progress value={60} />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">中（h-3）</div>
				<Progress value={60} className="h-3" />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">大（h-4）</div>
				<Progress value={60} className="h-4" />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">特大（h-6）</div>
				<Progress value={60} className="h-6" />
			</div>
		</div>
	),
};

export const ColorVariants: Story = {
	render: () => (
		<div className="w-[300px] space-y-6">
			<div className="space-y-2">
				<div className="text-sm font-medium">デフォルト</div>
				<Progress value={60} />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">成功（緑）</div>
				<Progress value={60} className="[&>[data-slot=progress-indicator]]:bg-green-500" />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">警告（黄）</div>
				<Progress value={60} className="[&>[data-slot=progress-indicator]]:bg-yellow-500" />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">エラー（赤）</div>
				<Progress value={60} className="[&>[data-slot=progress-indicator]]:bg-red-500" />
			</div>

			<div className="space-y-2">
				<div className="text-sm font-medium">情報（青）</div>
				<Progress value={60} className="[&>[data-slot=progress-indicator]]:bg-blue-500" />
			</div>
		</div>
	),
};
