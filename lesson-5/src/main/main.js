const {app, BrowserWindow} = require("electron")
const path = require("path")

app.on("ready", createWindow)

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            devTools: true,
            webviewTag: true
        }
    })

    mainWindow.loadURL(path.resolve(__dirname, "../render/index.html"))

    mainWindow.webContents.openDevTools({
        mode: "bottom"
    })

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