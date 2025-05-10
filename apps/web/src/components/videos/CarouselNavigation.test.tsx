import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CarouselNavigation from "./CarouselNavigation";

describe("CarouselNavigationコンポーネント", () => {
  // カルーセルのIDと要素数を定義
  const carouselId = "test-carousel";
  const itemCount = 5;

  // DOMのスクロールメソッドをモック
  const scrollToMock = vi.fn();

  // DOMメソッドのモックをセットアップする関数
  function setupDomMocks() {
    // カルーセル要素のモック
    const carouselElement = {
      scrollLeft: 0,
      scrollWidth: 1000,
      clientWidth: 400,
      scrollTo: scrollToMock,
    };

    // アイテム要素のモック
    const firstItemElement = {
      offsetWidth: 200, // サムネイルの幅を200pxに設定
    };

    // カルーセル要素のgetElementById呼び出しをモック
    document.getElementById = vi.fn((id) => {
      if (id === carouselId) {
        return carouselElement as unknown as HTMLElement;
      }
      if (id === `${carouselId}-item-0`) {
        return firstItemElement as unknown as HTMLElement;
      }
      return null;
    });

    return { carouselElement, firstItemElement };
  }

  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    setupDomMocks();
  });

  it("左右のナビゲーションボタンが正しく表示される", () => {
    // コンポーネントをレンダリング
    render(
      <CarouselNavigation carouselId={carouselId} itemCount={itemCount} />,
    );

    // 左右のナビゲーションボタンが表示されていることを確認
    const prevButton = screen.getByLabelText("前の動画へ");
    const nextButton = screen.getByLabelText("次の動画へ");

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it("「次の動画へ」ボタンをクリックすると、右にスクロールする", () => {
    // コンポーネントをレンダリング
    render(
      <CarouselNavigation carouselId={carouselId} itemCount={itemCount} />,
    );

    // 次へボタンを取得してクリック
    const nextButton = screen.getByLabelText("次の動画へ");
    fireEvent.click(nextButton);

    // スクロール関数が適切な引数で呼び出されたか確認
    expect(scrollToMock).toHaveBeenCalledWith({
      left: 216, // 200(アイテム幅) + 16(マージン)
      behavior: "smooth",
    });
  });

  it("「前の動画へ」ボタンをクリックすると、左にスクロールする", () => {
    // カルーセル要素のスクロール位置を設定
    const { carouselElement } = setupDomMocks();
    carouselElement.scrollLeft = 216; // すでに1アイテム分スクロールしている状態

    // コンポーネントをレンダリング
    render(
      <CarouselNavigation carouselId={carouselId} itemCount={itemCount} />,
    );

    // 前へボタンを取得してクリック
    const prevButton = screen.getByLabelText("前の動画へ");
    fireEvent.click(prevButton);

    // スクロール関数が適切な引数で呼び出されたか確認
    expect(scrollToMock).toHaveBeenCalledWith({
      left: 0, // 先頭位置に戻る
      behavior: "smooth",
    });
  });

  it("最後まで到達したときに「次の動画へ」ボタンをクリックすると、先頭に戻る", () => {
    // カルーセルが最後まで到達した状態を設定
    const { carouselElement } = setupDomMocks();
    carouselElement.scrollLeft = 600; // スクロール位置を設定

    // コンポーネントをレンダリング
    render(
      <CarouselNavigation carouselId={carouselId} itemCount={itemCount} />,
    );

    // 次へボタンをクリックして最後に到達した状態をシミュレート
    const nextButton = screen.getByLabelText("次の動画へ");

    // スクロール位置を最後に設定（scrollLeft + clientWidth が scrollWidth に近い状態）
    const carouselElementObject = document.getElementById(carouselId);
    if (carouselElementObject) {
      Object.defineProperty(carouselElementObject, "scrollLeft", {
        get: () => 580,
        configurable: true,
      });
    }

    fireEvent.click(nextButton);

    // 先頭に戻るためのスクロールが実行されたか確認
    expect(scrollToMock).toHaveBeenCalledWith({
      left: 0, // 先頭位置に戻る
      behavior: "smooth",
    });
  });

  it("先頭位置で「前の動画へ」ボタンをクリックすると、最後に移動する", () => {
    // 先頭位置にあることを確認
    const { carouselElement } = setupDomMocks();
    carouselElement.scrollLeft = 0;

    // コンポーネントをレンダリング
    render(
      <CarouselNavigation carouselId={carouselId} itemCount={itemCount} />,
    );

    // 前へボタンをクリック
    const prevButton = screen.getByLabelText("前の動画へ");
    fireEvent.click(prevButton);

    // 最後に移動するためのスクロールが実行されたか確認
    expect(scrollToMock).toHaveBeenCalledWith({
      left: 600, // scrollWidth - clientWidth = 1000 - 400 = 600
      behavior: "smooth",
    });
  });
});
