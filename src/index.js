const Discord = require('discord.js');
const fs = require('fs').promises;

const StorageWithDefault = require('./structs/StorageWithDefault.js');
const { errorWrap, is, isOfBaseType } = require('./util.js');
const { setDebugFlag, debugLog, verbooseLog } = require('./debug.js');
const WaitManager = require('./structs/WaitManager.js');
const Poll = require('./structs/Poll.js');
const EventHandler = require('./structs/EventHandler.js');
const { AsyncFunction } = require('./constants.js');

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
  users: {},
  pollWhitelist: [],
  polls: {}
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
  waitManager: { value: new WaitManager(client) },
  reactEventHandler: { value: new EventHandler(client, 'reactadd') },
  config: { value: {
    prefix: '!',
    owner: '293482190031945739',
    adminFlag: 'ADMINISTRATOR',
    suggestionRate: undefined // 2 hours
  } }
});

async function loadCommand(file) {
  const command = require(`./commands/${file}`);
  if (
    isOfBaseType(command, Object) &&
    isOfBaseType(command.name, String) &&
    isOfBaseType(command.alias, Array) &&
    isOfBaseType(command.call, AsyncFunction)
  ) {
    for (let cmd of command.alias) {
      client.commands.set(cmd.toLowerCase(), command);
    }
  }

  debugLog(`[SETUP] Loaded command ${command.name}`);
}

async function loadCommands() {
  const files = await fs.readdir(`${__dirname}/commands`);
  /* allSettled not used as we don't want to ignore errors */
  await Promise.all(files.map(loadCommand));
}

async function setupPoll(guildID) {
  const toRun = [];
  await client.guildStore.update(guildID, function(guild) {
    for (let key in guild.polls) {
      guild.polls[key] = new Poll(client, guild.polls[key]);
      toRun.push(guild.polls[key].registerWait.bind(guild.polls[key]));
    }
    return guild;
  }, true);
  await Promise.all(toRun.map(f => f()));
}

async function setupPolls() {
  const promises = [];
  for (let key of client.guildStore.keys()) {
    promises.push(setupPoll(key));
  }
  await Promise.all(promises);
}

client.on(Discord.Constants.Events.MESSAGE_CREATE, errorWrap(async function(message) {
  if (!message.member || message.author.bot) return;
  if (!message.content.startsWith(client.config.prefix)) {
    const mention = is.discordMention(message.content.trim());
    if (mention === client.user.id) await message.channel.send(`Hi there, my prefix is \`${client.config.prefix}\`, you can view my commands with \`${client.config.prefix}help\``);
    return;
  }

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
        console.error(`[MESSAGE] Error running command ${command}\n`, e);
        await message.channel.send('Sorry an error occured, please try again later');
      }
    } else {
      await message.channel.send('Sorry you don\'t have permission to use this command');
    }

    return;
  }
  verbooseLog(`[MESSAGE] Unkown command ${command}`);
}))


/* raw handler used as reaction only works for cached messages */
client.on('raw', errorWrap(async function(data) {
  if (data.t !== 'MESSAGE_REACTION_ADD') return; /* Check packet event */

  await client.reactEventHandler.handle(data);
}));


client.on(Discord.Constants.Events.READY, errorWrap(async function() {
  console.log(`[READY] Logged in ${client.user.username} [${client.user.id}]...`);
  let invite = await client.generateInvite(INVITE_FLAGS);
  console.log(`[READY] Invite link ${invite}`);
  await setupPolls();
}));

client.on(Discord.Constants.Events.RATE_LIMIT, debugLog);
client.on(Discord.Constants.Events.DEBUG, verbooseLog);
client.on(Discord.Constants.Events.WARN, verbooseLog);
client.on(Discord.Constants.Events.ERROR, debugLog);
client.on(Discord.Constants.Events.DISCONNECT, (closeEvent) => {
  debugLog('[NETWORK] Disconnected from discord API', closeEvent);
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

  debugLog('[LOGGING] DEVELOPER LOGS ENABLED');
  verbooseLog('[LOGGING] VERBOOSE LOGS ENABLED');

  // Setup
  await loadCommands();
  await client.guildStore.load();
  await client.reactEventHandler.loadHandlers();

  // Log in
  await client.login(config.key);
  return client;
}

module.exports = start;
