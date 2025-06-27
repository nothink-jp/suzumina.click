"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ContactFormDataSchema } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Label } from "@suzumina.click/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { CheckCircle, Send } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// フォームスキーマ（エラーメッセージ付き）
const contactFormSchema = ContactFormDataSchema.extend({
	category: z.enum(["bug", "feature", "usage", "other"], {
		required_error: "お問い合わせ種別を選択してください",
	}),
	subject: z
		.string()
		.min(1, "件名を入力してください")
		.max(100, "件名は100文字以内で入力してください"),
	content: z
		.string()
		.min(10, "内容は10文字以上で入力してください")
		.max(2000, "内容は2000文字以内で入力してください"),
	email: z.string().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
});

const categoryOptions = [
	{ value: "bug", label: "🐛 バグ報告", description: "サイトの不具合" },
	{ value: "feature", label: "💡 機能要望", description: "新機能の提案" },
	{ value: "usage", label: "❓ 使い方", description: "サイトの使用方法" },
	{ value: "other", label: "📢 その他", description: "上記以外" },
];

// 成功メッセージコンポーネント
function SuccessMessage({ onReset }: { onReset: () => void }) {
	return (
		<div className="text-center py-8 space-y-4">
			<div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
				<CheckCircle className="w-8 h-8 text-green-600" />
			</div>
			<div className="space-y-2">
				<h3 className="text-xl font-semibold text-foreground">送信完了</h3>
				<p className="text-muted-foreground">
					お問い合わせありがとうございます。
					<br />
					内容を確認させていただきます。
				</p>
				<p className="text-sm text-muted-foreground">（返信をお約束するものではありません）</p>
			</div>
			<Button variant="outline" onClick={onReset} className="mt-4">
				新しいお問い合わせを送信
			</Button>
		</div>
	);
}

// プレースホルダー生成関数
function getPlaceholder(category: string): string {
	switch (category) {
		case "bug":
			return "例: どのページで、どのような操作をした時に、どんな問題が発生しましたか？\n\n• 発生したページ: \n• 操作内容: \n• エラーメッセージ: \n• 使用ブラウザ: ";
		case "feature":
			return "例: どのような機能があると便利か、具体的にご説明ください。";
		case "usage":
			return "例: どの機能の使い方がわからないか、具体的にご説明ください。";
		default:
			return "詳細をお聞かせください";
	}
}

export function ContactForm() {
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 一意なIDを生成
	const subjectId = useId();
	const contentId = useId();
	const emailId = useId();

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
		reset,
	} = useForm<z.infer<typeof contactFormSchema>>({
		resolver: zodResolver(contactFormSchema),
	});

	const selectedCategory = watch("category");
	const content = watch("content");

	const onSubmit = async (data: z.infer<typeof contactFormSchema>) => {
		setIsSubmitting(true);
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...data,
					timestamp: new Date().toISOString(),
				}),
			});

			if (response.ok) {
				setIsSubmitted(true);
				reset();
			} else {
				throw new Error("送信に失敗しました");
			}
		} catch (_error) {
			alert("送信に失敗しました。しばらく時間をおいてから再度お試しください。");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSubmitted) {
		return <SuccessMessage onReset={() => setIsSubmitted(false)} />;
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			{/* お問い合わせ種別 */}
			<div className="space-y-2">
				<Label htmlFor="category">
					お問い合わせ種別 <span className="text-destructive">*</span>
				</Label>
				<Select
					onValueChange={(value) =>
						setValue("category", value as z.infer<typeof contactFormSchema>["category"])
					}
				>
					<SelectTrigger>
						<SelectValue placeholder="種別を選択してください" />
					</SelectTrigger>
					<SelectContent>
						{categoryOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								<div className="flex flex-col">
									<span>{option.label}</span>
									<span className="text-xs text-muted-foreground">{option.description}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
			</div>

			{/* 件名 */}
			<div className="space-y-2">
				<Label htmlFor={subjectId}>
					件名 <span className="text-destructive">*</span>
				</Label>
				<Input
					id={subjectId}
					placeholder="例: 音声ボタンが再生されない"
					{...register("subject")}
					className={errors.subject ? "border-destructive" : ""}
				/>
				{errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
			</div>

			{/* 内容 */}
			<div className="space-y-2">
				<Label htmlFor={contentId}>
					内容 <span className="text-destructive">*</span>
				</Label>
				<Textarea
					id={contentId}
					placeholder={getPlaceholder(selectedCategory)}
					rows={8}
					{...register("content")}
					className={errors.content ? "border-destructive" : ""}
				/>
				<div className="flex justify-between items-center text-xs text-muted-foreground">
					{errors.content && <p className="text-destructive">{errors.content.message}</p>}
					<span className="ml-auto">{content?.length || 0} / 2000文字</span>
				</div>
			</div>

			{/* メールアドレス */}
			<div className="space-y-2">
				<Label htmlFor={emailId}>
					メールアドレス <span className="text-muted-foreground text-sm">(任意)</span>
				</Label>
				<Input
					id={emailId}
					type="email"
					placeholder="返信希望の場合のみ入力してください"
					{...register("email")}
					className={errors.email ? "border-destructive" : ""}
				/>
				{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
				<p className="text-xs text-muted-foreground">
					返信をお約束するものではありません。技術的な内容のみ対応可能です。
				</p>
			</div>

			{/* 送信ボタン */}
			<div className="pt-4">
				<Button type="submit" disabled={isSubmitting} className="w-full flex items-center gap-2">
					{isSubmitting ? (
						<>
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
							送信中...
						</>
					) : (
						<>
							<Send className="h-4 w-4" />
							送信する
						</>
					)}
				</Button>
			</div>

			{/* 注意事項 */}
			<div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
				<p className="font-medium mb-1">送信前にご確認ください:</p>
				<ul className="space-y-1">
					<li>• お問い合わせ内容は管理者確認のため保存されます</li>
					<li>• 個人運営のため、返信や対応をお約束できません</li>
					<li>• 緊急性のある内容には対応できません</li>
				</ul>
			</div>
		</form>
	);
}
