const { RichEmbed } = require('discord.js');

const { isOfBaseType } = require('../util.js');

const matchAny = function(text, search) {
  for (let s of search) {
    if (text.match(s) !== null) return true;
  }
  return false;
}

const call = async function(message, parts) {
  const search = parts.map(s => new RegExp(s, 'gi'));
  if (search.length === 0) {
    const matched = {};
    await message.channel.send(new RichEmbed({
      title: 'Help',
      description: Array.from(message.client.commands.values())
        .filter(cmd => {
          // This is kinda hacky I should store a names only command object
          if (cmd.name !== 'help' && (isOfBaseType(cmd.check, Function) ? cmd.check(message) : true)) {
            if (cmd.name in matched) return false;
            matched[cmd.name] = true;
            return true;
          }
          return false;
        })
        .map(cmd => cmd.alias.map(alias => `\`${message.client.config.prefix}${alias}\``).join(', '))
        .join('\n'),
      footer: { text: `Use "${message.client.config.prefix}help commandName" for detailed help` }
    }));
  } else {
    const matched = {};
    const matches = Array.from(message.client.commands.entries())
      .filter(([alias,cmd]) => {
        if (matchAny(`${message.client.config.prefix}${alias}`, search) && (isOfBaseType(cmd.check, Function) ? cmd.check(message) : true)) {
          if (cmd.name in matched) return false;
          matched[cmd.name] = true;
          return true;
        }
        return false;
      });
    await message.channel.send(new RichEmbed({
      title: 'Help',
      description: matches.length === 0 ? `Sorry no commands matched the pattern \`${parts.join(' ')}\` (_commands you don't have access to will not appear_)\nYou can list all the commands you have access to with \`${message.client.config.prefix}help\`` : undefined,
      fields:
        matches.map((cmd) => {
          return {
            name: `${message.client.config.prefix}${cmd[1].name}`,
            value: isOfBaseType(cmd[1].help, String) ? cmd[1].help.replace(/\{command\}/gi, `${message.client.config.prefix}${cmd[1].name}`) : 'No help message provided',
            inline: false
          };
        })
    }));
  }
}

exports.name = 'help';
exports.alias = [ 'help', 'h' ];
exports.call = call;
