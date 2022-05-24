export function getModelAttributes (el, attr) {
  const isCheckbox = ['checkbox', 'radio'].includes(el.type)
  const valueAttr = isCheckbox ? 'checked' : 'value'
  const eventAttr = isCheckbox ? 'change' : 'input'
  return [{
    name: `mx-bind:${valueAttr}`,
    value: attr.value
  }, {
    name: `mx-on:${eventAttr}`,
    value: `function (ev) {${attr.value} = ev.target.${valueAttr}}`
  }]
}
