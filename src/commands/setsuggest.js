const { isAdmin } = require('../checks.js');
const { is } = require('../util.js');

const SYMBOLS = {
  add: ['+','add'],
  remove: ['-','remove']
};

/* Check if 1st param is add/remove and if it is remove the param (defaults to add) */
const addOrRemove = function(params) {
  if (params.length === 0) return true;
  const s = params[0].toLowerCase();
  if (SYMBOLS.remove.includes(s)) {
    params.splice(0, 1);
    return false;
  } else if (SYMBOLS.add.includes(s)) {
    params.splice(0, 1);
  }
  return true;
}

const callChannel = async function(message, params) {
  const isAdd = addOrRemove(params);
  let channel = message.channel, topic = undefined;
  for (let param of params) {
    const tChannel = is.discordChannel(param);
    if (tChannel !== undefined) {
      if (message.guild.channels.has(tChannel)) channel = message.guild.channels.get(tChannel);
    } else {
      topic = param;
    }
  }

  if (isAdd)  {
    if (topic === undefined) return await message.channel.send('You must provide a topic when creating a status channel');
    await message.client.guildStore.update(message.guild.id, function(guild) {
      guild.channels[channel.id] = { topic: topic };
      return guild;
    });
    await message.channel.send(`Creating suggestion channel <#${channel.id}> with topic "${topic}"`);
  } else {
    await message.client.guildStore.update(message.guild.id, function(guild) {
      delete guild.channels[channel.id];
      return guild;
    });
    await message.channel.send(`Removed suggestion channel <#${channel.id}>`);
  }
}

const call = async function(message, params) {
  if (params.length === 0) return;
  switch(params[0]) {
    case 'channel':
    return await callChannel(message, params.splice(1));
    case 'delete':
    case 'blacklist':
    break;
    default:
    return await message.channel.send(`Unknown command \`${params[0]}\``);
  }
}

exports.name = 'setsuggest';
exports.call = call;
exports.check = isAdmin;
