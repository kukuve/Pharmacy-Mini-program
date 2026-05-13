<template>
  <view class="container">
    <!-- 轮播图 -->
    <swiper class="product-swiper" indicator-dots autoplay circular :interval="3000" :duration="500">
      <swiper-item v-for="(item, index) in product.images" :key="index">
        <image :src="item" class="product-image" mode="aspectFill" @tap="previewImage(index)"></image>
      </swiper-item>
    </swiper>
    
    <!-- 基本信息 -->
    <view class="product-info">
      <view class="product-price-box">
        <text class="product-price">¥{{ product.price ? product.price.toFixed(2) : '0.00' }}</text>
        <text class="product-original-price" v-if="product.originalPrice">¥{{ product.originalPrice.toFixed(2) }}</text>
      </view>
      <view class="product-title-row">
        <view class="product-title">{{ product.name }}</view>
        <view class="favorite-btn" @tap="toggleFavorite">
          <text class="iconfont" :class="isFavorite ? 'icon-star-filled' : 'icon-star'"></text>
        </view>
      </view>
      <view class="product-spec">规格：{{ product.spec }}</view>
      <view class="product-sales">已售 {{ product.sales }} 件</view>
    </view>
    
    <!-- 药品说明 -->
    <view class="product-section">
      <view class="section-title">药品说明</view>
      <view class="product-attrs">
        <view class="attr-item">
          <text class="attr-label">通用名称</text>
          <text class="attr-value">{{ product.genericName || '-' }}</text>
        </view>
        <view class="attr-item">
          <text class="attr-label">生产厂家</text>
          <text class="attr-value">{{ product.manufacturer || '-' }}</text>
        </view>
        <view class="attr-item">
          <text class="attr-label">批准文号</text>
          <text class="attr-value">{{ product.approvalNumber || '-' }}</text>
        </view>
        <view class="attr-item">
          <text class="attr-label">有效期</text>
          <text class="attr-value">{{ product.expiryDate || '-' }}</text>
        </view>
        <view class="attr-item">
          <text class="attr-label">存储条件</text>
          <text class="attr-value">{{ product.storageCondition || '-' }}</text>
        </view>
      </view>
    </view>
    
    <!-- 功效与作用 -->
    <view class="product-section">
      <view class="section-title">功效与作用</view>
      <view class="section-content">
        <rich-text :nodes="product.efficacy || '暂无相关信息'"></rich-text>
      </view>
    </view>
    
    <!-- 用法用量 -->
    <view class="product-section">
      <view class="section-title">用法用量</view>
      <view class="section-content">
        <rich-text :nodes="product.usage || '暂无相关信息'"></rich-text>
      </view>
    </view>
    
    <!-- 不良反应 -->
    <view class="product-section">
      <view class="section-title">不良反应</view>
      <view class="section-content">
        <rich-text :nodes="product.sideEffects || '暂无相关信息'"></rich-text>
      </view>
    </view>
    
    <!-- 禁忌 -->
    <view class="product-section">
      <view class="section-title">禁忌</view>
      <view class="section-content">
        <rich-text :nodes="product.contraindications || '暂无相关信息'"></rich-text>
      </view>
    </view>
    
    <!-- 注意事项 -->
    <view class="product-section">
      <view class="section-title">注意事项</view>
      <view class="section-content">
        <rich-text :nodes="product.precautions || '暂无相关信息'"></rich-text>
      </view>
    </view>
    
    <!-- 药品详情 -->
    <view class="product-section">
      <view class="section-title">药品详情</view>
      <view class="section-content">
        <rich-text :nodes="product.description || '暂无相关信息'"></rich-text>
      </view>
    </view>
    
    <!-- 底部操作栏 -->
    <view class="action-bar safe-area-inset-bottom">
      <view class="action-icons">
        <view class="action-icon-item" @tap="navigateToHome">
          <text class="iconfont icon-home"></text>
          <text>首页</text>
        </view>
        <view class="action-icon-item" @tap="navigateToCart">
          <text class="iconfont icon-cart"></text>
          <text>购物车</text>
          <view class="cart-badge" v-if="cartCount > 0">{{ cartCount }}</view>
        </view>
      </view>
      <view class="action-buttons">
        <button class="btn-add-cart" @tap="addToCart">加入购物车</button>
        <button class="btn-buy-now" @tap="buyNow">立即购买</button>
      </view>
    </view>
    
    <!-- 数量选择弹窗 -->
    <uni-popup ref="popup" type="bottom">
      <view class="quantity-popup">
        <view class="popup-header">
          <image :src="product.imageUrl" class="popup-product-image" mode="aspectFill"></image>
          <view class="popup-product-info">
            <text class="popup-product-price">¥{{ product.price ? product.price.toFixed(2) : '0.00' }}</text>
            <text class="popup-product-name">{{ product.name }}</text>
            <text class="popup-product-spec">{{ product.spec }}</text>
          </view>
          <text class="popup-close" @tap="closePopup">×</text>
        </view>
        <view class="popup-content">
          <view class="quantity-selector">
            <text class="quantity-label">购买数量</text>
            <view class="quantity-control">
              <text class="quantity-btn" @tap="decreaseQuantity">-</text>
              <input type="number" v-model="quantity" class="quantity-input" />
              <text class="quantity-btn" @tap="increaseQuantity">+</text>
            </view>
          </view>
        </view>
        <view class="popup-footer">
          <button class="popup-btn" @tap="confirmAction">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'vuex'
import { productApi, cartApi, favoriteApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      id: '',
      product: {
        images: [],
        price: 0,
        name: '',
        spec: '',
        sales: 0
      },
      quantity: 1,
      actionType: '', // 'cart' 或 'buy'
      isFavorite: false,
      loading: false
    }
  },
  
  computed: {
    ...mapState('cart', ['cartList']),
    
    cartCount() {
      return this.cartList.reduce((total, item) => total + item.quantity, 0)
    }
  },
  
  onLoad(options) {
    if (options.id) {
      this.id = options.id
      this.loadProductDetail()
      this.checkIsFavorite()
    }
  },
  
  onShow() {
    // 初始化购物车
    this.$store.dispatch('cart/loadCartFromCloud')
  },
  
  methods: {
    // 加载商品详情
    async loadProductDetail() {
      if (this.loading) return
      
      this.loading = true
      uni.showLoading({
        title: '加载中'
      })
      
      try {
        const result = await productApi.getProductDetail(this.id)
        
        if (result.success && result.data) {
          this.product = result.data
          
          // 如果没有图片数组，使用主图
          if (!this.product.images || this.product.images.length === 0) {
            this.product.images = [this.product.imageUrl]
          }
        } else {
          uni.showToast({
            title: result.error || '商品不存在',
            icon: 'none'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }
      } catch (error) {
        console.error('加载商品详情失败:', error)
        uni.showToast({
          title: '加载商品详情失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        uni.hideLoading()
      }
    },
    
    // 检查是否已收藏
    async checkIsFavorite() {
      try {
        const result = await favoriteApi.checkFavorite(this.id)
        if (result.success) {
          this.isFavorite = result.data.isFavorite
        }
      } catch (error) {
        console.error('检查收藏状态失败:', error)
      }
    },
    
    // 切换收藏状态
    async toggleFavorite() {
      try {
        let result
        if (this.isFavorite) {
          result = await favoriteApi.removeFavorite(this.id)
        } else {
          result = await favoriteApi.addFavorite(this.id)
        }
        
        if (result.success) {
          this.isFavorite = !this.isFavorite
          uni.showToast({
            title: this.isFavorite ? '收藏成功' : '已取消收藏',
            icon: 'success'
          })
        } else {
          uni.showToast({
            title: result.error || '操作失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('收藏操作失败:', error)
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    },
    
    // 预览图片
    previewImage(index) {
      uni.previewImage({
        current: index,
        urls: this.product.images
      })
    },
    
    // 加入购物车
    addToCart() {
      this.actionType = 'cart'
      this.$refs.popup.open()
    },
    
    // 立即购买
    buyNow() {
      this.actionType = 'buy'
      this.$refs.popup.open()
    },
    
    // 关闭弹窗
    closePopup() {
      this.$refs.popup.close()
    },
    
    // 减少数量
    decreaseQuantity() {
      if (this.quantity > 1) {
        this.quantity--
      }
    },
    
    // 增加数量
    increaseQuantity() {
      this.quantity++
    },
    
    // 确认操作
    async confirmAction() {
      if (this.actionType === 'cart') {
        // 加入购物车
        uni.showLoading({ title: '处理中' })
        
        try {
          const result = await cartApi.addToCart(this.product._id, this.quantity)
          
          if (result.success) {
            // 更新本地购物车数据
            this.$store.dispatch('cart/loadCartFromCloud')
            
            uni.showToast({
              title: '已加入购物车',
              icon: 'success'
            })
          } else {
            uni.showToast({
              title: result.error || '加入购物车失败',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('加入购物车失败:', error)
          uni.showToast({
            title: '加入购物车失败',
            icon: 'none'
          })
        } finally {
          uni.hideLoading()
        }
      } else if (this.actionType === 'buy') {
        // 立即购买，跳转到确认订单页
        const product = {
          _id: this.product._id,
          name: this.product.name,
          price: this.product.price,
          imageUrl: this.product.imageUrl,
          spec: this.product.spec,
          quantity: this.quantity
        }
        
        uni.navigateTo({
          url: `/pages/order/confirm?products=${encodeURIComponent(JSON.stringify([product]))}`
        })
      }
      
      this.closePopup()
    },
    
    // 导航到首页
    navigateToHome() {
      uni.switchTab({
        url: '/pages/index/index'
      })
    },
    
    // 导航到购物车
    navigateToCart() {
      uni.switchTab({
        url: '/pages/cart/cart'
      })
    }
  }
}
</script>

<style>
.container {
  padding-bottom: 100rpx;
}

/* 轮播图样式 */
.product-swiper {
  width: 100%;
  height: 750rpx;
}

.product-image {
  width: 100%;
  height: 100%;
}

/* 基本信息样式 */
.product-info {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.product-price-box {
  margin-bottom: 20rpx;
}

.product-price {
  font-size: 40rpx;
  color: #ff6700;
  font-weight: bold;
}

.product-original-price {
  font-size: 28rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 20rpx;
}

.product-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.product-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 20rpx;
}

.favorite-btn {
  padding: 10rpx;
}

.favorite-btn .iconfont {
  font-size: 40rpx;
  color: #999;
}

.favorite-btn .icon-star-filled {
  color: #ff6700;
}

.product-spec, .product-sales {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

/* 药品说明样式 */
.product-section {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  position: relative;
  padding-left: 20rpx;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6rpx;
  width: 8rpx;
  height: 32rpx;
  background-color: #3cc51f;
  border-radius: 4rpx;
}

.section-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

/* 药品属性样式 */
.product-attrs {
  background-color: #f8f8f8;
  border-radius: 10rpx;
  padding: 20rpx;
}

.attr-item {
  display: flex;
  margin-bottom: 15rpx;
}

.attr-item:last-child {
  margin-bottom: 0;
}

.attr-label {
  width: 180rpx;
  font-size: 28rpx;
  color: #999;
}

.attr-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

/* 底部操作栏样式 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100rpx;
  background-color: #ffffff;
  display: flex;
  border-top: 1rpx solid #f0f0f0;
  z-index: 100;
}

.action-icons {
  display: flex;
  width: 30%;
}

.action-icon-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #666;
  position: relative;
}

.action-icon-item .iconfont {
  font-size