// CloudBase Manage Coupon Cloud Function
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

  const { action, couponId, status } = event

  if (!action) {
    return { success: false, error: 'Action is required' }
  }

  try {
    switch (action) {
      case 'list':
        return await listCoupons()
      case 'receive':
        return await receiveCoupon(openid, couponId)
      case 'getMyCoupons':
        return await getMyCoupons(openid, status)
      default:
        return { success: false, error: 'Unsupported action' }
    }
  } catch (error) {
    console.error('Manage coupon failed:', error)
    return { success: false, error: error.message }
  }
}

async function listCoupons() {
  const result = await db.collection('coupons')
    .where({
      status: 'active',
      startTime: _.lte(db.serverDate()),
      endTime: _.gte(db.serverDate())
    })
    .orderBy('value', 'desc')
    .get()

  return { success: true, data: result.data }
}

async function receiveCoupon(userId, couponId) {
  if (!couponId) return { success: false, error: 'Coupon ID is required' }

  const couponResult = await db.collection('coupons').doc(couponId).get()
  if (!couponResult.data) return { success: false, error: 'Coupon not found' }

  const coupon = couponResult.data

  if (coupon.status !== 'active') {
    return { success: false, error: 'Coupon is not available' }
  }

  const existing = await db.collection('userCoupons')
    .where({ userId, couponId })
    .count()

  if (existing.total > 0) {
    return { success: false, error: 'Coupon already claimed' }
  }

  await db.collection('userCoupons').add({
    data: {
      userId,
      couponId,
      couponName: coupon.name,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.minAmount || 0,
      status: 'unused',
      receiveTime: db.serverDate(),
      expiryDate: coupon.endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  })

  return { success: true }
}

async function getMyCoupons(userId, status) {
  const condition = { userId }
  if (status && status !== 'all') {
    condition.status = status
  }

  const result = await db.collection('userCoupons')
    .where(condition)
    .orderBy('receiveTime', 'desc')
    .get()

  return { success: true, data: result.data }
}
