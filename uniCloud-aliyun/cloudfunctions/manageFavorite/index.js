// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const favoritesCollection = db.collection('favorites')
const productsCollection = db.collection('products')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    action,
    productId,
    productIds,
    page = 1,
    pageSize = 10
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
        return await addFavorite(openid, productId)
      case 'remove':
        return await removeFavorite(openid, productId)
      case 'list':
        return await listFavorites(openid, page, pageSize)
      case 'check':
        return await checkFavorite(openid, productId)
      case 'batchAdd':
        return await batchAddFavorites(openid, productIds)
      case 'batchRemove':
        return await batchRemoveFavorites(openid, productIds)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('管理收藏失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 添加收藏
async function addFavorite(userId, productId) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    // 验证商品是否存在
    const productResult = await productsCollection.doc(productId).get()
    
    if (!productResult.data) {
      return {
        success: false,
        error: '商品不存在'
      }
    }
    
    const product = productResult.data
    
    // 检查是否已收藏
    const favoriteResult = await favoritesCollection
      .where({
        userId,
        productId
      })
      .count()
    
    if (favoriteResult.total > 0) {
      return {
        success: true,
        message: '商品已收藏'
      }
    }
    
    // 添加收藏
    const result = await favoritesCollection.add({
      data: {
        userId,
        productId,
        productName: product.name,
        productImage: product.coverImage,
        price: product.price,
        originalPrice: product.originalPrice,
        createTime: db.serverDate()
      }
    })
    
    // 更新商品收藏数
    await productsCollection.doc(productId).update({
      data: {
        favoriteCount: _.inc(1)
      }
    })
    
    return {
      success: true,
      _id: result._id
    }
  } catch (error) {
    throw error
  }
}

// 取消收藏
async function removeFavorite(userId, productId) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    // 删除收藏
    const result = await favoritesCollection
      .where({
        userId,
        productId
      })
      .remove()
    
    if (result.stats.removed > 0) {
      // 更新商品收藏数
      await productsCollection.doc(productId).update({
        data: {
          favoriteCount: _.inc(-1)
        }
      })
    }
    
    return {
      success: true,
      removed: result.stats.removed
    }
  } catch (error) {
    throw error
  }
}

// 获取收藏列表
async function listFavorites(userId, page, pageSize) {
  try {
    // 获取收藏总数
    const countResult = await favoritesCollection
      .where({
        userId
      })
      .count()
    
    // 获取收藏列表
    const favoritesResult = await favoritesCollection
      .where({
        userId
      })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取最新的商品信息
    const favorites = await Promise.all(
      favoritesResult.data.map(async item => {
        try {
          const productResult = await productsCollection.doc(item.productId).get()
          
          if (productResult.data) {
            const product = productResult.data
            return {
              ...item,
              productName: product.name,
              productImage: product.coverImage,
              price: product.price,
              originalPrice: product.originalPrice,
              status: product.status,
              stock: product.stock
            }
          }
          
          return item
        } catch (error) {
          console.error('获取商品信息失败:', error)
          return {
            ...item,
            status: 'error'
          }
        }
      })
    )
    
    return {
      success: true,
      data: {
        favorites,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    }
  } catch (error) {
    throw error
  }
}

// 检查是否已收藏
async function checkFavorite(userId, productId) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    const result = await favoritesCollection
      .where({
        userId,
        productId
      })
      .count()
    
    return {
      success: true,
      isFavorite: result.total > 0
    }
  } catch (error) {
    throw error
  }
}

// 批量添加收藏
async function batchAddFavorites(userId, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return {
      success: false,
      error: '商品ID列表不能为空'
    }
  }
  
  try {
    // 获取商品信息
    const productsResult = await productsCollection
      .where({
        _id: _.in(productIds)
      })
      .get()
    
    const products = productsResult.data
    
    if (products.length === 0) {
      return {
        success: false,
        error: '商品不存在'
      }
    }
    
    // 获取已收藏的商品
    const favoritesResult = await favoritesCollection
      .where({
        userId,
        productId: _.in(productIds)
      })
      .get()
    
    const existingProductIds = favoritesResult.data.map(item => item.productId)
    
    // 过滤出未收藏的商品
    const newProducts = products.filter(product => !existingProductIds.includes(product._id))
    
    if (newProducts.length === 0) {
      return {
        success: true,
        message: '所有商品已收藏',
        added: 0
      }
    }
    
    // 批量添加收藏
    const tasks = newProducts.map(product => {
      return favoritesCollection.add({
        data: {
          userId,
          productId: product._id,
          productName: product.name,
          productImage: product.coverImage,
          price: product.price,
          originalPrice: product.originalPrice,
          createTime: db.serverDate()
        }
      })
    })
    
    await Promise.all(tasks)
    
    // 更新商品收藏数
    for (const product of newProducts) {
      await productsCollection.doc(product._id).update({
        data: {
          favoriteCount: _.inc(1)
        }
      })
    }
    
    return {
      success: true,
      added: newProducts.length
    }
  } catch (error) {
    throw error
  }
}

// 批量取消收藏
async function batchRemoveFavorites(userId, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return {
      success: false,
      error: '商品ID列表不能为空'
    }
  }
  
  try {
    // 删除收藏
    const result = await favoritesCollection
      .where({
        userId,
        productId: _.in(productIds)
      })
      .remove()
    
    if (result.stats.removed > 0) {
      // 更新商品收藏数
      for (const productId of productIds) {
        await productsCollection.doc(productId).update({
          data: {
            favoriteCount: _.inc(-1)
          }
        })
      }
    }
    
    return {
      success: true,
      removed: result.stats.removed
    }
  } catch (error) {
    throw error
  }
}