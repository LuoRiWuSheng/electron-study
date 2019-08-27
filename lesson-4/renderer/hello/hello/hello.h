// hello.h : hello DLL 的主头文件
//

#pragma once

#ifndef __AFXWIN_H__
	#error "在包含此文件之前包含“stdafx.h”以生成 PCH 文件"
#endif

#include "resource.h"		// 主符号


// ChelloApp
// 有关此类实现的信息，请参阅 hello.cpp
//

class ChelloApp : public CWinApp
{
public:
	ChelloApp();

// 重写
public:
	virtual BOOL InitInstance();

	DECLARE_MESSAGE_MAP()
};

// input传入字符串，就会在output传出相同的字符串
int WINAPI Hello();

// input传入字符串，就会在output传出相同的字符串
int WINAPI Hello2(const char* input, char* output);
