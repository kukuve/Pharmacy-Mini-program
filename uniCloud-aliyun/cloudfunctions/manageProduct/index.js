// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const productsCollection = db.collection('products')
const categoriesCollection = db.collection('categories')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    action,
    productId,
    productData,
    categoryId,
    status,
    page = 1,
    pageSize = 10,
    sortField = 'createTime',
    sortOrder = 'desc'
  } = event
  
  // 验证管理员权限
  const isAdmin = await checkAdminPermission(openid)
  if (!isAdmin) {
    return {
      success: false,
      error: '无权限执行此操作'
    }
  }
  
  try {
    // 根据不同操作类型处理
    switch (action) {
      case 'add':
        return await addProduct(productData)
      case 'update':
        return await updateProduct(productId, productData)
      case 'delete':
        return await deleteProduct(productId)
      case 'updateStock':
        return await updateProductStock(productId, productData.stock)
      case 'updateStatus':
        return await updateProductStatus(productId, status)
      case 'list':
        return await listProducts(categoryId, status, page, pageSize, sortField, sortOrder)
      case 'batchUpdate':
        return await batchUpdateProducts(productData)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('管理商品失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 验证管理员权限
async function checkAdminPermission(userId) {
  try {
    const userResult = await db.collection('users')
      .where({
        _openid: userId
      })
      .get()
    
    if (userResult.data.length === 0) {
      return false
    }
    
    return userResult.data[0].isAdmin === true
  } catch (error) {
    console.error('验证管理员权限失败:', error)
    return false
  }
}

// 添加商品
async function addProduct(productData) {
  // 验证必要字段
  if (!productData.name || !productData.categoryId || !productData.price) {
    return {
      success: false,
      error: '商品信息不完整'
    }
  }
  
  try {
    // 验证分类是否存在
    const categoryResult = await categoriesCollection.doc(productData.categoryId).get()
    
    if (!categoryResult.data) {
      return {
        success: false,
        error: '分类不存在'
      }
    }
    
    // 添加商品
    const result = await productsCollection.add({
      data: {
        ...productData,
        status: productData.status || 'off_sale', // 默认下架状态
        salesCount: 0,
        favoriteCount: 0,
        viewCount: 0,
        rating: 0,
        reviewCount: 0,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
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

// 更新商品
async function updateProduct(productId, productData) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    // 如果更新分类，验证新分类是否存在
    if (productData.categoryId) {
      const categoryResult = await categoriesCollection.doc(productData.categoryId).get()
      
      if (!categoryResult.data) {
        return {
          success: false,
          error: '分类不存在'
        }
      }
    }
    
    // 更新商品
    await productsCollection.doc(productId).update({
      data: {
        ...productData,
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      _id: productId
    }
  } catch (error) {
    throw error
  }
}

// 删除商品
async function deleteProduct(productId) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    // 检查商品是否可以删除（例如是否有未完成的订单）
    const ordersResult = await db.collection('orders')
      .where({
        'items.productId': productId,
        status: _.in(['unpaid', 'paid', 'shipping'])
      })
      .count()
    
    if (ordersResult.total > 0) {
      return {
        success: false,
        error: '商品存在未完成的订单，无法删除'
      }
    }
    
    // 删除商品
    await productsCollection.doc(productId).remove()
    
    // 删除相关的收藏记录
    await db.collection('favorites')
      .where({
        productId
      })
      .remove()
    
    return {
      success: true,
      _id: productId
    }
  } catch (error) {
    throw error
  }
}

// 更新商品库存
async function updateProductStock(productId, stock) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  if (typeof stock !== 'number' || stock < 0) {
    return {
      success: false,
      error: '库存数量无效'
    }
  }
  
  try {
    await productsCollection.doc(productId).update({
      data: {
        stock,
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      _id: productId
    }
  } catch (error) {
    throw error
  }
}

// 更新商品状态
async function updateProductStatus(productId, status) {
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  if (!['on_sale', 'off_sale'].includes(status)) {
    return {
      success: false,
      error: '商品状态无效'
    }
  }
  
  try {
    await productsCollection.doc(productId).update({
      data: {
        status,
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      _id: productId
    }
  } catch (error) {
    throw error
  }
}

// 获取商品列表
async function listProducts(categoryId, status, page, pageSize, sortField, sortOrder) {
  try {
    // 构建查询条件
    const condition = {}
    
    if (categoryId) {
      condition.categoryId = categoryId
    }
    
    if (status) {
      condition.status = status
    }
    
    // 获取商品总数
    const countResult = await productsCollection
      .where(condition)
      .count()
    
    // 构建排序对象
    const sortObj = {}
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1
    
    // 获取商品列表
    const productsResult = await productsCollection
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取分类信息
    const categoryIds = [...new Set(productsResult.data.map(item => item.categoryId))]
    const categoriesResult = await categoriesCollection
      .where({
        _id: _.in(categoryIds)
      })
      .get()
    
    const categoryMap = {}
    categoriesResult.data.forEach(category => {
      categoryMap[category._id] = category.name
    })
    
    // 组装商品数据
    const products = productsResult.data.map(product => ({
      ...product,
      categoryName: categoryMap[product.categoryId] || '未知分类'
    }))
    
    return {
      success: true,
      data: {
        products,
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

// 批量更新商品
async function batchUpdateProducts(productData) {
  if (!Array.isArray(productData) || productData.length === 0) {
    return {
      success: false,
      error: '商品数据无效'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    const results = []
    
    for (const data of productData) {
      if (!data._id) {
        continue
      }
      
      try {
        await transaction.collection('products').doc(data._id).update({
          data: {
            ...data,
            updateTime: db.serverDate()
          }
        })
        
        results.push({
          _id: data._id,
          success: true
        })
      } catch (error) {
        results.push({
          _id: data._id,
          success: false,
          error: error.message
        })
      }
    }
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      results
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}