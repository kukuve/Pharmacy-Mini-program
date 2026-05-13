// CloudBase Create Order Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { addressId, couponId, remark, cartItemIds } = event

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  if (!addressId) {
    return { success: false, error: 'Shipping address is required' }
  }

  const transaction = await db.startTransaction()

  try {
    // Validate address
    const addressResult = await transaction.collection('addresses').doc(addressId).get()
    if (!addressResult.data || addressResult.data.userId !== openid) {
      await transaction.rollback()
      return { success: false, error: 'Invalid shipping address' }
    }
    const address = addressResult.data

    // Get cart items
    let cartQuery = { userId: openid }
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
      return { success: false, error: 'Cart is empty' }
    }

    const cartItems = cartResult.data

    // Validate products and calculate amounts
    let totalPrice = 0
    let totalOriginalPrice = 0
    const orderItems = []

    for (const item of cartItems) {
      const productResult = await transaction.collection('products').doc(item.productId).get()

      if (!productResult.data) {
        await transaction.rollback()
        return { success: false, error: `Product ${item.productName} not found` }
      }

      const product = productResult.data

      if (product.status !== 'on_sale') {
        await transaction.rollback()
        return { success: false, error: `Product ${product.name} is not available` }
      }

      if (product.stock < item.quantity) {
        await transaction.rollback()
        return { success: false, error: `Insufficient stock for ${product.name}` }
      }

      const itemPrice = product.price * item.quantity
      const itemOriginalPrice = product.originalPrice * item.quantity

      totalPrice += itemPrice
      totalOriginalPrice += itemOriginalPrice

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

      // Update stock and sales
      await transaction.collection('products').doc(product._id).update({
        data: {
          stock: _.inc(-item.quantity),
          salesCount: _.inc(item.quantity)
        }
      })
    }

    // Handle coupon
    let discount = 0
    let usedCoupon = null

    if (couponId) {
      const couponResult = await transaction.collection('coupons').doc(couponId).get()

      if (!couponResult.data || couponResult.data.userId !== openid) {
        await transaction.rollback()
        return { success: false, error: 'Invalid coupon' }
      }

      const coupon = couponResult.data

      if (coupon.status !== 'unused') {
        await transaction.rollback()
        return { success: false, error: 'Coupon already used or expired' }
      }

      if (coupon.expiryDate && coupon.expiryDate < Date.now()) {
        await transaction.rollback()
        return { success: false, error: 'Coupon has expired' }
      }

      if (totalPrice < (coupon.minAmount || 0)) {
        await transaction.rollback()
        return { success: false, error: `Order amount is below minimum ${coupon.minAmount}` }
      }

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

    const orderNo = generateOrderNo()

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
      remark: remark || '',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      expireTime: new Date(Date.now() + 30 * 60 * 1000)
    }

    const orderResult = await transaction.collection('orders').add({
      data: orderData
    })

    // Update coupon status
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

    // Clear cart items
    await transaction.collection('cart')
      .where(cartQuery)
      .remove()

    await transaction.commit()

    return {
      success: true,
      data: {
        orderId: orderResult._id,
        orderNo,
        payAmount: orderData.payAmount
      }
    }
  } catch (error) {
    await transaction.rollback()
    console.error('Create order failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

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
