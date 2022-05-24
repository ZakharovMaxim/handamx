/// <reference types="vite/client" />
type Property = string | symbol
type Deps = Set<Function>
type DepsMap = Map<Property, Deps>
type ActiveEffect = Function & {
  deps?: Set<Deps>
} | null
type Ref = {
  value: any
}
type UnmountOptions = {keepNode?: Boolean, isMount?: Boolean }
type MountOptions = UnmountOptions & {contexts: any[], globalContext: any}

type Schema = {
  state?: object,
  methods?: object,
  computed?: object,
  [key: string]: any
}

type ParsedAttribute = [string, string | null, Array<string>]
