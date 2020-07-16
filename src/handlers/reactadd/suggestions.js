const { RichEmbed } = require('discord.js');

const constants = require('../../constants.js');
const { hasAny } = require('@douile/bot-utilities');
const { verbooseLog } = require('../../debug.js');
const { FLAGS } = require('../flags.js');

const handle = async function(data) {
  const client = this.client;
  if (!client.guildStore.has(data.d.guild_id)) return FLAGS.CONTINUE; /* Check message in guild with suggestion channels */
  if (!client.guilds.has(data.d.guild_id)) return FLAGS.CONTINUE; /* Check guild is in cache */
  const guild = client.guilds.get(data.d.guild_id);
  const guildStore = client.guildStore.get(data.d.guild_id);

  if (!(data.d.channel_id in guildStore.channels)) return FLAGS.CONTINUE; /* Check channel is a suggestion channel */
  if (!guild.channels.has(data.d.channel_id)) return FLAGS.CONTINUE; /* Check channel is in guild */
  const channel = guild.channels.get(data.d.channel_id);
  let message = channel.messages.get(data.d.message_id);
  try {
    message = await channel.fetchMessage(data.d.message_id);
  } catch (e) {
    verbooseLog(e);
  }
  if (message === undefined) return FLAGS.CONTINUE; /* Check message exists */

  if (message.author.id !== client.user.id) return FLAGS.CONTINUE; /* Check message was sent by this bot */
  if (!guild.members.has(data.d.user_id)) return FLAGS.CONTINUE; /* Check reactor is a member */
  const member = guild.members.get(data.d.user_id);
  if (!(member.hasPermission(client.config.adminFlag) || hasAny(member.roles, guildStore.managers))) return FLAGS.CONTINUE; /* Check reactors permissions */
  if (message.embeds.length === 0) return FLAGS.CONTINUE; /* Check whether message has an embed */
  if (message.embeds[0].fields.length > 0) return FLAGS.CONTINUE | FLAGS.HANDLED; // This'll do for now to check whether suggestion has been accepted / rejected

  const action = data.d.emoji.name === constants.emojis.accept ? true : data.d.emoji.name === constants.emojis.reject ? false : undefined;
  if (action !== undefined) {
    let upvotes = 0, downvotes = 0;
    for (let reaction of message.reactions.values()) {
      if (reaction.emoji.name === constants.emojis.upvote) {
        upvotes = reaction.count-1;
      } else if (reaction.emoji.name === constants.emojis.downvote) {
        downvotes = reaction.count-1;
      }
    }
    const embed = new RichEmbed(message.embeds[0]);
    embed.setColor(action ? 0x00ff00 : 0xff0000);
    embed.addField(`_ _`, `${action ? 'Accepted' : 'Rejected'} by <@!${member.id}>\nVerdict: ${upvotes} ${constants.emojis.upvote} : ${downvotes} ${constants.emojis.downvote}`, true);
    await message.clearReactions();
    await message.edit(embed);
    return FLAGS.CONTINUE | FLAGS.HANDLED;
  }
  return FLAGS.CONTINUE | FLAGS.HANDLED;
}

module.exports = handle;
