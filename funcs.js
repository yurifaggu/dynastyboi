const axios = require("axios");
const cheerio = require("cheerio");
const md5 = require("blueimp-md5");
const fs = require("fs");
const _ = require("lodash");

async function getMostPopular(url) {
  try {
    let chapterPages = [];
    const data = [];
    const blacklist = JSON.parse(fs.readFileSync("./.data/blacklist.json"));
    const html = (await axios.get(url)).data;
    const $ = cheerio.load(html);
    const latest = $("ul.thumbnails.cover-list > li > a");

    latest.each((i, el) => {
      chapterPages.push(axios.get(url + el.attribs.href));
    });
    chapterPages = await Promise.all(chapterPages);

    latest.each((i, el) => {
      const href = url + el.attribs.href;
      let [title, views] = $("div.caption", el)
        .html()
        .replace(/<\/?b>/gi, "")
        .split("<br>");
      const cover =
        url +
        cheerio("div.thumbnail > img", chapterPages[i].data)[0].attribs.src;
      title = title.replace(/&apos;/g, `\'`).replace(/&quot;/g, `\"`);
      data.push({
        id: md5(href),
        title: title,
        views: parseInt(views),
        cover: cover,
        url: href,
        date: getTimestamp(),
        blacklisted: checkIfBlacklisted(title, blacklist)
      });
    });

    return data;
  } catch (err) {
    log(`Error: ${err.message}`);
  }
}

async function update(bot, type = "auto") {
  const chapters = JSON.parse(fs.readFileSync("./.data/chapters.json"));
  const blacklist = JSON.parse(fs.readFileSync("./.data/blacklist.json"));
  const data = await getMostPopular(process.env.DYNASTY_URL);
  updateChaptersStatus(chapters, blacklist);
  
  for (let i = 0; i < data.length; i++) {
    if (chapters.every(ch => ch.id !== data[i].id)) {
      chapters.push(data[i]);
      if (!data[i].blacklisted) {
        await bot.telegram.sendPhoto(process.env.CHAT_ID, data[i].cover, {
          caption: `[${data[i].title}](${data[i].url})\n*${data[i].views} views*`,
          parse_mode: "Markdown"
        });
      }
    }
  }

  fs.writeFileSync(
    "./.data/chapters.json",
    JSON.stringify(chapters, null, 2)
  );

  switch (type) {
    case "auto": {
      log("Autoupdated");
      break;
    }
    case "force": {
      await bot.telegram.sendMessage(
        process.env.CHAT_ID,
        "Updated successfully."
      );
      log("Force updated");
      break;
    }
  }
}

function updateChaptersStatus(li, bl) {
  li.forEach(ch => {
    if (checkIfBlacklisted(ch.title, bl)) {
      ch.blacklisted = true;
    }
  });
}

function checkIfBlacklisted(title, bl) {
  const normalizedTitle = title.toUpperCase();
  return bl.some(pattern => normalizedTitle.includes(pattern));
}

function getTimestamp(opt = {}) {
  let timestamp = new Date();
  timestamp.setHours(timestamp.getHours() + 3);
  timestamp = opt.time
    ? timestamp.toLocaleString("ja")
    : timestamp.toLocaleDateString("ja");
  timestamp = timestamp.replace(/-/g, "/");
  if (opt.brackets) {
    timestamp = "[" + timestamp + "]";
  }
  return timestamp;
}

function log(msg) {
  fs.appendFileSync(
    "./log.txt",
    getTimestamp({ brackets: true, time: true }) + ` ${msg}.\n`
  );
}

module.exports = {
  update,
  log
};
