const state = {
  cartItems: [],
  selectedAll: true,
  loading: false,
  error: null
}

const mutations = {
  SET_CART_ITEMS(state, items) {
    state.cartItems = items
  },

  ADD_TO_CART(state, product) {
    const existItem = state.cartItems.find(item =>
      item._id === product._id || item.productId === product.productId
    )
    if (existItem) {
      existItem.quantity += product.quantity || 1
    } else {
      state.cartItems.push({
        ...product,
        selected: true,
        quantity: product.quantity || 1
      })
    }
  },

  UPDATE_CART_ITEM_QUANTITY(state, { index, quantity }) {
    if (index >= 0 && index < state.cartItems.length) {
      state.cartItems[index].quantity = quantity
    }
  },

  REMOVE_FROM_CART(state, index) {
    if (index >= 0 && index < state.cartItems.length) {
      state.cartItems.splice(index, 1)
    }
  },

  CLEAR_CART(state) {
    state.cartItems = []
    state.selectedAll = true
  },

  TOGGLE_CART_ITEM_SELECTED(state, index) {
    if (index >= 0 && index < state.cartItems.length) {
      state.cartItems[index].selected = !state.cartItems[index].selected
      state.selectedAll = state.cartItems.every(item => item.selected)
    }
  },

  TOGGLE_SELECT_ALL(state) {
    state.selectedAll = !state.selectedAll
    state.cartItems.forEach(item => {
      item.selected = state.selectedAll
    })
  },

  SET_LOADING(state, loading) {
    state.loading = loading
  },

  SET_ERROR(state, error) {
    state.error = error
  }
}

const actions = {
  async fetchCart({ commit }) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    try {
      const res = await wx.cloud.callFunction({
        name: 'manageCart',
        data: { action: 'list' }
      })
      if (res.result && res.result.success) {
        const items = res.result.data.items || []
        commit('SET_CART_ITEMS', items)
        state.selectedAll = items.length > 0 && items.every(item => item.selected)
      }
    } catch (err) {
      commit('SET_ERROR', err.message)
      console.error('Failed to fetch cart:', err)
    } finally {
      commit('SET_LOADING', false)
    }
  },

  addToCart({ commit, dispatch }, { productId, quantity = 1 }) {
    wx.cloud.callFunction({
      name: 'manageCart',
      data: { action: 'add', productId, quantity }
    }).then(() => dispatch('fetchCart'))
  },

  updateCartItemQuantity({ commit, dispatch }, { productId, quantity }) {
    wx.cloud.callFunction({
      name: 'manageCart',
      data: { action: 'update', productId, quantity }
    }).then(() => dispatch('fetchCart'))
  },

  removeFromCart({ commit, dispatch }, productId) {
    wx.cloud.callFunction({
      name: 'manageCart',
      data: { action: 'remove', productId }
    }).then(() => dispatch('fetchCart'))
  },

  async clearCart({ commit }) {
    try {
      await wx.cloud.callFunction({
        name: 'manageCart',
        data: { action: 'clear' }
      })
      commit('CLEAR_CART')
    } catch (err) {
      console.error('Failed to clear cart:', err)
    }
  },

  toggleCartItemSelected({ commit }, index) {
    commit('TOGGLE_CART_ITEM_SELECTED', index)
  },

  toggleSelectAll({ commit }) {
    commit('TOGGLE_SELECT_ALL')
  },

  removeSelectedItems({ state, dispatch }) {
    const selected = state.cartItems.filter(item => item.selected)
    for (const item of selected) {
      wx.cloud.callFunction({
        name: 'manageCart',
        data: { action: 'remove', productId: item.productId }
      })
    }
    dispatch('fetchCart')
  }
}

const getters = {
  cartItemCount: state => {
    return state.cartItems.reduce((total, item) => total + (item.quantity || 0), 0)
  },
  selectedItemCount: state => {
    return state.cartItems
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.quantity || 0), 0)
  },
  selectedItemsTotal: state => {
    return state.cartItems
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0)
  },
  selectedItems: state => {
    return state.cartItems.filter(item => item.selected)
  },
  hasSelectedItems: state => {
    return state.cartItems.some(item => item.selected)
  },
  isLoading: state => state.loading,
  error: state => state.error
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}