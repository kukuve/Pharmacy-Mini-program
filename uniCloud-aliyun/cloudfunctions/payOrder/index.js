// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const ordersCollection = db.collection('orders')
const paymentsCollection = db.collection('payments')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const { orderId, payment = {} } = event
  
  if (!orderId) {
    return {
      success: false,
      error: '订单ID不能为空'
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
    
    // 验证订单所属用户
    if (order.userId !== openid) {
      await transaction.rollback()
      return {
        success: false,
        error: '无权操作此订单'
      }
    }
    
    // 验证订单状态
    if (order.status !== 'unpaid') {
      await transaction.rollback()
      return {
        success: false,
        error: '订单状态不正确，无法支付'
      }
    }
    
    // 在实际项目中，这里应该调用微信支付接口
    // 由于微信支付需要商户资质，这里模拟支付过程
    
    // 生成支付流水号
    const paymentNo = generatePaymentNo()
    
    // 创建支付记录
    const paymentData = {
      paymentNo,
      orderId,
      orderNo: order.orderNo,
      userId: openid,
      amount: order.payAmount,
      paymentMethod: payment.method || 'wechat',
      status: 'success',
      createTime: db.serverDate(),
      successTime: db.serverDate(),
      // 微信支付相关信息
      wechatPayment: {
        appId: wxContext.APPID,
        timeStamp: Date.now().toString(),
        nonceStr: Math.random().toString(36).substr(2, 15),
        package: `prepay_id=${paymentNo}`,
        signType: 'MD5',
        paySign: 'simulated_pay_sign' // 实际项目中需要真实签名
      }
    }
    
    const paymentResult = await transaction.collection('payments').add({
      data: paymentData
    })
    
    // 更新订单状态
    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'unshipped',
        payTime: db.serverDate(),
        updateTime: db.serverDate(),
        paymentId: paymentResult._id
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    // 返回结果
    return {
      success: true,
      paymentId: paymentResult._id,
      paymentNo,
      orderStatus: 'unshipped'
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    
    console.error('支付订单失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 生成支付流水号
function generatePaymentNo() {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  const second = now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  return `PAY${year}${month}${day}${hour}${minute}${second}${random}`
}