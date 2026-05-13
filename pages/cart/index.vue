<template>
  <view class="cart-container">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <text class="title">购物车</text>
      <text class="edit-btn" @click="toggleEditMode">{{ isEditMode ? '完成' : '编辑' }}</text>
    </view>
    
    <!-- 购物车列表 -->
    <scroll-view 
      class="cart-list" 
      scroll-y 
      v-if="cartList.length > 0"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="refreshCart"
    >
      <!-- 商品列表 -->
      <view class="cart-item" v-for="(item, index) in cartList" :key="item._id">
        <view class="checkbox-wrap">
          <checkbox 
            :checked="item.selected" 
            @click="toggleSelect(index)"
            color="#ff4444"
          ></checkbox>
        </view>
        <image 
          class="product-image" 
          :src="item.product.image" 
          mode="aspectFill"
          @click="goToProductDetail(item.product_id)"
        ></image>
        <view class="product-info">
          <view class="product-name-wrap">
            <text class="product-name" @click="goToProductDetail(item.product_id)">{{ item.product.name }}</text>
            <text class="delete-btn" @click="deleteItem(index)">×</text>
          </view>
          <view class="product-spec">
            <text class="spec-text" v-if="item.selected_spec && item.selected_spec.length > 0">
              {{ formatSelectedSpec(item.selected_spec) }}
            </text>
          </view>
          <view class="product-price-wrap">
            <text class="product-price">¥{{ item.product.price.toFixed(2) }}</text>
            <view class="quantity-selector">
              <text 
                class="minus" 
                :class="{ disabled: item.quantity <= 1 }"
                @click="updateQuantity(index, 'minus')"
              >-</text>
              <input 
                class="input" 
                type="number" 
                v-model="item.quantity"
                @blur="checkQuantity(index)"
              />
              <text 
                class="plus"
                @click="updateQuantity(index, 'plus')"
              >+</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    
    <!-- 空购物车 -->
    <view class="empty-cart" v-else-if="!loading">
      <image class="empty-icon" src="/static/images/empty-cart.png" mode="aspectFit"></image>
      <text class="empty-text">购物车还是空的</text>
      <button class="go-shopping-btn" @click="goToIndex">去逛逛</button>
    </view>
    
    <!-- 加载状态 -->
    <uni-load-more v-if="loading" status="loading"></uni-load-more>
    
    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="cartList.length > 0">
      <view class="select-all">
        <checkbox 
          :checked="isAllSelected" 
          @click="toggleSelectAll"
          color="#ff4444"
        ></checkbox>
        <text class="text">全选</text>
      </view>
      
      <!-- 编辑模式 -->
      <view class="action-btns" v-if="isEditMode">
        <button class="delete-selected-btn" @click="deleteSelected">删除选中</button>
        <button class="move-to-favorite-btn" @click="moveToFavorite">移入收藏夹</button>
      </view>
      
      <!-- 正常模式 -->
      <view class="checkout-info" v-else>
        <view class="price-info">
          <text class="label">合计：</text>
          <text class="price">¥{{ totalPrice.toFixed(2) }}</text>
        </view>
        <button 
          class="checkout-btn" 
          :disabled="selectedCount === 0"
          @click="checkout"
        >
          结算({{ selectedCount }})
        </button>
      </view>
    </view>
    
    <!-- 登录提示 -->
    <uni-popup ref="loginPopup" type="center">
      <view class="login-popup">
        <view class="popup-title">提示</view>
        <view class="popup-content">
          <text>请先登录后再操作</text>
        </view>
        <view class="popup-buttons">
          <button class="cancel-btn" @click="closeLoginPopup">取消</button>
          <button class="confirm-btn" @click="goToLogin">去登录</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { cartApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      cartList: [],
      loading: true,
      refreshing: false,
      isEditMode: false,
      isLoggedIn: false
    }
  },
  computed: {
    isAllSelected() {
      return this.cartList.length > 0 && this.cartList.every(item => item.selected)
    },
    selectedCount() {
      return this.cartList.filter(item => item.selected).length
    },
    totalPrice() {
      return this.cartList.reduce((total, item) => {
        if (item.selected) {
          return total + (item.price || item.product?.price || 0) * item.quantity
        }
        return total
      }, 0)
    }
  },
  onLoad() {
    this.checkLoginStatus()
  },
  onShow() {
    this.loadCart()
  },
  methods: {
    checkLoginStatus() {
      const token = uni.getStorageSync('token')
      this.isLoggedIn = !!token
      if (!this.isLoggedIn) {
        this.$refs.loginPopup.open()
      }
    },
    closeLoginPopup() {
      this.$refs.loginPopup.close()
    },
    goToLogin() {
      this.$refs.loginPopup.close()
      uni.navigateTo({ url: '/pages/login/index' })
    },
    async loadCart() {
      if (!this.isLoggedIn) {
        this.loading = false
        this.refreshing = false
        this.cartList = []
        return
      }
      this.loading = true
      try {
        const res = await cartApi.getCartList()
        if (res.success && res.data) {
          const items = res.data.items || res.data
          this.cartList = items.map(item => ({
            ...item,
            selected: item.selected !== false
          }))
        } else {
          throw new Error(res.error || 'Failed to load cart')
        }
      } catch (e) {
        console.error('Failed to load cart:', e)
        uni.showToast({ title: 'Failed to load cart', icon: 'none' })
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    refreshCart() {
      this.refreshing = true
      this.loadCart()
    },
    toggleEditMode() {
      this.isEditMode = !this.isEditMode
    },
    toggleSelect(index) {
      this.$set(this.cartList[index], 'selected', !this.cartList[index].selected)
    },
    toggleSelectAll() {
      const newStatus = !this.isAllSelected
      this.cartList.forEach(item => { item.selected = newStatus })
    },
    async updateQuantity(index, type) {
      const item = this.cartList[index]
      let newQuantity = item.quantity
      if (type === 'minus' && item.quantity > 1) {
        newQuantity--
      } else if (type === 'plus') {
        newQuantity++
      } else {
        return
      }
      try {
        const res = await cartApi.updateQuantity(item.productId, newQuantity)
        if (res.success) {
          this.$set(this.cartList[index], 'quantity', newQuantity)
        } else {
          throw new Error(res.error)
        }
      } catch (e) {
        console.error('Failed to update quantity:', e)
        uni.showToast({ title: 'Failed to update', icon: 'none' })
      }
    },
    async checkQuantity(index) {
      const item = this.cartList[index]
      let quantity = parseInt(item.quantity)
      if (isNaN(quantity) || quantity < 1) quantity = 1
      if (quantity !== item.quantity) {
        try {
          const res = await cartApi.updateQuantity(item.productId, quantity)
          if (res.success) {
            this.$set(this.cartList[index], 'quantity', quantity)
          }
        } catch (e) {
          console.error('Failed to update quantity:', e)
          this.$set(this.cartList[index], 'quantity', item.quantity)
        }
      }
    },
    deleteItem(index) {
      const item = this.cartList[index]
      uni.showModal({
        title: 'Confirm',
        content: 'Remove this item from cart?',
        success: async (res) => {
          if (res.confirm) {
            try {
              const apiRes = await cartApi.removeFromCart(item.productId)
              if (apiRes.success) {
                this.cartList.splice(index, 1)
                uni.showToast({ title: 'Removed', icon: 'success' })
              } else {
                throw new Error(apiRes.error)
              }
            } catch (e) {
              console.error('Failed to remove:', e)
              uni.showToast({ title: 'Failed to remove', icon: 'none' })
            }
          }
        }
      })
    },
    deleteSelected() {
      const selectedItems = this.cartList.filter(item => item.selected)
      if (selectedItems.length === 0) {
        return uni.showToast({ title: 'Select items first', icon: 'none' })
      }
      uni.showModal({
        title: 'Confirm',
        content: `Remove ${selectedItems.length} selected items?`,
        success: async (res) => {
          if (res.confirm) {
            const ids = selectedItems.map(item => item._id)
            try {
              const apiRes = await cartApi.batchRemove(ids)
              if (apiRes.success) {
                this.cartList = this.cartList.filter(item => !item.selected)
                uni.showToast({ title: 'Removed', icon: 'success' })
              } else {
                throw new Error(apiRes.error)
              }
            } catch (e) {
              console.error('Failed to remove:', e)
              uni.showToast({ title: 'Failed to remove', icon: 'none' })
            }
          }
        }
      })
    },
    moveToFavorite() {
      const selectedItems = this.cartList.filter(item => item.selected)
      if (selectedItems.length === 0) {
        return uni.showToast({ title: 'Select items first', icon: 'none' })
      }
      uni.showToast({ title: 'Favorites coming soon', icon: 'none' })
    },
    checkout() {
      const selectedItems = this.cartList.filter(item => item.selected)
      if (selectedItems.length === 0) {
        return uni.showToast({ title: 'Select items first', icon: 'none' })
      }
      const orderInfo = {
        products: selectedItems.map(item => ({
          cart_id: item._id,
          product_id: item.productId || item.product_id,
          quantity: item.quantity
        }))
      }
      uni.setStorageSync('temp_order', orderInfo)
      uni.navigateTo({ url: '/pages/order/confirm' })
    },
    goToProductDetail(productId) {
      uni.navigateTo({ url: `/pages/product/detail?id=${productId}` })
    },
    goToIndex() {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }
}
</script>

<style lang="scss">
.cart-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
  
  .nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 90rpx;
    padding: 0 30rpx;
    background-color: #fff;
    border-bottom: 1rpx solid #f5f5f5;
    
    .title {
      font-size: 32rpx;
      color: #333;
      font-weight: bold;
    }
    
    .edit-btn {
      font-size: 28rpx;
      color: #666;
    }
  }
  
  .cart-list {
    flex: 1;
    
    .cart-item {
      display: flex;
      align-items: center;
      padding: 30rpx;
      background-color: #fff;
      margin-bottom: 20rpx;
      
      .checkbox-wrap {
        margin-right: 20rpx;
      }
      
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
        height: 160rpx;
        
        .product-name-wrap {
          display: flex;
          justify-content: space-between;
          
          .product-name {
            flex: 1;
            font-size: 28rpx;
            color: #333;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
          }
          
          .delete-btn {
            font-size: 40rpx;
            color: #999;
            padding: 0 10rpx;
          }
        }
        
        .product-spec {
          margin: 10rpx 0;
          
          .spec-text {
            font-size: 24rpx;
            color: #999;
            background-color: #f8f8f8;
            padding: 4rpx 10rpx;
            border-radius: 4rpx;
          }
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
          
          .quantity-selector {
            display: flex;
            align-items: center;
            
            .minus, .plus {
              width: 60rpx;
              height: 60rpx;
              line-height: 60rpx;
              text-align: center;
              font-size: 36rpx;
              color: #333;
              background-color: #f8f8f8;
              
              &.disabled {
                color: #ccc;
              }
            }
            
            .input {
              width: 80rpx;
              height: 60rpx;
              line-height: 60rpx;
              text-align: center;
              font-size: 28rpx;
              color: #333;
              margin: 0 4rpx;
            }
          }
        }
      }
    }
  }
  
  .empty-cart {
    flex: 1;
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
      margin-bottom: 30rpx;
    }
    
    .go-shopping-btn {
      width: 240rpx;
      height: 80rpx;
      line-height: 80rpx;
      background-color: #ff4444;
      color: #fff;
      font-size: 28rpx;
      border-radius: 40rpx;
    }
  }
  
  .bottom-bar {
    height: 100rpx;
    background-color: #fff;
    display: flex;
    align-items: center;
    padding: 0 30rpx;
    border-top: 1rpx solid #f5f5f5;
    
    .select-all {
      display: flex;
      align-items: center;
      margin-right: 30rpx;
      
      .text {
        font-size: 28rpx;
        color: #333;
        margin-left: 10rpx;
      }
    }
    
    .action-btns {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      
      .delete-selected-btn, .move-to-favorite-btn {
        height: 70rpx;
        line-height: 70rpx;
        padding: 0 30rpx;
        font-size: 28rpx;
        border-radius: 35rpx;
        margin-left: 20rpx;
      }
      
      .delete-selected-btn {
        background-color: #ff4444;
        color: #fff;
      }
      
      .move-to-favorite-btn {
        background-color: #fff;
        color: #333;
        border: 1rpx solid #ddd;
      }
    }
    
    .checkout-info {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      
      .price-info {
        margin-right: 20rpx;
        
        .label {
          font-size: 28rpx;
          color: #333;
        }
        
        .price {
          font-size: 32rpx;
          color: #ff4444;
          font-weight: bold;
        }
      }
      
      .checkout-btn {
        width: 200rpx;
        height: 70rpx;
        line-height: 70rpx;
        background-color: #ff4444;
        color: #fff;
        font-size: 28rpx;
        border-radius: 35rpx;
        
        &[disabled] {
          background-color: #ffcccc;
        }
      }
    }
  }
  
  .login-popup {
    width: 600rpx;
    background-color: #fff;
    border-radius: 20rpx;
    overflow: hidden;
    
    .popup-title {
      font-size: 32rpx;
      color: #333;
      font-weight: bold;
      text-align: center;
      padding: 30rpx 0;
      border-bottom: 1rpx solid #f5f5f5;
    }
    
    .popup-content {
      padding: 50rpx 30rpx;
      text-align: center;
      
      text {
        font-size: 28rpx;
        color: #666;
      }
    }
    
    .popup-buttons {
      display: flex;
      border-top: 1rpx solid #f5f5f5;
      
      button {
        flex: 1;
        height: 90rpx;
        line-height: 90rpx;
        font-size: 30rpx;
        border-radius: 0;
        margin: 0;
        
        &::after {
          border: none;
        }
      }
      
      .cancel-btn {
        background-color: #fff;
        color: #666;
        border-right: 1rpx solid #f5f5f5;
      }
      
      .confirm-btn {
        background-color: #ff4444;
        color: #fff;
      }
    }
  }
}