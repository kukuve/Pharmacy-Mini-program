<template>
  <view class="order-detail-container">
    <view v-if="loading" class="loading">
      <u-loading size="24" mode="circle"></u-loading>
      <text>加载中...</text>
    </view>
    
    <block v-else-if="order">
      <!-- 订单状态 -->
      <view class="status-section">
        <view class="status-icon">
          <u-icon :name="getStatusIcon(order.status)" size="60" :color="getStatusColor(order.status)"></u-icon>
        </view>
        <view class="status-info">
          <view class="status-text">{{ getStatusText(order.status) }}</view>
          <view class="status-desc">{{ getStatusDesc(order) }}</view>
        </view>
      </view>
      
      <!-- 收货地址 -->
      <view class="info-card address-card">
        <view class="card-title">
          <u-icon name="map" size="32" color="#2979ff"></u-icon>
          <text>收货地址</text>
        </view>
        <view class="address-info">
          <view class="contact-info">
            <text class="name">{{ order.address.name }}</text>
            <text class="phone">{{ order.address.phone }}</text>
          </view>
          <view class="address-detail">
            {{ order.address.province }} {{ order.address.city }} {{ order.address.district }} {{ order.address.detail }}
          </view>
        </view>
      </view>
      
      <!-- 订单信息 -->
      <view class="info-card order-info-card">
        <view class="card-title">
          <u-icon name="file-text" size="32" color="#2979ff"></u-icon>
          <text>订单信息</text>
        </view>
        <view class="info-item">
          <text class="label">订单编号</text>
          <view class="value copy-wrapper">
            <text>{{ order.order_no }}</text>
            <u-icon name="file-copy" size="28" color="#2979ff" @click="copyOrderNo"></u-icon>
          </view>
        </view>
        <view class="info-item">
          <text class="label">创建时间</text>
          <text class="value">{{ formatDate(order.create_time) }}</text>
        </view>
        <view class="info-item" v-if="order.pay_time">
          <text class="label">支付时间</text>
          <text class="value">{{ formatDate(order.pay_time) }}</text>
        </view>
        <view class="info-item" v-if="order.payment_method">
          <text class="label">支付方式</text>
          <text class="value">{{ getPaymentMethodText(order.payment_method) }}</text>
        </view>
        <view class="info-item" v-if="order.remark">
          <text class="label">订单备注</text>
          <text class="value">{{ order.remark }}</text>
        </view>
      </view>
      
      <!-- 商品列表 -->
      <view class="info-card products-card">
        <view class="card-title">
          <u-icon name="shopping-cart" size="32" color="#2979ff"></u-icon>
          <text>商品信息</text>
        </view>
        <view class="product-list">
          <view 
            v-for="(product, index) in order.products" 
            :key="index" 
            class="product-item"
          >
            <image class="product-image" :src="product.image" mode="aspectFill"></image>
            <view class="product-info">
              <view class="product-name">{{ product.name }}</view>
              <view class="product-price-qty">
                <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
                <text class="product-qty">x{{ product.quantity }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 金额信息 -->
      <view class="info-card price-card">
        <view class="price-item">
          <text class="label">商品总额</text>
          <text class="value">¥{{ order.total_price.toFixed(2) }}</text>
        </view>
        <view class="price-item">
          <text class="label">运费</text>
          <text class="value">¥0.00</text>
        </view>
        <view class="price-item total">
          <text class="label">实付款</text>
          <text class="value">¥{{ order.total_price.toFixed(2) }}</text>
        </view>
      </view>
      
      <!-- 底部操作栏 -->
      <view class="footer-actions" v-if="showActions">
        <template v-if="order.status === 'unpaid'">
          <u-button type="default" @click="cancelOrder">取消订单</u-button>
          <u-button type="primary" @click="payOrder">立即支付</u-button>
        </template>
        
        <template v-if="order.status === 'shipped'">
          <u-button type="primary" @click="confirmReceive">确认收货</u-button>
        </template>
        
        <template v-if="order.status === 'completed' || order.status === 'cancelled'">
          <u-button type="default" @click="deleteOrder">删除订单</u-button>
        </template>
      </view>
    </block>
    
    <view v-else class="error-view">
      <u-empty mode="order" icon="http://cdn.uviewui.com/uview/empty/order.png">
        <view slot="message">订单不存在或已被删除</view>
      </u-empty>
      <u-button type="primary" @click="goBack">返回订单列表</u-button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderId: '',
      order: null,
      loading: true,
      showActions: true
    }
  },
  
  onLoad(options) {
    if (options.id) {
      this.orderId = options.id
      this.loadOrderDetail()
    } else {
      this.loading = false
    }
  },
  
  methods: {
    // 加载订单详情
    async loadOrderDetail() {
      this.loading = true
      
      try {
        const res = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'getDetail',
            data: {
              order_id: this.orderId
            }
          }
        })
        
        if (res.result.code === 0) {
          this.order = res.result.data
        } else {
          uni.showToast({
            title: res.result.message || '获取订单详情失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('获取订单详情失败', e)
        uni.showToast({
          title: '获取订单详情失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 复制订单号
    copyOrderNo() {
      uni.setClipboardData({
        data: this.order.order_no,
        success: () => {
          uni.showToast({
            title: '订单号已复制',
            icon: 'success'
          })
        }
      })
    },
    
    // 取消订单
    cancelOrder() {
      uni.showModal({
        title: '提示',
        content: '确定要取消该订单吗？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中' })
            
            try {
              const res = await this.$cloud.callFunction({
                name: 'order',
                data: {
                  action: 'cancel',
                  data: { order_id: this.orderId }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '订单已取消',
                  icon: 'success'
                })
                
                // 刷新订单详情
                this.loadOrderDetail()
              } else {
                uni.showToast({
                  title: res.result.message || '取消订单失败',
                  icon: 'none'
                })
              }
            } catch (e) {
              console.error('取消订单失败', e)
              uni.showToast({
                title: '取消订单失败',
                icon: 'none'
              })
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    
    // 支付订单
    payOrder() {
      uni.showModal({
        title: '支付提示',
        content: '本项目为演示，点击确定将直接模拟支付成功',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '支付中' })
            
            try {
              const res = await this.$cloud.callFunction({
                name: 'order',
                data: {
                  action: 'pay',
                  data: { 
                    order_id: this.orderId,
                    payment_method: 'wechat' // 模拟微信支付
                  }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '支付成功',
                  icon: 'success'
                })
                
                // 刷新订单详情
                this.loadOrderDetail()
              } else {
                uni.showToast({
                  title: res.result.message || '支付失败',
                  icon: 'none'
                })
              }
            } catch (e) {
              console.error('支付失败', e)
              uni.showToast({
                title: '支付失败',
                icon: 'none'
              })
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    
    // 确认收货
    confirmReceive() {
      uni.showModal({
        title: '提示',
        content: '确认已收到商品吗？',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中' })
            
            try {
              const res = await this.$cloud.callFunction({
                name: 'order',
                data: {
                  action: 'confirmReceive',
                  data: { order_id: this.orderId }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '确认收货成功',
                  icon: 'success'
                })
                
                // 刷新订单详情
                this.loadOrderDetail()
              } else {
                uni.showToast({
                  title: res.result.message || '确认收货失败',
                  icon: 'none'
                })
              }
            } catch (e) {
              console.error('确认收货失败', e)
              uni.showToast({
                title: '确认收货失败',
                icon: 'none'
              })
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    
    // 删除订单
    deleteOrder() {
      uni.showModal({
        title: '提示',
        content: '确定要删除该订单吗？删除后将无法恢复',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '处理中' })
            
            try {
              const res = await this.$cloud.callFunction({
                name: 'order',
                data: {
                  action: 'delete',
                  data: { order_id: this.orderId }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                // 返回订单列表
                setTimeout(() => {
                  uni.navigateBack()
                }, 1500)
              } else {
                uni.showToast({
                  title: res.result.message || '删除失败',
                  icon: 'none'
                })
              }
            } catch (e) {
              console.error('删除订单失败', e)
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              })
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    
    // 返回订单列表
    goBack() {
      uni.navigateBack()
    },
    
    // 获取订单状态图标
    getStatusIcon(status) {
      const iconMap = {
        'unpaid': 'rmb-circle',
        'unshipped': 'shopping-cart',
        'shipped': 'car',
        'completed': 'checkmark-circle',
        'cancelled': 'close-circle'
      }
      
      return iconMap[status] || 'info-circle'
    },
    
    // 获取订单状态颜色
    getStatusColor(status) {
      const colorMap = {
        'unpaid': '#ff9900',
        'unshipped': '#2979ff',
        'shipped': '#0099ff',
        'completed': '#19be6b',
        'cancelled': '#909399'
      }
      
      return colorMap[status] || '#909399'
    },
    
    // 获取订单状态文本
    getStatusText(status) {
      const statusMap = {
        'unpaid': '待付款',
        'unshipped': '待发货',
        'shipped': '待收货',
        'completed': '已完成',
        'cancelled': '已取消'
      }
      
      return statusMap[status] || '未知状态'
    },
    
    // 获取订单状态描述
    getStatusDesc(order) {
      switch (order.status) {
        case 'unpaid':
          return '请在30分钟内完成支付，超时订单将自动取消'
        case 'unshipped':
          return '商家正在处理您的订单，请耐心等待'
        case 'shipped':
          return '商品已发出，请注意查收'
        case 'completed':
          return '订单已完成，感谢您的购买'
        case 'cancelled':
          return order.status_desc || '订单已取消'
        default:
          return ''
      }
    },
    
    // 格式化日期
    formatDate(dateStr) {
      if (!dateStr) return ''
      
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    },
    
    // 获取支付方式文本
    getPaymentMethodText(method) {
      const methodMap = {
        'wechat': '微信支付',
        'alipay': '支付宝',
        'balance': '余额支付'
      }
      
      return methodMap[method] || method
    }
  }
}
</script>

<style lang="scss" scoped>
.order-detail-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.loading, .error-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  
  .u-button {
    margin-top: 40rpx;
  }
}

.status-section {
  background-color: #2979ff;
  padding: 40rpx 30rpx;
  display: flex;
  align-items: center;
  color: #fff;
  
  .status-info {
    margin-left: 30rpx;
    
    .status-text {
      font-size: 36rpx;
      font-weight: bold;
      margin-bottom: 10rpx;
    }
    
    .status-desc {
      font-size: 26rpx;
      opacity: 0.9;
    }
  }
}

.info-card {
  background-color: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .card-title {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    
    text {
      margin-left: 10rpx;
    }
  }
}

.address-card {
  .address-info {
    padding-left: 10rpx;
    
    .contact-info {
      margin-bottom: 10rpx;
      
      .name {
        font-size: 30rpx;
        font-weight: bold;
        margin-right: 20rpx;
      }
      
      .phone {
        font-size: 28rpx;
        color: #666;
      }
    }
    
    .address-detail {
      font-size: 28rpx;
      color: #333;
      line-height: 1.5;
    }
  }
}

.order-info-card {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      font-size: 28rpx;
      color: #666;
    }
    
    .value {
      font-size: 28rpx;
      color: #333;
    }
    
    .copy-wrapper {
      display: flex;
      align-items: center;
      
      text {
        margin-right: 10rpx;
      }
    }
  }
}

.products-card {
  .product-list {
    .product-item {
      display: flex;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #f5f5f5;
      
      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      
      .product-image {
        width: 140rpx;
        height: 140rpx;
        border-radius: 8rpx;
        background-color: #f5f5f5;
      }
      
      .product-info {
        flex: 1;
        margin-left: 20rpx;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        
        .product-name {
          font-size: 28rpx;
          color: #333;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .product-price-qty {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .product-price {
            font-size: 28rpx;
            color: #f04c41;
            font-weight: bold;
          }
          
          .product-qty {
            font-size: 24rpx;
            color: #999;
          }
        }
      }
    }
  }
}

.price-card {
  .price-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      font-size: 28rpx;
      color: #666;
    }
    
    .value {
      font-size: 28rpx;
      color: #333;
    }
    
    &.total {
      margin-top: 20rpx;
      padding-top: 20rpx;
      border-top: 1rpx solid #f5f5f5;
      
      .label {
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
      }
      
      .value {
        font-size: 32rpx;
        color: #f04c41;
        font-weight: bold;
      }
    }
  }
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 20rpx;
  display: flex;
  justify-content: flex-end;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .u-button {
    margin-left: 20rpx;
    min-width: 180rpx;
  }
}
</style>