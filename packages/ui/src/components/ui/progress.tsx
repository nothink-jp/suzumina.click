"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@suzumina.click/ui/lib/utils";
import type * as React from "react";

function Progress({
	className,
	value,
	...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "value"> & {
	value?: number | null;
}) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			value={value ?? 0}
			className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-slot="progress-indicator"
				className="h-full w-full flex-1 bg-primary transition-all"
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
