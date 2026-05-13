const state = {
  orderList: [], // 订单列表
  currentOrder: null, // 当前处理的订单
  orderCache: {}, // 订单缓存，用于存储不同状态的订单列表
  loading: false // 加载状态
}

const mutations = {
  // 设置订单列表
  SET_ORDER_LIST(state, { status, orders, replace = true }) {
    if (replace) {
      // 替换指定状态的订单列表
      state.orderCache[status] = orders
    } else {
      // 追加订单到指定状态的列表
      if (!state.orderCache[status]) {
        state.orderCache[status] = []
      }
      state.orderCache[status].push(...orders)
    }
    
    // 更新当前显示的订单列表
    state.orderList = state.orderCache[status] || []
  },
  
  // 设置当前订单
  SET_CURRENT_ORDER(state, order) {
    state.currentOrder = order
  },
  
  // 更新订单状态
  UPDATE_ORDER_STATUS(state, { orderId, status, updateTime }) {
    // 更新缓存中的订单状态
    Object.keys(state.orderCache).forEach(key => {
      const orders = state.orderCache[key]
      const orderIndex = orders.findIndex(order => order._id === orderId)
      if (orderIndex !== -1) {
        orders[orderIndex].status = status
        orders[orderIndex].updateTime = updateTime
      }
    })
    
    // 更新当前订单列表
    const orderIndex = state.orderList.findIndex(order => order._id === orderId)
    if (orderIndex !== -1) {
      state.orderList[orderIndex].status = status
      state.orderList[orderIndex].updateTime = updateTime
    }
    
    // 更新当前订单
    if (state.currentOrder && state.currentOrder._id === orderId) {
      state.currentOrder.status = status
      state.currentOrder.updateTime = updateTime
    }
  },
  
  // 设置加载状态
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  
  // 清除订单缓存
  CLEAR_ORDER_CACHE(state) {
    state.orderCache = {}
    state.orderList = []
    state.currentOrder = null
  }
}

const actions = {
  // 创建订单
  async createOrder({ commit }, orderData) {
    try {
      commit('SET_LOADING', true)
      const res = await wx.cloud.callFunction({
        name: 'createOrder',
        data: orderData
      })
      if (res.result && res.result.success) {
        commit('SET_CURRENT_ORDER', res.result.data)
        commit('CLEAR_ORDER_CACHE')
        return res.result.data
      }
      throw new Error((res.result && res.result.error) || 'Failed to create order')
    } catch (error) {
      console.error('Failed to create order:', error)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  // 获取订单列表
  async getOrderList({ commit, state }, { status = 'all', page = 1, pageSize = 10, reload = false }) {
    try {
      commit('SET_LOADING', true)
      if (!reload && state.orderCache[status] && page === 1) {
        commit('SET_ORDER_LIST', { status, orders: state.orderCache[status] })
        return state.orderCache[status]
      }
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: { status, page, pageSize }
      })
      if (res.result && res.result.success) {
        commit('SET_ORDER_LIST', {
          status,
          orders: res.result.data,
          replace: page === 1
        })
        return res.result.data
      }
      return []
    } catch (error) {
      console.error('Failed to get orders:', error)
      return []
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  // 获取订单详情
  async getOrderDetail({ commit }, orderId) {
    try {
      commit('SET_LOADING', true)
      const res = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: { orderId }
      })
      if (res.result && res.result.success) {
        commit('SET_CURRENT_ORDER', res.result.data)
        return res.result.data
      }
      throw new Error((res.result && res.result.error) || 'Failed to get order detail')
    } catch (error) {
      console.error('Failed to get order detail:', error)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  // 取消订单
  async cancelOrder({ commit }, orderId) {
    try {
      commit('SET_LOADING', true)
      await wx.cloud.callFunction({
        name: 'updateOrderStatus',
        data: { orderId, status: 'cancelled' }
      })
      commit('UPDATE_ORDER_STATUS', {
        orderId, status: 'cancelled', updateTime: Date.now()
      })
      return true
    } catch (error) {
      console.error('Failed to cancel order:', error)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  // 支付订单
  async payOrder({ commit }, { orderId, payment = {} }) {
    try {
      commit('SET_LOADING', true)
      const res = await wx.cloud.callFunction({
        name: 'payOrder',
        data: { orderId, payment }
      })
      if (res.result && res.result.success) {
        commit('UPDATE_ORDER_STATUS', {
          orderId, status: 'unshipped', updateTime: Date.now()
        })
        return true
      }
      throw new Error((res.result && res.result.error) || 'Payment failed')
    } catch (error) {
      console.error('Failed to pay order:', error)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  // 确认收货
  async confirmReceive({ commit }, orderId) {
    try {
      commit('SET_LOADING', true)
      await wx.cloud.callFunction({
        name: 'updateOrderStatus',
        data: { orderId, status: 'completed' }
      })
      commit('UPDATE_ORDER_STATUS', {
        orderId, status: 'completed', updateTime: Date.now()
      })
      return true
    } catch (error) {
      console.error('Failed to confirm receipt:', error)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  // 删除订单
  async deleteOrder({ commit, state }, orderId) {
    try {
      commit('SET_LOADING', true)
      await wx.cloud.callFunction({
        name: 'updateOrderStatus',
        data: { orderId, status: 'deleted' }
      })
      Object.keys(state.orderCache).forEach(key => {
        const idx = state.orderCache[key].findIndex(o => o._id === orderId)
        if (idx !== -1) state.orderCache[key].splice(idx, 1)
      })
      const idx = state.orderList.findIndex(o => o._id === orderId)
      if (idx !== -1) state.orderList.splice(idx, 1)
      if (state.currentOrder && state.currentOrder._id === orderId) {
        commit('SET_CURRENT_ORDER', null)
      }
      return true
    } catch (error) {
      console.error('Failed to delete order:', error)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  }
}

const getters = {
  // 获取指定状态的订单数量
  orderCount: state => status => {
    if (status === 'all') {
      return Object.values(state.orderCache)
        .reduce((total, orders) => total + orders.length, 0)
    }
    return (state.orderCache[status] || []).length
  },
  
  // 获取当前订单列表
  currentOrderList: state => {
    return state.orderList
  },
  
  // 获取当前处理的订单
  currentOrder: state => {
    return state.currentOrder
  },
  
  // 是否正在加载
  isLoading: state => {
    return state.loading
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}