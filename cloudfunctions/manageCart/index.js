// CloudBase Manage Cart Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { action, productId, quantity, cartItemIds } = event

  if (!openid) {
    return { success: false, error: 'Authentication required' }
  }

  if (!action) {
    return { success: false, error: 'Action is required' }
  }

  try {
    switch (action) {
      case 'add':
        return await addToCart(openid, productId, quantity)
      case 'update':
        return await updateCartItem(openid, productId, quantity)
      case 'remove':
        return await removeFromCart(openid, productId)
      case 'clear':
        return await clearCart(openid)
      case 'list':
        return await getCartList(openid)
      case 'batchRemove':
        return await batchRemoveFromCart(openid, cartItemIds)
      case 'checkStock':
        return await checkCartStock(openid)
      default:
        return { success: false, error: 'Unsupported action: ' + action }
    }
  } catch (error) {
    console.error('Manage cart failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function addToCart(userId, productId, quantity = 1) {
  if (!productId) {
    return { success: false, error: 'Product ID is required' }
  }

  const productResult = await db.collection('products').doc(productId).get()
  if (!productResult.data) {
    return { success: false, error: 'Product not found' }
  }

  const product = productResult.data

  if (product.status !== 'on_sale') {
    return { success: false, error: 'Product is not available' }
  }

  if (product.stock < quantity) {
    return { success: false, error: 'Insufficient stock' }
  }

  const cartResult = await db.collection('cart')
    .where({ userId, productId })
    .get()

  if (cartResult.data.length > 0) {
    const cartItem = cartResult.data[0]
    const newQuantity = cartItem.quantity + quantity

    if (newQuantity > product.stock) {
      return { success: false, error: 'Insufficient stock' }
    }

    await db.collection('cart').doc(cartItem._id).update({
      data: {
        quantity: newQuantity,
        updateTime: db.serverDate()
      }
    })

    return { success: true, _id: cartItem._id }
  } else {
    const result = await db.collection('cart').add({
      data: {
        userId,
        productId,
        quantity,
        productName: product.name,
        productImage: product.coverImage,
        price: product.price,
        originalPrice: product.originalPrice,
        stock: product.stock,
        selected: true,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return { success: true, _id: result._id }
  }
}

async function updateCartItem(userId, productId, quantity) {
  if (!productId) {
    return { success: false, error: 'Product ID is required' }
  }

  if (quantity < 1) {
    return { success: false, error: 'Quantity must be at least 1' }
  }

  const productResult = await db.collection('products').doc(productId).get()
  if (!productResult.data) {
    return { success: false, error: 'Product not found' }
  }

  if (productResult.data.stock < quantity) {
    return { success: false, error: 'Insufficient stock' }
  }

  const result = await db.collection('cart')
    .where({ userId, productId })
    .update({
      data: {
        quantity,
        updateTime: db.serverDate()
      }
    })

  return {
    success: true,
    updated: result.stats.updated
  }
}

async function removeFromCart(userId, productId) {
  if (!productId) {
    return { success: false, error: 'Product ID is required' }
  }

  const result = await db.collection('cart')
    .where({ userId, productId })
    .remove()

  return {
    success: true,
    removed: result.stats.removed
  }
}

async function batchRemoveFromCart(userId, cartItemIds) {
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    return { success: false, error: 'Cart item IDs are required' }
  }

  const result = await db.collection('cart')
    .where({
      userId,
      _id: _.in(cartItemIds)
    })
    .remove()

  return {
    success: true,
    removed: result.stats.removed
  }
}

async function clearCart(userId) {
  const result = await db.collection('cart')
    .where({ userId })
    .remove()

  return {
    success: true,
    removed: result.stats.removed
  }
}

async function getCartList(userId) {
  const cartResult = await db.collection('cart')
    .where({ userId })
    .orderBy('createTime', 'desc')
    .get()

  const cartItems = cartResult.data

  // Update product info in cart
  for (const item of cartItems) {
    try {
      const productResult = await db.collection('products').doc(item.productId).get()
      const product = productResult.data

      item.price = product.price
      item.originalPrice = product.originalPrice
      item.stock = product.stock
      item.status = product.status

      if (product.status !== 'on_sale' || product.stock < item.quantity) {
        item.selected = false
        await db.collection('cart').doc(item._id).update({
          data: {
            price: product.price,
            originalPrice: product.originalPrice,
            stock: product.stock,
            selected: false,
            updateTime: db.serverDate()
          }
        })
      }
    } catch (error) {
      console.error('Failed to get product info for cart item:', error)
      item.status = 'error'
      item.selected = false
    }
  }

  const selectedItems = cartItems.filter(item => item.selected)
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalOriginalPrice = selectedItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0)

  return {
    success: true,
    data: {
      items: cartItems,
      selectedCount: selectedItems.length,
      totalPrice,
      totalOriginalPrice,
      totalSaved: totalOriginalPrice - totalPrice
    }
  }
}

async function checkCartStock(userId) {
  const cartResult = await db.collection('cart')
    .where({ userId, selected: true })
    .get()

  const cartItems = cartResult.data
  const stockErrors = []

  for (const item of cartItems) {
    try {
      const productResult = await db.collection('products').doc(item.productId).get()
      const product = productResult.data

      if (product.status !== 'on_sale') {
        stockErrors.push({
          productId: item.productId,
          productName: item.productName,
          error: 'Product is no longer available'
        })
      } else if (product.stock < item.quantity) {
        stockErrors.push({
          productId: item.productId,
          productName: item.productName,
          error: 'Insufficient stock',
          stock: product.stock,
          quantity: item.quantity
        })
      }
    } catch (error) {
      console.error('Failed to check stock:', error)
      stockErrors.push({
        productId: item.productId,
        productName: item.productName,
        error: 'Failed to verify product'
      })
    }
  }

  return {
    success: true,
    hasError: stockErrors.length > 0,
    errors: stockErrors
  }
}
