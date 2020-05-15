/* Abstract base class */
class SaveInterface {
  /* Save the entire config */
  async save(dataStore) {
    if (!this.isMap(dataStore)) throw new Error('Must provide a Map object');
  }

  /* Load the entire config */
  async load(dataStore) {
    if (!this.isMap(dataStore)) throw new Error('Must provide a Map object');
  }

  isMap(dataStore) {
    return dataStore instanceof Map;
  }
}

module.exports = SaveInterface
