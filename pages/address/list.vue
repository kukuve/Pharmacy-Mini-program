<template>
  <view class="address-container">
    <!-- 地址列表 -->
    <view class="address-list" v-if="addressList.length > 0">
      <view 
        class="address-item" 
        v-for="(item, index) in addressList" 
        :key="item._id"
        @click="handleAddressClick(item)"
      >
        <view class="address-info">
          <view class="user-info">
            <text class="name">{{item.name}}</text>
            <text class="phone">{{item.phone}}</text>
            <text class="tag" v-if="item.is_default">默认</text>
          </view>
          <view class="address-detail">
            {{formatAddress(item)}}
          </view>
        </view>
        <view class="address-actions">
          <view class="action-item" @click.stop="editAddress(item)">
            <text class="icon iconfont icon-edit"></text>
            <text class="text">编辑</text>
          </view>
          <view class="action-item" @click.stop="deleteAddress(item)">
            <text class="icon iconfont icon-delete"></text>
            <text class="text">删除</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空地址提示 -->
    <view class="empty-address" v-else>
      <image class="empty-icon" src="/static/images/empty-address.png" mode="aspectFit"></image>
      <text class="empty-text">暂无收货地址</text>
    </view>
    
    <!-- 底部按钮 -->
    <view class="bottom-btn-wrapper">
      <button class="add-btn" @click="addAddress">新增收货地址</button>
    </view>
    
    <!-- 加载状态 -->
    <uni-load-more v-if="loading" status="loading"></uni-load-more>
  </view>
</template>

<script>
export default {
  data() {
    return {
      addressList: [],
      loading: true,
      fromOrder: false, // 是否从订单确认页跳转而来
      selectedId: '' // 选中的地址ID
    }
  },
  onLoad(options) {
    if (options.from === 'order') {
      this.fromOrder = true
    }
    
    if (options.selected) {
      this.selectedId = options.selected
    }
  },
  onShow() {
    this.loadAddressList()
  },
  methods: {
    // 加载地址列表
    async loadAddressList() {
      this.loading = true
      
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'address',
          data: {
            action: 'getList'
          }
        })
        
        if (result.code === 0) {
          this.addressList = result.data
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('获取地址列表失败', e)
        uni.showToast({
          title: '获取地址列表失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 格式化地址
    formatAddress(address) {
      if (!address) return ''
      return `${address.province} ${address.city} ${address.district} ${address.detail}`
    },
    
    // 处理地址点击
    handleAddressClick(address) {
      if (this.fromOrder) {
        // 从订单确认页跳转而来，选择地址后返回
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        
        // 设置上一页的地址信息
        prevPage.$vm.addressInfo = address
        
        // 返回上一页
        uni.navigateBack()
      }
    },
    
    // 添加地址
    addAddress() {
      uni.navigateTo({
        url: '/pages/address/edit'
      })
    },
    
    // 编辑地址
    editAddress(address) {
      uni.navigateTo({
        url: `/pages/address/edit?id=${address._id}`
      })
    },
    
    // 删除地址
    deleteAddress(address) {
      uni.showModal({
        title: '提示',
        content: '确定要删除该地址吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const { result } = await this.$cloud.callFunction({
                name: 'address',
                data: {
                  action: 'remove',
                  data: {
                    id: address._id
                  }
                }
              })
              
              if (result.code === 0) {
                uni.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                
                // 重新加载地址列表
                this.loadAddressList()
              } else {
                throw new Error(result.message)
              }
            } catch (e) {
              console.error('删除地址失败', e)
              uni.showToast({
                title: e.message || '删除地址失败',
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

<style lang="scss">
.address-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 140rpx;
  
  .address-list {
    padding: 20rpx;
    
    .address-item {
      background-color: #fff;
      border-radius: 12rpx;
      margin-bottom: 20rpx;
      overflow: hidden;
      
      .address-info {
        padding: 30rpx;
        
        .user-info {
          display: flex;
          align-items: center;
          margin-bottom: 10rpx;
          
          .name {
            font-size: 32rpx;
            color: #333;
            font-weight: bold;
            margin-right: 20rpx;
          }
          
          .phone {
            font-size: 28rpx;
            color: #666;
          }
          
          .tag {
            margin-left: auto;
            font-size: 22rpx;
            color: #ff4444;
            border: 1rpx solid #ff4444;
            padding: 2rpx 10rpx;
            border-radius: 4rpx;
          }
        }
        
        .address-detail {
          font-size: 28rpx;
          color: #333;
          line-height: 1.5;
        }
      }
      
      .address-actions {
        display: flex;
        border-top: 1rpx solid #f5f5f5;
        
        .action-item {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 80rpx;
          
          &:first-child {
            border-right: 1rpx solid #f5f5f5;
          }
          
          .icon {
            font-size: 32rpx;
            color: #666;
            margin-right: 10rpx;
          }
          
          .text {
            font-size: 28rpx;
            color: #666;
          }
        }
      }
    }
  }
  
  .empty-address {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 200rpx;
    
    .empty-icon {
      width: 200rpx;
      height: 200rpx;
      margin-bottom: 30rpx;
    }
    
    .empty-text {
      font-size: 30rpx;
      color: #999;
    }
  }
  
  .bottom-btn-wrapper {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 20rpx 30rpx;
    background-color: #fff;
    box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
    
    .add-btn {
      width: 100%;
      height: 90rpx;
      line-height: 90rpx;
      text-align: center;
      border-radius: 45rpx;
      font-size: 32rpx;
      background-color: #ff4444;
      color: #fff;
    }
  }
}
</style>