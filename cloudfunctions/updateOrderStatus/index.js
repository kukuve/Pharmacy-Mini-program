// CloudBase Update Order Status Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// Valid status transitions
const VALID_TRANSITIONS = {
  'unpaid': ['cancelled'],
  'unshipped': ['shipped', 'cancelled'],
  'shipped': ['completed'],
  'completed': [],
  'cancelled': [],
  'refunding': ['refunded'],
  'refunded': []
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  const { orderId, status, updateTime } = event

  if (!orderId) {
    return { success: false, error: 'Order ID is required' }
  }

  if (!status) {
    return { success: false, error: 'Status is required' }
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

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[order.status]
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return {
        success: false,
        error: `Cannot change status from '${order.status}' to '${status}'`
      }
    }

    // Build update data
    const updateData = {
      status,
      updateTime: db.serverDate()
    }

    // Add timestamp based on status
    if (status === 'cancelled') {
      updateData.cancelTime = db.serverDate()
    } else if (status === 'completed') {
      updateData.completeTime = db.serverDate()
    } else if (status === 'shipped') {
      updateData.shipTime = db.serverDate()
    }

    await db.collection('orders').doc(orderId).update({
      data: updateData
    })

    // If cancelling, restore stock
    if (status === 'cancelled') {
      const items = order.items || order.products || []
      for (const item of items) {
        await db.collection('products').doc(item.productId).update({
          data: {
            stock: _.inc(item.quantity),
            salesCount: _.inc(-item.quantity)
          }
        }).catch(err =>
          console.error(`Failed to restore stock for ${item.productId}:`, err)
        )
      }
    }

    return {
      success: true,
      data: {
        orderId,
        status,
        updateTime: updateTime || Date.now()
      }
    }
  } catch (error) {
    console.error('Update order status failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
