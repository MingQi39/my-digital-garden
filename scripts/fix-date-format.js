#!/usr/bin/env node
/**
 * 将 Obsidian 的 date 格式 (YYYY-MM-DD HH:MM 或 HH:MM:SS) 转为 Eleventy 3 要求的 ISO 8601
 * 在 build 前运行，批量修正 src/site/notes 下的 markdown frontmatter
 */
const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

const NOTES_DIR = path.join(__dirname, "../src/site/notes");

// YYYY-MM-DD HH:MM (无秒)
const DATE_HM_REGEX = /^(\s*date:\s*)(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?:\s*)$/gm;
const MODIFIED_HM_REGEX = /^(\s*modified:\s*)(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?:\s*)$/gm;
// YYYY-MM-DD HH:MM:SS (有秒)
const DATE_HMS_REGEX = /^(\s*date:\s*)(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*)$/gm;
const MODIFIED_HMS_REGEX = /^(\s*modified:\s*)(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*)$/gm;
// YYYY-MM-DD (仅日期)
const DATE_ONLY_REGEX = /^(\s*date:\s*)(\d{4}-\d{2}-\d{2})(?:\s*)$/gm;
const MODIFIED_ONLY_REGEX = /^(\s*modified:\s*)(\d{4}-\d{2}-\d{2})(?:\s*)$/gm;

function fixDateInContent(content) {
  return content
    .replace(DATE_HMS_REGEX, (_, prefix, date, h, m, s) => {
      const hour = h.padStart(2, "0");
      return `${prefix}${date}T${hour}:${m}:${s}`;
    })
    .replace(MODIFIED_HMS_REGEX, (_, prefix, date, h, m, s) => {
      const hour = h.padStart(2, "0");
      return `${prefix}${date}T${hour}:${m}:${s}`;
    })
    .replace(DATE_HM_REGEX, (_, prefix, date, h, m) => {
      const hour = h.padStart(2, "0");
      return `${prefix}${date}T${hour}:${m}:00`;
    })
    .replace(MODIFIED_HM_REGEX, (_, prefix, date, h, m) => {
      const hour = h.padStart(2, "0");
      return `${prefix}${date}T${hour}:${m}:00`;
    })
    .replace(DATE_ONLY_REGEX, (_, prefix, date) => `${prefix}${date}T00:00:00`)
    .replace(MODIFIED_ONLY_REGEX, (_, prefix, date) => `${prefix}${date}T00:00:00`);
}

const files = globSync("**/*.{md,markdown}", { cwd: NOTES_DIR, nodir: true });
let count = 0;

for (const rel of files) {
  const filePath = path.join(NOTES_DIR, rel);
  if (!fs.statSync(filePath).isFile()) continue;
  let content = fs.readFileSync(filePath, "utf8");
  const fixed = fixDateInContent(content);
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    count++;
    console.log("Fixed:", rel);
  }
}

console.log(`\nFixed ${count} file(s)`);
