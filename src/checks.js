exports.isAdmin = function(message) {
  if (!message.member) return false;
  return message.member.hasPermission(message.client.config.adminFlag);
}

exports.isOwner = function(message) {
  if (!message.guild) return false;
  return message.guild.ownerID === message.author.id;
}

exports.isBotOwner = function(message) {
  return message.client.config.owner === message.author.id;
}

exports.isNotBlacklisted = async function(message) {
  if (!message.channel.guild) return false;
  const member = await message.channel.guild.members.fetch(message.author);
  for (let role of message.client.guildStore.get(message.channel.guild.id).blacklist) {
    if (member.roles.cache.has(role)) return false;
  }
  return true;
}

exports.isPollWhitelisted = async function(message) {
  if (!message.channel.guild) return false;
  const member = await message.channel.guild.members.fetch(message.author);
  for (let role of message.client.guildStore.get(message.channel.guild.id).pollWhitelist) {
    if (member.roles.cache.has(role)) return true;
  }
  return false;
}

exports.combineAll = function() {
  const checks = Array.from(arguments);
  return function(message) {
    for (let check of checks) {
      if (!check(message)) return false;
    }
    return true;
  }
}

exports.combineAny = function() {
  const checks = Array.from(arguments);
  return function(message) {
    for (let check of checks) {
      if (check(message)) return true;
    }
    return false;
  }
}
