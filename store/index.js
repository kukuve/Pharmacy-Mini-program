// store/index.js 需要更新为 Vue3 语法
import { createStore } from 'vuex'
import user from './modules/user'
import cart from './modules/cart'
import order from './modules/order'

const store = createStore({
  modules: {
    user,
    cart,
    order
  }
})

export default store