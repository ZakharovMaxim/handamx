import { internal, evaluate, attrsTransform } from './utils'
import { effect } from './reactivity'
import { mount, unmount } from './dom'

const customAttributes = {
  'mx-on': {
    preprocess (_el, value, { context }) {
      let fn = value;
      if (typeof context[value] !== 'function') {
        if (value.startsWith('function') || value.indexOf('=>') !== -1) {
          fn = value
        } else {
          fn = `function binded (...attrs) {${value}}`
        }
      }
      return fn
    },
    bind (el, value, { event, context, modifiers }) {
      let rawMethod = typeof context[value] === 'function' ? context[value] : value
      if (typeof rawMethod !== 'function') {
        return
      }
      const options: AddEventListenerOptions = {}
      if (modifiers.includes('capture')) {
        options.capture = true
      }
      if (modifiers.includes('once')) {
        options.once = true
      }
      if (modifiers.includes('passive')) {
        options.passive = true
      }
      rawMethod = rawMethod.bind(context)
      const method = modifiers.includes('stop') || modifiers.includes('prevent') ? function eventHandler (ev) {
        if (modifiers.includes('stop')) {
          ev.stopPropagation()
        }
        if (modifiers.includes('prevent')) {
          ev.preventDefault()
        }
        rawMethod(ev)
      } : rawMethod
      el.addEventListener(event, method, options);
    }
  },
  'mx-text': {
    bind (el, value) {
      if (value !== null) {
        el.textContent = value
      }
    }
  },
  'mx-html': {
    bind (el, value) {
      if (value !== null) {
        el.innerHTML = value
      }
    }
  },
  'mx-show': {
    bind (el, value) {
      el.style.display = value ? '' : 'none'
    }
  },
  'mx-bind': {
    preprocess (el, defaultValue, {event}) {
      let value = defaultValue
      if (event === 'class') {
        value = `classnames(${defaultValue}`
        if (el.getAttribute('class')) {
          value += `, ${el.getAttribute('class').split(' ').map(cl => `"${cl}"`).join(', ')}`
        }
        value += ')'
      }
      return value
    },
    bind (el, value, { event: attrToBindName }) {
      if (attrToBindName === 'style') {
        Object.entries(value).forEach(([key, value]) => {
          el.style[key] = value
        })
      } else if (attrToBindName === 'class') {
        el.className = value
      } else {
        if (attrToBindName === 'value') {
          value = String(value)
        }
        const attrValue = attrsTransform(value)
        if (attrValue === false) {
          el.removeAttribute(attrToBindName)
        } else {
          el.setAttribute(attrToBindName, attrValue)
        }
      }

    }
  },
  'mx-if': {
    bind (el, value, { context }) {
      if (value) {
        mount(el, {context, globalContext:context.$global, isMount: true})
      } else {
        unmount(el, {isMount: true})
      }
    }
  },
  'mx-for': {
    preprocess (_el, defaultValue) {
      console.log('here')
      return defaultValue.split('in')[1]?.trim()
    },
    bind (el, value, options) {
      const iterator = typeof value === 'number'
        ? new Array(value).fill(1).map((_v, i) => i)
        : Array.isArray(value)
          ? value
          : Object.values(value)
      for(let i = 1; i < iterator.length; i++) {
        const cloned = el.cloneNode(true)
        cloned.removeAttribute('mx-for')
        el.after(cloned)
        mount(cloned, {context: options.context, globalContext: options.context.$global})
        cloned.isCloned = true
      }
      console.log(iterator, value, options)
      // if (value) {
      //   mount(el, {context, globalContext:context.$global, isMount: true})
      // } else {
      //   unmount(el, {isMount: true})
      // }
    }
  },
  'mx-ref': {
    skipEvaluating: true,
    bind (el, value, { context }) {
      if (!context.$refs[value]) {
        context.$refs[value] = el
      }
    },
    unbind (_el, value, { context }) {
      if (context.$refs[value]) {
        delete context.$refs[value]
      }
    }
  }
}

const directives = {}
function directive (schema) {
  return {
    bind (el, context, options) {
      const { attr, event, modifiers} = options
      if (schema.bind) {
        const schemaOptions = {context, attr, event, modifiers}
        const value = schema.preprocess ? schema.preprocess(el, attr.value, schemaOptions) : attr.value
        if (schema.skipEvaluating) {
          schema.bind(el, value, schemaOptions)
        } else {
          const currentEffect = effect(() => {
            let res = value;
            let contexts = Array.isArray(context) ? context : [context]
            for(let ctx of contexts) {
              res = evaluate(res, ctx, el)
            }
            
            schema.bind(el, res, schemaOptions)
          })
          internal.addElementEffect(el, currentEffect)
        }
      }
    }
  }
}
Object.keys(customAttributes).forEach(key => {
  directives[key] = directive(customAttributes[key])
})

export default directives
