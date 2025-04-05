import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "../../tests/test-utils";
import { GlobalLayout } from "./GlobalLayout";

// Navigationコンポーネントをモック
mock.module("@/components/Navigation", () => ({
  Navigation: () => <nav data-testid="navigation">Mock Navigation</nav>,
}));

// next-auth/reactをモック
const mockUseSession = mock();
mock.module("next-auth/react", () => ({
  useSession: mockUseSession,
}));

describe("GlobalLayout", () => {
  test("statusがloadingの場合、Navigationを表示せずchildrenを表示する", () => {
    mockUseSession.mockReturnValue({
      status: "loading",
      data: null,
      update: mock(),
    });
    render(
      <GlobalLayout>
        <div>Test Children</div>
      </GlobalLayout>,
    );

    // 要素が存在しないことを確認 (toBeNull)
    expect(screen.queryByTestId("navigation")).toBeNull();
    // 要素が存在することを確認 (not.toBeNull)
    expect(screen.getByText("Test Children")).not.toBeNull();
  });

  test("statusがauthenticatedの場合、Navigationとchildrenを表示する", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { name: "Test User" }, expires: "1" },
      update: mock(),
    });
    render(
      <GlobalLayout>
        <div>Test Children</div>
      </GlobalLayout>,
    );

    // 要素が存在することを確認 (not.toBeNull)
    expect(screen.getByTestId("navigation")).not.toBeNull();
    expect(screen.getByText("Test Children")).not.toBeNull();
  });

  test("statusがunauthenticatedの場合、Navigationとchildrenを表示する", () => {
    mockUseSession.mockReturnValue({
      status: "unauthenticated",
      data: null,
      update: mock(),
    });
    render(
      <GlobalLayout>
        <div>Test Children</div>
      </GlobalLayout>,
    );

    // 要素が存在することを確認 (not.toBeNull)
    expect(screen.getByTestId("navigation")).not.toBeNull();
    expect(screen.getByText("Test Children")).not.toBeNull();
  });
});
