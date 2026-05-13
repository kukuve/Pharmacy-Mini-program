// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const MAX_LIMIT = 100

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 并行获取各部分数据
    const [
      banners,
      categories,
      featured,
      bestsellers,
      newArrivals,
      promotions
    ] = await Promise.all([
      getBanners(),
      getCategories(),
      getFeaturedProducts(),
      getBestSellers(),
      getNewArrivals(),
      getPromotions()
    ])
    
    // 返回组装的首页数据
    return {
      success: true,
      data: {
        banners,
        categories,
        featured,
        bestsellers,
        newArrivals,
        promotions
      }
    }
  } catch (error) {
    console.error('获取首页数据失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 获取轮播图
async function getBanners() {
  try {
    const result = await db.collection('banners')
      .where({
        status: 'active',
        startTime: _.lte(db.serverDate()),
        endTime: _.gte(db.serverDate())
      })
      .orderBy('order', 'asc')
      .orderBy('createTime', 'desc')
      .get()
    
    return result.data
  } catch (error) {
    console.error('获取轮播图失败:', error)
    return []
  }
}

// 获取药品分类
async function getCategories() {
  try {
    // 获取一级分类
    const result = await db.collection('categories')
      .where({
        parentId: null,
        status: 'active'
      })
      .orderBy('order', 'asc')
      .limit(10)
      .get()
    
    // 获取每个一级分类的子分类
    const categories = await Promise.all(
      result.data.map(async category => {
        const subResult = await db.collection('categories')
          .where({
            parentId: category._id,
            status: 'active'
          })
          .orderBy('order', 'asc')
          .get()
        
        return {
          ...category,
          subCategories: subResult.data
        }
      })
    )
    
    return categories
  } catch (error) {
    console.error('获取分类失败:', error)
    return []
  }
}

// 获取推荐药品
async function getFeaturedProducts() {
  try {
    const result = await db.collection('products')
      .where({
        status: 'on_sale',
        isFeatured: true
      })
      .orderBy('featuredOrder', 'asc')
      .orderBy('updateTime', 'desc')
      .limit(6)
      .field({
        _id: true,
        name: true,
        price: true,
        originalPrice: true,
        coverImage: true,
        salesCount: true,
        rating: true,
        reviewCount: true
      })
      .get()
    
    return result.data
  } catch (error) {
    console.error('获取推荐药品失败:', error)
    return []
  }
}

// 获取热销药品
async function getBestSellers() {
  try {
    const result = await db.collection('products')
      .where({
        status: 'on_sale'
      })
      .orderBy('salesCount', 'desc')
      .orderBy('updateTime', 'desc')
      .limit(10)
      .field({
        _id: true,
        name: true,
        price: true,
        originalPrice: true,
        coverImage: true,
        salesCount: true,
        rating: true,
        reviewCount: true
      })
      .get()
    
    return result.data
  } catch (error) {
    console.error('获取热销药品失败:', error)
    return []
  }
}

// 获取新品上架
async function getNewArrivals() {
  try {
    // 获取30天内上架的商品
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const result = await db.collection('products')
      .where({
        status: 'on_sale',
        createTime: _.gte(thirtyDaysAgo)
      })
      .orderBy('createTime', 'desc')
      .limit(10)
      .field({
        _id: true,
        name: true,
        price: true,
        originalPrice: true,
        coverImage: true,
        salesCount: true,
        rating: true,
        reviewCount: true,
        createTime: true
      })
      .get()
    
    return result.data
  } catch (error) {
    console.error('获取新品上架失败:', error)
    return []
  }
}

// 获取促销活动
async function getPromotions() {
  try {
    // 获取正在进行的促销活动
    const result = await db.collection('promotions')
      .where({
        status: 'active',
        startTime: _.lte(db.serverDate()),
        endTime: _.gte(db.serverDate())
      })
      .orderBy('order', 'asc')
      .orderBy('startTime', 'desc')
      .limit(10)
      .get()
    
    // 获取每个促销活动的商品
    const promotions = await Promise.all(
      result.data.map(async promotion => {
        // 获取促销商品
        const productsResult = await db.collection('products')
          .where({
            _id: _.in(promotion.productIds || []),
            status: 'on_sale'
          })
          .field({
            _id: true,
            name: true,
            price: true,
            originalPrice: true,
            coverImage: true,
            salesCount: true,
            rating: true,
            reviewCount: true
          })
          .get()
        
        return {
          ...promotion,
          products: productsResult.data
        }
      })
    )
    
    // 只返回有商品的促销活动
    return promotions.filter(promotion => promotion.products.length > 0)
  } catch (error) {
    console.error('获取促销活动失败:', error)
    return []
  }
}

// 获取用户个性化推荐
exports.getPersonalizedRecommendations = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取用户最近浏览记录的分类
    const browsingHistory = await db.collection('browsingHistory')
      .where({
        userId: openid
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get()
    
    const viewedProducts = browsingHistory.data
    
    // 获取用户最近浏览商品的分类ID列表
    const productIds = viewedProducts.map(item => item.productId)
    const productsResult = await db.collection('products')
      .where({
        _id: _.in(productIds)
      })
      .field({
        categoryId: true
      })
      .get()
    
    const categoryIds = [...new Set(productsResult.data.map(item => item.categoryId))]
    
    // 基于用户浏览的分类推荐商品
    const recommendedProducts = await db.collection('products')
      .where({
        categoryId: _.in(categoryIds),
        status: 'on_sale',
        _id: _.nin(productIds) // 排除已浏览的商品
      })
      .orderBy('rating', 'desc')
      .orderBy('salesCount', 'desc')
      .limit(10)
      .field({
        _id: true,
        name: true,
        price: true,
        originalPrice: true,
        coverImage: true,
        salesCount: true,
        rating: true,
        reviewCount: true
      })
      .get()
    
    return {
      success: true,
      data: recommendedProducts.data
    }
  } catch (error) {
    console.error('获取个性化推荐失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}