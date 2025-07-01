export function useSession() {
	return {
		data: null,
		status: "loading",
	};
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
