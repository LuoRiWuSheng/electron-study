import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

let AutoLaunchInstance;

// 引入开机自启动包
const AutoLaunch = require('auto-launch');

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`

function createWindow () {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        height: 563,
        useContentSize: true,
        width: 1000,
        webPreferences: {
            nodeIntegration: true,
            devTools: true
        }
    })
    mainWindow.webContents.openDevTools({
        mode: "bottom"
    })
    mainWindow.loadURL(winURL)

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    checkIsAutoLaunch()
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

// 检查是不是自动重启
var checkIsAutoLaunch = () => {
    AutoLaunchInstance = new AutoLaunch({
        name: app.getName()
    })

    AutoLaunchInstance.isEnabled().then(function (isEnabled) {
        console.log(`应用是不是自启动--》${isEnabled}`)
        if (isEnabled) { // 是自动重启，什么都不做
            return;
        }
        // 不是自动重启，就设置一下
        AutoLaunchInstance.enable();
    }).catch(function (err) {
        console.log("93-->", err)
        // 因为打包后的应用，看不到控制台，所以，使用dialog将异常弹出，产品上线，可以移除这里
        // 将这里修改为 log，写入到实体的log文件或者上传到服务器
        // 杀毒软件会导致这里触发 err 所以，杀毒软件检测到的时候，选择 启用自启动 就好了
        dialog.showMessageBox(mainWindow, {
            type: "error",
            title: "自启动错误",
            message: err
        })
    });

    bindingAutoLaunch()
}

if (process.env.NODE_ENV !== 'development') {

    // 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
    !function updateHandle () {
        let message = {
            error: '检查更新出错',
            checking: '正在检查更新……',
            updateAva: '检测到新版本，正在下载……',
            updateNotAva: '现在使用的就是最新版本，不用更新',
        };

        const uploadUrl = "http://192.168.3.8:3000/download/"; // 下载地址，不加后面的**.exe
        autoUpdater.setFeedURL(uploadUrl);
        autoUpdater.on('error', function (error) {
            console.log(autoUpdater.error);
            sendUpdateMessage("error", error)
        });
        autoUpdater.on('checking-for-update', function () {
            sendUpdateMessage("checking-for-update", message.checking)
        });
        autoUpdater.on('update-available', function (info) {
            sendUpdateMessage("update-available", info)
        });
        autoUpdater.on('update-not-available', function (info) {
            sendUpdateMessage("update-not-available", message.updateNotAva)
        });

        // 更新下载进度事件
        autoUpdater.on('download-progress', function (progressObj) {
            mainWindow.webContents.send('downloadProgress', progressObj)
        });
        autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {

            ipcMain.on('isUpdateNow', (e, arg) => {
                //some code here to handle event
                autoUpdater.quitAndInstall();
            });

            mainWindow.webContents.send('isUpdateNow')
        });

        ipcMain.on("checkForUpdate", () => {
            //执行自动更新检查
            autoUpdater.checkForUpdates();
        })
    }();
}

// 通过main进程发送事件给renderer进程，提示更新信息
function sendUpdateMessage (eventName, text) {
    mainWindow.webContents.send('message', {
        eventName,
        msg: text
    })
}

function bindingAutoLaunch() {
    // 手动设置--禁用开机自启
    ipcMain.on("disable-auto-launch", ()=> {
        AutoLaunchInstance.disable();
    })

    // 手动设置，开机自启动
    ipcMain.on("enable-auto-launch", ()=> {
        AutoLaunchInstance.enable()
    })
}