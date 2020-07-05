const { Message, TextChannel, Guild, RichEmbed } = require('discord.js');
const { numberEmoji, errorWrap } = require('../util.js');

const REACTION_LOOKUP = {};
for (let i=1;i<=10;i++) {
  REACTION_LOOKUP[numberEmoji(i)] = i-1;
}

class Poll {
  /* Constructor */
  constructor(client, init) {
    this.client = client;

    this.title = init.title;
    this.description = init.description;
    this.color = init.color;
    this.options = init.options;
    this.created = init.created || Date.now();
    this.duration = init.duration;
    this.message = init.message;
    this.channel = init.channel;
    this.guild = init.guild;
    this._message = init._message;
    this._channel = init._channel;
    this._guild = init._guild;
    this.ended = init.ended || false;
  }

  get message() {
    if (this.__message instanceof Message) {
      return Promise.resolve(this.__message);
    }
    const poll = this;
    return new Promise((resolve, reject) => {
      poll.channel.then((channel) => {
        if (channel.messages.has(poll._message)) {
          poll.__message = channel.messages.get(poll._message);
          return resolve(poll.__message);
        }
        channel.fetchMessage(poll._message).then((message) => {
          poll.__message = message;
          resolve(message);
        }).catch(reject);
      }).catch(reject);
    })
  }

  set message(message) {
    if (!(message instanceof Message)) return;
    this.__message = message;
    this._message = message.id;
    this.channel = message.channel;
    return message;
  }

  get channel() {
    if (this.__channel instanceof TextChannel) {
      return Promise.resolve(this.__channel);
    }
    const poll = this;
    return new Promise((resolve, reject) => {
      poll.guild.then((guild) => {
        if (guild.channels.has(poll._channel)) {
          poll.__channel = guild.channels.get(poll._channel);
          return resolve(poll.__channel);
        }
        reject(new Error('No such channel'));
      }).catch(reject);
    })
  }

  set channel(channel) {
    if (!(channel instanceof TextChannel)) return;
    this.__channel = channel;
    this._channel = channel.id;
    this.guild = channel.guild;
    return channel;
  }

  get guild() {
    if (this.__guild instanceof Guild) {
      return Promise.resolve(this.__guild);
    }
    if (this.client.guilds.has(this._guild)) {
      this.__guild = this.client.guilds.get(this._guild);
      return Promise.resolve(this.__guild);
    }
    return Promise.reject(new Error('No such guild'));
  }

  set guild(guild) {
    if (!(guild instanceof Guild)) return;
    this.__guild = guild;
    this._guild = guild.id;
    return guild;
  }

  /* Methods */

  async send() {
    const channel = await this.channel;
    const message = await channel.send(new RichEmbed({
      title: this.title,
      timestamp: this.created+this.duration,
      color: this.color,
      description: `${this.description}\n\n${this.options.map((op, i) => `${numberEmoji(i+1)} ${op}`).join('\n')}`
    }));
    this.message = message;
    await this.registerWait();
    for (let i=0;i<this.options.length;i++) {
      await message.react(numberEmoji(i+1));
    }
  }

  async end() {
    if (this.ended) return await this.delete();
    const message = await this.message;
    let counts = [];
    let total = 0;
    for (let reaction of message.reactions.values()) {
      if (reaction.emoji.name in REACTION_LOOKUP) {
        counts.push({ option: REACTION_LOOKUP[reaction.emoji.name], count: reaction.count-1 });
        total += reaction.count-1;
      }
    }
    await message.clearReactions();
    counts = counts.sort((a,b) => b.count-a.count);
    await message.edit(new RichEmbed({
      title: this.title,
      description: this.description,
      timestamp: this.created + this.duration,
      color: this.color,
      fields: counts.map((v) => {return { name: `${total > 0 ? Math.round(v.count/total*1000)/10 : 0}% (${v.count})`, value: this.options[v.option] }})
    }));
    this.ended = true;
    await this.delete();
  }

  async registerWait() {
    this.client.waitManager.registerWait(this._message, errorWrap(this.end.bind(this), errorWrap(this.delete.bind(this))), this.created+this.duration);
  }

  async save() {
    const poll = this;
    await this.client.guildStore.update(this._guild, function(guild) {
      guild.polls[poll._message] = poll;
      return guild;
    })
  }

  async delete() {
    const id = this._message;
    await this.client.guildStore.update(this._guild, function(guild) {
      delete guild.polls[id];
      return guild;
    })
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      options: this.options,
      created: this.created,
      duration: this.duration,
      ended: this.ended,
      '_message': this._message,
      '_channel': this._channel,
      '_guild': this._guild
    }
  }
}

module.exports = Poll;
