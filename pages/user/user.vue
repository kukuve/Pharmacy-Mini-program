<template>
  <view class="container">
    <!-- 用户信息区域 -->
    <view class="user-info-section">
      <view class="user-info" v-if="isLogin">
        <image :src="userInfo.avatarUrl || '/static/images/default-avatar.png'" class="avatar" mode="aspectFill"></image>
        <view class="user-detail">
          <text class="nickname">{{ userInfo.nickName || '微信用户' }}</text>
          <text class="user-id">会员ID: {{ openid.substring(0, 8) }}...</text>
        </view>
      </view>
      <view class="user-info" v-else @tap="handleLogin">
        <image src="/static/images/default-avatar.png" class="avatar" mode="aspectFill"></image>
        <view class="user-detail">
          <text class="nickname">点击登录</text>
          <text class="login-tip">登录后享受更多权益</text>
        </view>
      </view>
      <view class="user-stats">
        <view class="stat-item" @tap="navigateTo('/pages/user/favorite')">
          <text class="stat-num">{{ favoriteCount }}</text>
          <text class="stat-label">收藏</text>
        </view>
        <view class="stat-item" @tap="navigateTo('/pages/user/history')">
          <text class="stat-num">{{ historyCount }}</text>
          <text class="stat-label">浏览</text>
        </view>
        <view class="stat-item" @tap="navigateTo('/pages/user/coupon')">
          <text class="stat-num">{{ couponCount }}</text>
          <text class="stat-label">优惠券</text>
        </view>
      </view>
    </view>
    
    <!-- 订单区域 -->
    <view class="order-section">
      <view class="section-header" @tap="navigateTo('/pages/order/list')">
        <text class="section-title">我的订单</text>
        <view class="more">
          <text>全部订单</text>
          <text class="iconfont icon-right"></text>
        </view>
      </view>
      <view class="order-types">
        <view class="order-type-item" @tap="navigateTo('/pages/order/list?status=unpaid')">
          <view class="order-icon-wrapper">
            <text class="iconfont icon-wallet"></text>
            <text class="badge" v-if="orderCounts.unpaid > 0">{{ orderCounts.unpaid }}</text>
          </view>
          <text>待付款</text>
        </view>
        <view class="order-type-item" @tap="navigateTo('/pages/order/list?status=unshipped')">
          <view class="order-icon-wrapper">
            <text class="iconfont icon-package"></text>
            <text class="badge" v-if="orderCounts.unshipped > 0">{{ orderCounts.unshipped }}</text>
          </view>
          <text>待发货</text>
        </view>
        <view class="order-type-item" @tap="navigateTo('/pages/order/list?status=shipped')">
          <view class="order-icon-wrapper">
            <text class="iconfont icon-truck"></text>
            <text class="badge" v-if="orderCounts.shipped > 0">{{ orderCounts.shipped }}</text>
          </view>
          <text>待收货</text>
        </view>
        <view class="order-type-item" @tap="navigateTo('/pages/order/list?status=completed')">
          <view class="order-icon-wrapper">
            <text class="iconfont icon-comment"></text>
          </view>
          <text>已完成</text>
        </view>
        <view class="order-type-item" @tap="navigateTo('/pages/order/list?status=afterSale')">
          <view class="order-icon-wrapper">
            <text class="iconfont icon-service"></text>
          </view>
          <text>售后</text>
        </view>
      </view>
    </view>
    
    <!-- 功能区域 -->
    <view class="function-section">
      <view class="function-group">
        <view class="function-item" @tap="navigateTo('/pages/user/address')">
          <text class="iconfont icon-location"></text>
          <text class="function-name">收货地址</text>
          <text class="iconfont icon-right"></text>
        </view>
        <view class="function-item" @tap="navigateTo('/pages/user/health')">
          <text class="iconfont icon-health"></text>
          <text class="function-name">健康档案</text>
          <text class="iconfont icon-right"></text>
        </view>
        <view class="function-item" @tap="navigateTo('/pages/user/prescription')">
          <text class="iconfont icon-prescription"></text>
          <text class="function-name">我的处方</text>
          <text class="iconfont icon-right"></text>
        </view>
      </view>
      
      <view class="function-group">
        <view class="function-item" @tap="contactService">
          <text class="iconfont icon-service"></text>
          <text class="function-name">联系客服</text>
          <text class="iconfont icon-right"></text>
        </view>
        <view class="function-item" @tap="navigateTo('/pages/user/feedback')">
          <text class="iconfont icon-feedback"></text>
          <text class="function-name">意见反馈</text>
          <text class="iconfont icon-right"></text>
        </view>
        <view class="function-item" @tap="navigateTo('/pages/user/settings')">
          <text class="iconfont icon-settings"></text>
          <text class="function-name">设置</text>
          <text class="iconfont icon-right"></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  data() {
    return {
      favoriteCount: 0,
      historyCount: 0,
      couponCount: 0,
      orderCounts: {
        unpaid: 0,
        unshipped: 0,
        shipped: 0
      }
    }
  },
  
  computed: {
    ...mapState('user', ['isLogin', 'userInfo', 'openid'])
  },
  
  onShow() {
    // 如果已登录，加载用户相关数据
    if (this.isLogin) {
      this.loadUserData()
    }
  },
  
  methods: {
    ...mapActions('user', ['login', 'getUserInfo']),
    
    // 处理登录
    async handleLogin() {
      try {
        uni.showLoading({
          title: '登录中'
        })
        
        // 微信登录获取openid
        await this.login()
        
        // 获取用户信息
        await this.getUserInfo()
        
        // 加载用户数据
        this.loadUserData()
        
        uni.hideLoading()
      } catch (error) {
        uni.hideLoading()
        uni.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
        console.error('登录失败:', error)
      }
    },
    
    // 加载用户相关数据
    async loadUserData() {
      try {
        // 加载收藏数量
        const favoriteRes = await uniCloud.callFunction({
          name: 'getUserFavoriteCount',
          data: { userId: this.openid }
        })
        this.favoriteCount = favoriteRes.result.count || 0
        
        // 加载浏览历史数量
        const historyRes = await uniCloud.callFunction({
          name: 'getUserHistoryCount',
          data: { userId: this.openid }
        })
        this.historyCount = historyRes.result.count || 0
        
        // 加载优惠券数量
        const couponRes = await uniCloud.callFunction({
          name: 'getUserCouponCount',
          data: { userId: this.openid }
        })
        this.couponCount = couponRes.result.count || 0
        
        // 加载订单数量
        const orderRes = await uniCloud.callFunction({
          name: 'getOrderCounts',
          data: { userId: this.openid }
        })
        this.orderCounts = orderRes.result || {
          unpaid: 0,
          unshipped: 0,
          shipped: 0
        }
      } catch (error) {
        console.error('加载用户数据失败:', error)
      }
    },
    
    // 页面导航
    navigateTo(url) {
      // 如果需要登录的页面，先检查登录状态
      if (url.includes('/pages/user/') && !this.isLogin) {
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      uni.navigateTo({
        url
      })
    },
    
    // 联系客服
    contactService() {
      // 这里可以使用微信小程序的客服功能
      // 或者跳转到自定义的客服页面
      uni.showToast({
        title: '正在连接客服...',
        icon: 'none'
      })
    }
  }
}
</script>

<style>
.container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 20rpx;
}

/* 用户信息区域样式 */
.user-info-section {
  background-color: #3cc51f;
  padding: 40rpx 30rpx;
  color: #ffffff;
  position: relative;
  overflow: hidden;
}

.user-info-section::after {
  content: '';
  position: absolute;
  bottom: -100rpx;
  right: -100rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.user-detail {
  margin-left: 30rpx;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.user-id, .login-tip {
  font-size: 24rpx;
  opacity: 0.8;
}

.user-stats {
  display: flex;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 10rpx;
  padding: 20rpx 0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.stat-item:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 20%;
  height: 60%;
  width: 1rpx;
  background-color: rgba(255, 255, 255, 0.3);
}

.stat-num {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 24rpx;
}

/* 订单区域样式 */
.order-section {
  background-color: #ffffff;
  border-radius: 10rpx;
  margin: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.more {
  font-size: 26rpx;
  color: #999;
  display: flex;
  align-items: center;
}

.more .icon-right {
  font-size: 24rpx;
  margin-left: 6rpx;
}

.order-types {
  display: flex;
  justify-content: space-between;
}

.order-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 26rpx;
  color: #333;
}

.order-icon-wrapper {
  position: relative;
  margin-bottom: 10rpx;
}

.order-icon-wrapper .iconfont {
  font-size: 48rpx;
  color: #3cc51f;
}

.badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  background-color: #ff6700;
  color: #ffffff;
  font-size: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  text-align: center;
  border-radius: 16rpx;
  padding: 0 6rpx;
}

/* 功能区域样式 */
.function-section {
  margin: 20rpx;
}

.function-group {
  background-color: #ffffff;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.function-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.function-item:last-child {
  border-bottom: none;
}

.function-item .iconfont {
  font-size: 40rpx;
  color: #3cc51f;
  margin-right: 20rpx;
}

.function