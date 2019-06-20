
package com.pdftron.webviewer;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebStorage;
import android.widget.Toast;

import java.io.*;
import java.util.Locale;

import com.pdftron.webviewer.R;

public class WebViewerActivity extends Activity {
    private static final int GET_FILE_REQUEST_CODE = 1;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String documentPath = null;
        if (this.getIntent().getData() != null) {
            // no file selected
            documentPath = this.getIntent().getData().getPath();
        } else {
            // creates a document to the files directory
            // loads it as the default
            Log.i("WebViewerActivity", "Load default.xod from internal storage");
            documentPath = this.createTestDocumentInInternalStorage();
        }

        setContentView(R.layout.viewer);
        WebView webView = (WebView)findViewById(R.id.webview);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onExceededDatabaseQuota(String url, String databaseIdentifier,
                    long currentQuota, long estimatedSize, long totalUsedQuota,
                    WebStorage.QuotaUpdater quotaUpdater) {
                //increase quota
                quotaUpdater.updateQuota(estimatedSize * 2);
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportZoom(false);
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        String databasePath = this.getApplicationContext().getDir("database", Context.MODE_PRIVATE)
                .getPath();
        settings.setDatabasePath(databasePath);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        //load the viewer
        this.loadDocument(documentPath);
    }

    /**
     * Loads a viewer with the provided document file path.
     *
     * @param filePath The file path to a .xod document file.
     */
    public void loadDocument(String filePath) {
        WebView webView = (WebView)findViewById(R.id.webview);
        webView.addJavascriptInterface(new WebViewerJavaScriptInterface(this, filePath), "Android");
        webView.loadUrl("file:///android_asset/lib/ui/build/index.html#a=1");
    }

    /**
     * Copies a default test document to the device's internal storage. This is
     * used to demonstrate how a file can be loaded from outside an
     * application's asset folder.
     *
     * @return the file path to a xod file in the device's internal storage
     */
    private String createTestDocumentInInternalStorage() {
        String documentPath = getFilesDir().getPath() + "/default.xod";
        try {
            File defaultFile = new File(documentPath);
            if (!defaultFile.exists()) {
                Log.i("WebViewerActivity", "Copy default.xod from assets to internal storage");
                FileOutputStream out = new FileOutputStream(defaultFile);
                InputStream in = getAssets().open("xod/default.xod");

                // copy assets/xod/default.xod to internal storage
                byte[] b = new byte[8192];
                int read;
                while ((read = in.read(b)) != -1) {
                    out.write(b, 0, read);
                }

                out.close();
                in.close();
            }
        } catch (Exception e) {
            Log.e("WebViewerActivity", "Failed to copy file to internal storage", e);
        }
        return documentPath;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater menuInflater = getMenuInflater();
        menuInflater.inflate(R.menu.web_viewer, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_load_file:

                //select a xod file, using an external file manager app
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("file/*");

                try {
                    startActivityForResult(intent, GET_FILE_REQUEST_CODE);
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(WebViewerActivity.this, "No file managers was found.",
                            Toast.LENGTH_SHORT).show();
                }
                return true;

            default:
                return super.onOptionsItemSelected(item);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        switch (requestCode) {
            case GET_FILE_REQUEST_CODE:
                if (resultCode == RESULT_OK) {
                    String selectedFilePath = data.getData().getPath();
                    if(selectedFilePath.toLowerCase(Locale.US).endsWith(".xod")){
                        Toast.makeText(WebViewerActivity.this, "Loading " + selectedFilePath,
                                Toast.LENGTH_SHORT).show();
                        //load the viewer with a new document
                        this.loadDocument(selectedFilePath);
                    }else{
                        Toast.makeText(WebViewerActivity.this, "WebViewer cannot open the selected file. Please select a .xod file.",
                                Toast.LENGTH_SHORT).show();
                    }
                }
                break;

        }
    }

    /**
     * Represents a JavaScript interface class that is called by the
     * MobileReaderControl.js
     *
     * @author PDFTron
     */
    public class WebViewerJavaScriptInterface {
        // private Main activity;

        private Context context;

        private String documentFilePath;

        public WebViewerJavaScriptInterface(Context context, String documentFilePath) {
            this.context = context;
            this.documentFilePath = documentFilePath;
        }

        @JavascriptInterface //comment for Android API level 16 or lower
        public String getXodContentUri() {
            return LocalFileContentProvider.createContentUriFromFilePath(this.documentFilePath)
                    .toString();
        }

        @JavascriptInterface //comment for Android API level 16 or lower
        public void showToast(String message) {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
        }
    }
}
