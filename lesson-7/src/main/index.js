const { app, BrowserWindow, globalShortcut, dialog, Menu, MenuItem, ipcMain } = require("electron")
const path = require("path")
const getTheLock = app.requestSingleInstanceLock()

let mainWindow = null;
// getTheLock 返回boolean值，返回false，表示程序之前还在运行，又准备创建一个
if (!getTheLock) {
    app.quit()
} else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }

            mainWindow.focus();
        }
    })

    app.on("ready", createWindow)
}

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            devTools: true,
            nodeIntegration: true,
            webviewTag: true
        }
    })

    mainWindow.webContents.openDevTools({
        mode: "bottom"
    })

    mainWindow.webContents.loadURL(path.resolve(__dirname, "../render/index.html"))

    mainWindow.on("close", () => {
        mainWindow = null;
        app.quit()
    })


    registerShortCat()

    registerMune()
}

app.on("activete", () => { // mac才会执行这里,window没有
    console.log("active")
    if (!mainWindow) {
        createWindow()
    }
})

app.on('browser-window-blur', () => {
    //console.log("blur")
})

app.on('browser-window-focus', () => {
    //console.log("focus")
})

// 注册全快捷键
function registerShortCat () {
    // 检测某个键位是否冲突
    /*
   try {
    console.log(globalShortcut.isRegistered("Super"))
   } catch(e) {
    console.log(e)
   }
    globalShortcut.register('J', () => {
        console.log('按键')
        return false
    })

    globalShortcut.register('Shift+A', () => {
        console.log('check-all')
    })

    globalShortcut.register("Super", ()=>{
        console.log("win键盘")
    })
    */


}

// 注册快捷键
function registerMune () {
    var template = [{
        label: '编辑',
        submenu: [{
            label: '撤销',
            accelerator: 'CmdOrCtrl+Z',
            role: 'undo'
        }, {
            label: '重做',
            accelerator: 'Shift+CmdOrCtrl+Z',
            role: 'redo'
        }, {
            type: 'separator'
        }, {
            label: '复制',
            accelerator: 'CmdOrCtrl+C',
            role: 'copy'
        }, {
            label: '粘贴',
            accelerator: 'CmdOrCtrl+V',
            role: 'paste'
        }]
    }, {
        label: '帮助',
        role: 'help',
        submenu: [{
            label: '学习更多',
            click: function () {
                electron.shell.openExternal('http://electron.atom.io')
            }
        }]
    }];
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

ipcMain.on('sigShowRightClickMenu', (event) => {
    //! 生成菜单
    const menu = new Menu();
    menu.append(new MenuItem({ label: 'Hello world' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
        label: 'Electron', click: () => {
            Electron.shell.openExternal('https://www.baidu.com');
        }
    })
    );
    const win = BrowserWindow.fromWebContents(event.sender);
    menu.popup(win);
});
