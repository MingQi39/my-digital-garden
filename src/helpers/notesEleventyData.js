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

function isNoteTemplate(inputPath) {
  const p = String(inputPath || "").replace(/\\/g, "/");
  return (
    p.includes("/src/site/notes/") &&
    p.endsWith(".md") &&
    !p.includes("/drawing/") &&
    !p.includes("/模板/") &&
    !p.endsWith("/notes/index.md")
  );
}

function getNotesDirectoryData() {
  return {
    layout: "layouts/note.njk",
    tags: ["note"],
    eleventyComputed: {
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
  relPathToPermalinkPath,
};
