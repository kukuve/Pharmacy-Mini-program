/**
 * Unit tests for store/modules/order.js
 * Tests order lifecycle, status transitions, caching, and cloud sync
 */

describe('Order Store Module', () => {
  let orderModule

  beforeAll(() => {
    orderModule = require('../../store/modules/order.js').default
  })

  beforeEach(() => {
    resetMocks()
  })

  describe('state', () => {
    it('should have correct initial state', () => {
      expect(orderModule.state).toBeDefined()
      expect(orderModule.state).toHaveProperty('orderList', [])
      expect(orderModule.state).toHaveProperty('currentOrder', null)
      expect(orderModule.state).toHaveProperty('orderCache', {})
      expect(orderModule.state).toHaveProperty('loading', false)
    })

    it('should be namespaced', () => {
      expect(orderModule.namespaced).toBe(true)
    })
  })

  describe('mutations', () => {
    let state

    beforeEach(() => {
      state = {
        orderList: [],
        currentOrder: null,
        orderCache: {},
        loading: false
      }
    })

    it('SET_ORDER_LIST should replace orders for status', () => {
      const orders = [{ _id: 'o1', status: 'unpaid' }, { _id: 'o2', status: 'unpaid' }]
      orderModule.mutations.SET_ORDER_LIST(state, {
        status: 'unpaid',
        orders,
        replace: true
      })
      expect(state.orderCache['unpaid']).toEqual(orders)
      expect(state.orderList).toEqual(orders)
    })

    it('SET_ORDER_LIST should append orders when replace false', () => {
      state.orderCache['unpaid'] = [{ _id: 'o1' }]
      orderModule.mutations.SET_ORDER_LIST(state, {
        status: 'unpaid',
        orders: [{ _id: 'o2' }],
        replace: false
      })
      expect(state.orderCache['unpaid']).toHaveLength(2)
    })

    it('SET_CURRENT_ORDER should set current order', () => {
      const order = { _id: 'o1', orderNo: 'ORD001', status: 'unpaid' }
      orderModule.mutations.SET_CURRENT_ORDER(state, order)
      expect(state.currentOrder).toEqual(order)
    })

    it('UPDATE_ORDER_STATUS should update status in cache and current list', () => {
      state.orderCache['unpaid'] = [
        { _id: 'o1', status: 'unpaid' }
      ]
      state.orderList = [
        { _id: 'o1', status: 'unpaid' }
      ]

      orderModule.mutations.UPDATE_ORDER_STATUS(state, {
        orderId: 'o1',
        status: 'cancelled',
        updateTime: 1234567890
      })

      expect(state.orderCache['unpaid'][0].status).toBe('cancelled')
      expect(state.orderCache['unpaid'][0].updateTime).toBe(1234567890)
      expect(state.orderList[0].status).toBe('cancelled')
    })

    it('UPDATE_ORDER_STATUS should update currentOrder if matches', () => {
      state.currentOrder = { _id: 'o1', status: 'unpaid' }
      orderModule.mutations.UPDATE_ORDER_STATUS(state, {
        orderId: 'o1',
        status: 'paid',
        updateTime: 987654321
      })
      expect(state.currentOrder.status).toBe('paid')
      expect(state.currentOrder.updateTime).toBe(987654321)
    })

    it('UPDATE_ORDER_STATUS should not touch currentOrder if ID differs', () => {
      state.currentOrder = { _id: 'o2', status: 'unpaid' }
      orderModule.mutations.UPDATE_ORDER_STATUS(state, {
        orderId: 'o1',
        status: 'paid'
      })
      expect(state.currentOrder.status).toBe('unpaid')
    })

    it('SET_LOADING should update loading state', () => {
      orderModule.mutations.SET_LOADING(state, true)
      expect(state.loading).toBe(true)
      orderModule.mutations.SET_LOADING(state, false)
      expect(state.loading).toBe(false)
    })

    it('CLEAR_ORDER_CACHE should reset all order state', () => {
      state.orderCache = { unpaid: [{ _id: 'o1' }] }
      state.orderList = [{ _id: 'o1' }]
      state.currentOrder = { _id: 'o1' }

      orderModule.mutations.CLEAR_ORDER_CACHE(state)

      expect(state.orderCache).toEqual({})
      expect(state.orderList).toEqual([])
      expect(state.currentOrder).toBe(null)
    })
  })

  describe('getters', () => {
    it('orderCount should return total across all statuses', () => {
      const state = {
        orderCache: {
          unpaid: [{ _id: 'o1' }, { _id: 'o2' }],
          unshipped: [{ _id: 'o3' }],
          shipped: [{ _id: 'o4' }, { _id: 'o5' }]
        }
      }
      expect(orderModule.getters.orderCount(state)('all')).toBe(5)
    })

    it('orderCount should return count for specific status', () => {
      const state = {
        orderCache: {
          unpaid: [{ _id: 'o1' }, { _id: 'o2' }],
          unshipped: [{ _id: 'o3' }]
        }
      }
      expect(orderModule.getters.orderCount(state)('unpaid')).toBe(2)
    })

    it('orderCount should return 0 for unknown status', () => {
      const state = { orderCache: {} }
      expect(orderModule.getters.orderCount(state)('unknown')).toBe(0)
    })

    it('currentOrderList should return orderList', () => {
      const orders = [{ _id: 'o1' }]
      expect(orderModule.getters.currentOrderList({ orderList: orders })).toEqual(orders)
    })

    it('currentOrder should return currentOrder', () => {
      const order = { _id: 'o1' }
      expect(orderModule.getters.currentOrder({ currentOrder: order })).toEqual(order)
    })

    it('isLoading should return loading state', () => {
      expect(orderModule.getters.isLoading({ loading: true })).toBe(true)
      expect(orderModule.getters.isLoading({ loading: false })).toBe(false)
    })
  })

  describe('actions', () => {
    it('createOrder should call cloud and set current order', async () => {
      const orderData = { addressId: 'a1', cartItemIds: ['c1'] }
      const mockOrder = { _id: 'o1', orderNo: 'ORD001', payAmount: 100 }

      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: mockOrder }
      })

      const commit = jest.fn()
      const result = await orderModule.actions.createOrder({ commit }, orderData)

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'createOrder',
        data: orderData
      })
      expect(commit).toHaveBeenCalledWith('SET_LOADING', true)
      expect(commit).toHaveBeenCalledWith('SET_CURRENT_ORDER', mockOrder)
      expect(commit).toHaveBeenCalledWith('CLEAR_ORDER_CACHE')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
      expect(result).toEqual(mockOrder)
    })

    it('createOrder should throw on failure', async () => {
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: false, error: 'Stock insufficient' }
      })

      const commit = jest.fn()
      await expect(
        orderModule.actions.createOrder({ commit }, {})
      ).rejects.toThrow('Stock insufficient')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })

    it('createOrder should always set loading false', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Network error'))

      const commit = jest.fn()
      await expect(
        orderModule.actions.createOrder({ commit }, {})
      ).rejects.toThrow('Network error')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })

    it('getOrderList should use cache when available and page 1', async () => {
      const state = {
        orderCache: { unpaid: [{ _id: 'o1' }, { _id: 'o2' }] }
      }
      const commit = jest.fn()
      const result = await orderModule.actions.getOrderList(
        { commit, state },
        { status: 'unpaid', page: 1, pageSize: 10 }
      )

      expect(commit).toHaveBeenCalledWith('SET_ORDER_LIST', {
        status: 'unpaid',
        orders: state.orderCache['unpaid']
      })
      expect(wx.cloud.callFunction).not.toHaveBeenCalled()
      expect(result).toEqual(state.orderCache['unpaid'])
    })

    it('getOrderList should fetch when reload is true', async () => {
      const state = {
        orderCache: { unpaid: [{ _id: 'o1' }] }
      }
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: [{ _id: 'o2' }] }
      })

      const commit = jest.fn()
      const result = await orderModule.actions.getOrderList(
        { commit, state },
        { status: 'unpaid', page: 1, pageSize: 10, reload: true }
      )

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'getOrders',
        data: { status: 'unpaid', page: 1, pageSize: 10 }
      })
      expect(result).toEqual([{ _id: 'o2' }])
    })

    it('getOrderList should handle error and return empty', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Failed'))

      const commit = jest.fn()
      const state = { orderCache: {} }
      const result = await orderModule.actions.getOrderList(
        { commit, state },
        { status: 'all', page: 1, pageSize: 10 }
      )

      expect(result).toEqual([])
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })

    it('getOrderDetail should fetch and set current order', async () => {
      const mockOrder = {
        _id: 'o1',
        orderNo: 'ORD001',
        items: [],
        logistics: null,
        status: 'unpaid'
      }
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: mockOrder }
      })

      const commit = jest.fn()
      const result = await orderModule.actions.getOrderDetail({ commit }, 'o1')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'getOrderDetail',
        data: { orderId: 'o1' }
      })
      expect(commit).toHaveBeenCalledWith('SET_CURRENT_ORDER', mockOrder)
      expect(result).toEqual(mockOrder)
    })

    it('getOrderDetail should throw on error', async () => {
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: false, error: 'Not found' }
      })

      const commit = jest.fn()
      await expect(
        orderModule.actions.getOrderDetail({ commit }, 'bad-id')
      ).rejects.toThrow('Not found')
    })

    it('cancelOrder should update status to cancelled', async () => {
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const commit = jest.fn()
      const result = await orderModule.actions.cancelOrder({ commit }, 'o1')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'updateOrderStatus',
        data: { orderId: 'o1', status: 'cancelled' }
      })
      expect(commit).toHaveBeenCalledWith('SET_LOADING', true)
      expect(commit).toHaveBeenCalledWith('UPDATE_ORDER_STATUS', {
        orderId: 'o1',
        status: 'cancelled',
        updateTime: expect.any(Number)
      })
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
      expect(result).toBe(true)
    })

    it('cancelOrder should throw on error', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Cancel failed'))

      const commit = jest.fn()
      await expect(
        orderModule.actions.cancelOrder({ commit }, 'o1')
      ).rejects.toThrow('Cancel failed')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })

    it('payOrder should call pay and update status to unshipped', async () => {
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: true, data: { transactionId: 'txn_123' } }
      })

      const commit = jest.fn()
      const result = await orderModule.actions.payOrder(
        { commit },
        { orderId: 'o1', payment: { method: 'wechat' } }
      )

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'payOrder',
        data: { orderId: 'o1', payment: { method: 'wechat' } }
      })
      expect(commit).toHaveBeenCalledWith('UPDATE_ORDER_STATUS', {
        orderId: 'o1',
        status: 'unshipped',
        updateTime: expect.any(Number)
      })
      expect(result).toBe(true)
    })

    it('payOrder should throw on payment failure', async () => {
      wx.cloud.callFunction.mockResolvedValue({
        result: { success: false, error: 'Insufficient balance' }
      })

      const commit = jest.fn()
      await expect(
        orderModule.actions.payOrder({ commit }, { orderId: 'o1', payment: {} })
      ).rejects.toThrow('Insufficient balance')
    })

    it('confirmReceive should update status to completed', async () => {
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const commit = jest.fn()
      const result = await orderModule.actions.confirmReceive({ commit }, 'o1')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'updateOrderStatus',
        data: { orderId: 'o1', status: 'completed' }
      })
      expect(commit).toHaveBeenCalledWith('UPDATE_ORDER_STATUS', {
        orderId: 'o1',
        status: 'completed',
        updateTime: expect.any(Number)
      })
      expect(result).toBe(true)
    })

    it('deleteOrder should set status to deleted and clean up', async () => {
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const commit = jest.fn()
      const state = {
        orderCache: {
          unpaid: [{ _id: 'o1' }, { _id: 'o2' }],
          unshipped: [{ _id: 'o3' }]
        },
        orderList: [{ _id: 'o1' }, { _id: 'o2' }],
        currentOrder: { _id: 'o1' }
      }
      const result = await orderModule.actions.deleteOrder({ commit, state }, 'o1')

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'updateOrderStatus',
        data: { orderId: 'o1', status: 'deleted' }
      })
      expect(state.orderCache['unpaid']).toHaveLength(1)
      expect(state.orderCache['unpaid'][0]._id).toBe('o2')
      expect(state.orderList).toHaveLength(1)
      expect(commit).toHaveBeenCalledWith('SET_CURRENT_ORDER', null)
      expect(result).toBe(true)
    })

    it('deleteOrder should handle currentOrder not matching', async () => {
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const commit = jest.fn()
      const state = {
        orderCache: { unpaid: [{ _id: 'o1' }] },
        orderList: [{ _id: 'o1' }],
        currentOrder: { _id: 'o2' }
      }
      await orderModule.actions.deleteOrder({ commit, state }, 'o1')

      // currentOrder should remain since IDs don't match
      expect(state.currentOrder).toEqual({ _id: 'o2' })
    })

    it('deleteOrder should throw on error', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Delete failed'))

      const commit = jest.fn()
      const state = {
        orderCache: { unpaid: [] },
        orderList: [],
        currentOrder: null
      }
      await expect(
        orderModule.actions.deleteOrder({ commit, state }, 'o1')
      ).rejects.toThrow('Delete failed')
      expect(commit).toHaveBeenCalledWith('SET_LOADING', false)
    })
  })
})
