const { RichEmbed } = require('discord.js');

const { isAdmin } = require('../checks.js');
const { humanDuration } = require('../util.js');

const EMBED_NO_POLLS = new RichEmbed({ title: 'Active polls', description: 'No active polls in this server'});

const call = async function(message) {
  if (!message.client.guildStore.has(message.guild.id)) return await message.channel.send(EMBED_NO_POLLS);
  const polls = Object.values(message.client.guildStore.get(message.guild.id).polls);
  if (polls.length === 0) return await message.channel.send(EMBED_NO_POLLS);
  const fields = polls.map(poll => {
    return {
      name: poll._message,
      value: `\`\`\`\n${poll.description}\`\`\`\nCreated: ${new Date(poll.created).toUTCString()}\nDuration: ${humanDuration(poll.duration)}\nEnds: ${new Date(poll.created+poll.duration).toUTCString()}\nCreated by: <@!${poll.creator}>\n[Message](https://discordapp.com/channels/${poll._guild}/${poll._channel}/${poll._message})`,
      inline: false
    };
  });
  const count = Math.ceil(fields.length / 25);
  let i = 1;
  while (fields.length > 0) {
    await message.channel.send(new RichEmbed({
      title: 'Active polls',
      fields: fields.splice(0, 25),
      footer: { text: `${i++}/${count}` }
    }));
  }
}

exports.name = 'pollinfo';
exports.alias = [ 'pollinfo', 'polllist' ];
exports.check = isAdmin;
exports.call = call;
