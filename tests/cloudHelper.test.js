/**
 * Unit tests for utils/cloudHelper.js
 * Tests all API functions with mocked wx.cloud.callFunction
 */

// We need to import dynamically after mocks are set
describe('cloudHelper API Layer', () => {
  let cloudHelper

  beforeAll(() => {
    // Mock the module path resolution
    jest.mock('wx-server-sdk', () => ({}), { virtual: true })
  })

  beforeEach(() => {
    resetMocks()
    jest.isolateModules(() => {
      cloudHelper = require('../utils/cloudHelper.js')
    })
  })

  describe('callCloudFunction wrapper', () => {
    it('should return success response when cloud function succeeds', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { items: [] })
      )

      // Need direct access to the internal function
      // Test via exported APIs
    })

    it('should handle network errors gracefully', async () => {
      global.wx.cloud.callFunction.mockRejectedValue(new Error('Network error'))
      // Test via exported APIs
    })
  })

  describe('homeApi', () => {
    it('getHomeData should call getHomePage cloud function', async () => {
      const mockData = {
        banners: [{ image: 'b1.jpg', type: 'product', target: 'p1' }],
        categories: [{ _id: 'c1', name: 'Drugs' }],
        featured: [{ _id: 'p1', name: 'Aspirin', price: 10 }],
        bestsellers: [{ _id: 'p2', name: 'Vitamin C', price: 5 }],
        newArrivals: [],
        promotions: []
      }
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, mockData)
      )

      const result = await cloudHelper.homeApi.getHomeData()
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'getHomePage',
        data: {}
      })
      expect(result.success).toBe(true)
      expect(result.data.banners).toHaveLength(1)
      expect(result.data.categories).toHaveLength(1)
    })
  })

  describe('productApi', () => {
    it('getProductDetail should call with correct productId', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { _id: 'p1', name: 'Aspirin', price: 10 })
      )

      const result = await cloudHelper.productApi.getProductDetail('p1')
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'getProductDetail',
        data: { productId: 'p1' }
      })
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('Aspirin')
    })

    it('searchProducts should pass all search params', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { products: [], total: 0 })
      )

      await cloudHelper.productApi.searchProducts({
        keyword: 'aspirin',
        categoryId: 'c1',
        page: 1,
        pageSize: 20
      })
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'searchProducts',
        data: { keyword: 'aspirin', categoryId: 'c1', page: 1, pageSize: 20 }
      })
    })
  })

  describe('cartApi', () => {
    it('getCartList should call manageCart with list action', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { items: [], selectedCount: 0, totalPrice: 0 })
      )

      await cloudHelper.cartApi.getCartList()
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'list' }
      })
    })

    it('addToCart should include productId and quantity', async () => {
      await cloudHelper.cartApi.addToCart('p1', 3)
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'add', productId: 'p1', quantity: 3 }
      })
    })

    it('removeFromCart should call with remove action', async () => {
      await cloudHelper.cartApi.removeFromCart('p1')
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'remove', productId: 'p1' }
      })
    })

    it('clearCart should call with clear action', async () => {
      await cloudHelper.cartApi.clearCart()
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCart',
        data: { action: 'clear' }
      })
    })
  })

  describe('orderApi', () => {
    it('createOrder should pass order data', async () => {
      const orderData = { addressId: 'a1', cartItemIds: ['c1', 'c2'] }
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { orderId: 'o1', orderNo: 'ORD001', payAmount: 100 })
      )

      await cloudHelper.orderApi.createOrder(orderData)
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'createOrder',
        data: orderData
      })
    })

    it('getOrders should pass status and pagination', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, [])
      )

      await cloudHelper.orderApi.getOrders({ status: 'unpaid', page: 1, pageSize: 10 })
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'getOrders',
        data: { status: 'unpaid', page: 1, pageSize: 10 }
      })
    })

    it('payOrder should include payment info', async () => {
      await cloudHelper.orderApi.payOrder('o1', { method: 'wechat' })
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'payOrder',
        data: { orderId: 'o1', payment: { method: 'wechat' } }
      })
    })
  })

  describe('userApi', () => {
    it('getUserInfo should call cloud function', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { nickname: 'Test', avatarUrl: '/avatar.png' })
      )

      await cloudHelper.userApi.getUserInfo()
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'getUserInfo',
        data: {}
      })
    })

    it('updateUserInfo should pass user info', async () => {
      const userInfo = { nickname: 'New Name', avatarUrl: '/new.png' }
      await cloudHelper.userApi.updateUserInfo(userInfo)
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'updateUserInfo',
        data: { userInfo }
      })
    })
  })

  describe('addressApi', () => {
    it('getAddressList should call manageAddress with list', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, [])
      )

      await cloudHelper.addressApi.getAddressList()
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageAddress',
        data: { action: 'list' }
      })
    })

    it('addAddress should validate required fields', async () => {
      const addressData = {
        name: 'John',
        phone: '13800138000',
        province: 'Beijing',
        city: 'Beijing',
        district: 'Haidian',
        detail: '123 Main St'
      }
      await cloudHelper.addressApi.addAddress(addressData)
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageAddress',
        data: { action: 'add', addressData }
      })
    })
  })

  describe('favoriteApi', () => {
    it('addFavorite should call with productId', async () => {
      await cloudHelper.favoriteApi.addFavorite('p1')
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageFavorite',
        data: { action: 'add', productId: 'p1' }
      })
    })

    it('checkFavorite should return boolean', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(true, { isFavorite: true })
      )

      const result = await cloudHelper.favoriteApi.checkFavorite('p1')
      expect(result.data.isFavorite).toBe(true)
    })
  })

  describe('couponApi', () => {
    it('getMyCoupons should filter by status', async () => {
      await cloudHelper.couponApi.getMyCoupons('unused')
      expect(global.wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'manageCoupon',
        data: { action: 'getMyCoupons', status: 'unused' }
      })
    })
  })

  describe('error handling', () => {
    it('should return error object on cloud function failure', async () => {
      global.wx.cloud.callFunction.mockResolvedValue(
        global.mockCloudResponse(false, null, 'Server error')
      )

      const result = await cloudHelper.homeApi.getHomeData()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Server error')
    })

    it('should return error object on network failure', async () => {
      global.wx.cloud.callFunction.mockRejectedValue(new Error('Network timeout'))

      const result = await cloudHelper.productApi.getProductDetail('p1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })

    it('should handle null/undefined responses', async () => {
      global.wx.cloud.callFunction.mockResolvedValue({ result: null })

      const result = await cloudHelper.cartApi.getCartList()
      expect(result.success).toBe(false)
    })
  })
})
