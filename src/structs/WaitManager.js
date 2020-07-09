const { Collection } = require('discord.js');

const { MAX_TIMEOUT, DURATIONS_OBJECT } = require('../constants.js');

class WaitManager {
  constructor(client) {
    this.client = client;
    this.waiters = new Collection();
    this.backlog = new Collection();
    this._backlogInterval = this.client.setInterval(this.backlogInterval.bind(this), DURATIONS_OBJECT.hour);
  }

  registerWait(id, handler, timeGetter) {
    if (this.has(id)) this.clearTimeout(id);
    const d = timeGetter();
    if (d < 0) return handler();
    if (d < MAX_TIMEOUT) {
      const waitManager = this;
      return this.waiters.set(id, this.client.setTimeout(function() {
        waitManager.waiters.delete(id);
        handler.apply(this, arguments);
      }, d));
    } else {
      this.backlog.set(id, {
        handler,
        timeGetter
      });
    }
  }

  has(id) {
    if (this.waiters.has(id)) return true;
    if (this.backlog.has(id)) return true;
    return false;
  }

  clearTimeout(id) {
    if (this.waiters.has(id)) {
      this.client.clearTimeout(this.waiters.get(id));
      this.waiters.delete(id);
    }
    if (this.backlog.has(id)) this.backlog.delete(id);
  }

  backlogInterval() {
    for (let [id, item] of this.backlog.entries()) {
      const d = item.timeGetter();
      if (d < MAX_TIMEOUT) {
        this.backlog.delete(id);
        const waitManager = this;
        this.waiters.set(id, this.client.setTimeout(function() {
          waitManager.waiters.delete(id);
          item.handler.apply(this, arguments);
        }, d));
      }
    }
  }
}

module.exports = WaitManager;
