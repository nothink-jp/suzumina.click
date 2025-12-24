/**
 * Bot detection utilities for SEO optimization
 * Detects search engine crawlers and social media bots
 */

import { headers } from "next/headers";

/**
 * List of known bot user agents
 * Updated regularly to include major search engines and social platforms
 */
const BOT_USER_AGENTS = [
	// Search engines
	"googlebot",
	"bingbot",
	"slurp", // Yahoo
	"duckduckbot",
	"baiduspider",
	"yandexbot",
	"sogou",
	"exabot",
	"facebot",

	// Social media crawlers
	"facebookexternalhit",
	"twitterbot",
	"linkedinbot",
	"pinterestbot",
	"slackbot",
	"telegrambot",
	"whatsapp",
	"discordbot",

	// SEO tools
	"rogerbot", // Moz
	"semrushbot",
	"ahrefsbot",
	"mj12bot",
	"dotbot",

	// Other crawlers
	"embedly",
	"quora link preview",
	"showyoubot",
	"outbrain",
	"w3c_validator",
	"applebot",
	"seznambot",
	"yisoubot",

	// Monitoring services
	"uptimerobot",
	"pingdom",
	"statuscake",
	"site24x7",
];

/**
 * Check if the current request is from a search engine or bot
 * @returns boolean indicating if request is from a bot
 */
export async function isSearchEngineBot(): Promise<boolean> {
	try {
		const headersList = await headers();
		const userAgent = headersList.get("user-agent")?.toLowerCase() || "";

		// Check against known bot user agents
		return BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));
	} catch (_error) {
		// If headers are not available (e.g., client-side), return false
		return false;
	}
}

/**
 * Check if current environment should skip age verification
 * Includes bots and development environment
 */
export async function shouldSkipAgeVerification(): Promise<boolean> {
	// Skip in development
	if (process.env.NODE_ENV === "development") {
		return true;
	}

	// Skip for search engine bots
	return await isSearchEngineBot();
}
