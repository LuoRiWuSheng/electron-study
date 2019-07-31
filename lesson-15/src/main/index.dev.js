/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

/* eslint-disable */

// Install `electron-debug` with `devtron`
require('electron-debug')({ showDevTools: true })
const {BrowserWindow} = require("electron")

// Install `vue-devtools`
require('electron').app.on('ready', () => {
     // 完整的路径
     let toolsPath = "C:/Users/Administrator/AppData/Local/Google/Chrome/User Data/Default/Extensions/nhdogjmejiglipccpnnnanhbledajbpd/5.1.1_0";
     // 会返回扩展程序的 扩展名
      let toolName = BrowserWindow.addDevToolsExtension(toolsPath);
      console.log("扩展名", toolName)
})

// Require `main` process to boot app
require('./index')