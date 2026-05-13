// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const cartCollection = db.collection('cart')
const productsCollection = db.collection('products')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    action,
    productId,
    quantity,
    cartItemIds
  } = event
  
  if (!action) {
    return {
      success: false,
      error: '操作类型不能为空'
    }
  }
  
  try {
    // 根据不同操作类型处理
    switch (action) {
      case 'add':
        return await addToCart(openid, productId, quantity)
      case 'update':
        return await updateCartItem(openid, productId, quantity)
      case 'remove':
        return await removeFromCart(openid, productId)
      case 'clear':
        return await clearCart(openid)
      case 'list':
        return await getCartList(openid)
      case 'batchRemove':
        return await batchRemoveFromCart(openid, cartItemIds)
      case 'checkStock':
        return await checkCartStock(openid)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('管理购物车失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 添加商品到购物车
async function addToCart(userId, productId, quantity = 1) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  // 验证商品是否存在且在售
  const productResult = await productsCollection.doc(productId).get()
  
  if (!productResult.data) {
    return {
      success: false,
      error: '商品不存在'
    }
  }
  
  const product = productResult.data
  
  if (product.status !== 'on_sale') {
    return {
      success: false,
      error: '商品已下架'
    }
  }
  
  if (product.stock < quantity) {
    return {
      success: false,
      error: '商品库存不足'
    }
  }
  
  try {
    // 检查购物车是否已存在该商品
    const cartResult = await cartCollection
      .where({
        userId,
        productId
      })
      .get()
    
    if (cartResult.data.length > 0) {
      // 更新数量
      const cartItem = cartResult.data[0]
      const newQuantity = cartItem.quantity + quantity
      
      if (newQuantity > product.stock) {
        return {
          success: false,
          error: '商品库存不足'
        }
      }
      
      await cartCollection.doc(cartItem._id).update({
        data: {
          quantity: newQuantity,
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        _id: cartItem._id
      }
    } else {
      // 添加新商品
      const result = await cartCollection.add({
        data: {
          userId,
          productId,
          quantity,
          productName: product.name,
          productImage: product.coverImage,
          price: product.price,
          originalPrice: product.originalPrice,
          stock: product.stock,
          selected: true,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        _id: result._id
      }
    }
  } catch (error) {
    throw error
  }
}

// 更新购物车商品数量
async function updateCartItem(userId, productId, quantity) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  if (quantity < 1) {
    return {
      success: false,
      error: '商品数量必须大于0'
    }
  }
  
  try {
    // 验证商品库存
    const productResult = await productsCollection.doc(productId).get()
    
    if (!productResult.data) {
      return {
        success: false,
        error: '商品不存在'
      }
    }
    
    const product = productResult.data
    
    if (product.stock < quantity) {
      return {
        success: false,
        error: '商品库存不足'
      }
    }
    
    // 更新购物车商品数量
    const result = await cartCollection
      .where({
        userId,
        productId
      })
      .update({
        data: {
          quantity,
          updateTime: db.serverDate()
        }
      })
    
    return {
      success: true,
      updated: result.stats.updated
    }
  } catch (error) {
    throw error
  }
}

// 从购物车删除商品
async function removeFromCart(userId, productId) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    const result = await cartCollection
      .where({
        userId,
        productId
      })
      .remove()
    
    return {
      success: true,
      removed: result.stats.removed
    }
  } catch (error) {
    throw error
  }
}

// 批量删除购物车商品
async function batchRemoveFromCart(userId, cartItemIds) {
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    return {
      success: false,
      error: '商品ID列表不能为空'
    }
  }
  
  try {
    const result = await cartCollection
      .where({
        userId,
        _id: _.in(cartItemIds)
      })
      .remove()
    
    return {
      success: true,
      removed: result.stats.removed
    }
  } catch (error) {
    throw error
  }
}

// 清空购物车
async function clearCart(userId) {
  try {
    const result = await cartCollection
      .where({
        userId
      })
      .remove()
    
    return {
      success: true,
      removed: result.stats.removed
    }
  } catch (error) {
    throw error
  }
}

// 获取购物车列表
async function getCartList(userId) {
  try {
    // 获取购物车商品列表
    const cartResult = await cartCollection
      .where({
        userId
      })
      .orderBy('createTime', 'desc')
      .get()
    
    const cartItems = cartResult.data
    
    // 检查商品状态和库存
    for (let item of cartItems) {
      try {
        const productResult = await productsCollection.doc(item.productId).get()
        const product = productResult.data
        
        // 更新商品最新信息
        item.price = product.price
        item.originalPrice = product.originalPrice
        item.stock = product.stock
        item.status = product.status
        
        // 如果商品已下架或库存不足，自动取消选中
        if (product.status !== 'on_sale' || product.stock < item.quantity) {
          item.selected = false
          
          // 更新购物车商品信息
          await cartCollection.doc(item._id).update({
            data: {
              price: product.price,
              originalPrice: product.originalPrice,
              stock: product.stock,
              selected: false,
              updateTime: db.serverDate()
            }
          })
        }
      } catch (error) {
        console.error('获取商品信息失败:', error)
        item.status = 'error'
        item.selected = false
      }
    }
    
    // 计算选中商品总价
    const selectedItems = cartItems.filter(item => item.selected)
    const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalOriginalPrice = selectedItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0)
    
    return {
      success: true,
      data: {
        items: cartItems,
        selectedCount: selectedItems.length,
        totalPrice,
        totalOriginalPrice,
        totalSaved: totalOriginalPrice - totalPrice
      }
    }
  } catch (error) {
    throw error
  }
}

// 检查购物车商品库存
async function checkCartStock(userId) {
  try {
    // 获取购物车中选中的商品
    const cartResult = await cartCollection
      .where({
        userId,
        selected: true
      })
      .get()
    
    const cartItems = cartResult.data
    const stockErrors = []
    
    // 检查每个商品的库存
    for (let item of cartItems) {
      try {
        const productResult = await productsCollection.doc(item.productId).get()
        const product = productResult.data
        
        if (product.status !== 'on_sale') {
          stockErrors.push({
            productId: item.productId,
            productName: item.productName,
            error: '商品已下架'
          })
        } else if (product.stock < item.quantity) {
          stockErrors.push({
            productId: item.productId,
            productName: item.productName,
            error: '库存不足',
            stock: product.stock,
            quantity: item.quantity
          })
        }
      } catch (error) {
        console.error('检查商品库存失败:', error)
        stockErrors.push({
          productId: item.productId,
          productName: item.productName,
          error: '商品信息获取失败'
        })
      }
    }
    
    return {
      success: true,
      hasError: stockErrors.length > 0,
      errors: stockErrors
    }
  } catch (error) {
    throw error
  }
}