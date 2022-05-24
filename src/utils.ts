import { cleanup } from './reactivity'
import { ATTR_KEY, IS_TEMP_KEY } from './consts'

export const internal = {
  elementEffects : new WeakMap(),
  removeElement (el) {
    const currentElementEffects: Set<ActiveEffect> = internal.elementEffects.get(el)
    if (currentElementEffects) {
      Array.from(currentElementEffects).forEach(effect => cleanup(effect))
      currentElementEffects.clear()
      internal.elementEffects.delete(el)
    }
  },
  addElementEffect(el, effect) {
    const elementEffectsSet = internal.elementEffects.get(el) || new Set()
    if (!internal.elementEffects.has(el)) {
      internal.elementEffects.set(el, elementEffectsSet)
    }
    elementEffectsSet.add(el, effect)
  }
}

function getEvalFn (context, expression: string) {
  let fnString = ''
  const contexts = Array.isArray(context) ? context : [context]
  const returnString = `return ${expression}`
  for(let i = 0; i < contexts.length; i++) {
    fnString += `with(contexts[${i}]) {\n`
    if (i === contexts.length - 1) {
      fnString += `
        ${returnString}
        ${'}'.repeat(context.length)}
      `
    }
  }
  return new Function("$data", "$el", `
    const contexts = Array.isArray($data) ? $data : [$data];
    ${fnString}
  `)
}

export function evaluate(expression: string, context: Object | Object[], el: HTMLElement) {
  try {
    const fn = getEvalFn(context, expression);
    return fn(context, el);
  } catch (e) {
    return expression;
  }
}

export function attrsTransform (value: any) {
  if (value === 'true') {
    return true
  } else if (value === 'false') {
    return false
  } else if (typeof value !== 'string') {
    return !!value
  } else {
    return value
  }

}

export function isObject(obj) {
  return !!(obj && typeof obj === 'object')
}

export function findTemplateStrings (el, onEntry) {
  const textValue = el.nodeValue ? el.nodeValue.trim() : ''
    let currentTemplateValue = textValue
    if (textValue.indexOf('{{') !== -1 && textValue.indexOf('}}') !== -1) {
      currentTemplateValue = '`' + currentTemplateValue.replace(/{{/g, '${').replace(/}}/g, '}') + '`'
      onEntry(currentTemplateValue)
    }
}

export function copyAttributes (el, attributes) {
  for(const attribute of attributes) {
    if (attribute.name.startsWith('mx-')) {
      el.removeAttribute?.(attribute.name)
    }
    el[ATTR_KEY].push(attribute)
  }
}

export function parseAttributeName (attr): ParsedAttribute {
  const splittedByName = attr.split(':')
  let attributeNameValue = null
  let attributeNameModifiers = []
  if (splittedByName[1]) {
    const splittedByModifiers = splittedByName[1].split('.')
    attributeNameValue = splittedByModifiers[0]
    attributeNameModifiers = splittedByModifiers.slice(1)
  }
  return [splittedByName[0], attributeNameValue, attributeNameModifiers]
}

export function createTempContext (payload = {}) {
  return {
    ...payload,
    [IS_TEMP_KEY]: true
  }
}
export function getCurrentContext (contexts) {
  return contexts.find(ctx => !ctx[IS_TEMP_KEY])
}

export function parseForAttr (attrValue) {
  const trimFn = v => v.trim()
  const parts = attrValue.split(' in ').map(trimFn)
  const args = parts[0]
  const value = parts[1]
  const splittedArgs = args.split(',').map(trimFn)
  return {
    value,
    args,
    valueKey: splittedArgs[0],
    iteratorKey: splittedArgs[1]
  }
}
