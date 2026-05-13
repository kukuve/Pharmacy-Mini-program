// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const categoriesCollection = db.collection('categories')

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取请求参数
  const {
    parentId = null,
    includeProducts = false,
    productLimit = 3
  } = event
  
  try {
    // 构建查询条件
    const condition = {}
    
    // 如果指定了父分类ID，则查询该父分类下的子分类
    if (parentId) {
      condition.parentId = parentId
    } else {
      // 否则查询顶级分类
      condition.parentId = _.eq(null).or(_.eq(''))
    }
    
    // 查询分类列表
    const categoriesResult = await categoriesCollection
      .where(condition)
      .orderBy('order', 'asc')
      .get()
    
    const categories = categoriesResult.data
    
    // 如果需要包含产品信息
    if (includeProducts && categories.length > 0) {
      const productsCollection = db.collection('products')
      
      // 为每个分类获取产品
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i]
        
        // 查询该分类下的产品
        const productsResult = await productsCollection
          .where({
            categoryId: category._id,
            status: 'on_sale'
          })
          .orderBy('salesCount', 'desc')
          .limit(productLimit)
          .field({
            _id: true,
            name: true,
            price: true,
            originalPrice: true,
            coverImage: true,
            salesCount: true
          })
          .get()
        
        // 添加产品到分类
        category.products = productsResult.data
        
        // 查询子分类数量
        const subCategoriesCount = await categoriesCollection
          .where({
            parentId: category._id
          })
          .count()
        
        category.hasChildren = subCategoriesCount.total > 0
      }
    }
    
    // 返回结果
    return {
      success: true,
      data: categories
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}