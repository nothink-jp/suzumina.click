import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThreeLayerTagDisplay, VideoTagDisplay } from "./three-layer-tag-display";

describe("VideoTagDisplay", () => {
	// 基本的な表示テスト
	describe("Basic rendering", () => {
		it("should render playlist tags correctly", () => {
			const playlistTags = ["配信", "雑談", "ASMR"];
			render(<VideoTagDisplay playlistTags={playlistTags} />);

			expect(screen.getByText("配信")).toBeInTheDocument();
			expect(screen.getByText("雑談")).toBeInTheDocument();
			expect(screen.getByText("ASMR")).toBeInTheDocument();
		});

		it("should render user tags correctly", () => {
			const userTags = ["可愛い", "癒し", "応援"];
			render(<VideoTagDisplay userTags={userTags} />);

			expect(screen.getByText("可愛い")).toBeInTheDocument();
			expect(screen.getByText("癒し")).toBeInTheDocument();
			expect(screen.getByText("応援")).toBeInTheDocument();
		});

		it("should render category when provided", () => {
			render(
				<VideoTagDisplay categoryId="24" categoryName="エンターテイメント" showCategory={true} />,
			);

			expect(screen.getByText("エンターテイメント")).toBeInTheDocument();
		});

		it("should not render category when showCategory is false", () => {
			render(
				<VideoTagDisplay categoryId="24" categoryName="エンターテイメント" showCategory={false} />,
			);

			expect(screen.queryByText("エンターテイメント")).not.toBeInTheDocument();
		});
	});

	// 空状態の処理テスト
	describe("Empty state handling", () => {
		it("should return null when all layers are empty and showEmptyLayers is false", () => {
			const { container } = render(
				<VideoTagDisplay playlistTags={[]} userTags={[]} showEmptyLayers={false} />,
			);

			expect(container.firstChild).toBeNull();
		});

		it("should show empty layers when showEmptyLayers is true", () => {
			render(<VideoTagDisplay playlistTags={[]} userTags={[]} showEmptyLayers={true} />);

			expect(screen.getByText("配信タイプ")).toBeInTheDocument();
			expect(screen.getByText("みんなのタグ")).toBeInTheDocument();
			expect(screen.getAllByText("設定なし")).toHaveLength(2);
		});

		it("should only render non-empty layers when showEmptyLayers is false", () => {
			render(<VideoTagDisplay playlistTags={["配信"]} userTags={[]} showEmptyLayers={false} />);

			expect(screen.getByText("配信タイプ")).toBeInTheDocument();
			expect(screen.getByText("配信")).toBeInTheDocument();
			expect(screen.queryByText("みんなのタグ")).not.toBeInTheDocument();
		});
	});

	// 最大表示数制限テスト
	describe("Max tags per layer", () => {
		it("should limit tags per layer when maxTagsPerLayer is set", () => {
			const playlistTags = ["Tag1", "Tag2", "Tag3", "Tag4"];
			render(<VideoTagDisplay playlistTags={playlistTags} maxTagsPerLayer={2} />);

			expect(screen.getByText("Tag1")).toBeInTheDocument();
			expect(screen.getByText("Tag2")).toBeInTheDocument();
			expect(screen.queryByText("Tag3")).not.toBeInTheDocument();
			expect(screen.queryByText("Tag4")).not.toBeInTheDocument();
		});

		it("should show more indicator when tags exceed limit", () => {
			const playlistTags = ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"];
			render(<VideoTagDisplay playlistTags={playlistTags} maxTagsPerLayer={2} />);

			expect(screen.getByText("+3個")).toBeInTheDocument();
		});

		it("should not show more indicator when maxTagsPerLayer is 0", () => {
			const playlistTags = ["Tag1", "Tag2", "Tag3"];
			render(<VideoTagDisplay playlistTags={playlistTags} maxTagsPerLayer={0} />);

			playlistTags.forEach((tag) => {
				expect(screen.getByText(tag)).toBeInTheDocument();
			});
			expect(screen.queryByText(/\+\d+個/)).not.toBeInTheDocument();
		});
	});

	// サイズバリエーションテスト
	describe("Size variations", () => {
		it("should apply small size classes", () => {
			render(<VideoTagDisplay playlistTags={["Test"]} size="sm" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("text-xs", "h-6");
		});

		it("should apply default size classes", () => {
			render(<VideoTagDisplay playlistTags={["Test"]} size="default" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("text-xs", "h-7");
		});

		it("should apply large size classes", () => {
			render(<VideoTagDisplay playlistTags={["Test"]} size="lg" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("text-sm", "h-8");
		});
	});

	// 検索ハイライトテスト
	describe("Search highlighting", () => {
		it("should highlight matching text when searchQuery is provided", () => {
			render(<VideoTagDisplay playlistTags={["配信ASMR"]} searchQuery="ASMR" />);

			const highlightedElements = document.querySelectorAll("mark");
			expect(highlightedElements.length).toBeGreaterThan(0);
		});

		it("should use custom highlight className", () => {
			render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					searchQuery="配信"
					highlightClassName="custom-highlight"
				/>,
			);

			const highlightedElement = document.querySelector("mark");
			expect(highlightedElement).toHaveClass("custom-highlight");
		});
	});

	// クリックハンドラーテスト
	describe("Click handling", () => {
		it("should call onTagClick with correct parameters for playlist tags", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();

			render(<VideoTagDisplay playlistTags={["配信"]} onTagClick={onTagClick} />);

			await user.click(screen.getByText("配信"));

			expect(onTagClick).toHaveBeenCalledTimes(1);
			expect(onTagClick).toHaveBeenCalledWith("配信", "playlist");
		});

		it("should call onTagClick with correct parameters for user tags", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();

			render(<VideoTagDisplay userTags={["可愛い"]} onTagClick={onTagClick} />);

			await user.click(screen.getByText("可愛い"));

			expect(onTagClick).toHaveBeenCalledTimes(1);
			expect(onTagClick).toHaveBeenCalledWith("可愛い", "user");
		});

		it("should call onTagClick with correct parameters for category", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();

			render(
				<VideoTagDisplay
					categoryId="24"
					categoryName="エンターテイメント"
					onTagClick={onTagClick}
				/>,
			);

			await user.click(screen.getByText("エンターテイメント"));

			expect(onTagClick).toHaveBeenCalledTimes(1);
			expect(onTagClick).toHaveBeenCalledWith("エンターテイメント", "category");
		});

		it("should prevent event propagation when tag is clicked", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();
			const onContainerClick = vi.fn();

			render(
				<div
					onClick={onContainerClick}
					onKeyDown={(e) => e.key === "Enter" && onContainerClick()}
					role="button"
					tabIndex={0}
				>
					<VideoTagDisplay playlistTags={["配信"]} onTagClick={onTagClick} />
				</div>,
			);

			await user.click(screen.getByText("配信"));

			expect(onTagClick).toHaveBeenCalledTimes(1);
			expect(onContainerClick).not.toHaveBeenCalled();
		});
	});

	// コンパクト表示モードテスト
	describe("Compact mode", () => {
		it("should render in compact mode", () => {
			render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					userTags={["可愛い"]}
					categoryId="24"
					categoryName="エンターテイメント"
					compact={true}
				/>,
			);

			// コンパクトモードでは層のタイトルが表示されない
			expect(screen.queryByText("配信タイプ")).not.toBeInTheDocument();
			expect(screen.queryByText("みんなのタグ")).not.toBeInTheDocument();
			expect(screen.queryByText("ジャンル")).not.toBeInTheDocument();

			// タグは表示される
			expect(screen.getByText("配信")).toBeInTheDocument();
			expect(screen.getByText("可愛い")).toBeInTheDocument();
			expect(screen.getByText("エンターテイメント")).toBeInTheDocument();
		});

		it("should apply correct colors in compact mode", () => {
			render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					userTags={["可愛い"]}
					categoryId="24"
					categoryName="エンターテイメント"
					compact={true}
				/>,
			);

			// カテゴリはsuzuka-700色
			const categoryBadge = screen.getByText("エンターテイメント");
			expect(categoryBadge).toHaveClass("bg-suzuka-700", "text-white");

			// 配信タイプはsuzuka-500色
			const playlistBadge = screen.getByText("配信");
			expect(playlistBadge).toHaveClass("bg-suzuka-500", "text-white");

			// ユーザータグはsuzuka-50色
			const userBadge = screen.getByText("可愛い");
			expect(userBadge).toHaveClass("bg-suzuka-50", "text-suzuka-700");
		});
	});

	// 表示順序テスト
	describe("Display order", () => {
		it("should display in default order (playlist -> user -> category)", () => {
			const { container } = render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					userTags={["可愛い"]}
					categoryId="24"
					categoryName="エンターテイメント"
					order="default"
					showEmptyLayers={true}
				/>,
			);

			const sections = container.querySelectorAll(".space-y-2");
			const sectionTexts = Array.from(sections).map((section) => section.textContent);

			// 配信タイプが最初に来る
			expect(sectionTexts[0]).toContain("配信タイプ");
			expect(sectionTexts[1]).toContain("みんなのタグ");
			expect(sectionTexts[2]).toContain("ジャンル");
		});

		it("should display in detail order (category -> playlist -> user)", () => {
			const { container } = render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					userTags={["可愛い"]}
					categoryId="24"
					categoryName="エンターテイメント"
					order="detail"
					showEmptyLayers={true}
				/>,
			);

			const sections = container.querySelectorAll(".space-y-2");
			const sectionTexts = Array.from(sections).map((section) => section.textContent);

			// ジャンルが最初に来る
			expect(sectionTexts[0]).toContain("ジャンル");
			expect(sectionTexts[1]).toContain("配信タイプ");
			expect(sectionTexts[2]).toContain("みんなのタグ");
		});
	});

	// CSS クラス適用テスト
	describe("CSS classes", () => {
		it("should apply custom container className", () => {
			const { container } = render(
				<VideoTagDisplay playlistTags={["Test"]} className="custom-container" />,
			);

			expect(container.firstChild).toHaveClass("custom-container");
		});

		it("should apply correct badge classes for each layer", () => {
			render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					userTags={["可愛い"]}
					categoryId="24"
					categoryName="エンターテイメント"
				/>,
			);

			// 配信タイプはsuzuka-500色
			const playlistBadge = screen.getByText("配信");
			expect(playlistBadge).toHaveClass("bg-suzuka-500", "text-white");

			// ユーザータグはsuzuka-50色
			const userBadge = screen.getByText("可愛い");
			expect(userBadge).toHaveClass("bg-suzuka-50", "text-suzuka-700");

			// カテゴリはsuzuka-700色
			const categoryBadge = screen.getByText("エンターテイメント");
			expect(categoryBadge).toHaveClass("bg-suzuka-700", "text-white");
		});
	});

	// エッジケースのテスト
	describe("Edge cases", () => {
		it("should handle undefined props gracefully", () => {
			const { container } = render(<VideoTagDisplay />);

			// showEmptyLayersがfalseの場合、空のレイヤーは表示されない
			expect(container.firstChild).toBeNull();
		});

		it("should handle very long tag names", () => {
			const longTag = "これはとても長いタグ名でレイアウトに問題を起こす可能性があります";
			render(<VideoTagDisplay playlistTags={[longTag]} />);

			expect(screen.getByText(longTag)).toBeInTheDocument();
		});

		it("should handle special characters in tags", () => {
			const specialTags = ["C++", "@voice", "#ASMR", "配信/雑談"];
			render(<VideoTagDisplay playlistTags={specialTags} />);

			specialTags.forEach((tag) => {
				expect(screen.getByText(tag)).toBeInTheDocument();
			});
		});

		it("should handle maxTagsPerLayer being larger than actual tags", () => {
			const tags = ["Tag1", "Tag2"];
			render(<VideoTagDisplay playlistTags={tags} maxTagsPerLayer={5} />);

			tags.forEach((tag) => {
				expect(screen.getByText(tag)).toBeInTheDocument();
			});
			expect(screen.queryByText(/\+\d+個/)).not.toBeInTheDocument();
		});
	});

	// アクセシビリティテスト
	describe("Accessibility", () => {
		it("should have proper section headers", () => {
			render(
				<VideoTagDisplay playlistTags={["配信"]} userTags={["可愛い"]} showEmptyLayers={true} />,
			);

			expect(screen.getByText("配信タイプ")).toBeInTheDocument();
			expect(screen.getByText("みんなのタグ")).toBeInTheDocument();
		});

		it("should have descriptive text for each layer", () => {
			render(
				<VideoTagDisplay
					playlistTags={["配信"]}
					userTags={["可愛い"]}
					categoryId="24"
					categoryName="エンターテイメント"
					showEmptyLayers={true}
				/>,
			);

			expect(screen.getByText("(録画時間による自動分類)")).toBeInTheDocument();
			expect(screen.getByText("(ユーザーが自由に追加)")).toBeInTheDocument();
			expect(screen.getByText("(YouTube分類)")).toBeInTheDocument();
		});

		it("should be clickable for tags with onTagClick", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();

			render(<VideoTagDisplay playlistTags={["配信"]} onTagClick={onTagClick} />);

			const badge = screen.getByText("配信");
			await user.click(badge);

			expect(onTagClick).toHaveBeenCalledWith("配信", "playlist");
		});
	});

	// 後方互換性テスト
	describe("Backward compatibility", () => {
		it("should export ThreeLayerTagDisplay as alias", () => {
			expect(ThreeLayerTagDisplay).toBe(VideoTagDisplay);
		});

		it("should work with ThreeLayerTagDisplay component name", () => {
			render(<ThreeLayerTagDisplay playlistTags={["配信"]} userTags={["可愛い"]} />);

			expect(screen.getByText("配信")).toBeInTheDocument();
			expect(screen.getByText("可愛い")).toBeInTheDocument();
		});
	});
});
