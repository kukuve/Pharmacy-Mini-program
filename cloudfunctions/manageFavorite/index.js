// CloudBase Manage Favorite Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  const { action, productId, page = 1, pageSize = 10 } = event

  if (!action) {
    return { success: false, error: 'Action is required' }
  }

  try {
    switch (action) {
      case 'add': return await addFavorite(openid, productId)
      case 'remove': return await removeFavorite(openid, productId)
      case 'check': return await checkFavorite(openid, productId)
      case 'list': return await listFavorites(openid, page, pageSize)
      default: return { success: false, error: 'Unsupported action' }
    }
  } catch (error) {
    console.error('Manage favorite failed:', error)
    return { success: false, error: error.message }
  }
}

async function addFavorite(userId, productId) {
  if (!productId) return { success: false, error: 'Product ID is required' }

  const existing = await db.collection('favorites')
    .where({ userId, productId })
    .count()

  if (existing.total > 0) {
    return { success: true, message: 'Already favorited' }
  }

  await db.collection('favorites').add({
    data: {
      userId,
      productId,
      createTime: db.serverDate()
    }
  })

  return { success: true }
}

async function removeFavorite(userId, productId) {
  if (!productId) return { success: false, error: 'Product ID is required' }

  await db.collection('favorites')
    .where({ userId, productId })
    .remove()

  return { success: true }
}

async function checkFavorite(userId, productId) {
  if (!productId) return { success: false, error: 'Product ID is required' }

  const result = await db.collection('favorites')
    .where({ userId, productId })
    .count()

  return { success: true, data: { isFavorite: result.total > 0 } }
}

async function listFavorites(userId, page, pageSize) {
  const countResult = await db.collection('favorites')
    .where({ userId })
    .count()

  const result = await db.collection('favorites')
    .where({ userId })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // Get product details for favorites
  const productIds = result.data.map(f => f.productId)
  let products = []
  if (productIds.length > 0) {
    const productsResult = await db.collection('products')
      .where({ _id: _.in(productIds), status: 'on_sale' })
      .field({
        _id: true, name: true, price: true,
        originalPrice: true, coverImage: true, salesCount: true
      })
      .get()
    products = productsResult.data
  }

  return {
    success: true,
    data: {
      items: result.data,
      products,
      total: countResult.total,
      page,
      pageSize
    }
  }
}
