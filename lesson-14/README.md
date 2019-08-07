## electron日志收集

*create time 2019-08-05  update time 2019-08-06*

## 基本用法

> 这个崩溃的事件，都是在 BrowserWindow的实例对象的webContents 上，所以，就需要看 webContents

**怎么让程序崩溃？然后测试**

>   在主进程中的new BrowserWindow的配置中，打开node，让渲染进程可以访问node的内置API， process对象

调用 process.crash() 就可以让程序崩溃， 无论是渲染进程和主进程中，都可以调用这个方法，前提是 开启node
```js
 mainWindow = new BrowserWindow({
    webPreferences: {
        nodeIntegration: true
    }
})
```


## 崩溃日志报告
[官网API-crash-reporter](https://electronjs.org/docs/api/crash-reporter)

下面的代码在app.on("ready", xxxx) 之前
```js
const { crashReporter } = require('electron')

crashReporter.start({
  productName: 'YourName',
  companyName: 'YourCompany',
  submitURL: 'https://your-domain.com/url-to-submit',
  uploadToServer: true
})

// 主动让程序崩溃掉
process.crash()

```
crashReporter.getParameters() 会返回以下信息

```js
 {
  _companyName: '公司名称',
  _productName: 'test-crash',
  _version: '1.0.0', //当前应用版本，从package.json中读取并上传到服务器的
  
  //下面2个是 extra 字段的配置的
  error: '-2',
  message: '调用process.crash导致崩溃',

  platform: 'win32',
  process_type: 'browser', //提示： 主进程还是渲染进程导致的崩溃
  prod: 'Electron',
  ver: '6.0.0'
}

```

我使用node的express框架，写了一个简单的接口，获取这个崩溃日志

后台接口，其他语言差不多的写法，就是一个接口

```js
router.post("/collectLogs", (req, res)=> {
    console.log("请求地址--》",req.url)
    // 请求地址--》 /collectLogs?product=Electron&version=6.0.0&guid=26d414e1-e81d-4373-8cc3-c741e5
8df646
    // 解析出来 get的参数
    console.log(req.query)
    /*
    { 
        product: 'Electron',
        version: '6.0.0',
        guid: '26d414e1-e81d-4373-8cc3-c741e58df646' 
    }
    */
    console.log("日志崩溃信息记录")
    
    console.log(req.body) // {} 空对象，这里确实不太明白什么原因
})

```


### 在主进程中使用
[官网API-webContents-event-crashed](https://electronjs.org/docs/api/web-contents#event-crashed)

main.js -- 主进程
```js
const {app, BrowserWindow, dialog, crashReporter} = require("electron")
let mainWindow;
// 修改日志的临时存储位置
app.setPath("temp", path.resolve(__dirname, "temp"))

// 事件监听
crashReporter.start({
    productName: app.getName(),
    companyName: "公司名称",
    submitURL: "http://127.0.0.1:3000/collectLogs",
    uploadToServer: true,
    extra: {
        error: "-2",
        message: "调用process.crash导致崩溃"
    }
})

process.crash()
```

### 在渲染进程中使用
>   渲染进程中使用 ，是要使用 remote的方式，获取到 BrowserWindow对象，然后创建窗口，然后监听crashed事件，和主进程中的写法是一模一样的

a.html 文件 ---  渲染进程
```js
const {BrowserWindow,dialog} = require("electron").remote;
const path = require("path")

let newWindow;
// 当前是一个 窗口，然后通过一些方式（比如点击某个按钮，window.onload的时候），再创建一个窗口

window.onload = ()=> {

    // 创建一个窗体
    newWindow = new BrowserWindow({
        width: 600,
        height: 600
    })

    // 就加载当前a.html的同级目录下的 crash.html网页
    newWindow.loadURL(path.resolve(__dirname, "crash.html"))
    newWindow.show();

    // 新窗体的事件
    newWindow.on('close', () => {
        newWindow = null
    })

    // 崩溃事件监听
    newWindow.webContents.on('crashed', (event, killed) => {

        // 崩溃以后，可以在这里调用接口，发送日志等操作
        const options = {
            type: 'info',
            title: '渲染器进程崩溃',
            message: '这个进程已经崩溃.',
            buttons: ['重载', '关闭']
        }

        // 调用elecron提供的弹窗提示
        dialog.showMessageBox(options, (index) => {
            // index是Nunmber 类型，index从0开始
            // index表示弹窗的按钮索引
            if (index === 0) newWindow.reload()
            else newWindow.close()
        })
    })
}
```
有人可能会问，那我要监听a.html这个窗口的崩溃呢？ 理解窗口的创建过程，你就明白，事件是从哪个对象身上发出的，发出的条件是什么

1. 事件从 webContents这个对象上发出，而这个对象又是BrowserWindow的一个属性，所以，你需要使用BrowserWindow。 哪里使用BrowserWindow，就在哪里去写监听事件
2. 主进程中创建的窗口，就在主进程中监控这个窗口有没有崩溃，渲染进程中创建的窗口，就在渲染进程中监听。
3. crash事件的回调函数，有2个参数， event, killed 可以看到，但是不能展开对象了，窗口已经崩溃了，这些都没用了

### 窗口未响应- 'unresponsive'

注意事项
1. 这个事件，看官方文档，感觉好像是 webContents去监听， 实际代码测试就呵呵了，等了很久都不触发这个事件

```js
    newWindow = new BrowserWindow({....})

    // 这种是错误的，根本不会响应
    newWindow.webContents.on("unresponsive", ()=> {...})

    // 正确是--这样才会响应，触发事件
    newWindow.on("unresponsive", ()=> {...})
```
2. 如果你在 unresponsive 事件中使用 newWindow.reload()  重新加载窗口，没什么用，还是挂掉了，这里用 reload 是真的没有reload，这里和项目的崩溃crashed事件不一样，crashed崩溃了，reload是真的重新加载了，所以，这里还是直接  newWindow.close() 关掉吧； 崩溃了，未响应了，可以发http请求记录日志了


### 注意事项

1、electron版本差异，将导致 process.crash() 调用后，渲染进程崩溃，但是不触发crashed事件

>   在使用node 8.16.0， electron 6.0.0的时候，在渲染进程中主动调用崩溃，crashed 事件并不会触发，但是通过devtools控制台，确实能感知到窗体崩溃了，因为 Elements面板，是已经看不到DOM结构了

>   在使用 node 8.16.0, electron 4.0.1 是可以的，正常使用，可触发对应的 crash事件

>   猜测，这多半是node底层的API发生了变化，毕竟electron只是一个壳子，最主要的还是node，所以我升级node版本，从 8.16.0 --> 10.16.1 版本， electron直接使用 electron 6.0.0, 虽然electron官方的标准配置是 electron 6.0.0 搭配 node 12.4.0， 还是失败了

以下搭配，在渲染进程中均不能触发  crashed 事件， 无法捕获窗口崩溃

- node 8.16.0 & electron 6.0.0
- node 10.16.1 & electron  6.0.0
- node 10.16.1 & electron 5.0.8
- node 10.16.1 & electron 5.0.0

以下搭配， 可在渲染进程中触发 crashed事件

- node 8.16.0 & electron 4.0.1
- node 10.16.1 & electron 4.2.8 (electron 在 4.X的最后一个版本)




### 参考文档
- [Electron-日志与崩溃收集](https://juejin.im/post/5c5ee47be51d457f95354c82) from **掘金**
- [崩溃日志报告](https://electronjs.org/docs/api/crash-reporter) from **官方API**
- [打包之后，electron 主进程调试利器：electron-log 使用方法](https://newsn.net/say/electron-log.html) from **苏南大叔**
- [electron程序保护措施（崩溃监控，开机自启，托盘关闭）](https://blog.csdn.net/qq_34149805/article/details/83820051) from **CSDN**