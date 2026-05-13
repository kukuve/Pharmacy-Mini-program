// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const couponsCollection = db.collection('coupons')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    action,
    couponId,
    couponData,
    orderAmount,
    status
  } = event
  
  if (!action) {
    return {
      success: false,
      error: '操作类型不能为空'
    }
  }
  
  try {
    // 根据不同操作类型处理
    switch (action) {
      case 'issue':
        return await issueCoupon(openid, couponData)
      case 'validate':
        return await validateCoupon(openid, couponId, orderAmount)
      case 'use':
        return await useCoupon(openid, couponId)
      case 'get':
        return await getCouponDetail(openid, couponId)
      case 'list':
        return await listCoupons(openid, status)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('管理优惠券失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 发放优惠券
async function issueCoupon(userId, couponData) {
  // 验证优惠券数据
  if (!couponData || !couponData.name || !couponData.value || !couponData.minAmount || !couponData.expiryDate) {
    return {
      success: false,
      error: '优惠券信息不完整'
    }
  }
  
  try {
    // 创建优惠券
    const result = await couponsCollection.add({
      data: {
        userId,
        name: couponData.name,
        value: couponData.value,
        minAmount: couponData.minAmount,
        type: couponData.type || 'discount',
        status: 'unused',
        createTime: db.serverDate(),
        expiryDate: new Date(couponData.expiryDate),
        description: couponData.description || `满${couponData.minAmount}元可用`,
        useConditions: couponData.useConditions || [],
        categoryLimit: couponData.categoryLimit || [],
        productLimit: couponData.productLimit || []
      }
    })
    
    return {
      success: true,
      _id: result._id
    }
  } catch (error) {
    throw error
  }
}

// 验证优惠券
async function validateCoupon(userId, couponId, orderAmount) {
  if (!couponId || !orderAmount) {
    return {
      success: false,
      error: '参数不完整'
    }
  }
  
  try {
    // 获取优惠券信息
    const couponResult = await couponsCollection.doc(couponId).get()
    
    if (!couponResult.data) {
      return {
        success: false,
        error: '优惠券不存在'
      }
    }
    
    const coupon = couponResult.data
    
    // 验证优惠券所属用户
    if (coupon.userId !== userId) {
      return {
        success: false,
        error: '无权使用此优惠券'
      }
    }
    
    // 验证优惠券状态
    if (coupon.status !== 'unused') {
      return {
        success: false,
        error: '优惠券已使用或已过期'
      }
    }
    
    // 验证优惠券有效期
    if (coupon.expiryDate < Date.now()) {
      return {
        success: false,
        error: '优惠券已过期'
      }
    }
    
    // 验证订单金额
    if (orderAmount < coupon.minAmount) {
      return {
        success: false,
        error: `订单金额不满${coupon.minAmount}元`
      }
    }
    
    // 计算优惠金额
    let discountAmount = 0
    if (coupon.type === 'discount') {
      discountAmount = Math.min(coupon.value, orderAmount)
    } else if (coupon.type === 'percentage') {
      discountAmount = Math.floor(orderAmount * (coupon.value / 100))
    }
    
    return {
      success: true,
      data: {
        couponId: coupon._id,
        name: coupon.name,
        value: coupon.value,
        type: coupon.type,
        discountAmount
      }
    }
  } catch (error) {
    throw error
  }
}

// 使用优惠券
async function useCoupon(userId, couponId) {
  if (!couponId) {
    return {
      success: false,
      error: '优惠券ID不能为空'
    }
  }
  
  try {
    // 获取优惠券信息
    const couponResult = await couponsCollection.doc(couponId).get()
    
    if (!couponResult.data) {
      return {
        success: false,
        error: '优惠券不存在'
      }
    }
    
    const coupon = couponResult.data
    
    // 验证优惠券所属用户
    if (coupon.userId !== userId) {
      return {
        success: false,
        error: '无权使用此优惠券'
      }
    }
    
    // 验证优惠券状态
    if (coupon.status !== 'unused') {
      return {
        success: false,
        error: '优惠券已使用或已过期'
      }
    }
    
    // 更新优惠券状态
    await couponsCollection.doc(couponId).update({
      data: {
        status: 'used',
        useTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      _id: couponId
    }
  } catch (error) {
    throw error
  }
}

// 获取优惠券详情
async function getCouponDetail(userId, couponId) {
  if (!couponId) {
    return {
      success: false,
      error: '优惠券ID不能为空'
    }
  }
  
  try {
    // 获取优惠券信息
    const couponResult = await couponsCollection.doc(couponId).get()
    
    if (!couponResult.data) {
      return {
        success: false,
        error: '优惠券不存在'
      }
    }
    
    const coupon = couponResult.data
    
    // 验证优惠券所属用户
    if (coupon.userId !== userId) {
      return {
        success: false,
        error: '无权查看此优惠券'
      }
    }
    
    return {
      success: true,
      data: coupon
    }
  } catch (error) {
    throw error
  }
}

// 获取优惠券列表
async function listCoupons(userId, status = 'all') {
  try {
    // 构建查询条件
    const condition = {
      userId
    }
    
    // 根据状态筛选
    if (status !== 'all') {
      condition.status = status
    }
    
    // 查询优惠券列表
    const couponsResult = await couponsCollection
      .where(condition)
      .orderBy('createTime', 'desc')
      .get()
    
    // 处理优惠券状态
    const coupons = couponsResult.data.map(coupon => {
      // 检查是否过期
      if (coupon.status === 'unused' && coupon.expiryDate < Date.now()) {
        return {
          ...coupon,
          status: 'expired'
        }
      }
      return coupon
    })
    
    return {
      success: true,
      data: coupons
    }
  } catch (error) {
    throw error
  }
}