import { internal, evaluate, ATTR_KEY, copyCustomAttributes, findTemplateStrings, parseAttributeName } from './utils'
import { effect } from './reactivity'
import directives from './directives'
import { createScope, scopes } from './main'

export function unmount (el, options: UnmountOptions = {}) {
  internal.removeElement(el)
  if (el.childNodes) {
    let i = el.childNodes.length;
    while (i--) {
      unmount(el.childNodes[i], {keepNode: true});
    }
  }
  if (!options.keepNode) {
    el.remove()
  }
}

export function mount(el, options : MountOptions) {
  let attributes = [...(el[ATTR_KEY] || el.attributes || [])]
  if (!el[ATTR_KEY]) {
    Object.defineProperty(el, ATTR_KEY, {
      value: []
    })
  }
  if (el.nodeType === Node.TEXT_NODE) {
    findTemplateStrings(el, (value) => {
      const textAttr = {
        name: 'mx-text',
        value
      }
      el.parentNode[ATTR_KEY].push(textAttr)
      attributes.push(textAttr)
    })
  }
  if (el.nodeType !== Node.TEXT_NODE && !el[ATTR_KEY].length) {
    copyCustomAttributes(el, attributes)
  }
  const parent = el.parentNode
  const nextSibling = el.nextSibling
  let {context} = options
  context.$global = options.globalContext
  if (attributes?.length) {
    const scopeAttribute = attributes.find(attr => attr.name === 'mx-scope')
    if (scopeAttribute && scopes[scopeAttribute.value]) {
      context = createScope(scopes[scopeAttribute.value])
      context.$parent = options.context
    }
    const ifAttribute = attributes.find(attr => attr.name === 'mx-if')
    if (ifAttribute && !options.isMount) {
      effect(() => {
        const evaluationResult = evaluate(ifAttribute.value, context, el)
        if (!evaluationResult) {
          unmount(el, options)
        } else {
          console.dir(el)
          parent.insertBefore(el, nextSibling)
          mount(el, {...options, context, isMount: true})
        }
      })
    }

    for (let i = 0; i < attributes.length; i++) {
      let attr = attributes[i];
      if (!attr.name.startsWith('mx') || attr.name === 'mx-if') {
        continue;
      }
      if (attr.name === 'mx-model') {
        const isCheckbox = ['checkbox', 'radio'].includes(el.type)
        const valueAttr = isCheckbox ? 'checked' : 'value'
        const eventAttr = isCheckbox ? 'change' : 'input'
        attr = {
          name: `mx-bind:${valueAttr}`,
          value: attr.value
        }
        attributes.push({
          name: `mx-on:${eventAttr}`,
          value: `function (ev) {${attr.value} = ev.target.${valueAttr}}`
        })
      }
      const [attrName, event, modifiers] = parseAttributeName(attr.name)
      if (directives[attrName]?.bind) {
        directives[attrName].bind(el, context, {
          attr,
          modifiers,
          event
        })
      }
    }
  }
  let childNodes = el.childNodes;
  let i = childNodes.length;
  while (i--) {
    mount(childNodes[i], {context, globalContext: options.globalContext});
  }
  el.removeAttribute?.('mx-cloak')
}
