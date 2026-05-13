const uniID = require('uni-id-common')

exports.main = async (event) => {
  const { code } = event
  const res = await uniID.loginByWeixin({
    code,
    autoRegister: true
  })
  return { token: res.token }
}