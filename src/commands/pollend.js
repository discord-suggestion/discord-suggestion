const { isAdmin } = require('../checks.js');
const { is } = require('../util.js');

const call = async function(message, params) {
  if (params.length < 1) return await message.channel.send('Sorry, you must provide a message ID (of a poll)');
  if (!is.discordSnowflake(params[0])) return await message.channel.send('Sorry, that doesn\'t look like a valid message ID');
  if (!message.client.guildStore.has(message.guild.id)) return await message.channel.send('Sorry, there are no polls in this server');
  const polls = message.client.guildStore.get(message.guild.id).polls;
  if (!(params[0] in polls)) return await message.channel.send('Sorry I couldn\'t find a poll with that ID');
  const poll = polls[params[0]];
  await poll.end();
  await message.channel.send(`Ended poll <https://discordapp.com/channels/${poll._guild}/${poll._channel}/${poll._message}>`);
}

exports.name = 'pollend';
exports.alias = [ 'pollend', 'endpoll', 'pollstop', 'stoppoll' ];
exports.check = isAdmin;
exports.call = call;
