// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const usersCollection = db.collection('users')
const addressesCollection = db.collection('addresses')
const couponsCollection = db.collection('coupons')
const ordersCollection = db.collection('orders')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    includeAddresses = false,
    includeCoupons = false,
    includeOrderStats = false
  } = event
  
  try {
    // 获取用户基本信息
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const user = userResult.data[0]
    
    // 构建返回结果
    const result = {
      _id: user._id,
      _openid: user._openid,
      userInfo: user.userInfo || {},
      status: user.status,
      createTime: user.createTime,
      lastLoginTime: user.lastLoginTime
    }
    
    // 获取用户地址列表
    if (includeAddresses) {
      const addressesResult = await addressesCollection
        .where({
          userId: openid
        })
        .orderBy('isDefault', 'desc')
        .orderBy('updateTime', 'desc')
        .get()
      
      result.addresses = addressesResult.data
    }
    
    // 获取用户优惠券列表
    if (includeCoupons) {
      const couponsResult = await couponsCollection
        .where({
          userId: openid,
          status: 'unused',
          expiryDate: _.gt(Date.now())
        })
        .orderBy('expiryDate', 'asc')
        .get()
      
      result.coupons = couponsResult.data
    }
    
    // 获取用户订单统计信息
    if (includeOrderStats) {
      // 待付款订单数量
      const unpaidCount = await ordersCollection
        .where({
          userId: openid,
          status: 'unpaid'
        })
        .count()
      
      // 待发货订单数量
      const unshippedCount = await ordersCollection
        .where({
          userId: openid,
          status: 'unshipped'
        })
        .count()
      
      // 待收货订单数量
      const shippedCount = await ordersCollection
        .where({
          userId: openid,
          status: 'shipped'
        })
        .count()
      
      // 待评价订单数量
      const completedCount = await ordersCollection
        .where({
          userId: openid,
          status: 'completed',
          hasReviewed: _.neq(true)
        })
        .count()
      
      // 退款中订单数量
      const refundingCount = await ordersCollection
        .where({
          userId: openid,
          status: 'refunding'
        })
        .count()
      
      result.orderStats = {
        unpaid: unpaidCount.total,
        unshipped: unshippedCount.total,
        shipped: shippedCount.total,
        completed: completedCount.total,
        refunding: refundingCount.total
      }
    }
    
    // 返回结果
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}