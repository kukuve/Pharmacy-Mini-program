// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const productsCollection = db.collection('products')
const MAX_LIMIT = 100

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取请求参数
  const {
    categoryId = '',
    keyword = '',
    sortField = 'createTime',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
    onlyOnSale = true
  } = event
  
  try {
    // 构建查询条件
    const condition = {}
    
    // 只查询上架商品
    if (onlyOnSale) {
      condition.status = 'on_sale'
    }
    
    // 分类筛选
    if (categoryId) {
      condition.categoryId = categoryId
    }
    
    // 关键词搜索
    if (keyword) {
      // 同时搜索名称、描述和关键词
      condition.$or = [
        {
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          description: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          keywords: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        }
      ]
    }
    
    // 计算总数
    const countResult = await productsCollection.where(condition).count()
    const total = countResult.total
    
    // 构建排序对象
    const sortObj = {}
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1
    
    // 查询数据
    const products = await productsCollection
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取分类信息
    let categories = []
    if (products.data.length > 0) {
      // 提取所有分类ID
      const categoryIds = [...new Set(products.data
        .map(product => product.categoryId)
        .filter(id => id))]
      
      if (categoryIds.length > 0) {
        // 查询分类信息
        const categoriesResult = await db.collection('categories')
          .where({
            _id: _.in(categoryIds)
          })
          .field({
            _id: true,
            name: true
          })
          .get()
        
        categories = categoriesResult.data
      }
    }
    
    // 构建分类ID到名称的映射
    const categoryMap = {}
    categories.forEach(category => {
      categoryMap[category._id] = category.name
    })
    
    // 为产品添加分类名称
    const productsWithCategory = products.data.map(product => ({
      ...product,
      categoryName: product.categoryId ? categoryMap[product.categoryId] : ''
    }))
    
    // 返回结果
    return {
      success: true,
      data: productsWithCategory,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}