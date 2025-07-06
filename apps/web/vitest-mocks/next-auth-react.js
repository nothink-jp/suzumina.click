// Mock session state that can be controlled in tests
let mockSessionData = {
	data: {
		user: {
			id: "test-user",
			name: "Test User",
			email: "test@example.com",
		},
	},
	status: "authenticated",
};

export function useSession() {
	return mockSessionData;
}

// Helper function for tests to override session data
export function _setMockSession(sessionData) {
	mockSessionData = sessionData;
}

export function SessionProvider({ children }) {
	return children;
}

export function signIn() {
	return Promise.resolve();
}

export function signOut() {
	return Promise.resolve();
}
