const { MessageEmbed } = require('discord.js');

const Package = require('../../package');
const DiscordVersion = require('discord.js').version;
const { humanDuration } = require('@douile/bot-utilities');

const call = async function(message) {
  const client = message.client;

  await message.channel.send(new MessageEmbed({
    title: `${Package.name} info`,
    description: `[${Package.name} v${Package.version}](${Package.homepage}) [Report bugs here](${Package.bugs.url})\n\
    Average ping: ${Math.round(client.ws.ping,2)}ms\n\
    Uptime: ${humanDuration(client.uptime)}\n\
    Working in ${client.guilds.cache.size} guilds\n\
    **Dependencies**\n\
    [NodeJS ${process.version}](https://nodejs.org)\n\
    [discord.js v${DiscordVersion}](https://discord.js.org})`,
    timestamp: Date.now()
  }))
}

exports.name = 'info';
exports.alias = [ 'info', 'botinfo', 'status' ];
exports.call = call;
exports.help = 'Output runtime information `{command}`';
