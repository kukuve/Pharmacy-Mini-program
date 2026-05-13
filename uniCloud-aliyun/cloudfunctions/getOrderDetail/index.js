// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const ordersCollection = db.collection('orders')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const { orderId } = event
  
  if (!orderId) {
    return {
      success: false,
      error: '订单ID不能为空'
    }
  }
  
  try {
    // 获取订单详情
    const orderResult = await ordersCollection.doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        success: false,
        error: '订单不存在'
      }
    }
    
    const order = orderResult.data
    
    // 验证订单所属用户
    if (order.userId !== openid) {
      return {
        success: false,
        error: '无权访问此订单'
      }
    }
    
    // 获取物流信息（如果有）
    let logistics = null
    if (order.logisticsId) {
      try {
        const logisticsResult = await db.collection('logistics')
          .doc(order.logisticsId)
          .get()
        
        if (logisticsResult.data) {
          logistics = logisticsResult.data
        }
      } catch (error) {
        console.error('获取物流信息失败:', error)
      }
    }
    
    // 获取支付信息（如果有）
    let payment = null
    if (order.paymentId) {
      try {
        const paymentResult = await db.collection('payments')
          .doc(order.paymentId)
          .get()
        
        if (paymentResult.data) {
          payment = paymentResult.data
        }
      } catch (error) {
        console.error('获取支付信息失败:', error)
      }
    }
    
    // 添加状态文本
    let statusText = ''
    let statusClass = ''
    
    switch (order.status) {
      case 'unpaid':
        statusText = '待付款'
        statusClass = 'warning'
        break
      case 'unshipped':
        statusText = '待发货'
        statusClass = 'primary'
        break
      case 'shipped':
        statusText = '待收货'
        statusClass = 'info'
        break
      case 'completed':
        statusText = '已完成'
        statusClass = 'success'
        break
      case 'cancelled':
        statusText = '已取消'
        statusClass = 'danger'
        break
      case 'refunding':
        statusText = '退款中'
        statusClass = 'warning'
        break
      case 'refunded':
        statusText = '已退款'
        statusClass = 'danger'
        break
      default:
        statusText = '未知状态'
        statusClass = 'default'
    }
    
    // 添加可执行的操作
    const actions = []
    
    if (order.status === 'unpaid') {
      actions.push({
        name: 'pay',
        text: '付款'
      })
      actions.push({
        name: 'cancel',
        text: '取消订单'
      })
    } else if (order.status === 'unshipped') {
      actions.push({
        name: 'remind',
        text: '提醒发货'
      })
    } else if (order.status === 'shipped') {
      actions.push({
        name: 'confirm',
        text: '确认收货'
      })
      actions.push({
        name: 'logistics',
        text: '查看物流'
      })
    } else if (order.status === 'completed') {
      actions.push({
        name: 'review',
        text: '评价'
      })
      actions.push({
        name: 'rebuy',
        text: '再次购买'
      })
    }
    
    // 已完成和已取消的订单可以删除
    if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'refunded') {
      actions.push({
        name: 'delete',
        text: '删除订单'
      })
    }
    
    // 计算订单商品总数
    const totalQuantity = order.products.reduce((sum, product) => sum + product.quantity, 0)
    
    // 格式化时间
    const formattedOrder = {
      ...order,
      statusText,
      statusClass,
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
    
    // 返回结果
    return {
      success: true,
      data: formattedOrder
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 格式化日期
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