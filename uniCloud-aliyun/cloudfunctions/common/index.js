'use strict';

/**
 * 公共模块
 * 提供项目中常用的工具函数和配置
 */

// 错误码定义
const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 10001,
  DB_ERROR: 10002,
  AUTH_ERROR: 10003,
  BUSINESS_ERROR: 10004,
  SYSTEM_ERROR: 10005
};

// 响应格式化
function formatResponse(code = ERROR_CODES.SUCCESS, message = 'success', data = null) {
  return {
    code,
    message,
    data
  };
}

// 参数校验
function validateParams(params, requiredFields = []) {
  if (!params) {
    return false;
  }
  
  for (const field of requiredFields) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      return false;
    }
  }
  
  return true;
}

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

// 日期格式化
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) {
    return '';
  }
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

module.exports = {
  ERROR_CODES,
  formatResponse,
  validateParams,
  generateOrderNo,
  formatDate
};