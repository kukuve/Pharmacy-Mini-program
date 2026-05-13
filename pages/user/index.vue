<template>
  <view class="user-container">
    <!-- 用户信息区域 -->
    <view class="user-info-section">
      <view class="user-info" v-if="isLoggedIn">
        <image class="avatar" :src="userInfo.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image>
        <view class="info">
          <text class="nickname">{{ userInfo.nickname || '药店用户' }}</text>
          <text class="phone">{{ formatPhone(userInfo.phone) }}</text>
        </view>
      </view>
      <view class="user-info" v-else @click="goToLogin">
        <image class="avatar" src="/static/images/default-avatar.png" mode="aspectFill"></image>
        <view class="info">
          <text class="nickname">点击登录</text>
          <text class="phone">登录后享受更多服务</text>
        </view>
      </view>
      <view class="user-actions">
        <view class="action-item" @click="goToSettings">
          <text class="icon iconfont icon-settings"></text>
        </view>
        <view class="action-item" @click="goToMessages">
          <text class="icon iconfont icon-message"></text>
          <text class="badge" v-if="unreadMessageCount > 0">{{ unreadMessageCount }}</text>
        </view>
      </view>
    </view>
    
    <!-- 我的订单 -->
    <view class="order-section">
      <view class="section-header" @click="goToOrderList('')">
        <text class="title">我的订单</text>
        <view class="more">
          <text class="text">全部订单</text>
          <text class="icon iconfont icon-right"></text>
        </view>
      </view>
      <view class="order-types">
        <view class="order-type-item" @click="goToOrderList('unpaid')">
          <text class="icon iconfont icon-wallet"></text>
          <text class="text">待付款</text>
          <text class="badge" v-if="orderCounts.unpaid > 0">{{ orderCounts.unpaid }}</text>
        </view>
        <view class="order-type-item" @click="goToOrderList('unshipped')">
          <text class="icon iconfont icon-package"></text>
          <text class="text">待发货</text>
          <text class="badge" v-if="orderCounts.unshipped > 0">{{ orderCounts.unshipped }}</text>
        </view>
        <view class="order-type-item" @click="goToOrderList('shipped')">
          <text class="icon iconfont icon-truck"></text>
          <text class="text">待收货</text>
          <text class="badge" v-if="orderCounts.shipped > 0">{{ orderCounts.shipped }}</text>
        </view>
        <view class="order-type-item" @click="goToOrderList('completed')">
          <text class="icon iconfont icon-comment"></text>
          <text class="text">待评价</text>
          <text class="badge" v-if="orderCounts.completed > 0">{{ orderCounts.completed }}</text>
        </view>
        <view class="order-type-item" @click="goToAfterSale">
          <text class="icon iconfont icon-service"></text>
          <text class="text">售后</text>
        </view>
      </view>
    </view>
    
    <!-- 我的服务 -->
    <view class="services-section">
      <view class="section-header">
        <text class="title">我的服务</text>
      </view>
      <view class="services-grid">
        <view class="service-item" @click="goToAddress">
          <text class="icon iconfont icon-location"></text>
          <text class="text">收货地址</text>
        </view>
        <view class="service-item" @click="goToFavorite">
          <text class="icon iconfont icon-heart"></text>
          <text class="text">我的收藏</text>
        </view>
        <view class="service-item" @click="goToCoupon">
          <text class="icon iconfont icon-coupon"></text>
          <text class="text">优惠券</text>
          <text class="badge" v-if="couponCount > 0">{{ couponCount }}</text>
        </view>
        <view class="service-item" @click="goToHealthRecord">
          <text class="icon iconfont icon-health"></text>
          <text class="text">健康档案</text>
        </view>
        <view class="service-item" @click="goToConsult">
          <text class="icon iconfont icon-doctor"></text>
          <text class="text">在线咨询</text>
        </view>
        <view class="service-item" @click="goToHistory">
          <text class="icon iconfont icon-history"></text>
          <text class="text">浏览历史</text>
        </view>
        <view class="service-item" @click="goToFeedback">
          <text class="icon iconfont icon-feedback"></text>
          <text class="text">意见反馈</text>
        </view>
        <view class="service-item" @click="contactCustomerService">
          <text class="icon iconfont icon-customer-service"></text>
          <text class="text">联系客服</text>
        </view>
      </view>
    </view>
    
    <!-- 推荐商品 -->
    <view class="recommend-section">
      <view class="section-header">
        <text class="title">为您推荐</text>
      </view>
      <view class="product-list">
        <view 
          class="product-item" 
          v-for="(product, index) in recommendProducts" 
          :key="product._id"
          @click="goToProductDetail(product._id)"
        >
          <image class="product-image" :src="product.image" mode="aspectFill"></image>
          <text class="product-name">{{ product.name }}</text>
          <view class="product-price-wrap">
            <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
            <text class="product-sales">已售{{ product.sales }}件</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 退出登录 -->
    <view class="logout-section" v-if="isLoggedIn">
      <button class="logout-btn" @click="logout">退出登录</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isLoggedIn: false, // 是否已登录
      userInfo: {}, // 用户信息
      orderCounts: { // 各状态订单数量
        unpaid: 0,
        unshipped: 0,
        shipped: 0,
        completed: 0
      },
      unreadMessageCount: 0, // 未读消息数量
      couponCount: 0, // 优惠券数量
      recommendProducts: [] // 推荐商品
    }
  },
  onLoad() {
    // 检查登录状态
    this.checkLoginStatus()
  },
  onShow() {
    // 每次显示页面时刷新数据
    this.checkLoginStatus()
    if (this.isLoggedIn) {
      this.loadOrderCounts()
      this.loadUnreadMessageCount()
      this.loadCouponCount()
    }
    this.loadRecommendProducts()
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      const token = uni.getStorageSync('token')
      const userInfo = uni.getStorageSync('userInfo')
      
      this.isLoggedIn = !!token
      if (this.isLoggedIn && userInfo) {
        this.userInfo = JSON.parse(userInfo)
      } else {
        this.userInfo = {}
      }
    },
    
    // 格式化手机号
    formatPhone(phone) {
      if (!phone) return ''
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    },
    
    // 加载订单数量
    async loadOrderCounts() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'getStatusCounts'
          }
        })
        
        if (result.code === 0) {
          this.orderCounts = result.data
        }
      } catch (e) {
        console.error('获取订单数量失败', e)
      }
    },
    
    // 加载未读消息数量
    async loadUnreadMessageCount() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'message',
          data: {
            action: 'getUnreadCount'
          }
        })
        
        if (result.code === 0) {
          this.unreadMessageCount = result.data
        }
      } catch (e) {
        console.error('获取未读消息数量失败', e)
      }
    },
    
    // 加载优惠券数量
    async loadCouponCount() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'coupon',
          data: {
            action: 'getValidCount'
          }
        })
        
        if (result.code === 0) {
          this.couponCount = result.data
        }
      } catch (e) {
        console.error('获取优惠券数量失败', e)
      }
    },
    
    // 加载推荐商品
    async loadRecommendProducts() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'product',
          data: {
            action: 'getRecommend',
            data: {
              limit: 6
            }
          }
        })
        
        if (result.code === 0) {
          this.recommendProducts = result.data
        }
      } catch (e) {
        console.error('获取推荐商品失败', e)
      }
    },
    
    // 退出登录
    logout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            // 清除本地存储的用户信息和token
            uni.removeStorageSync('token')
            uni.removeStorageSync('userInfo')
            
            // 更新状态
            this.isLoggedIn = false
            this.userInfo = {}
            
            uni.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }
        }
      })
    },
    
    // 跳转到登录页
    goToLogin() {
      uni.navigateTo({
        url: '/pages/login/index'
      })
    },
    
    // 跳转到设置页
    goToSettings() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/settings'
      })
    },
    
    // 跳转到消息页
    goToMessages() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/messages'
      })
    },
    
    // 跳转到订单列表
    goToOrderList(status) {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: `/pages/order/list?status=${status}`
      })
    },
    
    // 跳转到售后页面
    goToAfterSale() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/order/after-sale'
      })
    },
    
    // 跳转到地址管理
    goToAddress() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/address'
      })
    },
    
    // 跳转到收藏页面
    goToFavorite() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/favorite'
      })
    },
    
    // 跳转到优惠券页面
    goToCoupon() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/coupon'
      })
    },
    
    // 跳转到健康档案
    goToHealthRecord() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/health-record'
      })
    },
    
    // 跳转到在线咨询
    goToConsult() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/consult'
      })
    },
    
    // 跳转到浏览历史
    goToHistory() {
      if (!this.isLoggedIn) {
        return this.goToLogin()
      }
      
      uni.navigateTo({
        url: '/pages/user/history'
      })
    },
    
    // 跳转到意见反馈
    goToFeedback() {
      uni.navigateTo({
        url: '/pages/user/feedback'
      })
    },
    
    // 联系客服
    contactCustomerService() {
      uni.showToast({
        title: '客服功能暂未开放',
        icon: 'none'
      })
    },
    
    // 跳转到商品详情
    goToProductDetail(productId) {
      uni.navigateTo({
        url: `/pages/product/detail?id=${productId}`
      })
    }
  }
}
</script>

<style lang="scss">
.user-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  
  .user-info-section {
    position: relative;
    height: 300rpx;
    background: linear-gradient(to right, #ff6b6b, #ff4444);
    padding: 30rpx;
    display: flex;
    align-items: center;
    
    .user-info {
      display: flex;
      align-items: center;
      
      .avatar {
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
        border: 4rpx solid rgba(255, 255, 255, 0.3);
      }
      
      .info {
        margin-left: 30rpx;
        
        .nickname {
          font-size: 36rpx;
          color: #fff;
          font-weight: bold;
          margin-bottom: 10rpx;
          display: block;
        }
        
        .phone {
          font-size: 26rpx;
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
    
    .user-actions {
      position: absolute;
      top: 30rpx;
      right: 30rpx;
      display: flex;
      
      .action-item {
        width: 70rpx;
        height: 70rpx;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 20rpx;
        position: relative;
        
        .icon {
          font-size: 36rpx;
          color: #fff;
        }
        
        .badge {
          position: absolute;
          top: -6rpx;
          right: -6rpx;
          min-width: 36rpx;
          height: 36rpx;
          line-height: 36rpx;
          text-align: center;
          background-color: #fff;
          color: #ff4444;
          font-size: 20rpx;
          border-radius: 18rpx;
          padding: 0 8rpx;
        }
      }
    }
  }
  
  .order-section, .services-section, .recommend-section {
    margin: 20rpx;
    background-color: #fff;
    border-radius: 12rpx;
    overflow: hidden;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    .title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
    }
    
    .more {
      display: flex;
      align-items: center;
      
      .text {
        font-size: 26rpx;
        color: #999;
      }
      
      .icon {
        font-size: 24rpx;
        color: #999;
        margin-left: 6rpx;
      }
    }
  }
  
  .order-types {
    display: flex;
    padding: 30rpx 0;
    
    .order-type-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      
      .icon {
        font-size: 50rpx;
        color: #ff4444;
        margin-bottom: 16rpx;
      }
      
      .text {
        font-size: 26rpx;
        color: #666;
      }
      
      .badge {
        position: absolute;
        top: -10rpx;
        right: 50%;
        transform: translateX(20rpx);
        min-width: 36rpx;
        height: 36rpx;
        line-height: 36rpx;
        text-align: center;
        background-color: #ff4444;
        color: #fff;
        font-size: 20rpx;
        border-radius: 18rpx;
        padding: 0 8rpx;
      }
    }
  }
  
  .services-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 20rpx 0;
    
    .service-item {
      width: 25%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20rpx 0;
      position: relative;
      
      .icon {
        font-size: 50rpx;
        color: #ff4444;
        margin-bottom: 16rpx;
      }
      
      .text {
        font-size: 26rpx;
        color: #666;
      }
      
      .badge {
        position: absolute;
        top: 10rpx;
        right: 50%;
        transform: translateX(20rpx);
        min-width: 36rpx;
        height: 36rpx;
        line-height: 36rpx;
        text-align: center;
        background-color: #ff4444;
        color: #fff;
        font-size: 20rpx;
        border-radius: 18rpx;
        padding: 0 8rpx;
      }
    }
  }
  
  .product-list {
    display: flex;
    flex-wrap: wrap;
    padding: 20rpx;
    
    .product-item {
      width: calc(50% - 20rpx);
      margin: 10rpx;
      background-color: #fff;
      border-radius: 12rpx;
      overflow: hidden;
      
      .product-image {
        width: 100%;
        height: 300rpx;
        border-radius: 12rpx 12rpx 0 0;
      }
      
      .product-name {
        font-size: 28rpx;
        color: #333;
        line-height: 1.4;
        padding: 16rpx;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      
      .product-price-wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 16rpx 16rpx;
        
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
  
  .logout-section {
    padding: 40rpx 20rpx;
    
    .logout-btn {
      width: 100%;
      height: 90rpx;
      line-height: 90rpx;
      background-color: #fff;
      color: #ff4444;
      font-size: 30rpx;
      border-radius: 45rpx;
      border: 1rpx solid #ff4444;
    }
  }
}