// CloudBase Search Products Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const {
    keyword = '',
    categoryId = '',
    minPrice,
    maxPrice,
    sortField = 'salesCount',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
    saveHistory = true
  } = event

  try {
    const condition = { status: 'on_sale' }

    if (keyword) {
      condition.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }

    if (categoryId) {
      const categoryIds = await getCategoryAndChildren(categoryId)
      condition.categoryId = _.in(categoryIds)
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      condition.price = {}
      if (minPrice !== undefined) condition.price = _.gte(minPrice)
      if (maxPrice !== undefined) condition.price = _.and(
        condition.price,
        _.lte(maxPrice)
      )
    }

    const countResult = await db.collection('products')
      .where(condition)
      .count()
    const total = countResult.total

    const productsResult = await db.collection('products')
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // Save search history
    if (saveHistory && keyword && openid) {
      saveSearchHistory(openid, keyword).catch(err =>
        console.error('Failed to save search history:', err)
      )
    }

    return {
      success: true,
      data: {
        products: productsResult.data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('Failed to search products:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function getCategoryAndChildren(categoryId) {
  const result = [categoryId]
  try {
    const childrenResult = await db.collection('categories')
      .where({ parentId: categoryId })
      .field({ _id: true })
      .get()
    for (const child of childrenResult.data) {
      const grandChildren = await getCategoryAndChildren(child._id)
      result.push(...grandChildren)
    }
  } catch (error) {
    console.error('Failed to get child categories:', error)
  }
  return result
}

async function saveSearchHistory(userId, keyword) {
  try {
    const existing = await db.collection('searchHistory')
      .where({ userId, keyword })
      .get()
    if (existing.data.length > 0) {
      await db.collection('searchHistory').doc(existing.data[0]._id).update({
        data: {
          updateTime: db.serverDate(),
          searchCount: _.inc(1)
        }
      })
    } else {
      await db.collection('searchHistory').add({
        data: {
          userId,
          keyword,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          searchCount: 1
        }
      })

      const MAX_HISTORY = 50
      const historyResult = await db.collection('searchHistory')
        .where({ userId })
        .orderBy('updateTime', 'desc')
        .get()
      if (historyResult.data.length > MAX_HISTORY) {
        const toDelete = historyResult.data
          .slice(MAX_HISTORY)
          .map(item => item._id)
        for (const id of toDelete) {
          await db.collection('searchHistory').doc(id).remove()
        }
      }
    }
  } catch (error) {
    console.error('Failed to save search history:', error)
  }
}
