import "next-auth";
import "@auth/core/jwt";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			isAdmin: boolean;
		};
	}

	interface User {
		id: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
	}
}

declare module "@auth/core/jwt" {
	interface JWT {
		isAdmin?: boolean;
		sub?: string;
	}
}
