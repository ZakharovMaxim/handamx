import createApp from '.';

const STORAGE_KEY = 'todos'
function getInitialData () {
  const itemsInLs = localStorage.getItem(STORAGE_KEY)
  if (itemsInLs) {
    try {
      const parsed = JSON.parse(itemsInLs)
      if (Array.isArray(parsed)) {
        return parsed
      }
      throw new Error('Invalid storage value')
    } catch {
      return []
    }
  }
  return []
}
createApp(document.getElementById("app"), {
  state: {
    items: getInitialData(),
    newTodoItemTitle: '',
    itemToDelete: null
  },
  watch: {
    items () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
    }
  },
  methods: {
    add () {
      if (this.newTodoItemTitle) {
        this.items = [{
          id: this.items.length,
          title: this.newTodoItemTitle,
          checked: false
        }, ...this.items]
        this.newTodoItemTitle = ''
      }
    },
    setItemToDelete (item) {
      this.itemToDelete = item
    },
    toggleCheckStatus (item) {
      this.items = this.items.map(i => {
        return i === item ? ({
          ...i,
          checked: !i.checked
        }) : i
      })
    },
    closePopup () {
      this.itemToDelete = null
    },
    confirmDelete () {
      if (!this.itemToDelete) {
        return
      }
      this.items = this.items.filter(item => item !== this.itemToDelete)
      this.itemToDelete = null
    }
  }
});
