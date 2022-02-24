import { reactive, effect, cleanup, activeEffect } from './reactivity'

console.log('test')
const regexp = /\{\{([^{]+?)\}\}/gi;

function createApp(el, options) {
  const app = {
    state: reactive(options.state),
    methods: options.methods,
  };
  mount(el, app);
  return app;
}
function getEvalFn (expression: string) {
  try {
    const fn = new Function(
      "$data",
      "$el",
      `with($data) {
        return ${expression}
      }`)
    return fn
  } catch (e) {
    return () => {}
  }
}
function evaluate(fn: Function, context: Object, el: HTMLElement) {
  try {
    return fn(context, el);
  } catch (e) {
    console.warn(e)
    return null;
  }
}
function attrsTransform (value: any) {
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
type Options = {keepNode?: Boolean, isMount?: Boolean}
const elementEffects = new WeakMap()
function mount(el, context, options : Options = {}) {
    const currentElementEffects = new Set()
    elementEffects.delete(el)
    elementEffects.set(el, currentElementEffects)
    const parent = el.parentNode
    let currentElEffect
    if (el.nodeValue && regexp.test(el.nodeValue)) {
      const originalString = el.nodeValue;

      const currentEl = el.nodeType === 3 ? parent : el;
      currentElEffect = effect(() => {
        el.nodeValue = originalString.replace(
          regexp,
          (_, expression, _index, originalString) => {
            if (
              expression.indexOf("}}") !== -1 ||
              expression.indexOf("{{") !== -1
            ) {
              return originalString;
            }
            return evaluate(getEvalFn(expression), context.state, currentEl);
          }
        );
      });
      currentElementEffects.add(currentElEffect)
    }
    if (el.attributes?.length) {
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        const evaluateFn = getEvalFn(attr.value)
        const evaluateBind = evaluate.bind(el, evaluateFn, context.state, el)
        if (attr.name.startsWith("mx-on")) {
          el.addEventListener(
            attr.name.split(":")[1],
            context.methods[attr.value].bind(context)
          );
        }
        if (attr.name.startsWith("mx-text")) {
          currentElEffect = effect(() => {
            const evaluationResult = evaluateBind()
            if (evaluationResult !== null) {
              el.textContent = evaluationResult
            }
          })
          currentElementEffects.add(currentElEffect)
        }
        if (attr.name.startsWith("mx-html")) {
          currentElEffect = effect(() => {
            const evaluationResult = evaluateBind()
            if (evaluationResult !== null) {
              el.innerHTML = evaluationResult
            }
          })
          currentElementEffects.add(currentElEffect)
        }
        
        if (attr.name.startsWith("mx-show")) {
          currentElEffect = effect(() => {
            const evaluationResult = evaluateBind()
            el.style.display = evaluationResult ? '' : 'none'
          })
          currentElementEffects.add(currentElEffect)
        }
        if (attr.name.startsWith('mx-model')) {
          el.addEventListener('input', ev => {
            const fn = getEvalFn(`${attr.value} = "${ev.target.value}"`)
            fn(context.state, el)
          })
        }
        if (attr.name.startsWith("mx-bind") || attr.name.startsWith('mx-model')) {
          const isModel = attr.name.startsWith('mx-model')
          const attrToBindName = isModel ? 'value' : attr.name.split(':')[1]
          let value = attr.value
          if (attrToBindName === 'class') {
            value = `classnames(${attr.value}`
            if (el.getAttribute('class')) {
              value += `, ${el.getAttribute('class').split(' ').map(cl => `"${cl}"`).join(', ')}`
            }
            value += ')'
          } else if (attrToBindName === 'value') {
            value = String(value)
          }
          const evaluateFn = getEvalFn(value)
          const evaluateBind = evaluate.bind(el, evaluateFn, context.state, el)
          currentElEffect = effect(() => {
            let evaluationResult = evaluateBind()
            if (attrToBindName === 'style') {
              Object.entries(evaluationResult).forEach(([key, value]) => {
                el.style[key] = value
              })
            } else if (attrToBindName === 'class') {
              el.className = evaluationResult
            } else {
              if (attrToBindName === 'value') {
                evaluationResult = String(evaluationResult)
              }
              const attrValue = attrsTransform(evaluationResult)
              if (attrValue === false) {
                el.removeAttribute(attrToBindName)
              } else {
                el.setAttribute(attrToBindName, attrValue)
              }
            }
          })
          currentElementEffects.add(currentElEffect)
        }
        if (attr.name.startsWith("mx-if") && !options?.isMount) {
          effect(() => {
            const evaluationResult = evaluateBind()
            if (evaluationResult) {
              parent.append(el)
              mount(el, context, {isMount: true})
            } else if (!evaluationResult) {
              unmount(el)
            }
          })
        }
      }
    }
    el.removeAttribute?.('mx-cloak')
    let childNodes = el.childNodes;
    let i = childNodes.length;
    while (i--) {
      mount(childNodes[i], context);
    }
}
function unmount (el, options: Options = {}) {
  const currentElementEffects: Set<activeEffect> = elementEffects.get(el)
  if (currentElementEffects) {
    Array.from(currentElementEffects).forEach(effect => cleanup(effect))
    currentElementEffects.clear()
    elementEffects.delete(el)
  }
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
// app usage

const state = {
  counter: 0,
    i: 0,
    toAdd: 1
}
createApp(document.getElementById("app"), {
  state,
  methods: {
    increment(this: {state}) {
      this.state.counter += this.state.toAdd;
    },
  },
});

