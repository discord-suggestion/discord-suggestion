const Discord = require('discord.js');
const fs = require('fs').promises;

const StorageWithDefault = require('./structs/StorageWithDefault.js');
const { errorWrap, hasAny } = require('./util.js');
const { setDebugFlag, debugLog, verbooseLog } = require('./debug.js');
const constants = require('./constants.js');

const INVITE_FLAGS = [ 'VIEW_AUDIT_LOG', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'ADD_REACTIONS' ];

const client = new Discord.Client({
  apiRequestMethod: 'sequential',
  disableEveryone: true,
  restTimeOffset: 1200,
  disabledEvents: [ 'TYPING_START', 'VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE', 'WEBHOOKS_UPDATE' ],
  ws: {
    compress: true
  }
});

const GUILD_DEFAULTS = {
  channels: {},
  blacklist: [],
  managers: [],
  users: {}
};

Object.defineProperty(GUILD_DEFAULTS, 'suggestionRate', {
  enumerable: true,
  configurable: false,
  get: function() {
    return client.config.suggestionRate;
  }
})

Object.defineProperties(client, {
  guildStore: { value: new StorageWithDefault('_guild_store.json', GUILD_DEFAULTS) },
  commands: { value: new Map() },
  config: { value: {
    prefix: '!',
    owner: '293482190031945739',
    adminFlag: 'ADMINISTRATOR',
    suggestionRate: 0x6ddd00 // 2 hours
  } }
});

async function loadCommand(file) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name.toLowerCase(), {call: command.call, check: command.check, help: command.help});
  console.log(`Loaded command ${command.name}`);
}

async function loadCommands() {
  const files = await fs.readdir(`${__dirname}/commands`);
  /* allSettled not used as we don't want to ignore errors */
  await Promise.all(files.map(loadCommand));
}

client.on(Discord.Constants.Events.MESSAGE_CREATE, errorWrap(async function(message) {
  if (!message.member || message.author.bot) return;
  if (!message.content.startsWith(client.config.prefix)) return;

  let parts = message.content.substr(client.config.prefix.length).split(' ');
  if (parts.length === 0) return;
  let command = parts.splice(0, 1)[0].trim().toLowerCase();

  if (client.commands.has(command)) {
    debugLog(`${message.author.id} :: ${command} / ${parts.map(v => `"${v}"`).join(', ')}`);

    let cmd = client.commands.get(command);

    if (!(cmd.check instanceof Function) || cmd.check(message)) {
      try {
        await cmd.call(message, parts);
      } catch(e) {
        console.error(`Error running command ${command}\n`, e);
        await message.channel.send('Sorry an error occured, please try again later');
      }
    } else {
      await message.channel.send('Sorry you don\'t have permission to use this command');
    }

    return;
  }
  verbooseLog(`Unkown command ${command}`);
}))


/* raw handler used as reaction only works for cached messages */
client.on('raw', errorWrap(async function(data) {
  if (data.t !== 'MESSAGE_REACTION_ADD') return; /* Check packet event */
  if (!client.guildStore.has(data.d.guild_id)) return; /* Check message in guild with suggestion channels */
  if (!client.guilds.has(data.d.guild_id)) return; /* Check guild is in cache */
  const guild = client.guilds.get(data.d.guild_id);
  const guildStore = client.guildStore.get(data.d.guild_id);

  if (!(data.d.channel_id in guildStore.channels)) return; /* Check channel is a suggestion channel */
  if (!guild.channels.has(data.d.channel_id)) return; /* Check channel is in guild */
  const channel = guild.channels.get(data.d.channel_id);
  let message = channel.messages.get(data.d.message_id);
  try {
    message = await channel.fetchMessage(data.d.message_id);
  } catch (e) {
    verbooseLog(e);
  }
  if (message === undefined) return; /* Check message exists */

  if (message.author.id !== client.user.id) return; /* Check message was sent by this bot */
  if (!guild.members.has(data.d.user_id)) return; /* Check reactor is a member */
  const member = guild.members.get(data.d.user_id);
  if (!(member.hasPermission(client.config.adminFlag) || hasAny(member.roles, guildStore.managers))) return; /* Check reactors permissions */
  if (message.embeds.length === 0) return; /* Check whether message has an embed */
  if (message.embeds[0].fields.length > 0) return; // This'll do for now to check whether suggestion has been accepted / rejected

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
    const embed = new Discord.RichEmbed(message.embeds[0]);
    embed.setColor(action ? 0x00ff00 : 0xff0000);
    embed.addField(action ? 'Accepted' : 'Rejected', `${upvotes} ${constants.emojis.upvote} : ${downvotes} ${constants.emojis.downvote}`, true);
    await message.clearReactions();
    await message.edit(embed);
  }
}));


client.on(Discord.Constants.Events.READY, errorWrap(async function() {
  console.log(`Logged in ${client.user.username} [${client.user.id}]...`);
  let invite = await client.generateInvite(INVITE_FLAGS);
  console.log(`Invite link ${invite}`);
}))

client.on(Discord.Constants.Events.RATE_LIMIT, debugLog);
client.on(Discord.Constants.Events.DEBUG, verbooseLog);
client.on(Discord.Constants.Events.WARN, verbooseLog);
client.on(Discord.Constants.Events.ERROR, debugLog);
client.on(Discord.Constants.Events.DISCONNECT, (closeEvent) => {
  console.warn('[NETWORK] Disconnected from discord API', closeEvent);
});
client.on(Discord.Constants.Events.RECONNECTING, () => {
  console.log('[NETWORK] Attempting to reconnect to discord API');
});
client.on(Discord.Constants.Events.RESUME, (replayed) => {
  debugLog(`[NETWORK] Resumed connection to discord API (replaying ${replayed} events)`);
});

async function start(config) {
  setDebugFlag(config.debug, config.verboose);
  for (let key in client.config) {
    if (key in config) client.config[key] = config[key];
  }

  debugLog('DEVELOPER LOGS ENABLED');
  verbooseLog('VERBOOSE LOGS ENABLED');
  await loadCommands();
  await client.guildStore.load();
  await client.login(config.key);
  return client;
}

module.exports = start;
