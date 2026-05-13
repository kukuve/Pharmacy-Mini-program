async submitInit() {
  const { adminAccount, adminPassword } = this.formData
  const { result } = await uniCloud.callFunction({
    name: 'initAdmin',
    data: {
      adminInfo: {
        username: adminAccount,
        password: adminPassword
      },
      initData: this.initConfig
    }
  })
}