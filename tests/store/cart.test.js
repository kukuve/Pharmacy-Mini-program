/**
 * Unit tests for store/modules/cart.js
 * Tests CRUD operations, selection logic, getters, and cloud sync
 */

describe('Cart Store Module', () => {
  let cartModule

  beforeAll(() => {
    cartModule = require('../../store/modules/cart.js').default
  })

  beforeEach(() => {
    resetMocks()
  })

  describe('state', () => {
    it('should have correct initial state', () => {
      expect(cartModule.state).toBeDefined()
      expect(cartModule.state).toHaveProperty('cartItems', [])
      expect(cartModule.state).toHaveProperty('selectedAll', true)
      expect(cartModule.state).toHaveProperty('loading', false)
      expect(cartModule.state).toHaveProperty('error', null)
    })

    it('should be namespaced', () => {
      expect(cartModule.namespaced).toBe(true)
    })
  })

  describe('mutations', () => {
    let state

    beforeEach(() => {
      state = {
        cartItems: [],
        selectedAll: true,
        loading: false,
        error: null
      }
    })

    it('SET_CART_ITEMS should replace cart items', () => {
      const items = [
        { _id: 'c1', productId: 'p1', name: 'Aspirin', price: 10, quantity: 2, selected: true }
      ]
      cartModule.mutations.SET_CART_ITEMS(state, items)
      expect(state.cartItems).toEqual(items)
    })

    it('ADD_TO_CART should add new product to cart', () => {
      const product = { _id: 'c1', productId: 'p1', name: 'Aspirin', price: 10, quantity: 1 }
      cartModule.mutations.ADD_TO_CART(state, product)
      expect(state.cartItems).toHaveLength(1)
      expect(state.cartItems[0].selected).toBe(true)
      expect(state.cartItems[0].quantity).toBe(1)
    })

    it('ADD_TO_CART should increment quantity for existing product', () => {
      state.cartItems = [
        { _id: 'c1', productId: 'p1', name: 'Aspirin', price: 10, quantity: 2, selected: true }
      ]
      cartModule.mutations.ADD_TO_CART(state, { productId: 'p1', quantity: 3 })
      expect(state.cartItems[0].quantity).toBe(5)
    })

    it('UPDATE_CART_ITEM_QUANTITY should update quantity at index', () => {
      state.cartItems = [
        { _id: 'c1', productId: 'p1', quantity: 1 }
      ]
      cartModule.mutations.UPDATE_CART_ITEM_QUANTITY(state, { index: 0, quantity: 5 })
      expect(state.cartItems[0].quantity).toBe(5)
    })

    it('UPDATE_CART_ITEM_QUANTITY should ignore invalid index', () => {
      state.cartItems = [{ _id: 'c1', productId: 'p1', quantity: 1 }]
      cartModule.mutations.UPDATE_CART_ITEM_QUANTITY(state, { index: -1, quantity: 5 })
      expect(state.cartItems[0].quantity).toBe(1)

      cartModule.mutations.UPDATE_CART_ITEM_QUANTITY(state, { index: 5, quantity: 5 })
      expect(state.cartItems[0].quantity).toBe(1)
    })

    it('REMOVE_FROM_CART should remove item at index', () => {
      state.cartItems = [
        { _id: 'c1', productId: 'p1' },
        { _id: 'c2', productId: 'p2' }
      ]
      cartModule.mutations.REMOVE_FROM_CART(state, 0)
      expect(state.cartItems).toHaveLength(1)
      expect(state.cartItems[0]._id).toBe('c2')
    })

    it('CLEAR_CART should empty cart and reset selection', () => {
      state.cartItems = [
        { _id: 'c1', productId: 'p1', selected: true }
      ]
      state.selectedAll = false
      cartModule.mutations.CLEAR_CART(state)
      expect(state.cartItems).toEqual([])
      expect(state.selectedAll).toBe(true)
    })

    it('TOGGLE_CART_ITEM_SELECTED should toggle selection and update selectedAll', () => {
      state.cartItems = [
        { _id: 'c1', productId: 'p1', selected: true },
        { _id: 'c2', productId: 'p2', selected: true }
      ]
      cartModule.mutations.TOGGLE_CART_ITEM_SELECTED(state, 0)
      expect(state.cartItems[0].selected).toBe(false)
      expect(state.selectedAll).toBe(false)
    })

    it('TOGGLE_CART_ITEM_SELECTED should set selectedAll to true when all selected', () => {
      state.cartItems = [
        { _id: 'c1', productId: 'p1', selected: false },
        { _id: 'c2', productId: 'p2', selected: true }
      ]
      state.selectedAll = false
      cartModule.mutations.TOGGLE_CART_ITEM_SELECTED(state, 0)
      expect(state.cartItems[0].selected).toBe(true)
      expect(state.selectedAll).toBe(true)
    })

    it('TOGGLE_SELECT_ALL should toggle all items', () => {
      state.cartItems = [
        { _id: 'c1', selected: true },
        { _id: 'c2', selected: true }
      ]
      cartModule.mutations.TOGGLE_SELECT_ALL(state)
      expect(state.selectedAll).toBe(false)
      state.cartItems.forEach(item => {
        expect(item.selected).toBe(false)
      })
    })

    it('SET_LOADING should update loading state', () => {
      cartModule.mutations.SET_LOADING(state, true)
      expect(state.loading).toBe(true)
      cartModule.mutations.SET_LOADING(state, false)
      expect(state.loading).toBe(false)
    })

    it('SET_ERROR should update error state', () => {
      cartModule.mutations.SET_ERROR(state, 'Something went wrong')
      expect(state.error).toBe('Something went wrong')
      cartModule.mutations.SET_ERROR(state, null)
      expect(state.error).toBe(null)
    })
  })

  describe('getters', () => {
    it('cartItemCount should sum all quantities', () => {
      const state = {
        cartItems: [
          { quantity: 2 },
          { quantity: 3 },
          { quantity: 1 }
        ]
      }
      expect(cartModule.getters.cartItemCount(state)).toBe(6)
    })

    it('cartItemCount should return 0 for empty cart', () => {
      const state = { cartItems: [] }
      expect(cartModule.getters.cartItemCount(state)).toBe(0)
    })

    it('selectedItemCount should only count selected items', () => {
      const state = {
        cartItems: [
          { quantity: 2, selected: true },
          { quantity: 3, selected: false },
          { quantity: 1, selected: true }
        ]
      }
      expect(cartModule.getters.selectedItemCount(state)).toBe(3)
    })

    it('selectedItemsTotal should calculate total price of selected items', () => {
      const state = {
        cartItems: [
          { price: 10, quantity: 2, selected: true },
          { price: 20, quantity: 1, selected: false },
          { price: 5, quantity: 3, selected: true }
        ]
      }
      expect(cartModule.getters.selectedItemsTotal(state)).toBe(35) // 10*2 + 5*3
    })

    it('selectedItems should return only selected items', () => {
      const state = {
        cartItems: [
          { _id: 'c1', selected: true },
          { _id: 'c2', selected: false },
          { _id: 'c3', selected: true }
        ]
      }
      const result = cartModule.getters.selectedItems(state)
      expect(result).toHaveLength(2)
      expect(result[0]._id).toBe('c1')
      expect(result[1]._id).toBe('c3')
    })

    it('hasSelectedItems should return true when at least one selected', () => {
      const state = {
        cartItems: [
          { selected: false },
          { selected: true }
        ]
      }
      expect(cartModule.getters.hasSelectedItems(state)).toBe(true)
    })

    it('hasSelectedItems should return false when none selected', () => {
      const state = {
        cartItems: [
          { selected: false },
          { selected: false }
        ]
      }
      expect(cartModule.getters.hasSelectedItems(state)).toBe(false)
    })

    it('isLoading should return loading state', () => {
      expect(cartModule.getters.isLoading({ loading: true })).toBe(true)
      expect(cartModule.getters.isLoading({ loading: false })).toBe(false)
    })

    it('error should return error state', () => {
      expect(cartModule.getters.error({ error: 'Oops' })).toBe('Oops')
      expect(cartModule.getters.error({ error: null })).toBe(null)
    })
  })

  describe('actions', () => {
    it('fetchCart should call manageCart cloud function', async () => {
      wx.cloud.callFunction.mockResolvedValue({
        result: {
          success: true,
          data: {
            items: [
              { _id: 'c1', productId: 'p1', selected: true },
              { _id: 'c2', productId: 'p2', selected: true }
            ]
          }
        }
      })

      const commit = jest.fn()
      await cartModule.actions.fetchCart({ commit })

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'list' }
      })
      expect(commit).toHaveBeenCalledWith('SET_LOADING', true)
      expect(commit).toHaveBeenCalledWith('SET_ERROR', null)
      expect(commit).toHaveBeenCalledWith('SET_CART_ITEMS', expect.any(Array))
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })

    it('fetchCart should handle errors', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Cart fetch failed'))

      const commit = jest.fn()
      await cartModule.actions.fetchCart({ commit })

      expect(commit).toHaveBeenCalledWith('SET_ERROR', 'Cart fetch failed')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })

    it('addToCart should call manageCart with add action', () => {
      const dispatch = jest.fn()
      cartModule.actions.addToCart({ commit: jest.fn(), dispatch }, { productId: 'p1', quantity: 3 })
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'add', productId: 'p1', quantity: 3 }
      })
    })

    it('addToCart should default quantity to 1', () => {
      const dispatch = jest.fn()
      cartModule.actions.addToCart({ commit: jest.fn(), dispatch }, { productId: 'p1' })
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'add', productId: 'p1', quantity: 1 }
      })
    })

    it('updateCartItemQuantity should call manageCart with update action', () => {
      const dispatch = jest.fn()
      cartModule.actions.updateCartItemQuantity(
        { commit: jest.fn(), dispatch },
        { productId: 'p1', quantity: 10 }
      )
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'update', productId: 'p1', quantity: 10 }
      })
    })

    it('removeFromCart should call manageCart with remove action', () => {
      const dispatch = jest.fn()
      cartModule.actions.removeFromCart({ commit: jest.fn(), dispatch }, 'p1')
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'remove', productId: 'p1' }
      })
    })

    it('clearCart should call manageCart and clear state', async () => {
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })
      const commit = jest.fn()
      await cartModule.actions.clearCart({ commit })
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'clear' }
      })
      expect(commit).toHaveBeenCalledWith('CLEAR_CART')
    })

    it('clearCart should handle errors gracefully', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Clear failed'))
      const commit = jest.fn()
      await cartModule.actions.clearCart({ commit })
      // Should not throw, error is caught
      expect(commit).not.toHaveBeenCalledWith('CLEAR_CART')
    })

    it('toggleCartItemSelected should commit toggle mutation', () => {
      const commit = jest.fn()
      cartModule.actions.toggleCartItemSelected({ commit }, 2)
      expect(commit).toHaveBeenCalledWith('TOGGLE_CART_ITEM_SELECTED', 2)
    })

    it('toggleSelectAll should commit toggle all mutation', () => {
      const commit = jest.fn()
      cartModule.actions.toggleSelectAll({ commit })
      expect(commit).toHaveBeenCalledWith('TOGGLE_SELECT_ALL')
    })

    it('removeSelectedItems should remove all selected items', () => {
      const state = {
        cartItems: [
          { _id: 'c1', productId: 'p1', selected: true },
          { _id: 'c2', productId: 'p2', selected: false },
          { _id: 'c3', productId: 'p3', selected: true }
        ]
      }
      const dispatch = jest.fn()
      cartModule.actions.removeSelectedItems({ state, dispatch })

      expect(wx.cloud.callFunction).toHaveBeenCalledTimes(2)
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'remove', productId: 'p1' }
      })
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'remove', productId: 'p3' }
      })
    })
  })
})
