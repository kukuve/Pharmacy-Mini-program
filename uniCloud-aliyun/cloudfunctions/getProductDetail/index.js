// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const productsCollection = db.collection('products')
const reviewsCollection = db.collection('reviews')
const categoriesCollection = db.collection('categories')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    productId,
    includeReviews = true,
    reviewLimit = 3
  } = event
  
  if (!productId) {
    return {
      success: false,
      error: '商品ID不能为空'
    }
  }
  
  try {
    // 获取商品详情
    const productResult = await productsCollection.doc(productId).get()
    
    if (!productResult.data) {
      return {
        success: false,
        error: '商品不存在'
      }
    }
    
    const product = productResult.data
    
    // 获取分类信息
    if (product.categoryId) {
      try {
        const categoryResult = await categoriesCollection.doc(product.categoryId).get()
        if (categoryResult.data) {
          product.category = {
            _id: categoryResult.data._id,
            name: categoryResult.data.name
          }
          
          // 获取父分类信息
          if (categoryResult.data.parentId) {
            const parentCategoryResult = await categoriesCollection.doc(categoryResult.data.parentId).get()
            if (parentCategoryResult.data) {
              product.parentCategory = {
                _id: parentCategoryResult.data._id,
                name: parentCategoryResult.data.name
              }
            }
          }
        }
      } catch (error) {
        console.error('获取分类信息失败:', error)
      }
    }
    
    // 获取评价信息
    if (includeReviews) {
      // 获取评价列表
      const reviewsResult = await reviewsCollection
        .where({
          productId
        })
        .orderBy('createTime', 'desc')
        .limit(reviewLimit)
        .get()
      
      product.reviews = reviewsResult.data
      
      // 获取评价统计
      const reviewStats = await reviewsCollection
        .aggregate()
        .match({
          productId
        })
        .group({
          _id: null,
          totalCount: $.sum(1),
          avgRating: $.avg('$rating'),
          fiveStarCount: $.sum($.cond({
            if: $.eq(['$rating', 5]),
            then: 1,
            else: 0
          })),
          fourStarCount: $.sum($.cond({
            if: $.eq(['$rating', 4]),
            then: 1,
            else: 0
          })),
          threeStarCount: $.sum($.cond({
            if: $.eq(['$rating', 3]),
            then: 1,
            else: 0
          })),
          twoStarCount: $.sum($.cond({
            if: $.eq(['$rating', 2]),
            then: 1,
            else: 0
          })),
          oneStarCount: $.sum($.cond({
            if: $.eq(['$rating', 1]),
            then: 1,
            else: 0
          }))
        })
        .end()
      
      if (reviewStats.list.length > 0) {
        product.reviewStats = reviewStats.list[0]
        delete product.reviewStats._id
      } else {
        product.reviewStats = {
          totalCount: 0,
          avgRating: 0,
          fiveStarCount: 0,
          fourStarCount: 0,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0
        }
      }
    }
    
    // 获取相关商品
    const relatedProductsResult = await productsCollection
      .where({
        categoryId: product.categoryId,
        _id: _.neq(productId),
        status: 'on_sale'
      })
      .orderBy('salesCount', 'desc')
      .limit(6)
      .field({
        _id: true,
        name: true,
        price: true,
        originalPrice: true,
        coverImage: true,
        salesCount: true
      })
      .get()
    
    product.relatedProducts = relatedProductsResult.data
    
    // 检查用户是否已收藏该商品
    try {
      const favoriteResult = await db.collection('favorites')
        .where({
          userId: openid,
          productId
        })
        .count()
      
      product.isFavorite = favoriteResult.total > 0
    } catch (error) {
      product.isFavorite = false
      console.error('检查收藏状态失败:', error)
    }
    
    // 增加商品浏览量
    await productsCollection.doc(productId).update({
      data: {
        viewCount: _.inc(1)
      }
    })
    
    // 记录用户浏览历史
    try {
      await db.collection('browsingHistory').add({
        data: {
          userId: openid,
          productId,
          productName: product.name,
          productImage: product.coverImage,
          productPrice: product.price,
          createTime: db.serverDate()
        }
      })
    } catch (error) {
      console.error('记录浏览历史失败:', error)
    }
    
    // 返回结果
    return {
      success: true,
      data: product
    }
  } catch (error) {
    console.error('获取商品详情失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}