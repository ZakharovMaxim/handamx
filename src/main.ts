import { computed, reactive, watch } from './reactivity'
import{ mount } from './dom'
import classnames from './classnames'

declare global {
  interface Window { classnames: typeof classnames; }
}

window.classnames = classnames;

export function createScope(options:Schema) {
  const appSchema = {
    state: typeof options.state === 'function' ? options.state() : options.state || {},
    methods: options.methods || {},
    watch: options.watch || {},
    computed: options.computed || {},
  };
  const scope: Record<any, any> = reactive(appSchema.state)
  for(let computedKey in appSchema.computed) {
    computed(scope, computedKey, appSchema.computed[computedKey])
  }
  Object.keys(appSchema.methods).forEach(key => {
    scope[key] = appSchema.methods[key].bind(scope)
  })
  if (Object.keys(appSchema.watch).length) {
    watch(appSchema.state, appSchema.watch)
  } 
  scope.$refs = {}
  return scope
}
export const scopes = {
  inner: {
    state: () => ({
      counter: 1,
      toAdd: 2
    }),
    methods: {
      increment(this: any) {
        this.counter += +this.toAdd || 1;
      }
    },
  }
}
export default function createApp(el, options: Schema) {
  const scope = createScope(options)
  mount(el, {
    context: scope,
    globalContext: scope
  });
  return scope
}

// app usage

const state = {
  counter: 10,
  i: 0,
  toAdd: 1,
  styles: {
    border: '2px solid red'
  },
  
}
createApp(document.getElementById("app"), {
  state,
  methods: {
    increment(this: any) {
      this.counter += +this.toAdd || 1;
    }
  },
  computed: {
    counterX2 (this: any) {
      return this.counter * 2
    }
  }
});
