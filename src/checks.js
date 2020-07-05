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

exports.isNotBlacklisted = function(message) {
  if (!message.member) return false;
  for (let role of message.client.guildStore.get(message.guild.id).blacklist) {
    if (message.member.roles.has(role)) return false;
  }
  return true;
}

exports.isPollWhitelisted = function(message) {
  if (!message.member) return false;
  for (let role of message.client.guildStore.get(message.guild.id).pollWhitelist) {
    if (message.member.roles.has(role)) return true;
  }
  return false;
}

exports.combine = function() {
  const checks = Array.from(arguments);
  return function(message) {
    for (let check of checks) {
      if (!check(message)) return false;
    }
    return true;
  }
}
