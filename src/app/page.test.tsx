import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from './page'; // page.tsx をインポート

// Headless UI コンポーネントはクライアントコンポーネントなのでモック化が必要な場合がある
// Vitest の vi.mock を使うか、コンポーネント側で dynamic import を使うなどの対応が必要になることがある
// 今回は単純なレンダリング確認なので、一旦モックなしで試す
// vi.mock('./_components/HeadlessUiDisclosureExample', () => ({
//   default: () => <div>Mocked Disclosure Example</div>,
// }));

describe('Home Page', () => {
  it('should render the main heading', () => {
    // Arrange
    render(<HomePage />);

    // Act
    const heading = screen.getByRole('heading', {
      name: /涼花みなせ 非公式ファンサイト \(仮\)/i,
      level: 1, // h1 タグを確認
    });

    // Assert
    expect(heading).toBeInTheDocument();
  });

  it('should render the Headless UI disclosure example button', () => {
    // Arrange
    render(<HomePage />);

    // Act
    // HeadlessUiDisclosureExample コンポーネント内のボタンが存在するか確認
    const disclosureButton = screen.getByRole('button', {
      name: /Headless UI Disclosure サンプル/i,
    });

    // Assert
    expect(disclosureButton).toBeInTheDocument();
  });

  // 必要に応じて他の要素（説明文、DaisyUIボタンなど）のテストも追加
});