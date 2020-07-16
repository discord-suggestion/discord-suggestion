const fs = require('fs').promises;
const SaveInterface = require('./SaveInterface.js');
const Serializable = require('../Serializable.js');
const { allSettled, isOfBaseType } = require('@douile/bot-utilities');

class SaveJSON extends SaveInterface {
  constructor(filename) {
    super();
    this.filename = filename;
  }

  async save(dataStore) {
    if (!this.isMap(dataStore)) throw new Error('Must provide a Map object');
    let obj = {};

    let promises = [];
    for (let [key, item] of dataStore.entries()) {
      promises.push(this.saveItem(obj, key, item));
    }
    await allSettled(promises);
    let content = JSON.stringify(obj);
    await fs.writeFile(this.filename, content);
  }

  async saveItem(obj, key, item) {
    if (isOfBaseType(item, Array)) {
      obj[key] = new Array(item.length);
      for (let i=0;i<item.length;i++) {
        await this.saveItem(obj[key], i, item[i]);
      }
    } else if (item instanceof Serializable) {
      obj[key] = item.serialize();
    } else {
      obj[key] = item;
    }
    return true;
  }

  async load(dataStore) {
    if (!this.isMap(dataStore)) throw new Error('Must provide a Map object');

    let content = await fs.readFile(this.filename);
    let obj = JSON.parse(content);

    let promises = [];
    for (let [key, item] of Object.entries(obj)) {
      promises.push(this.loadItem(dataStore, key, item));
    }
    let res = await allSettled(promises), errs = res.filter(v => v !== true);
    console.log(`[STORAGE] Loaded ${promises.length} configs...`);
    if (errs.length > 0) console.error(errs);
  }

  async loadItem(dataStore, key, item) {
    let res; // NOTE: Type checking here is a bit flippant
    if (isOfBaseType(item, Array)) {
      res = new Array(item.length);
      for (let i=0;i<item.length;i++) {
        res[i] = Serializable.parse(item[i]);
      }
    } else {
      res = Serializable.parse(item);
    }
    dataStore.set(key, res, true);
    return true;
  }
}

module.exports = SaveJSON;
