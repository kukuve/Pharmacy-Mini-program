'use strict';

const db = uniCloud.database()
const cartCollection = db.collection('cart')
const productCollection = db.collection('product')
const $ = db.command.aggregate
const _ = db.command

exports.main = async (event, context) => {
  const { action, data = {} } = event
  const userId = context.OPENID || 'test-user-id' // 实际项目中应使用真实用户ID
  
  // 根据action执行不同操作
  switch (action) {
    case 'add':
      return await addToCart(data, userId)
    case 'update':
      return await updateCart(data, userId)
    case 'remove':
      return await removeFromCart(data, userId)
    case 'getList':
      return await getCartList(userId)
    case 'clear':
      return await clearCart(userId)
    default:
      return {
        code: 403,
        message: '未知操作'
      }
  }
}

// 添加商品到购物车
async function addToCart(data, userId) {
  try {
    // 检查必填字段
    if (!data.product_id || !data.quantity) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 获取商品信息
    const productInfo = await productCollection.doc(data.product_id).get()
    if (!productInfo.data || productInfo.data.length === 0) {
      return {
        code: 404,
        message: '商品不存在'
      }
    }
    
    const product = productInfo.data[0]
    
    // 检查库存
    if (product.stock < data.quantity) {
      return {
        code: 400,
        message: '商品库存不足'
      }
    }
    
    // 检查购物车中是否已存在该商品
    const cartItem = await cartCollection.where({
      user_id: userId,
      product_id: data.product_id,
      spec: data.spec || ''
    }).get()
    
    if (cartItem.data && cartItem.data.length > 0) {
      // 已存在，更新数量
      const newQuantity = cartItem.data[0].quantity + data.quantity
      
      // 再次检查库存
      if (product.stock < newQuantity) {
        return {
          code: 400,
          message: '商品库存不足'
        }
      }
      
      await cartCollection.doc(cartItem.data[0]._id).update({
        quantity: newQuantity,
        update_date: new Date()
      })
      
      return {
        code: 0,
        message: '添加成功',
        data: {
          id: cartItem.data[0]._id
        }
      }
    } else {
      // 不存在，添加新记录
      const result = await cartCollection.add({
        user_id: userId,
        product_id: data.product_id,
        quantity: data.quantity,
        spec: data.spec || '',
        create_date: new Date(),
        update_date: new Date()
      })
      
      return {
        code: 0,
        message: '添加成功',
        data: {
          id: result.id
        }
      }
    }
  } catch (e) {
    console.error('添加到购物车失败', e)
    return {
      code: 500,
      message: '添加到购物车失败'
    }
  }
}

// 更新购物车商品数量
async function updateCart(data, userId) {
  try {
    // 检查必填字段
    if (!data.id || !data.quantity) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 检查购物车项是否存在
    const cartItem = await cartCollection.doc(data.id).get()
    if (!cartItem.data || cartItem.data.length === 0) {
      return {
        code: 404,
        message: '购物车项不存在'
      }
    }
    
    // 检查是否是当前用户的购物车项
    if (cartItem.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此购物车项'
      }
    }
    
    // 获取商品信息
    const productInfo = await productCollection.doc(cartItem.data[0].product_id).get()
    if (!productInfo.data || productInfo.data.length === 0) {
      return {
        code: 404,
        message: '商品不存在'
      }
    }
    
    const product = productInfo.data[0]
    
    // 检查库存
    if (product.stock < data.quantity) {
      return {
        code: 400,
        message: '商品库存不足'
      }
    }
    
    // 更新购物车项
    await cartCollection.doc(data.id).update({
      quantity: data.quantity,
      update_date: new Date()
    })
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (e) {
    console.error('更新购物车失败', e)
    return {
      code: 500,
      message: '更新购物车失败'
    }
  }
}

// 从购物车中移除商品
async function removeFromCart(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 检查购物车项是否存在
    const cartItem = await cartCollection.doc(data.id).get()
    if (!cartItem.data || cartItem.data.length === 0) {
      return {
        code: 404,
        message: '购物车项不存在'
      }
    }
    
    // 检查是否是当前用户的购物车项
    if (cartItem.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此购物车项'
      }
    }
    
    // 删除购物车项
    await cartCollection.doc(data.id).remove()
    
    return {
      code: 0,
      message: '删除成功'
    }
  } catch (e) {
    console.error('从购物车中移除失败', e)
    return {
      code: 500,
      message: '从购物车中移除失败'
    }
  }
}

// 获取购物车列表
async function getCartList(userId) {
  try {
    // 查询用户的购物车列表
    const result = await cartCollection
      .where({
        user_id: userId
      })
      .orderBy('create_date', 'desc')
      .get()
    
    const cartItems = result.data
    
    // 获取商品详情
    const cartList = []
    for (const item of cartItems) {
      const productInfo = await productCollection.doc(item.product_id).get()
      
      if (productInfo.data && productInfo.data.length > 0) {
        const product = productInfo.data[0]
        
        cartList.push({
          id: item._id,
          product_id: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          spec: item.spec,
          quantity: item.quantity,
          stock: product.stock,
          is_valid: product.status === 1 && product.stock > 0 // 商品状态正常且有库存
        })
      }
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list: cartList
      }
    }
  } catch (e) {
    console.error('获取购物车列表失败', e)
    return {
      code: 500,
      message: '获取购物车列表失败'
    }
  }
}

// 清空购物车
async function clearCart(userId) {
  try {
    // 删除用户的所有购物车项
    await cartCollection.where({
      user_id: userId
    }).remove()
    
    return {
      code: 0,
      message: '清空成功'
    }
  } catch (e) {
    console.error('清空购物车失败', e)
    return {
      code: 500,
      message: '清空购物车失败'
    }
  }
}