const {app, BrowserWindow, ipcMain}  = require("electron")
const path = require("path")

let mainWindow;

app.on("ready", createWindow)

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        resizable: false,
        frame: false,
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

    mainWindow.loadURL(path.resolve(__dirname, "../renderer/index.html"))

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

ipcMain.on('change-frame', (event,arg)=> {
  console.log("-----主进程开始-----------")
  if(arg === true) {
    mainWindow.maximize()
  } else {
    mainWindow.minimize()
  }

  console.log("------主进程结束----")
})