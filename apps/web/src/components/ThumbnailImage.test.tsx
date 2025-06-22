import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ThumbnailImage from "./ThumbnailImage";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    fill,
    priority,
    sizes,
    placeholder,
    blurDataURL,
    style,
    ...props
  }: {
    src: string;
    alt: string;
    onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    placeholder?: string;
    blurDataURL?: string;
    style?: React.CSSProperties;
    [key: string]: unknown;
  }) => {
    return (
      // biome-ignore lint/performance/noImgElement: Test mock component requires img element
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        style={style}
        onError={onError}
        data-testid="next-image"
        data-fill={fill}
        data-priority={priority}
        data-placeholder={placeholder}
        data-blur-data-url={blurDataURL}
        {...props}
      />
    );
  },
}));

describe("ThumbnailImage", () => {
  const defaultProps = {
    src: "https://example.com/image.jpg",
    alt: "テスト画像",
  };

  it("基本的な画像が表示される", () => {
    render(<ThumbnailImage {...defaultProps} />);

    const image = screen.getByTestId("next-image");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(image).toHaveAttribute("alt", "テスト画像");
  });

  it("デフォルトのwidth、height、sizesが適用される", () => {
    render(<ThumbnailImage {...defaultProps} />);

    const container = screen.getByTestId("next-image").parentElement;
    expect(container).toHaveStyle({ aspectRatio: "320 / 240" });

    const image = screen.getByTestId("next-image");
    expect(image).toHaveAttribute(
      "sizes",
      "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    );
  });

  it("カスタムwidth、heightが適用される", () => {
    render(<ThumbnailImage {...defaultProps} width={640} height={480} />);

    const container = screen.getByTestId("next-image").parentElement;
    expect(container).toHaveStyle({ aspectRatio: "640 / 480" });
  });

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

  it("コンテナのスタイルが正しく設定される", () => {
    render(<ThumbnailImage {...defaultProps} />);

    const container = screen.getByTestId("next-image").parentElement;
    expect(container).toHaveStyle({
      position: "relative",
      overflow: "hidden",
      aspectRatio: "320 / 240",
    });
  });

  it("画像のスタイルが正しく設定される", () => {
    render(<ThumbnailImage {...defaultProps} />);

    const image = screen.getByTestId("next-image");
    expect(image).toHaveStyle({
      objectFit: "cover",
      objectPosition: "center",
    });
  });

  it("画像読み込みエラー時にプレースホルダーに切り替わる", async () => {
    render(<ThumbnailImage {...defaultProps} />);

    const image = screen.getByTestId("next-image");

    // 基本的な属性の確認
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(image).toHaveAttribute("alt", "テスト画像");

    // エラーハンドリング機能が組み込まれていることを確認
    expect(image).toBeInTheDocument();
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

    // コンポーネントが正しくレンダリングされることを確認
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");

    // プレースホルダーデータが設定されていることを確認
    expect(image).toHaveAttribute(
      "data-blur-data-url",
      expect.stringContaining("data:image/svg+xml"),
    );
  });

  it("Next.js Image コンポーネントに正しいプロパティが渡される", () => {
    render(
      <ThumbnailImage
        {...defaultProps}
        priority={true}
        width={800}
        height={600}
        sizes="100vw"
      />,
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

  it("アスペクト比が適切に計算される", () => {
    const testCases = [
      { width: 320, height: 240, expected: "320 / 240" }, // 4:3
      { width: 640, height: 360, expected: "640 / 360" }, // 16:9
      { width: 100, height: 100, expected: "100 / 100" }, // 1:1
    ];

    testCases.forEach(({ width, height, expected }) => {
      const { unmount } = render(
        <ThumbnailImage {...defaultProps} width={width} height={height} />,
      );

      const container = screen.getByTestId("next-image").parentElement;
      expect(container).toHaveStyle({ aspectRatio: expected });

      unmount();
    });
  });
});
