import type { GuildMembership } from "../../entities/user";

export const SUZUMINA_GUILD_ID = "959095494456537158";

export function isValidGuildMember(guildMembership: GuildMembership): boolean {
	return guildMembership.guildId === SUZUMINA_GUILD_ID && guildMembership.isMember;
}
