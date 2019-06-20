using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Storage.Streams;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at https://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

namespace App1
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            this.InitializeComponent();
            MyWebView.ScriptNotify += WebView_ScriptNotify;
            MyWebView.NavigationCompleted += WebView_NavigationCompleted;
        }

        private void WebView_NavigationCompleted(WebView sender, WebViewNavigationCompletedEventArgs args)
        {
            if (args.IsSuccess == true)
            {
                // need to set the window.utils.windowsApp property to true so that the document will be
                // loaded using the efficient windows local file part retriever
                MyWebView.InvokeScriptAsync("eval", new string[] { "window.utils.windowsApp = true;" });
            }
        }

        private async void WebView_ScriptNotify(object sender, NotifyEventArgs e)
        {
            string[] urlParts = e.Value.Split('?');
            string docLocation = urlParts[0];

            Uri docUri = new Uri("ms-appx:///" + docLocation);
            var file = await Windows.Storage.StorageFile.GetFileFromApplicationUriAsync(docUri);

            var props = await file.GetBasicPropertiesAsync();
            var fileSize = props.Size;

            string range = urlParts[1];
            string[] rangeParts = range.Split('&');

            string originalRangeStart = rangeParts[0];
            ulong rangeStart;
            // if the range start is negative then read from the end of the file
            if (originalRangeStart.StartsWith("-"))
            {
                ulong rangeStartPositive = (ulong)Math.Abs(Convert.ToInt64(originalRangeStart));
                rangeStart = fileSize - rangeStartPositive;
            }
            else
            {
                rangeStart = Convert.ToUInt64(originalRangeStart);
            }

            // if the end range is not specified then it goes to the end of the file
            ulong rangeEnd = (rangeParts[1].Length == 0) ? fileSize : Convert.ToUInt64(rangeParts[1]);

            var stream = await file.OpenReadAsync();
            stream.Seek(rangeStart);

            // get the number of bytes to read
            uint count = (uint)(rangeEnd - rangeStart);
            var bytes = new byte[count];

            using (var dataReader = new DataReader(stream))
            {
                await dataReader.LoadAsync(count);
                dataReader.ReadBytes(bytes);
            }

            string successFunction = string.Format("setTimeout(function() {{ window.CoreControls.PartRetrievers.WinRTPartRetriever.partSuccess('{0}', '{1}'); }}, 0);", Convert.ToBase64String(bytes), originalRangeStart);
            MyWebView.InvokeScriptAsync("eval", new string[] { successFunction });
        }

        /// <summary>
        /// Invoked when this page is about to be displayed in a Frame.
        /// </summary>
        /// <param name="e">Event data that describes how this page was reached.  The Parameter
        /// property is typically used to configure the page.</param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            Uri targetUri = new Uri("ms-appx-web:///Assets/html5/ui/build/index.html#d=Assets/webviewer-demo-annotated.xod&a=1");
            MyWebView.Navigate(targetUri);
        }
    }
}
