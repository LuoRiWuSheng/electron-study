// 给按钮添加监听事件
document.getElementById('myButton').addEventListener('click', () => {

    // 当按钮被点击则弹出一个文件选择对话框。
    dialog.showOpenDialog({
        properties: ['openFile'], // 设置文件打开对话框
        filters: [{
            name: "PDFs",
            extensions: ['pdf']
        }] // 过滤pdf文件类型
    }, (filepaths) => {

        // 只能选择一个文件，直接使用第一个。
        const filePath = filepaths[0];

        const viewerEle = document.getElementById('viewer');
        viewerEle.innerHTML = ''; // 清空之前的内容

        // 创建一个WebViewer实例.
        new window.PDFTron.WebViewer({
            path: '../public/WebViewer/lib',
            l: '你的密钥写在这里',
            initialDoc: filePath
        }, viewerEle)

    })
})