<template>
    <div>
        <h1>拍照</h1>
        <div>
            说明：
            <dl>
                <dd>navigator.mediaDevices.getUserMedia(constraints);</dd>
                <div>constraints 是包含</div>
            </dl>
        </div>
        <div>
            <input
                type="button"
                title="开启摄像头"
                value="开启摄像头"
                @click="getMedia"
                class="media-box"
            />
            <input
                type="button"
                title="关闭摄像头"
                value="关闭摄像头"
                @click="closeMedia"
                class="media-box"
            />
            <input
                type="button"
                title="暂停摄像头"
                value="暂停摄像头"
                @click="pauseMedia"
                class="media-box"
            />
            <button id="snap" @click="takePhoto">拍照</button>
            <button type="button" @click="downloadPhoto">下载照片</button>
        </div>
        <div>
            <video
                id="video"
                width="300px"
                height="300px"
                autoplay="autoplay"
                class="photo-area"
            ></video>

            <span>
                <h2>下面是照片</h2>
                <canvas id="canvas" width="300px" height="300px"></canvas>    
            </span>    

        </div>
      
    </div>
</template>

<script>
export default {
    name: "Index",
    data() {
        return {
            photo: ""
        };
    },
    methods: {
        getMedia() {
            let constraints = {
                // 要开启 视频 video 可以简单的设置为 true ，也可以设置为对象
                /**
                 * video: {
                 *      width: 摄像头像素宽 1920
                 *      height: 摄像头像素高 1080
                 *      分辨率就是 1920*1080
                 *      width: {
                 *          max:  强制使用 max指定的宽
                 *          min:  强制使用 min 指定的宽
                 *      }
                 *      height: {
                 *          max:  强制使用 max指定的高
                 *          min:  强制使用 min 指定的高
                 *      }
                 *      exact: 表示 max == min
                 *      width: {ideal: 1920} ideal 表示应用最理想值作为像素
                 *      height: {ideal: 1080}
                 *
                 *      facingMode： "user" 使用前置摄像头--移动端需要设置这个属性
                 *      facingMode: { exact: "environment" }  使用后置摄像头
                 *
                 * }
                 *
                 */
                video: { width: 300, height: 300 },
                audio: true
            };
            //获得video摄像头区域
            let video = document.getElementById("video");
            video.style.display = "inline-block";
            //这里介绍新的方法，返回一个 Promise对象
            // 这个Promise对象返回成功后的回调函数带一个 MediaStream 对象作为其参数
            // then()是Promise对象里的方法
            // then()方法是异步执行，当then()前的方法执行完后再执行then()内部的程序
            // 避免数据没有获取到
            console.log(navigator.mediaDevices);

            let promise = navigator.mediaDevices.getUserMedia(constraints);
            promise
                .then(function(MediaStream) {
                    console.log(`MediaStream: -->`);
                    console.log(MediaStream);
                    /**
                     * mediaStream:{
                            active: true
                            id: "k6zAanU7ynuXVvHwcfFLGmt5fX2E6OnLReVR"
                            onactive: null
                            onaddtrack: null
                            oninactive: null
                            onremovetrack: null
                     * }
                     * 
                     * 
                     */

                    video.srcObject = MediaStream;

                    // 2种方式调用 load
                    // 使用 addEventListener("loadedmetadata", (event)=> {...})
                    // 使用 onloadedmetadata = (event)=> {...}
                    // 都可以
                    video.onloadedmetadata = event => {
                        console.info(event);
                        console.log("媒体加载完毕");
                        video.play();
                    };
                })
                .catch(function(err) {
                    console.log(err.name + ": " + err.message);
                }); // 总是在最后检查错误

            // 获取到当前用户设备的 所有的媒体设备 【麦克风，摄像机，耳机设备】等
            navigator.mediaDevices
                .enumerateDevices()
                .then(devices => {
                    console.log(devices);
                    devices.forEach(function(device) {
                        console.log(
                            device.kind +
                                ": " +
                                device.label +
                                " id = " +
                                device.deviceId
                        );
                    });
                })
                .catch(err => {
                    console.log(err.name + ": " + err.message);
                });
            navigator.mediaDevices.ondevicechange = () => {};
        },

        // 关闭摄像头
        closeMedia() {
            let video = (document.querySelector("#video").style.display =
                "none");
        },
        // 暂停
        pauseMedia() {
            let video = document.querySelector("#video");

            video.pause();
        },
        // 拍照
        takePhoto() {
            //获得Canvas对象
            let video = document.getElementById("video");
            let canvas = document.getElementById("canvas");
            let ctx = canvas.getContext("2d");

            ctx.drawImage(video, 0, 0, video.width, video.height);

            // 从 canvas上获取照片数据-- 将 canvas 转换成 base64
            this.photo = canvas.toDataURL("image/png")
        },
        downloadPhoto() {
            // 照片名字，用作下载，用时间戳代替
            let photoName = new Date().getTime()

            // 将 base64转换成 blob- 二进制数据
            let blob = this.base64ToBlob(this.photo)

            let aLink = document.createElement('a');
            // 自定义事件
            let evt = document.createEvent("HTMLEvents");
            // 事件初始化,定义怎么触发事件, 事件名 click, true阻止事件冒泡，阻止事件默认行为
            evt.initEvent("click", true, true);
            aLink.download = photoName;
            aLink.href = window.URL.createObjectURL(blob);
            // 触发事件
	        aLink.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));//兼容火狐
        },
        base64ToBlob(base64) {
            // 照片数据格式是  data:image/png;base64,base64照片数据
            let parts = base64.split(";base64,");
            console.log(parts)
            // 照片类型
            // parts[0]  "data:image/png"
            // parts[1]  照片的base64字符串
            let contentType = parts[0].split(":")[1]  // image/png
            let raw = window.atob(parts[1])
            let rawLength = raw.length;

            let uInt8Array = new Uint8Array(rawLength)

            for(let i=0; i<rawLength; i++) {
                // 将字符串每个字符全部转换成 Unicode 编码
                uInt8Array[i] = raw.charCodeAt(i)
            }
            
           // Blob 第一个参数接受的是一个数组， 参数2的type是一个 MIME类型
            // 返回一个 二进制数据
            return new Blob([uInt8Array], {type: contentType})
        }
    }
};
</script>

<style lang="scss" scoped>
.media-box {
    border: 1px solid #ff0000;
}
.photo-area {
    border: 2px solid yellow;
}
</style>


