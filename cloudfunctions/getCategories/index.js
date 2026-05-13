// CloudBase Get Categories Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { parentId = null, includeProducts = false, productLimit = 3 } = event

  try {
    const condition = {}
    if (parentId) {
      condition.parentId = parentId
    } else {
      condition.parentId = _.eq(null).or(_.eq(''))
    }

    const categoriesResult = await db.collection('categories')
      .where(condition)
      .orderBy('order', 'asc')
      .get()

    const categories = categoriesResult.data

    if (includeProducts && categories.length > 0) {
      for (const category of categories) {
        const productsResult = await db.collection('products')
          .where({
            categoryId: category._id,
            status: 'on_sale'
          })
          .orderBy('salesCount', 'desc')
          .limit(productLimit)
          .field({
            _id: true, name: true, price: true,
            originalPrice: true, coverImage: true, salesCount: true
          })
          .get()
        category.products = productsResult.data

        const subCount = await db.collection('categories')
          .where({ parentId: category._id })
          .count()
        category.hasChildren = subCount.total > 0
      }
    }

    return {
      success: true,
      data: categories
    }
  } catch (error) {
    console.error('Failed to load categories:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
