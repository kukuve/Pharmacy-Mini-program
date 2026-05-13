// CloudBase Pay Order Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  const { orderId, payment = {} } = event

  if (!orderId) {
    return { success: false, error: 'Order ID is required' }
  }

  const transaction = await db.startTransaction()

  try {
    const orderResult = await transaction.collection('orders').doc(orderId).get()

    if (!orderResult.data) {
      await transaction.rollback()
      return { success: false, error: 'Order not found' }
    }

    const order = orderResult.data

    if (order.userId !== openid) {
      await transaction.rollback()
      return { success: false, error: 'Access denied' }
    }

    if (order.status !== 'unpaid') {
      await transaction.rollback()
      return { success: false, error: 'Order cannot be paid in current status' }
    }

    // In production, integrate with WeChat Pay API here
    // For now, simulate payment processing
    const paymentNo = generatePaymentNo()

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
      wechatPayment: {
        appId: wxContext.APPID,
        timeStamp: Date.now().toString(),
        nonceStr: Math.random().toString(36).substr(2, 15),
        package: `prepay_id=${paymentNo}`,
        signType: 'MD5',
        paySign: 'simulated_pay_sign'
      }
    }

    const paymentResult = await transaction.collection('payments').add({
      data: paymentData
    })

    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'unshipped',
        payTime: db.serverDate(),
        updateTime: db.serverDate(),
        paymentId: paymentResult._id
      }
    })

    await transaction.commit()

    return {
      success: true,
      data: {
        paymentId: paymentResult._id,
        paymentNo,
        orderStatus: 'unshipped'
      }
    }
  } catch (error) {
    await transaction.rollback()
    console.error('Pay order failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

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
