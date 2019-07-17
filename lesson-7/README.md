## 与键盘相关的

测试环境
```
electron 5.0.4
window 10 x64位
```

>	主要讲怎么禁用键位，达到一些目的，禁用 === 去监听某个键位，有一些现实情况是需要知道的，win键，是不能被禁用，操作系统自己把控着这个键位，要想禁用，通过修改设备终端的注册表是可以实现的

>	键位的监听，最好先去检测该快捷键是否被占用，调用globalShortcut.isRegistered 最好使用try catch ，避免默认的错误弹出框，造成的不友好，如果报错，被占用，在catch中使用自定义的弹出框，去友好提示



**相关的参考链接**
>   下面都是官方文档的链接
- [本地快捷键](https://electronjs.org/docs/tutorial/keyboard-shortcuts)
- [系统快捷键](https://electronjs.org/docs/api/global-shortcut#globalshortcutregisteraccelerator-callback)