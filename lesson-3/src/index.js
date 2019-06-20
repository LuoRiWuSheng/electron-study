const {app, BrowserWindow, ipcMain} = require("electron")
const path = require("path")

let mainWin;

app.on("ready", createWindow)

function createWindow() {

    mainWin = new BrowserWindow({
        width: 800,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            devTools: true,
            //nativeWindowOpen: true
        }
    })

    mainWin.loadURL(path.resolve(__dirname, "index.html"))

    mainWin.on("close", ()=> {
        mainWin = null;
        app.quit()
    })

    mainWin.webContents.openDevTools();

    console.log(`webContents唯一标识ID`,  mainWin.webContents.id)
    console.log(`当前窗口的类型-->`, mainWin.webContents.getType()) // window
}

app.on("activete", ()=> {
    if(mainWin === null) {
        createWindow()
    }
})

// 获取应用安装路径
console.log(`应用安装路径--》${app.getAppPath()}`)
console.log("应用是否打包-->", app.isPackaged)
/**
 * 下面是主进程发送消息给渲染进程，或者接受渲染进程发送过来的消息
 * 
 * */ 
// 发送异步消息
 ipcMain.on("asynchronous-message", (event, arg)=> {
    console.log("主进程接受的信息-->",arg)
  
    // 将异步消息发送给 发送方，表示一个应答
    //console.log(event)

    /**
     * event.sender 返回的是一个 webContents, 
     *      可以调用 event.sender.send("事件名", "回复消息,是回复消息") 回复的是异步消息
     * event.apply("事件名", "回复消息")
     * event.returnValue = "给渲染进程回复同步消息", 可以是对象，数组，字符串，布尔类型
     *  event.frameId  返回一个整数，表示渲染进程的发送信息ID
     *  */ 

    event.reply("asynchronous-reply", "主进程收到信息")
 })

 // 发送同步消息
 ipcMain.on("synchronous-message", (event, arg)=> {
     console.log("----------")
     //console.log(event)
    console.log("主进程接收同步消息-->",arg) // prints "ping"
    // 同步消息的时候，就设置 下面这样，将 返回的信息发送给 发送方
    let obj = {
        name: "张三",
        age: 12
    }

    event.returnValue = obj
 })

 // 接受渲染进程发过来的异步信息--信息可以是一个对象
 ipcMain.on("asynchronous-2", (event, msg)=> {
     console.log(msg)
 })

 // 接受渲染进程的信息，来创建新窗口
 ipcMain.on("please-create-new-window", (event,opt, initURL)=> {
    console.log(opt)
    let w = new BrowserWindow(opt)
    w.loadURL(initURL)

    // 初始化以后，告诉渲染进程，创建完成
    event.reply("crated-result", "创建成功")
 })