const Discord = require('discord.js');
const fs = require('fs').promises;

const COMMANDS = new Map();

var PREFIX = '!';
var ADMIN_FLAG = 'ADMINISTRATOR';

async function loadCommands() {
  let files = await fs.readdir('./src/commands');
  for (let file of files) {
    let command = require(`./commands/${file}`);
    console.log(`Loaded command ${command.name}`);
    COMMANDS.set(command.name.toLowerCase(), command.call);
  }
}

const client = new Discord.Client();

client.on('message', async function(message) {
  if (!message.member || !message.member.hasPermission(ADMIN_FLAG)) return;
  if (!message.content.startsWith(PREFIX)) return;

  let parts = message.content.substr(PREFIX.length).split(' ');
  if (parts.length === 0) return;
  let command = parts.splice(0, 1)[0].trim().toLowerCase();

  if (COMMANDS.has(command)) {
    console.log(`Running ${command}`);
    try {
      await COMMANDS.get(command)(message, parts);
    } catch(e) {
      console.error(`Error running command ${command}\n`, e);
      await message.channel.send('Sorry an error occured, please try again later');
    }
    return;
  }
  console.log(`Unkown command ${command}`);
})

client.on('ready', async function() {
  console.log(`Logged in ${client.user.username} [${client.user.id}]...`);
  let invite = await client.generateInvite('ADMINISTRATOR');
  console.log(`Invite link ${invite}`);
})

async function start(config) {
  PREFIX = config.prefix === undefined ? PREFIX : config.prefix;
  ADMIN_FLAG = config.admin_flag === undefined ? ADMIN_FLAG : config.admin_flag;

  await loadCommands();
  await client.login(config.key);
  return client;
}

module.exports = start;
