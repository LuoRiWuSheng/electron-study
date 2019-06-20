// 这里是C++中的伪代码，不用管，看下面的js调用即可
extern "C" 
	// My_Test返回值类型是int, 函数的入参类型是 string int int
	int __declspec(dllexport) My_Test(char *a, int b, int c); 
extern "C" 
	// void表示函数没有返回值
	void __declspec(dllexport) My_Hello(char *a, int b, int c);

// 模仿，模仿，模仿
上面的那个代码是不存在的，对照hello 采用下面的方式去调一下hello中的方法，看是否调用成功

import ffi from 'ffi' 

// 下面这段是将C++的东西引入进来
// ffi.Library`用于注册函数，第一个入参为DLL路径，最好为文件绝对路径 
const dll = ffi.Library( './test.dll', {     
	// My_Test是dll中定义的函数，两者名称需要一致     
	// [a, [b，c....]] a是函数出参类型，[b，c]是dll函数的入参类型     
	My_Test: ['int', ['string', 'int', 'int']], // 可以用文本表示类型    
	// 更推荐用`ref.types.xx`表示类型，方便类型检查，`char*`的特殊缩写下文会说明	
	My_Hello: [ref.types.void, ['string', ref.types.int, ref.types.int]] 
})

// 这里才是真正的调用--hello里面，你直接采用同步调用，hello中没有写异步的形式，直接采用同步调用，看看result是什么
//同步调用 
const result = dll.My_Test('hello', 3, 2) 



//异步调用 
dll.My_Test.async('hello', 3, 2, (err, result) => {     
	if(err) {         
		//todo     
	}     
	return result 
})

// 不用看下面的

------------------------------------------

C知识点




const ref = require('ref') 
const ffi = require('ffi') 
const testDLL = ffi.Library('./testDLL', {     
	 // ffi.Function申明类型， 用`'pointer'`申明类型也可以	
	setCallback: ['int', [ffi.Function(ref.types.void,[ref.types.int, ref.types.CString])] 
	] 
}) 

const uiInfocallback = ffi.Callback(ref.types.void, // ffi.callback返回函数实例     
		[ref.types.int, ref.types.CString], (resultCount, resultText) => {
			console.log(resultCount)         
			console.log(resultText)     
		}, ) 

const result = testDLL.uiInfocallback(uiInfocallback) 

// 调用
process.on('exit', () => {     /* eslint-disable-next-line */    
	 uiInfocallback // keep reference avoid gc 
}) 



