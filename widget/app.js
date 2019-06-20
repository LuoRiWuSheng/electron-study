const {app, BrowserWindow} = require("electron")
const path = require('path')

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            devTools: true,
            nodeIntegration: true
        },
        titleBarStyle: "hidden",
        title: "调用dll",
        frame: false, // 隐藏标题栏
       resizable: false // 不可缩放
    })

    mainWindow.loadURL(path.resolve(__dirname,"src/index.html"))

    mainWindow.on("close", ()=> {
        mainWindow = null
    })

    mainWindow.webContents.openDevTools()
}

app.on("ready", createWindow)

app.on("activate", ()=>{
    if(mainWindow === null) {
        createWindow()
    }
})