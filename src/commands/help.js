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
    await message.channel.send(new RichEmbed({
      title: 'Help',
      description: Array.from(message.client.commands.values())
        .filter(cmd => cmd.name !== 'help' && (isOfBaseType(cmd.check, Function) ? cmd.check(message) : true))
        .map(cmd => `\`${message.client.config.prefix}${cmd.name}\``)
        .join('\n'),
      footer: { text: `Use "${message.client.config.prefix}help commandName" for detailed help` }
    }));
  } else {
    const matches = Array.from(message.client.commands.values())
      .filter(cmd => matchAny(`${message.client.config.prefix}${cmd.name}`, search) && (isOfBaseType(cmd.check, Function) ? cmd.check(message) : true));
    await message.channel.send(new RichEmbed({
      title: 'Help',
      description: matches.length === 0 ? `Sorry no commands matched the pattern \`${parts.join(' ')}\` (_commands you don't have access to will not appear_)\nYou can list all the commands you have access to with \`${message.client.config.prefix}help\`` : undefined,
      fields:
        matches.map(cmd => {
          return {
            name: `${message.client.config.prefix}${cmd.name}`,
            value: isOfBaseType(cmd.help, String) ? cmd.help.replace(/\{command\}/gi, `${message.client.config.prefix}${cmd}`) : 'No help message provided',
            inline: false
          };
        })
    }));
  }
}

exports.name = 'help';
exports.alias = [ 'help', 'h' ];
exports.call = call;
