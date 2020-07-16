const { RichEmbed } = require('discord.js');

const Package = require('../../package');
const DiscordPackage = require('discord.js/package');
const { humanDuration } = require('@douile/bot-utilities');

const call = async function(message) {
  const client = message.client;

  await message.channel.send(new RichEmbed({
    title: `${Package.name} info`,
    description: `[${Package.name} v${Package.version}](${Package.homepage}) [Report bugs here](${Package.bugs.url})\n\
    Average ping: ${Math.round(client.ping,2)}ms\n\
    Uptime: ${humanDuration(client.uptime)}\n\
    Working in ${client.guilds.size} guilds\n\
    **Dependencies**\n\
    [NodeJS v ${process.version}](https://nodejs.org)\n\
    [${DiscordPackage.name} v${DiscordPackage.version}](${DiscordPackage.homepage})`,
    timestamp: Date.now()
  }))
}

exports.name = 'info';
exports.alias = [ 'info', 'botinfo', 'status' ];
exports.call = call;
exports.help = 'Output runtime information `{command}`';
