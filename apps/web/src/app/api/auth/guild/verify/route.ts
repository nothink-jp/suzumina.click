import {
  type GuildMembership,
  isValidGuildMember,
  SUZUMINA_GUILD_ID,
} from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Guild所属確認API
 * 現在のユーザーが対象Guild（すずみなふぁみりー）のメンバーかどうかを確認
 */
export async function GET(_request: NextRequest) {
  try {
    // セッション確認
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "認証が必要です" },
        { status: 401 },
      );
    }

    const user = session.user;

    // Guild所属確認
    const isValid = isValidGuildMember(user.guildMembership);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.discordId,
        username: user.username,
        displayName: user.displayName,
        guildId: SUZUMINA_GUILD_ID,
        isMember: user.guildMembership.isMember,
        isValid,
        guildMembership: user.guildMembership,
      },
    });
  } catch (error) {
    console.error("Guild verification error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Guild所属確認に失敗しました",
      },
      { status: 500 },
    );
  }
}

/**
 * Guild所属の強制再確認API (管理者用)
 * Discord APIを使って最新のGuild情報を取得
 */
export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "認証が必要です" },
        { status: 401 },
      );
    }

    // 管理者権限確認
    if (session.user.role !== "admin" && session.user.role !== "moderator") {
      return NextResponse.json(
        { error: "Forbidden", message: "管理者権限が必要です" },
        { status: 403 },
      );
    }

    const { discordId } = await request.json();

    if (!discordId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Discord IDが必要です" },
        { status: 400 },
      );
    }

    // Discord Bot APIを使用してGuild所属を確認
    // Note: これにはBot TokenとGuild権限が必要
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        {
          error: "Service Unavailable",
          message: "Discord Bot設定が無効です",
        },
        { status: 503 },
      );
    }

    // Discord Guild Member API
    const guildMemberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${SUZUMINA_GUILD_ID}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      },
    );

    if (guildMemberResponse.status === 404) {
      // ユーザーがGuildのメンバーではない
      const guildMembership: GuildMembership = {
        guildId: SUZUMINA_GUILD_ID,
        userId: discordId,
        isMember: false,
      };

      return NextResponse.json({
        success: true,
        data: {
          userId: discordId,
          guildMembership,
          isValid: false,
          status: "not_member",
        },
      });
    }

    if (!guildMemberResponse.ok) {
      console.error("Discord API error:", guildMemberResponse.status);
      return NextResponse.json(
        {
          error: "External API Error",
          message: "Discord APIエラーが発生しました",
        },
        { status: 502 },
      );
    }

    const memberData = await guildMemberResponse.json();

    // Guild所属情報を構築
    const guildMembership: GuildMembership = {
      guildId: SUZUMINA_GUILD_ID,
      userId: discordId,
      isMember: true,
      roles: memberData.roles || [],
      nickname: memberData.nick || null,
      joinedAt: memberData.joined_at || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        userId: discordId,
        guildMembership,
        isValid: isValidGuildMember(guildMembership),
        status: "member",
        memberDetails: {
          nickname: memberData.nick,
          roles: memberData.roles,
          joinedAt: memberData.joined_at,
          premiumSince: memberData.premium_since,
        },
      },
    });
  } catch (error) {
    console.error("Guild re-verification error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Guild再確認に失敗しました",
      },
      { status: 500 },
    );
  }
}
