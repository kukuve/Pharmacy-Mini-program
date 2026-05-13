<template>
  <view class="index-container">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="goToSearch">
      <view class="search-input">
        <text class="icon iconfont icon-search"></text>
        <text class="placeholder">搜索药品</text>
      </view>
    </view>
    
    <!-- 轮播图 -->
    <swiper 
      class="banner-swiper" 
      :indicator-dots="true" 
      :autoplay="true" 
      :interval="3000" 
      :duration="500"
      circular
    >
      <swiper-item v-for="(banner, index) in bannerList" :key="index">
        <image 
          class="banner-image" 
          :src="banner.image" 
          mode="aspectFill"
          @click="handleBannerClick(banner)"
        ></image>
      </swiper-item>
    </swiper>
    
    <!-- 分类导航 -->
    <view class="category-nav">
      <view 
        class="category-item" 
        v-for="(category, index) in categoryList" 
        :key="index"
        @click="goToCategory(category)"
      >
        <image class="category-icon" :src="category.icon" mode="aspectFit"></image>
        <text class="category-name">{{ category.name }}</text>
      </view>
    </view>
    
    <!-- 推荐商品 -->
    <view class="recommend-section" v-if="recommendList.length > 0">
      <view class="section-header">
        <text class="title">精选推荐</text>
        <view class="more" @click="goToProductList('recommend')">
          <text>查看更多</text>
          <text class="icon iconfont icon-right"></text>
        </view>
      </view>
      <scroll-view class="recommend-scroll" scroll-x>
        <view class="recommend-list">
          <view 
            class="recommend-item" 
            v-for="(product, index) in recommendList" 
            :key="index"
            @click="goToProductDetail(product._id)"
          >
            <image class="product-image" :src="product.image" mode="aspectFill"></image>
            <text class="product-name">{{ product.name }}</text>
            <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 热门商品 -->
    <view class="hot-section">
      <view class="section-header">
        <text class="title">热门商品</text>
        <view class="more" @click="goToProductList('hot')">
          <text>查看更多</text>
          <text class="icon iconfont icon-right"></text>
        </view>
      </view>
      <view class="product-grid">
        <view 
          class="product-item" 
          v-for="(product, index) in hotList" 
          :key="index"
          @click="goToProductDetail(product._id)"
        >
          <image class="product-image" :src="product.image" mode="aspectFill"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-desc">{{ product.brief }}</text>
            <view class="product-price-wrap">
              <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
              <text class="product-sales">已售{{ product.sales }}件</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 加载状态 -->
    <uni-load-more v-if="loading" status="loading"></uni-load-more>
    
    <!-- 返回顶部按钮 -->
    <view 
      class="back-to-top" 
      v-if="showBackToTop"
      @click="scrollToTop"
    >
      <text class="icon iconfont icon-top"></text>
    </view>
  </view>
</template>

<script>
import { homeApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      loading: true,
      bannerList: [],
      categoryList: [],
      recommendList: [],
      hotList: [],
      showBackToTop: false,
      pageScrollTop: 0
    }
  },
  onLoad() {
    this.loadHomeData()
  },
  onPageScroll(e) {
    this.pageScrollTop = e.scrollTop
    this.showBackToTop = e.scrollTop > 300
  },
  onPullDownRefresh() {
    this.loadHomeData().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadHomeData() {
      this.loading = true
      try {
        const res = await homeApi.getHomeData()
        if (res.success && res.data) {
          const d = res.data
          this.bannerList = (d.banners || []).map(item => ({
            image: item.image || item.image_url,
            type: item.type || item.link_type,
            target: item.target || item.link_value
          }))
          this.categoryList = (d.categories || []).slice(0, 5)
          this.recommendList = d.featured || []
          this.hotList = d.bestsellers || []
        } else {
          uni.showToast({ title: res.error || 'Failed to load', icon: 'none' })
        }
      } catch (e) {
        console.error('Failed to load home data:', e)
        uni.showToast({ title: 'Failed to load', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    handleBannerClick(banner) {
      if (banner.type === 'product') {
        this.goToProductDetail(banner.target)
      } else if (banner.type === 'category') {
        this.goToCategory({ _id: banner.target })
      }
    },

    goToSearch() {
      uni.navigateTo({ url: '/pages/search/index' })
    },

    goToCategory(category) {
      uni.navigateTo({ url: `/pages/category/index?id=${category._id}` })
    },

    goToProductList(type) {
      uni.navigateTo({ url: `/pages/product/list?type=${type}` })
    },

    goToProductDetail(productId) {
      uni.navigateTo({ url: `/pages/product/detail?id=${productId}` })
    },

    scrollToTop() {
      uni.pageScrollTo({ scrollTop: 0, duration: 300 })
    }
  }
}
</script>

<style lang="scss">
.index-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  
  .search-bar {
    position: sticky;
    top: 0;
    z-index: 100;
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
  
  .banner-swiper {
    width: 100%;
    height: 300rpx;
    
    .banner-image {
      width: 100%;
      height: 100%;
    }
  }
  
  .category-nav {
    display: flex;
    justify-content: space-around;
    padding: 30rpx 0;
    background-color: #fff;
    
    .category-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .category-icon {
        width: 80rpx;
        height: 80rpx;
        margin-bottom: 10rpx;
      }
      
      .category-name {
        font-size: 24rpx;
        color: #333;
      }
    }
  }
  
  .recommend-section, .hot-section {
    margin-top: 20rpx;
    background-color: #fff;
    padding: 20rpx 0;
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 30rpx;
      margin-bottom: 20rpx;
      
      .title {
        font-size: 32rpx;
        color: #333;
        font-weight: bold;
      }
      
      .more {
        font-size: 26rpx;
        color: #999;
        
        .icon-right {
          font-size: 24rpx;
          margin-left: 4rpx;
        }
      }
    }
  }
  
  .recommend-section {
    .recommend-scroll {
      width: 100%;
      white-space: nowrap;
      
      .recommend-list {
        padding: 0 20rpx;
        
        .recommend-item {
          display: inline-block;
          width: 200rpx;
          margin-right: 20rpx;
          
          &:last-child {
            margin-right: 0;
          }
          
          .product-image {
            width: 200rpx;
            height: 200rpx;
            border-radius: 12rpx;
            margin-bottom: 10rpx;
          }
          
          .product-name {
            font-size: 26rpx;
            color: #333;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            white-space: normal;
            height: 72rpx;
          }
          
          .product-price {
            font-size: 28rpx;
            color: #ff4444;
            font-weight: bold;
          }
        }
      }
    }
  }
  
  .hot-section {
    .product-grid {
      padding: 0 20rpx;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20rpx;
      
      .product-item {
        background-color: #fff;
        border-radius: 12rpx;
        overflow: hidden;
        box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
        
        .product-image {
          width: 100%;
          height: 345rpx;
        }
        
        .product-info {
          padding: 20rpx;
          
          .product-name {
            font-size: 28rpx;
            color: #333;
            line-height: 1.4;
            margin-bottom: 10rpx;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          
          .product-desc {
            font-size: 24rpx;
            color: #999;
            line-height: 1.4;
            margin-bottom: 10rpx;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
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
  }
  
  .back-to-top {
    position: fixed;
    right: 30rpx;
    bottom: 120rpx;
    width: 80rpx;
    height: 80rpx;
    background-color: rgba(0,0,0,0.5);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    
    .icon-top {
      font-size: 40rpx;
      color: #fff;
    }
  }
}
</style>