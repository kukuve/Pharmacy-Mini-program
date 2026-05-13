<template>
  <view class="info-container">
    <!-- 用户信息表单 -->
    <view class="info-form">
      <!-- 头像 -->
      <view class="form-item" @click="chooseAvatar">
        <text class="label">头像</text>
        <view class="avatar-wrapper">
          <image class="avatar" :src="userInfo.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image>
          <text class="icon iconfont icon-right"></text>
        </view>
      </view>
      
      <!-- 昵称 -->
      <view class="form-item">
        <text class="label">昵称</text>
        <input 
          class="input" 
          type="text" 
          v-model="userInfo.nickname" 
          placeholder="请输入昵称"
          @blur="updateNickname"
        />
      </view>
      
      <!-- 手机号 -->
      <view class="form-item">
        <text class="label">手机号</text>
        <view class="phone-wrapper">
          <text class="phone">{{formatPhone(userInfo.phone)}}</text>
          <button 
            class="btn-bind" 
            :class="{'btn-update': userInfo.phone}"
            @click="bindPhone"
          >
            {{userInfo.phone ? '更换' : '绑定'}}
          </button>
        </view>
      </view>
      
      <!-- 性别 -->
      <view class="form-item">
        <text class="label">性别</text>
        <picker 
          class="picker" 
          :value="userInfo.gender" 
          :range="genderOptions" 
          @change="handleGenderChange"
        >
          <view class="picker-value">
            <text>{{genderOptions[userInfo.gender]}}</text>
            <text class="icon iconfont icon-right"></text>
          </view>
        </picker>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {
        avatar: '',
        nickname: '',
        phone: '',
        gender: 0
      },
      genderOptions: ['未设置', '男', '女']
    }
  },
  onLoad() {
    this.loadUserInfo()
  },
  methods: {
    // 加载用户信息
    async loadUserInfo() {
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'user',
          data: {
            action: 'getInfo'
          }
        })
        
        if (result.code === 0) {
          this.userInfo = {
            ...this.userInfo,
            ...result.data
          }
        }
      } catch (e) {
        console.error('获取用户信息失败', e)
        uni.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
      }
    },
    
    // 选择头像
    chooseAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0]
          
          // 显示上传中
          uni.showLoading({
            title: '上传中...',
            mask: true
          })
          
          try {
            // 上传图片到云存储
            const uploadRes = await uniCloud.uploadFile({
              filePath: tempFilePath,
              cloudPath: `avatar/${Date.now()}-${Math.random().toString(36).slice(-6)}.jpg`
            })
            
            // 更新用户头像
            const { result } = await this.$cloud.callFunction({
              name: 'user',
              data: {
                action: 'updateInfo',
                data: {
                  avatar: uploadRes.fileID
                }
              }
            })
            
            if (result.code === 0) {
              this.userInfo.avatar = uploadRes.fileID
              uni.showToast({
                title: '更新成功',
                icon: 'success'
              })
            } else {
              throw new Error(result.message)
            }
          } catch (e) {
            console.error('更新头像失败', e)
            uni.showToast({
              title: '更新头像失败',
              icon: 'none'
            })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    
    // 更新昵称
    async updateNickname() {
      if (!this.userInfo.nickname) {
        return uni.showToast({
          title: '昵称不能为空',
          icon: 'none'
        })
      }
      
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'user',
          data: {
            action: 'updateInfo',
            data: {
              nickname: this.userInfo.nickname
            }
          }
        })
        
        if (result.code === 0) {
          uni.showToast({
            title: '更新成功',
            icon: 'success'
          })
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('更新昵称失败', e)
        uni.showToast({
          title: '更新昵称失败',
          icon: 'none'
        })
      }
    },
    
    // 绑定/更换手机号
    bindPhone() {
      // 实际项目中应该跳转到手机号绑定页面
      // 这里简单模拟一下
      uni.showModal({
        title: this.userInfo.phone ? '更换手机号' : '绑定手机号',
        editable: true,
        placeholderText: '请输入手机号',
        success: async (res) => {
          if (res.confirm && res.content) {
            // 验证手机号格式
            if (!/^1\d{10}$/.test(res.content)) {
              return uni.showToast({
                title: '手机号格式不正确',
                icon: 'none'
              })
            }
            
            try {
              const { result } = await this.$cloud.callFunction({
                name: 'user',
                data: {
                  action: 'updatePhone',
                  data: {
                    phone: res.content
                  }
                }
              })
              
              if (result.code === 0) {
                this.userInfo.phone = res.content
                uni.showToast({
                  title: '更新成功',
                  icon: 'success'
                })
              } else {
                throw new Error(result.message)
              }
            } catch (e) {
              console.error('更新手机号失败', e)
              uni.showToast({
                title: e.message || '更新手机号失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
    
    // 处理性别选择
    async handleGenderChange(e) {
      const gender = parseInt(e.detail.value)
      
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'user',
          data: {
            action: 'updateInfo',
            data: {
              gender
            }
          }
        })
        
        if (result.code === 0) {
          this.userInfo.gender = gender
          uni.showToast({
            title: '更新成功',
            icon: 'success'
          })
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('更新性别失败', e)
        uni.showToast({
          title: '更新性别失败',
          icon: 'none'
        })
      }
    },
    
    // 格式化手机号
    formatPhone(phone) {
      if (!phone) return '未绑定'
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }
  }
}
</script>

<style lang="scss">
.info-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-top: 20rpx;
  
  .info-form {
    background-color: #fff;
    
    .form-item {
      display: flex;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f5f5f5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        width: 140rpx;
        font-size: 30rpx;
        color: #333;
      }
      
      .input {
        flex: 1;
        font-size: 30rpx;
        color: #333;
      }
      
      .avatar-wrapper {
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        
        .avatar {
          width: 100rpx;
          height: 100rpx;
          border-radius: 50rpx;
          margin-right: 20rpx;
        }
        
        .icon-right {
          font-size: 32rpx;
          color: #999;
        }
      }
      
      .phone-wrapper {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .phone {
          font-size: 30rpx;
          color: #333;
        }
        
        .btn-bind {
          margin: 0;
          padding: 0 30rpx;
          height: 56rpx;
          line-height: 56rpx;
          font-size: 26rpx;
          color: #fff;
          background-color: #ff4444;
          border-radius: 28rpx;
          
          &.btn-update {
            color: #666;
            background-color: #f5f5f5;
          }
        }
      }
      
      .picker {
        flex: 1;
        
        .picker-value {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 30rpx;
          color: #333;
          
          .icon-right {
            font-size: 32rpx;
            color: #999;
          }
        }
      }
    }
  }
}
</style>