// CloudBase Get Order Detail Cloud Function
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

  const { orderId } = event

  if (!orderId) {
    return { success: false, error: 'Order ID is required' }
  }

  try {
    const orderResult = await db.collection('orders').doc(orderId).get()

    if (!orderResult.data) {
      return { success: false, error: 'Order not found' }
    }

    const order = orderResult.data

    if (order.userId !== openid) {
      return { success: false, error: 'Access denied' }
    }

    // Get logistics info
    let logistics = null
    if (order.logisticsId) {
      try {
        const logisticsResult = await db.collection('logistics')
          .doc(order.logisticsId)
          .get()
        if (logisticsResult.data) {
          logistics = logisticsResult.data
        }
      } catch (err) {
        console.error('Failed to load logistics:', err)
      }
    }

    // Get payment info
    let payment = null
    if (order.paymentId) {
      try {
        const paymentResult = await db.collection('payments')
          .doc(order.paymentId)
          .get()
        if (paymentResult.data) {
          payment = paymentResult.data
        }
      } catch (err) {
        console.error('Failed to load payment:', err)
      }
    }

    const statusTextMap = {
      'unpaid': 'Pending Payment',
      'unshipped': 'Pending Shipment',
      'shipped': 'In Transit',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'refunding': 'Refunding',
      'refunded': 'Refunded'
    }

    const actions = []
    if (order.status === 'unpaid') {
      actions.push({ name: 'pay', text: 'Pay Now' })
      actions.push({ name: 'cancel', text: 'Cancel' })
    } else if (order.status === 'unshipped') {
      actions.push({ name: 'remind', text: 'Remind Ship' })
    } else if (order.status === 'shipped') {
      actions.push({ name: 'confirm', text: 'Confirm Receipt' })
      actions.push({ name: 'logistics', text: 'Track' })
    } else if (order.status === 'completed') {
      actions.push({ name: 'review', text: 'Review' })
      actions.push({ name: 'rebuy', text: 'Buy Again' })
    }

    if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'refunded') {
      actions.push({ name: 'delete', text: 'Delete' })
    }

    const totalQuantity = (order.items || order.products || [])
      .reduce((sum, item) => sum + item.quantity, 0)

    return {
      success: true,
      data: {
        ...order,
        statusText: statusTextMap[order.status] || 'Unknown',
        actions,
        totalQuantity,
        logistics,
        payment,
        createTimeFormatted: formatDate(order.createTime),
        payTimeFormatted: order.payTime ? formatDate(order.payTime) : '',
        shipTimeFormatted: order.shipTime ? formatDate(order.shipTime) : '',
        completeTimeFormatted: order.completeTime ? formatDate(order.completeTime) : '',
        cancelTimeFormatted: order.cancelTime ? formatDate(order.cancelTime) : ''
      }
    }
  } catch (error) {
    console.error('Failed to load order detail:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

function formatDate(dateObj) {
  if (!dateObj) return ''
  const date = new Date(dateObj)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}
