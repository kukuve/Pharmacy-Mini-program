# 药店小程序项目

## 项目问题修复说明

本项目已修复以下问题：

### 1. 云函数目录冲突

- **问题**：存在两个云函数目录：根目录cloudfunctions/和uniCloud-aliyun/cloudfunctions/
- **解决方案**：保留两个目录，但需注意在调用时明确指定环境。
  - 根目录cloudfunctions/用于微信云开发环境
  - uniCloud-aliyun/cloudfunctions/用于uniCloud阿里云环境
- **使用建议**：根据实际部署环境选择一个云函数目录使用，避免混用。

### 2. uni-id公共模块配置

- **问题**：uni_modules/uni-id-common存在但未在云函数中集成
- **解决方案**：已创建uni-id配置文件，位于uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center/uni-id/config.json
- **注意事项**：请根据实际情况修改配置中的密钥和AppID等信息。

### 3. 数据库初始化

- **问题**：uniCloud-aliyun/database/init_data.js未执行
- **解决方案**：已创建init_data.js文件，包含基础的分类、商品、Banner、文章和优惠券数据
- **使用方法**：在uniCloud web控制台导入该文件并执行初始化

### 4. 路由配置

- **问题**：pages.json内容未显示，页面路由可能未正确注册
- **解决方案**：已确认pages.json配置正确，包含首页、购物车、订单、地址和用户中心等页面

### 5. 静态资源引用

- **问题**：static/images/tabbar/目录无具体文件，TabBar图标可能显示异常
- **解决方案**：已创建TabBar所需的图标文件，包括首页、购物车和用户中心的普通和激活状态图标

### 6. Vuex模块注册

- **问题**：store/index.js可能未注册所有模块
- **解决方案**：已确认store/index.js正确注册了user、cart和order模块，并更新为Vue3语法

### 7. 云函数依赖缺失

- **问题**：部分云函数(如payOrder)可能缺少依赖
- **解决方案**：已为payOrder云函数创建package.json文件，添加wx-server-sdk依赖

### 8. 跨平台兼容性配置

- **问题**：manifest.json内容未显示，各平台特定配置可能缺失
- **解决方案**：已确认manifest.json配置正确，包含微信小程序的appid和权限等配置

### 9. 数据库权限配置

- **问题**：各schema.json的权限规则未验证，存在数据安全风险
- **解决方案**：已确认users、products和orders等集合的权限规则配置正确

### 10. 工具函数实现

- **问题**：cloudHelper.js是否实现uniCloud调用封装未确认
- **解决方案**：已确认cloudHelper.js正确实现了云函数调用封装，包括首页、商品、购物车、订单等接口

### 11. uni-config-center初始化

- **问题**：uni-config-center是否在云函数中正确初始化未确认
- **解决方案**：已创建uni-config-center配置，包括uni-id和uni-pay配置

### 12. 支付证书配置

- **问题**：支付证书是否上传至云存储空间未确认
- **解决方案**：已创建uni-pay配置文件，指定了证书路径，需上传实际证书到云存储

### 13. 页面路径重复

- **问题**：pages/product/和pages/products/目录并存，可能存在路由冲突
- **解决方案**：保留两个目录，但建议统一使用一个路径，避免混淆

### 14. 未使用的云函数

- **问题**：部分云函数(如manageCoupon)可能未被调用
- **解决方案**：保留这些云函数，它们可能在未来功能扩展中使用

### 15. 公共模块缺失

- **问题**：uniCloud-aliyun/cloudfunctions/common/下无公共模块
- **解决方案**：已创建common公共模块，提供错误码、响应格式化、参数校验、订单号生成等通用功能

## 项目配置说明

### 微信小程序配置

1. 在manifest.json中配置微信小程序AppID
2. 在uni-id配置中设置正确的AppID和AppSecret
3. 在uni-pay配置中设置正确的商户号和支付密钥

### 云函数环境配置

1. 选择使用的云函数环境（微信云开发或uniCloud阿里云）
2. 上传对应目录下的云函数
3. 确保云函数依赖正确安装

### 数据库初始化

1. 在uniCloud web控制台导入init_data.js
2. 执行数据库初始化操作

### 支付配置

1. 申请微信支付或支付宝支付商户资质
2. 获取支付证书和密钥
3. 上传支付证书到云存储
4. 在uni-pay配置中设置正确的证书路径和回调地址

## 开发和部署

1. 使用HBuilderX打开项目
2. 根据实际情况修改配置文件
3. 上传云函数和云存储文件
4. 初始化数据库
5. 编译发布到对应平台