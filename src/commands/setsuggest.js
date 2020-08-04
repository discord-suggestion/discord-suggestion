const { RichEmbed } = require('discord.js');

const { commandSymbols } = require('../constants.js');
const { isAdmin } = require('../checks.js');
const { is, isOfBaseType } = require('@douile/bot-utilities');

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
    let deleted = false;
    await message.client.guildStore.update(message.guild.id, function(guild) {
      deleted = channel.id in guild.channels;
      delete guild.channels[channel.id];
      return guild;
    });
    await embedResponse(message, `${deleted ? 'Removed suggestion channel' : 'No such suggestion channel'} <#${channel.id}>`);
  }
}

const roleManageTemplate = function(key, name) {
  return async function(message, params) {
    const isAdd = addOrRemove(params);
    let roles = [];
    for (let param of params) {
      const tRole = is.discordRole(param);
      if (tRole !== undefined && message.guild.roles.has(tRole)) roles.push(tRole);
    }
    if (roles.length === 0) return await errorResponse(message, `You must provide at least 1 role to add to ${name}`);
    if (isAdd) {
      await message.client.guildStore.update(message.guild.id, function(guild) {
        guild[key] = guild[key].concat(roles);
        return guild;
      });
      await embedResponse(message, `${roles.map(v => `<@&${v}>`).join(', ')} added to ${name}`);
    } else {
      await message.client.guildStore.update(message.guild.id, function(guild) {
        guild.blacklist = guild.blacklist.filter(v => !roles.includes(v));
        return guild;
      });
      await embedResponse(message, `${roles.map(v => `<@&${v}>`).join(', ')} removed from ${name}`);
    }
  }
}

const callBlacklist = roleManageTemplate('blacklist','denylist');
const callManagers = roleManageTemplate('managers', 'managers');
const callPollWhitelist = roleManageTemplate('pollWhitelist','poll allowlist');

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

const roleList = function(key, name) {
  return async function(message) {
    if (!message.client.guildStore.has(message.guild.id)) return await embedResponse(message, `There are no ${name} roles setup in this guild`, { title: name });
    const guild = message.client.guildStore.get(message.guild.id);
    if (guild[key].length === 0) return await embedResponse(message, `There are no ${name} roles setup in this guild`, { title: name });
    await embedResponse(message, guild[key].map(id => `<@&${id}> [\`${id}\`]`).join(', '), { title: name });
  }
}

const LISTS = {
  channels: async function(message) {
    if (!message.client.guildStore.has(message.guild.id)) return await embedResponse(message, 'There are no suggestion channels setup in this guild', { title: 'Channels' });
    const guild = message.client.guildStore.get(message.guild.id);
    await embedResponse(message, Object.entries(guild.channels).map(e => `<#${e[0]}> : \`${e[1].topic}\``).join('\n'), { title: 'Channels' });
  },
  managers: roleList('managers', 'manager'),
  denylist: roleList('blacklist', 'denylist'),
  poll: roleList('pollWhitelist', 'poll allowlist'),
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

const SUBCOMMANDS = {
  channel: {
    cmds: ['channel','channels'],
    call: callChannel,
    help: 'Add/Remove channel: `{command} channel + #channel topic`, `{command} channel - #channel` (_topic must be a single word without spaces_)'
  },
  blacklist: {
    cmds: ['denylist','blacklist'],
    call: callBlacklist,
    help: 'Add/Remove from denylist: `{command} denylist + @role`, `{command} denylist - @role`'
  },
  managers: {
    cmds: ['manager','managers'],
    call: callManagers,
    help: 'Add/Remove manager roles: `{command} managers + @role`, `{command} managers - @role`'

  },
  pollWhitelist: {
    cmds: ['poll','pollallowlist', 'pollwhitelist'],
    call: callPollWhitelist,
    help: 'Add/Remove roles to/from poll allowlist: `{command} poll + @role`, `{command} poll - @role`'
  },
  timeout: {
    cmds: ['timeout', 'time', 'ratelimit'],
    call: callTimeout,
    help: 'Set suggestion timeout: `{command} timeout length` (_length in ms; leave blank for the bot default_)'
  },
  list: {
    cmds: ['list'],
    call: callList,
    help: 'List settings: `{command} list setting` (_omit setting for a list of available settings_)'
  }
};

const generateHelp = function(title, commands) {
  let message = `${title}\n`;
  for (let cmd in commands) {
    if ('help' in commands[cmd]) {
      message += `${commands[cmd].help}\n`;
    } else {
      message += `No help message: \`{command} ${commands[cmd].cmds[0]}\`\n`;
    }
  }
  return message;
}

const call = async function(message, params) {
  if (params.length === 0) return;
  const subcmd = params.splice(0,1)[0].toLowerCase();
  for (let cmd in SUBCOMMANDS) {
    if (SUBCOMMANDS[cmd].cmds.includes(subcmd)) {
      return await SUBCOMMANDS[cmd].call(message, params);
    }
  }
  return await errorResponse(message, `Unknown command \`${subcmd}\``);
}

exports.name = 'settings';
exports.alias = [ 'setting', 'settings', 'setsuggest' ];
exports.call = call;
exports.check = isAdmin;
exports.help = generateHelp('**Configure suggestion options**', SUBCOMMANDS);
