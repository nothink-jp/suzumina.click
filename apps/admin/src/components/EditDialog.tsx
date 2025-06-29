"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Label } from "@suzumina.click/ui/components/ui/label";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Edit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EditField {
	key: string;
	label: string;
	type: "text" | "textarea" | "number" | "select";
	value: string | number;
	options?: { value: string; label: string }[];
}

interface EditDialogProps {
	title: string;
	description: string;
	fields: EditField[];
	onSave: (data: Record<string, unknown>) => Promise<boolean>;
	triggerText?: string;
	triggerVariant?: "default" | "outline" | "ghost";
}

export function EditDialog({
	title,
	description,
	fields,
	onSave,
	triggerText = "編集",
	triggerVariant = "outline",
}: EditDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState<Record<string, unknown>>(() => {
		const initial: Record<string, unknown> = {};
		for (const field of fields) {
			initial[field.key] = field.value;
		}
		return initial;
	});
	const router = useRouter();

	const handleSave = async () => {
		setIsLoading(true);
		try {
			const success = await onSave(formData);
			if (success) {
				setOpen(false);
				router.refresh();
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleFieldChange = (key: string, value: unknown) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant={triggerVariant} size="sm" className="gap-1">
					<Edit className="h-3 w-3" />
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{fields.map((field) => (
						<div key={field.key} className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={field.key} className="text-right">
								{field.label}
							</Label>
							{field.type === "textarea" ? (
								<Textarea
									id={field.key}
									value={String(formData[field.key] || "")}
									onChange={(e) => handleFieldChange(field.key, e.target.value)}
									className="col-span-3"
								/>
							) : field.type === "select" ? (
								<select
									id={field.key}
									value={String(formData[field.key] || "")}
									onChange={(e) => handleFieldChange(field.key, e.target.value)}
									className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									{field.options?.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							) : (
								<Input
									id={field.key}
									type={field.type}
									value={String(formData[field.key] || "")}
									onChange={(e) => {
										const value = field.type === "number" ? Number(e.target.value) : e.target.value;
										handleFieldChange(field.key, value);
									}}
									className="col-span-3"
								/>
							)}
						</div>
					))}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button onClick={handleSave} disabled={isLoading}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						保存
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
