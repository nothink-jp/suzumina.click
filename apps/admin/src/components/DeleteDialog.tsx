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
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteDialogProps {
	title: string;
	description: string;
	warningText?: string;
	onDelete: () => Promise<boolean>;
	triggerText?: string;
}

export function DeleteDialog({
	title,
	description,
	warningText,
	onDelete,
	triggerText = "削除",
}: DeleteDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleDelete = async () => {
		setIsLoading(true);
		try {
			const success = await onDelete();
			if (success) {
				setOpen(false);
				router.refresh();
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="destructive" size="sm" className="gap-1">
					<Trash2 className="h-3 w-3" />
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="text-destructive">{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{warningText && (
					<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
						<p className="text-sm text-destructive">{warningText}</p>
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						削除する
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
