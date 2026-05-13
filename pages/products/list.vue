<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-box">
      <view class="search-bar">
        <text class="iconfont icon-search"></text>
        <input 
          type="text" 
          v-model="searchKeyword"
          placeholder="搜索药品名称"
          confirm-type="search"
          @confirm="handleSearch"
        />
      </view>
    </view>
    
    <!-- 分类筛选 -->
    <scroll-view class="category-scroll" scroll-x>
      <view class="category-list">
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
    
    <!-- 排序选项 -->
    <view class="sort-box">
      <view 
        class="sort-item" 
        :class="{ active: sortType === 'default' }"
        @tap="changeSort('default')"
      >
        默认
      </view>
      <view 
        class="sort-item" 
        :class="{ active: sortType === 'sales' }"
        @tap="changeSort('sales')"
      >
        销量
      </view>
      <view 
        class="sort-item" 
        @tap="changeSort('price')"
      >
        价格
        <text class="sort-icon" :class="{ 
          'sort-up': sortType === 'price' && sortOrder === 'asc',
          'sort-down': sortType === 'price' && sortOrder === 'desc'
        }"></text>
      </view>
    </view>
    
    <!-- 商品列表 -->
    <scroll-view 
      class="product-list"
      scroll-y
      @scrolltolower="loadMore"
      :style="{ height: scrollHeight + 'px' }"
    >
      <view class="product-item" v-for="item in productList" :key="item._id" @tap="navigateToDetail(item._id)">
        <image :src="item.imageUrl" class="product-image" mode="aspectFill"></image>
        <view class="product-info">
          <text class="product-name">{{ item.name }}</text>
          <text class="product-spec">{{ item.spec }}</text>
          <view class="product-bottom">
            <view class="price-box">
              <text class="price">¥{{ item.price.toFixed(2) }}</text>
              <text class="original-price" v-if="item.originalPrice">¥{{ item.originalPrice.toFixed(2) }}</text>
            </view>
            <text class="sales-count">已售{{ item.sales }}件</text>
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-more" v-if="loading">
        <text>加载中...</text>
      </view>
      <view class="no-more" v-if="!hasMore && productList.length > 0">
        <text>没有更多了</text>
      </view>
      <view class="empty" v-if="!loading && productList.length === 0">
        <image src="/static/images/empty.png" mode="aspectFit"></image>
        <text>暂无相关商品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const db = uniCloud.database()
const _ = db.command
const PRODUCTS_PER_PAGE = 10

export default {
  data() {
    return {
      categories: [],
      currentCategory: '',
      searchKeyword: '',
      productList: [],
      loading: false,
      hasMore: true,
      page: 1,
      sortType: 'default', // default, sales, price
      sortOrder: 'desc', // asc, desc
      scrollHeight: 0
    }
  },
  
  onLoad(options) {
    // 设置scroll-view高度
    const systemInfo = uni.getSystemInfoSync()
    // 减去搜索栏、分类栏、排序栏的高度
    this.scrollHeight = systemInfo.windowHeight - uni.upx2px(220)
    
    // 如果有分类参数，设置当前分类
    if (options.categoryId) {
      this.currentCategory = options.categoryId
    }
    
    this.loadCategories()
    this.loadProducts()
  },
  
  onPullDownRefresh() {
    this.page = 1
    this.productList = []
    this.hasMore = true
    this.loadProducts().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  
  methods: {
    // 加载分类数据
    async loadCategories() {
      try {
        const { data } = await db.collection('categories')
          .where({
            status: 'active'
          })
          .orderBy('order', 'asc')
          .get()
        
        this.categories = data
      } catch (error) {
        console.error('加载分类失败:', error)
        uni.showToast({
          title: '加载分类失败',
          icon: 'none'
        })
      }
    },
    
    // 加载商品数据
    async loadProducts() {
      if (this.loading || !this.hasMore) return
      
      this.loading = true
      try {
        // 构建查询条件
        const query = {
          status: 'active'
        }
        
        // 分类筛选
        if (this.currentCategory) {
          query.categoryId = this.currentCategory
        }
        
        // 关键词搜索
        if (this.searchKeyword) {
          query.name = db.RegExp({
            regexp: this.searchKeyword,
            options: 'i'
          })
        }
        
        // 构建排序条件
        let orderField = 'createTime'
        let orderDirection = 'desc'
        
        switch (this.sortType) {
          case 'sales':
            orderField = 'sales'
            orderDirection = 'desc'
            break
          case 'price':
            orderField = 'price'
            orderDirection = this.sortOrder
            break
        }
        
        const { data } = await db.collection('products')
          .where(query)
          .orderBy(orderField, orderDirection)
          .skip((this.page - 1) * PRODUCTS_PER_PAGE)
          .limit(PRODUCTS_PER_PAGE)
          .get()
        
        if (data.length < PRODUCTS_PER_PAGE) {
          this.hasMore = false
        }
        
        if (this.page === 1) {
          this.productList = data
        } else {
          this.productList.push(...data)
        }
        
        this.page++
      } catch (error) {
        console.error('加载商品失败:', error)
        uni.showToast({
          title: '加载商品失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 切换分类
    switchCategory(categoryId) {
      if (this.currentCategory === categoryId) return
      this.currentCategory = categoryId
      this.page = 1
      this.productList = []
      this.hasMore = true
      this.loadProducts()
    },
    
    // 搜索商品
    handleSearch() {
      this.page = 1
      this.productList = []
      this.hasMore = true
      this.loadProducts()
    },
    
    // 切换排序方式
    changeSort(type) {
      if (type === this.sortType) {
        if (type === 'price') {
          // 价格排序支持切换顺序
          this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
        } else {
          return
        }
      } else {
        this.sortType = type
        this.sortOrder = 'desc'
      }
      
      this.page = 1
      this.productList = []
      this.hasMore = true
      this.loadProducts()
    },
    
    // 加载更多
    loadMore() {
      this.loadProducts()
    },
    
    // 跳转到商品详情
    navigateToDetail(productId) {
      uni.navigateTo({
        url: `/pages/products/detail?id=${productId}`
      })
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

/* 排序栏样式 */
.sort-box {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.sort-item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.sort-item.active {
  color: #3cc51f;
}

.sort-icon {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 10rpx;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
}

.sort-up {
  border-bottom: 8rpx solid #3cc51f;
}

.sort-down {
  border-top: 8rpx solid #3cc51f;
}

/* 商品列表样式 */
.product-list {
  flex: 1;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.product-item {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
}

.product-image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.price-box {
  display: flex;
  align-items: baseline;
}

.price {
  font-size: 32rpx;
  color: #ff6700;
  font-weight: bold;
}

.original-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 10rpx;
}

.sales-count {
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