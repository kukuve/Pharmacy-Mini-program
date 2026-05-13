'use strict';

const db = uniCloud.database()
const orderCollection = db.collection('order')
const orderItemCollection = db.collection('order_item')
const productCollection = db.collection('product')
const addressCollection = db.collection('address')
const cartCollection = db.collection('cart')
const $ = db.command.aggregate
const _ = db.command

exports.main = async (event, context) => {
  const { action, data = {} } = event
  const userId = context.OPENID || 'test-user-id' // 实际项目中应使用真实用户ID
  
  // 根据action执行不同操作
  switch (action) {
    case 'create':
      return await createOrder(data, userId)
    case 'getList':
      return await getOrderList(data, userId)
    case 'getDetail':
      return await getOrderDetail(data, userId)
    case 'cancel':
      return await cancelOrder(data, userId)
    case 'pay':
      return await payOrder(data, userId)
    case 'confirm':
      return await confirmOrder(data, userId)
    case 'delete':
      return await deleteOrder(data, userId)
    default:
      return {
        code: 403,
        message: '未知操作'
      }
  }
}

// 创建订单
async function createOrder(data, userId) {
  const transaction = await db.startTransaction()
  
  try {
    // 检查必填字段
    if (!data.address_id || !data.items || !data.items.length) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 获取地址信息
    const addressInfo = await addressCollection.doc(data.address_id).get()
    if (!addressInfo.data || addressInfo.data.length === 0) {
      return {
        code: 404,
        message: '收货地址不存在'
      }
    }
    
    // 检查是否是当前用户的地址
    if (addressInfo.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权使用此地址'
      }
    }
    
    const address = addressInfo.data[0]
    
    // 生成订单号
    const orderNo = generateOrderNo()
    
    // 计算订单金额
    let totalAmount = 0
    const orderItems = []
    
    // 处理订单商品
    for (const item of data.items) {
      // 获取商品信息
      const productInfo = await productCollection.doc(item.product_id).get()
      if (!productInfo.data || productInfo.data.length === 0) {
        return {
          code: 404,
          message: `商品不存在: ${item.product_id}`
        }
      }
      
      const product = productInfo.data[0]
      
      // 检查库存
      if (product.stock < item.quantity) {
        return {
          code: 400,
          message: `商品 ${product.name} 库存不足`
        }
      }
      
      // 计算商品总价
      const itemAmount = product.price * item.quantity
      totalAmount += itemAmount
      
      // 添加到订单商品列表
      orderItems.push({
        product_id: product._id,
        product_name: product.name,
        product_image: product.image,
        product_price: product.price,
        quantity: item.quantity,
        spec: item.spec || '',
        amount: itemAmount
      })
      
      // 减少商品库存
      await productCollection.doc(product._id).update({
        stock: product.stock - item.quantity,
        sales: (product.sales || 0) + item.quantity
      })
    }
    
    // 添加运费
    const deliveryFee = data.delivery_fee || 0
    totalAmount += deliveryFee
    
    // 创建订单
    const orderResult = await orderCollection.add({
      user_id: userId,
      order_no: orderNo,
      status: 0, // 0: 待支付, 1: 待发货, 2: 待收货, 3: 已完成, 4: 已取消
      total_amount: totalAmount,
      delivery_fee: deliveryFee,
      address: {
        name: address.name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail,
        postal_code: address.postal_code || ''
      },
      payment_method: data.payment_method || 'wechat',
      remark: data.remark || '',
      create_date: new Date(),
      update_date: new Date(),
      payment: null, // 支付信息
      delivery: null, // 物流信息
      cancel_reason: '' // 取消原因
    })
    
    // 创建订单商品
    for (const item of orderItems) {
      await orderItemCollection.add({
        order_id: orderResult.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        product_price: item.product_price,
        quantity: item.quantity,
        spec: item.spec,
        amount: item.amount
      })
    }
    
    // 如果是从购物车下单，删除购物车中的商品
    if (data.from_cart && data.cart_ids && data.cart_ids.length) {
      for (const cartId of data.cart_ids) {
        await cartCollection.doc(cartId).remove()
      }
    }
    
    // 提交事务
    await transaction.commit()
    
    return {
      code: 0,
      message: '创建成功',
      data: {
        id: orderResult.id,
        order_no: orderNo
      }
    }
  } catch (e) {
    // 回滚事务
    await transaction.rollback()
    
    console.error('创建订单失败', e)
    return {
      code: 500,
      message: '创建订单失败'
    }
  }
}

// 获取订单列表
async function getOrderList(data, userId) {
  try {
    const { status, page = 1, size = 10 } = data
    
    // 构建查询条件
    const where = {
      user_id: userId
    }
    
    // 根据状态筛选
    if (status !== undefined && status !== null && status !== '') {
      where.status = parseInt(status)
    }
    
    // 查询订单列表
    const result = await orderCollection
      .where(where)
      .orderBy('create_date', 'desc')
      .skip((page - 1) * size)
      .limit(size)
      .get()
    
    // 查询订单总数
    const countResult = await orderCollection
      .where(where)
      .count()
    
    // 查询订单商品
    const orders = result.data
    for (const order of orders) {
      const itemsResult = await orderItemCollection
        .where({
          order_id: order._id
        })
        .get()
      
      order.items = itemsResult.data
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list: orders,
        total: countResult.total,
        page: parseInt(page),
        size: parseInt(size)
      }
    }
  } catch (e) {
    console.error('获取订单列表失败', e)
    return {
      code: 500,
      message: '获取订单列表失败'
    }
  }
}

// 获取订单详情
async function getOrderDetail(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询订单详情
    const result = await orderCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在'
      }
    }
    
    const order = result.data[0]
    
    // 检查是否是当前用户的订单
    if (order.user_id !== userId) {
      return {
        code: 403,
        message: '无权查看此订单'
      }
    }
    
    // 查询订单商品
    const itemsResult = await orderItemCollection
      .where({
        order_id: order._id
      })
      .get()
    
    order.items = itemsResult.data
    
    return {
      code: 0,
      message: '获取成功',
      data: order
    }
  } catch (e) {
    console.error('获取订单详情失败', e)
    return {
      code: 500,
      message: '获取订单详情失败'
    }
  }
}

// 取消订单
async function cancelOrder(data, userId) {
  const transaction = await db.startTransaction()
  
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询订单详情
    const result = await orderCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在'
      }
    }
    
    const order = result.data[0]
    
    // 检查是否是当前用户的订单
    if (order.user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此订单'
      }
    }
    
    // 检查订单状态，只有待支付和待发货的订单可以取消
    if (order.status !== 0 && order.status !== 1) {
      return {
        code: 400,
        message: '当前订单状态不可取消'
      }
    }
    
    // 查询订单商品
    const itemsResult = await orderItemCollection
      .where({
        order_id: order._id
      })
      .get()
    
    const items = itemsResult.data
    
    // 恢复商品库存
    for (const item of items) {
      await productCollection.doc(item.product_id).update({
        stock: _.inc(item.quantity),
        sales: _.inc(-item.quantity)
      })
    }
    
    // 更新订单状态
    await orderCollection.doc(data.id).update({
      status: 4, // 已取消
      cancel_reason: data.reason || '用户取消',
      update_date: new Date()
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      code: 0,
      message: '取消成功'
    }
  } catch (e) {
    // 回滚事务
    await transaction.rollback()
    
    console.error('取消订单失败', e)
    return {
      code: 500,
      message: '取消订单失败'
    }
  }
}

// 支付订单
async function payOrder(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询订单详情
    const result = await orderCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在'
      }
    }
    
    const order = result.data[0]
    
    // 检查是否是当前用户的订单
    if (order.user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此订单'
      }
    }
    
    // 检查订单状态，只有待支付的订单可以支付
    if (order.status !== 0) {
      return {
        code: 400,
        message: '当前订单状态不可支付'
      }
    }
    
    // 更新订单状态
    await orderCollection.doc(data.id).update({
      status: 1, // 待发货
      payment: {
        method: data.payment_method || order.payment_method,
        amount: order.total_amount,
        status: 1, // 已支付
        time: new Date()
      },
      update_date: new Date()
    })
    
    return {
      code: 0,
      message: '支付成功'
    }
  } catch (e) {
    console.error('支付订单失败', e)
    return {
      code: 500,
      message: '支付订单失败'
    }
  }
}

// 确认收货
async function confirmOrder(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询订单详情
    const result = await orderCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在'
      }
    }
    
    const order = result.data[0]
    
    // 检查是否是当前用户的订单
    if (order.user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此订单'
      }
    }
    
    // 检查订单状态，只有待收货的订单可以确认收货
    if (order.status !== 2) {
      return {
        code: 400,
        message: '当前订单状态不可确认收货'
      }
    }
    
    // 更新订单状态
    await orderCollection.doc(data.id).update({
      status: 3, // 已完成
      update_date: new Date()
    })
    
    return {
      code: 0,
      message: '确认收货成功'
    }
  } catch (e) {
    console.error('确认收货失败', e)
    return {
      code: 500,
      message: '确认收货失败'
    }
  }
}

// 删除订单
async function deleteOrder(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询订单详情
    const result = await orderCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在'
      }
    }
    
    const order = result.data[0]
    
    // 检查是否是当前用户的订单
    if (order.user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此订单'
      }
    }
    
    // 检查订单状态，只有已完成或已取消的订单可以删除
    if (order.status !== 3 && order.status !== 4) {
      return {
        code: 400,
        message: '当前订单状态不可删除'
      }
    }
    
    // 删除订单商品
    await orderItemCollection.where({
      order_id: order._id
    }).remove()
    
    // 删除订单
    await orderCollection.doc(data.id).remove()
    
    return {
      code: 0,
      message: '删除成功'
    }
  } catch (e) {
    console.error('删除订单失败', e)
    return {
      code: 500,
      message: '删除订单失败'
    }
  }
}

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear().toString().slice(2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  const second = now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`
}