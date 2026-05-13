<template>
  <view class="container">
    <!-- 空购物车提示 -->
    <view class="empty-cart" v-if="cartList.length === 0">
      <image src="/static/images/empty-cart.png" mode="aspectFit"></image>
      <text>购物车空空如也~</text>
      <button class="btn-to-shop" @tap="navigateToIndex">去逛逛</button>
    </view>
    
    <!-- 购物车列表 -->
    <view class="cart-content" v-else>
      <view class="cart-list">
        <view class="cart-item" v-for="item in cartList" :key="item._id">
          <!-- 选择框 -->
          <view class="checkbox-wrapper" @tap="toggleSelect(item._id)">
            <view class="checkbox" :class="{ checked: selectedItems.includes(item._id) }">
              <text class="iconfont icon-check" v-if="selectedItems.includes(item._id)"></text>
            </view>
          </view>
          
          <!-- 商品信息 -->
          <image :src="item.imageUrl" class="product-image" mode="aspectFill" @tap="navigateToDetail(item._id)"></image>
          <view class="product-info">
            <view class="product-name" @tap="navigateToDetail(item._id)">{{ item.name }}</view>
            <view class="product-spec">{{ item.spec }}</view>
            <view class="product-bottom">
              <text class="product-price">¥{{ item.price.toFixed(2) }}</text>
              <!-- 数量控制 -->
              <view class="quantity-control">
                <text class="quantity-btn" @tap="decreaseQuantity(item._id)">-</text>
                <input 
                  type="number" 
                  v-model="item.quantity" 
                  class="quantity-input"
                  @blur="updateQuantity(item._id, item.quantity)"
                />
                <text class="quantity-btn" @tap="increaseQuantity(item._id)">+</text>
              </view>
            </view>
          </view>
          
          <!-- 删除按钮 -->
          <view class="delete-btn" @tap="showDeleteConfirm(item._id)">
            <text class="iconfont icon-delete"></text>
          </view>
        </view>
      </view>
      
      <!-- 底部结算栏 -->
      <view class="settlement-bar safe-area-inset-bottom">
        <view class="select-all" @tap="toggleSelectAll">
          <view class="checkbox" :class="{ checked: isAllSelected }">
            <text class="iconfont icon-check" v-if="isAllSelected"></text>
          </view>
          <text>全选</text>
        </view>
        <view class="total-info">
          <view>
            <text>合计：</text>
            <text class="total-price">¥{{ totalPrice.toFixed(2) }}</text>
          </view>
          <text class="total-desc">不含运费</text>
        </view>
        <button class="btn-settlement" :disabled="selectedItems.length === 0" @tap="settlement">
          结算({{ selectedItems.length }})
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { mapState } from 'vuex'
import { cartApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      selectedItems: [],
      loading: false
    }
  },
  
  computed: {
    ...mapState('cart', ['cartList']),
    
    // 是否全选
    isAllSelected() {
      return this.cartList.length > 0 && this.selectedItems.length === this.cartList.length
    },
    
    // 计算总价
    totalPrice() {
      return this.cartList.reduce((total, item) => {
        if (this.selectedItems.includes(item._id)) {
          return total + item.price * item.quantity
        }
        return total
      }, 0)
    }
  },
  
  onShow() {
    // 从云端加载购物车数据
    this.loadCartData()
  },
  
  onPullDownRefresh() {
    this.loadCartData().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  
  methods: {
    // 从云端加载购物车数据
    async loadCartData() {
      if (this.loading) return
      
      this.loading = true
      uni.showLoading({ title: '加载中' })
      
      try {
        await this.$store.dispatch('cart/loadCartFromCloud')
        // 重置选中状态
        this.selectedItems = []
      } catch (error) {
        console.error('加载购物车失败:', error)
        uni.showToast({
          title: '加载购物车失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        uni.hideLoading()
      }
    },
    
    // 切换商品选中状态
    toggleSelect(id) {
      const index = this.selectedItems.indexOf(id)
      if (index > -1) {
        this.selectedItems.splice(index, 1)
      } else {
        this.selectedItems.push(id)
      }
    },
    
    // 切换全选状态
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedItems = []
      } else {
        this.selectedItems = this.cartList.map(item => item._id)
      }
    },
    
    // 减少商品数量
    async decreaseQuantity(id) {
      const item = this.cartList.find(item => item._id === id)
      if (item && item.quantity > 1) {
        await this.updateCartItemQuantity(id, item.quantity - 1)
      }
    },
    
    // 增加商品数量
    async increaseQuantity(id) {
      const item = this.cartList.find(item => item._id === id)
      if (item) {
        await this.updateCartItemQuantity(id, item.quantity + 1)
      }
    },
    
    // 更新商品数量
    async updateQuantity(id, quantity) {
      const newQuantity = parseInt(quantity)
      if (isNaN(newQuantity) || newQuantity < 1) {
        // 如果输入无效，重置为1
        await this.updateCartItemQuantity(id, 1)
      } else {
        await this.updateCartItemQuantity(id, newQuantity)
      }
    },
    
    // 更新购物车商品数量
    async updateCartItemQuantity(productId, quantity) {
      uni.showLoading({ title: '更新中' })
      
      try {
        const result = await cartApi.updateCartItemQuantity(productId, quantity)
        
        if (result.success) {
          // 更新本地购物车数据
          await this.$store.dispatch('cart/loadCartFromCloud')
        } else {
          uni.showToast({
            title: result.error || '更新数量失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('更新购物车数量失败:', error)
        uni.showToast({
          title: '更新数量失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    
    // 显示删除确认框
    showDeleteConfirm(id) {
      uni.showModal({
        title: '提示',
        content: '确定要删除这个商品吗？',
        success: (res) => {
          if (res.confirm) {
            this.deleteItem(id)
          }
        }
      })
    },
    
    // 删除商品
    async deleteItem(id) {
      uni.showLoading({ title: '删除中' })
      
      try {
        const result = await cartApi.removeFromCart(id)
        
        if (result.success) {
          // 更新本地购物车数据
          await this.$store.dispatch('cart/loadCartFromCloud')
          
          // 同时从选中列表中移除
          const index = this.selectedItems.indexOf(id)
          if (index > -1) {
            this.selectedItems.splice(index, 1)
          }
          
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } else {
          uni.showToast({
            title: result.error || '删除失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('删除购物车商品失败:', error)
        uni.showToast({
          title: '删除失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    
    // 结算
    settlement() {
      if (this.selectedItems.length === 0) {
        return
      }
      
      // 获取选中的商品
      const selectedProducts = this.cartList.filter(item => 
        this.selectedItems.includes(item._id)
      )
      
      // 跳转到订单确认页
      uni.navigateTo({
        url: `/pages/order/confirm?products=${encodeURIComponent(JSON.stringify(selectedProducts))}`
      })
    },
    
    // 跳转到商品详情
    navigateToDetail(id) {
      uni.navigateTo({
        url: `/pages/products/detail?id=${id}`
      })
    },
    
    // 跳转到首页
    navigateToIndex() {
      uni.switchTab({
        url: '/pages/index/index'
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

/* 空购物车样式 */
.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-cart image {
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 30rpx;
}

.empty-cart text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.btn-to-shop {
  width: 240rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background-color: #3cc51f;
  color: #ffffff;
  border-radius: 40rpx;
  font-size: 28rpx;
}

/* 购物车列表样式 */
.cart-list {
  background-color: #ffffff;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 30rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

/* 复选框样式 */
.checkbox-wrapper {
  padding: 20rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background-color: #3cc51f;
  border-color: #3cc51f;
}

.checkbox .icon-check {
  color: #ffffff;
  font-size: 24rpx;
}

/* 商品信息样式 */
.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 160rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 32rpx;
  color: #ff6700;
  font-weight: bold;
}

/* 数量控制样式 */
.quantity-control {
  display: flex;
  align-items: center;
  border: 1rpx solid #ddd;
  border-radius: 6rpx;
}

.quantity-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #333;
  background-color: #f8f8f8;
}

.quantity-input {
  width: 80rpx;
  height: 60rpx;
  text-align: center;
  font-size: 28rpx;
  border-left: 1rpx solid #ddd;
  border-right: 1rpx solid #ddd;
}

/* 删除按钮样式 */
.delete-btn {
  padding: 20rpx;
}

.delete-btn .icon-delete {
  font-size: 36rpx;
  color: #999;
}

/* 底部结算栏样式 */
.settlement-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.select-all {
  display: flex;
  align-items: center;
}

.select-all text {
  font-size: 28rpx;
  color: #333;
  margin-left: 10rpx;
}

.total-info {
  flex: 1;
  margin-left: 30rpx;
}

.total-price {
  font-size: 32rpx;
  color: #ff6700;
  font-weight: bold;
}

.total-desc {
  font-size: 24rpx;
  color: #999;
  margin-left: 10rpx;
}

.btn-settlement {
  width: 200rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background-color: #3cc51f;
  color: #ffffff;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-left: 20rpx;
}

.btn-settlement[disabled] {
  background-color: #ccc;
}
</style>