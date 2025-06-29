/// <reference types="node" />

declare namespace NodeJS {
	interface ProcessEnv {
		// Discord OAuth
		readonly DISCORD_CLIENT_ID: string;
		readonly DISCORD_CLIENT_SECRET: string;
		readonly DISCORD_BOT_TOKEN?: string;

		// NextAuth
		readonly NEXTAUTH_SECRET: string;
		readonly NEXTAUTH_URL: string;

		// Google Cloud
		readonly GOOGLE_CLOUD_PROJECT: string;

		// YouTube API
		readonly YOUTUBE_API_KEY?: string;

		// Node Environment
		readonly NODE_ENV: "development" | "production" | "test";
	}
}
