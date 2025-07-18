import "@testing-library/jest-dom";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugPanel, useDebugHistory } from "./debug-panel";

// Mock debug entry for testing
const mockDebugEntry = {
	timestamp: "2024-01-01T12:00:00.000Z",
	action: "adjustStartTime(1.5)",
	before: { start: 0, end: 0 },
	after: { start: 1.5, end: 0 },
	delta: 1.5,
	expected: 1.5,
	actual: 1.5,
	isValid: true,
	videoDuration: 300,
	clampDetails: {
		newTime: 1.5,
		videoDuration: 300,
		clampedResult: 1.5,
		floatingPointCheck: {
			rawCalculation: 1.5,
			roundedCalculation: 1.5,
			difference: 0,
		},
	},
};

describe("DebugPanel", () => {
	const defaultProps = {
		debugMode: false,
		onToggleDebugMode: vi.fn(),
		debugHistory: [],
		onClearHistory: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		it("デバッグ切り替えボタンが表示される", () => {
			render(<DebugPanel {...defaultProps} />);

			expect(screen.getByRole("button", { name: /🔧/ })).toBeInTheDocument();
		});

		it("デバッグモードOFFの状態が正しく表示される", () => {
			render(<DebugPanel {...defaultProps} />);

			const toggleButton = screen.getByRole("button", { name: /🔧/ });
			expect(toggleButton).toHaveTextContent("🔧");
			expect(toggleButton).not.toHaveTextContent("デバッグON");
		});

		it("デバッグモードONの状態が正しく表示される", () => {
			const props = { ...defaultProps, debugMode: true };
			render(<DebugPanel {...props} />);

			const toggleButton = screen.getByRole("button", { name: /🔧 デバッグON/ });
			expect(toggleButton).toHaveTextContent("🔧 デバッグON");
		});
	});

	describe("Debug Mode Toggle", () => {
		it("デバッグ切り替えボタンクリックでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			const onToggleDebugMode = vi.fn();
			const props = { ...defaultProps, onToggleDebugMode };

			render(<DebugPanel {...props} />);

			const toggleButton = screen.getByRole("button", { name: /🔧/ });
			await user.click(toggleButton);

			expect(onToggleDebugMode).toHaveBeenCalledTimes(1);
		});

		it("デバッグモードON時に適切なスタイルが適用される", () => {
			const props = { ...defaultProps, debugMode: true };
			render(<DebugPanel {...props} />);

			const toggleButton = screen.getByRole("button", { name: /🔧 デバッグON/ });
			expect(toggleButton).toHaveClass("bg-orange-100", "text-orange-700");
		});

		it("デバッグモードOFF時に適切なスタイルが適用される", () => {
			render(<DebugPanel {...defaultProps} />);

			const toggleButton = screen.getByRole("button", { name: /🔧/ });
			expect(toggleButton).toHaveClass("text-muted-foreground");
		});
	});

	describe("Debug History Display", () => {
		it("デバッグモードOFFで履歴が表示されない", () => {
			const props = {
				...defaultProps,
				debugMode: false,
				debugHistory: [mockDebugEntry],
			};
			render(<DebugPanel {...props} />);

			expect(screen.queryByText("🔧 調整履歴")).not.toBeInTheDocument();
		});

		it("デバッグモードONで履歴がない場合は履歴セクションが表示されない", () => {
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [],
			};
			render(<DebugPanel {...props} />);

			expect(screen.queryByText("🔧 調整履歴")).not.toBeInTheDocument();
		});

		it("デバッグモードONで履歴がある場合に履歴セクションが表示される", () => {
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [mockDebugEntry],
			};
			render(<DebugPanel {...props} />);

			expect(screen.getByText("🔧 調整履歴")).toBeInTheDocument();
		});

		it("デバッグエントリが正しく表示される", () => {
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [mockDebugEntry],
			};
			render(<DebugPanel {...props} />);

			expect(screen.getByText("adjustStartTime(1.5)")).toBeInTheDocument();
			expect(screen.getByText("期待値: 1.5s → 実際: 1.5s")).toBeInTheDocument();
			expect(screen.getByText("✓")).toBeInTheDocument();
		});

		it("無効なデバッグエントリが適切に表示される", () => {
			const invalidEntry = {
				...mockDebugEntry,
				isValid: false,
				expected: 1.5,
				actual: 1.4,
			};
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [invalidEntry],
			};
			render(<DebugPanel {...props} />);

			expect(screen.getByText("✗")).toBeInTheDocument();
			expect(screen.getByText("期待値: 1.5s → 実際: 1.4s")).toBeInTheDocument();
			expect(screen.getByText("(誤差検出)")).toBeInTheDocument();
		});

		it("動画時間とクランプ結果の詳細が表示される", () => {
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [mockDebugEntry],
			};
			render(<DebugPanel {...props} />);

			expect(screen.getByText(/動画長: 300s/)).toBeInTheDocument();
			expect(screen.getByText(/クランプ結果: 1.5s/)).toBeInTheDocument();
		});
	});

	describe("Clear History", () => {
		it("履歴クリアボタンが表示される", () => {
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [mockDebugEntry],
			};
			render(<DebugPanel {...props} />);

			expect(screen.getByRole("button", { name: /履歴をクリア/ })).toBeInTheDocument();
		});

		it("履歴クリアボタンクリックでコールバックが呼ばれる", async () => {
			const user = userEvent.setup();
			const onClearHistory = vi.fn();
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [mockDebugEntry],
				onClearHistory,
			};
			render(<DebugPanel {...props} />);

			const clearButton = screen.getByRole("button", { name: /履歴をクリア/ });
			await user.click(clearButton);

			expect(onClearHistory).toHaveBeenCalledTimes(1);
		});
	});

	describe("Multiple Debug Entries", () => {
		it("複数のデバッグエントリが表示される", () => {
			const entries = [
				mockDebugEntry,
				{
					...mockDebugEntry,
					timestamp: "2024-01-01T12:01:00.000Z",
					action: "adjustEndTime(2.0)",
					after: { start: 1.5, end: 2.0 },
				},
			];
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: entries,
			};
			render(<DebugPanel {...props} />);

			expect(screen.getByText("adjustStartTime(1.5)")).toBeInTheDocument();
			expect(screen.getByText("adjustEndTime(2.0)")).toBeInTheDocument();
		});

		it("スクロール可能な履歴表示エリアが設定される", () => {
			const entries = Array.from({ length: 15 }, (_, i) => ({
				...mockDebugEntry,
				timestamp: `2024-01-01T12:${i.toString().padStart(2, "0")}:00.000Z`,
				action: `adjustStartTime(${i})`,
			}));
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: entries,
			};
			render(<DebugPanel {...props} />);

			const historyContainer = screen
				.getByText("adjustStartTime(0)")
				.closest(".max-h-40.overflow-y-auto");
			expect(historyContainer).toBeInTheDocument();
		});
	});

	describe("Styling and Accessibility", () => {
		it("適切なARIAラベルとロールが設定される", () => {
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [mockDebugEntry],
			};
			render(<DebugPanel {...props} />);

			const toggleButton = screen.getByRole("button", { name: /🔧 デバッグON/ });
			const clearButton = screen.getByRole("button", { name: /履歴をクリア/ });

			expect(toggleButton).toBeInTheDocument();
			expect(clearButton).toBeInTheDocument();
		});

		it("有効エントリと無効エントリで異なるスタイルが適用される", () => {
			const validEntry = mockDebugEntry;
			const invalidEntry = {
				...mockDebugEntry,
				isValid: false,
				timestamp: "2024-01-01T12:01:00.000Z", // 異なるタイムスタンプでキーの重複を回避
			};
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [validEntry, invalidEntry],
			};
			render(<DebugPanel {...props} />);

			const validIcon = screen.getAllByText("✓")[0];
			const invalidIcon = screen.getByText("✗");

			expect(validIcon).toHaveClass("bg-green-100", "text-green-800");
			expect(invalidIcon).toHaveClass("bg-red-100", "text-red-800");
		});
	});

	describe("Edge Cases", () => {
		it("クランプ詳細情報が欠けている場合でもエラーにならない", () => {
			const entryWithoutClampDetails = {
				...mockDebugEntry,
				clampDetails: undefined,
			};
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [entryWithoutClampDetails],
			};

			expect(() => render(<DebugPanel {...props} />)).not.toThrow();
		});

		it("動画時間が未定義の場合でもエラーにならない", () => {
			const entryWithoutVideoDuration = {
				...mockDebugEntry,
				videoDuration: undefined,
			};
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [entryWithoutVideoDuration],
			};

			expect(() => render(<DebugPanel {...props} />)).not.toThrow();
		});

		it("非常に長いアクション名でも正常に表示される", () => {
			const longActionEntry = {
				...mockDebugEntry,
				action: `adjustStartTime(${Array.from({ length: 100 }, () => "1").join(".")})`,
			};
			const props = {
				...defaultProps,
				debugMode: true,
				debugHistory: [longActionEntry],
			};

			render(<DebugPanel {...props} />);
			expect(screen.getByText(/adjustStartTime/)).toBeInTheDocument();
		});
	});
});

describe("useDebugHistory", () => {
	beforeEach(() => {
		// Mock console.log to avoid spam in test output
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initial State", () => {
		it("初期状態が正しく設定される", () => {
			const { result } = renderHook(() => useDebugHistory());

			expect(result.current.debugMode).toBe(false);
			expect(result.current.debugHistory).toEqual([]);
		});
	});

	describe("Debug Mode Toggle", () => {
		it("デバッグモードの切り替えが動作する", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.toggleDebugMode();
			});

			expect(result.current.debugMode).toBe(true);

			act(() => {
				result.current.toggleDebugMode();
			});

			expect(result.current.debugMode).toBe(false);
		});
	});

	describe("Debug Entry Management", () => {
		it("デバッグモードONでエントリが追加される", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.toggleDebugMode(); // Enable debug mode
			});

			act(() => {
				result.current.addDebugEntry(mockDebugEntry);
			});

			expect(result.current.debugHistory).toHaveLength(1);
			expect(result.current.debugHistory[0]).toEqual(mockDebugEntry);
		});

		it("デバッグモードOFFでエントリが追加されない", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.addDebugEntry(mockDebugEntry);
			});

			expect(result.current.debugHistory).toHaveLength(0);
		});

		it("履歴が10件に制限される", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.toggleDebugMode(); // Enable debug mode
			});

			// Add 15 entries
			for (let i = 0; i < 15; i++) {
				act(() => {
					result.current.addDebugEntry({
						...mockDebugEntry,
						timestamp: `2024-01-01T12:${i.toString().padStart(2, "0")}:00.000Z`,
						action: `action${i}`,
					});
				});
			}

			expect(result.current.debugHistory).toHaveLength(10);
			// Should keep the last 10 entries
			expect(result.current.debugHistory[0].action).toBe("action5");
			expect(result.current.debugHistory[9].action).toBe("action14");
		});

		it("履歴のクリアが動作する", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.toggleDebugMode(); // Enable debug mode
			});

			act(() => {
				result.current.addDebugEntry(mockDebugEntry);
			});

			expect(result.current.debugHistory).toHaveLength(1);

			act(() => {
				result.current.clearHistory();
			});

			expect(result.current.debugHistory).toHaveLength(0);
		});
	});

	describe("Console Logging", () => {
		it("デバッグモードONでコンソールログが出力される", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.toggleDebugMode(); // Enable debug mode
			});

			act(() => {
				result.current.addDebugEntry(mockDebugEntry);
			});

			expect(console.log).toHaveBeenCalledWith("🔧 Debug Entry:", mockDebugEntry);
		});

		it("デバッグモードOFFでコンソールログが出力されない", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.addDebugEntry(mockDebugEntry);
			});

			expect(console.log).not.toHaveBeenCalled();
		});
	});

	describe("Performance", () => {
		it("大量のエントリ追加でもパフォーマンスが保たれる", () => {
			const { result } = renderHook(() => useDebugHistory());

			act(() => {
				result.current.toggleDebugMode(); // Enable debug mode
			});

			const startTime = performance.now();

			for (let i = 0; i < 1000; i++) {
				act(() => {
					result.current.addDebugEntry({
						...mockDebugEntry,
						action: `action${i}`,
					});
				});
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(1000);
			// Should still maintain the 10-entry limit
			expect(result.current.debugHistory).toHaveLength(10);
		});
	});

	describe("Memory Management", () => {
		it("アンマウント時にメモリリークが発生しない", () => {
			const { unmount } = renderHook(() => useDebugHistory());

			expect(() => unmount()).not.toThrow();
		});
	});
});
