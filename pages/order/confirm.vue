<template>
  <view class="order-confirm-container">
    <!-- 收货地址 -->
    <view class="address-section" @click="selectAddress">
      <view class="address-info" v-if="selectedAddress._id">
        <view class="user-info">
          <text class="name">{{ selectedAddress.name }}</text>
          <text class="phone">{{ selectedAddress.phone }}</text>
        </view>
        <view class="address-detail">
          <text class="tag" v-if="selectedAddress.tag">{{ selectedAddress.tag }}</text>
          <text class="text">{{ formatAddress(selectedAddress) }}</text>
        </view>
      </view>
      <view class="no-address" v-else>
        <text class="icon iconfont icon-location"></text>
        <text class="text">请选择收货地址</text>
      </view>
      <text class="icon iconfont icon-right"></text>
    </view>
    
    <!-- 商品列表 -->
    <view class="products-section">
      <view class="section-title">商品信息</view>
      <view class="product-list">
        <view 
          class="product-item" 
          v-for="(product, index) in orderInfo.products" 
          :key="index"
        >
          <image class="product-image" :src="product.image" mode="aspectFill"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-spec" v-if="product.selected_spec && product.selected_spec.length > 0">
              {{ formatSelectedSpec(product.selected_spec) }}
            </text>
            <view class="product-price-wrap">
              <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
              <text class="product-quantity">x{{ product.quantity }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 配送方式 -->
    <view class="delivery-section">
      <view class="section-item">
        <text class="item-label">配送方式</text>
        <view class="item-value">
          <text class="text">{{ deliveryMethods[selectedDeliveryMethod].label }}</text>
          <text class="icon iconfont icon-right" @click="showDeliveryPicker"></text>
        </view>
      </view>
      <view class="section-item">
        <text class="item-label">配送时间</text>
        <view class="item-value">
          <text class="text">{{ deliveryTimes[selectedDeliveryTime].label }}</text>
          <text class="icon iconfont icon-right" @click="showDeliveryTimePicker"></text>
        </view>
      </view>
    </view>
    
    <!-- 支付方式 -->
    <view class="payment-section">
      <view class="section-item">
        <text class="item-label">支付方式</text>
        <view class="item-value">
          <text class="text">{{ paymentMethods[selectedPaymentMethod].label }}</text>
          <text class="icon iconfont icon-right" @click="showPaymentPicker"></text>
        </view>
      </view>
    </view>
    
    <!-- 优惠券 -->
    <view class="coupon-section" @click="selectCoupon">
      <view class="section-item">
        <text class="item-label">优惠券</text>
        <view class="item-value">
          <text class="text" v-if="selectedCoupon._id">
            {{ selectedCoupon.name }} - ¥{{ selectedCoupon.amount.toFixed(2) }}
          </text>
          <text class="text" v-else>{{ availableCoupons.length > 0 ? `${availableCoupons.length}张可用` : '无可用优惠券' }}</text>
          <text class="icon iconfont icon-right"></text>
        </view>
      </view>
    </view>
    
    <!-- 订单备注 -->
    <view class="remark-section">
      <view class="section-item">
        <text class="item-label">订单备注</text>
        <input 
          class="remark-input" 
          type="text" 
          v-model="remark" 
          placeholder="选填，请先和商家协商一致" 
          maxlength="100"
        />
      </view>
    </view>
    
    <!-- 金额计算 -->
    <view class="amount-section">
      <view class="amount-item">
        <text class="item-label">商品金额</text>
        <text class="item-value">¥{{ productAmount.toFixed(2) }}</text>
      </view>
      <view class="amount-item">
        <text class="item-label">运费</text>
        <text class="item-value">¥{{ deliveryFee.toFixed(2) }}</text>
      </view>
      <view class="amount-item" v-if="selectedCoupon._id">
        <text class="item-label">优惠券</text>
        <text class="item-value">-¥{{ selectedCoupon.amount.toFixed(2) }}</text>
      </view>
    </view>
    
    <!-- 底部结算栏 -->
    <view class="bottom-bar">
      <view class="total-amount">
        <text class="label">实付金额：</text>
        <text class="value">¥{{ totalAmount.toFixed(2) }}</text>
      </view>
      <button class="submit-btn" @click="submitOrder" :disabled="!canSubmit">提交订单</button>
    </view>
    
    <!-- 配送方式选择器 -->
    <uni-popup ref="deliveryPopup" type="bottom">
      <view class="picker-popup">
        <view class="popup-header">
          <text class="cancel" @click="closeDeliveryPicker">取消</text>
          <text class="title">配送方式</text>
          <text class="confirm" @click="confirmDeliveryMethod">确定</text>
        </view>
        <picker-view 
          class="picker-view" 
          :value="[selectedDeliveryMethod]" 
          @change="onDeliveryMethodChange"
        >
          <picker-view-column>
            <view class="picker-item" v-for="(item, index) in deliveryMethods" :key="index">
              {{ item.label }}
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </uni-popup>
    
    <!-- 配送时间选择器 -->
    <uni-popup ref="deliveryTimePopup" type="bottom">
      <view class="picker-popup">
        <view class="popup-header">
          <text class="cancel" @click="closeDeliveryTimePicker">取消</text>
          <text class="title">配送时间</text>
          <text class="confirm" @click="confirmDeliveryTime">确定</text>
        </view>
        <picker-view 
          class="picker-view" 
          :value="[selectedDeliveryTime]" 
          @change="onDeliveryTimeChange"
        >
          <picker-view-column>
            <view class="picker-item" v-for="(item, index) in deliveryTimes" :key="index">
              {{ item.label }}
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </uni-popup>
    
    <!-- 支付方式选择器 -->
    <uni-popup ref="paymentPopup" type="bottom">
      <view class="picker-popup">
        <view class="popup-header">
          <text class="cancel" @click="closePaymentPicker">取消</text>
          <text class="title">支付方式</text>
          <text class="confirm" @click="confirmPaymentMethod">确定</text>
        </view>
        <picker-view 
          class="picker-view" 
          :value="[selectedPaymentMethod]" 
          @change="onPaymentMethodChange"
        >
          <picker-view-column>
            <view class="picker-item" v-for="(item, index) in paymentMethods" :key="index">
              {{ item.label }}
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orderInfo: {
        products: []
      }, // 订单信息
      selectedAddress: {}, // 选中的收货地址
      addresses: [], // 收货地址列表
      
      // 配送方式
      deliveryMethods: [
        { label: '快递配送', value: 'express', fee: 10 },
        { label: '到店自取', value: 'self_pickup', fee: 0 }
      ],
      selectedDeliveryMethod: 0, // 选中的配送方式索引
      tempDeliveryMethod: 0, // 临时选中的配送方式索引
      
      // 配送时间
      deliveryTimes: [
        { label: '不限时间', value: 'anytime' },
        { label: '工作日送货', value: 'workday' },
        { label: '双休日、假日送货', value: 'weekend' },
        { label: '晚上送货', value: 'evening' }
      ],
      selectedDeliveryTime: 0, // 选中的配送时间索引
      tempDeliveryTime: 0, // 临时选中的配送时间索引
      
      // 支付方式
      paymentMethods: [
        { label: '微信支付', value: 'wechat' },
        { label: '支付宝', value: 'alipay' },
        { label: '货到付款', value: 'cod' }
      ],
      selectedPaymentMethod: 0, // 选中的支付方式索引
      tempPaymentMethod: 0, // 临时选中的支付方式索引
      
      selectedCoupon: {}, // 选中的优惠券
      availableCoupons: [], // 可用优惠券列表
      
      remark: '', // 订单备注
      
      isLoggedIn: false // 是否已登录
    }
  },
  computed: {
    // 商品总金额
    productAmount() {
      return this.orderInfo.products.reduce((total, product) => {
        return total + product.price * product.quantity
      }, 0)
    },
    
    // 配送费
    deliveryFee() {
      return this.deliveryMethods[this.selectedDeliveryMethod].fee
    },
    
    // 优惠券金额
    couponAmount() {
      return this.selectedCoupon._id ? this.selectedCoupon.amount : 0
    },
    
    // 订单总金额
    totalAmount() {
      return Math.max(0, this.productAmount + this.deliveryFee - this.couponAmount)
    },
    
    // 是否可以提交订单
    canSubmit() {
      return this.selectedAddress._id && this.orderInfo.products.length > 0
    }
  },
  onLoad() {
    // 检查登录状态
    this.checkLoginStatus()
    
    // 加载临时订单信息
    this.loadTempOrder()
  },
  onShow() {
    // 加载收货地址
    if (this.isLoggedIn) {
      this.loadAddresses()
      this.loadCoupons()
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
    
    // 加载临时订单信息
    async loadTempOrder() {
      const tempOrder = uni.getStorageSync('temp_order')
      
      if (!tempOrder) {
        uni.showToast({
          title: '订单信息不存在',
          icon: 'none'
        })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        return
      }
      
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'getTempOrderInfo',
            data: tempOrder
          }
        })
        
        if (result.code === 0) {
          this.orderInfo = result.data
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('获取订单信息失败', e)
        uni.showToast({
          title: '获取订单信息失败',
          icon: 'none'
        })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }
    },
    
    // 加载收货地址
    async loadAddresses() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'address',
          data: {
            action: 'getList'
          }
        })
        
        if (result.code === 0) {
          this.addresses = result.data
          
          // 如果有默认地址，则选中默认地址
          const defaultAddress = this.addresses.find(address => address.is_default)
          if (defaultAddress) {
            this.selectedAddress = defaultAddress
          } else if (this.addresses.length > 0) {
            // 否则选中第一个地址
            this.selectedAddress = this.addresses[0]
          }
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('获取收货地址失败', e)
      }
    },
    
    // 加载优惠券
    async loadCoupons() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'coupon',
          data: {
            action: 'getAvailable',
            data: {
              amount: this.productAmount
            }
          }
        })
        
        if (result.code === 0) {
          this.availableCoupons = result.data
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('获取优惠券失败', e)
      }
    },
    
    // 格式化地址
    formatAddress(address) {
      if (!address) return ''
      return `${address.province} ${address.city} ${address.district} ${address.detail}`
    },
    
    // 格式化已选规格
    formatSelectedSpec(selectedSpec) {
      if (!selectedSpec || selectedSpec.length === 0) return ''
      return selectedSpec.map(spec => spec.value).join('，')
    },
    
    // 选择收货地址
    selectAddress() {
      uni.navigateTo({
        url: '/pages/user/address?select=true'
      })
    },
    
    // 显示配送方式选择器
    showDeliveryPicker() {
      this.tempDeliveryMethod = this.selectedDeliveryMethod
      this.$refs.deliveryPopup.open()
    },
    
    // 关闭配送方式选择器
    closeDeliveryPicker() {
      this.$refs.deliveryPopup.close()
    },
    
    // 配送方式改变
    onDeliveryMethodChange(e) {
      this.tempDeliveryMethod = e.detail.value[0]
    },
    
    // 确认配送方式
    confirmDeliveryMethod() {
      this.selectedDeliveryMethod = this.tempDeliveryMethod
      this.closeDeliveryPicker()
    },
    
    // 显示配送时间选择器
    showDeliveryTimePicker() {
      this.tempDeliveryTime = this.selectedDeliveryTime
      this.$refs.deliveryTimePopup.open()
    },
    
    // 关闭配送时间选择器
    closeDeliveryTimePicker() {
      this.$refs.deliveryTimePopup.close()
    },
    
    // 配送时间改变
    onDeliveryTimeChange(e) {
      this.tempDeliveryTime = e.detail.value[0]
    },
    
    // 确认配送时间
    confirmDeliveryTime() {
      this.selectedDeliveryTime = this.tempDeliveryTime
      this.closeDeliveryTimePicker()
    },
    
    // 显示支付方式选择器
    showPaymentPicker() {
      this.tempPaymentMethod = this.selectedPaymentMethod
      this.$refs.paymentPopup.open()
    },
    
    // 关闭支付方式选择器
    closePaymentPicker() {
      this.$refs.paymentPopup.close()
    },
    
    // 支付方式改变
    onPaymentMethodChange(e) {
      this.tempPaymentMethod = e.detail.value[0]
    },
    
    // 确认支付方式
    confirmPaymentMethod() {
      this.selectedPaymentMethod = this.tempPaymentMethod
      this.closePaymentPicker()
    },
    
    // 选择优惠券
    selectCoupon() {
      if (this.availableCoupons.length === 0) {
        return uni.showToast({
          title: '暂无可用优惠券',
          icon: 'none'
        })
      }
      
      uni.navigateTo({
        url: `/pages/user/coupon?select=true&amount=${this.productAmount}`
      })
    },
    
    // 提交订单
    async submitOrder() {
      if (!this.selectedAddress._id) {
        return uni.showToast({
          title: '请选择收货地址',
          icon: 'none'
        })
      }
      
      if (this.orderInfo.products.length === 0) {
        return uni.showToast({
          title: '订单商品不能为空',
          icon: 'none'
        })
      }
      
      uni.showLoading({
        title: '提交中...'
      })
      
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'order',
          data: {
            action: 'create',
            data: {
              address_id: this.selectedAddress._id,
              products: this.orderInfo.products,
              delivery_method: this.deliveryMethods[this.selectedDeliveryMethod].value,
              delivery_time: this.deliveryTimes[this.selectedDeliveryTime].value,
              payment_method: this.paymentMethods[this.selectedPaymentMethod].value,
              coupon_id: this.selectedCoupon._id || '',
              remark: this.remark,
              total_amount: this.totalAmount
            }
          }
        })
        
        if (result.code === 0) {
          // 清除临时订单数据
          uni.removeStorageSync('temp_order')
          
          // 跳转到支付页面
          uni.redirectTo({
            url: `/pages/order/payment?id=${result.data._id}`
          })
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('提交订单失败', e)
        uni.showToast({
          title: '提交订单失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style lang="scss">
.order-confirm-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 120rpx;
  
  .address-section {
    background-color: #fff;
    padding: 30rpx;
    margin-bottom: 20rpx;
    display: flex;
    align-items: center;
    
    .address-info {
      flex: 1;
      margin-right: 20rpx;
      
      .user-info {
        margin-bottom: 10rpx;
        
        .name {
          font-size: 30rpx;
          color: #333;
          font-weight: bold;
          margin-right: 20rpx;
        }
        
        .phone {
          font-size: 28rpx;
          color: #666;
        }
      }
      
      .address-detail {
        display: flex;
        align-items: center;
        
        .tag {
          font-size: 22rpx;
          color: #ff4444;
          background-color: #fff0f0;
          padding: 2rpx 10rpx;
          border-radius: 4rpx;
          margin-right: 10rpx;
        }
        
        .text {
          font-size: 26rpx;
          color: #666;
          line-height: 1.4;
        }
      }
    }
    
    .no-address {
      flex: 1;
      display: flex;
      align-items: center;
      
      .icon {
        font-size: 40rpx;
        color: #999;
        margin-right: 10rpx;
      }
      
      .text {
        font-size: 28rpx;
        color: #999;
      }
    }
    
    .icon {
      font-size: 32rpx;
      color: #999;
    }
  }
  
  .products-section {
    background-color: #fff;
    margin-bottom: 20rpx;
    
    .section-title {
      font-size: 28rpx;
      color: #333;
      padding: 20rpx 30rpx;
      border-bottom: 1rpx solid #f5f5f5;
    }
    
    .product-list {
      .product-item {
        display: flex;
        padding: 20rpx 30rpx;
        
        &:not(:last-child) {
          border-bottom: 1rpx solid #f5f5f5;
        }
        
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
          
          .product-name {
            font-size: 28rpx;
            color: #333;
            line-height: 1.4;
            margin-bottom: 10rpx;
          }
          
          .product-spec {
            font-size: 24rpx;
            color: #999;
            background-color: #f8f8f8;
            padding: 4rpx 10rpx;
            border-radius: 4rpx;
            display: inline-block;
            margin-bottom: 10rpx;
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
  }
  
  .delivery-section, .payment-section, .coupon-section, .remark-section {
    background-color: #fff;
    margin-bottom: 20rpx;
    
    .section-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30rpx;
      
      &:not(:last-child) {
        border-bottom: 1rpx solid #f5f5f5;
      }
      
      .item-label {
        font-size: 28rpx;
        color: #333;
      }
      
      .item-value {
        display: flex;
        align-items: center;
        
        .text {
          font-size: 28rpx;
          color: #666;
          margin-right: 10rpx;
        }
        
        .icon {
          font-size: 32rpx;
          color: #999;
        }
      }
      
      .remark-input {
        flex: 1;
        font-size: 28rpx;
        color: #333;
        text-align: right;
      }
    }
  }
  
  .amount-section {
    background-color: #fff;
    padding: 20rpx 30rpx;
    margin-bottom: 20rpx;
    
    .amount-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .item-label {
        font-size: 28rpx;
        color: #666;
      }
      
      .item-value {
        font-size: 28rpx;
        color: #333;
        
        &.discount {
          color: #ff4444;
        }
      }
    }
  }
  
  .bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100rpx;
    background-color: #fff;
    display: flex;
    align-items: center;
    padding: 0 30rpx;
    box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
    
    .total-amount {
      flex: 1;
      
      .label {
        font-size: 28rpx;
        color: #333;
      }
      
      .value {
        font-size: 36rpx;
        color: #ff4444;
        font-weight: bold;
      }
    }
    
    .submit-btn {
      width: 240rpx;
      height: 80rpx;
      line-height: 80rpx;
      background-color: #ff4444;
      color: #fff;
      font-size: 30rpx;
      border-radius: 40rpx;
      
      &[disabled] {
        background-color: #ffcccc;
      }
      
      &::after {
        border: none;
      }
    }
  }
  
  .picker-popup {
    background-color: #fff;
    border-radius: 24rpx 24rpx 0 0;
    overflow: hidden;
    
    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 90rpx;
      padding: 0 30rpx;
      border-bottom: 1rpx solid #f5f5f5;
      
      .cancel, .confirm {
        font-size: 28rpx;
        color: #666;
      }
      
      .confirm {
        color: #ff4444;
      }
      
      .title {
        font-size: 30rpx;
        color: #333;
        font-weight: bold;
      }
    }
    
    .picker-view {
      width: 100%;
      height: 400rpx;
      
      .picker-item {
        line-height: 80rpx;
        text-align: center;
        font-size: 28rpx;
        color: #333;
      }
    }
  }
}
</style>
    