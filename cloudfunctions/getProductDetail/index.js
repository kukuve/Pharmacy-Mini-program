// CloudBase Get Product Detail Cloud Function
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { productId, includeReviews = true, reviewLimit = 3 } = event

  if (!productId) {
    return { success: false, error: 'Product ID is required' }
  }

  try {
    const productResult = await db.collection('products')
      .doc(productId)
      .get()

    if (!productResult.data) {
      return { success: false, error: 'Product not found' }
    }

    const product = productResult.data

    // Get category info
    if (product.categoryId) {
      try {
        const catResult = await db.collection('categories')
          .doc(product.categoryId)
          .get()
        if (catResult.data) {
          product.category = {
            _id: catResult.data._id,
            name: catResult.data.name
          }
          if (catResult.data.parentId) {
            const parentResult = await db.collection('categories')
              .doc(catResult.data.parentId)
              .get()
            if (parentResult.data) {
              product.parentCategory = {
                _id: parentResult.data._id,
                name: parentResult.data.name
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load category:', err)
      }
    }

    // Get reviews
    if (includeReviews) {
      const reviewsResult = await db.collection('reviews')
        .where({ productId })
        .orderBy('createTime', 'desc')
        .limit(reviewLimit)
        .get()
      product.reviews = reviewsResult.data

      // Get review stats
      try {
        const $ = db.command.aggregate
        const stats = await db.collection('reviews')
          .aggregate()
          .match({ productId })
          .group({
            _id: null,
            totalCount: $.sum(1),
            avgRating: $.avg('$rating'),
            fiveStarCount: $.sum($.cond({
              if: $.eq(['$rating', 5]), then: 1, else: 0
            })),
            fourStarCount: $.sum($.cond({
              if: $.eq(['$rating', 4]), then: 1, else: 0
            })),
            threeStarCount: $.sum($.cond({
              if: $.eq(['$rating', 3]), then: 1, else: 0
            })),
            twoStarCount: $.sum($.cond({
              if: $.eq(['$rating', 2]), then: 1, else: 0
            })),
            oneStarCount: $.sum($.cond({
              if: $.eq(['$rating', 1]), then: 1, else: 0
            }))
          })
          .end()

        if (stats.list.length > 0) {
          product.reviewStats = stats.list[0]
          delete product.reviewStats._id
        } else {
          product.reviewStats = {
            totalCount: 0, avgRating: 0,
            fiveStarCount: 0, fourStarCount: 0,
            threeStarCount: 0, twoStarCount: 0, oneStarCount: 0
          }
        }
      } catch (err) {
        console.error('Failed to load review stats:', err)
        product.reviewStats = {}
      }
    }

    // Get related products
    const relatedResult = await db.collection('products')
      .where({
        categoryId: product.categoryId,
        _id: _.neq(productId),
        status: 'on_sale'
      })
      .orderBy('salesCount', 'desc')
      .limit(6)
      .field({
        _id: true, name: true, price: true,
        originalPrice: true, coverImage: true, salesCount: true
      })
      .get()
    product.relatedProducts = relatedResult.data

    // Check if favorited
    try {
      const favResult = await db.collection('favorites')
        .where({ userId: openid, productId })
        .count()
      product.isFavorite = favResult.total > 0
    } catch (err) {
      product.isFavorite = false
    }

    // Increment view count (fire and forget)
    db.collection('products').doc(productId).update({
      data: { viewCount: _.inc(1) }
    }).catch(err => console.error('Failed to inc view count:', err))

    // Record browsing history (fire and forget)
    if (openid) {
      db.collection('browsingHistory').add({
        data: {
          userId: openid,
          productId,
          productName: product.name,
          productImage: product.coverImage,
          productPrice: product.price,
          createTime: db.serverDate()
        }
      }).catch(err => console.error('Failed to record history:', err))
    }

    return {
      success: true,
      data: product
    }
  } catch (error) {
    console.error('Failed to load product detail:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
