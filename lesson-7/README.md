## 与键盘相关的

测试环境
```
electron 5.0.4
window 10 x64位
```

>	主要讲怎么禁用键位，达到一些目的，禁用 === 去监听某个键位，有一些现实情况是需要知道的，win键，是不能被禁用，操作系统自己把控着这个键位，要想禁用，通过修改设备终端的注册表是可以实现的

>	键位的监听，最好先去检测该快捷键是否被占用，调用globalShortcut.isRegistered 最好使用try catch ，避免默认的错误弹出框，造成的不友好，如果报错，被占用，在catch中使用自定义的弹出框，去友好提示

## 使用 electron-localshortcut 代替原生API提供的快捷键注册

>   使用electron原生提供的接口也是可以的


注意事项：

版本问题
- 下面的版本，使用API检测键位是不是被占用，是没啥问题的，但是electron-localshortcut如果是 3.x的版本，isRegistered方法永远返回  undefined

```
 "electron": "^5.0.2",
"electron-localshortcut": "^2.0.2"
```
经过测试，升级 electron的版本是没问题的，将electron从 5.x升级到 6.x 还是正常工作，但是 不能升级electron-localshortcut 到最新的，升级到最新的，直接就凉凉，检测键位是不是被注册，永远返回的是 undefined

unregisterAll 清除所有在本地注册的快捷键，永远返回的是 undefined,这个没啥问题，不用纠结

- window原生的按键，就是全局快捷键，比如 window键 不能被禁用，调用禁用的接口，会报错，可以用 try...catch捕获，看到异常的信息

## 使用

```
npm install --save electron-localshortcut
```

**相关的参考链接**
>   下面都是官方文档的链接
- [本地快捷键](https://electronjs.org/docs/tutorial/keyboard-shortcuts)
- [系统快捷键](https://electronjs.org/docs/api/global-shortcut#globalshortcutregisteraccelerator-callback)