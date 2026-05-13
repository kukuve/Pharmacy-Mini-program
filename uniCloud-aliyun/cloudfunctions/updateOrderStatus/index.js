// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const ordersCollection = db.collection('orders')
const productsCollection = db.collection('products')

// 定义状态转换规则
const statusTransitions = {
  unpaid: ['cancelled'], // 未支付订单可以取消
  unshipped: ['shipped', 'refunding'], // 未发货订单可以发货或申请退款
  shipped: ['completed', 'refunding'], // 已发货订单可以确认收货或申请退款
  completed: ['refunding'], // 已完成订单可以申请退款
  refunding: ['refunded', 'cancelled'], // 退款中订单可以完成退款或取消退款
  refunded: [], // 已退款订单不能再变更状态
  cancelled: [] // 已取消订单不能再变更状态
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    orderId,
    status,
    reason = '',
    logisticsInfo = null
  } = event
  
  if (!orderId || !status) {
    return {
      success: false,
      error: '参数不完整'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 获取订单信息
    const orderResult = await transaction.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      await transaction.rollback()
      return {
        success: false,
        error: '订单不存在'
      }
    }
    
    const order = orderResult.data
    
    // 验证订单所属用户（管理员操作除外）
    if (order.userId !== openid && !event.isAdmin) {
      await transaction.rollback()
      return {
        success: false,
        error: '无权操作此订单'
      }
    }
    
    // 验证状态转换是否合法
    const allowedStatus = statusTransitions[order.status] || []
    if (!allowedStatus.includes(status)) {
      await transaction.rollback()
      return {
        success: false,
        error: '非法的状态转换'
      }
    }
    
    // 准备更新数据
    const updateData = {
      status,
      updateTime: db.serverDate()
    }
    
    // 根据不同状态处理相关业务逻辑
    switch (status) {
      case 'cancelled':
        // 取消订单，返还库存
        updateData.cancelTime = db.serverDate()
        updateData.cancelReason = reason
        
        // 返还商品库存
        for (const product of order.products) {
          await transaction.collection('products').doc(product.productId).update({
            data: {
              stock: _.inc(product.quantity),
              salesCount: _.inc(-product.quantity)
            }
          })
        }
        
        // 如果使用了优惠券，返还优惠券
        if (order.coupon) {
          await transaction.collection('coupons').doc(order.coupon.couponId).update({
            data: {
              status: 'unused',
              usedTime: null,
              orderId: null
            }
          })
        }
        break
        
      case 'shipped':
        // 订单发货
        updateData.shipTime = db.serverDate()
        if (logisticsInfo) {
          // 创建物流记录
          const logisticsResult = await transaction.collection('logistics').add({
            data: {
              ...logisticsInfo,
              orderId,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          updateData.logisticsId = logisticsResult._id
        }
        break
        
      case 'completed':
        // 完成订单
        updateData.completeTime = db.serverDate()
        break
        
      case 'refunding':
        // 申请退款
        updateData.refundReason = reason
        updateData.refundTime = db.serverDate()
        break
        
      case 'refunded':
        // 完成退款，返还库存
        updateData.refundCompleteTime = db.serverDate()
        
        // 返还商品库存
        for (const product of order.products) {
          await transaction.collection('products').doc(product.productId).update({
            data: {
              stock: _.inc(product.quantity),
              salesCount: _.inc(-product.quantity)
            }
          })
        }
        
        // 如果使用了优惠券，返还优惠券
        if (order.coupon) {
          await transaction.collection('coupons').doc(order.coupon.couponId).update({
            data: {
              status: 'unused',
              usedTime: null,
              orderId: null
            }
          })
        }
        break
    }
    
    // 更新订单状态
    await transaction.collection('orders').doc(orderId).update({
      data: updateData
    })
    
    // 提交事务
    await transaction.commit()
    
    // 返回结果
    return {
      success: true,
      status,
      updateTime: updateData.updateTime
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    
    console.error('更新订单状态失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}