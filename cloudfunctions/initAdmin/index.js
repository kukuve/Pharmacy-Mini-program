// CloudBase Init Admin Cloud Function
// Creates the first admin user - should be invoked once during setup
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    // Check for existing admin
    const adminCount = await db.collection('users')
      .where({ role: 'admin' })
      .count()

    if (adminCount.total > 0) {
      return { success: false, error: 'Admin user already exists' }
    }

    // Upgrade current user to admin
    const userResult = await db.collection('users')
      .where({ openid })
      .get()

    if (userResult.data.length === 0) {
      return { success: false, error: 'User not found, please login first' }
    }

    await db.collection('users').doc(userResult.data[0]._id).update({
      data: {
        role: 'admin',
        updateTime: db.serverDate()
      }
    })

    // Create default categories
    const defaultCategories = [
      { name: 'Prescription Drugs', order: 1, status: 'active' },
      { name: 'OTC Medicines', order: 2, status: 'active' },
      { name: 'Health Supplements', order: 3, status: 'active' },
      { name: 'Medical Devices', order: 4, status: 'active' },
      { name: 'Personal Care', order: 5, status: 'active' }
    ]

    for (const cat of defaultCategories) {
      await db.collection('categories').add({
        data: {
          ...cat,
          parentId: null,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }

    return {
      success: true,
      message: 'Admin initialized successfully with default categories'
    }
  } catch (error) {
    console.error('Init admin failed:', error)
    return { success: false, error: error.message }
  }
}
