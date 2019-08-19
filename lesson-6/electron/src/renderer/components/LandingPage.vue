<template>
    <div id="wrapper">
        <button @click="enableAutoLaunch">手动设置开机自启</button>
        <button @click="disableAutoLuanch">
            关闭开机自启
        </button>
    </div>
</template>

<script>
import SystemInformation from "./LandingPage/SystemInformation";
const { ipcRenderer } = require("electron");

export default {
    name: "landing-page",
    components: { SystemInformation },
    methods: {
        enableAutoLaunch() {
            ipcRenderer.send("enable-auto-launch");
        },
        disableAutoLuanch() {
            ipcRenderer.send("disable-auto-launch");
        }
    }
};
</script>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: "Source Sans Pro", sans-serif;
}
</style>
