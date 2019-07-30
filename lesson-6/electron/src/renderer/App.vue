<template>
    <div id="app">
        <router-view></router-view>
    </div>
</template>

<script>
export default {
    name: "test-build",
    mounted() {
        if (window.require) {
            let ipc = window.require("electron").ipcRenderer;
            ipc.send("checkForUpdate");
            ipc.on("message", (event, obj) => {
               
                console.log("事件名：", obj.eventName);
                console.log("事件名：", obj.msg);
                console.log("----------------------");
            });
            ipc.on("downloadProgress", (event, progressObj) => {
                this.downloadPercent = progressObj.percent || 0;
                console.log("message2", this.downloadPercent);
            });
            ipc.on("isUpdateNow", () => {
                ipc.send("isUpdateNow");
            });
        }
    }
};
</script>

<style>
/* CSS */
</style>
