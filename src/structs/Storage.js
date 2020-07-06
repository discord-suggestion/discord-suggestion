const { Collection } = require('discord.js');
const SaveInterface = require('./save/SaveInterface.js');
const SaveJSON = require('./save/SaveJSON.js');

class Storage extends Collection {
  constructor(filename) {
    super();
    this._saveLock = false;
    this._keyLock = new Map();
    this._saveLockQueue = new Array();
    this.saveInterface = new SaveInterface();
    if (filename) {
      this.saveInterface = new SaveJSON(filename);
    }
  }
  async load() {
    await this.saveLock();
    try {
      await this.saveInterface.load(this);
    } catch(e) {
      console.error(e);
    }
    await this.saveUnlock();
  }

  async save() {
    await this.saveLock();
    try {
      await this.saveInterface.save(this);
    } catch(e) {
      console.error(e);
    }
    await this.saveUnlock();
  }

  set(key, value, dontSave) {
    super.set(key, value);
    if (dontSave !== true) return this.save();
    console.warn(`Set ${key} without saving`);
  }

  delete(key, dontSave) {
    super.delete(key);
    if (!dontSave) return this.save();
    console.warn(`Deleted ${key} without saving`);
  }

  update(key, updater, dontSave) {
    const storage = this;
    return new Promise((resolve, reject) => {
        if (storage._keyLock.has(key)) return storage._keyLock.get(key).push(storage._qupdate(resolve, reject, key, updater, dontSave));
        storage._keyLock.set(key, []);
        storage._qupdate(resolve, reject, key, updater, dontSave)();
    });
  }

  _qupdate(resolve, reject, key, updater, dontSave) {
    const storage = this;
    return function() {
      storage._update(key, updater, dontSave).then(function() {
        storage._next_update(key);
        resolve.apply(this, arguments);
      }).catch(function() {
        storage._next_update(key);
        reject.apply(this, arguments);
      });
    }
  }

  async _update(key, updater, dontSave) {
    let v = updater(this.get(key));
    if (v instanceof Promise) v = await v;
    const r = this.set(key, v, dontSave);
    if (r instanceof Promise) await r;
    return r;
  }

  _next_update(key) {
    if (this._keyLock.has(key)) {
      const lock = this._keyLock.get(key);
      if (lock.length === 0) {
        this._keyLock.delete(key);
      } else {
        lock.splice(0,1)[0]();
      }
    }
  }

  async saveLock() {
    if (this._saveLock) {
      let queue = this._saveLockQueue;
      await new Promise((resolve) => {
        queue.push(resolve);
      });
    }
    return this._saveLock = true;
  }

  async saveUnlock() {
    if (this._saveLockQueue.length > 0) {
      this._saveLock.pop(0)();
    } else {
      this._saveLock = false;
    }
  }

  // TODO: add update function

  *flatValues() {
    const values = this.values();
    let result = values.next();
    while (!result.done) {
      if (Array.isArray(result.value)) {
        for (let item of result.value) {
          yield item;
        }
      } else {
        yield result.value;
      }
      result = values.next();
    }
  }
}

module.exports = Storage;
