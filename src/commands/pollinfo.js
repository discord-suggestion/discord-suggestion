const { RichEmbed } = require('discord.js');

const { isAdmin } = require('../checks.js');
const { humanDuration } = require('../util.js');

const call = async function(message) {
  const polls = message.client.guildStore.get(message.guild.id).polls;
  console.log(polls);
  await message.channel.send(new RichEmbed({
    title: 'Active polls',
    fields: Object.values(polls).map(poll => { return { name: poll._message, value: `\`\`\`\n${poll.description}\`\`\`\nCreated: ${new Date(poll.created).toUTCString()}\nDuration: ${humanDuration(poll.duration)}\nEnds: ${new Date(poll.created+poll.duration).toUTCString()}\nCreated by: <@!${poll.creator}>\n[Message](https://discordapp.com/channels/${poll._guild}/${poll._channel}/${poll._message})`, inline: false } })
  }));
}

exports.name = 'pollinfo';
exports.alias = [ 'pollinfo', 'polllist' ];
exports.check = isAdmin;
exports.call = call;
