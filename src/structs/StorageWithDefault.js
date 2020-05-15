const Storage = require('./Storage.js');

class StorageWithDefault extends Storage {
  constructor(filename, defaults) {
    super(filename);
    this._defaults = defaults;
  }

  get(key) {
    let res = {};
    const value = super.get(key);
    if (value === undefined) {
      for (let k in this._defaults) {
        res[k] = this._defaults[k];
      }
      return res;
    }
    for (let k in this._defaults) {
      if (k in value) {
        res[k] = value[k];
      } else {
        res[k] = this._defaults[k];
      }
    }
    return res;
  }
}

module.exports = StorageWithDefault;
