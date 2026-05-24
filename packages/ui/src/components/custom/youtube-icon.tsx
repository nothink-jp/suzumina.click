import type { SVGProps } from "react";

interface YoutubeIconProps extends SVGProps<SVGSVGElement> {
	size?: string | number;
	color?: string;
}

export function YoutubeIcon({
	size = 24,
	color = "currentColor",
	strokeWidth = 2,
	className,
	...props
}: YoutubeIconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			width={size}
			height={size}
			stroke={color}
			strokeWidth={strokeWidth}
			className={className}
			aria-hidden="true"
			{...props}
		>
			<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
			<path d="m10 15 5-3-5-3z" />
		</svg>
	);
}
