/* Polyfill for Promise.allSettled as it is not supported until Node v12.9.0 */
exports.allSettled = function(promises) {
  var count = 0, size = promises.length, responses = new Array(size);
  return new Promise((resolve) => {
    if (size === 0) return resolve([]);
    for (let i=0;i<size;i++) {
      let onFufilled = function() {
        let res = Array.from(arguments);
        if (res.length === 0) res = undefined;
        if (res.length === 1) res = res[0];
        responses[i] = res;
        count += 1;
        if (count >= size) resolve(responses);
      }
      promises[i].then(onFufilled).catch(onFufilled);
    }
  });
}

/* Wrap async or promise functions and handle errors */
exports.errorWrap = function(callable) {
  return function() {
    return callable.apply(this,arguments).then(null).catch(function(...e) {
      console.error(`Encountered error running ${callable.name}`, ...e);
    })
  }
}

// Check the constructor of an item
exports.isOfBaseType = function(obj, constr) {
  return (![null, undefined].includes(obj)) && (obj.constructor === constr);
}

const MARKDOWN_CHARS = '*_|~>`';
exports.markdownEscape = function(text) {
  return Array.from(text).map(c => MARKDOWN_CHARS.includes(c) ? `\\${c}` : c).join('');
}

exports.extendPrototype = function(classVar, methods) {
  for (let key in methods) {
    /* defineProperty not required here, could use regular assignment */
    Object.defineProperty(classVar.prototype, key, {
      configurable: true,
      enumberable: true,
      writable: true,
      value: methods[key]
    });
  }
}

// Externeous type checking
const is = {
  discordMention: function(text) {
    return is.discordReference(text, '<@', ['!', '&']);
  },
  discordRole: function(text) {
    return is.discordReference(text, '<@&', []);
  },
  discordChannel: function(text) {
    return is.discordReference(text, '<#', []);
  },
  discordReference: function(text, start, extras) {
    let toCheck = text;
    if (text.startsWith(start)) {
      let begin = start.length;
      for (let extra of extras) {
        if (text.substr(begin, extra.length) === extra) {
          begin += extra.length;
          break;
        }
      }
      toCheck = text.substr(begin, text.length-begin-1);
    }
    if (is.discordSnowflake(toCheck)) {
      return toCheck; // Return snowflake ID if found
    }
    return undefined;
  },
  discordSnowflake: function(text) {
    return text.length > 0 && text.length <= 20 && is.stringOfNums(text);
  },
  stringOfNums: function(text) {
    for (let i=0; i<text.length; i++) {
      let n = text.charCodeAt(i);
      if (n < 48 || n > 57) return false; // '0' | '9'
    }
    return true;
  }
}
exports.is = is;
