import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LikeButton } from "../like-button";

// Mock next-auth
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
	useSession: () => mockUseSession(),
	SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock actions
const mockToggleLikeAction = vi.fn();
const mockGetLikeDislikeStatusAction = vi.fn();

vi.mock("@/actions/likes", () => ({
	toggleLikeAction: (...args: any[]) => mockToggleLikeAction(...args),
}));

vi.mock("@/actions/dislikes", () => ({
	getLikeDislikeStatusAction: (...args: any[]) => mockGetLikeDislikeStatusAction(...args),
}));

// Mock sonner
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("sonner", () => ({
	toast: {
		error: (...args: any[]) => mockToastError(...args),
		success: (...args: any[]) => mockToastSuccess(...args),
	},
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
	ThumbsUp: ({ className }: { className?: string }) => (
		<svg className={className} data-testid="thumbs-up-icon" />
	),
}));

describe("LikeButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock for getLikeDislikeStatusAction
		mockGetLikeDislikeStatusAction.mockResolvedValue(new Map());
	});

	it("renders with initial like count", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(
			<SessionProvider session={null}>
				<LikeButton audioButtonId="test-id" initialLikeCount={5} />
			</SessionProvider>,
		);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("disables button for unauthenticated users", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(
			<SessionProvider session={null}>
				<LikeButton audioButtonId="test-id" initialLikeCount={5} />
			</SessionProvider>,
		);

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

		const mockStatusMap = new Map([["test-id", { isLiked: true, isDisliked: false }]]);
		mockGetLikeDislikeStatusAction.mockResolvedValue(mockStatusMap);

		render(
			<SessionProvider session={mockSession}>
				<LikeButton audioButtonId="test-id" initialLikeCount={5} />
			</SessionProvider>,
		);

		await waitFor(() => {
			expect(mockGetLikeDislikeStatusAction).toHaveBeenCalledWith(["test-id"]);
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

		mockGetLikeDislikeStatusAction.mockResolvedValue(
			new Map([["test-id", { isLiked: false, isDisliked: false }]]),
		);
		mockToggleLikeAction.mockResolvedValue({
			success: true,
			isLiked: true,
		});

		render(
			<SessionProvider session={mockSession}>
				<LikeButton audioButtonId="test-id" initialLikeCount={5} />
			</SessionProvider>,
		);

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

		mockGetLikeDislikeStatusAction.mockResolvedValue(
			new Map([["test-id", { isLiked: false, isDisliked: false }]]),
		);
		mockToggleLikeAction.mockResolvedValue({
			success: false,
			error: "Network error",
		});

		render(
			<SessionProvider session={mockSession}>
				<LikeButton audioButtonId="test-id" initialLikeCount={5} />
			</SessionProvider>,
		);

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

		mockGetLikeDislikeStatusAction.mockResolvedValue(
			new Map([["test-id", { isLiked: true, isDisliked: false }]]),
		);

		render(
			<SessionProvider session={mockSession}>
				<LikeButton audioButtonId="test-id" initialLikeCount={5} initialIsLiked={true} />
			</SessionProvider>,
		);

		// Check if button has correct styling for liked state
		const button = screen.getByRole("button");
		expect(button).toHaveClass("text-suzuka-600");

		// Check if thumbs up icon exists
		const svg = screen.getByTestId("thumbs-up-icon");
		expect(svg).toBeInTheDocument();
		expect(svg).toHaveClass("fill-current");
	});

	it("displays like count in correct format", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(
			<SessionProvider session={null}>
				<LikeButton audioButtonId="test-id" initialLikeCount={1234} />
			</SessionProvider>,
		);

		// Should format numbers with locale
		expect(screen.getByText("1,234")).toBeInTheDocument();
	});
});
