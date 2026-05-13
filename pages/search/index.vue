<template>
  <view class="search-container">
    <!-- 搜索头部 -->
    <view class="search-header">
      <view class="search-input-wrap">
        <text class="icon iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword"
          placeholder="搜索药品"
          confirm-type="search"
          @confirm="handleSearch"
          @input="handleInput"
        />
        <text 
          class="icon iconfont icon-close" 
          v-if="keyword"
          @click="clearKeyword"
        ></text>
      </view>
      <text class="cancel-btn" @click="goBack">取消</text>
    </view>
    
    <!-- 搜索建议列表 -->
    <scroll-view 
      class="suggest-list" 
      scroll-y 
      v-if="keyword && suggestList.length > 0"
    >
      <view 
        class="suggest-item" 
        v-for="(item, index) in suggestList" 
        :key="index"
        @click="handleSuggestClick(item)"
      >
        <text class="icon iconfont icon-search"></text>
        <text class="suggest-text">{{ item }}</text>
      </view>
    </scroll-view>
    
    <!-- 搜索历史和热门搜索 -->
    <block v-if="!keyword && !showResult">
      <!-- 搜索历史 -->
      <view class="search-history" v-if="historyList.length > 0">
        <view class="section-header">
          <text class="title">搜索历史</text>
          <text class="clear-btn" @click="clearHistory">清空</text>
        </view>
        <view class="history-list">
          <view 
            class="history-item" 
            v-for="(item, index) in historyList" 
            :key="index"
            @click="handleHistoryClick(item)"
          >
            {{ item }}
          </view>
        </view>
      </view>
      
      <!-- 热门搜索 -->
      <view class="hot-search">
        <view class="section-header">
          <text class="title">热门搜索</text>
        </view>
        <view class="hot-list">
          <view 
            class="hot-item" 
            v-for="(item, index) in hotList" 
            :key="index"
            @click="handleHotClick(item)"
          >
            <text class="hot-rank" :class="{ top: index < 3 }">{{ index + 1 }}</text>
            <text class="hot-keyword">{{ item }}</text>
            <text class="hot-tag" v-if="index < 3">热</text>
          </view>
        </view>
      </view>
    </block>
    
    <!-- 搜索结果 -->
    <scroll-view 
      class="search-result" 
      scroll-y 
      v-if="showResult"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <view class="result-header">
        <text class="result-count">共找到 {{ total }} 个商品</text>
        <view class="sort-tabs">
          <view 
            class="sort-item" 
            :class="{ active: currentSort === 'default' }"
            @click="switchSort('default')"
          >
            综合
          </view>
          <view 
            class="sort-item" 
            :class="{ active: currentSort === 'sales' }"
            @click="switchSort('sales')"
          >
            销量
          </view>
          <view 
            class="sort-item" 
            :class="{ 
              active: currentSort === 'price',
              desc: currentSort === 'price' && sortOrder === 'desc'
            }"
            @click="switchSort('price')"
          >
            价格
            <text class="icon iconfont icon-sort"></text>
          </view>
        </view>
      </view>
      
      <!-- 商品列表 -->
      <view class="product-list" v-if="productList.length > 0">
        <view 
          class="product-item" 
          v-for="(product, index) in productList" 
          :key="product._id"
          @click="goToProductDetail(product._id)"
        >
          <image class="product-image" :src="product.image" mode="aspectFill"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-brief">{{ product.brief }}</text>
            <view class="product-price-wrap">
              <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
              <text class="product-sales">已售{{ product.sales }}件</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-else-if="!loading && !refreshing">
        <image class="empty-icon" src="/static/images/empty-search.png" mode="aspectFit"></image>
        <text class="empty-text">未找到相关商品</text>
      </view>
      
      <!-- 加载状态 -->
      <uni-load-more v-if="loading" status="loading"></uni-load-more>
      
      <!-- 上拉加载更多 -->
      <uni-load-more v-if="!loading && productList.length > 0" :status="loadMoreStatus"></uni-load-more>
    </scroll-view>
  </view>
</template>

<script>
import { productApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      keyword: '', // 搜索关键词
      historyList: [], // 搜索历史
      hotList: [], // 热门搜索
      suggestList: [], // 搜索建议
      showResult: false, // 是否显示搜索结果
      productList: [], // 商品列表
      loading: false, // 加载状态
      refreshing: false, // 刷新状态
      page: 1, // 当前页码
      size: 10, // 每页数量
      total: 0, // 商品总数
      loadMoreStatus: 'more', // 加载更多状态
      currentSort: 'default', // 当前排序方式：default-综合，sales-销量，price-价格
      sortOrder: 'desc', // 排序顺序：asc-升序，desc-降序
      suggestTimer: null // 搜索建议防抖定时器
    }
  },
  onLoad() {
    this.loadHistory()
    this.loadHotSearch()
  },
  methods: {
    // 加载搜索历史
    loadHistory() {
      const history = uni.getStorageSync('search_history')
      this.historyList = history ? JSON.parse(history) : []
    },
    
    // 保存搜索历史
    saveHistory(keyword) {
      let history = this.historyList
      // 删除已存在的相同关键词
      history = history.filter(item => item !== keyword)
      // 添加到开头
      history.unshift(keyword)
      // 最多保存10条
      history = history.slice(0, 10)
      this.historyList = history
      uni.setStorageSync('search_history', JSON.stringify(history))
    },
    
    // 清空搜索历史
    clearHistory() {
      uni.showModal({
        title: '提示',
        content: '确定要清空搜索历史吗？',
        success: (res) => {
          if (res.confirm) {
            this.historyList = []
            uni.removeStorageSync('search_history')
          }
        }
      })
    },
    
    // 加载热门搜索
    async loadHotSearch() {
      try {
        const result = await productApi.searchProducts({ keyword: '', page: 1, pageSize: 10 })
        if (result.success) {
          this.hotList = (result.data.products || []).map(p => p.name).slice(0, 10)
        }
      } catch (e) {
        console.error('获取热门搜索失败', e)
      }
    },
    
    // 处理输入
    handleInput() {
      // 清除之前的定时器
      if (this.suggestTimer) {
        clearTimeout(this.suggestTimer)
      }
      
      // 设置新的定时器，防抖处理
      this.suggestTimer = setTimeout(() => {
        if (this.keyword) {
          this.loadSuggest()
        } else {
          this.suggestList = []
          this.showResult = false
        }
      }, 300)
    },
    
    // 加载搜索建议
    async loadSuggest() {
      try {
        const result = await productApi.searchProducts({ keyword: this.keyword, page: 1, pageSize: 5 })
        if (result.success) {
          this.suggestList = (result.data.products || []).map(p => p.name)
        }
      } catch (e) {
        console.error('获取搜索建议失败', e)
        this.suggestList = []
      }
    },
    
    // 处理搜索
    handleSearch() {
      if (!this.keyword) return
      
      this.saveHistory(this.keyword)
      this.suggestList = []
      this.showResult = true
      this.page = 1
      this.loadProducts()
    },
    
    // 加载商品列表
    async loadProducts() {
      this.loading = true
      
      try {
        const result = await productApi.searchProducts({
          keyword: this.keyword,
          sort: this.currentSort,
          order: this.sortOrder,
          page: this.page,
          pageSize: this.size
        })
        
        if (result.success) {
          const list = result.data.products || []
          if (this.page === 1) {
            this.productList = list
          } else {
            this.productList = [...this.productList, ...list]
          }
          
          this.total = result.data.total || 0
          
          // 更新加载更多状态
          this.loadMoreStatus = this.productList.length >= this.total ? 'noMore' : 'more'
        } else {
          throw new Error(result.error || 'Search failed')
        }
      } catch (e) {
        console.error('搜索商品失败', e)
        uni.showToast({
          title: '搜索失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    
    // 切换排序方式
    switchSort(sort) {
      if (this.currentSort === sort) {
        // 如果是价格排序，切换排序顺序
        if (sort === 'price') {
          this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc'
        }
      } else {
        this.currentSort = sort
        this.sortOrder = 'desc'
      }
      
      this.page = 1
      this.loadProducts()
    },
    
    // 刷新
    refresh() {
      this.refreshing = true
      this.page = 1
      this.loadProducts()
    },
    
    // 加载更多
    loadMore() {
      if (this.loading || this.productList.length >= this.total) return
      
      this.loadMoreStatus = 'loading'
      this.page++
      this.loadProducts()
    },
    
    // 清除关键词
    clearKeyword() {
      this.keyword = ''
      this.suggestList = []
      this.showResult = false
    },
    
    // 处理搜索建议点击
    handleSuggestClick(keyword) {
      this.keyword = keyword
      this.handleSearch()
    },
    
    // 处理历史记录点击
    handleHistoryClick(keyword) {
      this.keyword = keyword
      this.handleSearch()
    },
    
    // 处理热门搜索点击
    handleHotClick(keyword) {
      this.keyword = keyword
      this.handleSearch()
    },
    
    // 跳转到商品详情
    goToProductDetail(productId) {
      uni.navigateTo({
        url: `/pages/product/detail?id=${productId}`
      })
    },
    
    // 返回上一页
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss">
.search-container {
  min-height: 100vh;
  background-color: #fff;
  
  .search-header {
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx;
    background-color: #fff;
    border-bottom: 1rpx solid #f5f5f5;
    position: sticky;
    top: 0;
    z-index: 100;
    
    .search-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      height: 72rpx;
      background-color: #f8f8f8;
      border-radius: 36rpx;
      padding: 0 20rpx;
      margin-right: 20rpx;
      
      .icon-search {
        font-size: 32rpx;
        color: #999;
        margin-right: 10rpx;
      }
      
      .search-input {
        flex: 1;
        height: 100%;
        font-size: 28rpx;
        color: #333;
      }
      
      .icon-close {
        font-size: 32rpx;
        color: #999;
        padding: 10rpx;
      }
    }
    
    .cancel-btn {
      font-size: 28rpx;
      color: #666;
    }
  }
  
  .suggest-list {
    max-height: calc(100vh - 112rpx);
    
    .suggest-item {
      display: flex;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f5f5f5;
      
      .icon-search {
        font-size: 32rpx;
        color: #999;
        margin-right: 20rpx;
      }
      
      .suggest-text {
        font-size: 28rpx;
        color: #333;
      }
    }
  }
  
  .search-history, .hot-search {
    padding: 30rpx;
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      .title {
        font-size: 30rpx;
        color: #333;
        font-weight: bold;
      }
      
      .clear-btn {
        font-size: 26rpx;
        color: #999;
      }
    }
  }
  
  .search-history {
    .history-list {
      display: flex;
      flex-wrap: wrap;
      
      .history-item {
        padding: 10rpx 30rpx;
        background-color: #f8f8f8;
        border-radius: 30rpx;
        font-size: 26rpx;
        color: #666;
        margin-right: 20rpx;
        margin-bottom: 20rpx;
      }
    }
  }
  
  .hot-search {
    .hot-list {
      .hot-item {
        display: flex;
        align-items: center;
        padding: 20rpx 0;
        
        .hot-rank {
          width: 40rpx;
          height: 40rpx;
          line-height: 40rpx;
          text-align: center;
          font-size: 24rpx;
          color: #999;
          margin-right: 20rpx;
          
          &.top {
            color: #fff;
            background-color: #ff4444;
            border-radius: 50%;
          }
        }
        
        .hot-keyword {
          flex: 1;
          font-size: 28rpx;
          color: #333;
        }
        
        .hot-tag {
          padding: 4rpx 10rpx;
          background-color: #ff4444;
          color: #fff;
          font-size: 20rpx;
          border-radius: 4rpx;
        }
      }
    }
  }
  
  .search-result {
    height: calc(100vh - 112rpx);
    
    .result-header {
      padding: 20rpx 30rpx;
      background-color: #fff;
      border-bottom: 1rpx solid #f5f5f5;
      
      .result-count {
        font-size: 26rpx;
        color: #999;
        margin-bottom: 20rpx;
      }
      
      .sort-tabs {
        display: flex;
        
        .sort-item {
          flex: 1;
          height: 60rpx;
          line-height: 60rpx;
          text-align: center;
          font-size: 28rpx;
          color: #666;
          position: relative;
          
          .icon-sort {
            font-size: 24rpx;
            margin-left: 4rpx;
          }
          
          &.active {
            color: #ff4444;
          }
          
          &.desc .icon-sort {
            transform: rotate(180deg);
          }
        }
      }
    }
    
    .product-list {
      padding: 0 20rpx;
      
      .product-item {
        display: flex;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #f5f5f5;
        
        .product-image {
          width: 160rpx;
          height: 160rpx;
          border-radius: 12rpx;
          margin-right: 20rpx;
        }
        
        .product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          
          .product-name {
            font-size: 28rpx;
            color: #333;
            line-height: 1.4;
            margin-bottom: 10rpx;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
          }
          
          .product-brief {
            font-size: 24rpx;
            color: #999;
            line-height: 1.4;
            margin-bottom: 10rpx;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            overflow: hidden;
          }
          
          .product-price-wrap {
            display: flex;
            justify-content: space-between;
            align-items: center;
            
            .product-price {
              font-size: 32rpx;
              color: #ff4444;
              font-weight: bold;
            }
            
            .product-sales {
              font-size: 24rpx;
              color: #999;
            }
          }
        }
      }
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100rpx 0;
      
      .empty-icon {
        width: 200rpx;
        height: 200rpx;
        margin-bottom: 30rpx;
      }
      
      .empty-text {
        font-size: 30rpx;
        color: #999;
      }
    }
  }
}