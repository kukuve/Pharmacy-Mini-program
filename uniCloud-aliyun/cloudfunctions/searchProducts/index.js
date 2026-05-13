// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const productsCollection = db.collection('products')
const searchHistoryCollection = db.collection('searchHistory')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    keyword = '',
    categoryId = '',
    minPrice,
    maxPrice,
    sortField = 'salesCount',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
    saveHistory = true
  } = event
  
  try {
    // 构建查询条件
    const condition = {
      status: 'on_sale'
    }
    
    // 关键词搜索
    if (keyword) {
      condition.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }
    
    // 分类筛选
    if (categoryId) {
      // 获取分类及其所有子分类
      const categoryIds = await getCategoryAndChildren(categoryId)
      condition.categoryId = _.in(categoryIds)
    }
    
    // 价格区间筛选
    if (minPrice !== undefined || maxPrice !== undefined) {
      condition.price = {}
      if (minPrice !== undefined) {
        condition.price = _.gte(minPrice)
      }
      if (maxPrice !== undefined) {
        condition.price = _.lte(maxPrice)
      }
    }
    
    // 计算总数
    const countResult = await productsCollection.where(condition).count()
    const total = countResult.total
    
    // 构建排序对象
    const sortObj = {}
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1
    
    // 查询商品列表
    const productsResult = await productsCollection
      .where(condition)
      .orderBy(sortField, sortOrder)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 如果需要保存搜索历史且有关键词
    if (saveHistory && keyword) {
      await saveSearchHistory(openid, keyword)
    }
    
    // 返回结果
    return {
      success: true,
      data: {
        products: productsResult.data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('搜索商品失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 获取分类及其所有子分类
async function getCategoryAndChildren(categoryId) {
  const result = [categoryId]
  
  try {
    // 查询所有子分类
    const childrenResult = await db.collection('categories')
      .where({
        parentId: categoryId
      })
      .field({
        _id: true
      })
      .get()
    
    // 递归获取子分类的子分类
    for (const child of childrenResult.data) {
      const grandChildren = await getCategoryAndChildren(child._id)
      result.push(...grandChildren)
    }
  } catch (error) {
    console.error('获取子分类失败:', error)
  }
  
  return result
}

// 保存搜索历史
async function saveSearchHistory(userId, keyword) {
  try {
    // 查询是否已存在相同搜索记录
    const existingResult = await searchHistoryCollection
      .where({
        userId,
        keyword
      })
      .get()
    
    if (existingResult.data.length > 0) {
      // 更新搜索时间
      await searchHistoryCollection.doc(existingResult.data[0]._id).update({
        data: {
          updateTime: db.serverDate(),
          searchCount: _.inc(1)
        }
      })
    } else {
      // 添加新的搜索记录
      await searchHistoryCollection.add({
        data: {
          userId,
          keyword,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          searchCount: 1
        }
      })
      
      // 限制每个用户的搜索历史数量
      const MAX_HISTORY = 50
      
      // 获取该用户的所有搜索历史
      const historyResult = await searchHistoryCollection
        .where({
          userId
        })
        .orderBy('updateTime', 'desc')
        .get()
      
      // 如果超过限制，删除最早的记录
      if (historyResult.data.length > MAX_HISTORY) {
        const deleteCount = historyResult.data.length - MAX_HISTORY
        const deleteIds = historyResult.data
          .slice(-deleteCount)
          .map(item => item._id)
        
        for (const id of deleteIds) {
          await searchHistoryCollection.doc(id).remove()
        }
      }
    }
  } catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

// 获取搜索历史
exports.getSearchHistory = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取用户的搜索历史
    const historyResult = await searchHistoryCollection
      .where({
        userId: openid
      })
      .orderBy('updateTime', 'desc')
      .limit(10)
      .get()
    
    return {
      success: true,
      data: historyResult.data
    }
  } catch (error) {
    console.error('获取搜索历史失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 清空搜索历史
exports.clearSearchHistory = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 删除用户的所有搜索历史
    await searchHistoryCollection
      .where({
        userId: openid
      })
      .remove()
    
    return {
      success: true
    }
  } catch (error) {
    console.error('清空搜索历史失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 获取热门搜索
exports.getHotSearches = async (event, context) => {
  try {
    // 聚合查询获取最近一周的热门搜索
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const result = await searchHistoryCollection
      .aggregate()
      .match({
        updateTime: _.gte(oneWeekAgo)
      })
      .group({
        _id: '$keyword',
        count: $.sum(1)
      })
      .sort({
        count: -1
      })
      .limit(10)
      .end()
    
    return {
      success: true,
      data: result.list
    }
  } catch (error) {
    console.error('获取热门搜索失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}