import { cn } from "@suzumina.click/ui/lib/utils";
import type * as React from "react";

interface DockedPanelProps extends React.ComponentProps<"div"> {
	/** Screen corner the panel is anchored to on wide viewports. */
	position: "bottom-right" | "bottom-left";
	/** "card" (rounded-xl, e.g. confirmation cards/toasts) or "pill" (rounded-full, e.g. a compact settings/consent bar). */
	variant?: "card" | "pill";
	role?: "region" | "status";
}

/**
 * Non-modal panel docked to a screen corner: rounded, bordered, shadowed —
 * never a backdrop/blocking overlay. Collapses to a full-width bottom sheet on
 * narrow viewports so multiple docked panels (e.g. age gate + cookie bar) stack
 * predictably instead of overlapping.
 */
export function DockedPanel({
	position,
	variant = "card",
	role = "region",
	className,
	...props
}: DockedPanelProps) {
	return (
		<div
			role={role}
			className={cn(
				"fixed inset-x-0 bottom-0 z-50 w-full border bg-card text-card-foreground shadow-xl",
				"rounded-t-2xl sm:inset-x-auto sm:bottom-4 sm:w-auto",
				variant === "pill" ? "sm:rounded-full sm:shadow-lg" : "sm:rounded-xl",
				position === "bottom-right" ? "sm:right-4" : "sm:left-4",
				className,
			)}
			{...props}
		/>
	);
}
