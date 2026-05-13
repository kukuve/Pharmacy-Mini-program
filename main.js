import App from './App'
import { createSSRApp } from 'vue'
import store from './store'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  
  // 全局混入
  app.mixin({
    methods: {
      // 全局方法
      navigateTo(url) {
        uni.navigateTo({
          url
        })
      },
      showToast(title, icon = 'none') {
        uni.showToast({
          title,
          icon
        })
      },
      showLoading(title = '加载中') {
        uni.showLoading({
          title,
          mask: true
        })
      },
      hideLoading() {
        uni.hideLoading()
      }
    }
  })
  
  return {
    app
  }
}