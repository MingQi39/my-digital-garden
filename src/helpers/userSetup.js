function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  const { getNoteNavigation } = require("./filetreeUtils");
  eleventyConfig.addFilter("getNoteNav", function () {
    const ctx = this.ctx || this;
    return getNoteNavigation({
      page: ctx.page,
      collections: ctx.collections,
    });
  });
}
exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
