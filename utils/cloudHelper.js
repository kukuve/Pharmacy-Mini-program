// CloudBase Cloud Function API Helper
// Provides a unified interface for calling CloudBase cloud functions

/**
 * Standardized cloud function call wrapper.
 * Calls wx.cloud.callFunction and normalizes the response.
 * @param {string} name - Cloud function name
 * @param {object} data - Data to pass to the cloud function
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
const callCloudFunction = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    // Normalize response: expect { success, data, error } from cloud functions
    if (res.result && res.result.success !== false) {
      return { success: true, data: res.result.data || res.result }
    }
    return {
      success: false,
      error: (res.result && res.result.error) || 'Unknown error'
    }
  } catch (err) {
    console.error(`Cloud function [${name}] call failed:`, err)
    return { success: false, error: err.message || 'Network error' }
  }
}

// ============================================================
// Home Page API
// ============================================================
export const homeApi = {
  getHomeData: () => callCloudFunction('getHomePage')
}

// ============================================================
// Product API
// ============================================================
export const productApi = {
  getProductDetail: (productId) =>
    callCloudFunction('getProductDetail', { productId }),

  getProducts: (params = {}) =>
    callCloudFunction('getProducts', params),

  searchProducts: (params) =>
    callCloudFunction('searchProducts', params)
}

// ============================================================
// Cart API
// ============================================================
export const cartApi = {
  getCartList: () =>
    callCloudFunction('manageCart', { action: 'list' }),

  addToCart: (productId, quantity = 1) =>
    callCloudFunction('manageCart', { action: 'add', productId, quantity }),

  removeFromCart: (productId) =>
    callCloudFunction('manageCart', { action: 'remove', productId }),

  updateQuantity: (productId, quantity) =>
    callCloudFunction('manageCart', { action: 'update', productId, quantity }),

  clearCart: () =>
    callCloudFunction('manageCart', { action: 'clear' }),

  batchRemove: (cartItemIds) =>
    callCloudFunction('manageCart', { action: 'batchRemove', cartItemIds }),

  checkStock: () =>
    callCloudFunction('manageCart', { action: 'checkStock' })
}

// ============================================================
// Order API
// ============================================================
export const orderApi = {
  createOrder: (orderData) =>
    callCloudFunction('createOrder', orderData),

  getOrders: (params = {}) =>
    callCloudFunction('getOrders', params),

  getOrderDetail: (orderId) =>
    callCloudFunction('getOrderDetail', { orderId }),

  updateOrderStatus: (orderId, status) =>
    callCloudFunction('updateOrderStatus', { orderId, status }),

  payOrder: (orderId, payment = {}) =>
    callCloudFunction('payOrder', { orderId, payment }),

  cancelOrder: (orderId) =>
    callCloudFunction('updateOrderStatus', { orderId, status: 'cancelled' }),

  confirmReceive: (orderId) =>
    callCloudFunction('updateOrderStatus', { orderId, status: 'completed' })
}

// ============================================================
// User API
// ============================================================
export const userApi = {
  login: () =>
    callCloudFunction('login', {}),

  getUserInfo: () =>
    callCloudFunction('getUserInfo'),

  updateUserInfo: (userInfo) =>
    callCloudFunction('updateUserInfo', { userInfo })
}

// ============================================================
// Address API
// ============================================================
export const addressApi = {
  getAddressList: () =>
    callCloudFunction('manageAddress', { action: 'list' }),

  getAddress: (addressId) =>
    callCloudFunction('manageAddress', { action: 'get', addressId }),

  addAddress: (addressData) =>
    callCloudFunction('manageAddress', { action: 'add', addressData }),

  updateAddress: (addressId, addressData) =>
    callCloudFunction('manageAddress', { action: 'update', addressId, addressData }),

  deleteAddress: (addressId) =>
    callCloudFunction('manageAddress', { action: 'delete', addressId }),

  setDefaultAddress: (addressId) =>
    callCloudFunction('manageAddress', { action: 'setDefault', addressId })
}

// ============================================================
// Favorites API
// ============================================================
export const favoriteApi = {
  getFavoriteList: (params = {}) =>
    callCloudFunction('manageFavorite', { action: 'list', ...params }),

  addFavorite: (productId) =>
    callCloudFunction('manageFavorite', { action: 'add', productId }),

  removeFavorite: (productId) =>
    callCloudFunction('manageFavorite', { action: 'remove', productId }),

  checkFavorite: (productId) =>
    callCloudFunction('manageFavorite', { action: 'check', productId })
}

// ============================================================
// Coupon API
// ============================================================
export const couponApi = {
  getCouponList: (params = {}) =>
    callCloudFunction('manageCoupon', { action: 'list', ...params }),

  receiveCoupon: (couponId) =>
    callCloudFunction('manageCoupon', { action: 'receive', couponId }),

  getMyCoupons: (status) =>
    callCloudFunction('manageCoupon', { action: 'getMyCoupons', status })
}

// ============================================================
// Review API
// ============================================================
export const reviewApi = {
  getReviews: (params = {}) =>
    callCloudFunction('manageReview', { action: 'list', ...params }),

  addReview: (reviewData) =>
    callCloudFunction('manageReview', { action: 'add', reviewData }),

  getMyReviews: (params = {}) =>
    callCloudFunction('manageReview', { action: 'getMyReviews', ...params })
}

// ============================================================
// Category API
// ============================================================
export const categoryApi = {
  getCategories: (params = {}) =>
    callCloudFunction('getCategories', params),

  getCategoryDetail: (categoryId) =>
    callCloudFunction('getCategoryDetail', { categoryId })
}