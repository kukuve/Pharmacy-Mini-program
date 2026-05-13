// CloudBase Get/Update User Info Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// Get user profile
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    const result = await db.collection('users')
      .where({ openid })
      .get()

    if (result.data.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const user = result.data[0]
    // Remove sensitive data before returning
    delete user._openid

    return {
      success: true,
      data: user
    }
  } catch (error) {
    console.error('Failed to get user info:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
