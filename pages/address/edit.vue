<template>
  <view class="address-edit-container">
    <address-form
      :addressData="addressForm"
      :isEdit="isEdit"
      @submit="handleSubmit"
      ref="addressForm"
    />
    
    <!-- 加载状态 -->
    <uni-load-more v-if="loading" status="loading"></uni-load-more>
  </view>
</template>

<script>
import AddressForm from '@/components/address-components/AddressForm.vue'

export default {
  components: {
    AddressForm
  },
  
  data() {
    return {
      addressId: '', // 地址ID，编辑时使用
      addressForm: {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        postal_code: '',
        is_default: false
      },
      loading: false,
      isEdit: false // 是否是编辑模式
    }
  },
  
  onLoad(options) {
    if (options.id) {
      this.addressId = options.id
      this.isEdit = true
      this.loadAddressDetail()
    }
    
    // 设置页面标题
    uni.setNavigationBarTitle({
      title: this.isEdit ? '编辑收货地址' : '新增收货地址'
    })
  },
  
  methods: {
    // 加载地址详情
    async loadAddressDetail() {
      if (!this.addressId) return
      
      this.loading = true
      
      try {
        const { result } = await this.$cloud.callFunction({
          name: 'address',
          data: {
            action: 'getDetail',
            data: {
              id: this.addressId
            }
          }
        })
        
        if (result.code === 0) {
          this.addressForm = {
            name: result.data.name,
            phone: result.data.phone,
            province: result.data.province,
            city: result.data.city,
            district: result.data.district,
            detail: result.data.detail,
            postal_code: result.data.postal_code || '',
            is_default: result.data.is_default || false
          }
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('获取地址详情失败', e)
        uni.showToast({
          title: '获取地址详情失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    // 处理表单提交
    async handleSubmit(formData) {
      this.loading = true
      
      try {
        const action = this.isEdit ? 'update' : 'add'
        const data = {
          ...formData,
          postal_code: this.addressForm.postal_code // 保留邮政编码字段
        }
        
        // 编辑模式需要传入地址ID
        if (this.isEdit) {
          data.id = this.addressId
        }
        
        const { result } = await this.$cloud.callFunction({
          name: 'address',
          data: {
            action,
            data
          }
        })
        
        if (result.code === 0) {
          uni.showToast({
            title: this.isEdit ? '更新成功' : '添加成功',
            icon: 'success'
          })
          
          // 返回上一页
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          throw new Error(result.message)
        }
      } catch (e) {
        console.error('保存地址失败', e)
        uni.showToast({
          title: e.message || '保存地址失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss">
.address-edit-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 140rpx;
}
</style>