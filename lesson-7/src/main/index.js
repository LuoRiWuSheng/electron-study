const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require("electron")
const path = require("path")
const electronLocalshortcut = require('electron-localshortcut');

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
        webPreferences: {
            nodeIntegration: true,
            devTools: true
        }
    })

    mainWindow.webContents.loadURL(path.resolve(__dirname, "../render/index.html"))

    mainWindow.webContents.openDevTools({
        type: "bottom"
    })
    mainWindow.show();
    mainWindow.focus();

    try {
        // 检测这个按键是不是被注册，直接抛出异常
        // window键位 ,单独的 alt,ctrl,等都会直接报错
        //console.log(globalShortcut.isRegistered("Alt"))
    } catch(e) {
        console.log(e)
    }

     // 使用这个包，注册快捷键需要在 ready 事件之后
    registerShortCut()

    mainWindow.on("close", () => {
        mainWindow = null;
        app.quit()
    })

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


// 注册本地快捷键，而不是全局的
let registerShortCut = () => {
    electronLocalshortcut.register(mainWindow, 'CmdOrCtrl+5', () => {
        // 在electron 5.0.x版本 showMessageBox会返回一个整数
        // 在electron 6.x 版本中返回的是 promise
            /**
             *  { response: 0, checkboxChecked: false } // 表示点击了 确定按钮
             *  { response: 1, checkboxChecked: false }  表示点击了  取消按钮
             */

        dialog.showMessageBox({
            title: "帮助",//信息提示框标题
            message: "localshortcut- 通过 ctrl+5注册",//信息提示框内容
            buttons: ["确定", "取消", "小样"],//下方显示的按钮
            noLink: true, //win下的样式
            type: "info",//图标类型
            detail: "额外的信息"
        }).then(clickIndex=> {
            console.log("当前点击的按钮索引--整数--》", clickIndex)
        }).catch(e=> {
            console.log("87", e)
        });

        
    });

    // 注册成功，控制台返回 1
    electronLocalshortcut.register(mainWindow, "Ctrl+A", () => {
        console.log(1)
    })
    
    // true
    console.log( electronLocalshortcut.isRegistered(mainWindow,'Ctrl+A'));  
    

    // 判断某个快捷键是不是被注册了
    console.log("window键位被注册了吗--》", electronLocalshortcut.isRegistered(mainWindow, "Ctrl+A"))
    
    // 清除所有的 本地快捷键
    //console.log("只卸载 CmdOrCtrl+5这个快捷键", electronLocalshortcut.unregister(mainWindow,"Ctrl+A"))
    // 返回的就是 undefined
   console.log("卸载所有的本地快捷键", electronLocalshortcut.unregisterAll(mainWindow))
    
}