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
const scopes = {}
export function getScopes () {
  return scopes
}
export function addScope (name, schema) {
  scopes[name] = schema
  return scopes
}
export default function createApp(el, options: Schema) {
  const scope = createScope(options)
  mount(el, {
    contexts: [scope],
    globalContext: scope
  });
  return scope
}
