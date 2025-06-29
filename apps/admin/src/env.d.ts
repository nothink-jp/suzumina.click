declare namespace NodeJS {
	interface ProcessEnv {
		// Next.js
		NODE_ENV: "development" | "production" | "test";

		// NextAuth.js
		NEXTAUTH_SECRET: string;
		NEXTAUTH_URL: string;

		// Discord OAuth
		DISCORD_CLIENT_ID: string;
		DISCORD_CLIENT_SECRET: string;
		DISCORD_GUILD_ID: string;

		// Admin Management
		ADMIN_DISCORD_IDS: string; // comma-separated list

		// Google Cloud
		GOOGLE_APPLICATION_CREDENTIALS?: string;
		GCP_PROJECT_ID: string;
	}
}
