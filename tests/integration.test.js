/**
 * Integration Tests
 * Tests interaction between store modules, API layer, and simulated cloud functions.
 * These tests validate complete business flows end-to-end in a mock environment.
 */

// Import store modules
const userModule = require('../store/modules/user.js').default
const cartModule = require('../store/modules/cart.js').default
const orderModule = require('../store/modules/order.js').default
const cloudHelper = require('../utils/cloudHelper.js')

// Helper: create a context for a specific module with proper commit routing
function createUserContext(stateOverride = {}) {
  const state = { ...userModule.state, ...stateOverride }
  const commit = jest.fn((mutation, payload) => {
    if (userModule.mutations[mutation]) {
      userModule.mutations[mutation](state, payload)
    }
  })
  const dispatch = jest.fn((action, payload) => {
    // Handle dispatch to self or other modules
    if (action === 'login') return userModule.actions.login({ commit, dispatch, state })
    if (action === 'getUserInfo') return userModule.actions.getUserInfo({ commit, dispatch, state })
    return Promise.resolve(true)
  })
  return { state, commit, dispatch }
}

function createCartContext(stateOverride = {}) {
  const state = { ...cartModule.state, ...stateOverride }
  const commit = jest.fn((mutation, payload) => {
    if (cartModule.mutations[mutation]) {
      cartModule.mutations[mutation](state, payload)
    }
  })
  const dispatch = jest.fn((action, payload) => {
    if (action === 'fetchCart') return cartModule.actions.fetchCart({ commit, dispatch, state })
    return Promise.resolve(true)
  })
  return { state, commit, dispatch }
}

function createOrderContext(stateOverride = {}) {
  const state = { ...orderModule.state, ...stateOverride }
  const commit = jest.fn((mutation, payload) => {
    if (orderModule.mutations[mutation]) {
      orderModule.mutations[mutation](state, payload)
    }
  })
  const dispatch = jest.fn()
  return { state, commit, dispatch }
}

// Combined context for cross-module tests that need cart + order state
function createCombinedContext() {
  const userState = { ...userModule.state }
  const cartState = { ...cartModule.state }
  const orderState = { ...orderModule.state }

  const commitUser = jest.fn((mutation, payload) => {
    if (userModule.mutations[mutation]) userModule.mutations[mutation](userState, payload)
  })
  const commitCart = jest.fn((mutation, payload) => {
    if (cartModule.mutations[mutation]) cartModule.mutations[mutation](cartState, payload)
  })
  const commitOrder = jest.fn((mutation, payload) => {
    if (orderModule.mutations[mutation]) orderModule.mutations[mutation](orderState, payload)
  })

  return {
    userState, cartState, orderState,
    userCtx: { state: userState, commit: commitUser, dispatch: jest.fn() },
    cartCtx: { state: cartState, commit: commitCart, dispatch: jest.fn() },
    orderCtx: { state: orderState, commit: commitOrder, dispatch: jest.fn() }
  }
}

describe('Integration Tests', () => {
  beforeEach(() => {
    resetMocks()
  })

  // ============================================================
  // Auth Flow Integration Tests
  // ============================================================
  describe('Authentication Flow', () => {
    it('should complete full login → getUserInfo → updateUserInfo → logout cycle', async () => {
      const ctx = createUserContext()

      // Step 1: Login
      uni.login.mockResolvedValue({ code: 'auth_code_123' })
      wx.cloud.callFunction.mockResolvedValue({
        result: { openid: 'openid-456', session_key: 'sk-789' }
      })

      const loginResult = await userModule.actions.login(ctx)
      expect(loginResult).toBe(true)
      expect(ctx.state.isLogin).toBe(true)
      expect(ctx.state.openid).toBe('openid-456')

      // Step 2: Get user info
      uni.getSetting.mockResolvedValue({ authSetting: { 'scope.userInfo': true } })
      uni.getUserInfo.mockResolvedValue({
        userInfo: { nickName: 'TestUser', avatarUrl: '/avatar.png' }
      })

      const userInfoResult = await userModule.actions.getUserInfo(ctx)
      expect(userInfoResult).toBe(true)
      expect(ctx.state.userInfo.nickName).toBe('TestUser')

      // Step 3: Update user info
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const updateResult = await userModule.actions.updateUserInfo(ctx, {
        nickName: 'UpdatedName'
      })
      expect(updateResult).toBe(true)
      expect(ctx.state.userInfo.nickName).toBe('UpdatedName')

      // Step 4: Check login status
      uni.getStorageSync
        .mockReturnValueOnce('openid-456')
        .mockReturnValueOnce({ nickName: 'UpdatedName' })
        .mockReturnValueOnce('sk-789')

      const checkResult = await userModule.actions.checkLoginStatus(ctx)
      expect(checkResult).toBe(true)

      // Step 5: Logout
      userModule.actions.logout(ctx)
      expect(ctx.state.isLogin).toBe(false)
      expect(ctx.state.openid).toBe('')
      expect(ctx.state.userInfo).toBe(null)
    })

    it('should handle login failure gracefully', async () => {
      const ctx = createUserContext()

      // Simulate failed login
      uni.login.mockResolvedValue({ code: 'bad_code' })
      wx.cloud.callFunction.mockResolvedValue({
        result: { error: 'Auth failed' }
      })

      const loginResult = await userModule.actions.login(ctx)
      expect(loginResult).toBe(false)
      expect(ctx.state.isLogin).toBe(false)
    })
  })

  // ============================================================
  // Shopping Flow Integration Tests
  // ============================================================
  describe('Shopping Flow', () => {
    it('should complete browse → add to cart → modify → checkout cycle', async () => {
      const ctx = createCartContext()

      // Step 1: Browse products (simulated API call)
      wx.cloud.callFunction.mockResolvedValue({
        result: {
          success: true,
          data: {
            products: [
              { _id: 'p1', name: 'Aspirin', price: 10, stock: 100 },
              { _id: 'p2', name: 'Vitamin C', price: 25, stock: 50 }
            ],
            total: 2
          }
        }
      })

      const browseResult = await cloudHelper.productApi.getProducts({ page: 1, pageSize: 10 })
      expect(browseResult.success).toBe(true)
      expect(browseResult.data.products).toHaveLength(2)

      // Step 2: Add products to cart
      wx.cloud.callFunction.mockImplementation(({ data }) => {
        if (data.action === 'add') {
          return Promise.resolve({ result: { success: true, data: { _id: 'cart_item_1' } } })
        }
        if (data.action === 'list') {
          return Promise.resolve({
            result: {
              success: true,
              data: {
                items: [
                  { _id: 'c1', productId: 'p1', name: 'Aspirin', price: 10, quantity: 2, selected: true },
                  { _id: 'c2', productId: 'p2', name: 'Vitamin C', price: 25, quantity: 1, selected: true }
                ]
              }
            }
          })
        }
        if (data.action === 'update') {
          return Promise.resolve({ result: { success: true } })
        }
        return Promise.resolve({ result: { success: true } })
      })

      // Add first product
      const addResult1 = await cloudHelper.cartApi.addToCart('p1', 2)
      expect(addResult1.success).toBe(true)

      // Add second product
      const addResult2 = await cloudHelper.cartApi.addToCart('p2', 1)
      expect(addResult2.success).toBe(true)

      // Fetch cart (simulates page load after adding)
      await cartModule.actions.fetchCart(ctx)
      expect(ctx.state.cartItems).toHaveLength(2)
      expect(ctx.state.cartItems[0].name).toBe('Aspirin')
      expect(ctx.state.selectedAll).toBe(true)

      // Step 3: Modify cart - update quantity
      await cartModule.actions.updateCartItemQuantity(ctx, { productId: 'p1', quantity: 3 })
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'update', productId: 'p1', quantity: 3 }
      })

      // Step 4: Verify cart getters
      const cartItemCount = cartModule.getters.cartItemCount(ctx.state)
      expect(cartItemCount).toBe(3) // 2 + 1

      const totalPrice = cartModule.getters.selectedItemsTotal(ctx.state)
      expect(totalPrice).toBe(45) // 10*2 + 25*1

      // Step 5: Toggle selection
      cartModule.mutations.TOGGLE_CART_ITEM_SELECTED(ctx.state, 1)
      expect(ctx.state.cartItems[1].selected).toBe(false)
      expect(ctx.state.selectedAll).toBe(false)
    })

    it('should handle empty cart state correctly', () => {
      const ctx = createCartContext()
      const cartCount = cartModule.getters.cartItemCount(ctx.state)
      const selectedCount = cartModule.getters.selectedItemCount(ctx.state)
      const total = cartModule.getters.selectedItemsTotal(ctx.state)
      const hasSelected = cartModule.getters.hasSelectedItems(ctx.state)

      expect(cartCount).toBe(0)
      expect(selectedCount).toBe(0)
      expect(total).toBe(0)
      expect(hasSelected).toBe(false)
    })
  })

  // ============================================================
  // Order Flow Integration Tests
  // ============================================================
  describe('Order Flow', () => {
    it('should complete pay → ship → confirm receive lifecycle', async () => {
      // Start with order already created (pre-set state)
      const ctx = createOrderContext({
        currentOrder: {
          _id: 'order_1',
          orderNo: 'ORD20240501001',
          payAmount: 45,
          status: 'unpaid'
        }
      })

      // Verify initial state
      expect(ctx.state.currentOrder.status).toBe('unpaid')

      // Step 1: Pay order
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: { transactionId: 'txn_pay_001' } }
      })

      const payResult = await orderModule.actions.payOrder(ctx, {
        orderId: 'order_1',
        payment: { method: 'wechat' }
      })
      expect(payResult).toBe(true)
      expect(ctx.state.currentOrder.status).toBe('unshipped')

      // Step 2: Simulate shipping
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })
      const updateResult = await cloudHelper.orderApi.updateOrderStatus('order_1', 'shipped')
      expect(updateResult.success).toBe(true)

      // Step 3: Confirm receive
      const confirmResult = await orderModule.actions.confirmReceive(ctx, 'order_1')
      expect(confirmResult).toBe(true)
      expect(ctx.state.currentOrder.status).toBe('completed')
    })

    it('should handle order cancellation with proper cleanup', async () => {
      const ctx = createOrderContext({
        orderCache: {
          unpaid: [
            { _id: 'order_1', status: 'unpaid' },
            { _id: 'order_2', status: 'unpaid' }
          ]
        },
        orderList: [
          { _id: 'order_1', status: 'unpaid' },
          { _id: 'order_2', status: 'unpaid' }
        ],
        currentOrder: { _id: 'order_1', status: 'unpaid' }
      })

      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const cancelResult = await orderModule.actions.cancelOrder(ctx, 'order_1')
      expect(cancelResult).toBe(true)
      expect(ctx.state.currentOrder.status).toBe('cancelled')

      // Verify order is still in cache with updated status
      expect(ctx.state.orderCache['unpaid'][0].status).toBe('cancelled')
    })

    it('should retrieve order list with caching', async () => {
      const ctx = createOrderContext()

      wx.cloud.callFunction.mockResolvedValue({
        result: {
          success: true,
          data: [
            { _id: 'order_1', orderNo: 'ORD001', status: 'unpaid', totalAmount: 45 },
            { _id: 'order_2', orderNo: 'ORD002', status: 'unpaid', totalAmount: 100 }
          ]
        }
      })

      // First fetch - should call cloud
      const orders1 = await orderModule.actions.getOrderList(ctx, {
        status: 'unpaid',
        page: 1,
        pageSize: 10
      })
      expect(orders1).toHaveLength(2)
      expect(wx.cloud.callFunction).toHaveBeenCalledTimes(1)
      expect(ctx.state.orderCache['unpaid']).toHaveLength(2)

      // Second fetch - should use cache (no additional cloud call)
      wx.cloud.callFunction.mockClear()
      const orders2 = await orderModule.actions.getOrderList(ctx, {
        status: 'unpaid',
        page: 1,
        pageSize: 10
      })
      expect(orders2).toHaveLength(2)
      expect(wx.cloud.callFunction).not.toHaveBeenCalled()
    })

    it('should refresh order list when reload flag is set', async () => {
      const ctx = createOrderContext({
        orderCache: { unpaid: [{ _id: 'order_1', status: 'unpaid' }] }
      })

      wx.cloud.callFunction.mockResolvedValue({
        result: {
          success: true,
          data: [
            { _id: 'order_1', status: 'unpaid' },
            { _id: 'order_3', status: 'unpaid' }
          ]
        }
      })

      const orders = await orderModule.actions.getOrderList(ctx, {
        status: 'unpaid',
        page: 1,
        pageSize: 10,
        reload: true
      })
      expect(orders).toHaveLength(2)
      expect(wx.cloud.callFunction).toHaveBeenCalled()
    })
  })

  // ============================================================
  // Address Management Flow Integration Tests
  // ============================================================
  describe('Address Management Flow', () => {
    it('should complete address CRUD operations via API', async () => {
      // Test address list retrieval
      wx.cloud.callFunction.mockResolvedValue({
        result: {
          success: true,
          data: [
            {
              _id: 'addr_1',
              name: 'John Doe',
              phone: '13800138000',
              province: 'Beijing',
              city: 'Beijing',
              district: 'Haidian',
              detail: '123 Main St',
              isDefault: true
            }
          ]
        }
      })

      const listResult = await cloudHelper.addressApi.getAddressList()
      expect(listResult.success).toBe(true)
      expect(listResult.data).toHaveLength(1)
      expect(listResult.data[0].name).toBe('John Doe')
      expect(listResult.data[0].isDefault).toBe(true)

      // Test add address
      const newAddress = {
        name: 'Jane Doe',
        phone: '13900139000',
        province: 'Shanghai',
        city: 'Shanghai',
        district: 'Pudong',
        detail: '456 Another St',
        isDefault: false
      }

      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: { _id: 'addr_2', ...newAddress } }
      })

      const addResult = await cloudHelper.addressApi.addAddress(newAddress)
      expect(addResult.success).toBe(true)
      expect(addResult.data._id).toBe('addr_2')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageAddress',
        data: { action: 'add', addressData: newAddress }
      })

      // Test update address
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: { _id: 'addr_2', detail: '789 Updated St' } }
      })

      const updateResult = await cloudHelper.addressApi.updateAddress('addr_2', {
        detail: '789 Updated St'
      })
      expect(updateResult.success).toBe(true)

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageAddress',
        data: { action: 'update', addressId: 'addr_2', addressData: { detail: '789 Updated St' } }
      })

      // Test set default address
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const defaultResult = await cloudHelper.addressApi.setDefaultAddress('addr_2')
      expect(defaultResult.success).toBe(true)

      // Test delete address
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const deleteResult = await cloudHelper.addressApi.deleteAddress('addr_2')
      expect(deleteResult.success).toBe(true)
    })
  })

  // ============================================================
  // Mixed cross-module integration tests
  // ============================================================
  describe('Cross-Module Interactions', () => {
    it('should handle cart clear after successful order creation', async () => {
      const { cartState, cartCtx, orderCtx } = createCombinedContext()

      // Setup cart with items
      cartState.cartItems = [
        { _id: 'c1', productId: 'p1', name: 'Aspirin', price: 10, quantity: 2, selected: true }
      ]
      cartState.selectedAll = true

      // Create order
      wx.cloud.callFunction.mockResolvedValue({
        result: {
          success: true,
          data: { _id: 'order_1', orderNo: 'ORD001', payAmount: 20, status: 'unpaid' }
        }
      })

      await orderModule.actions.createOrder(orderCtx, {
        addressId: 'addr_1',
        cartItemIds: ['c1']
      })

      // After order, cart should be cleared
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })
      await cartModule.actions.clearCart(cartCtx)

      expect(cartState.cartItems).toHaveLength(0)
      expect(cartState.selectedAll).toBe(true)
    })

    it('should verify order getter calculations', () => {
      const ctx = createOrderContext({
        orderCache: {
          unpaid: [{ _id: 'o1' }, { _id: 'o2' }, { _id: 'o3' }],
          unshipped: [{ _id: 'o4' }],
          shipped: [{ _id: 'o5' }, { _id: 'o6' }],
          completed: [{ _id: 'o7' }]
        }
      })

      const allCount = orderModule.getters.orderCount(ctx.state)('all')
      expect(allCount).toBe(7)

      const unpaidCount = orderModule.getters.orderCount(ctx.state)('unpaid')
      expect(unpaidCount).toBe(3)

      const emptyCount = orderModule.getters.orderCount(ctx.state)('unknown')
      expect(emptyCount).toBe(0)
    })

    it('should handle error propagation across modules', async () => {
      const ctx = createOrderContext()

      // Simulate network error during order creation
      wx.cloud.callFunction.mockRejectedValue(new Error('Network timeout'))

      await expect(
        orderModule.actions.createOrder(ctx, {
          addressId: 'addr_1',
          cartItemIds: ['c1']
        })
      ).rejects.toThrow('Network timeout')

      // Order action should have thrown, state should be unaffected
      expect(ctx.state.loading).toBe(false)
    })
  })
})
