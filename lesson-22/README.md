### electron使用vue全家桶开发，怎么在开发阶段控制路由，避免重新启动

**基础环境**

```js
vue-cli 3
"electron": "^4.0.0",
```
vue-cli 3配合electron[模版地址](https://nklayman.github.io/vue-cli-plugin-electron-builder/)


**场景**
> 我们知道，electron开发的界面是没有地址搜索栏的，在使用vue或者其他的单纯的多页应用，是不能按住 alt+方向左或者方向右 调用历史记录的，我们也不能在即将开发的界面上都写一个后退按钮,每个即将开发的界面都写一段后台代码，非常麻烦，况且，electron开发时，是不能通过方向键控制前进后退

**解决办法**

1. 打开vue的主入口文件，new Vue(....)， 将vue的实例对象挂载到window对象上

main.js
```js
window.util = new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
```

然后在控制台通过 util.$router.push() 控制路由的任意跳转，而不仅仅是前进后退

其实是通过暴露出vue的实例，从而拥有众多的方法

2. 自己写一个地址栏，那么这个地址栏一定是在当前的单页应用的主入口，且不是路由，是一个永远都存在的组件，置于位置，随便定位即可，然后通过控制地址栏的跳转，进一步控制路由

App.vue
```js
<template>
  <div id="app">
    ...省略其他代码
    <router-view ></router-view>
  
    <Url></Url>
  </div>
</template>

<script>

import Url from './components/Url'

export default {
  name: 'app',
  components: {
    ...省略其他代码

    Url
  }
}
</script>
```

这个Url组件,我放在 components目录下面，为了篇幅的简洁，就不再陈述代码，整个组件可以直接使用，代码放在当前目录下面

优点： 灵活度高，基本和地址栏跳转路由一样的效果

在打包的时候，可以移除掉这个组件，这个只在开发环境调试使用

3. 直接在控制台使用 history.go(-1) ， 这样的原生js操控

优点： 简单
缺点： 只能前进后退，不能跨路由操作



