// CloudBase Home Page Data Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

exports.main = async (event, context) => {
  try {
    const [banners, categories, featured, bestsellers, newArrivals, promotions] =
      await Promise.all([
        getBanners(),
        getCategories(),
        getFeaturedProducts(),
        getBestSellers(),
        getNewArrivals(),
        getPromotions()
      ])

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
    console.error('Failed to load home page data:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

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
    console.error('Failed to load banners:', error)
    return []
  }
}

async function getCategories() {
  try {
    const result = await db.collection('categories')
      .where({
        parentId: null,
        status: 'active'
      })
      .orderBy('order', 'asc')
      .limit(10)
      .get()

    const categories = await Promise.all(
      result.data.map(async (category) => {
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
    console.error('Failed to load categories:', error)
    return []
  }
}

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
    console.error('Failed to load featured products:', error)
    return []
  }
}

async function getBestSellers() {
  try {
    const result = await db.collection('products')
      .where({ status: 'on_sale' })
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
    console.error('Failed to load best sellers:', error)
    return []
  }
}

async function getNewArrivals() {
  try {
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
    console.error('Failed to load new arrivals:', error)
    return []
  }
}

async function getPromotions() {
  try {
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

    const promotions = await Promise.all(
      result.data.map(async (promotion) => {
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
    return promotions.filter(p => p.products.length > 0)
  } catch (error) {
    console.error('Failed to load promotions:', error)
    return []
  }
}
