<script>
export default {
  onLaunch: async function() {
    console.log('App Launch')

    // Initialize Tencent CloudBase environment
    if (wx.cloud) {
      wx.cloud.init({
        env: 'YOUR_CLOUDBASE_ENV_ID',
        traceUser: true
      })
    } else {
      console.error('Please ensure wx.cloud is available. Update WeChat base library to 2.2.3+.')
    }

    // Perform auto login
    try {
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      })
      if (loginRes.result && loginRes.result.openid) {
        this.$store.commit('user/SET_TOKEN', loginRes.result.openid)
      }
    } catch (err) {
      console.error('Auto login failed:', err)
    }

    // Check for updates
    this.checkForUpdates()
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  },
  methods: {
    checkForUpdates() {
      if (wx.canIUse('getUpdateManager')) {
        const updateManager = wx.getUpdateManager()
        updateManager.onCheckForUpdate(function(res) {
          if (res.hasUpdate) {
            updateManager.onUpdateReady(function() {
              wx.showModal({
                title: 'Update Available',
                content: 'A new version is ready. Restart the app?',
                success: function(modalRes) {
                  if (modalRes.confirm) {
                    updateManager.applyUpdate()
                  }
                }
              })
            })
            updateManager.onUpdateFailed(function() {
              wx.showModal({
                title: 'Update Available',
                content: 'A new version is online. Please delete and re-open this mini program.'
              })
            })
          }
        })
      }
    }
  }
}
</script>

<style>
/* 全局样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  font-size: 28rpx;
  color: #333;
  background-color: #f8f8f8;
  box-sizing: border-box;
}

/* 通用样式 */
.container {
  padding: 20rpx;
}

.flex-row {
  display: flex;
  flex-direction: row;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 按钮样式 */
.btn-primary {
  background-color: #3cc51f;
  color: #ffffff;
  border-radius: 10rpx;
  padding: 20rpx 40rpx;
  font-size: 32rpx;
}

.btn-default {
  background-color: #f8f8f8;
  color: #333333;
  border: 1rpx solid #dddddd;
  border-radius: 10rpx;
  padding: 20rpx 40rpx;
  font-size: 32rpx;
}

/* 卡片样式 */
.card {
  background-color: #ffffff;
  border-radius: 10rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

/* 列表样式 */
.list-item {
  background-color: #ffffff;
  padding: 20rpx;
  border-bottom: 1rpx solid #eeeeee;
}

/* 价格样式 */
.price {
  color: #ff6700;
  font-size: 32rpx;
  font-weight: bold;
}

/* 标签样式 */
.tag {
  display: inline-block;
  padding: 4rpx 12rpx;
  font-size: 24rpx;
  border-radius: 6rpx;
  margin-right: 10rpx;
}

.tag-primary {
  background-color: #e8f7e4;
  color: #3cc51f;
}

.tag-warning {
  background-color: #fff8e6;
  color: #ff9900;
}

/* 占位图样式 */
.placeholder {
  text-align: center;
  padding: 100rpx 0;
  color: #999999;
}

.placeholder-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
}

/* 底部安全区适配 */
.safe-area-inset-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>