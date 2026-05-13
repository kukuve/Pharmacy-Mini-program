// CloudBase Manage Product Cloud Function (Admin)
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

  // Check admin permission
  const userResult = await db.collection('users').where({ openid }).get()
  if (userResult.data.length === 0 || userResult.data[0].role !== 'admin') {
    return { success: false, error: 'Admin permission required' }
  }

  const { action, productId, productData } = event

  if (!action) {
    return { success: false, error: 'Action is required' }
  }

  try {
    switch (action) {
      case 'add': return await addProduct(productData)
      case 'update': return await updateProduct(productId, productData)
      case 'delete': return await deleteProduct(productId)
      case 'updateStatus': return await updateProductStatus(productId, productData.status)
      case 'updateStock': return await updateProductStock(productId, productData.stock)
      default: return { success: false, error: 'Unsupported action' }
    }
  } catch (error) {
    console.error('Manage product failed:', error)
    return { success: false, error: error.message }
  }
}

async function addProduct(data) {
  if (!data || !data.name || !data.price) {
    return { success: false, error: 'Product name and price are required' }
  }

  const result = await db.collection('products').add({
    data: {
      ...data,
      status: data.status || 'on_sale',
      stock: data.stock || 0,
      salesCount: 0,
      viewCount: 0,
      rating: 0,
      reviewCount: 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: result._id }
}

async function updateProduct(productId, data) {
  if (!productId) return { success: false, error: 'Product ID is required' }
  if (!data || !data.name || !data.price) {
    return { success: false, error: 'Product name and price are required' }
  }

  await db.collection('products').doc(productId).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: productId }
}

async function deleteProduct(productId) {
  if (!productId) return { success: false, error: 'Product ID is required' }

  await db.collection('products').doc(productId).update({
    data: {
      status: 'deleted',
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: productId }
}

async function updateProductStatus(productId, status) {
  if (!productId) return { success: false, error: 'Product ID is required' }
  if (!status) return { success: false, error: 'Status is required' }

  const validStatuses = ['on_sale', 'off_sale', 'deleted']
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status' }
  }

  await db.collection('products').doc(productId).update({
    data: {
      status,
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: productId, status }
}

async function updateProductStock(productId, stock) {
  if (!productId) return { success: false, error: 'Product ID is required' }
  if (stock === undefined || stock < 0) {
    return { success: false, error: 'Stock must be non-negative' }
  }

  await db.collection('products').doc(productId).update({
    data: {
      stock: parseInt(stock),
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: productId, stock }
}
