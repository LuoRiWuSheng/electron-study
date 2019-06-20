// 渲染进程中操作node.js--渲染进程可以简单的理解为我们的页面
const fs = require("fs")

window.onload = ()=> {
    let btn = document.querySelector("#btn")
    let box = document.querySelector(".box")

    btn.addEventListener("click", ()=> {
        fs.readFile("package.json", (err, data)=> {
            box.innerHTML = data
        })
    }, false)

    let detail = document.querySelector(".detail")
    // 调用拖拽h5的api
    
    detail.ondragenter = detail.ondragover = detail.ondragleave =function() {
        // 阻止默认行为
        return false
    }
    detail.ondrop = function(e) {
        e.preventDefault()
        console.log(e)

        // 从事件对象中获取到文件的路径
        console.log(e.dataTransfer.files[0])

        // 能够拿到文件的所有基础属性
        /**
         * lastModified: 1556163576169   文件的最后修改时间 时间戳，就是下面的具体时间
            lastModifiedDate: Thu Apr 25 2019 11:39:36 GMT+0800 (中国标准时间) {}
            name: "新建文本文档.txt"
            path: ''  对应磁盘上的一个具体的文件路径  'c://1.txt'
            size: 0
            type: "text/plain"
            webkitRelativePath: ""
         *  */

        // 借助fs模块，读取内容
        if(e.dataTransfer.files.length === 0) {
            // 表示鼠标松开的时候，没有文件被拖拽到目标区域
            return
        }

        fs.readFile(e.dataTransfer.files[0].path, (err, data)=> {
            detail.innerHTML = data
        })
        
    }
}


