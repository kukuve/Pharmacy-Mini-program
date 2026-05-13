<template>
  <view class="container">
    <!-- 文章头部 -->
    <view class="article-header">
      <text class="article-title">{{ article.title }}</text>
      <view class="article-meta">
        <text class="article-category" v-if="article.categoryName">{{ article.categoryName }}</text>
        <text class="article-date">{{ formatDate(article.createTime) }}</text>
      </view>
    </view>
    
    <!-- 文章封面图 -->
    <image 
      v-if="article.coverUrl" 
      :src="article.coverUrl" 
      class="article-cover" 
      mode="widthFix"
    ></image>
    
    <!-- 文章内容 -->
    <view class="article-content">
      <rich-text :nodes="article.content"></rich-text>
    </view>
    
    <!-- 文章来源 -->
    <view class="article-source" v-if="article.source">
      <text>来源：{{ article.source }}</text>
    </view>
    
    <!-- 相关文章 -->
    <view class="related-section" v-if="relatedArticles.length > 0">
      <view class="section-title">相关推荐</view>
      <view class="related-list">
        <view 
          class="related-item" 
          v-for="item in relatedArticles" 
          :key="item._id"
          @tap="navigateToArticle(item._id)"
        >
          <image :src="item.coverUrl" class="related-image" mode="aspectFill"></image>
          <view class="related-info">
            <text class="related-title">{{ item.title }}</text>
            <text class="related-date">{{ formatDate(item.createTime) }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部操作栏 -->
    <view class="action-bar safe-area-inset-bottom">
      <button class="action-btn" open-type="share">
        <text class="iconfont icon-share"></text>
        <text>分享</text>
      </button>
      <button class="action-btn" @tap="toggleFavorite">
        <text class="iconfont" :class="isFavorite ? 'icon-heart-filled' : 'icon-heart'"></text>
        <text>{{ isFavorite ? '已收藏' : '收藏' }}</text>
      </button>
      <button class="action-btn" @tap="navigateToHome">
        <text class="iconfont icon-home"></text>
        <text>首页</text>
      </button>
    </view>
  </view>
</template>

<script>
import { mapState } from 'vuex'

export default {
  data() {
    return {
      id: '',
      article: {
        title: '',
        content: '',
        coverUrl: '',
        createTime: Date.now(),
        categoryId: '',
        categoryName: '',
        source: ''
      },
      relatedArticles: [],
      isFavorite: false
    }
  },
  
  computed: {
    ...mapState('user', ['isLogin', 'openid'])
  },
  
  onLoad(options) {
    if (options.id) {
      this.id = options.id
      this.loadArticleDetail()
    }
  },
  
  onShareAppMessage() {
    return {
      title: this.article.title,
      path: `/pages/articles/detail?id=${this.id}`
    }
  },
  
  methods: {
    // 加载文章详情
    async loadArticleDetail() {
      uni.showLoading({
        title: '加载中'
      })
      
      try {
        const db = uniCloud.database()
        const { data } = await db.collection('articles')
          .doc(this.id)
          .get()
        
        if (data) {
          this.article = data
          
          // 获取分类名称
          if (this.article.categoryId) {
            const categoryRes = await db.collection('articleCategories')
              .doc(this.article.categoryId)
              .field({
                name: true
              })
              .get()
            
            if (categoryRes.data) {
              this.article.categoryName = categoryRes.data.name
            }
          }
          
          // 记录浏览历史
          if (this.isLogin) {
            this.recordHistory()
          }
          
          // 检查是否已收藏
          if (this.isLogin) {
            this.checkFavorite()
          }
          
          // 加载相关文章
          this.loadRelatedArticles()
          
          // 更新浏览量
          this.updateViewCount()
        } else {
          uni.showToast({
            title: '文章不存在',
            icon: 'none'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }
      } catch (error) {
        console.error('加载文章详情失败:', error)
        uni.showToast({
          title: '加载文章详情失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    
    // 加载相关文章
    async loadRelatedArticles() {
      try {
        const db = uniCloud.database()
        const _ = db.command
        
        // 根据相同分类查询相关文章
        const { data } = await db.collection('articles')
          .where({
            _id: _.neq(this.id),
            status: 'published',
            categoryId: this.article.categoryId || ''
          })
          .orderBy('createTime', 'desc')
          .limit(3)
          .field({
            _id: true,
            title: true,
            coverUrl: true,
            createTime: true
          })
          .get()
        
        this.relatedArticles = data
      } catch (error) {
        console.error('加载相关文章失败:', error)
      }
    },
    
    // 记录浏览历史
    async recordHistory() {
      try {
        await uniCloud.callFunction({
          name: 'recordArticleHistory',
          data: {
            userId: this.openid,
            articleId: this.id,
            title: this.article.title,
            coverUrl: this.article.coverUrl
          }
        })
      } catch (error) {
        console.error('记录浏览历史失败:', error)
      }
    },
    
    // 更新浏览量
    async updateViewCount() {
      try {
        await uniCloud.callFunction({
          name: 'updateArticleViewCount',
          data: {
            articleId: this.id
          }
        })
      } catch (error) {
        console.error('更新浏览量失败:', error)
      }
    },
    
    // 检查是否已收藏
    async checkFavorite() {
      try {
        const { result } = await uniCloud.callFunction({
          name: 'checkArticleFavorite',
          data: {
            userId: this.openid,
            articleId: this.id
          }
        })
        
        this.isFavorite = result.isFavorite
      } catch (error) {
        console.error('检查收藏状态失败:', error)
      }
    },
    
    // 切换收藏状态
    async toggleFavorite() {
      if (!this.isLogin) {
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      try {
        const { result } = await uniCloud.callFunction({
          name: 'toggleArticleFavorite',
          data: {
            userId: this.openid,
            articleId: this.id,
            title: this.article.title,
            coverUrl: this.article.coverUrl
          }
        })
        
        this.isFavorite = result.isFavorite
        
        uni.showToast({
          title: this.isFavorite ? '收藏成功' : '已取消收藏',
          icon: 'success'
        })
      } catch (error) {
        console.error('操作收藏失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    // 跳转到其他文章
    navigateToArticle(articleId) {
      uni.navigateTo({
        url: `/pages/articles/detail?id=${articleId}`
      })
    },
    
    // 跳转到首页
    navigateToHome() {
      uni.switchTab({
        url: '/pages/index/index'
      })
    },
    
    // 格式化日期
    formatDate(timestamp) {
      const date = new Date(timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
  }
}
</script>

<style>
.container {
  padding-bottom: 100rpx;
}

/* 文章头部样式 */
.article-header {
  padding: 30rpx;
  background-color: #ffffff;
}

.article-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
  margin-bottom: 20rpx;
}

.article-meta {
  display: flex;
  align-items: center;
}

.article-category {
  font-size: 24rpx;
  color: #3cc51f;
  background-color: rgba(60, 197, 31, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
}

.article-date {
  font-size: 24rpx;
  color: #999;
}

/* 文章封面图样式 */
.article-cover {
  width: 100%;
  display: block;
}

/* 文章内容样式 */
.article-content {
  padding: 30rpx;
  background-color: #ffffff;
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
}

/* 文章来源样式 */
.article-source {
  padding: 20rpx 30rpx;
  font-size: 24rpx;
  color: #999;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
}

/* 相关文章样式 */
.related-section {
  margin-top: 20rpx;
  background-color: #ffffff;
  padding: 30rpx;
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

.related-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.related-item:last-child {
  border-bottom: none;
}

.related-image {
  width: 160rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.related-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.related-title {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.related-date {
  font-size: 24rpx;
  color: #999;
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

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  padding: 0;
  margin: 0;
  line-height: normal;
  font-size: 24rpx;
  color: #666;
}

.action-btn::after {
  border: none;
}

.action-btn .iconfont {
  font-size: 40rpx;
  margin-bottom: 6rpx;
}

.icon-heart-filled {
  color: #ff6700;
}
</style>