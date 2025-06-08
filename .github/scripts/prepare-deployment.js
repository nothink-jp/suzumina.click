#!/usr/bin/env node

/**
 * Cloud Functions デプロイパッケージ準備スクリプト
 */

const fs = require("node:fs");
const path = require("node:path");

const FUNCTIONS_DIR = "./apps/functions";
const DEPLOY_DIR = "./tmp/functions";

function main() {
  try {
    console.log("📦 デプロイ用package.jsonを生成中...");

    const srcPackageJson = JSON.parse(
      fs.readFileSync(path.join(FUNCTIONS_DIR, "package.json"), "utf8"),
    );

    // shared-types以外の依存関係を抽出
    const dependencies = {};
    for (const [key, val] of Object.entries(
      srcPackageJson.dependencies || {},
    )) {
      if (key !== "@suzumina.click/shared-types") {
        dependencies[key] = val;
      }
    }

    // shared-typesをローカルtgzファイルとして追加
    dependencies["@suzumina.click/shared-types"] =
      "file:./suzumina.click-shared-types-0.1.5.tgz";

    // デプロイ用の最小限package.json
    const deployPackageJson = {
      name: srcPackageJson.name,
      version: srcPackageJson.version,
      private: true,
      main: "lib/index.js",
      engines: { node: "20" },
      dependencies,
    };

    fs.writeFileSync(
      path.join(DEPLOY_DIR, "package.json"),
      JSON.stringify(deployPackageJson, null, 2),
      "utf8",
    );

    console.log("📝 .gcloudignoreを生成中...");

    const gcloudignore = `# TypeScript関連ファイルの除外
tsconfig.json
*.ts
src/

# テストファイルの除外
*.test.js
*.test.ts
test/

# 開発用ファイルの除外
.eslintrc*
.prettierrc*

# ログファイル関連の除外
npm-debug.log*
.npm
.eslintcache
`;

    fs.writeFileSync(
      path.join(DEPLOY_DIR, ".gcloudignore"),
      gcloudignore,
      "utf8",
    );

    console.log("🎉 デプロイパッケージの準備が完了しました");
  } catch (error) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
