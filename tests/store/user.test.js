/**
 * Unit tests for store/modules/user.js
 * Tests login, logout, token management, and user info operations
 */

describe('User Store Module', () => {
  let userModule

  beforeAll(() => {
    // Import the raw module to test mutations, getters, and action logic
    userModule = require('../../store/modules/user.js').default
  })

  beforeEach(() => {
    resetMocks()
  })

  describe('state', () => {
    it('should have correct initial state shape', () => {
      expect(userModule.state).toBeDefined()
      expect(userModule.state).toHaveProperty('isLogin', false)
      expect(userModule.state).toHaveProperty('openid', '')
      expect(userModule.state).toHaveProperty('userInfo', null)
      expect(userModule.state).toHaveProperty('token', '')
      expect(userModule.state).toHaveProperty('sessionKey', '')
    })

    it('should be namespaced', () => {
      expect(userModule.namespaced).toBe(true)
    })
  })

  describe('mutations', () => {
    let state

    beforeEach(() => {
      state = {
        isLogin: false,
        openid: '',
        userInfo: null,
        token: '',
        sessionKey: ''
      }
    })

    it('SET_LOGIN_STATE should update isLogin', () => {
      userModule.mutations.SET_LOGIN_STATE(state, true)
      expect(state.isLogin).toBe(true)
    })

    it('SET_OPENID should update openid', () => {
      userModule.mutations.SET_OPENID(state, 'test-openid-123')
      expect(state.openid).toBe('test-openid-123')
    })

    it('SET_USER_INFO should update userInfo', () => {
      const userInfo = { nickName: 'TestUser', avatarUrl: '/avatar.png' }
      userModule.mutations.SET_USER_INFO(state, userInfo)
      expect(state.userInfo).toEqual(userInfo)
    })

    it('SET_TOKEN should update token', () => {
      userModule.mutations.SET_TOKEN(state, 'token-abc-123')
      expect(state.token).toBe('token-abc-123')
    })

    it('SET_SESSION_KEY should update sessionKey', () => {
      userModule.mutations.SET_SESSION_KEY(state, 'sk-xyz')
      expect(state.sessionKey).toBe('sk-xyz')
    })

    it('CLEAR_USER_DATA should reset all state fields', () => {
      state.isLogin = true
      state.openid = 'some-id'
      state.userInfo = { nickName: 'Test' }
      state.token = 'some-token'
      state.sessionKey = 'some-key'

      userModule.mutations.CLEAR_USER_DATA(state)

      expect(state.isLogin).toBe(false)
      expect(state.openid).toBe('')
      expect(state.userInfo).toBe(null)
      expect(state.token).toBe('')
      expect(state.sessionKey).toBe('')
    })
  })

  describe('getters', () => {
    let state

    beforeEach(() => {
      state = {
        isLogin: false,
        openid: '',
        userInfo: null,
        token: '',
        sessionKey: ''
      }
    })

    it('nickname should return empty string when no userInfo', () => {
      expect(userModule.getters.nickname(state)).toBe('')
    })

    it('nickname should return nickName from userInfo', () => {
      state.userInfo = { nickName: 'Alice' }
      expect(userModule.getters.nickname(state)).toBe('Alice')
    })

    it('avatar should return empty string when no userInfo', () => {
      expect(userModule.getters.avatar(state)).toBe('')
    })

    it('avatar should return avatarUrl from userInfo', () => {
      state.userInfo = { avatarUrl: '/avatar.jpg' }
      expect(userModule.getters.avatar(state)).toBe('/avatar.jpg')
    })

    it('isLoggedIn should be false when not logged in', () => {
      expect(userModule.getters.isLoggedIn(state)).toBe(false)
    })

    it('isLoggedIn should be false when missing fields', () => {
      state.isLogin = true
      state.openid = '123'
      expect(userModule.getters.isLoggedIn(state)).toBe(false)
    })

    it('isLoggedIn should be true when all conditions met', () => {
      state.isLogin = true
      state.openid = '123'
      state.userInfo = { nickName: 'Test' }
      expect(userModule.getters.isLoggedIn(state)).toBe(true)
    })
  })

  describe('actions', () => {
    it('login should call wx.cloud.callFunction with login name', async () => {
      uni.login.mockResolvedValue({ code: 'mock_code' })
      wx.cloud.callFunction.mockResolvedValue({
        result: { openid: 'openid-123', session_key: 'sk-456' }
      })

      const commit = jest.fn()
      const result = await userModule.actions.login({ commit })

      expect(uni.login).toHaveBeenCalled()
      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'login',
        data: { code: 'mock_code' }
      })
      expect(commit).toHaveBeenCalledWith('SET_LOGIN_STATE', true)
      expect(commit).toHaveBeenCalledWith('SET_OPENID', 'openid-123')
      expect(commit).toHaveBeenCalledWith('SET_SESSION_KEY', 'sk-456')
      expect(result).toBe(true)
    })

    it('login should return false when no openid in response', async () => {
      uni.login.mockResolvedValue({ code: 'mock_code' })
      wx.cloud.callFunction.mockResolvedValue({
        result: { session_key: 'sk-456' }
      })

      const commit = jest.fn()
      const result = await userModule.actions.login({ commit })

      expect(result).toBe(false)
    })

    it('login should return false on error', async () => {
      uni.login.mockResolvedValue({ code: 'mock_code' })
      wx.cloud.callFunction.mockRejectedValue(new Error('Network error'))

      const commit = jest.fn()
      const result = await userModule.actions.login({ commit })

      expect(result).toBe(false)
    })

    it('getUserInfo should authorize and get user info', async () => {
      uni.getSetting.mockResolvedValue({
        authSetting: { 'scope.userInfo': false }
      })
      uni.authorize.mockResolvedValue({
        authSetting: { 'scope.userInfo': true }
      })
      uni.getUserInfo.mockResolvedValue({
        userInfo: { nickName: 'User', avatarUrl: '/img.png' }
      })

      const commit = jest.fn()
      const result = await userModule.actions.getUserInfo({ commit })

      expect(uni.authorize).toHaveBeenCalledWith({ scope: 'scope.userInfo' })
      expect(commit).toHaveBeenCalledWith('SET_USER_INFO', {
        nickName: 'User',
        avatarUrl: '/img.png'
      })
      expect(result).toBe(true)
    })

    it('getUserInfo should skip authorize if already granted', async () => {
      uni.getSetting.mockResolvedValue({
        authSetting: { 'scope.userInfo': true }
      })
      uni.getUserInfo.mockResolvedValue({
        userInfo: { nickName: 'Existing', avatarUrl: '/old.png' }
      })

      const commit = jest.fn()
      const result = await userModule.actions.getUserInfo({ commit })

      expect(uni.authorize).not.toHaveBeenCalled()
      expect(commit).toHaveBeenCalledWith('SET_USER_INFO', {
        nickName: 'Existing',
        avatarUrl: '/old.png'
      })
      expect(result).toBe(true)
    })

    it('getUserInfo should return false if authorize is denied', async () => {
      uni.getSetting.mockResolvedValue({
        authSetting: { 'scope.userInfo': false }
      })
      uni.authorize.mockResolvedValue({
        authSetting: { 'scope.userInfo': false }
      })

      const commit = jest.fn()
      const result = await userModule.actions.getUserInfo({ commit })

      expect(result).toBe(false)
    })

    it('checkLoginStatus should restore from local storage', async () => {
      uni.getStorageSync
        .mockReturnValueOnce('stored-openid')
        .mockReturnValueOnce({ nickName: 'Cached' })
        .mockReturnValueOnce('stored-sk')

      const commit = jest.fn()
      const dispatch = jest.fn()
      const result = await userModule.actions.checkLoginStatus({ commit, dispatch })

      expect(commit).toHaveBeenCalledWith('SET_LOGIN_STATE', true)
      expect(commit).toHaveBeenCalledWith('SET_OPENID', 'stored-openid')
      expect(commit).toHaveBeenCalledWith('SET_USER_INFO', { nickName: 'Cached' })
      expect(commit).toHaveBeenCalledWith('SET_SESSION_KEY', 'stored-sk')
      expect(result).toBe(true)
    })

    it('checkLoginStatus should try login if no cached data', async () => {
      uni.getStorageSync.mockReturnValue(null)

      const commit = jest.fn()
      const dispatch = jest.fn().mockResolvedValue(false)
      const result = await userModule.actions.checkLoginStatus({ commit, dispatch })

      expect(dispatch).toHaveBeenCalledWith('login')
      expect(result).toBe(false)
    })

    it('updateUserInfo should call cloud and update state', async () => {
      wx.cloud.callFunction.mockResolvedValue({ result: { success: true } })

      const commit = jest.fn()
      const state = {
        openid: 'user-123',
        userInfo: { nickName: 'Old' }
      }
      const result = await userModule.actions.updateUserInfo(
        { commit, state },
        { nickName: 'New' }
      )

      expect(wx.cloud.callFunction).toHaveBeenCalledWith({
        name: 'updateUserInfo',
        data: { userId: 'user-123', userInfo: { nickName: 'New' } }
      })
      expect(commit).toHaveBeenCalledWith('SET_USER_INFO', {
        nickName: 'New'
      })
      expect(result).toBe(true)
    })

    it('updateUserInfo should return false on error', async () => {
      wx.cloud.callFunction.mockRejectedValue(new Error('Update failed'))

      const commit = jest.fn()
      const state = { openid: 'user-123', userInfo: null }
      const result = await userModule.actions.updateUserInfo(
        { commit, state },
        { nickName: 'New' }
      )

      expect(result).toBe(false)
    })

    it('logout should clear state and storage', () => {
      const commit = jest.fn()
      userModule.actions.logout({ commit })

      expect(commit).toHaveBeenCalledWith('CLEAR_USER_DATA')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('openid')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('userInfo')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('sessionKey')
    })
  })
})
