"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { useCallback, useRef, useState } from "react";

interface DebugEntry {
	timestamp: string;
	action: string;
	before: { start: number; end: number };
	after: { start: number; end: number };
	delta: number;
	expected: number;
	actual: number;
	isValid: boolean;
	videoDuration?: number;
	clampDetails?: {
		newTime: number;
		videoDuration: number;
		clampedResult: number;
		floatingPointCheck: {
			rawCalculation: number;
			roundedCalculation: number;
			difference: number;
		};
	};
}

interface DebugPanelProps {
	debugMode: boolean;
	onToggleDebugMode: () => void;
	debugHistory: DebugEntry[];
	onClearHistory: () => void;
}

export function DebugPanel({
	debugMode,
	onToggleDebugMode,
	debugHistory,
	onClearHistory,
}: DebugPanelProps) {
	return (
		<>
			{/* デバッグトグルボタン */}
			<Button
				variant="ghost"
				size="sm"
				onClick={onToggleDebugMode}
				className={`text-xs ${debugMode ? "bg-orange-100 text-orange-700" : "text-muted-foreground"}`}
			>
				{debugMode ? "🔧 デバッグON" : "🔧"}
			</Button>

			{/* デバッグ履歴表示 */}
			{debugMode && debugHistory.length > 0 && (
				<div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
					<h4 className="text-sm font-medium text-orange-800 mb-2">🔧 調整履歴</h4>
					<div className="space-y-1 max-h-40 overflow-y-auto">
						{debugHistory.map((entry) => (
							<div key={entry.timestamp} className="text-xs">
								<div className="flex items-center justify-between">
									<span className="text-orange-700 font-mono">{entry.action}</span>
									<span
										className={`px-1 rounded text-xs ${
											entry.isValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
										}`}
									>
										{entry.isValid ? "✓" : "✗"}
									</span>
								</div>
								<div className="text-orange-600 ml-2">
									期待値: {entry.expected.toFixed(1)}s → 実際: {entry.actual.toFixed(1)}s
									{!entry.isValid && <span className="text-red-600 font-medium"> (誤差検出)</span>}
									{entry.videoDuration && (
										<div className="text-xs text-orange-500 mt-1">
											動画長: {entry.videoDuration}s | クランプ結果:{" "}
											{entry.clampDetails?.clampedResult?.toFixed(1)}s
										</div>
									)}
								</div>
							</div>
						))}
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClearHistory}
						className="w-full mt-2 text-xs text-orange-700 hover:text-orange-800"
					>
						履歴をクリア
					</Button>
				</div>
			)}
		</>
	);
}

export function useDebugHistory() {
	const [debugMode, setDebugMode] = useState(false);
	const [debugHistory, setDebugHistory] = useState<DebugEntry[]>([]);
	const debugModeRef = useRef(debugMode);

	// refを同期
	debugModeRef.current = debugMode;

	const toggleDebugMode = useCallback(() => setDebugMode((prev) => !prev), []);

	const addDebugEntry = useCallback((entry: DebugEntry) => {
		if (debugModeRef.current) {
			setDebugHistory((prev) => [...prev.slice(-9), entry]);
			// biome-ignore lint/suspicious/noConsole: デバッグ用のログ出力
			console.log("🔧 Debug Entry:", entry);
		}
	}, []);

	const clearHistory = useCallback(() => setDebugHistory([]), []);

	return {
		debugMode,
		debugHistory,
		toggleDebugMode,
		addDebugEntry,
		clearHistory,
	};
}
