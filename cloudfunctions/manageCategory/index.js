// CloudBase Manage Category Cloud Function (Admin)
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

  const { action, categoryId, categoryData } = event

  if (!action) {
    return { success: false, error: 'Action is required' }
  }

  try {
    switch (action) {
      case 'add': return await addCategory(categoryData)
      case 'update': return await updateCategory(categoryId, categoryData)
      case 'delete': return await deleteCategory(categoryId)
      default: return { success: false, error: 'Unsupported action' }
    }
  } catch (error) {
    console.error('Manage category failed:', error)
    return { success: false, error: error.message }
  }
}

async function addCategory(data) {
  if (!data || !data.name) {
    return { success: false, error: 'Category name is required' }
  }

  const result = await db.collection('categories').add({
    data: {
      ...data,
      status: data.status || 'active',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: result._id }
}

async function updateCategory(categoryId, data) {
  if (!categoryId) return { success: false, error: 'Category ID is required' }
  if (!data || !data.name) return { success: false, error: 'Category name is required' }

  await db.collection('categories').doc(categoryId).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  })

  return { success: true, _id: categoryId }
}

async function deleteCategory(categoryId) {
  if (!categoryId) return { success: false, error: 'Category ID is required' }

  // Check if category has subcategories
  const subCount = await db.collection('categories')
    .where({ parentId: categoryId })
    .count()

  if (subCount.total > 0) {
    return { success: false, error: 'Delete subcategories first' }
  }

  await db.collection('categories').doc(categoryId).remove()
  return { success: true }
}
