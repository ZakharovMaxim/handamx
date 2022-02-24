const targetMap = new WeakMap();
export type activeEffect = Function & {
  deps?: Set<Map<Object, Array<any>>>
} | null
let activeEffect: activeEffect;

export function effect(eff: Function) {
  activeEffect = eff;
  activeEffect();
  activeEffect = null;
  return eff
}
export function cleanup (effect: activeEffect) {
  if (!effect || !effect.deps) {
    return
  }
  effect.deps.forEach(dep => {
    dep.delete(effect)
  })
  effect.deps.clear()
}
export function track(target: Object, property: string) {
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
export function trigger(target: Object, property: string) {
  const deps = targetMap.get(target)?.get(property);
  if (!deps) {
    return;
  }
  deps.forEach((dep: Function) => dep());
}

export function reactive(obj: Object) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      let result = Reflect.get(target, property, receiver);
      track(target, property);
      return result;
    },
    set(target, property, value, receiver) {
      const oldValue = Reflect.get(target, property, receiver);
      const newValue = Reflect.set(target, property, value, receiver);
      if (oldValue !== newValue) {
        trigger(target, property);
      }
      return newValue;
    },
  });
}

export function ref(initialValue?: any) {
  if (initialValue && typeof initialValue === "object") {
    throw new Error("Ref value should be a primitive");
  }
  const r = {
    get value() {
      track(r, "value");
      return initialValue;
    },
    set value(v) {
      initialValue = v;
      trigger(r, "value");
    },
  };
  return r;
}
export function computed (getter: Function) {
  const result = ref()
  effect(() => {
    result.value = getter()
  })
  return result
}
