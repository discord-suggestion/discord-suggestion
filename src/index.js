const Discord = require('discord.js');
const fs = require('fs').promises;
const StorageWithDefault = require('./structs/StorageWithDefault.js');
const { errorWrap } = require('./util.js');
const { setDebugFlag, debugLog, verbooseLog } = require('./debug.js');

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

Object.defineProperties(client, {
  guildStore: { value: new StorageWithDefault('_guild_store.json', {
    channels: {},
    blacklist: {}
  }) },
  messageStore: { value: new StorageWithDefault('_message_store.json') },
  commands: { value: new Map() },
  config: { value: {
    prefix: '!',
    owner: '293482190031945739',
    adminFlag: 'ADMINISTRATOR'
  } }
});

async function loadCommand(file) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name.toLowerCase(), {call: command.call, check: command.check, help: command.help});
  console.log(`Loaded command ${command.name}`);
}

async function loadCommands() {
  const files = await fs.readdir('./src/commands');
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
  await client.messageStore.load();
  await client.login(config.key);
  return client;
}

module.exports = start;
