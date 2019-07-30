const http = require("http")
const fs = require("fs")
const path = require("path")
const url = require("url")

let app = http.createServer((req, res) => {

    let reqUrl = decodeURI(req.url);
    console.log("---------访问进来----------------------------------------")
    console.log(reqUrl)
    let aa = path.join(__dirname, reqUrl)
    var d = new Date()
    var fullTime = d.getFullYear() + "-" + (d.getMonth()+1) + "-" + (d.getDate())+ " "+(d.getHours())+":"+(d.getMinutes())+":"+(d.getSeconds())
    console.log("访问时间：",fullTime)
    
    // 因为这里的文件路径应该是直接指向文件的，不能带? 查询参数
    aa = url.parse(aa).pathname
    fs.stat(aa, (err, stats) => {
        if (err) {
            console.log("访问的文件不存在")
            console.log("-------------------------------------------------")
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/javascript;charset=UTF-8');//utf8编码，防止中文乱码
            res.end(`${aa} is not a directory or file.`)
            return;
        }

        if (stats.isFile()) {//如果是文件
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/javascript;charset=UTF-8');
            console.log("访问到文件了")
            console.log("////////////////////////////////")
            fs.createReadStream(aa).pipe(res);//以流的方式来读取文件
        } else if (stats.isDirectory()) {//如果是文件夹，拿到文件列表
            fs.readdir(aa, (err, files) => {//files是个数组
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');
                res.end(files.join(','));//返回所有的文件名
            })
        }
    })



    return;



    /*
    switch (reqUrl) {
        case "/":
            let indexFilePath = path.join(__dirname, "index.html")
            fs.readFile(indexFilePath, "utf8", (err, data) => {
                if (err) {
                    console.log(`首页文件读取报错`)
                    res.end("error")
                    return
                }

                res.end(data)
            })
            return;
        case "/favicon.ico":
            res.end()
            return
    
        case "/download":
            let aa = path.join(__dirname, "download")
            
            fs.stat(aa, (err, stats)=> {
                if(err) {
                    console.log("访问的文件不存在")
                    res.statusCode = 404;
                    res.setHeader('Content-Type','text/javascript;charset=UTF-8');//utf8编码，防止中文乱码
                    res.end(`${aa} is not a directory or file.`)
                    return;
                }

                if(stats.isFile()){//如果是文件
                    res.statusCode = 200;
                    res.setHeader('Content-Type','text/javascript;charset=UTF-8');
                    fs.createReadStream(aa).pipe(res);//以流的方式来读取文件
                }else if (stats.isDirectory()) {//如果是文件夹，拿到文件列表
                    fs.readdir(aa,(err,files)=>{//files是个数组
                        res.statusCode = 200;
                        res.setHeader('Content-Type','text/plain');
                        res.end(files.join(','));//返回所有的文件名
                      
                    })
                }
            })



            return;
        case "/download/latest.yml":
    }
    */

})

app.listen(3000, () => {
    console.log(`listening at 3000 port`)
})


function readFileAndSend (res, filePath, fileName) {
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.log(err)
            res.end(fileName, "文件读取出错")
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'application/octet-stream', //告诉浏览器这是一个二进制文件  
            'Content-Disposition': 'attachment; filename=' + encodeURI(fileName), //告诉浏览器这是一个需要下载的文件  
        });
        //console.log(data)
        fs.createReadStream(filePath).pipe(res);
    })
}