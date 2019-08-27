const {app, BrowserWindow, ipcMain} = require("electron")
const path = require("path")
let mainWindow;
let getTheLock = app.requestSingleInstanceLock()

if(!getTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory)=> {
    if(mainWindow) {
      if(mainWindow.isMinimized()) {
        mainWindow.restore()
      }

      mainWindow.focus()
    }
  })

  app.on("ready", createWindow)

  app.on('close', ()=> {
    mainWindow = null;
    app.quit()
  })
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      devTools: true
    }
  })

  mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"))
  mainWindow.webContents.openDevTools();
 
  mainWindow.show();
}