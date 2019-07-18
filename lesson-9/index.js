const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")

let mainWin;

// 获取当前实例的 单例锁
let getTheLock = app.requestSingleInstanceLock()

// 创建窗口实例
let createWindow = () => {

    mainWin = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            devTools: true
        }
    })

    mainWin.loadFile(path.resolve(__dirname, "index.html"))

    mainWin.webContents.openDevTools()


    mainWin.on("close", () => {
        mainWin = null;
        app.quit()
    })
}



if (!getTheLock) {

    app.quit()
} else {
    app.on("second-instance", (event, commandLine, workDirectory) => {
        if (mainWin) {
            if (mainWin.isMinimized()) {
                mainWin.restore()
            }

            mainWin.focus()
        }
    })

    app.on("ready", createWindow)
}

app.on("activete", () => {
    if (!mainWin) {
        createWindow()
    }
})

ipcMain.on("current-is-online", (event, isOnline)=> {
    //console.log(event)
    console.log("当前联网状态", isOnline)
})
