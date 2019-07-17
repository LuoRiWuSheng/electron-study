const {app, BrowserWindow, ipcMain}  = require("electron")
const path = require("path")

let mainWindow;
let seContendWindow;

app.on("ready", createWindow)
let printList = []

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            devTools: true,
            webviewTag: true,
            plugins: true,
            nodeIntegrationInSubFrames: true
        }
    })
    mainWindow.webContents.openDevTools({
        mode: "bottom"
    })

    mainWindow.loadURL(path.resolve(__dirname, "../render/index.html"))
    
    // 获取打印机列表
    printList = mainWindow.webContents.getPrinters()


    mainWindow.on("close", ()=> {
        mainWindow = null;
        app.quit()
    })
}

app.on("activete", ()=> {
    if(mainWindow === null) {
        createWindow()
    }
})


ipcMain.on("getPrintList", (event, arg)=> {
    console.log("渲染进程获取打印列表")
    event.reply("getPrintList", printList)
})