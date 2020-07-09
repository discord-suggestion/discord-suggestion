exports.emojis = {
  'upvote': '👍',
  'downvote': '👎',
  'accept': '✅',
  'reject': '❌'
}

exports.commandSymbols = {
  add: ['+','add'],
  remove: ['-','remove']
}

exports.AsyncFunction = (async function() {}).__proto__.constructor;

exports.DURATIONS = [
  { n: 31557600000, name: 'year'},
  { n: 2629800000, name: 'month' },
  { n: 604800000, name: 'week'},
  { n: 86400000, name: 'day' },
  { n: 3600000, name: 'hour' },
  { n: 60000, name: 'minute' },
  { n: 1000, name: 'second' },
  { n: 1, name: 'millisecond' }
];

exports.DURATIONS_OBJECT = {};
for (let {name, n} of exports.DURATIONS) {
  exports.DURATIONS_OBJECT[name] = n;
}

exports.MAX_TIMEOUT = 2147483647 - 100; // Max int32 - a buffer
