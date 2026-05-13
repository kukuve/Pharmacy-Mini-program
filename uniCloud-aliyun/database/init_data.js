// 数据库初始化数据

module.exports = {
  // 分类数据
  categories: [
    {
      name: '感冒用药',
      icon: '/static/images/categories/cold.png',
      order: 1,
      status: 1
    },
    {
      name: '消化系统',
      icon: '/static/images/categories/digest.png',
      order: 2,
      status: 1
    },
    {
      name: '心脑血管',
      icon: '/static/images/categories/heart.png',
      order: 3,
      status: 1
    },
    {
      name: '儿科用药',
      icon: '/static/images/categories/child.png',
      order: 4,
      status: 1
    },
    {
      name: '营养保健',
      icon: '/static/images/categories/vitamin.png',
      order: 5,
      status: 1
    },
    {
      name: '医疗器械',
      icon: '/static/images/categories/device.png',
      order: 6,
      status: 1
    }
  ],
  
  // 商品数据
  products: [
    {
      name: '感冒灵颗粒',
      description: '用于感冒引起的头痛、发热、鼻塞、流涕、咽痛等症状',
      price: 15.8,
      originalPrice: 22.5,
      category: '感冒用药',
      stock: 100,
      sales: 256,
      spec: '10袋/盒',
      manufacturer: '哈药集团制药总厂',
      approvalNumber: '国药准字H23022992',
      images: [
        '/static/images/products/ganmaoling-1.png',
        '/static/images/products/ganmaoling-2.png'
      ],
      mainImage: '/static/images/products/ganmaoling-1.png',
      isRx: false,
      isOtc: true,
      status: 1
    },
    {
      name: '布洛芬缓释胶囊',
      description: '用于缓解轻至中度疼痛如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经。也用于普通感冒或流行性感冒引起的发热',
      price: 38.5,
      originalPrice: 45.0,
      category: '感冒用药',
      stock: 80,
      sales: 132,
      spec: '20粒/盒',
      manufacturer: '中美天津史克制药有限公司',
      approvalNumber: '国药准字H10900089',
      images: [
        '/static/images/products/buluofen-1.png',
        '/static/images/products/buluofen-2.png'
      ],
      mainImage: '/static/images/products/buluofen-1.png',
      isRx: false,
      isOtc: true,
      status: 1
    },
    {
      name: '维生素C片',
      description: '用于预防和治疗维生素C缺乏症，如坏血病等',
      price: 12.5,
      originalPrice: 15.0,
      category: '营养保健',
      stock: 200,
      sales: 310,
      spec: '100片/瓶',
      manufacturer: '华北制药股份有限公司',
      approvalNumber: '国药准字H13021748',
      images: [
        '/static/images/products/vitaminc-1.png',
        '/static/images/products/vitaminc-2.png'
      ],
      mainImage: '/static/images/products/vitaminc-1.png',
      isRx: false,
      isOtc: true,
      status: 1
    }
  ],
  
  // Banner数据
  banners: [
    {
      title: '感冒药品专区',
      image: '/static/images/banners/cold.png',
      url: '/pages/products/list?category=感冒用药',
      order: 1,
      status: 1
    },
    {
      title: '营养保健专区',
      image: '/static/images/banners/vitamin.png',
      url: '/pages/products/list?category=营养保健',
      order: 2,
      status: 1
    },
    {
      title: '春季过敏专区',
      image: '/static/images/banners/allergy.png',
      url: '/pages/products/list?keyword=过敏',
      order: 3,
      status: 1
    }
  ],
  
  // 文章数据
  articles: [
    {
      title: '如何正确选择感冒药',
      content: '感冒是一种常见病，但感冒药的种类繁多，如何选择适合自己的感冒药呢？本文将为您详细介绍...',
      cover: '/static/images/articles/cold-medicine.png',
      author: '药师王医生',
      category: '用药指导',
      status: 1
    },
    {
      title: '高血压患者的日常用药注意事项',
      content: '高血压是一种常见的慢性疾病，需要长期服药控制。本文将介绍高血压患者在日常用药中应该注意的事项...',
      cover: '/static/images/articles/hypertension.png',
      author: '药师李医生',
      category: '慢病管理',
      status: 1
    },
    {
      title: '儿童用药的八个注意事项',
      content: '儿童用药与成人不同，需要特别注意。本文将为家长们介绍儿童用药的八个重要注意事项...',
      cover: '/static/images/articles/children-medicine.png',
      author: '药师张医生',
      category: '儿科用药',
      status: 1
    }
  ],
  
  // 优惠券数据
  coupons: [
    {
      name: '满100减10元',
      type: 'discount',
      value: 10,
      minAmount: 100,
      startTime: new Date('2023-01-01'),
      endTime: new Date('2023-12-31'),
      status: 1
    },
    {
      name: '满200减30元',
      type: 'discount',
      value: 30,
      minAmount: 200,
      startTime: new Date('2023-01-01'),
      endTime: new Date('2023-12-31'),
      status: 1
    },
    {
      name: '新人专享5元无门槛券',
      type: 'discount',
      value: 5,
      minAmount: 0,
      startTime: new Date('2023-01-01'),
      endTime: new Date('2023-12-31'),
      status: 1,
      isNewUser: true
    }
  ]
};