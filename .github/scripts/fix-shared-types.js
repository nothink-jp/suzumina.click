#!/usr/bin/env node

/**
 * shared-typesパッケージの確認と修復スクリプト
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DEPLOY_DIR = "./tmp/functions";
const SHARED_TYPES_DIR = path.join(
  DEPLOY_DIR,
  "node_modules/@suzumina.click/shared-types",
);
const TGZ_FILE = path.join(DEPLOY_DIR, "suzumina.click-shared-types-0.1.5.tgz");

function main() {
  try {
    console.log("🔍 shared-typesパッケージを確認中...");

    if (!fs.existsSync(TGZ_FILE)) {
      console.error(`❌ tgzファイルが見つかりません: ${TGZ_FILE}`);
      process.exit(1);
    }

    const distFile = path.join(SHARED_TYPES_DIR, "dist/index.js");

    if (fs.existsSync(distFile)) {
      console.log("✅ shared-typesパッケージは正常にインストールされています");
      return;
    }

    console.log("🔧 shared-typesパッケージを手動で展開中...");

    // ディレクトリを作成
    fs.mkdirSync(SHARED_TYPES_DIR, { recursive: true });

    // tgzファイルを展開
    const relativeTgzPath = path.relative(DEPLOY_DIR, TGZ_FILE);
    execSync(
      `tar -xzf "${relativeTgzPath}" --strip-components=1 -C "${path.relative(DEPLOY_DIR, SHARED_TYPES_DIR)}"`,
      {
        cwd: DEPLOY_DIR,
        stdio: "inherit",
      },
    );

    // 再度確認
    if (!fs.existsSync(distFile)) {
      console.error("❌ 展開後も問題が残っています");
      process.exit(1);
    }

    console.log("🎉 shared-typesパッケージの修復が完了しました");
  } catch (error) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
