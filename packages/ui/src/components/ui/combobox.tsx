"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@suzumina.click/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import type * as React from "react";

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: React.ComponentProps<typeof ComboboxPrimitive.Value>) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxInputGroup({
	className,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.InputGroup>) {
	return (
		<ComboboxPrimitive.InputGroup
			data-slot="combobox-input-group"
			className={cn("relative flex w-full items-center gap-2", className)}
			{...props}
		/>
	);
}

function ComboboxInput({
	className,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Input>) {
	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-input"
			className={cn(
				"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxContent({
	className,
	children,
	side = "bottom",
	sideOffset = 4,
	align = "start",
	alignOffset = 0,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Popup> &
	Pick<
		React.ComponentProps<typeof ComboboxPrimitive.Positioner>,
		"align" | "alignOffset" | "side" | "sideOffset"
	>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				className="isolate z-50"
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					className={cn(
						"relative z-50 max-h-[min(24rem,var(--available-height))] w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95",
						className,
					)}
					{...props}
				>
					{children}
				</ComboboxPrimitive.Popup>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({
	className,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.List>) {
	return (
		<ComboboxPrimitive.List data-slot="combobox-list" className={cn("p-1", className)} {...props} />
	);
}

function ComboboxItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Item>) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<ComboboxPrimitive.ItemIndicator className="flex size-3.5 shrink-0 items-center justify-center">
				<CheckIcon className="size-4" />
			</ComboboxPrimitive.ItemIndicator>
			{children}
		</ComboboxPrimitive.Item>
	);
}

function ComboboxEmpty({
	className,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Empty>) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn("px-2 py-1.5 text-sm text-muted-foreground empty:m-0 empty:p-0", className)}
			{...props}
		/>
	);
}

function ComboboxStatus({
	className,
	...props
}: React.ComponentProps<typeof ComboboxPrimitive.Status>) {
	return (
		<ComboboxPrimitive.Status
			data-slot="combobox-status"
			className={cn("px-2 py-1.5 text-sm text-muted-foreground empty:m-0 empty:p-0", className)}
			{...props}
		/>
	);
}

export {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxInputGroup,
	ComboboxItem,
	ComboboxList,
	ComboboxStatus,
	ComboboxValue,
};
