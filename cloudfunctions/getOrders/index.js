// CloudBase Get Orders Cloud Function
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

  const {
    status = 'all',
    page = 1,
    pageSize = 10,
    sortField = 'createTime',
    sortOrder = 'desc'
  } = event

  try {
    const condition = { userId: openid }

    if (status !== 'all') {
      condition.status = status
    }

    const countResult = await db.collection('orders')
      .where(condition)
      .count()
    const total = countResult.total

    const orders = await db.collection('orders')
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    const processedOrders = orders.data.map(order => ({
      ...order,
      statusText: getStatusText(order.status),
      actions: getOrderActions(order.status),
      totalQuantity: (order.items || order.products || [])
        .reduce((sum, item) => sum + item.quantity, 0),
      createTimeFormatted: formatDate(order.createTime),
      payTimeFormatted: order.payTime ? formatDate(order.payTime) : '',
      shipTimeFormatted: order.shipTime ? formatDate(order.shipTime) : '',
      completeTimeFormatted: order.completeTime ? formatDate(order.completeTime) : '',
      cancelTimeFormatted: order.cancelTime ? formatDate(order.cancelTime) : ''
    }))

    return {
      success: true,
      data: processedOrders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  } catch (error) {
    console.error('Failed to load orders:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

function getStatusText(status) {
  const map = {
    'unpaid': 'Pending Payment',
    'unshipped': 'Pending Shipment',
    'shipped': 'In Transit',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'refunding': 'Refunding',
    'refunded': 'Refunded'
  }
  return map[status] || 'Unknown'
}

function getOrderActions(status) {
  const actions = []
  if (status === 'unpaid') {
    actions.push({ name: 'pay', text: 'Pay Now' })
    actions.push({ name: 'cancel', text: 'Cancel' })
  } else if (status === 'unshipped') {
    actions.push({ name: 'remind', text: 'Remind Ship' })
  } else if (status === 'shipped') {
    actions.push({ name: 'confirm', text: 'Confirm Receipt' })
    actions.push({ name: 'logistics', text: 'Track' })
  } else if (status === 'completed') {
    actions.push({ name: 'review', text: 'Review' })
    actions.push({ name: 'rebuy', text: 'Buy Again' })
  }
  if (status !== 'cancelled' && status !== 'refunded') {
    actions.push({ name: 'detail', text: 'Details' })
  }
  if (status === 'completed' || status === 'cancelled' || status === 'refunded') {
    actions.push({ name: 'delete', text: 'Delete' })
  }
  return actions
}

function formatDate(dateObj) {
  if (!dateObj) return ''
  const date = new Date(dateObj)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
