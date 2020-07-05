const { Collection } = require('discord.js');

class WaitManager {
  constructor(client) {
    this.client = client;
    this.waiters = new Collection();
  }

  registerWait(id, handler, time) {
    if (this.waiters.has(id)) this.client.clearTimeout(this.waiters.get(id));
    const d = time-Date.now();
    if (d < 0) return handler();
    const waitManager = this;
    return this.waiters.set(id, this.client.setTimeout(function() {
      waitManager.waiters.delete(id);
      handler.apply(this, arguments);
    }, time-Date.now()));
  }
}

module.exports = WaitManager;
