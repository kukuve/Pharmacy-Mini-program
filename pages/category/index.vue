<template>
  <view class="category-container">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="goToSearch">
      <view class="search-input">
        <text class="icon iconfont icon-search"></text>
        <text class="placeholder">搜索药品</text>
      </view>
    </view>
    
    <!-- 分类内容 -->
    <view class="category-content">
      <!-- 左侧分类列表 -->
      <scroll-view class="category-menu" scroll-y>
        <view 
          class="menu-item" 
          v-for="(category, index) in categoryList" 
          :key="category._id"
          :class="{ active: currentCategoryIndex === index }"
          @click="switchCategory(index)"
        >
          <text class="menu-text">{{ category.name }}</text>
        </view>
      </scroll-view>
      
      <!-- 右侧商品列表 -->
      <scroll-view 
        class="product-list-scroll" 
        scroll-y 
        @scrolltolower="loadMoreProducts"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="refreshProducts"
      >
        <!-- 当前分类信息 -->
        <view class="current-category" v-if="currentCategory">
          <image 
            class="category-banner" 
            :src="currentCategory.banner || '/static/images/default-banner.jpg'" 
            mode="aspectFill"
          ></image>
          <view class="category-info">
            <text class="category-name">{{ currentCategory.name }}</text>
            <text class="category-desc">{{ currentCategory.description }}</text>
          </view>
        </view>
        
        <!-- 子分类列表 -->
        <view class="sub-category-list" v-if="subCategoryList.length > 0">
          <view 
            class="sub-category-item" 
            v-for="(subCategory, index) in subCategoryList" 
            :key="subCategory._id"
            @click="goToSubCategory(subCategory._id)"
          >
            <image 
              class="sub-category-icon" 
              :src="subCategory.icon || '/static/images/default-category.png'" 
              mode="aspectFit"
            ></image>
            <text class="sub-category-name">{{ subCategory.name }}</text>
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
          <image class="empty-icon" src="/static/images/empty-product.png" mode="aspectFit"></image>
          <text class="empty-text">暂无商品</text>
        </view>
        
        <!-- 加载状态 -->
        <uni-load-more v-if="loading" status="loading"></uni-load-more>
        
        <!-- 上拉加载更多 -->
        <uni-load-more v-if="!loading && productList.length > 0" :status="loadMoreStatus"></uni-load-more>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { categoryApi, productApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      categoryList: [], // 分类列表
      currentCategoryIndex: 0, // 当前选中的分类索引
      subCategoryList: [], // 子分类列表
      productList: [], // 商品列表
      loading: true, // 加载状态
      refreshing: false, // 刷新状态
      page: 1, // 当前页码
      size: 10, // 每页数量
      total: 0, // 商品总数
      loadMoreStatus: 'more' // 加载更多状态：more-加载前，loading-加载中，noMore-没有更多了
    }
  },
  computed: {
    // 当前选中的分类
    currentCategory() {
      return this.categoryList[this.currentCategoryIndex] || null
    }
  },
  onLoad(options) {
    // 如果有分类ID参数，加载后切换到对应分类
    this.targetCategoryId = options.id
    this.loadCategories()
  },
  methods: {
    // 加载分类列表
    async loadCategories() {
      this.loading = true
      
      try {
        const result = await categoryApi.getCategories()
        
        if (result.success) {
          this.categoryList = result.data || []
          
          // 如果有目标分类ID，切换到对应分类
          if (this.targetCategoryId) {
            const index = this.categoryList.findIndex(item => item._id === this.targetCategoryId)
            if (index !== -1) {
              this.currentCategoryIndex = index
            }
          }
          
          // 加载子分类和商品
          this.loadSubCategories()
          this.loadProducts()
        } else {
          throw new Error(result.error || 'Failed to load categories')
        }
      } catch (e) {
        console.error('获取分类列表失败', e)
        uni.showToast({
          title: '获取分类列表失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 加载子分类
    async loadSubCategories() {
      if (!this.currentCategory) return
      
      try {
        const result = await categoryApi.getCategoryDetail(this.currentCategory._id)
        
        if (result.success) {
          this.subCategoryList = result.data.children || []
        } else {
          this.subCategoryList = []
        }
      } catch (e) {
        console.error('获取子分类失败', e)
        this.subCategoryList = []
      }
    },
    
    // 加载商品列表
    async loadProducts() {
      if (!this.currentCategory) return
      
      this.loading = true
      
      try {
        const result = await productApi.getProducts({
          categoryId: this.currentCategory._id,
          page: this.page,
          pageSize: this.size
        })
        
        if (result.success) {
          const list = result.data.products || result.data || []
          if (this.page === 1) {
            this.productList = list
          } else {
            this.productList = [...this.productList, ...list]
          }
          
          this.total = result.data.total || 0
          
          // 更新加载更多状态
          this.loadMoreStatus = this.productList.length >= this.total ? 'noMore' : 'more'
        } else {
          throw new Error(result.error || 'Failed to load products')
        }
      } catch (e) {
        console.error('获取商品列表失败', e)
        uni.showToast({
          title: '获取商品列表失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    
    // 切换分类
    switchCategory(index) {
      if (this.currentCategoryIndex === index) return
      
      this.currentCategoryIndex = index
      this.page = 1
      this.productList = []
      this.loadSubCategories()
      this.loadProducts()
    },
    
    // 刷新商品列表
    refreshProducts() {
      this.refreshing = true
      this.page = 1
      this.loadProducts()
    },
    
    // 加载更多商品
    loadMoreProducts() {
      if (this.loading || this.productList.length >= this.total) return
      
      this.loadMoreStatus = 'loading'
      this.page++
      this.loadProducts()
    },
    
    // 跳转到子分类
    goToSubCategory(categoryId) {
      uni.navigateTo({
        url: `/pages/category/index?id=${categoryId}`
      })
    },
    
    // 跳转到商品详情
    goToProductDetail(productId) {
      uni.navigateTo({
        url: `/pages/product/detail?id=${productId}`
      })
    },
    
    // 跳转到搜索页
    goToSearch() {
      uni.navigateTo({
        url: '/pages/search/index'
      })
    }
  }
}
</script>

<style lang="scss">
.category-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
  
  .search-bar {
    padding: 20rpx 30rpx;
    background-color: #ff4444;
    
    .search-input {
      display: flex;
      align-items: center;
      height: 72rpx;
      background-color: #fff;
      border-radius: 36rpx;
      padding: 0 30rpx;
      
      .icon-search {
        font-size: 32rpx;
        color: #999;
        margin-right: 10rpx;
      }
      
      .placeholder {
        font-size: 28rpx;
        color: #999;
      }
    }
  }
  
  .category-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    
    .category-menu {
      width: 180rpx;
      height: 100%;
      background-color: #f5f5f5;
      
      .menu-item {
        height: 100rpx;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        
        .menu-text {
          font-size: 28rpx;
          color: #333;
          padding: 0 20rpx;
          text-align: center;
        }
        
        &.active {
          background-color: #fff;
          
          .menu-text {
            color: #ff4444;
            font-weight: bold;
          }
          
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 6rpx;
            height: 36rpx;
            background-color: #ff4444;
          }
        }
      }
    }
    
    .product-list-scroll {
      flex: 1;
      height: 100%;
      background-color: #fff;
      
      .current-category {
        padding-bottom: 20rpx;
        
        .category-banner {
          width: 100%;
          height: 200rpx;
        }
        
        .category-info {
          padding: 20rpx 30rpx;
          
          .category-name {
            font-size: 32rpx;
            color: #333;
            font-weight: bold;
            margin-bottom: 10rpx;
          }
          
          .category-desc {
            font-size: 24rpx;
            color: #999;
          }
        }
      }
      
      .sub-category-list {
        display: flex;
        flex-wrap: wrap;
        padding: 0 20rpx 20rpx;
        
        .sub-category-item {
          width: 25%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20rpx 0;
          
          .sub-category-icon {
            width: 80rpx;
            height: 80rpx;
            margin-bottom: 10rpx;
          }
          
          .sub-category-name {
            font-size: 24rpx;
            color: #333;
            text-align: center;
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
}