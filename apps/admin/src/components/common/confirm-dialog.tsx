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

interface ConfirmDialogProps {
	title: string;
	description: string;
	warningText?: string;
	onConfirm: () => Promise<boolean>;
	triggerText?: string;
	triggerVariant?: "default" | "outline" | "destructive" | "ghost";
	confirmText?: string;
	cancelText?: string;
	icon?: React.ReactNode;
}

export function ConfirmDialog({
	title,
	description,
	warningText,
	onConfirm,
	triggerText = "削除",
	triggerVariant = "destructive",
	confirmText = "削除",
	cancelText = "キャンセル",
	icon = <Trash2 className="h-3 w-3" />,
}: ConfirmDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			const success = await onConfirm();
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
				<Button variant={triggerVariant} size="sm" className="gap-1">
					{icon}
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{warningText && (
					<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						{warningText}
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
						{cancelText}
					</Button>
					<Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
