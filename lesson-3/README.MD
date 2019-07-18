## 演示了以下功能

- 主进程与渲染进程通讯（异步，同步）
- 渲染进程通过事件的方式创建新窗口
- 渲染进程调用remote创建新窗口
- 获取应用是否打包
- 获取应用的打包路径
- 判断当前窗口是什么类型
- 渲染进程与渲染进程之间进行通讯(10种传递数据)
    + 通过 remote 进行通讯
    + 通过 localStorage (a页面传，b.html接)
    + 通过 sessionStorage (b页面传, c页面接)
    + 通过 indexedDB
    + GET地址传参，少量参数可以，数据过多，则会被截断
    + POST 接口传参
    + iframe 传递参数
    + webview 传递数据
    + postMessage跨源传参
    + 如果使用 vue全家桶，则可以使用 vuex进行数据管理，可以传递参数; 当然react也有数据管理的包

**注意事项**

- localStorage存储的数据容量在2.5MB ~ 10MB 之间， 注意数据量的多少
- localStorage与sessionStorage之间的区别在于,localStorage的数据并不会随着应用的关闭而消失，即使你整个关闭electron应用； sessionStroage随着应用的关闭，数据自动被清除
- localStorage存储的数据，不具备建立索引，没有搜索功能， indexDB可以做到
- localStorage和sessionStorage存储对象类型的数据，需要 JSON.stringify(data), 获取的时候，在JSON.parse;  如果是简单的数据，比如一个字符串，则不必做JSON字符串化和JSON解析
- localStorage与sessionStorage是同步存储数据，也就是你存储完，才能执行下一行语句；  indexDB是异步存储，不会阻塞网页，不会造成浏览器锁死的情况
- localStorage、sessionStorage、 indexDB， 都存在同源策略这一安全限制


### 温馨提示

- 操作 IndexedDB，可以在 控制台Application面板看到，它不会自动刷新，我们做数据增删改，需要自己右键刷新一下，才能看到最新的状态
- 要读取所有的IndexedDB中的数据，需要调用 openCursor方法，且该方法是异步的，还要监听 onsucess事件，通过事件内的event对象拿到所有的数据，通过调用  cursor.continue();读取下一个数据

### 错误汇总

- 做数据插入的时候，报下面的错误

>   Unable to add key to index 'email': at least one key does not satisfy the uniqueness requirements.

看后半段，说插入一个key值，但是这个违反了唯一性； 再检查 email字段，是不是指定了唯一，但是做新增的时候，又重复添加
在 onerror事件中，查看 *event.target.error.message* 有明确提示

[IndexDB操作API指南](https://wangdoc.com/javascript/bom/indexeddb.html#indexeddb-%E5%AF%B9%E8%B1%A1)

## 运行

```js
    npm run dev
    或者
    yarn run dev
```