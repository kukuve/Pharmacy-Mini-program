// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const ordersCollection = db.collection('orders')
const cartCollection = db.collection('cart')
const productsCollection = db.collection('products')
const couponsCollection = db.collection('coupons')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    addressId,
    couponId,
    remark,
    cartItemIds // 如果为空，则使用购物车中所有选中的商品
  } = event
  
  if (!addressId) {
    return {
      success: false,
      error: '收货地址不能为空'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 获取收货地址
    const addressResult = await transaction.collection('addresses').doc(addressId).get()
    
    if (!addressResult.data || addressResult.data.userId !== openid) {
      await transaction.rollback()
      return {
        success: false,
        error: '收货地址无效'
      }
    }
    
    const address = addressResult.data
    
    // 获取购物车商品
    let cartQuery = {
      userId: openid
    }
    
    if (Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      cartQuery._id = _.in(cartItemIds)
    } else {
      cartQuery.selected = true
    }
    
    const cartResult = await transaction.collection('cart')
      .where(cartQuery)
      .get()
    
    if (cartResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        error: '购物车为空'
      }
    }
    
    const cartItems = cartResult.data
    
    // 验证商品信息并计算订单金额
    let totalPrice = 0
    let totalOriginalPrice = 0
    const orderItems = []
    const stockUpdates = []
    
    for (const item of cartItems) {
      // 获取商品最新信息
      const productResult = await transaction.collection('products').doc(item.productId).get()
      
      if (!productResult.data) {
        await transaction.rollback()
        return {
          success: false,
          error: `商品 ${item.productName} 不存在`
        }
      }
      
      const product = productResult.data
      
      // 验证商品状态
      if (product.status !== 'on_sale') {
        await transaction.rollback()
        return {
          success: false,
          error: `商品 ${product.name} 已下架`
        }
      }
      
      // 验证库存
      if (product.stock < item.quantity) {
        await transaction.rollback()
        return {
          success: false,
          error: `商品 ${product.name} 库存不足`
        }
      }
      
      // 计算金额
      const itemPrice = product.price * item.quantity
      const itemOriginalPrice = product.originalPrice * item.quantity
      
      totalPrice += itemPrice
      totalOriginalPrice += itemOriginalPrice
      
      // 准备订单项
      orderItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.coverImage,
        price: product.price,
        originalPrice: product.originalPrice,
        quantity: item.quantity,
        totalPrice: itemPrice,
        totalOriginalPrice: itemOriginalPrice
      })
      
      // 准备库存更新
      stockUpdates.push({
        productId: product._id,
        quantity: item.quantity
      })
    }
    
    // 处理优惠券
    let discount = 0
    let usedCoupon = null
    
    if (couponId) {
      const couponResult = await transaction.collection('coupons').doc(couponId).get()
      
      if (!couponResult.data || couponResult.data.userId !== openid) {
        await transaction.rollback()
        return {
          success: false,
          error: '优惠券无效'
        }
      }
      
      const coupon = couponResult.data
      
      // 验证优惠券
      if (coupon.status !== 'unused') {
        await transaction.rollback()
        return {
          success: false,
          error: '优惠券已使用或已过期'
        }
      }
      
      if (coupon.expiryDate < Date.now()) {
        await transaction.rollback()
        return {
          success: false,
          error: '优惠券已过期'
        }
      }
      
      if (totalPrice < coupon.minAmount) {
        await transaction.rollback()
        return {
          success: false,
          error: `订单金额未满${coupon.minAmount}元`
        }
      }
      
      // 计算优惠金额
      if (coupon.type === 'discount') {
        discount = Math.min(coupon.value, totalPrice)
      } else if (coupon.type === 'percentage') {
        discount = Math.floor(totalPrice * (coupon.value / 100))
      }
      
      usedCoupon = {
        couponId: coupon._id,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        discount
      }
    }
    
    // 生成订单号
    const orderNo = generateOrderNo()
    
    // 创建订单
    const orderData = {
      orderNo,
      userId: openid,
      status: 'unpaid',
      items: orderItems,
      address: {
        name: address.name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail
      },
      totalPrice,
      totalOriginalPrice,
      discount,
      payAmount: totalPrice - discount,
      coupon: usedCoupon,
      remark,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      expireTime: new Date(Date.now() + 30 * 60 * 1000) // 订单30分钟内有效
    }
    
    const orderResult = await transaction.collection('orders').add({
      data: orderData
    })
    
    // 更新商品库存
    for (const update of stockUpdates) {
      await transaction.collection('products').doc(update.productId).update({
        data: {
          stock: _.inc(-update.quantity),
          salesCount: _.inc(update.quantity)
        }
      })
    }
    
    // 更新优惠券状态
    if (usedCoupon) {
      await transaction.collection('coupons').doc(couponId).update({
        data: {
          status: 'used',
          useTime: db.serverDate(),
          orderId: orderResult._id,
          orderNo
        }
      })
    }
    
    // 清理购物车
    await transaction.collection('cart')
      .where(cartQuery)
      .remove()
    
    // 提交事务
    await transaction.commit()
    
    // 返回结果
    return {
      success: true,
      data: {
        orderId: orderResult._id,
        orderNo,
        payAmount: orderData.payAmount
      }
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    console.error('创建订单失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  const second = now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  return `ORD${year}${month}${day}${hour}${minute}${second}${random}`
}