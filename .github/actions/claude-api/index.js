import Anthropic from "@anthropic-ai/sdk";

async function callClaudeAPI(apiKey, systemPrompt, userMessage, maxTokens = 4096) {
	const anthropic = new Anthropic({
		apiKey: apiKey,
	});

	try {
		const response = await anthropic.messages.create({
			model: "claude-3-opus-20240229",
			max_tokens: maxTokens,
			temperature: 0,
			system: systemPrompt,
			messages: [
				{
					role: "user",
					content: userMessage,
				},
			],
		});

		return response.content[0].text;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Required for error logging in GitHub Actions
		console.error("Claude API Error:", error);
		throw error;
	}
}

// GitHub Actions用のエクスポート
const apiKey = process.env.ANTHROPIC_API_KEY;
const systemPrompt = process.env.SYSTEM_PROMPT;
const userMessage = process.env.USER_MESSAGE;
const maxTokens = Number.parseInt(process.env.MAX_TOKENS || "4096");

if (!apiKey || !systemPrompt || !userMessage) {
	// biome-ignore lint/suspicious/noConsole: Required for error logging in GitHub Actions
	console.error("Required environment variables are missing");
	process.exit(1);
}

callClaudeAPI(apiKey, systemPrompt, userMessage, maxTokens)
	.then((response) => {
		// GitHub Actionsの出力として設定
		// biome-ignore lint/suspicious/noConsole: Required for GitHub Actions output
		console.log(
			`::set-output name=response::${response.replace(/\n/g, "%0A").replace(/\r/g, "%0D")}`,
		);
	})
	.catch((error) => {
		// biome-ignore lint/suspicious/noConsole: Required for error logging in GitHub Actions
		console.error("Failed to call Claude API:", error);
		process.exit(1);
	});
