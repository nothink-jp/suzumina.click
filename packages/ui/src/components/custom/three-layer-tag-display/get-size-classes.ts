/**
 * サイズに応じたクラス名を返す
 */
export function getSizeClasses(size: "sm" | "default" | "lg") {
	switch (size) {
		case "sm":
			return {
				container: "gap-1",
				layerContainer: "gap-1",
				badge: "text-xs h-6",
				icon: "h-2.5 w-2.5 mr-0.5",
				title: "text-xs",
			};
		case "lg":
			return {
				container: "gap-4",
				layerContainer: "gap-3",
				badge: "text-sm h-8",
				icon: "h-4 w-4 mr-1.5",
				title: "text-sm",
			};
		default:
			return {
				container: "gap-3",
				layerContainer: "gap-2",
				badge: "text-xs h-7",
				icon: "h-3 w-3 mr-1",
				title: "text-sm",
			};
	}
}
