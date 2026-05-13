exports.main = async (event, context) => {
  const db = uniCloud.database();
  const uniID = require('uni-id')
  const checkInitialized = await db.collection('users').where({role: 'admin'}).count()
  if(checkInitialized.total > 0) {
    return { code: 400, msg: '系统已初始化' }
  }
  const { username, password } = event.adminInfo
  const adminUser = {
    username,
    password: uniID.createHashPassword(password),
    role: 'admin',
    initTime: Date.now()
  }
  await db.collection('users').add(adminUser)
  await db.collection('system_config').add(event.initData)
  return { code: 0, msg: '初始化成功' }
}