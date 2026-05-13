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
  // 获取请求参数
  const {
    categoryId,
    page = 1,
    pageSize = 10,
    sortField = 'salesCount',
    sortOrder = 'desc'
  } = event
  
  if (!categoryId) {
    return {
      success: false,
      error: '分类ID不能为空'
    }
  }
  
  try {
    // 获取分类详情
    const categoryResult = await categoriesCollection.doc(categoryId).get()
    
    if (!categoryResult.data) {
      return {
        success: false,
        error: '分类不存在'
      }
    }
    
    const category = categoryResult.data
    
    // 获取父分类信息（如果有）
    let parentCategory = null
    if (category.parentId) {
      try {
        const parentResult = await categoriesCollection.doc(category.parentId).get()
        if (parentResult.data) {
          parentCategory = {
            _id: parentResult.data._id,
            name: parentResult.data.name,
            icon: parentResult.data.icon
          }
        }
      } catch (error) {
        console.error('获取父分类信息失败:', error)
      }
    }
    
    // 获取子分类列表
    const subCategoriesResult = await categoriesCollection
      .where({
        parentId: categoryId
      })
      .orderBy('order', 'asc')
      .get()
    
    const subCategories = subCategoriesResult.data
    
    // 构建查询条件
    const condition = {
      status: 'on_sale'
    }
    
    // 如果有子分类，则查询当前分类及其所有子分类下的产品
    if (subCategories.length > 0) {
      const categoryIds = [categoryId, ...subCategories.map(item => item._id)]
      condition.categoryId = _.in(categoryIds)
    } else {
      condition.categoryId = categoryId
    }
    
    // 计算产品总数
    const countResult = await productsCollection.where(condition).count()
    const total = countResult.total
    
    // 构建排序对象
    const sortObj = {}
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1
    
    // 查询产品列表
    const productsResult = await productsCollection
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    const products = productsResult.data
    
    // 返回结果
    return {
      success: true,
      data: {
        category,
        parentCategory,
        subCategories,
        products,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('获取分类详情失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}