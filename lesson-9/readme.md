## 网络状态检测

- 在当前渲染进程中检测
- 使用ipcmain、 ipcRenderer 通讯，将是否联网的结果传递给主进程； 主进程中是没有navagator对象的

### 如何监听

> online/offline会从 document.body冒泡到document上，最后到window; 所以，可以用下面的方式进行事件的绑定；该事件一旦绑定，不可移除
```
// 方式一
document.addEventListener("online", ()=> {....})

// 方式二
document.body.addEventListener("online", ()=> {....})

// 方式三
window.addEventListener("online", ()=> {....})

// 方式四 ：在body标签写行内事件  body online="事件的回调"
<body online="dosomething" offline="dosomething2"></body>

```


### 注意事项
- 1、在断开电脑网络连接的情况下，会触发下面的事件，重新连接也会触发online事件； 如果应用一开始就是联网的，是不会触发 online事件的
- 2、应用只管当前网络状态是不是连接，至于是不是可以连接上互联网，是不管的； 即使，笔记本连接的wifi是一个只开了热点，单没开移动流量的情况下，HTML5的online事件也会认定，属于联网状态
- 3、 现在想把这个封装成一个控件， 在后台监控，在主进程中知道是不是联网，可以通过 ipcRenderer  进程通讯，告诉主进程

*online/ offline事件，兼容性没什么问题，大部分主流浏览器已经实现改机制*