import { isObject } from './utils'
const targetMap = new WeakMap<object, DepsMap>();
let activeEffect: ActiveEffect;


export function effect(eff: Function) {
  activeEffect = eff;
  activeEffect();
  activeEffect = null;
  return eff
}
export function cleanup (effect: ActiveEffect) {
  if (!effect?.deps) {
    return
  }
  effect.deps.forEach(dep => {
    dep.delete(effect)
  })
  effect.deps.clear()
}
export function track(target: Object, property: Property) {
  if (!activeEffect) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(property);
  if (!deps) {
    depsMap.set(property, (deps = new Set()));
  }
  deps.add(activeEffect);
  if (!activeEffect.deps) {
    activeEffect.deps = new Set()
  }
  activeEffect.deps.add(deps)
}
export function trigger(target: Object, property: Property, {oldValue, newValue}) {
  const deps = targetMap.get(target)?.get(property);
  if (!deps) {
    return;
  }
  deps.forEach((dep: Function) => dep(newValue, oldValue));
}
export function reactive(obj: Object) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      let result = Reflect.get(target, property, receiver);
      if(target.hasOwnProperty(property)) {
        track(target, property);
      }
      return result;
    },
    set(target, property, value, receiver) {
      if (target.hasOwnProperty(property)) {
        const oldValue = Reflect.get(target, property, receiver);
        Reflect.set(target, property, value, receiver);
        if (oldValue !== value) {
          trigger(target, property, {oldValue, newValue: value});
        }
      } else {
        Reflect.set(target, property, value, receiver);
      }
      return true;
    },
  });
}

export function computed (ctx, key, getter: Function) {
  effect(() => {
    ctx[key] = getter.bind(ctx)()
  })
  return ctx[key]
}

export const watch = (ctx, object) => {
  for(const prop in object) {
    let method = object[prop]
    if (isObject(object[prop])) {
      method = object[prop].handler
    }
    if (!method) {
      continue;
    }
    const bound = method.bind(ctx);
    activeEffect = bound
    track(ctx, prop)
    activeEffect = null
    if (isObject(object[prop]) && object[prop].immediate) {
      bound(ctx[prop])
    }
  }
}
