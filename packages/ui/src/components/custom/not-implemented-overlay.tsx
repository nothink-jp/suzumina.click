import { AlertCircle, Construction } from "lucide-react";

interface NotImplementedOverlayProps {
	title?: string;
	description?: string;
	className?: string;
}

export function NotImplementedOverlay({
	title = "この機能は準備中です",
	description = "現在開発中のため、もうしばらくお待ちください。",
	className = "",
}: NotImplementedOverlayProps) {
	return (
		<div
			className={`absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg ${className}`}
		>
			<div className="bg-card rounded-lg p-6 shadow-lg max-w-md mx-4 text-center">
				<div className="flex items-center justify-center mb-4">
					<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
						<Construction className="w-6 h-6 text-muted-foreground" />
					</div>
				</div>
				<div className="flex items-center justify-center gap-2 mb-2">
					<AlertCircle className="w-5 h-5 text-amber-500" />
					<h3 className="text-lg font-semibold text-foreground">{title}</h3>
				</div>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
		</div>
	);
}

export default NotImplementedOverlay;
