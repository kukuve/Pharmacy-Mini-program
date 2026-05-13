<template>
  <view class="pay-container">
    <!-- 订单信息 -->
    <view class="order-info-section">
      <view class="amount-wrap">
        <text class="label">支付金额</text>
        <text class="amount">¥{{ orderInfo.total_amount ? orderInfo.total_amount.toFixed(2) : '0.00' }}</text>
      </view>
      <view class="order-detail">
        <text class="order-no">订单编号：{{ orderInfo.order_no || '' }}</text>
      </view>
    </view>
    
    <!-- 支付方式 -->
    <view class="payment-section">
      <view class="section-title">支付方式</view>
      <view class="payment-list">
        <view 
          class="payment-item" 
          v-for="(item, index) in paymentMethods" 
          :key="index"
          @click="selectPayment(item.value)"
        >
          <view class="payment-info">
            <image class="payment-icon" :src="item.icon" mode="aspectFit"></image>
            <text class="payment-name">{{ item.name }}</text>
          </view>
          <view class="payment-select">
            <view class="radio" :class="{ active: selectedPayment === item.value }"></view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 支付按钮 -->
    <view class="bottom-bar">
      <button class="pay-btn" @click="confirmPay">确认支付</button>
    </view>
    
    <!-- 支付确认弹窗 -->
    <view class="payment-modal" v-if="showPaymentModal">
      <view class="modal-mask" @click="cancelPayment"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">确认支付</text>
          <text class="modal-close" @click="cancelPayment">×</text>
        </view>
        <view class="modal-body">
          <view class="modal-amount">¥{{ orderInfo.total_amount ? orderInfo.total_amount.toFixed(2) : '0.00' }}</view>
          <view class="modal-info">
            <text class="modal-label">支付方式</text>
            <text class="modal-value">{{ getPaymentName(selectedPayment) }}</text>
          </view>
          <view class="modal-info">
            <text class="modal-label">订单编号</text>
            <text class="modal-value">{{ orderInfo.order_no || '' }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="cancelPayment">取消</button>
          <button class="modal-btn confirm" @click="processPay">确认支付</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderId: '', // 订单ID
      orderInfo: {}, // 订单信息
      paymentMethods: [
        {
          name: '微信支付',
          value: 'wechat',
          icon: '/static/images/payment-wechat.png'
        },
        {
          name: '支付宝',
          value: 'alipay',
          icon: '/static/images/payment-alipay.png'
        }
      ],
      selectedPayment: 'wechat', // 默认选择微信支付
      showPaymentModal: false, // 是否显示支付确认弹窗
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
          
          // 如果订单已支付，跳转到订单详情页
          if (this.orderInfo.status !== 'unpaid') {
            uni.showToast({
              title: '该订单已支付',
              icon: 'none'
            })
            setTimeout(() => {
              uni.redirectTo({
                url: `/pages/order/detail?id=${this.orderId}`
              })
            }, 1500)
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
    
    // 选择支付方式
    selectPayment(payment) {
      this.selectedPayment = payment
    },
    
    // 获取支付方式名称
    getPaymentName(payment) {
      const method = this.paymentMethods.find(item => item.value === payment)
      return method ? method.name : ''
    },
    
    // 确认支付
    confirmPay() {
      this.showPaymentModal = true
    },
    
    // 取消支付
    cancelPayment() {
      this.showPaymentModal = false
    },
    
    // 处理支付
    async processPay() {
      try {
        uni.showLoading({
          title: '支付处理中...'
        })
        
        const { result } = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'pay',
            data: {
              order_id: this.orderId,
              payment_method: this.selectedPayment
            }
          }
        })
        
        uni.hideLoading()
        
        if (result.code === 0) {
          // 模拟支付成功
          this.showPaymentModal = false
          uni.showToast({
            title: '支付成功',
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
        uni.hideLoading()
        console.error('支付失败', e)
        uni.showToast({
          title: '支付失败，请重试',
          icon: 'none'
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.pay-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 120rpx;
  
  // 订单信息部分
  .order-info-section {
    background-color: #fff;
    padding: 40rpx 30rpx;
    
    .amount-wrap {
      text-align: center;
      margin-bottom: 30rpx;
      
      .label {
        font-size: 28rpx;
        color: #666;
        margin-bottom: 10rpx;
        display: block;
      }
      
      .amount {
        font-size: 60rpx;
        color: #333;
        font-weight: bold;
      }
    }
    
    .order-detail {
      text-align: center;
      
      .order-no {
        font-size: 26rpx;
        color: #999;
      }
    }
  }
  
  // 支付方式部分
  .payment-section {
    background-color: #fff;
    margin-top: 20rpx;
    padding: 30rpx;
    
    .section-title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      margin-bottom: 20rpx;
    }
    
    .payment-list {
      .payment-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #eee;
        
        &:last-child {
          border-bottom: none;
        }
        
        .payment-info {
          display: flex;
          align-items: center;
          
          .payment-icon {
            width: 60rpx;
            height: 60rpx;
            margin-right: 20rpx;
          }
          
          .payment-name {
            font-size: 28rpx;
            color: #333;
          }
        }
        
        .payment-select {
          .radio {
            width: 40rpx;
            height: 40rpx;
            border-radius: 50%;
            border: 1rpx solid #ddd;
            position: relative;
            
            &.active {
              border-color: #ff4444;
              
              &::after {
                content: '';
                position: absolute;
                width: 24rpx;
                height: 24rpx;
                background-color: #ff4444;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              }
            }
          }
        }
      }
    }
  }
  
  // 底部支付按钮
  .bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #fff;
    padding: 20rpx 30rpx;
    box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
    
    .pay-btn {
      width: 100%;
      height: 80rpx;
      line-height: 80rpx;
      background-color: #ff4444;
      color: #fff;
      font-size: 30rpx;
      border-radius: 40rpx;
      
      &::after {
        border: none;
      }
    }
  }
  
  // 支付确认弹窗
  .payment-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    
    .modal-mask {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: #fff;
      border-radius: 20rpx 20rpx 0 0;
      overflow: hidden;
      
      .modal-header {
        padding: 30rpx;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1rpx solid #eee;
        
        .modal-title {
          font-size: 32rpx;
          color: #333;
          font-weight: bold;
        }
        
        .modal-close {
          font-size: 40rpx;
          color: #999;
          padding: 0 20rpx;
        }
      }
      
      .modal-body {
        padding: 30rpx;
        
        .modal-amount {
          font-size: 48rpx;
          color: #333;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30rpx;
        }
        
        .modal-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20rpx;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          .modal-label {
            font-size: 26rpx;
            color: #666;
          }
          
          .modal-value {
            font-size: 26rpx;
            color: #333;
          }
        }
      }
      
      .modal-footer {
        padding: 30rpx;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .modal-btn {
          flex: 1;
          height: 80rpx;
          line-height: 80rpx;
          font-size: 30rpx;
          border-radius: 40rpx;
          
          &::after {
            border: none;
          }
          
          &.cancel {
            background-color: #f8f8f8;
            color: #666;
            margin-right: 20rpx;
          }
          
          &.confirm {
            background-color: #ff4444;
            color: #fff;
          }
        }
      }
    }
  }
}
</style>