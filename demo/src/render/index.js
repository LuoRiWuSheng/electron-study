// 渲染进程中操作node.js--渲染进程可以简单的理解为我们的页面
const {dialog} = require("electron").remote
const path = require("path")

// 默认先显示一个pdf文件
const viewerEle = document.getElementById("viewer")
//创建一个iframe指向我们的PDF.js查看器。并把选择的pdf文件路劲当做file参数传递过去。
const iframe = document.createElement('iframe');
const defaultPdfPath = path.resolve(__dirname, "../pdf-list/test.pdf")
iframe.src = path.resolve(__dirname,  `../../public/lib/pdfjs/web/viewer.html?file=${defaultPdfPath}`);
viewerEle.appendChild(iframe);

document.getElementById("myButton").addEventListener("click", ()=> {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{
            name: 'PDFs',
            extensions: ["pdf"] // 过滤文件，只能选择pdf
        }]
    }, (filepaths)=> {
        // 返回一个文件的地址,filepaths是一个数组，但是只能选择一个pdf文件，即pdf在磁盘的位置是确定的
        const filePath = filepaths[0]
        
        
        viewerEle.innerHTML = ''; // 清空上次的内容
        
        
        iframe.src = path.resolve(__dirname, `../../public/lib/pdfjs/web/viewer.html?file=${filePath}`);

        // 把iframe添加到页面中。
        viewerEle.appendChild(iframe);
    })
})
