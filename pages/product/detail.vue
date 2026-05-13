<template>
  <view class="product-detail-container">
    <!-- 商品图片轮播 -->
    <swiper 
      class="product-swiper" 
      :indicator-dots="true" 
      :autoplay="true" 
      :interval="3000" 
      :duration="500"
      circular
    >
      <swiper-item v-for="(image, index) in productInfo.images" :key="index">
        <image class="product-image" :src="image" mode="aspectFill"></image>
      </swiper-item>
    </swiper>
    
    <!-- 商品基本信息 -->
    <view class="product-info">
      <view class="price-section">
        <text class="price">¥{{ productInfo.price?.toFixed(2) }}</text>
        <text class="market-price" v-if="productInfo.market_price">¥{{ productInfo.market_price?.toFixed(2) }}</text>
      </view>
      <view class="title-section">
        <text class="title">{{ productInfo.name }}</text>
        <text class="brief">{{ productInfo.brief }}</text>
      </view>
      <view class="sales-section">
        <text class="sales">已售 {{ productInfo.sales || 0 }}</text>
        <text class="stock">库存 {{ productInfo.stock || 0 }}</text>
      </view>
    </view>
    
    <!-- 规格选择 -->
    <view class="spec-section" @click="showSpecPopup">
      <text class="label">规格</text>
      <view class="selected-info">
        <text class="selected-text">{{ getSelectedSpecText() }}</text>
        <text class="icon iconfont icon-right"></text>
      </view>
    </view>
    
    <!-- 商品详情 -->
    <view class="detail-section">
      <view class="section-title">商品详情</view>
      <rich-text :nodes="productInfo.detail || ''"></rich-text>
    </view>
    
    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="action-icons">
        <view class="icon-item" @click="goToCart">
          <text class="icon iconfont icon-cart"></text>
          <text class="text">购物车</text>
          <view class="badge" v-if="cartCount > 0">{{ cartCount }}</view>
        </view>
      </view>
      <view class="action-buttons">
        <button class="add-cart-btn" @click="showSpecPopup('cart')">加入购物车</button>
        <button class="buy-btn" @click="showSpecPopup('buy')">立即购买</button>
      </view>
    </view>
    
    <!-- 规格选择弹窗 -->
    <uni-popup ref="specPopup" type="bottom">
      <view class="spec-popup">
        <!-- 商品信息 -->
        <view class="popup-product-info">
          <image class="product-image" :src="productInfo.images?.[0]" mode="aspectFill"></image>
          <view class="info">
            <text class="price">¥{{ selectedSpec?.price || productInfo.price?.toFixed(2) }}</text>
            <text class="stock">库存: {{ selectedSpec?.stock || productInfo.stock || 0 }}</text>
            <text class="selected">已选: {{ getSelectedSpecText() }}</text>
          </view>
          <text class="close-icon iconfont icon-close" @click="hideSpecPopup"></text>
        </view>
        
        <!-- 规格选择 -->
        <scroll-view class="spec-scroll" scroll-y>
          <view 
            class="spec-group" 
            v-for="(group, groupIndex) in productInfo.specs" 
            :key="groupIndex"
          >
            <text class="group-name">{{ group.name }}</text>
            <view class="spec-items">
              <text 
                class="spec-item" 
                v-for="(item, itemIndex) in group.items" 
                :key="itemIndex"
                :class="{ active: isSpecSelected(groupIndex, itemIndex) }"
                @click="selectSpec(groupIndex, itemIndex)"
              >
                {{ item }}
              </text>
            </view>
          </view>
          
          <!-- 数量选择 -->
          <view class="quantity-section">
            <text class="label">数量</text>
            <view class="quantity-selector">
              <text 
                class="minus" 
                :class="{ disabled: quantity <= 1 }"
                @click="updateQuantity('minus')"
              >-</text>
              <input 
                class="input" 
                type="number" 
                v-model="quantity"
                @blur="checkQuantity"
              />
              <text 
                class="plus"
                :class="{ disabled: quantity >= maxQuantity }"
                @click="updateQuantity('plus')"
              >+</text>
            </view>
          </view>
        </scroll-view>
        
        <!-- 底部按钮 -->
        <view class="popup-bottom">
          <button 
            class="confirm-btn" 
            :disabled="!isSpecComplete || !quantity"
            @click="handleConfirm"
          >
            确定
          </button>
        </view>
      </view>
    </uni-popup>
    
    <!-- 加载状态 -->
    <uni-load-more v-if="loading" status="loading"></uni-load-more>
  </view>
</template>

<script>
import { productApi, cartApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      productId: '',
      productInfo: {},
      loading: true,
      cartCount: 0,
      selectedSpecs: [],
      quantity: 1,
      maxQuantity: 99,
      actionType: '',
      selectedSpec: null
    }
  },
  computed: {
    isSpecComplete() {
      if (!this.productInfo.specs) return true
      return this.selectedSpecs.length === this.productInfo.specs.length &&
        !this.selectedSpecs.includes(-1)
    }
  },
  onLoad(options) {
    if (options.id) {
      this.productId = options.id
      this.loadProductDetail()
    } else {
      uni.showToast({ title: 'Product ID required', icon: 'none' })
      setTimeout(() => { uni.navigateBack() }, 1500)
    }
  },
  onShow() {
    this.loadCartCount()
  },
  methods: {
    async loadProductDetail() {
      this.loading = true
      try {
        const res = await productApi.getProductDetail(this.productId)
        if (res.success && res.data) {
          this.productInfo = res.data
          if (this.productInfo.specs) {
            this.selectedSpecs = new Array(this.productInfo.specs.length).fill(-1)
          }
        } else {
          uni.showToast({ title: res.error || 'Failed to load', icon: 'none' })
        }
      } catch (e) {
        console.error('Failed to load product:', e)
        uni.showToast({ title: 'Failed to load', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadCartCount() {
      try {
        const res = await cartApi.getCartList()
        if (res.success && res.data) {
          const items = res.data.items || res.data
          this.cartCount = Array.isArray(items) ? items.length : 0
        }
      } catch (e) {
        console.error('Failed to load cart count:', e)
      }
    },
    getSelectedSpecText() {
      if (!this.productInfo.specs || !this.selectedSpecs.length) {
        return 'Select specification'
      }
      const selectedItems = this.selectedSpecs.map((itemIndex, groupIndex) => {
        if (itemIndex === -1) return ''
        return this.productInfo.specs[groupIndex].items[itemIndex]
      })
      return selectedItems.filter(item => item).join(', ') || 'Select specification'
    },
    showSpecPopup(type = 'cart') {
      this.actionType = type
      this.$refs.specPopup.open()
    },
    hideSpecPopup() {
      this.$refs.specPopup.close()
    },
    isSpecSelected(groupIndex, itemIndex) {
      return this.selectedSpecs[groupIndex] === itemIndex
    },
    selectSpec(groupIndex, itemIndex) {
      this.$set(this.selectedSpecs, groupIndex, itemIndex)
      this.updateSelectedSpec()
    },
    updateSelectedSpec() {
      if (!this.isSpecComplete) {
        this.selectedSpec = null
        return
      }
      const selectedItems = this.selectedSpecs.map((itemIndex, groupIndex) =>
        this.productInfo.specs[groupIndex].items[itemIndex]
      )
      const spec = this.productInfo.spec_list?.find(s =>
        s.items.join(',') === selectedItems.join(',')
      )
      this.selectedSpec = spec
      this.maxQuantity = Math.min(99, spec?.stock || this.productInfo.stock || 99)
      if (this.quantity > this.maxQuantity) {
        this.quantity = this.maxQuantity
      }
    },
    updateQuantity(type) {
      if (type === 'minus' && this.quantity > 1) {
        this.quantity--
      } else if (type === 'plus' && this.quantity < this.maxQuantity) {
        this.quantity++
      }
    },
    checkQuantity() {
      let q = parseInt(this.quantity)
      if (isNaN(q) || q < 1) q = 1
      if (q > this.maxQuantity) q = this.maxQuantity
      this.quantity = q
    },
    async handleConfirm() {
      if (!this.isSpecComplete) {
        return uni.showToast({ title: 'Select specification', icon: 'none' })
      }
      if (this.actionType === 'cart') {
        await this.addToCart()
      } else {
        this.buyNow()
      }
    },
    async addToCart() {
      try {
        const res = await cartApi.addToCart(this.productId, this.quantity)
        if (res.success) {
          uni.showToast({ title: 'Added to cart', icon: 'success' })
          this.hideSpecPopup()
          this.loadCartCount()
        } else {
          uni.showToast({ title: res.error || 'Failed', icon: 'none' })
        }
      } catch (e) {
        console.error('Failed to add to cart:', e)
        uni.showToast({ title: 'Failed to add to cart', icon: 'none' })
      }
    },
    buyNow() {
      const orderInfo = {
        products: [{
          product_id: this.productId,
          quantity: this.quantity,
          selected_spec: this.selectedSpecs.map((itemIndex, groupIndex) => ({
            name: this.productInfo.specs[groupIndex].name,
            value: this.productInfo.specs[groupIndex].items[itemIndex]
          }))
        }]
      }
      uni.setStorageSync('temp_order', orderInfo)
      uni.navigateTo({ url: '/pages/order/confirm' })
      this.hideSpecPopup()
    },
    goToCart() {
      uni.switchTab({ url: '/pages/cart/index' })
    }
  }
}
</script>

<style lang="scss">
.product-detail-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 100rpx;
  
  .product-swiper {
    width: 100%;
    height: 750rpx;
    
    .product-image {
      width: 100%;
      height: 100%;
    }
  }
  
  .product-info {
    background-color: #fff;
    padding: 30rpx;
    
    .price-section {
      margin-bottom: 20rpx;
      
      .price {
        font-size: 40rpx;
        color: #ff4444;
        font-weight: bold;
        margin-right: 20rpx;
      }
      
      .market-price {
        font-size: 28rpx;
        color: #999;
        text-decoration: line-through;
      }
    }
    
    .title-section {
      margin-bottom: 20rpx;
      
      .title {
        font-size: 32rpx;
        color: #333;
        font-weight: bold;
        margin-bottom: 10rpx;
        line-height: 1.4;
      }
      
      .brief {
        font-size: 26rpx;
        color: #666;
        line-height: 1.4;
      }
    }
    
    .sales-section {
      display: flex;
      align-items: center;
      
      .sales, .stock {
        font-size: 24rpx;
        color: #999;
        margin-right: 30rpx;
      }
    }
  }
  
  .spec-section {
    margin-top: 20rpx;
    background-color: #fff;
    padding: 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .label {
      font-size: 28rpx;
      color: #333;
    }
    
    .selected-info {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      
      .selected-text {
        font-size: 26rpx;
        color: #666;
        margin-right: 10rpx;
      }
      
      .icon-right {
        font-size: 24rpx;
        color: #999;
      }
    }
  }
  
  .detail-section {
    margin-top: 20rpx;
    background-color: #fff;
    padding: 30rpx;
    
    .section-title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      margin-bottom: 20rpx;
    }
  }
  
  .bottom-actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100rpx;
    background-color: #fff;
    display: flex;
    align-items: center;
    padding: 0 20rpx;
    box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
    
    .action-icons {
      display: flex;
      margin-right: 20rpx;
      
      .icon-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 20rpx;
        
        .icon {
          font-size: 40rpx;
          color: #666;
          margin-bottom: 4rpx;
        }
        
        .text {
          font-size: 20rpx;
          color: #666;
        }
        
        .badge {
          position: absolute;
          top: -10rpx;
          right: 0;
          min-width: 32rpx;
          height: 32rpx;
          line-height: 32rpx;
          text-align: center;
          background-color: #ff4444;
          color: #fff;
          font-size: 20rpx;
          border-radius: 16rpx;
          padding: 0 6rpx;
        }
      }
    }
    
    .action-buttons {
      flex: 1;
      display: flex;
      
      .add-cart-btn, .buy-btn {
        flex: 1;
        height: 72rpx;
        line-height: 72rpx;
        text-align: center;
        font-size: 28rpx;
        border-radius: 36rpx;
        margin: 0 10rpx;
      }
      
      .add-cart-btn {
        background-color: #ffd300;
        color: #333;
      }
      
      .buy-btn {
        background-color: #ff4444;
        color: #fff;
      }
    }
  }
}

/* 规格选择弹窗样式 */
.spec-popup {
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  
  .popup-product-info {
    position: relative;
    display: flex;
    padding: 30rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    .product-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      margin-right: 20rpx;
    }
    
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10rpx 0;
      
      .price {
        font-size: 36rpx;
        color: #ff4444;
        font-weight: bold;
      }
      
      .stock {
        font-size: 26rpx;
        color: #666;
      }
      
      .selected {
        font-size: 26rpx;
        color: #333;
      }
    }
    
    .close-icon {
      position: absolute;
      top: 30rpx;
      right: 30rpx;
      font-size: 40rpx;
      color: #999;
    }
  }
  
  .spec-scroll {
    flex: 1;
    max-height: 60vh;
    
    .spec-group {
      padding: 30rpx;
      border-bottom: 1rpx solid #f5f5f5;
      
      .group-name {
        font-size: 28rpx;
        color: #333;
        margin-bottom: 20rpx;
      }
      
      .spec-items {
        display: flex;
        flex-wrap: wrap;
        
        .spec-item {
          min-width: 120rpx;
          height: 60rpx;
          line-height: 60rpx;
          text-align: center;
          font-size: 26rpx;
          color: #333;
          background-color: #f8f8f8;
          border-radius: 30rpx;
          margin-right: 20rpx;
          margin-bottom: 20rpx;
          padding: 0 30rpx;
          
          &.active {
            color: #ff4444;
            background-color: #fff0f0;
          }
        }
      }
    }
    
    .quantity-section {
      padding: 30rpx;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .label {
        font-size: 28rpx;
        color: #333;
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
  
  .popup-bottom {
    padding: 20rpx 30rpx;
    border-top: 1rpx solid #f5f5f5;
    
    .confirm-btn {
      width: 100%;
      height: 80rpx;
      line-height: 80rpx;
      text-align: center;
      font-size: 30rpx;
      color: #fff;
      background-color: #ff4444;
      border-radius: 40rpx;
      
      &[disabled] {
        background-color: #ccc;
      }
    }
  }
}