<template>
  <view class="address-form">
    <view class="form-item">
      <text class="label">收货人</text>
      <input 
        class="input" 
        type="text" 
        placeholder="请输入收货人姓名" 
        v-model="formData.name"
      />
    </view>
    
    <view class="form-item">
      <text class="label">手机号码</text>
      <input 
        class="input" 
        type="number" 
        placeholder="请输入手机号码" 
        maxlength="11" 
        v-model="formData.phone"
      />
    </view>
    
    <view class="form-item">
      <text class="label">所在地区</text>
      <view class="region-picker" @click="showRegionPicker">
        <text v-if="formData.province && formData.city && formData.district">
          {{ formData.province }} {{ formData.city }} {{ formData.district }}
        </text>
        <text v-else class="placeholder">请选择所在地区</text>
        <text class="icon iconfont icon-right"></text>
      </view>
    </view>
    
    <view class="form-item">
      <text class="label">详细地址</text>
      <textarea 
        class="textarea" 
        placeholder="请输入详细地址，如街道、门牌号、小区、楼栋号、单元室等" 
        v-model="formData.detail"
      ></textarea>
    </view>
    
    <view class="form-item switch-item">
      <text class="label">设为默认地址</text>
      <switch 
        :checked="formData.is_default" 
        color="#ff4444" 
        @change="onDefaultChange"
      />
    </view>
    
    <view class="form-actions">
      <button class="submit-btn" @click="submitForm">保存</button>
    </view>
    
    <!-- 地区选择器 -->
    <uni-popup ref="regionPopup" type="bottom">
      <view class="region-popup">
        <view class="popup-header">
          <text class="cancel" @click="cancelRegionSelect">取消</text>
          <text class="title">选择地区</text>
          <text class="confirm" @click="confirmRegionSelect">确定</text>
        </view>
        <view class="picker-view-wrapper">
          <picker-view 
            class="picker-view" 
            :value="regionPickerValue" 
            @change="onRegionChange"
          >
            <picker-view-column>
              <view class="picker-item" v-for="(item, index) in provinces" :key="index">
                {{ item.name }}
              </view>
            </picker-view-column>
            <picker-view-column>
              <view class="picker-item" v-for="(item, index) in cities" :key="index">
                {{ item.name }}
              </view>
            </picker-view-column>
            <picker-view-column>
              <view class="picker-item" v-for="(item, index) in districts" :key="index">
                {{ item.name }}
              </view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
// 导入地区数据
import regionData from '@/utils/region-data.js'

export default {
  name: 'AddressForm',
  props: {
    // 地址数据，用于编辑模式
    addressData: {
      type: Object,
      default: () => ({})
    },
    // 是否为编辑模式
    isEdit: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      formData: {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        is_default: false
      },
      // 地区选择器数据
      provinces: regionData,
      cities: [],
      districts: [],
      regionPickerValue: [0, 0, 0],
      tempRegionValue: [0, 0, 0]
    }
  },
  created() {
    // 初始化城市和区县数据
    this.cities = this.provinces[0].children || []
    this.districts = this.cities[0]?.children || []
    
    // 如果是编辑模式，填充表单数据
    if (this.isEdit && this.addressData) {
      this.initFormData()
    }
  },
  methods: {
    // 初始化表单数据
    initFormData() {
      const { name, phone, province, city, district, detail, is_default } = this.addressData
      
      this.formData = {
        name: name || '',
        phone: phone || '',
        province: province || '',
        city: city || '',
        district: district || '',
        detail: detail || '',
        is_default: is_default || false
      }
      
      // 如果有省市区数据，初始化选择器的值
      if (province && city && district) {
        this.initRegionPickerValue()
      }
    },
    
    // 初始化地区选择器的值
    initRegionPickerValue() {
      const { province, city, district } = this.formData
      
      // 查找省份索引
      const provinceIndex = this.provinces.findIndex(item => item.name === province)
      if (provinceIndex >= 0) {
        this.regionPickerValue[0] = provinceIndex
        this.cities = this.provinces[provinceIndex].children || []
        
        // 查找城市索引
        const cityIndex = this.cities.findIndex(item => item.name === city)
        if (cityIndex >= 0) {
          this.regionPickerValue[1] = cityIndex
          this.districts = this.cities[cityIndex].children || []
          
          // 查找区县索引
          const districtIndex = this.districts.findIndex(item => item.name === district)
          if (districtIndex >= 0) {
            this.regionPickerValue[2] = districtIndex
          }
        }
      }
      
      // 保存临时值
      this.tempRegionValue = [...this.regionPickerValue]
    },
    
    // 显示地区选择器
    showRegionPicker() {
      this.$refs.regionPopup.open()
    },
    
    // 取消地区选择
    cancelRegionSelect() {
      // 恢复之前的选择
      this.regionPickerValue = [...this.tempRegionValue]
      this.$refs.regionPopup.close()
    },
    
    // 确认地区选择
    confirmRegionSelect() {
      // 保存临时值
      this.tempRegionValue = [...this.regionPickerValue]
      
      // 更新表单数据
      const provinceIndex = this.regionPickerValue[0]
      const cityIndex = this.regionPickerValue[1]
      const districtIndex = this.regionPickerValue[2]
      
      this.formData.province = this.provinces[provinceIndex].name
      this.formData.city = this.cities[cityIndex].name
      this.formData.district = this.districts[districtIndex].name
      
      this.$refs.regionPopup.close()
    },
    
    // 地区选择器变化事件
    onRegionChange(e) {
      const values = e.detail.value
      
      // 如果省份变了，需要更新城市和区县
      if (values[0] !== this.regionPickerValue[0]) {
        values[1] = 0
        values[2] = 0
        this.cities = this.provinces[values[0]].children || []
        this.districts = this.cities[0]?.children || []
      } 
      // 如果城市变了，需要更新区县
      else if (values[1] !== this.regionPickerValue[1]) {
        values[2] = 0
        this.districts = this.cities[values[1]]?.children || []
      }
      
      this.regionPickerValue = values
    },
    
    // 默认地址切换事件
    onDefaultChange(e) {
      this.formData.is_default = e.detail.value
    },
    
    // 验证表单
    validateForm() {
      const { name, phone, province, city, district, detail } = this.formData
      
      if (!name.trim()) {
        uni.showToast({
          title: '请输入收货人姓名',
          icon: 'none'
        })
        return false
      }
      
      if (!phone.trim()) {
        uni.showToast({
          title: '请输入手机号码',
          icon: 'none'
        })
        return false
      }
      
      // 简单的手机号验证
      if (!/^1\d{10}$/.test(phone)) {
        uni.showToast({
          title: '手机号格式不正确',
          icon: 'none'
        })
        return false
      }
      
      if (!province || !city || !district) {
        uni.showToast({
          title: '请选择所在地区',
          icon: 'none'
        })
        return false
      }
      
      if (!detail.trim()) {
        uni.showToast({
          title: '请输入详细地址',
          icon: 'none'
        })
        return false
      }
      
      return true
    },
    
    // 提交表单
    submitForm() {
      if (!this.validateForm()) return
      
      // 触发提交事件，将表单数据传递给父组件
      this.$emit('submit', { ...this.formData })
    },
    
    // 重置表单
    resetForm() {
      this.formData = {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        is_default: false
      }
      
      this.regionPickerValue = [0, 0, 0]
      this.tempRegionValue = [0, 0, 0]
      
      // 重置地区数据
      this.cities = this.provinces[0].children || []
      this.districts = this.cities[0]?.children || []
    }
  }
}
</script>

<style lang="scss" scoped>
.address-form {
  background-color: #fff;
  padding: 20rpx;
  
  .form-item {
    padding: 30rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    
    .label {
      display: block;
      font-size: 28rpx;
      color: #333;
      margin-bottom: 20rpx;
    }
    
    .input {
      width: 100%;
      height: 80rpx;
      font-size: 28rpx;
      color: #333;
    }
    
    .textarea {
      width: 100%;
      height: 160rpx;
      font-size: 28rpx;
      color: #333;
    }
    
    .region-picker {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 80rpx;
      font-size: 28rpx;
      color: #333;
      
      .placeholder {
        color: #999;
      }
      
      .icon {
        font-size: 32rpx;
        color: #999;
      }
    }
    
    &.switch-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .label {
        margin-bottom: 0;
      }
    }
  }
  
  .form-actions {
    padding: 60rpx 0;
    
    .submit-btn {
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

.region-popup {
  background-color: #fff;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 90rpx;
    padding: 0 30rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    .title {
      font-size: 32rpx;
      color: #333;
      font-weight: bold;
    }
    
    .cancel, .confirm {
      font-size: 28rpx;
      color: #666;
    }
    
    .confirm {
      color: #ff4444;
    }
  }
  
  .picker-view-wrapper {
    height: 500rpx;
    
    .picker-view {
      width: 100%;
      height: 100%;
      
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