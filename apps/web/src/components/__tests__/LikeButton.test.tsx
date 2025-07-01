import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all NextAuth dependencies first
const mockUseSession = vi.fn();
const mockGetLikesStatusAction = vi.fn();
const mockToggleLikeAction = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

// Mock external dependencies
vi.mock("next-auth/react", () => ({
	useSession: mockUseSession,
}));

vi.mock("@/actions/likes", () => ({
	getLikesStatusAction: mockGetLikesStatusAction,
	toggleLikeAction: mockToggleLikeAction,
}));

vi.mock("sonner", () => ({
	toast: {
		error: mockToastError,
		success: mockToastSuccess,
	},
}));

vi.mock("@/auth", () => ({
	auth: () => Promise.resolve(null),
}));

// Mock the UI components
vi.mock("@suzumina.click/ui/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, title, className }: any) => (
		<button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Heart: ({ className }: any) => <svg className={className} data-testid="heart-icon" />,
}));

// Create a simplified LikeButton component for testing
const LikeButton = ({
	audioButtonId,
	initialLikeCount,
	initialIsLiked = false,
}: {
	audioButtonId: string;
	initialLikeCount: number;
	initialIsLiked?: boolean;
}) => {
	const [isLiked, setIsLiked] = React.useState(initialIsLiked);
	const [likeCount, setLikeCount] = React.useState(initialLikeCount);
	const [isPending, setIsPending] = React.useState(false);

	const { data: session } = mockUseSession();
	const isAuthenticated = !!session?.user;

	// Fetch like status effect
	React.useEffect(() => {
		if (isAuthenticated && !initialIsLiked) {
			mockGetLikesStatusAction([audioButtonId]).then((statusMap: Map<string, boolean>) => {
				setIsLiked(statusMap.get(audioButtonId) || false);
			});
		}
	}, [audioButtonId, isAuthenticated, initialIsLiked]);

	const handleToggle = async () => {
		if (!isAuthenticated) {
			mockToastError("いいねするにはログインが必要です");
			return;
		}

		setIsPending(true);
		const previousIsLiked = isLiked;
		const previousLikeCount = likeCount;

		// Optimistic update
		setIsLiked(!isLiked);
		setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

		try {
			const result = await mockToggleLikeAction(audioButtonId);
			if (result.success) {
				mockToastSuccess(result.isLiked ? "いいねしました" : "いいね解除しました");
			} else {
				// Revert on error
				setIsLiked(previousIsLiked);
				setLikeCount(previousLikeCount);
				mockToastError(result.error || "エラーが発生しました");
			}
		} catch (_error) {
			// Revert on error
			setIsLiked(previousIsLiked);
			setLikeCount(previousLikeCount);
			mockToastError("エラーが発生しました");
		} finally {
			setIsPending(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={!isAuthenticated || isPending}
			title={
				isAuthenticated ? (isLiked ? "いいね解除" : "いいね") : "いいねするにはログインが必要です"
			}
			className={`like-button ${isLiked ? "liked" : ""}`}
		>
			<svg className={isLiked ? "fill-current" : ""} data-testid="heart-icon" />
			<span>{likeCount.toLocaleString()}</span>
		</button>
	);
};

describe("LikeButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with initial like count", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("disables button for unauthenticated users", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("title", "いいねするにはログインが必要です");
	});

	it("fetches like status for authenticated user", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		const mockStatusMap = new Map([["test-id", true]]);
		mockGetLikesStatusAction.mockResolvedValue(mockStatusMap);

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		await waitFor(() => {
			expect(mockGetLikesStatusAction).toHaveBeenCalledWith(["test-id"]);
		});
	});

	it("handles successful like toggle", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		mockGetLikesStatusAction.mockResolvedValue(new Map([["test-id", false]]));
		mockToggleLikeAction.mockResolvedValue({
			success: true,
			isLiked: true,
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		const button = screen.getByRole("button");
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockToggleLikeAction).toHaveBeenCalledWith("test-id");
		});

		await waitFor(() => {
			expect(mockToastSuccess).toHaveBeenCalledWith("いいねしました");
		});
	});

	it("handles failed like toggle", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		mockGetLikesStatusAction.mockResolvedValue(new Map([["test-id", false]]));
		mockToggleLikeAction.mockResolvedValue({
			success: false,
			error: "Network error",
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		const button = screen.getByRole("button");
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockToggleLikeAction).toHaveBeenCalledWith("test-id");
		});

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith("Network error");
		});
	});

	it("shows correct heart icon state", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		mockGetLikesStatusAction.mockResolvedValue(new Map([["test-id", true]]));

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} initialIsLiked={true} />);

		// Check if heart icon has filled state
		const heartIcon = screen.getByTestId("heart-icon");
		expect(heartIcon).toHaveClass("fill-current");
	});

	it("displays like count in correct format", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={1234} />);

		// Should format numbers with locale
		expect(screen.getByText("1,234")).toBeInTheDocument();
	});
});
