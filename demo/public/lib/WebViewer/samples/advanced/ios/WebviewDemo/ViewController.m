//
//  ViewController.m
//  WebviewDemo
//
//  Copyright (c) 2013 PDFTron. All rights reserved.
//

#import "ViewController.h"
#import "Utils.h"

@interface ViewController ()

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];

    UIWebView* webView = [[UIWebView alloc] initWithFrame:self.view.frame];

    webView.delegate = self;
    webView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    [self.view addSubview:webView];

    NSString* fullPath = [[NSBundle mainBundle] pathForResource:@"/lib/ui/build/index" ofType:@"html"];

    NSURL *url = [NSURL fileURLWithPath:fullPath];
    NSString* absoluteString  = [url absoluteString];
    NSString* stringWithQuery = [absoluteString stringByAppendingString:@"#d=iosrange://xod/webviewer-demo-annotated.xod"];
    NSURL* webviewUrl = [NSURL URLWithString:stringWithQuery];

    NSURLRequest* webviewerRequest = [[NSURLRequest alloc] initWithURL:webviewUrl];
    [webView loadRequest:webviewerRequest];
}

- (BOOL)webView:(UIWebView*)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    NSURL *URL = [request URL];

    if ([[URL scheme] isEqualToString:@"iosrange"]) {
        NSString *requestString = [URL absoluteString];
        // get rid of the protocol
        NSString *withoutProtocol = [[requestString componentsSeparatedByString:@"//"] objectAtIndex:1];

        NSArray *urlParts = [withoutProtocol componentsSeparatedByString:@"#"];
        // document location is everything before the question mark
        NSString *docPath = [[urlParts objectAtIndex:0] stringByDeletingPathExtension];
        NSString *docLocation = [[NSBundle mainBundle] pathForResource:docPath ofType:@"xod"];

        // query string has start and possibly stop values for the byte range
        NSArray *queryString = [[urlParts objectAtIndex:1] componentsSeparatedByString:@"&"];
        NSInteger rangeStart = [[queryString objectAtIndex:0] integerValue];
        NSInteger originalRangeStart = rangeStart;
        NSInteger rangeEnd = [[queryString objectAtIndex:1] integerValue];

        NSFileHandle *fileHandle = [NSFileHandle fileHandleForReadingAtPath:docLocation];
        if (rangeStart < 0) {
            // a negative range means it's from the end of the file
            // we need to calculate what that offset is from the beginning of the file
            NSInteger fileSize = [fileHandle seekToEndOfFile];
            rangeStart = fileSize + rangeStart;
        }

        [fileHandle seekToFileOffset:rangeStart];

        NSData *data;
        if (rangeEnd == 0) {
            data = [fileHandle readDataToEndOfFile];
        } else {
            data = [fileHandle readDataOfLength:(rangeEnd - rangeStart)];
        }

        // convert data to base64
        NSString *stringBuffer = [Utils encodeBase64WithData:data];

        // call JavaScript function with the data
        // setTimeout is used to make sure that it returns asynchronously
        NSString *jsFunction = [NSString stringWithFormat:@"setTimeout(function() {window.CoreControls.PartRetrievers.IOSPartRetriever.partSuccess('%@', %d);}, 0)", stringBuffer, originalRangeStart];
        [webView stringByEvaluatingJavaScriptFromString:jsFunction];

        return NO;
    }
    return YES;
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
