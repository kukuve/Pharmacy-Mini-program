<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-box">
      <view class="search-bar">
        <text class="iconfont icon-search"></text>
        <input 
          type="text" 
          v-model="searchKeyword"
          placeholder="搜索健康资讯"
          confirm-type="search"
          @confirm="handleSearch"
        />
      </view>
    </view>
    
    <!-- 分类选项卡 -->
    <scroll-view class="category-scroll" scroll-x>
      <view class="category-list">
        <view 
          class="category-item" 
          :class="{ active: currentCategory === '' }"
          @tap="switchCategory('')"
        >
          全部
        </view>
        <view 
          class="category-item" 
          :class="{ active: currentCategory === item._id }"
          v-for="item in categories" 
          :key="item._id"
          @tap="switchCategory(item._id)"
        >
          {{ item.name }}
        </view>
      </view>
    </scroll-view>
    
    <!-- 文章列表 -->
    <scroll-view 
      class="article-list"
      scroll-y
      @scrolltolower="loadMore"
      :style="{ height: scrollHeight + 'px' }"
    >
      <view class="article-item" v-for="item in articleList" :key="item._id" @tap="navigateToDetail(item._id)">
        <image :src="item.coverUrl" class="article-image" mode="aspectFill"></image>
        <view class="article-info">
          <text class="article-title">{{ item.title }}</text>
          <text class="article-summary">{{ item.summary }}</text>
          <view class="article-meta">
            <text class="article-category" v-if="item.categoryName">{{ item.categoryName }}</text>
            <text class="article-date">{{ formatDate(item.createTime) }}</text>
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-more" v-if="loading">
        <text>加载中...</text>
      </view>
      <view class="no-more" v-if="!hasMore && articleList.length > 0">
        <text>没有更多了</text>
      </view>
      <view class="empty" v-if="!loading && articleList.length === 0">
        <image src="/static/images/empty-data.png" mode="aspectFit"></image>
        <text>暂无相关文章</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const db = uniCloud.database()
const _ = db.command
const ARTICLES_PER_PAGE = 10

export default {
  data() {
    return {
      categories: [],
      currentCategory: '',
      searchKeyword: '',
      articleList: [],
      loading: false,
      hasMore: true,
      page: 1,
      scrollHeight: 0
    }
  },
  
  onLoad() {
    // 设置scroll-view高度
    const systemInfo = uni.getSystemInfoSync()
    // 减去搜索栏和分类栏的高度
    this.scrollHeight = systemInfo.windowHeight - uni.upx2px(180)
    
    this.loadCategories()
    this.loadArticles()
  },
  
  onPullDownRefresh() {
    this.page = 1
    this.articleList = []
    this.hasMore = true
    this.loadArticles().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  
  methods: {
    // 加载文章分类
    async loadCategories() {
      try {
        const { data } = await db.collection('articleCategories')
          .where({
            status: 'active'
          })
          .orderBy('order', 'asc')
          .get()
        
        this.categories = data
      } catch (error) {
        console.error('加载文章分类失败:', error)
        uni.showToast({
          title: '加载分类失败',
          icon: 'none'
        })
      }
    },
    
    // 加载文章列表
    async loadArticles() {
      if (this.loading || !this.hasMore) return
      
      this.loading = true
      try {
        // 构建查询条件
        const query = {
          status: 'published'
        }
        
        // 分类筛选
        if (this.currentCategory) {
          query.categoryId = this.currentCategory
        }
        
        // 关键词搜索
        if (this.searchKeyword) {
          query.title = db.RegExp({
            regexp: this.searchKeyword,
            options: 'i'
          })
        }
        
        // 查询文章
        const { data } = await db.collection('articles')
          .where(query)
          .orderBy('createTime', 'desc')
          .skip((this.page - 1) * ARTICLES_PER_PAGE)
          .limit(ARTICLES_PER_PAGE)
          .get()
        
        if (data.length < ARTICLES_PER_PAGE) {
          this.hasMore = false
        }
        
        // 获取分类名称
        const articleList = await this.getArticlesWithCategory(data)
        
        if (this.page === 1) {
          this.articleList = articleList
        } else {
          this.articleList.push(...articleList)
        }
        
        this.page++
      } catch (error) {
        console.error('加载文章失败:', error)
        uni.showToast({
          title: '加载文章失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 获取带有分类名称的文章列表
    async getArticlesWithCategory(articles) {
      if (!articles || articles.length === 0) return []
      
      // 获取所有分类ID
      const categoryIds = [...new Set(articles.map(item => item.categoryId).filter(Boolean))]
      
      if (categoryIds.length === 0) return articles
      
      try {
        // 查询分类信息
        const { data: categories } = await db.collection('articleCategories')
          .where({
            _id: _.in(categoryIds)
          })
          .field({
            _id: true,
            name: true
          })
          .get()
        
        // 构建分类ID到名称的映射
        const categoryMap = {}
        categories.forEach(category => {
          categoryMap[category._id] = category.name
        })
        
        // 为文章添加分类名称
        return articles.map(article => ({
          ...article,
          categoryName: article.categoryId ? categoryMap[article.categoryId] : ''
        }))
      } catch (error) {
        console.error('获取文章分类名称失败:', error)
        return articles
      }
    },
    
    // 切换分类
    switchCategory(categoryId) {
      if (this.currentCategory === categoryId) return
      this.currentCategory = categoryId
      this.page = 1
      this.articleList = []
      this.hasMore = true
      this.loadArticles()
    },
    
    // 搜索文章
    handleSearch() {
      this.page = 1
      this.articleList = []
      this.hasMore = true
      this.loadArticles()
    },
    
    // 加载更多
    loadMore() {
      this.loadArticles()
    },
    
    // 跳转到文章详情
    navigateToDetail(articleId) {
      uni.navigateTo({
        url: `/pages/articles/detail?id=${articleId}`
      })
    },
    
    // 格式化日期
    formatDate(timestamp) {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
  }
}
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* 搜索栏样式 */
.search-box {
  padding: 20rpx;
  background-color: #ffffff;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 30rpx;
  padding: 10rpx 20rpx;
}

.search-bar .icon-search {
  font-size: 32rpx;
  color: #999;
  margin-right: 10rpx;
}

.search-bar input {
  flex: 1;
  font-size: 28rpx;
  height: 60rpx;
}

/* 分类滚动样式 */
.category-scroll {
  background-color: #ffffff;
  white-space: nowrap;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.category-list {
  display: inline-block;
  padding: 0 20rpx;
}

.category-item {
  display: inline-block;
  padding: 10rpx 30rpx;
  margin-right: 20rpx;
  font-size: 28rpx;
  color: #333;
  border-radius: 30rpx;
  background-color: #f5f5f5;
}

.category-item.active {
  color: #ffffff;
  background-color: #3cc51f;
}

/* 文章列表样式 */
.article-list {
  flex: 1;
  background-color: #f8f8f8;
  padding: 20rpx;
}

.article-item {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
}

.article-image {
  width: 200rpx;
  height: 150rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.article-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.article-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-summary {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.article-category {
  font-size: 24rpx;
  color: #3cc51f;
  background-color: rgba(60, 197, 31, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.article-date {
  font-size: 24rpx;
  color: #999;
}

/* 加载状态样式 */
.loading-more, .no-more {
  text-align: center;
  padding: 20rpx 0;
  font-size: 24rpx;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
}

.empty text {
  font-size: 28rpx;
  color: #999;
}
</style>