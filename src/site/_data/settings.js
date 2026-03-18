require("dotenv").config();

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "off"].includes(v)) return false;
  return defaultValue;
}

module.exports = () => {
  // Settings are conventionally supplied via `.env` as `dg*` keys.
  // Provide sensible defaults so templates don't silently disable features
  // when an env key is missing.
  return {
    dgHomeLink: toBool(process.env.dgHomeLink, false),
    dgShowFileTree: toBool(process.env.dgShowFileTree, true),

    dgEnableSearch: toBool(process.env.dgEnableSearch, true),
    dgShowInlineTitle: toBool(process.env.dgShowInlineTitle, true),
    dgShowTags: toBool(process.env.dgShowTags, true),

    dgShowBacklinks: toBool(process.env.dgShowBacklinks, true),
    dgShowLocalGraph: toBool(process.env.dgShowLocalGraph, true),
    dgShowToc: toBool(process.env.dgShowToc, true),

    dgLinkPreview: toBool(process.env.dgLinkPreview, true),
  };
};

