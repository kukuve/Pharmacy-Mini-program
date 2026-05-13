// CloudBase Update User Info Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  const { userInfo } = event

  if (!userInfo || typeof userInfo !== 'object') {
    return { success: false, error: 'User info is required' }
  }

  try {
    // Only allow updating safe fields
    const allowedFields = ['nickname', 'avatarUrl', 'phone', 'gender']
    const updateData = {}

    for (const field of allowedFields) {
      if (userInfo[field] !== undefined) {
        updateData[field] = userInfo[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No valid fields to update' }
    }

    updateData.updateTime = db.serverDate()

    const result = await db.collection('users')
      .where({ openid })
      .update({ data: updateData })

    return {
      success: true,
      updated: result.stats.updated
    }
  } catch (error) {
    console.error('Failed to update user info:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
