function baseClassnames () {
  let classes = []
  for(let i = 0; i < arguments.length; i++) {
    const arg = arguments[i]
    if (!arg) {
      continue;
    }
    if (Array.isArray(arg)) {
      classes = classes.concat(arg)
    } else if (typeof arg === 'object') {
      const keys = Object.keys(arg)
      for(let j = 0 ; j < keys.length; j++) {
        if (arg[keys[j]]) {
          classes.push(keys[j])
        }
      }
    } else {
      classes.push(arg)
    }
  }
  return classes
}
function classnames (...args) {
  return baseClassnames(...args).join(' ').trim()
}
function bind (ctx) {
  return function bound (...args) {
    return baseClassnames(...args).map(key => ctx[key] || key).join(' ').trim()
  }
}

