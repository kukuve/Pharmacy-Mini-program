<template>
  <view class="order-list-container">
    <!-- 顶部状态栏 -->
    <view class="status-tabs">
      <view 
        v-for="(tab, index) in statusTabs" 
        :key="index" 
        class="tab-item" 
        :class="{ active: currentStatus === tab.value }"
        @click="switchStatus(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>
    
    <!-- 订单列表 -->
    <view class="order-list">
      <view v-if="loading" class="loading">
        <u-loading size="24" mode="circle"></u-loading>
        <text>加载中...</text>
      </view>
      
      <view v-else-if="orderList.length === 0" class="empty-list">
        <u-empty mode="order" icon="http://cdn.uviewui.com/uview/empty/order.png">
          <view slot="message">暂无相关订单</view>
        </u-empty>
      </view>
      
      <view v-else class="order-items">
        <view 
          v-for="(order, index) in orderList" 
          :key="order._id" 
          class="order-item"
          @click="goToDetail(order._id)"
        >
          <!-- 订单头部 -->
          <view class="order-header">
            <view class="order-no">订单号：{{ order.order_no }}</view>
            <view class="order-status" :class="getStatusClass(order.status)">
              {{ getStatusText(order.status) }}
            </view>
          </view>
          
          <!-- 订单商品 -->
          <view class="order-products">
            <view 
              v-for="(product, pIndex) in order.products" 
              :key="pIndex" 
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
          
          <!-- 订单底部 -->
          <view class="order-footer">
            <view class="order-total">
              共{{ getTotalQuantity(order.products) }}件商品 合计：
              <text class="price">¥{{ order.total_price.toFixed(2) }}</text>
            </view>
            
            <view class="order-actions">
              <template v-if="order.status === 'unpaid'">
                <u-button 
                  size="mini" 
                  type="default" 
                  @click.stop="cancelOrder(order._id)"
                >取消订单</u-button>
                <u-button 
                  size="mini" 
                  type="primary" 
                  @click.stop="payOrder(order._id)"
                >立即支付</u-button>
              </template>
              
              <template v-if="order.status === 'shipped'">
                <u-button 
                  size="mini" 
                  type="primary" 
                  @click.stop="confirmReceive(order._id)"
                >确认收货</u-button>
              </template>
              
              <template v-if="order.status === 'completed' || order.status === 'cancelled'">
                <u-button 
                  size="mini" 
                  type="default" 
                  @click.stop="deleteOrder(order._id)"
                >删除订单</u-button>
              </template>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
      
      <view v-if="!hasMore && orderList.length > 0" class="no-more">
        <text>没有更多订单了</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      statusTabs: [
        { label: '全部', value: '' },
        { label: '待付款', value: 'unpaid' },
        { label: '待发货', value: 'unshipped' },
        { label: '待收货', value: 'shipped' },
        { label: '已完成', value: 'completed' }
      ],
      currentStatus: '',
      orderList: [],
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: false
    }
  },
  
  onLoad(options) {
    // 如果有状态参数，切换到对应状态
    if (options.status) {
      this.currentStatus = options.status
    }
    
    this.loadOrders()
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.page = 1
    this.orderList = []
    this.loadOrders().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  
  methods: {
    // 切换订单状态
    switchStatus(status) {
      if (this.currentStatus === status) return
      
      this.currentStatus = status
      this.page = 1
      this.orderList = []
      this.loadOrders()
    },
    
    // 加载订单列表
    async loadOrders() {
      this.loading = true
      
      try {
        const res = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'getList',
            data: {
              status: this.currentStatus,
              page: this.page,
              page_size: this.pageSize
            }
          }
        })
        
        if (res.result.code === 0) {
          const { list, total } = res.result.data
          
          // 如果是第一页，直接替换列表
          if (this.page === 1) {
            this.orderList = list
          } else {
            // 否则追加到列表
            this.orderList = [...this.orderList, ...list]
          }
          
          this.total = total
          this.hasMore = this.orderList.length < total
        } else {
          uni.showToast({
            title: res.result.message || '加载订单失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('加载订单失败', e)
        uni.showToast({
          title: '加载订单失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 加载更多
    loadMore() {
      if (this.loading || !this.hasMore) return
      
      this.page++
      this.loadOrders()
    },
    
    // 跳转到订单详情
    goToDetail(orderId) {
      uni.navigateTo({
        url: `/pages/order/detail?id=${orderId}`
      })
    },
    
    // 取消订单
    async cancelOrder(orderId) {
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
                  data: { order_id: orderId }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '订单已取消',
                  icon: 'success'
                })
                
                // 刷新订单列表
                this.page = 1
                this.orderList = []
                this.loadOrders()
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
    payOrder(orderId) {
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
                    order_id: orderId,
                    payment_method: 'wechat' // 模拟微信支付
                  }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '支付成功',
                  icon: 'success'
                })
                
                // 刷新订单列表
                this.page = 1
                this.orderList = []
                this.loadOrders()
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
    confirmReceive(orderId) {
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
                  data: { order_id: orderId }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '确认收货成功',
                  icon: 'success'
                })
                
                // 刷新订单列表
                this.page = 1
                this.orderList = []
                this.loadOrders()
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
    deleteOrder(orderId) {
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
                  data: { order_id: orderId }
                }
              })
              
              if (res.result.code === 0) {
                uni.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                // 刷新订单列表
                this.page = 1
                this.orderList = []
                this.loadOrders()
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
    
    // 获取订单状态样式类
    getStatusClass(status) {
      const classMap = {
        'unpaid': 'status-warning',
        'unshipped': 'status-primary',
        'shipped': 'status-info',
        'completed': 'status-success',
        'cancelled': 'status-default'
      }
      
      return classMap[status] || ''
    },
    
    // 计算订单商品总数量
    getTotalQuantity(products) {
      return products.reduce((total, product) => total + product.quantity, 0)
    }
  }
}
</script>

<style lang="scss" scoped>
.order-list-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20rpx;
}

.status-tabs {
  display: flex;
  background-color: #fff;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
  
  .tab-item {
    flex: 1;
    text-align: center;
    font-size: 28rpx;
    color: #666;
    position: relative;
    
    &.active {
      color: #2979ff;
      font-weight: bold;
      
      &::after {
        content: '';
        position: absolute;
        bottom: -20rpx;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background-color: #2979ff;
      }
    }
  }
}

.order-list {
  padding: 20rpx;
  
  .loading, .empty-list, .no-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40rpx 0;
    color: #999;
    font-size: 28rpx;
  }
  
  .order-items {
    .order-item {
      background-color: #fff;
      border-radius: 12rpx;
      margin-bottom: 20rpx;
      padding: 20rpx;
      box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
      
      .order-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 20rpx;
        border-bottom: 1rpx solid #f5f5f5;
        
        .order-no {
          font-size: 24rpx;
          color: #999;
        }
        
        .order-status {
          font-size: 26rpx;
          font-weight: bold;
          
          &.status-warning {
            color: #ff9900;
          }
          
          &.status-primary {
            color: #2979ff;
          }
          
          &.status-info {
            color: #0099ff;
          }
          
          &.status-success {
            color: #19be6b;
          }
          
          &.status-default {
            color: #909399;
          }
        }
      }
      
      .order-products {
        padding: 20rpx 0;
        
        .product-item {
          display: flex;
          margin-bottom: 20rpx;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          .product-image {
            width: 120rpx;
            height: 120rpx;
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
      
      .order-footer {
        padding-top: 20rpx;
        border-top: 1rpx solid #f5f5f5;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .order-total {
          font-size: 26rpx;
          color: #666;
          
          .price {
            font-size: 30rpx;
            color: #f04c41;
            font-weight: bold;
          }
        }
        
        .order-actions {
          display: flex;
          
          .u-button {
            margin-left: 20rpx;
          }
        }
      }
    }
  }
  
  .load-more {
    text-align: center;
    padding: 20rpx 0;
    color: #2979ff;
    font-size: 28rpx;
  }
}
</style>