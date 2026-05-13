// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const ordersCollection = db.collection('orders')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    status = 'all',
    page = 1,
    pageSize = 10,
    sortField = 'createTime',
    sortOrder = 'desc'
  } = event
  
  try {
    // 构建查询条件
    const condition = {
      userId: openid
    }
    
    // 根据状态筛选
    if (status !== 'all') {
      condition.status = status
    }
    
    // 计算总数
    const countResult = await ordersCollection.where(condition).count()
    const total = countResult.total
    
    // 构建排序对象
    const sortObj = {}
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1
    
    // 查询数据
    const orders = await ordersCollection
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 处理订单数据，添加状态文本和操作按钮
    const processedOrders = orders.data.map(order => {
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
      
      // 除了已取消和已退款的订单外，其他状态都可以查看订单详情
      if (order.status !== 'cancelled' && order.status !== 'refunded') {
        actions.push({
          name: 'detail',
          text: '订单详情'
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
      
      // 返回处理后的订单数据
      return {
        ...order,
        statusText,
        statusClass,
        actions,
        totalQuantity,
        // 格式化时间
        createTimeFormatted: formatDate(order.createTime),
        payTimeFormatted: order.payTime ? formatDate(order.payTime) : '',
        shipTimeFormatted: order.shipTime ? formatDate(order.shipTime) : '',
        completeTimeFormatted: order.completeTime ? formatDate(order.completeTime) : '',
        cancelTimeFormatted: order.cancelTime ? formatDate(order.cancelTime) : ''
      }
    })
    
    // 返回结果
    return {
      success: true,
      data: processedOrders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
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
  
  return `${year}-${month}-${day} ${hour}:${minute}`
}