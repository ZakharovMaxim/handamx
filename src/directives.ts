import { internal, evaluate, attrsTransform, getCurrentContext, parseForAttr, createTempContext } from './utils'
import { effect } from './reactivity'
import { mount, unmount } from './dom'
import { ATTR_KEY, IS_CLONED_KEY } from './consts'

const createArrayEntries = (length) => {
  if (length) {
    return new Array(length).fill(1).map((_v, i) => [i, i + 1])
  }
  return []
}
const customAttributes = {
  'mx-on': {
    preprocess (_el, value, { contexts }) {
      let fn = value;
      const context = getCurrentContext(contexts)
      if (typeof context[value] !== 'function') {
        if (value.startsWith('function') || value.indexOf('=>') !== -1) {
          fn = value
        } else {
          fn = `function binded ($event) {${value}}`
        }
      }
      return fn
    },
    bind (el, value, { event, contexts, modifiers }) {
      const context = getCurrentContext(contexts)
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
      const hasEventModifiers = ['stop', 'prevent', 'self'].some(mod => modifiers.includes(mod))
      const method = hasEventModifiers ? function eventHandler (ev) {
        if (modifiers.includes('stop')) {
          ev.stopPropagation()
        }
        if (modifiers.includes('prevent')) {
          ev.preventDefault()
        }
        if (modifiers.includes('self') && ev.target !== el) {
          return
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
        const attrValue = attrsTransform(value)
        if (attrToBindName === 'value') {
          value = String(value)
          el.value = value
        } else if (attrValue === false) {
          el.removeAttribute(attrToBindName)
        } else {
          el.setAttribute(attrToBindName, attrValue)
        }
      }

    }
  },
  'mx-if': {
    bind (el, value, { contexts }) {
      const context = getCurrentContext(contexts)
      if (value) {
        mount(el, {contexts, globalContext:context.$global, isMount: true})
      } else {
        unmount(el)
      }
    }
  },
  'mx-for': {
    preprocess (_el, defaultValue) {
      return parseForAttr(defaultValue).value
    },
    bind (el, value, { contexts, attr }) {
      const iterator = typeof value === 'number'
      ? createArrayEntries(value)
      : Array.isArray(value) ? value.map((val, key) => [key, val])
      : value
      if (!el.internal?.comment) {
        const comment = document.createComment('v-for')
        el.before(comment)
        el.internal = {
          ...el.internal,
          comment
        }
      }
      const context = getCurrentContext(contexts)
      let lastElementInTheList = el.internal.comment
      let prevClonedElement = el.internal.comment.nextSibling
      while(prevClonedElement?.[IS_CLONED_KEY] || prevClonedElement === el) {
        const { nextSibling } = prevClonedElement
        unmount(prevClonedElement)
        prevClonedElement = nextSibling
      }
      const {valueKey, iteratorKey} = parseForAttr(attr.value)
      for(let i = 0; i < iterator.length; i++) {
        const cloned = el.cloneNode(true)
        const attributes = [...cloned.attributes]
        for(const attr of attributes) {
          cloned.removeAttribute(attr.name)
        }
        cloned[ATTR_KEY] = el[ATTR_KEY].filter(attr => attr.name !== 'mx-for')
        lastElementInTheList.after(cloned)
        const newContext = createTempContext()
        if (valueKey) {
          newContext[valueKey] = iterator[i][1]
        }
        if (iteratorKey) {
          newContext[iteratorKey] = iterator[i][0]
        }
        mount(cloned, {contexts: [newContext, ...contexts], globalContext: context.$global})
        cloned[IS_CLONED_KEY] = true
        lastElementInTheList = cloned
      }
      unmount(el)
    }
  },
  'mx-ref': {
    skipEvaluating: true,
    bind (el, value, { contexts }) {
      const context = getCurrentContext(contexts)
      if (!context.$refs[value]) {
        context.$refs[value] = el
      }
    },
    unbind (_el, value, { contexts }) {
      const context = getCurrentContext(contexts)
      if (context.$refs[value]) {
        delete context.$refs[value]
      }
    }
  }
}

const directives = {}
function directive (schema) {
  return {
    bind (el, options) {
      const { attr, event, modifiers, contexts} = options
      let effectResult;
      if (schema.bind) {
        const schemaOptions = {contexts, attr, event, modifiers}
        const value = schema.preprocess ? schema.preprocess(el, attr.value, schemaOptions) : attr.value
        if (schema.skipEvaluating) {
          effectResult = schema.bind(el, value, schemaOptions)
        } else {
          const currentEffect = effect(() => {

            const evaluationResult = evaluate(value, contexts, el)
            effectResult = schema.bind(el, evaluationResult, schemaOptions)
          })
          if (options.saveEffect) {
            internal.addElementEffect(el, currentEffect)
          }
        }
      }
      return effectResult
    }
  }
}
Object.keys(customAttributes).forEach(key => {
  directives[key] = directive(customAttributes[key])
})

export default directives
