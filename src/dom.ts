import { internal, evaluate, copyAttributes, findTemplateStrings, parseAttributeName, getCurrentContext } from './utils'
import { effect } from './reactivity'
import directives from './directives'
import { getModelAttributes } from './model'
import { ATTR_KEY } from './consts'
import { createScope, getScopes } from '.'

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
  const attributesOrder = {'mx-for': 1}
  let attributes = [...(el[ATTR_KEY] || el.attributes || [])]
  attributes = attributes.sort((a, b) => {
    const aIndex = attributesOrder[a.name] || attributes.length
    const bIndex = attributesOrder[b.name] || attributes.length
    return aIndex - bIndex
  })
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
    copyAttributes(el, attributes)
  }
  let {contexts} = options
  for(let ctx of contexts) {
    ctx.$global = options.globalContext
  }
  if (attributes?.length) {
    const scopeAttribute = attributes.find(attr => attr.name === 'mx-scope')
    const scopes = getScopes()
    if (scopeAttribute && scopes[scopeAttribute.value]) {
      const newContext = createScope(scopes[scopeAttribute.value])
      newContext.$parent = getCurrentContext(contexts)
      contexts = [newContext, ...contexts]
    }
    const forAttribute = attributes.find(attr => attr.name === 'mx-for')
    for (let i = 0; i < attributes.length; i++) {
      let attr = attributes[i];
      const attrsToIgnore = ['mx-if', 'mx-scope']
      if (!attr.name.startsWith('mx') || attrsToIgnore.includes(attr.name)) {
        continue;
      }
      if (attr.name === 'mx-model') {
        const [modelAttr, modelEventAttr] = getModelAttributes(el, attr)
        attr = modelAttr
        attributes.push(modelEventAttr)
      }
      const [attrName, event, modifiers] = parseAttributeName(attr.name)
      if (directives[attrName]?.bind) {
          directives[attrName].bind(el, {
          contexts,
          attr,
          modifiers,
          event,
          saveEffect: attrName !== 'mx-for'
        })
      }
      if (forAttribute) {
        break;
      }
    }
    const ifAttribute = attributes.find(attr => attr.name === 'mx-if')
    if (ifAttribute && !options.isMount) {
      const parent = el.parentNode
      const nextSibling = el.nextSibling
      effect(() => {
        const evaluationResult = evaluate(ifAttribute.value, contexts, el)
        if (!evaluationResult) {
          unmount(el, options)
        } else {
          parent.insertBefore(el, nextSibling)
          mount(el, {...options, contexts, isMount: true})
        }
      })
    }
    if (forAttribute) {
      return;
    }
  }
  let childNodes = el.childNodes;
  let i = childNodes.length;
  while (i--) {
    mount(childNodes[i], {contexts, globalContext: options.globalContext});
  }
  el.removeAttribute?.('mx-cloak')
}
