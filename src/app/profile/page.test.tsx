import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProfilePage from './page'; // page.tsx をインポート

describe('Profile Page', () => {
  it('should render the main heading', () => {
    // Arrange
    render(<ProfilePage />);

    // Act
    const heading = screen.getByRole('heading', {
      name: /プロフィール/i,
      level: 1, // h1 タグを確認
    });

    // Assert
    expect(heading).toBeInTheDocument();
  });

  it('should render the profile description text', () => {
    // Arrange
    render(<ProfilePage />);

    // Act
    // 説明文の一部が含まれているか確認
    const descriptionText = screen.getByText(/ここにプロフィール情報を記述します。/i);
    const statusText = screen.getByText(/\(コンテンツ準備中...\)/i);

    // Assert
    expect(descriptionText).toBeInTheDocument();
    expect(statusText).toBeInTheDocument();
  });

  // 必要に応じてカードタイトルなどのテストも追加
  it('should render the card title', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { name: /涼花みなせ \(Suzuka Minase\)/i, level: 2 })).toBeInTheDocument();
  });
});