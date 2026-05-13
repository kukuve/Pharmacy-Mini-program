// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const categoriesCollection = db.collection('categories')
const productsCollection = db.collection('products')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    action,
    categoryId,
    categoryData,
    parentId,
    status,
    includeProducts = false
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
        return await addCategory(categoryData)
      case 'update':
        return await updateCategory(categoryId, categoryData)
      case 'delete':
        return await deleteCategory(categoryId)
      case 'list':
        return await listCategories(parentId, status)
      case 'tree':
        return await getCategoryTree(includeProducts)
      case 'updateStatus':
        return await updateCategoryStatus(categoryId, status)
      case 'updateOrder':
        return await updateCategoryOrder(categoryData)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('管理分类失败:', error)
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

// 添加分类
async function addCategory(categoryData) {
  // 验证必要字段
  if (!categoryData.name) {
    return {
      success: false,
      error: '分类名称不能为空'
    }
  }
  
  try {
    // 如果有父分类，验证父分类是否存在
    if (categoryData.parentId) {
      const parentResult = await categoriesCollection.doc(categoryData.parentId).get()
      
      if (!parentResult.data) {
        return {
          success: false,
          error: '父分类不存在'
        }
      }
    }
    
    // 检查同级分类中是否有重名
    const sameNameResult = await categoriesCollection
      .where({
        name: categoryData.name,
        parentId: categoryData.parentId || null
      })
      .count()
    
    if (sameNameResult.total > 0) {
      return {
        success: false,
        error: '同级分类中已存在相同名称'
      }
    }
    
    // 获取同级分类的最大排序值
    const maxOrderResult = await categoriesCollection
      .where({
        parentId: categoryData.parentId || null
      })
      .orderBy('order', 'desc')
      .limit(1)
      .get()
    
    const maxOrder = maxOrderResult.data.length > 0 ? maxOrderResult.data[0].order : 0
    
    // 添加分类
    const result = await categoriesCollection.add({
      data: {
        ...categoryData,
        order: categoryData.order || maxOrder + 10, // 默认排序值为最大值+10
        status: categoryData.status || 'active', // 默认状态为活跃
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

// 更新分类
async function updateCategory(categoryId, categoryData) {
  if (!categoryId) {
    return {
      success: false,
      error: '分类ID不能为空'
    }
  }
  
  try {
    // 获取当前分类信息
    const categoryResult = await categoriesCollection.doc(categoryId).get()
    
    if (!categoryResult.data) {
      return {
        success: false,
        error: '分类不存在'
      }
    }
    
    const currentCategory = categoryResult.data
    
    // 如果更新了父分类，验证新父分类是否存在
    if (categoryData.parentId !== undefined && categoryData.parentId !== currentCategory.parentId) {
      // 不能将分类设为自己的子分类
      if (categoryData.parentId === categoryId) {
        return {
          success: false,
          error: '不能将分类设为自己的子分类'
        }
      }
      
      // 不能将分类设为自己的后代分类
      const descendants = await getAllDescendants(categoryId)
      if (descendants.includes(categoryData.parentId)) {
        return {
          success: false,
          error: '不能将分类设为自己的后代分类'
        }
      }
      
      // 验证新父分类是否存在
      if (categoryData.parentId) {
        const parentResult = await categoriesCollection.doc(categoryData.parentId).get()
        
        if (!parentResult.data) {
          return {
            success: false,
            error: '父分类不存在'
          }
        }
      }
    }
    
    // 如果更新了名称，检查同级分类中是否有重名
    if (categoryData.name && categoryData.name !== currentCategory.name) {
      const parentId = categoryData.parentId !== undefined ? categoryData.parentId : currentCategory.parentId
      
      const sameNameResult = await categoriesCollection
        .where({
          name: categoryData.name,
          parentId: parentId || null,
          _id: _.neq(categoryId)
        })
        .count()
      
      if (sameNameResult.total > 0) {
        return {
          success: false,
          error: '同级分类中已存在相同名称'
        }
      }
    }
    
    // 更新分类
    await categoriesCollection.doc(categoryId).update({
      data: {
        ...categoryData,
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      _id: categoryId
    }
  } catch (error) {
    throw error
  }
}

// 删除分类
async function deleteCategory(categoryId) {
  if (!categoryId) {
    return {
      success: false,
      error: '分类ID不能为空'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 检查是否有子分类
    const childrenResult = await transaction.collection('categories')
      .where({
        parentId: categoryId
      })
      .count()
    
    if (childrenResult.total > 0) {
      await transaction.rollback()
      return {
        success: false,
        error: '存在子分类，无法删除'
      }
    }
    
    // 检查是否有关联的商品
    const productsResult = await transaction.collection('products')
      .where({
        categoryId
      })
      .count()
    
    if (productsResult.total > 0) {
      await transaction.rollback()
      return {
        success: false,
        error: '分类下存在商品，无法删除'
      }
    }
    
    // 删除分类
    await transaction.collection('categories').doc(categoryId).remove()
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      _id: categoryId
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}

// 获取分类列表
async function listCategories(parentId, status) {
  try {
    // 构建查询条件
    const condition = {}
    
    if (parentId !== undefined) {
      condition.parentId = parentId || null
    }
    
    if (status) {
      condition.status = status
    }
    
    // 获取分类列表
    const categoriesResult = await categoriesCollection
      .where(condition)
      .orderBy('order', 'asc')
      .orderBy('createTime', 'asc')
      .get()
    
    return {
      success: true,
      data: categoriesResult.data
    }
  } catch (error) {
    throw error
  }
}

// 获取分类树结构
async function getCategoryTree(includeProducts) {
  try {
    // 获取所有分类
    const categoriesResult = await categoriesCollection
      .orderBy('order', 'asc')
      .orderBy('createTime', 'asc')
      .get()
    
    const categories = categoriesResult.data
    
    // 构建分类树
    const categoryMap = {}
    const rootCategories = []
    
    // 先将所有分类放入map
    categories.forEach(category => {
      categoryMap[category._id] = {
        ...category,
        children: []
      }
    })
    
    // 构建父子关系
    categories.forEach(category => {
      if (category.parentId) {
        if (categoryMap[category.parentId]) {
          categoryMap[category.parentId].children.push(categoryMap[category._id])
        } else {
          rootCategories.push(categoryMap[category._id])
        }
      } else {
        rootCategories.push(categoryMap[category._id])
      }
    })
    
    // 如果需要包含商品信息
    if (includeProducts) {
      // 获取所有商品
      const productsResult = await productsCollection
        .where({
          status: 'on_sale'
        })
        .field({
          _id: true,
          name: true,
          categoryId: true,
          price: true,
          coverImage: true
        })
        .get()
      
      const products = productsResult.data
      
      // 将商品添加到对应分类
      products.forEach(product => {
        if (categoryMap[product.categoryId]) {
          if (!categoryMap[product.categoryId].products) {
            categoryMap[product.categoryId].products = []
          }
          categoryMap[product.categoryId].products.push(product)
        }
      })
    }
    
    return {
      success: true,
      data: rootCategories
    }
  } catch (error) {
    throw error
  }
}

// 更新分类状态
async function updateCategoryStatus(categoryId, status) {
  if (!categoryId) {
    return {
      success: false,
      error: '分类ID不能为空'
    }
  }
  
  if (!['active', 'inactive'].includes(status)) {
    return {
      success: false,
      error: '分类状态无效'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 更新分类状态
    await transaction.collection('categories').doc(categoryId).update({
      data: {
        status,
        updateTime: db.serverDate()
      }
    })
    
    // 如果设为不活跃，同时更新所有子分类
    if (status === 'inactive') {
      const descendants = await getAllDescendants(categoryId)
      
      if (descendants.length > 0) {
        await transaction.collection('categories')
          .where({
            _id: _.in(descendants)
          })
          .update({
            data: {
              status,
              updateTime: db.serverDate()
            }
          })
      }
    }
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      _id: categoryId
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}

// 更新分类顺序
async function updateCategoryOrder(categoryData) {
  if (!Array.isArray(categoryData) || categoryData.length === 0) {
    return {
      success: false,
      error: '分类数据无效'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    const results = []
    
    for (const data of categoryData) {
      if (!data._id || typeof data.order !== 'number') {
        continue
      }
      
      try {
        await transaction.collection('categories').doc(data._id).update({
          data: {
            order: data.order,
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

// 获取所有后代分类ID
async function getAllDescendants(categoryId) {
  const descendants = []
  
  async function getChildren(parentId) {
    const childrenResult = await categoriesCollection
      .where({
        parentId
      })
      .field({
        _id: true
      })
      .get()
    
    const children = childrenResult.data
    
    for (const child of children) {
      descendants.push(child._id)
      await getChildren(child._id)
    }
  }
  
  await getChildren(categoryId)
  
  return descendants
}