// CloudBase Get Products Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
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
    const condition = {}

    if (onlyOnSale) {
      condition.status = 'on_sale'
    }

    if (categoryId) {
      condition.categoryId = categoryId
    }

    if (keyword) {
      condition.$or = [
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) },
        { keywords: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }

    const countResult = await db.collection('products')
      .where(condition)
      .count()
    const total = countResult.total

    const products = await db.collection('products')
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // Get category info for products
    let categoryMap = {}
    if (products.data.length > 0) {
      const categoryIds = [...new Set(
        products.data
          .map(p => p.categoryId)
          .filter(Boolean)
      )]
      if (categoryIds.length > 0) {
        const catResult = await db.collection('categories')
          .where({ _id: _.in(categoryIds) })
          .field({ _id: true, name: true })
          .get()
        catResult.data.forEach(c => {
          categoryMap[c._id] = c.name
        })
      }
    }

    const productsWithCategory = products.data.map(p => ({
      ...p,
      categoryName: p.categoryId ? categoryMap[p.categoryId] || '' : ''
    }))

    return {
      success: true,
      data: productsWithCategory,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  } catch (error) {
    console.error('Failed to load products:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
