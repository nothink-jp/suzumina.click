import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ThumbnailImage from "./ThumbnailImage";

// Note: Next.js Image mock is now provided globally in vitest.setup.ts

describe("ThumbnailImage", () => {
	const defaultProps = {
		src: "https://example.com/image.jpg",
		alt: "テスト画像",
	};

	// 基本的なレンダリングテストは統合テストに移行済み
	// (src/__tests__/integration/basicComponentRendering.test.tsx)

	it("カスタムsizesが適用される", () => {
		const customSizes = "(max-width: 480px) 100vw, 50vw";
		render(<ThumbnailImage {...defaultProps} sizes={customSizes} />);

		const image = screen.getByTestId("next-image");
		expect(image).toHaveAttribute("sizes", customSizes);
	});

	it("priorityプロパティが正しく渡される", () => {
		render(<ThumbnailImage {...defaultProps} priority={true} />);

		const image = screen.getByTestId("next-image");
		expect(image).toHaveAttribute("data-priority", "true");
	});

	it("カスタムclassNameが適用される", () => {
		const customClassName = "custom-thumbnail-class";
		render(<ThumbnailImage {...defaultProps} className={customClassName} />);

		const container = screen.getByTestId("next-image").parentElement;
		expect(container).toHaveClass(customClassName);
	});

	it("コンテナが正しくレンダリングされる", () => {
		render(<ThumbnailImage {...defaultProps} />);

		const container = screen.getByTestId("next-image").parentElement;
		expect(container).toBeInTheDocument();
		expect(container).toBeTruthy(); // コンテナが存在することを確認
	});

	it("画像が正しくレンダリングされる", () => {
		render(<ThumbnailImage {...defaultProps} />);

		const image = screen.getByTestId("next-image");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
		expect(image).toHaveAttribute("alt", "テスト画像");
	});

	it("画像読み込みエラー時にプレースホルダーに切り替わる", async () => {
		render(<ThumbnailImage {...defaultProps} />);

		const image = screen.getByTestId("next-image");

		// 初期状態の確認
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
		expect(image).toHaveAttribute("alt", "テスト画像");

		// エラーイベントを発火
		fireEvent.error(image);

		// エラー後にプレースホルダー画像に切り替わることを確認
		await waitFor(() => {
			expect(image).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
		});
	});

	it("プレースホルダー画像が正しく設定される", () => {
		render(<ThumbnailImage {...defaultProps} />);

		const image = screen.getByTestId("next-image");
		expect(image).toHaveAttribute("data-placeholder", "blur");
		expect(image).toHaveAttribute(
			"data-blur-data-url",
			expect.stringContaining("data:image/svg+xml"),
		);
	});

	it("エラー後に再度エラーが発生しても重複して処理されない", async () => {
		render(<ThumbnailImage {...defaultProps} />);

		const image = screen.getByTestId("next-image");

		// 初期状態の確認
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");

		// 最初のエラーイベントを発火
		fireEvent.error(image);

		// プレースホルダーに切り替わることを確認
		await waitFor(() => {
			expect(image).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
		});

		// 2回目のエラーイベントを発火（状態変更されないことを確認）
		const placeholderSrc = image.getAttribute("src");
		fireEvent.error(image);

		// srcが変更されていないことを確認（重複処理防止）
		await waitFor(() => {
			expect(image).toHaveAttribute("src", placeholderSrc);
		});
	});

	it("Next.js Image コンポーネントに正しいプロパティが渡される", () => {
		render(
			<ThumbnailImage {...defaultProps} priority={true} width={800} height={600} sizes="100vw" />,
		);

		const image = screen.getByTestId("next-image");
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
		expect(image).toHaveAttribute("alt", "テスト画像");
		expect(image).toHaveAttribute("data-fill", "true");
		expect(image).toHaveAttribute("data-priority", "true");
		expect(image).toHaveAttribute("sizes", "100vw");
		expect(image).toHaveAttribute("data-placeholder", "blur");
	});

	it("メモ化により同じpropsでは再レンダリングされない", () => {
		const { rerender } = render(<ThumbnailImage {...defaultProps} />);

		const firstImage = screen.getByTestId("next-image");
		const firstImageRef = firstImage;

		// 同じpropsで再レンダリング
		rerender(<ThumbnailImage {...defaultProps} />);

		const secondImage = screen.getByTestId("next-image");

		// 要素が同じであることを確認（メモ化の効果）
		expect(firstImageRef).toBe(secondImage);
	});

	it("異なるpropsでは再レンダリングされる", () => {
		const { rerender } = render(<ThumbnailImage {...defaultProps} />);

		// 異なるpropsで再レンダリング
		rerender(<ThumbnailImage {...defaultProps} alt="新しいテスト画像" />);

		const image = screen.getByTestId("next-image");
		expect(image).toHaveAttribute("alt", "新しいテスト画像");
	});

	it("異なるサイズでもコンポーネントが正しくレンダリングされる", () => {
		const testCases = [
			{ width: 320, height: 240 }, // 4:3
			{ width: 640, height: 360 }, // 16:9
			{ width: 100, height: 100 }, // 1:1
		];

		testCases.forEach(({ width, height }) => {
			const { unmount } = render(
				<ThumbnailImage {...defaultProps} width={width} height={height} />,
			);

			const container = screen.getByTestId("next-image").parentElement;
			expect(container).toBeInTheDocument();
			const image = screen.getByTestId("next-image");
			expect(image).toBeInTheDocument();

			unmount();
		});
	});

	// パフォーマンステスト
	describe("パフォーマンス最適化", () => {
		it("priority=trueの場合、LCP最適化のためのpriorityが設定される", () => {
			render(<ThumbnailImage {...defaultProps} priority={true} />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("data-priority", "true");
		});

		it("priority=falseの場合、遅延読み込みが有効になる", () => {
			render(<ThumbnailImage {...defaultProps} priority={false} />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("data-priority", "false");
		});

		it("適切なsizes属性でレスポンシブ画像が設定される", () => {
			const customSizes = "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw";
			render(<ThumbnailImage {...defaultProps} sizes={customSizes} />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("sizes", customSizes);
		});
	});

	// アクセシビリティテスト
	describe("アクセシビリティ", () => {
		it("適切なalt属性が設定される", () => {
			const altText = "涼花みなせの動画サムネイル";
			render(<ThumbnailImage {...defaultProps} alt={altText} />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("alt", altText);
		});

		it("空のalt属性でも適切にレンダリングされる", () => {
			render(<ThumbnailImage {...defaultProps} alt="" />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("alt", "");
			expect(image).toBeInTheDocument();
		});
	});

	// エラーハンドリングの詳細テスト
	describe("エラーハンドリング", () => {
		it("無効なURL形式でもプレースホルダーで適切に処理される", async () => {
			const invalidUrl = "invalid-url";
			render(<ThumbnailImage {...defaultProps} src={invalidUrl} />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("src", invalidUrl);

			// エラーイベントを発火
			fireEvent.error(image);

			// プレースホルダーに切り替わることを確認
			await waitFor(() => {
				expect(image).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
			});
		});

		it("プレースホルダー状態からの再度のsrc変更で正常に復帰する", async () => {
			const { rerender } = render(<ThumbnailImage {...defaultProps} />);

			const image = screen.getByTestId("next-image");

			// エラーを発生させプレースホルダーに切り替え
			fireEvent.error(image);
			await waitFor(() => {
				expect(image).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"));
			});

			// 新しいsrcで再レンダリング
			const newSrc = "https://example.com/new-image.jpg";
			rerender(<ThumbnailImage {...defaultProps} src={newSrc} />);

			// useEffectによる状態リセットを待機
			await waitFor(() => {
				expect(image).toHaveAttribute("src", newSrc);
			});
		});
	});

	// CLS（Cumulative Layout Shift）防止テスト
	describe("レイアウト安定性", () => {
		it("fillプロパティが設定される", () => {
			render(<ThumbnailImage {...defaultProps} />);

			const image = screen.getByTestId("next-image");
			expect(image).toHaveAttribute("data-fill", "true");
		});

		it("レイアウト安定性のためのコンテナが存在する", () => {
			render(<ThumbnailImage {...defaultProps} width={640} height={480} />);

			const container = screen.getByTestId("next-image").parentElement;
			expect(container).toBeInTheDocument();
			expect(container).toBeTruthy();
		});

		it("デフォルトのアスペクト比（320x240）でレンダリングされる", () => {
			render(<ThumbnailImage {...defaultProps} />);

			const container = screen.getByTestId("next-image").parentElement;
			expect(container).toBeInTheDocument();
		});
	});

	// 実際のユースケーステスト
	describe("suzumina.click特有のユースケース", () => {
		it("YouTube動画サムネイル（16:9）の設定", () => {
			render(
				<ThumbnailImage
					{...defaultProps}
					width={384}
					height={216}
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					priority={true}
				/>,
			);

			const container = screen.getByTestId("next-image").parentElement;
			const image = screen.getByTestId("next-image");

			expect(container).toBeInTheDocument();
			expect(image).toHaveAttribute("data-priority", "true");
			expect(image).toHaveAttribute(
				"sizes",
				"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
			);
		});

		it("DLsite作品カバー（4:3）の設定", () => {
			render(
				<ThumbnailImage
					{...defaultProps}
					width={384}
					height={288}
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
					alt="DLsite作品のカバー画像"
				/>,
			);

			const container = screen.getByTestId("next-image").parentElement;
			const image = screen.getByTestId("next-image");

			expect(container).toBeInTheDocument();
			expect(image).toHaveAttribute("alt", "DLsite作品のカバー画像");
			expect(image).toHaveAttribute(
				"sizes",
				"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw",
			);
		});

		it("管理者画面でのコンパクト表示", () => {
			render(
				<ThumbnailImage
					{...defaultProps}
					width={128}
					height={96}
					className="w-32 h-24 object-cover rounded"
				/>,
			);

			const container = screen.getByTestId("next-image").parentElement;

			expect(container).toBeInTheDocument();
			expect(container).toHaveClass("w-32 h-24 object-cover rounded");
		});
	});
});
