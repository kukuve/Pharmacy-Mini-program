<template>
  <view class="logistics-container">
    <!-- 物流信息头部 -->
    <view class="logistics-header">
      <view class="company-info">
        <text class="label">物流公司：</text>
        <text class="value">{{ logisticsInfo.company || '暂无' }}</text>
      </view>
      <view class="tracking-info">
        <text class="label">物流单号：</text>
        <text class="value">{{ logisticsInfo.tracking_no || '暂无' }}</text>
        <button class="copy-btn" @click="copyTrackingNo" v-if="logisticsInfo.tracking_no">复制</button>
      </view>
    </view>
    
    <!-- 物流状态时间线 -->
    <view class="logistics-timeline">
      <view class="timeline-title">物流跟踪</view>
      <view class="timeline-content">
        <view class="timeline-item" v-for="(item, index) in logisticsInfo.tracking || []" :key="index">
          <view class="time-wrap">
            <text class="time">{{ formatTime(item.time, 'HH:mm') }}</text>
            <text class="date">{{ formatTime(item.time, 'MM-DD') }}</text>
          </view>
          <view class="status-wrap">
            <view class="dot" :class="{ active: index === 0, done: true }"></view>
            <view class="line" :class="{ done: index !== logisticsInfo.tracking.length - 1 }" v-if="index !== logisticsInfo.tracking.length - 1"></view>
          </view>
          <view class="desc">{{ item.description }}</view>
        </view>
        
        <!-- 暂无物流信息 -->
        <view class="empty-status" v-if="!logisticsInfo.tracking || logisticsInfo.tracking.length === 0">
          <image class="empty-image" src="/static/images/empty-logistics.png" mode="aspectFit"></image>
          <text class="empty-text">暂无物流信息</text>
        </view>
      </view>
    </view>
    
    <!-- 收货地址 -->
    <view class="address-section">
      <view class="section-title">收货地址</view>
      <view class="address-content">
        <view class="user-info">
          <text class="name">{{ orderInfo.address.name }}</text>
          <text class="phone">{{ orderInfo.address.phone }}</text>
        </view>
        <view class="address-detail">
          <text class="text">{{ getFullAddress(orderInfo.address) }}</text>
        </view>
      </view>
    </view>
    
    <!-- 商品信息 -->
    <view class="product-section">
      <view class="section-title">商品信息</view>
      <view class="product-item" v-for="(product, index) in orderInfo.products" :key="index">
        <image class="product-image" :src="product.image" mode="aspectFill"></image>
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-spec" v-if="product.spec">{{ product.spec }}</text>
          <view class="product-price-wrap">
            <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
            <text class="product-quantity">x{{ product.quantity }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button class="action-btn" @click="contactService">联系客服</button>
      <button class="action-btn primary" @click="confirmReceive" v-if="orderInfo.status === 'shipped'">确认收货</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderId: '', // 订单ID
      orderInfo: {
        address: {}
      }, // 订单信息
      logisticsInfo: {
        company: '',
        tracking_no: '',
        tracking: []
      }, // 物流信息
      isLoggedIn: false // 是否已登录
    }
  },
  onLoad(options) {
    if (options.id) {
      this.orderId = options.id
      this.checkLoginStatus()
    } else {
      uni.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  onShow() {
    if (this.isLoggedIn && this.orderId) {
      this.loadOrderInfo()
    }
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      const token = uni.getStorageSync('token')
      this.isLoggedIn = !!token
      
      if (!this.isLoggedIn) {
        uni.navigateTo({
          url: '/pages/login/index'
        })
      }
    },
    
    // 加载订单信息
    async loadOrderInfo() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'getDetail',
            data: {
              order_id: this.orderId
            }
          }
        })
        
        if (result.code === 0) {
          this.orderInfo = result.data
          
          // 设置物流信息
          if (this.orderInfo.logistics) {
            this.logisticsInfo = this.orderInfo.logistics
          }
          
          // 如果没有物流信息，模拟一些数据
          if (!this.logisticsInfo.tracking || this.logisticsInfo.tracking.length === 0) {
            if (this.orderInfo.status === 'shipped') {
              this.logisticsInfo.tracking = this.getMockTrackingData()
            }
          }
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('获取订单详情失败', e)
        uni.showToast({
          title: '获取订单详情失败',
          icon: 'none'
        })
      }
    },
    
    // 获取模拟的物流跟踪数据
    getMockTrackingData() {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      
      return [
        {
          time: now.toISOString(),
          description: '【收货城市】快件已到达XX市配送中心'
        },
        {
          time: yesterday.toISOString(),
          description: '【中转城市】快件已从XX市发出，预计明天送达'
        },
        {
          time: twoDaysAgo.toISOString(),
          description: '【发货城市】快件已从XX市发出'
        },
        {
          time: twoDaysAgo.toISOString(),
          description: '【发货城市】商家已发货'
        }
      ]
    },
    
    // 格式化时间
    formatTime(timeStr, format) {
      if (!timeStr) return ''
      
      const date = new Date(timeStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`
      } else if (format === 'MM-DD') {
        return `${month}-${day}`
      } else if (format === 'HH:mm') {
        return `${hours}:${minutes}`
      }
      
      return `${year}-${month}-${day} ${hours}:${minutes}`
    },
    
    // 获取完整地址
    getFullAddress(address) {
      if (!address) return ''
      
      return `${address.province || ''} ${address.city || ''} ${address.district || ''} ${address.detail || ''}`
    },
    
    // 复制物流单号
    copyTrackingNo() {
      if (!this.logisticsInfo.tracking_no) return
      
      uni.setClipboardData({
        data: this.logisticsInfo.tracking_no,
        success: () => {
          uni.showToast({
            title: '复制成功',
            icon: 'success'
          })
        }
      })
    },
    
    // 联系客服
    contactService() {
      uni.showToast({
        title: '客服功能暂未开放',
        icon: 'none'
      })
    },
    
    // 确认收货
    confirmReceive() {
      uni.showModal({
        title: '提示',
        content: '确认已收到商品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const { result } = await this.$cloud.callFunction({
                name: 'order',
                data: {
                  action: 'confirmReceive',
                  data: {
                    order_id: this.orderId
                  }
                }
              })
              
              if (result.code === 0) {
                uni.showToast({
                  title: '确认收货成功',
                  icon: 'success'
                })
                
                // 跳转到订单详情页
                setTimeout(() => {
                  uni.redirectTo({
                    url: `/pages/order/detail?id=${this.orderId}`
                  })
                }, 1500)
              } else {
                throw new Error(result.message)
              }
            } catch (e) {
              console.error('确认收货失败', e)
              uni.showToast({
                title: '确认收货失败',
                icon: 'none'
              })
            }
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.logistics-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 120rpx;
  
  // 物流信息头部
  .logistics-header {
    background-color: #fff;
    padding: 30rpx;
    
    .company-info,
    .tracking-info {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .label {
        font-size: 28rpx;
        color: #666;
        margin-right: 10rpx;
      }
      
      .value {
        font-size: 28rpx;
        color: #333;
      }
      
      .copy-btn {
        margin-left: 20rpx;
        font-size: 24rpx;
        color: #666;
        background-color: #f8f8f8;
        padding: 4rpx 16rpx;
        border-radius: 20rpx;
        line-height: 1.5;
        
        &::after {
          border: none;
        }
      }
    }
  }
  
  // 物流状态时间线
  .logistics-timeline {
    background-color: #fff;
    margin-top: 20rpx;
    padding: 30rpx;
    
    .timeline-title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      margin-bottom: 30rpx;
    }
    
    .timeline-content {
      .timeline-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 40rpx;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .time-wrap {
          width: 120rpx;
          text-align: center;
          
          .time {
            font-size: 26rpx;
            color: #333;
            display: block;
            margin-bottom: 4rpx;
          }
          
          .date {
            font-size: 22rpx;
            color: #999;
          }
        }
        
        .status-wrap {
          position: relative;
          width: 40rpx;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 30rpx;
          
          .dot {
            width: 20rpx;
            height: 20rpx;
            border-radius: 50%;
            background-color: #ddd;
            
            &.active {
              background-color: #ff4444;
              width: 24rpx;
              height: 24rpx;
            }
            
            &.done {
              background-color: #ff4444;
            }
          }
          
          .line {
            position: absolute;
            top: 20rpx;
            width: 2rpx;
            height: calc(100% + 40rpx);
            background-color: #ddd;
            
            &.done {
              background-color: #ff4444;
            }
          }
        }
        
        .desc {
          flex: 1;
          font-size: 26rpx;
          color: #333;
          padding-top: 4rpx;
          line-height: 1.5;
        }
      }
      
      .empty-status {
        padding: 60rpx 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        .empty-image {
          width: 200rpx;
          height: 200rpx;
          margin-bottom: 20rpx;
        }
        
        .empty-text {
          font-size: 28rpx;
          color: #999;
        }
      }
    }
  }
  
  // 收货地址
  .address-section {
    background-color: #fff;
    margin-top: 20rpx;
    padding: 30rpx;
    
    .section-title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      margin-bottom: 20rpx;
    }
    
    .address-content {
      .user-info {
        margin-bottom: 10rpx;
        
        .name {
          font-size: 28rpx;
          color: #333;
          margin-right: 20rpx;
        }
        
        .phone {
          font-size: 28rpx;
          color: #666;
        }
      }
      
      .address-detail {
        .text {
          font-size: 26rpx;
          color: #333;
          line-height: 1.4;
        }
      }
    }
  }
  
  // 商品信息
  .product-section {
    background-color: #fff;
    margin-top: 20rpx;
    padding: 30rpx;
    
    .section-title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      margin-bottom: 20rpx;
    }
    
    .product-item {
      display: flex;
      align-items: flex-start;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #eee;
      
      &:first-child {
        padding-top: 0;
      }
      
      &:last-child {
        padding-bottom: 0;
        border-bottom: none;
      }
      
      .product-image {
        width: 160rpx;
        height: 160rpx;
        border-radius: 8rpx;
        margin-right: 20rpx;
      }
      
      .product-info {
        flex: 1;
        
        .product-name {
          font-size: 28rpx;
          color: #333;
          line-height: 1.4;
          margin-bottom: 10rpx;
        }
        
        .product-spec {
          font-size: 24rpx;
          color: #999;
          margin-bottom: 20rpx;
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
          
          .product-quantity {
            font-size: 26rpx;
            color: #999;
          }
        }
      }
    }
  }
  
  // 底部操作栏
  .bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #fff;
    padding: 20rpx 30rpx;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
    
    .action-btn {
      margin-left: 20rpx;
      font-size: 28rpx;
      padding: 16rpx 30rpx;
      border-radius: 40rpx;
      background-color: #fff;
      color: #666;
      border: 1rpx solid #ddd;
      
      &::after {
        border: none;
      }
      
      &.primary {
        background-color: #ff4444;
        color: #fff;
        border: none;
      }
    }
  }
}
</style>