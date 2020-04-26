require("dotenv").config();

const fs = require("fs-extra");
const path = require("path");
const child_process = require("child_process");
const OpenCC = require("opencc");
const opencc = new OpenCC("t2s.json");

const { ANIME_PATH, ANIME_THUMB_PATH } = process.env;

const fileList = child_process
  .execSync(`find -L ${ANIME_PATH} -type f -name "*.mp4"`, {
    maxBuffer: 1024 * 1024 * 100,
  })
  .toString()
  .split("\n")
  .filter((each) => each);

const db = new Set(fileList);
console.log(`Found ${db.size} files`);

const getReplacementMap = (fileName) =>
  new Map([
    ["BIG5=>GB", fileName.replace("BIG5", "GB")],
    ["BIG5=>GB_CN", fileName.replace("BIG5", "GB_CN")],
    ["Big5=>GB", fileName.replace("Big5", "GB")],
    ["big5=>gb", fileName.replace("big5", "gb")],
    ["big5=>GB", fileName.replace("big5", "GB")],
    ["BIG=>GB", fileName.replace("BIG", "GB")],
    ["TC=>SC", fileName.replace("TC", "SC")],
    ["tc=>sc", fileName.replace("tc", "sc")],
    ["tc_jp=>sc_jp", fileName.replace("tc_jp", "sc_jp")],
    ["jp_tc=>jp_sc", fileName.replace("jp_tc", "jp_sc")],
    ["CHT=>CHS", fileName.replace("CHT", "CHS")],
    ["Cht=>Chs", fileName.replace("Cht", "Chs")],
    ["cht=>chs", fileName.replace("cht", "chs")],
    ["Hant=>Hans", fileName.replace("Hant", "Hans")],
    ["繁體=>繁体", fileName.replace("繁體", "繁体")],
    ["簡體=>簡体", fileName.replace("簡體", "簡体")],
    ["簡體=>简体", fileName.replace("簡體", "简体")],
    ["繁體=>簡體", fileName.replace("繁體", "簡體")],
    ["繁體=>簡体", fileName.replace("繁體", "簡体")],
    ["繁體=>简体", fileName.replace("繁體", "简体")],
    ["繁体=>簡體", fileName.replace("繁体", "簡體")],
    ["繁体=>簡体", fileName.replace("繁体", "簡体")],
    ["繁体=>简体", fileName.replace("繁体", "简体")],
    ["OpenCC", opencc.convertSync(fileName)],
    ["OpenCC+繁=>簡", opencc.convertSync(fileName.replace("繁", "簡"))],
  ]);

let stat = { total: { count: 0, size: 0 } };
for (let key of getReplacementMap("").keys()) {
  stat[key] = {
    count: 0,
    size: 0,
  };
}

for (let filePath of fileList) {
  const fileName = path.basename(filePath);
  for (let [id, replacement] of getReplacementMap(fileName).entries()) {
    const altFilePath = path.join(
      path.dirname(filePath),
      fileName.replace(fileName, replacement)
    );
    if (filePath !== altFilePath && db.has(altFilePath)) {
      stat.total.size += fs.statSync(altFilePath).size;
      stat.total.count += 1;
      stat[id].size += fs.statSync(altFilePath).size;
      stat[id].count += 1;
      if (process.argv.slice(2).includes("--verbose")) {
        console.log(altFilePath);
      }
      if (process.argv.slice(2).includes("--delete")) {
        console.log(`Deleting ${altFilePath}`);
        const { atime, mtime } = fs.statSync(path.dirname(altFilePath));
        fs.removeSync(altFilePath);
        fs.utimesSync(path.dirname(altFilePath), atime, mtime);

        const jpgPath = path.join(
          path.dirname(altFilePath.replace(ANIME_PATH, ANIME_THUMB_PATH)),
          `${path.basename(altFilePath, ".mp4")}.jpg`
        );
        if (fs.existsSync(jpgPath)) {
          console.log(`Deleting ${jpgPath}`);
          fs.removeSync(jpgPath);
        }
      }
      break;
    }
  }
}

for (let [key, { count, size }] of Object.entries(stat)) {
  stat[key] = {
    count,
    size: `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`,
  };
}

console.table(stat);