const { RichEmbed } = require('discord.js');
const fetch = require('node-fetch');

const { emojis } = require('../constants.js');
const { isNotBlacklisted } = require('../checks.js');
const { humanDuration } = require('@douile/bot-utilities');

const reactions = [emojis.upvote, emojis.downvote];

const call = async function(message, params) {
  if (params.length < 2) {
    return await nessage.channel.send(new RichEmbed({
      title: 'Input error',
      description: 'Please specify a topic and a suggestion',
      color: 0xff0000
    }));
  }

  const topic = params.splice(0, 1)[0].toLowerCase();

  const guild = message.client.guildStore.get(message.guild.id);
  let channels = Object.entries(guild.channels).filter(v => v[1].topic.toLowerCase() === topic);

  if (channels.length === 0) {
    return await message.channel.send(new RichEmbed({
      title: `Sorry there is no suggestion channel for that topic`,
      description: `Valid topics: ${Object.values(guild.channels).map(v => `\`${v.topic}\``).join(', ')}`,
      color: 0xff0000
    }));
  }

  let nextTime = undefined;
  const now = Date.now();
  await message.client.guildStore.update(message.guild.id, function(guildData) {
    const rate = isNaN(guildData.suggestionRate) ? message.client.config.suggestionRate : guildData.suggestionRate;
    if (message.author.id in guildData.users) {
      const t = guildData.users[message.author.id].lastSuggestion + rate;
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

  if (nextTime !== undefined) return await message.channel.send(`Sorry you must wait ${humanDuration(nextTime-now)} seconds before creating another suggestion`);

  let channelsToDelete = [];

  for (let channelData of channels) {
    let channel = message.guild.channels.get(channelData[0]);
    if (channel === undefined || channel.deleted) {
      channelsToDelete.push(channelData[0]);
      continue;
    }

    const rMessage = await message.channel.send('Creating suggestion...');
    const channelTopic = channelData[1].topic;

    const suggestion = params.join(' ');

    const embed = new RichEmbed({
      author: { name: message.author.username, icon_url: message.author.avatarURL },
      title: `${channelTopic} suggestion`,
      description: suggestion,
      timestamp: now
    });
    let hasImage = false, attachments = [];
    if (message.attachments.size > 0) {
      for (let attachment of message.attachments.values()) {
        let res;
        try {
          res = await fetch(attachment.url, { method: 'HEAD'});
        } catch(e) {
          attachments.push(attachment.url);
          continue;
        }

        if (!hasImage && res.headers.get('Content-Type').startsWith('image/')) {
          hasImage = true;
          embed.setImage(attachment.url);
        } else {
          attachments.push(attachment.url);
        }
      }
    }
    if (attachments.length > 0) {
      embed.setDescription(`${suggestion}\n\n**Attachments**\n${attachments.join('\n')}`);
    }

    if (!hasImage) {
      /// If embed doesn't already have image check whether attachment is image and add it
      // Thanks regexr regexr.com/2ri7q
      const matches = suggestion.match(/((\w+:\/\/)[-a-zA-Z0-9:@;?&=/%+.*!'(),$_{}^~[\]`#|]+)/g);
      if (matches !== null) {
        for (let link of matches) {
          let res;
          try {
            res = await fetch(link, { method: 'HEAD' });
          } catch(e) {
            continue;
          }
          if (res.headers.get('Content-Type').startsWith('image/')) {
            embed.setImage(link);
            break;
          }
        }
      }
    }

    const sMessage = await channel.send(embed);
    for (let r of reactions) {
      await sMessage.react(r);
    }
    await rMessage.edit(`Suggestion created <https://discordapp.com/channels/${sMessage.guild.id}/${sMessage.channel.id}/${sMessage.id}>`);
  }

  if (channelsToDelete.length > 0) {
    console.log(`Found ${channelsToDelete.length} dead suggestion topics: ${channelsToDelete}`);
    let deleted = 0;
    await message.client.guildStore.update(message.guild.id, function(guildData) {
      for (let toDelete of channelsToDelete) {
        let didDelete = delete guildData.channels[toDelete];
        deleted += didDelete & 1;
      }
      return guildData;
    });
    console.log(`Deleted ${deleted} dead suggestion topics`);
  }

}

exports.name = 'suggest';
exports.alias = [ 'suggest', 'newsuggestion', 'createsuggestion' ];
exports.call = call;
exports.check = isNotBlacklisted;
exports.help = 'Make a suggestion\nUsage\n`{command} [gamemode] suggestion`\ne.g. `{command} 1v1 Add some extra guns`';
