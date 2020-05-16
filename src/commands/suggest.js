const { RichEmbed } = require('discord.js');

const { emojis } = require('../constants.js');
const { isNotBlacklisted } = require('../checks.js');

const reactions = [emojis.upvote, emojis.downvote];

const call = async function(message, params) {
  if (params.length < 2) return;
  const topic = params.splice(0, 1)[0].toLowerCase();

  const guild = message.client.guildStore.get(message.guild.id);
  let channel = Object.entries(guild.channels).filter(v => v[1].topic.toLowerCase() === topic);
  if (channel.length > 0) {
    let nextTime = undefined;
    const now = Date.now();
    await message.client.guildStore.update(message.guild.id, function(guildData) {
      if (message.author.id in guildData.users) {
        const t = guildData.users[message.author.id].lastSuggestion + guildData.suggestionRate;
        if (t > now) {
          nextTime = t;
        } else {
          guildData.users[message.author.id].lastSuggestion = now;
        }
      } else {
        guildData.users[message.author.id] = { lastSuggestion: now };
      }
      return guildData;
    });

    if (nextTime !== undefined) return await message.channel.send(`Sorry you must wait ${Math.round((nextTime-now)/1000,2)} seconds before creating another suggestion`);

    const rMessage = await message.channel.send('Creating suggestion...');
    const channelTopic = channel[0][1].topic;
    channel = message.guild.channels.get(channel[0][0]);
    const embed = new RichEmbed({
      author: { name: message.author.username, icon_url: message.author.avatarURL },
      title: `${channelTopic} suggestion`,
      description: params.join(' '),
      timestamp: now
    });
    const sMessage = await channel.send(embed);
    embed.setFooter(`#${sMessage.id}`);
    await sMessage.edit(embed);
    for (let r of reactions) {
      await sMessage.react(r);
    }
    await rMessage.edit(`Suggestion created <https://discordapp.com/channels/${sMessage.guild.id}/${sMessage.channel.id}/${sMessage.id}>`);
  } else {
    await message.channel.send(new RichEmbed({
      title: `Sorry there is no suggestion channel for that topic`,
      description: `Valid topics: ${Object.values(guild.channels).map(v => `\`${v.topic}\``).join(', ')}`
    }));
  }
}

exports.name = 'suggest';
exports.call = call;
exports.check = isNotBlacklisted;
exports.help = 'Make a suggestion\nUsage\n`{command} [gamemode] suggestion`\ne.g. `{command} 1v1 Add some extra guns`';
