# discord-suggestion

## Installation

```bash
git clone https://github.com/discord-suggestion/discord-suggestion
cd discord-suggestion
npm i
vim discord-suggestion.config.js # Put your own bot token in
pm2 start discord-suggestion.config.js
```

## Commands
_Where [p] is the prefix you set (default "!")_
```
[p]info
Output runtime information [p]info
[p]help
No help message provided
[p]poll
Create a poll [p]poll title;option;option;set=value
Seperate all arguments with a ;
The first non-setting argument is the description and the following are used as options (in order)
Setting arguments are set using key=value e.g. title=My poll
Valid setting arguments are:
- time : number followed by size (week: w, day: d, hours: h, minutes: m, seconds: s) e.g. time=1w 4d 2h for 1 week 4 days and 2 hours
- title : the title e.g. title=My poll
- color : number for color e.g. color=0xff0000 for red
[p]pollend
End a poll now [p]pollend pollID The pollID is the message ID of the poll, it can be found in the pollinfo command or by right clicking the poll
[p]pollinfo
List the currently active polls [p]pollinfo
[p]settings
Configure suggestion options
Add/Remove channel: [p]settings channel + #channel topic, [p]settings channel - #channel (topic must be a single word without spaces)
Add/Remove from denylist: [p]settings denylist + @role, [p]settings denylist - @role
Add/Remove manager roles: [p]settings managers + @role, [p]settings managers - @role
Add/Remove roles to/from poll allowlist: [p]settings poll + @role, [p]settings poll - @role
Set suggestion timeout: [p]settings timeout length (length in ms; leave blank for the bot default)
List settings: [p]settings list setting (omit setting for a list of available settings)
[p]suggest
Make a suggestion
Usage
[p]suggest [gamemode] suggestion
e.g. [p]suggest 1v1 Add some extra guns
```
