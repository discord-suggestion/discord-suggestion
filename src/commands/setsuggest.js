const { RichEmbed } = require('discord.js');

const { commandSymbols } = require('../constants.js');
const { isAdmin } = require('../checks.js');
const { is, isOfBaseType } = require('../util.js');

/* Check if 1st param is add/remove and if it is remove the param (defaults to add) */
const addOrRemove = function(params) {
  if (params.length === 0) return true;
  const s = params[0].toLowerCase();
  if (commandSymbols.remove.includes(s)) {
    params.splice(0, 1);
    return false;
  } else if (commandSymbols.add.includes(s)) {
    params.splice(0, 1);
  }
  return true;
}

const embedResponse = async function(message, response, opts) {
  const DEFAULTS = {
    title: 'Settings',
    description: response
  };
  if (!isOfBaseType(opts, Object)) opts = {};
  for (let key in DEFAULTS) {
    if (!(key in opts)) opts[key] = DEFAULTS[key];
  }
  return await message.channel.send(new RichEmbed(opts));
}

const errorResponse = async function(message, response) {
  return await embedResponse(message, response, { color: 0xff0000 });
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
    if (topic === undefined) return await errorResponse(message, 'You must provide a topic when creating a status channel');
    await message.client.guildStore.update(message.guild.id, function(guild) {
      guild.channels[channel.id] = { topic: topic };
      return guild;
    });
    await embedResponse(message, `Creating suggestion channel <#${channel.id}> with topic "${topic}"`);
  } else {
    await message.client.guildStore.update(message.guild.id, function(guild) {
      delete guild.channels[channel.id];
      return guild;
    });
    await embedResponse(message, `Removed suggestion channel <#${channel.id}>`);
  }
}

const callBlacklist = async function(message, params) {
  const isAdd = addOrRemove(params);
  let roles = [];
  for (let param of params) {
    const tRole = is.discordRole(param);
    if (tRole !== undefined && message.guild.roles.has(tRole)) roles.push(tRole);
  }
  if (roles.length === 0) return await errorResponse(message, 'You must provide a role to blacklist');
  if (isAdd) {
    await message.client.guildStore.update(message.guild.id, function(guild) {
      guild.blacklist = guild.blacklist.concat(roles);
      return guild;
    });
    await embedResponse(message, `Blacklisted ${roles.map(v => `<@&${v}>`).join(', ')}`);
  } else {
    await message.client.guildStore.update(message.guild.id, function(guild) {
      guild.blacklist = guild.blacklist.filter(v => !roles.includes(v));
      return guild;
    });
    await embedResponse(message, `Unblacklisted ${roles.map(v => `<@&${v}>`).join(', ')}`);
  }
}

// TODO: Make a role add/remove function
const callManagers = async function(message, params) {
  const isAdd = addOrRemove(params);
  let roles = [];
  for (let param of params) {
    const tRole = is.discordRole(param);
    if (tRole !== undefined && message.guild.roles.has(tRole)) roles.push(tRole);
  }
  if (roles.length === 0) return await errorResponse(message, 'You must provide a role for managers');
  if (isAdd) {
    await message.client.guildStore.update(message.guild.id, function(guild) {
      guild.managers = guild.managers.concat(roles);
      return guild;
    });
    await embedResponse(message, `Added ${roles.map(v => `<@&${v}>`).join(', ')} as manager roles`);
  } else {
    await message.client.guildStore.update(message.guild.id, function(guild) {
      guild.managers = guild.managers.filter(v => !roles.includes(v));
      return guild;
    });
    await embedResponse(message, `${roles.map(v => `<@&${v}>`).join(', ')} are no longer managers`);
  }
}

const callTimeout = async function(message, params) {
  let newTimeout = undefined;
  if (params.length > 0) {
    newTimeout = parseInt(params[0]);
    if (isNaN(newTimeout)) newTimeout = undefined;
  }
  await message.client.guildStore.update(message.guild.id, function(guild) {
    guild.suggestionRate = newTimeout;
    return guild;
  });
  await embedResponse(message, `Set guild suggestion timeout to ${newTimeout === undefined ? 'bot default' : newTimeout}`);
}

const LISTS = {
  channels: async function(message) {
    if (!message.client.guildStore.has(message.guild.id)) return await embedResponse(message, 'There are no suggestion channels setup in this guild', { title: 'Channels' }); // TODO: Output same response if there is no data (length = 0)
    const guild = message.client.guildStore.get(message.guild.id);
    await embedResponse(message, Object.entries(guild.channels).map(e => `<#${e[0]}> : \`${e[1].topic}\``).join('\n'), { title: 'Channels' });
  },
  managers: async function(message) {
    if (!message.client.guildStore.has(message.guild.id)) return await embedResponse(message, 'There are no manager roles setup in this guild', { title: 'Managers' });
    const guild = message.client.guildStore.get(message.guild.id);
    await embedResponse(message, guild.managers.map(id => `<@&${id}> [\`${id}\`]`).join(', '), { title: 'Managers' });
  },
  blacklist: async function(message) {
    if (!message.client.guildStore.has(message.guild.id)) return await embedResponse(message, 'There are roles blacklisted in this guild', { title: 'Blacklist' });
    const guild = message.client.guildStore.get(message.guild.id);
    await embedResponse(message, guild.blacklist.map(id => `<@&${id}> [\`${id}\`]`).join(', '), { title: 'Blacklist' });
  },
  timeout: async function(message) {
    if (!message.client.guildStore.has(message.guild.id)) return await embedResponse(message, 'There is no timeout configured for this guild', { title: 'Timeout' });
    const guild = message.client.guildStore.get(message.guild.id);
    await embedResponse(message, `Timeout for this guild: ${guild.suggestionRate === undefined ? message.client.config.suggestionRate : guild.suggestionRate}ms`, { title: 'Timeout' });
  }
}

const callList = async function(message, params) {
  if (params.length === 0) return await errorResponse(message, `You must specify an item to list (_One of ${Object.keys(LISTS).map(k => `\`${k}\``).join(', ')}_)`);
  if (params[0] in LISTS) {
    return await LISTS[params[0]](message);
  }
  return await errorResponse(message, `The item specified (\`${params[0]}\`) must be one of ${Object.keys(LISTS).map(k => `\`${k}\``).join(', ')}`);
}

// TODO: Put help messages in this object
const SUBCOMMANDS = {
  channel: {
    call: callChannel
  },
  blacklist: {
    call: callBlacklist
  },
  managers: {
    call: callManagers
  },
  timeout: {
    call: callTimeout
  },
  list: {
    call: callList
  }
};

const call = async function(message, params) {
  if (params.length === 0) return;
  const subcmd = params.splice(0,1)[0].toLowerCase();
  if (subcmd in SUBCOMMANDS) {
    return await SUBCOMMANDS[subcmd].call(message, params);
  }
  return await errorResponse(message, `Unknown command \`${subcmd}\``);
}

exports.name = 'setsuggest';
exports.call = call;
exports.check = isAdmin;
exports.help = 'Configure suggestion options\n\
  Add/Remove channel: `{command} channel + #channel topic`, `{command} channel - #channel` (_topic must be a single word without spaces_)\n\
  Add/Remove from blacklist: `{command} blacklist + @role`, `{command} blacklist - @role`\n\
  Add/Remove manager roles: `{command} managers + @role`, `{command} managers - @role`\n\
  Set suggestion timeout: `{command} timeout length` (_length in ms; leave blank for the bot default_)\n\
  List settings: `{command} list setting` (_omit setting for a list of available settings_)';
