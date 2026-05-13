const state = {
  isLogin: false,
  openid: '',
  userInfo: null,
  token: uni.getStorageSync('token') || '',
  sessionKey: ''
}

const mutations = {
  // 设置登录状态
  SET_LOGIN_STATE(state, isLogin) {
    state.isLogin = isLogin
  },
  
  // 设置openid
  SET_OPENID(state, openid) {
    state.openid = openid
  },
  
  // 设置用户信息
  SET_USER_INFO(state, userInfo) {
    state.userInfo = userInfo
  },
  
  // 设置token
  SET_TOKEN(state, token) {
    state.token = token
  },
  
  // 设置session_key
  SET_SESSION_KEY(state, sessionKey) {
    state.sessionKey = sessionKey
  },
  
  // 清除用户数据
  CLEAR_USER_DATA(state) {
    state.isLogin = false
    state.openid = ''
    state.userInfo = null
    state.token = ''
    state.sessionKey = ''
  }
}

const actions = {
  // 微信登录
  async login({ commit }) {
    try {
      // 获取微信登录code
      const { code } = await uni.login()
      
      // 调用云函数进行登录
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { code }
      })
      const result = res.result || {}
      
      if (result.openid) {
        // 保存登录状态和openid
        commit('SET_LOGIN_STATE', true)
        commit('SET_OPENID', result.openid)
        commit('SET_SESSION_KEY', result.session_key)
        
        // 持久化存储
        uni.setStorageSync('openid', result.openid)
        uni.setStorageSync('sessionKey', result.session_key)
        
        return true
      }
      return false
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  },
  
  // 获取用户信息
  async getUserInfo({ commit }) {
    try {
      // 获取用户授权设置
      const authSetting = await uni.getSetting()
      
      // 如果未授权获取用户信息，则请求授权
      if (!authSetting.authSetting['scope.userInfo']) {
        const { authSetting } = await uni.authorize({
          scope: 'scope.userInfo'
        })
        
        if (!authSetting['scope.userInfo']) {
          return false
        }
      }
      
      // 获取用户信息
      const { userInfo } = await uni.getUserInfo()
      
      // 保存用户信息
      commit('SET_USER_INFO', userInfo)
      
      // 持久化存储
      uni.setStorageSync('userInfo', userInfo)
      
      return true
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return false
    }
  },
  
  // 检查登录状态
  async checkLoginStatus({ commit, dispatch }) {
    try {
      // 从本地存储获取数据
      const openid = uni.getStorageSync('openid')
      const userInfo = uni.getStorageSync('userInfo')
      const sessionKey = uni.getStorageSync('sessionKey')
      
      if (openid && userInfo) {
        // 恢复登录状态
        commit('SET_LOGIN_STATE', true)
        commit('SET_OPENID', openid)
        commit('SET_USER_INFO', userInfo)
        commit('SET_SESSION_KEY', sessionKey)
        return true
      }
      
      // 如果没有登录信息，尝试重新登录
      const loginResult = await dispatch('login')
      if (loginResult) {
        return await dispatch('getUserInfo')
      }
      
      return false
    } catch (error) {
      console.error('检查登录状态失败:', error)
      return false
    }
  },
  
  // 更新用户信息
  async updateUserInfo({ commit, state }, userInfo) {
    try {
      // 调用云函数更新用户信息
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          userId: state.openid,
          userInfo
        }
      })
      
      // 更新本地状态
      commit('SET_USER_INFO', {
        ...state.userInfo,
        ...userInfo
      })
      
      // 更新本地存储
      uni.setStorageSync('userInfo', state.userInfo)
      
      return true
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return false
    }
  },
  
  // 登出
  logout({ commit }) {
    // 清除状态
    commit('CLEAR_USER_DATA')
    
    // 清除本地存储
    uni.removeStorageSync('openid')
    uni.removeStorageSync('userInfo')
    uni.removeStorageSync('sessionKey')
  }
}

const getters = {
  // 获取用户昵称
  nickname: state => {
    return state.userInfo ? state.userInfo.nickName : ''
  },
  
  // 获取用户头像
  avatar: state => {
    return state.userInfo ? state.userInfo.avatarUrl : ''
  },
  
  // 判断是否已登录
  isLoggedIn: state => {
    return !!(state.isLogin && state.openid && state.userInfo)
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}