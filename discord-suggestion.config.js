const path = require('path');

module.exports = {
  apps: [{
    script: path.resolve(__dirname, 'index.js'),
    name: 'Discord Suggestion bot',
    env: {
      'DISCORD_API_KEY': 'API_KEY'
    },
    args: '--prefix ! --owner 293482190031945739 --admin ADMINISTRATOR --suggestion-rate 0x6ddd00'
  }]
};
