const crypto = require("crypto");
const slugify = require("@sindresorhus/slugify");

function shortHash(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 8);
}

function segmentToSlug(segment) {
  const raw = String(segment || "").trim();
  const base = slugify(raw, { separator: "-", lowercase: true });

  const numericPrefix = (raw.match(/^\d+(?:\.\d+)*/) || [null])[0];
  let out = base || numericPrefix || "note";

  const hasNonAscii = /[^\x00-\x7F]/.test(raw);
  const needsHash = hasNonAscii || !base || base.length < 3 || raw.length > 40;
  if (needsHash) out = `${out}-${shortHash(raw)}`;

  if (out.length > 60) out = `${out.slice(0, 50)}-${shortHash(raw)}`;

  return out;
}

function relPathToPermalinkPath(relPath) {
  return String(relPath || "")
    .split("/")
    .filter(Boolean)
    .map(segmentToSlug)
    .join("/");
}

const EXCLUDED_NOTE_BASENAMES = new Set(["AGENTS.md", "AI_CONFIG.md"]);
const AI_KB_PUBLISH_PREFIXES = [
  "/009.AI知识库/raw/",
  "/009.AI知识库/wiki/",
];

function isAiKnowledgeBasePath(inputPath) {
  return String(inputPath || "").replace(/\\/g, "/").includes("/009.AI知识库/");
}

function isAiKnowledgeBasePublishable(inputPath) {
  const p = String(inputPath || "").replace(/\\/g, "/");
  return AI_KB_PUBLISH_PREFIXES.some((prefix) => p.includes(prefix));
}

function isExcludedFromSite(inputPath) {
  const p = String(inputPath || "").replace(/\\/g, "/");
  if (isAiKnowledgeBasePath(p) && !isAiKnowledgeBasePublishable(p)) return true;
  const basename = p.split("/").pop() || "";
  return EXCLUDED_NOTE_BASENAMES.has(basename);
}

function isNoteTemplate(inputPath) {
  const p = String(inputPath || "").replace(/\\/g, "/");
  return (
    p.includes("/src/site/notes/") &&
    p.endsWith(".md") &&
    !p.includes("/drawing/") &&
    !p.includes("/模板/") &&
    !p.endsWith("/notes/index.md") &&
    !isExcludedFromSite(p)
  );
}

function getNotesDirectoryData() {
  return {
    layout: "layouts/note.njk",
    tags: ["note"],
    eleventyComputed: {
      eleventyExclude: (data) => isExcludedFromSite(data.page?.inputPath),
      mindmapPlugin: (data) => data["mindmap-plugin"] || data.mindmapPlugin || "",
    },
    permalink: (data) => {
      const stem = data?.page?.filePathStem || "";
      const rel = stem.replace(/^\/notes\//, "");
      return `notes/${relPathToPermalinkPath(rel)}/`;
    },
  };
}

module.exports = {
  getNotesDirectoryData,
  isNoteTemplate,
  isExcludedFromSite,
  relPathToPermalinkPath,
};
