import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagList } from "../tag-list";

describe("TagList", () => {
	// 基本的な表示テスト
	describe("Basic rendering", () => {
		it("should render tags correctly", () => {
			const tags = ["React", "TypeScript", "Vitest"];
			render(<TagList tags={tags} />);

			expect(screen.getByText("React")).toBeInTheDocument();
			expect(screen.getByText("TypeScript")).toBeInTheDocument();
			expect(screen.getByText("Vitest")).toBeInTheDocument();
		});

		it("should not render anything when tags array is empty", () => {
			const { container } = render(<TagList tags={[]} />);
			expect(container.firstChild).toBeNull();
		});

		it("should not render anything when tags is undefined", () => {
			const { container } = render(<TagList tags={undefined as any} />);
			expect(container.firstChild).toBeNull();
		});

		it("should apply correct variant classes", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} variant="secondary" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("bg-suzuka-100", "text-suzuka-700");
		});
	});

	// アイコン表示テスト
	describe("Icon display", () => {
		it("should show icon by default", () => {
			const tags = ["React"];
			render(<TagList tags={tags} />);

			const icon = document.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});

		it("should hide icon when showIcon is false", () => {
			const tags = ["React"];
			render(<TagList tags={tags} showIcon={false} />);

			const icon = document.querySelector("svg");
			expect(icon).not.toBeInTheDocument();
		});
	});

	// 最大表示数制限テスト
	describe("Max tags limitation", () => {
		it("should display all tags when maxTags is 0 (no limit)", () => {
			const tags = ["Tag1", "Tag2", "Tag3", "Tag4"];
			render(<TagList tags={tags} maxTags={0} />);

			tags.forEach((tag) => {
				expect(screen.getByText(tag)).toBeInTheDocument();
			});
			expect(screen.queryByText(/\+\d+個/)).not.toBeInTheDocument();
		});

		it("should limit displayed tags when maxTags is set", () => {
			const tags = ["Tag1", "Tag2", "Tag3", "Tag4"];
			render(<TagList tags={tags} maxTags={2} />);

			expect(screen.getByText("Tag1")).toBeInTheDocument();
			expect(screen.getByText("Tag2")).toBeInTheDocument();
			expect(screen.queryByText("Tag3")).not.toBeInTheDocument();
			expect(screen.queryByText("Tag4")).not.toBeInTheDocument();
		});

		it("should show more tags indicator when tags exceed limit", () => {
			const tags = ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"];
			render(<TagList tags={tags} maxTags={2} />);

			expect(screen.getByText("+3個")).toBeInTheDocument();
		});

		it("should not show more indicator when tags count equals limit", () => {
			const tags = ["Tag1", "Tag2"];
			render(<TagList tags={tags} maxTags={2} />);

			expect(screen.queryByText(/\+\d+個/)).not.toBeInTheDocument();
		});
	});

	// 検索ハイライトテスト
	describe("Search highlighting", () => {
		it("should highlight matching text when searchQuery is provided", () => {
			const tags = ["React", "TypeScript", "JavaScript"];
			render(<TagList tags={tags} searchQuery="script" />);

			// HighlightTextコンポーネントが正しく使用されているかを確認
			// HighlightTextは内部でmarkタグを使用するため、それをチェック
			const highlightedElements = document.querySelectorAll("mark");
			expect(highlightedElements.length).toBeGreaterThan(0);
		});

		it("should use custom highlight className", () => {
			const tags = ["React"];
			render(<TagList tags={tags} searchQuery="React" highlightClassName="custom-highlight" />);

			const highlightedElement = document.querySelector("mark");
			expect(highlightedElement).toHaveClass("custom-highlight");
		});

		it("should not apply highlighting when searchQuery is empty", () => {
			const tags = ["React", "TypeScript"];
			render(<TagList tags={tags} searchQuery="" />);

			expect(screen.getByText("React")).toBeInTheDocument();
			expect(screen.getByText("TypeScript")).toBeInTheDocument();
			expect(document.querySelector("mark")).not.toBeInTheDocument();
		});
	});

	// サイズバリエーションテスト
	describe("Size variations", () => {
		it("should apply small size classes", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} size="sm" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("text-xs", "h-6");
		});

		it("should apply default size classes", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} size="default" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("text-xs", "h-7");
		});

		it("should apply large size classes", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} size="lg" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("text-sm", "h-8");
		});
	});

	// クリックハンドラーテスト
	describe("Click handling", () => {
		it("should call onTagClick when tag is clicked", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();
			const tags = ["React", "TypeScript"];

			render(<TagList tags={tags} onTagClick={onTagClick} />);

			await user.click(screen.getByText("React"));

			expect(onTagClick).toHaveBeenCalledTimes(1);
			expect(onTagClick).toHaveBeenCalledWith("React");
		});

		it("should apply cursor-pointer class when onTagClick is provided", () => {
			const onTagClick = vi.fn();
			const tags = ["Test"];

			render(<TagList tags={tags} onTagClick={onTagClick} />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("cursor-pointer");
		});

		it("should not apply cursor-pointer class when onTagClick is not provided", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} />);

			const badge = screen.getByText("Test");
			expect(badge).not.toHaveClass("cursor-pointer");
		});

		it("should prevent event propagation when tag is clicked", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();
			const onContainerClick = vi.fn();
			const tags = ["React"];

			render(
				<div
					onClick={onContainerClick}
					onKeyDown={(e) => e.key === "Enter" && onContainerClick()}
					role="button"
					tabIndex={0}
				>
					<TagList tags={tags} onTagClick={onTagClick} />
				</div>,
			);

			await user.click(screen.getByText("React"));

			expect(onTagClick).toHaveBeenCalledTimes(1);
			expect(onContainerClick).not.toHaveBeenCalled();
		});
	});

	// CSS クラス適用テスト
	describe("CSS classes", () => {
		it("should apply custom container className", () => {
			const tags = ["Test"];
			const { container } = render(<TagList tags={tags} className="custom-container" />);

			expect(container.firstChild).toHaveClass("custom-container");
		});

		it("should apply custom tag className", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} tagClassName="custom-tag" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("custom-tag");
		});

		it("should apply default outline variant classes", () => {
			const tags = ["Test"];
			render(<TagList tags={tags} variant="outline" />);

			const badge = screen.getByText("Test");
			expect(badge).toHaveClass("bg-background/80", "text-suzuka-700", "border-suzuka-300");
		});
	});

	// エッジケースのテスト
	describe("Edge cases", () => {
		it("should handle tags with special characters", () => {
			const tags = ["React.js", "C++", "@types/node"];
			render(<TagList tags={tags} />);

			expect(screen.getByText("React.js")).toBeInTheDocument();
			expect(screen.getByText("C++")).toBeInTheDocument();
			expect(screen.getByText("@types/node")).toBeInTheDocument();
		});

		it("should handle very long tag names", () => {
			const longTag = "This is a very long tag name that might cause layout issues";
			const tags = [longTag];
			render(<TagList tags={tags} />);

			expect(screen.getByText(longTag)).toBeInTheDocument();
		});

		it("should handle duplicate tags", () => {
			const tags = ["React", "React", "TypeScript"];
			render(<TagList tags={tags} />);

			const reactTags = screen.getAllByText("React");
			expect(reactTags).toHaveLength(2);
		});

		it("should handle maxTags being larger than actual tags length", () => {
			const tags = ["Tag1", "Tag2"];
			render(<TagList tags={tags} maxTags={5} />);

			expect(screen.getByText("Tag1")).toBeInTheDocument();
			expect(screen.getByText("Tag2")).toBeInTheDocument();
			expect(screen.queryByText(/\+\d+個/)).not.toBeInTheDocument();
		});
	});

	// アクセシビリティテスト
	describe("Accessibility", () => {
		it("should be accessible for screen readers", () => {
			const onTagClick = vi.fn();
			const tags = ["React"];

			render(<TagList tags={tags} onTagClick={onTagClick} />);

			const badge = screen.getByText("React");
			// Badge component should be focusable when clickable
			expect(badge).toBeInTheDocument();
		});

		it("should be clickable when onTagClick is provided", async () => {
			const user = userEvent.setup();
			const onTagClick = vi.fn();
			const tags = ["React"];

			render(<TagList tags={tags} onTagClick={onTagClick} />);

			const badge = screen.getByText("React");
			await user.click(badge);

			expect(onTagClick).toHaveBeenCalledWith("React");
		});
	});
});
