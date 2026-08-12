const fs = require("node:fs");

// 缺陷D：原子写。写入临时文件后 renameSync 替换——同分区 rename 是原子操作，
// 进程崩溃/磁盘满只会留下 .tmp 残file，绝不产生半成品目标文件（避免缺陷B诱因）。
// 注意：仅保证单文件原子性，不保证多文件（context-save + last-handoff）整体一致（见方案缺陷D撕裂说明）。
function writeFileAtomic(filePath, data) {
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, filePath);
}

module.exports = { writeFileAtomic };
