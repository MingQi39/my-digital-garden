require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");
const { globSync } = require("glob");

const themeCommentRegex = /\/\*[\s\S]*?\*\//g;
const COMMITTED_THEME = "src/site/styles/_theme.d92311c2.css";

function themeFetchUrls(url) {
  const urls = [url];
  if (url.includes("raw.githubusercontent.com")) {
    urls.push(
      url.replace(
        "https://raw.githubusercontent.com/",
        "https://ghfast.top/https://raw.githubusercontent.com/"
      )
    );
    urls.push(
      url.replace(
        "https://raw.githubusercontent.com/",
        "https://mirror.ghproxy.com/https://raw.githubusercontent.com/"
      )
    );
  }
  return urls;
}

async function fetchThemeCss(themeUrl) {
  let resolvedUrl = themeUrl;
  for (const url of themeFetchUrls(themeUrl)) {
    try {
      await axios.get(url, { timeout: 15000 });
      resolvedUrl = url;
      break;
    } catch {
      if (url === themeUrl && themeUrl.includes("theme.css")) {
        resolvedUrl = themeUrl.replace("theme.css", "obsidian.css");
      } else if (url === themeUrl && themeUrl.includes("obsidian.css")) {
        resolvedUrl = themeUrl.replace("obsidian.css", "theme.css");
      }
    }
  }

  for (const url of themeFetchUrls(resolvedUrl)) {
    try {
      const res = await axios.get(url, { timeout: 15000 });
      return res.data;
    } catch {
      // try next mirror
    }
  }
  throw new Error(`cannot fetch theme from ${themeUrl}`);
}

async function getTheme() {
  let themeUrl = process.env.THEME;
  if (!themeUrl) return;

  try {
    const data = await fetchThemeCss(themeUrl);
    try {
      for (const file of globSync("src/site/styles/_theme.*.css")) {
        if (file === COMMITTED_THEME) continue;
        fs.rmSync(file);
      }
    } catch {
      // ignore
    }

    let skippedFirstComment = false;
    const cleaned = data.replace(themeCommentRegex, (match) => {
      if (skippedFirstComment) return "";
      skippedFirstComment = true;
      return match;
    });
    const hex = crypto.createHash("sha256").update(cleaned).digest("hex").slice(0, 8);
    const outPath = `src/site/styles/_theme.${hex}.css`;
    fs.writeFileSync(outPath, cleaned);
    if (outPath !== COMMITTED_THEME) {
      fs.writeFileSync(COMMITTED_THEME, cleaned);
    }
    console.log(`get-theme: wrote ${outPath}`);
  } catch (err) {
    if (fs.existsSync(COMMITTED_THEME)) {
      console.warn(
        "get-theme: 在线拉取主题失败，继续使用仓库内置主题:",
        err.message
      );
      return;
    }
    console.warn("get-theme: 获取主题失败，将使用默认样式继续构建:", err.message);
  }
}

getTheme();
