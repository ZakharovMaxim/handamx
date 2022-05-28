# handamx

## Usage

```html
<div id="app" mx-cloak>
    <header class="header">
      <h2 style="margin:5px">My To Do List</h2>
      <form mx-on:submit.prevent="add">
        <input mx-model="newTodoItemTitle" type="text" placeholder="Title...">
        <button class="addBtn" type="submit">Add</button>
      </form>
    </head>
    
    <ul>
      <li mx-for="item, index in items" mx-bind:class="{checked: item.checked}" mx-on:click="toggleCheckStatus(item)">
        <span mx-text="item.title + '_' + index"></span>
        <span mx-on:click.stop="setItemToDelete(item)">x</span>
      </li>
    </ul>
    <div mx-if="itemToDelete" class="popup" mx-on:click.self="closePopup"> 
      <div class="popup-content">
        <div class="popup-title">Delete item <span>{{itemToDelete.title}}</span>?</div>
        <button class="popup-action" mx-on:click="confirmDelete">Delete</button>
      </div>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
```
```js
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
```

### `mx-scope`

This is components alternative

First, register scope in the code
```js
import { addScope } from 'handamx'

addScope('popup', {
    state: () => ({isActive: false}),
    methods: {
            onToggle () {
                this.isActive = !this.isActive
                console.log(this.$global)
            }
        }
    }
})
```
Then use it within mx-scope attribute
```html
<div mx-scope="popup">
  <p>{{ isActive }}</p>
  <button @click="onToggle">Toogle active state</button>
</div>
```

### Attributes
- mx-for
- mx-if
- mx-show
- mx-bind
- mx-on
- mx-text
- mx-html
- mx-ref
