import { cleanup } from './reactivity'

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
export const ATTR_KEY = Symbol.for('attributes');
function getEvalFn (expression: string) {
  return new Function(
    "$data",
    "$el",
    `with($data) {
      return ${expression}
    }`)
}

export function evaluate(expression: string, context: Object, el: HTMLElement) {
  try {
    const fn = getEvalFn(expression);
    return fn(context, el);
  } catch (e) {
    console.warn(e)
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

export function copyCustomAttributes (el, attributes) {
  for(const attribute of attributes) {
    if (attribute.name.startsWith('mx-')) {
      el.removeAttribute?.(attribute.name)
      el[ATTR_KEY].push(attribute)
    }
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
