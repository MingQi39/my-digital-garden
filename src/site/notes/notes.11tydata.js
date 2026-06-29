// 笔记目录数据：layout / permalink / note 标签
// 实现放在 src/helpers/，避免 Obsidian 同步覆盖 notes/ 时丢失
const { getNotesDirectoryData } = require("../../helpers/notesEleventyData");

module.exports = getNotesDirectoryData;
