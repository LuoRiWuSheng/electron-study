const {app, BrowserWindow} = require("electron")
const path = require("path")

// 暴露出一个全局的window对象 如果不暴露出来，window对象会被GC回收，导致窗体会被自动关闭
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            devTools: true,
            nodeIntegration: true
        },
        titleBarStyle: "hidden", // 窗口标题栏的样式
        title: "测试"
    })
    
    // 第一种方式加载页面
    //mainWindow.loadFile("index.html")

    // 第二种方式加载
    //console.log(path.resolve(__dirname, "index.html"))
    // 地址拼接  path.join("file:", __dirname, "index.html")
    mainWindow.loadURL(path.resolve(__dirname, "src/index.1.html"))

    mainWindow.on("close", ()=> {
        console.log("关闭")
        mainWindow = null
    })

    mainWindow.webContents.openDevTools() // 打开chrome控制台
}

app.on("ready", createWindow)

app.on("window-all-closed", ()=> {
    if(process.platform !== "darwin") {
        app.quit()
    }
})

// 下面是解决macos环境下
app.on("activate", ()=> {
    if(mainWindow === null) {
        createWindow()
    }
})
