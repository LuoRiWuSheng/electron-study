const {app, BrowserWindow, dialog, crashReporter, ipcMain} = require("electron")
const path = require("path")
const getTheLock = app.requestSingleInstanceLock();
let mainWindow;

// 修改日志的临时存储位置
app.setPath("temp", path.resolve(__dirname, "temp"))

crashReporter.start({
    productName: app.getName(),
    companyName: "公司名称",
    submitURL: "http://127.0.0.1:3000/collectLogs",
    uploadToServer: true, // 是否将崩溃日志传给服务器
    extra: {
        error: "-2",
        message: "调用process.crash导致崩溃"
    }
})
console.log(crashReporter.getParameters())
/**
 {
  _companyName: '公司名称',
  _productName: 'test-crash',
  _version: '1.0.0', 当前应用版本，从package.json中读取并上传到服务器的
  
  下面2个是 extra 字段的配置的
  error: '-2',
  message: '调用process.crash导致崩溃',

  platform: 'win32',
  process_type: 'browser', 提示： 主进程还是渲染进程导致的崩溃
  prod: 'Electron',
  ver: '6.0.0'
}

 * 
 * 
 * 
 */

// 获取所有已经上传的崩溃报告
console.log(crashReporter.getUploadedReports())

// 测试，让主进程崩溃
//process.crash()

if(!getTheLock) {
    console.log("单例锁")
    app.quit()
} else {
    app.on("second-instance", (event, commandLine, workingDirectory)=> {
        if(mainWindow) {
            if(mainWindow.isMinimized()) {
                mainWindow.restore()
            }

            mainWindow.focus()
        }
    })
}

let createWindow = ()=> {
    console.log("createWindow")
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            devTools: true,
            // webSecurity: true,
            // allowRunningInsecureContent : true
        }
    })

    mainWindow.webContents.openDevTools({
        mode: "bottom"
    })

    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))

    mainWindow.on("closed", ()=> {
        mainWindow = null;
    })

    listenRenderEvents()
}

app.on("ready", createWindow)

// 最后一个窗口被关闭时，退出应用
app.on("window-all-closed", ()=> {
    console.log("最后一个窗口被关闭")
    // 如果不是macOS系统
    if(process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", ()=> {
    if(mainWindow === null) {
        console.log("重新启动窗口")
        createWindow()
    }
})

function listenRenderEvents() {
    ipcMain.on("bong", (event, arg)=> {
        console.log(arg)

        process.crash()
    })
}