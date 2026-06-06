import type { ReactNode } from "react";

interface ListWrapperProps {
	children: ReactNode;
	className?: string;
}

export function ListWrapper({ children, className = "" }: ListWrapperProps) {
	return (
		<div
			className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6 ${className}`}
		>
			{children}
		</div>
	);
}
