const fs = require('fs').promises;

const { FLAGS, isFlag } = require('../handlers/flags.js');

class EventHandler {
  constructor(client, name) {
    this.client = client;
    this.name = name;
    this.handlers = [];
  }

  async loadHandler(file) {
    this.handlers.push(require(`../handlers/${this.name}/${file}`));
  }

  async loadHandlers() {
    const files = await fs.readdir(`${__dirname}/../handlers/${this.name}`);
    await Promise.all(files.map(this.loadHandler.bind(this)))
  }

  async handle(evt) {
    let handled = 0;
    for (let handler of this.handlers) {
      const res = await handler.call(this, evt);
      if (isFlag(res, FLAGS.HANDLED)) handled++;
      if (isFlag(res, FLAGS.STOP)) return handled;
    }
    return handled;
  }
}

module.exports = EventHandler;
