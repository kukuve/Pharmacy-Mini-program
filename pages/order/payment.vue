<template>
  <view class="container">
    <!-- 支付金额 -->
    <view class="amount-section">
      <text class="amount-label">支付金额</text>
      <text class="amount-value">¥{{ amount.toFixed(2) }}</text>
    </view>
    
    <!-- 支付方式 -->
    <view class="payment-section">
      <view class="section-title">支付方式</view>
      <view class="payment-item">
        <view class="payment-info">
          <text class="iconfont icon-wechat"></text>
          <text class="payment-name">微信支付</text>
        </view>
        <text class="iconfont icon-check"></text>
      </view>
    </view>
    
    <!-- 支付提示 -->
    <view class="payment-tips">
      <text class="tip-item">支付完成后，可在"订单列表"中查看订单状态</text>
      <text class="tip-item">如遇支付问题，请联系客服处理</text>
    </view>
    
    <!-- 底部支付按钮 -->
    <view class="action-bar safe-area-inset-bottom">
      <view class="payment-info">
        <text>实付金额：</text>
        <text class="payment-amount">¥{{ amount.toFixed(2) }}</text>
      </view>
      <button class="btn-payment" :disabled="isProcessing" @tap="handlePayment">
        {{ isProcessing ? '支付中...' : '立即支付' }}
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderId: '',
      amount: 0,
      isProcessing: false
    }
  },
  
  onLoad(options) {
    if (options.orderId && options.amount) {
      this.orderId = options.orderId
      this.amount = parseFloat(options.amount)
    } else {
      uni.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  
  methods: {
    // 处理支付
    async handlePayment() {
      if (this.isProcessing) return
      
      this.isProcessing = true
      try {
        // 调用云函数获取支付参数
        const { result } = await uniCloud.callFunction({
          name: 'createPayment',
          data: {
            orderId: this.orderId,
            amount: this.amount
          }
        })
        
        if (!result || !result.payment) {
          throw new Error('获取支付参数失败')
        }
        
        // 发起微信支付
        await this.requestPayment(result.payment)
        
        // 支付成功后更新订单状态
        await uniCloud.callFunction({
          name: 'updateOrderStatus',
          data: {
            orderId: this.orderId,
            status: 'unshipped',
            payTime: Date.now()
          }
        })
        
        // 显示支付成功提示
        uni.showToast({
          title: '支付成功',
          icon: 'success'
        })
        
        // 延迟跳转到订单详情页
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/order/detail?id=${this.orderId}`
          })
        }, 1500)
      } catch (error) {
        console.error('支付失败:', error)
        
        // 判断是否是用户取消支付
        if (error.errMsg && error.errMsg.includes('requestPayment:fail cancel')) {
          uni.showToast({
            title: '支付已取消',
            icon: 'none'
          })
        } else {
          uni.showToast({
            title: '支付失败，请重试',
            icon: 'none'
          })
        }
      } finally {
        this.isProcessing = false
      }
    },
    
    // 发起微信支付
    requestPayment(paymentData) {
      return new Promise((resolve, reject) => {
        uni.requestPayment({
          provider: 'wxpay',
          ...paymentData,
          success: (res) => {
            resolve(res)
          },
          fail: (err) => {
            reject(err)
          }
        })
      })
    }
  }
}
</script>

<style>
.container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 120rpx;
}

/* 金额展示样式 */
.amount-section {
  background-color: #ffffff;
  padding: 60rpx 30rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.amount-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}

.amount-value {
  font-size: 64rpx;
  font-weight: bold;
  color: #333;
}

/* 支付方式样式 */
.payment-section {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 30rpx;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-info {
  display: flex;
  align-items: center;
}

.payment-info .iconfont {
  font-size: 40rpx;
  color: #3cc51f;
  margin-right: 20rpx;
}

.payment-name {
  font-size: 28rpx;
  color: #333;
}

.payment-item .icon-check {
  font-size: 32rpx;
  color: #3cc51f;
}

/* 支付提示样式 */
.payment-tips {
  padding: 30rpx;
}

.tip-item {
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
  display: block;
}

/* 底部支付按钮样式 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.payment-info {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.payment-amount {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6700;
}

.btn-payment {
  width: 240rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background-color: #3cc51f;
  color: #ffffff;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-left: 30rpx;
}

.btn-payment[disabled] {
  background-color: #ccc;
}
</style>