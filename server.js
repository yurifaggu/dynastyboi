const express = require('express');
const app = express();
const fs = require('fs');
const md5 = require('blueimp-md5');
const Telegraf = require('telegraf');
const commandParts = require('telegraf-command-parts');
const { update, log } = require('./funcs');

const bot = new Telegraf(process.env.TOKEN);
bot.use(commandParts());

setInterval(async () => {
	await update(bot, 'auto');
}, 1000 * 60 * 15);

bot.start(async ({ reply }) => {
	await update(bot, 'force');
});

bot.command('upd', async ({ reply }) => {
	await update(bot, 'force');
});

bot.command('bl', ctx => {
  const blacklist = JSON.parse(fs.readFileSync('./.data/blacklist.json'));
  if (!ctx.state.command.args) {
    if (blacklist.length < 1) {
      return ctx.reply('Blacklist is empty.')
    }
    let blString = 'Blacklist:\n';
    blacklist.forEach(pattern => blString += `\`${pattern}\`\n`);
    ctx.replyWithMarkdown(blString);
  } else {
    const normalizedNewPattern = ctx.state.command.args.trim().toUpperCase();
    if (blacklist.some(pattern => pattern !== normalizedNewPattern) || blacklist.length < 1) {
      blacklist.push(normalizedNewPattern);
      fs.writeFileSync('./.data/blacklist.json', JSON.stringify(blacklist, null, 1));
      ctx.replyWithMarkdown(`Pattern \`${normalizedNewPattern}\` successfully added to blacklist.`)
    } else {
      ctx.reply('Pattern has already been blacklisted.');
    }
  }
});

bot.command('wl', ctx => {
  fs.readFile('./.data/blacklist.json', (err, data) => {
    const normalizedNewPattern = ctx.state.command.args.trim().toUpperCase();
    const blacklist = JSON.parse(data);
    const filtered = blacklist.filter(pattern => pattern !== normalizedNewPattern);
    if (blacklist.length !== filtered.length) {
      fs.writeFile('./.data/blacklist.json', JSON.stringify(filtered, null, 1), (err, data) => {
        ctx.replyWithMarkdown(`Pattern \`${normalizedNewPattern}\` successfully removed from blacklist.`)
      });
    } else {
      ctx.reply('Pattern was not found.');
    }
  });
});

bot.command('drop', async ctx => {
  fs.writeFile('./.data/chapters.json', '[]', (err, data) => {
    ctx.reply('Database successfully dropped.');
    log('Database dropped');
  });
});

bot.command('log', async ctx => {
  try {
    const log = fs.readFileSync('./.data/log.txt', 'utf8').substr(-4096);
    await ctx.reply(log);
  } catch(err) {
    await ctx.reply(err.message);
  }
});

bot.launch();

//express
app.get('/log', (req, res) => {
	res.download('./.data/log.txt');
});

app.get('/chapters', (req, res) => {
	res.download('./.data/chapters.json');
});

app.get('/blacklist', (req, res) => {
	res.download('./.data/blacklist.json');
});

app.get('/', (req, res) => {
	res.sendStatus(200)
});

app.listen(process.env.PORT, () => {
	console.log('Your app is listening on port ' + process.env.PORT);
});

