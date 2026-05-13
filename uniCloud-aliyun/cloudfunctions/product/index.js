'use strict';

const db = uniCloud.database()
const productCollection = db.collection('product')
const categoryCollection = db.collection('category')
const $ = db.command.aggregate
const _ = db.command

exports.main = async (event, context) => {
  const { action, data = {} } = event
  
  // 根据action执行不同操作
  switch (action) {
    case 'getList':
      return await getProductList(data)
    case 'getDetail':
      return await getProductDetail(data)
    case 'getRecommend':
      return await getRecommendProducts(data)
    case 'search':
      return await searchProducts(data)
    case 'getCategoryList':
      return await getCategoryList()
    default:
      return {
        code: 403,
        message: '未知操作'
      }
  }
}

// 获取商品列表
async function getProductList(data) {
  try {
    const { category_id, page = 1, size = 10, sort = 'create_date', order = 'desc' } = data
    
    // 构建查询条件
    const where = {
      status: 1 // 只查询上架的商品
    }
    
    // 根据分类筛选
    if (category_id) {
      where.category_id = category_id
    }
    
    // 构建排序条件
    let orderBy = {}
    orderBy[sort] = order === 'desc' ? -1 : 1
    
    // 查询商品列表
    const result = await productCollection
      .where(where)
      .orderBy(sort, order)
      .skip((page - 1) * size)
      .limit(size)
      .get()
    
    // 查询商品总数
    const countResult = await productCollection
      .where(where)
      .count()
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list: result.data,
        total: countResult.total,
        page: parseInt(page),
        size: parseInt(size)
      }
    }
  } catch (e) {
    console.error('获取商品列表失败', e)
    return {
      code: 500,
      message: '获取商品列表失败'
    }
  }
}

// 获取商品详情
async function getProductDetail(data) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询商品详情
    const result = await productCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '商品不存在'
      }
    }
    
    const product = result.data[0]
    
    // 增加浏览量
    await productCollection.doc(data.id).update({
      view_count: _.inc(1)
    })
    
    // 获取分类信息
    if (product.category_id) {
      const categoryInfo = await categoryCollection.doc(product.category_id).get()
      if (categoryInfo.data && categoryInfo.data.length > 0) {
        product.category = categoryInfo.data[0]
      }
    }
    
    // 获取相关商品
    const relatedProducts = await productCollection
      .where({
        _id: _.neq(product._id),
        category_id: product.category_id,
        status: 1
      })
      .limit(6)
      .get()
    
    product.related_products = relatedProducts.data
    
    return {
      code: 0,
      message: '获取成功',
      data: product
    }
  } catch (e) {
    console.error('获取商品详情失败', e)
    return {
      code: 500,
      message: '获取商品详情失败'
    }
  }
}

// 获取推荐商品
async function getRecommendProducts(data) {
  try {
    const { limit = 10 } = data
    
    // 查询推荐商品
    const result = await productCollection
      .where({
        status: 1,
        is_recommend: true
      })
      .limit(limit)
      .get()
    
    // 如果推荐商品不足，补充热门商品
    if (result.data.length < limit) {
      const hotProducts = await productCollection
        .where({
          status: 1,
          _id: _.not(_.in(result.data.map(item => item._id)))
        })
        .orderBy('sales', 'desc')
        .limit(limit - result.data.length)
        .get()
      
      result.data = result.data.concat(hotProducts.data)
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data
    }
  } catch (e) {
    console.error('获取推荐商品失败', e)
    return {
      code: 500,
      message: '获取推荐商品失败'
    }
  }
}

// 搜索商品
async function searchProducts(data) {
  try {
    const { keyword, page = 1, size = 10 } = data
    
    if (!keyword) {
      return {
        code: 401,
        message: '缺少搜索关键词'
      }
    }
    
    // 构建查询条件
    const where = {
      status: 1,
      name: new RegExp(keyword, 'i')
    }
    
    // 查询商品列表
    const result = await productCollection
      .where(where)
      .skip((page - 1) * size)
      .limit(size)
      .get()
    
    // 查询商品总数
    const countResult = await productCollection
      .where(where)
      .count()
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        list: result.data,
        total: countResult.total,
        page: parseInt(page),
        size: parseInt(size)
      }
    }
  } catch (e) {
    console.error('搜索商品失败', e)
    return {
      code: 500,
      message: '搜索商品失败'
    }
  }
}

// 获取分类列表
async function getCategoryList() {
  try {
    // 查询所有分类
    const result = await categoryCollection
      .where({
        status: 1
      })
      .orderBy('sort', 'asc')
      .get()
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data
    }
  } catch (e) {
    console.error('获取分类列表失败', e)
    return {
      code: 500,
      message: '获取分类列表失败'
    }
  }
}