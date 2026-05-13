// CloudBase Manage Address Cloud Function
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

  const { action, addressId, addressData } = event

  if (!action) {
    return { success: false, error: 'Action is required' }
  }

  try {
    switch (action) {
      case 'add': return await addAddress(openid, addressData)
      case 'update': return await updateAddress(openid, addressId, addressData)
      case 'delete': return await deleteAddress(openid, addressId)
      case 'setDefault': return await setDefaultAddress(openid, addressId)
      case 'get': return await getAddress(openid, addressId)
      case 'list': return await listAddresses(openid)
      default: return { success: false, error: 'Unsupported action: ' + action }
    }
  } catch (error) {
    console.error('Manage address failed:', error)
    return { success: false, error: error.message }
  }
}

async function addAddress(userId, addressData) {
  if (!addressData || !addressData.name || !addressData.phone ||
      !addressData.province || !addressData.city || !addressData.district || !addressData.detail) {
    return { success: false, error: 'Incomplete address information' }
  }

  const transaction = await db.startTransaction()

  try {
    if (addressData.isDefault) {
      await transaction.collection('addresses').where({ userId, isDefault: true })
        .update({ data: { isDefault: false, updateTime: db.serverDate() } })
    }

    const countResult = await transaction.collection('addresses').where({ userId }).count()
    if (countResult.total === 0) {
      addressData.isDefault = true
    }

    const result = await transaction.collection('addresses').add({
      data: {
        ...addressData,
        userId,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    await transaction.commit()
    return { success: true, _id: result._id, isDefault: addressData.isDefault }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function updateAddress(userId, addressId, addressData) {
  if (!addressId) return { success: false, error: 'Address ID is required' }

  const addrResult = await db.collection('addresses').doc(addressId).get()
  if (!addrResult.data || addrResult.data.userId !== userId) {
    return { success: false, error: 'Access denied' }
  }

  const transaction = await db.startTransaction()

  try {
    if (addressData.isDefault) {
      await transaction.collection('addresses').where({
        userId, _id: _.neq(addressId), isDefault: true
      }).update({ data: { isDefault: false, updateTime: db.serverDate() } })
    }

    await transaction.collection('addresses').doc(addressId).update({
      data: { ...addressData, updateTime: db.serverDate() }
    })

    await transaction.commit()
    return { success: true, _id: addressId }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function deleteAddress(userId, addressId) {
  if (!addressId) return { success: false, error: 'Address ID is required' }

  const addrResult = await db.collection('addresses').doc(addressId).get()
  if (!addrResult.data || addrResult.data.userId !== userId) {
    return { success: false, error: 'Access denied' }
  }

  const transaction = await db.startTransaction()

  try {
    const address = addrResult.data
    await transaction.collection('addresses').doc(addressId).remove()

    if (address.isDefault) {
      const latestResult = await transaction.collection('addresses')
        .where({ userId })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      if (latestResult.data.length > 0) {
        await transaction.collection('addresses').doc(latestResult.data[0]._id).update({
          data: { isDefault: true, updateTime: db.serverDate() }
        })
      }
    }

    await transaction.commit()
    return { success: true, _id: addressId }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function setDefaultAddress(userId, addressId) {
  if (!addressId) return { success: false, error: 'Address ID is required' }

  const addrResult = await db.collection('addresses').doc(addressId).get()
  if (!addrResult.data || addrResult.data.userId !== userId) {
    return { success: false, error: 'Access denied' }
  }

  const transaction = await db.startTransaction()

  try {
    await transaction.collection('addresses').where({
      userId, _id: _.neq(addressId), isDefault: true
    }).update({ data: { isDefault: false, updateTime: db.serverDate() } })

    await transaction.collection('addresses').doc(addressId).update({
      data: { isDefault: true, updateTime: db.serverDate() }
    })

    await transaction.commit()
    return { success: true, _id: addressId }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function getAddress(userId, addressId) {
  if (!addressId) return { success: false, error: 'Address ID is required' }

  const addrResult = await db.collection('addresses').doc(addressId).get()
  if (!addrResult.data) return { success: false, error: 'Address not found' }
  if (addrResult.data.userId !== userId) return { success: false, error: 'Access denied' }

  return { success: true, data: addrResult.data }
}

async function listAddresses(userId) {
  const result = await db.collection('addresses')
    .where({ userId })
    .orderBy('isDefault', 'desc')
    .orderBy('updateTime', 'desc')
    .get()

  return { success: true, data: result.data }
}
