// CloudBase Login Cloud Function
// Uses CloudBase WeChat Mini Program authentication
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    const db = cloud.database()
    const usersCollection = db.collection('users')

    // Get user info from CloudBase auth context
    const openid = wxContext.OPENID
    const appid = wxContext.APPID
    const unionid = wxContext.UNIONID

    if (!openid) {
      return {
        success: false,
        error: 'Failed to get user identity'
      }
    }

    // Check if user exists, if not create
    const userResult = await usersCollection
      .where({ openid })
      .get()

    if (userResult.data.length === 0) {
      // New user - create profile
      await usersCollection.add({
        data: {
          openid,
          appid,
          unionid: unionid || '',
          nickname: '',
          avatarUrl: '',
          phone: '',
          gender: 0,
          role: 'user',
          status: 'active',
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          lastLoginTime: db.serverDate()
        }
      })
    } else {
      // Existing user - update last login
      await usersCollection.doc(userResult.data[0]._id).update({
        data: {
          lastLoginTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }

    return {
      success: true,
      data: {
        openid,
        appid,
        unionid: unionid || ''
      }
    }
  } catch (err) {
    console.error('Login failed:', err)
    return {
      success: false,
      error: err.message || 'Login failed'
    }
  }
}
