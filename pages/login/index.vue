<template>
  <view class="login-container">
    <!-- 顶部logo -->
    <view class="logo-section">
      <image class="logo" src="/static/images/logo.png" mode="aspectFit"></image>
      <text class="app-name">药店小程序</text>
    </view>
    
    <!-- 登录表单 -->
    <view class="login-form">
      <!-- 手机号输入 -->
      <view class="input-group">
        <text class="label">手机号</text>
        <view class="input-wrap">
          <text class="prefix">+86</text>
          <input 
            class="input" 
            type="number" 
            v-model="phone" 
            placeholder="请输入手机号"
            maxlength="11"
          />
          <text 
            class="clear-btn" 
            v-if="phone"
            @click="phone = ''"
          >×</text>
        </view>
      </view>
      
      <!-- 验证码输入 -->
      <view class="input-group" v-if="showVerifyCode">
        <text class="label">验证码</text>
        <view class="input-wrap">
          <input 
            class="input" 
            type="number" 
            v-model="verifyCode" 
            placeholder="请输入验证码"
            maxlength="6"
          />
          <button 
            class="verify-btn" 
            :disabled="countDown > 0"
            @click="sendVerifyCode"
          >
            {{ countDown > 0 ? `${countDown}s后重新获取` : '获取验证码' }}
          </button>
        </view>
      </view>
      
      <!-- 登录按钮 -->
      <button 
        class="login-btn" 
        :disabled="!isPhoneValid"
        @click="handleLogin"
      >
        {{ showVerifyCode ? '登录' : '获取验证码' }}
      </button>
      
      <!-- 微信登录 -->
      <button 
        class="wechat-login-btn" 
        open-type="getPhoneNumber"
        @getphonenumber="handleGetPhoneNumber"
      >
        <text class="icon iconfont icon-wechat"></text>
        <text>微信一键登录</text>
      </button>
    </view>
    
    <!-- 用户协议 -->
    <view class="agreement">
      <checkbox 
        :checked="agreePolicy" 
        @click="agreePolicy = !agreePolicy"
        color="#ff4444"
      ></checkbox>
      <text class="agreement-text">
        我已阅读并同意
        <text class="link" @click="goToUserAgreement">《用户协议》</text>
        和
        <text class="link" @click="goToPrivacyPolicy">《隐私政策》</text>
      </text>
    </view>
    
    <!-- 其他登录方式 -->
    <view class="other-login" v-if="false">
      <view class="divider">
        <view class="line"></view>
        <text class="text">其他登录方式</text>
        <view class="line"></view>
      </view>
      <view class="other-login-btns">
        <view class="other-login-item">
          <text class="icon iconfont icon-wechat"></text>
          <text class="text">微信</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { userApi } from '@/utils/cloudHelper.js'

export default {
  data() {
    return {
      phone: '', // 手机号
      verifyCode: '', // 验证码
      showVerifyCode: false, // 是否显示验证码输入框
      countDown: 0, // 验证码倒计时
      agreePolicy: false, // 是否同意用户协议
      timer: null // 倒计时定时器
    }
  },
  computed: {
    // 手机号是否有效
    isPhoneValid() {
      return /^1[3-9]\d{9}$/.test(this.phone)
    }
  },
  onUnload() {
    // 页面卸载时清除定时器
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },
  methods: {
    // 处理登录
    handleLogin() {
      if (!this.isPhoneValid) {
        return uni.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        })
      }
      
      if (!this.agreePolicy) {
        return uni.showToast({
          title: '请先同意用户协议和隐私政策',
          icon: 'none'
        })
      }
      
      if (!this.showVerifyCode) {
        // 显示验证码输入框
        this.showVerifyCode = true
        // 发送验证码
        this.sendVerifyCode()
      } else {
        // 验证码登录
        this.loginWithVerifyCode()
      }
    },
    
    // 发送验证码
    async sendVerifyCode() {
      if (!this.isPhoneValid || this.countDown > 0) return
      
      try {
        const result = await userApi.login()
        if (result.success) {
          uni.showToast({ title: '验证码已发送', icon: 'success' })
          this.countDown = 60
          this.timer = setInterval(() => {
            this.countDown--
            if (this.countDown <= 0) {
              clearInterval(this.timer)
              this.timer = null
            }
          }, 1000)
        } else {
          throw new Error(result.error || 'Send failed')
        }
      } catch (e) {
        console.error('发送验证码失败', e)
        uni.showToast({ title: e.message || '发送验证码失败', icon: 'none' })
      }
    },
    
    // 验证码登录
    async loginWithVerifyCode() {
      if (!this.verifyCode) {
        return uni.showToast({ title: '请输入验证码', icon: 'none' })
      }
      
      uni.showLoading({ title: '登录中...' })
      
      try {
        const result = await userApi.login()
        if (result.success) {
          uni.setStorageSync('token', result.data.token || result.data.openid || '')
          uni.setStorageSync('userInfo', result.data.userInfo || result.data)
          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            const pages = getCurrentPages()
            if (pages.length > 1) {
              uni.navigateBack()
            } else {
              uni.switchTab({ url: '/pages/index/index' })
            }
          }, 1500)
        } else {
          throw new Error(result.error || 'Login failed')
        }
      } catch (e) {
        console.error('登录失败', e)
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    
    // 处理微信获取手机号
    async handleGetPhoneNumber(e) {
      if (!this.agreePolicy) {
        return uni.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' })
      }
      
      if (e.detail.errMsg !== 'getPhoneNumber:ok') {
        return uni.showToast({ title: '获取手机号失败', icon: 'none' })
      }
      
      uni.showLoading({ title: '登录中...' })
      
      try {
        const result = await userApi.login()
        if (result.success) {
          uni.setStorageSync('token', result.data.token || result.data.openid || '')
          uni.setStorageSync('userInfo', result.data.userInfo || result.data)
          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            const pages = getCurrentPages()
            if (pages.length > 1) {
              uni.navigateBack()
            } else {
              uni.switchTab({ url: '/pages/index/index' })
            }
          }, 1500)
        } else {
          throw new Error(result.error || 'Login failed')
        }
      } catch (e) {
        console.error('微信登录失败', e)
        uni.showToast({ title: e.message || '微信登录失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    
    // 跳转到用户协议
    goToUserAgreement() {
      uni.navigateTo({
        url: '/pages/agreement/user'
      })
    },
    
    // 跳转到隐私政策
    goToPrivacyPolicy() {
      uni.navigateTo({
        url: '/pages/agreement/privacy'
      })
    }
  }
}
</script>

<style lang="scss">
.login-container {
  min-height: 100vh;
  background-color: #fff;
  padding: 0 50rpx;
  
  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 100rpx 0;
    
    .logo {
      width: 160rpx;
      height: 160rpx;
      margin-bottom: 30rpx;
    }
    
    .app-name {
      font-size: 36rpx;
      color: #333;
      font-weight: bold;
    }
  }
  
  .login-form {
    .input-group {
      margin-bottom: 30rpx;
      
      .label {
        font-size: 28rpx;
        color: #333;
        margin-bottom: 20rpx;
        display: block;
      }
      
      .input-wrap {
        display: flex;
        align-items: center;
        height: 90rpx;
        border-bottom: 1rpx solid #eee;
        
        .prefix {
          font-size: 28rpx;
          color: #333;
          margin-right: 20rpx;
        }
        
        .input {
          flex: 1;
          height: 100%;
          font-size: 32rpx;
          color: #333;
        }
        
        .clear-btn {
          font-size: 40rpx;
          color: #999;
          padding: 0 20rpx;
        }
        
        .verify-btn {
          min-width: 200rpx;
          height: 60rpx;
          line-height: 60rpx;
          font-size: 24rpx;
          color: #ff4444;
          background-color: #fff;
          border: 1rpx solid #ff4444;
          border-radius: 30rpx;
          padding: 0 20rpx;
          margin: 0;
          
          &[disabled] {
            color: #999;
            border-color: #ddd;
          }
        }
      }
    }
    
    .login-btn {
      width: 100%;
      height: 90rpx;
      line-height: 90rpx;
      background-color: #ff4444;
      color: #fff;
      font-size: 32rpx;
      border-radius: 45rpx;
      margin: 50rpx 0 30rpx;
      
      &[disabled] {
        background-color: #ffcccc;
      }
    }
    
    .wechat-login-btn {
      width: 100%;
      height: 90rpx;
      line-height: 90rpx;
      background-color: #07c160;
      color: #fff;
      font-size: 32rpx;
      border-radius: 45rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .icon-wechat {
        font-size: 40rpx;
        margin-right: 10rpx;
      }
    }
  }
  
  .agreement {
    display: flex;
    align-items: center;
    margin-top: 30rpx;
    padding: 0 20rpx;
    
    .agreement-text {
      font-size: 24rpx;
      color: #999;
      margin-left: 10rpx;
      
      .link {
        color: #ff4444;
      }
    }
  }
  
  .other-login {
    margin-top: 100rpx;
    
    .divider {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 50rpx;
      
      .line {
        width: 100rpx;
        height: 1rpx;
        background-color: #eee;
      }
      
      .text {
        font-size: 24rpx;
        color: #999;
        margin: 0 20rpx;
      }
    }
    
    .other-login-btns {
      display: flex;
      justify-content: center;
      
      .other-login-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0 40rpx;
        
        .icon {
          font-size: 80rpx;
          color: #07c160;
          margin-bottom: 20rpx;
        }
        
        .text {
          font-size: 24rpx;
          color: #333;
        }
      }
    }
  }
}