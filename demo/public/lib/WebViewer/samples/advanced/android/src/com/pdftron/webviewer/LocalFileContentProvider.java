
package com.pdftron.webviewer;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.List;

/**
 * A ContentProvider that reads local files through random access and provides data through byte ranges.
 * The byte range is specified in the URI: [base_uri]/bytes=[range_start]-[range_end]
 * @author PDFTron
 */
public class LocalFileContentProvider extends ContentProvider {
    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) {

        Log.d("LocalFileContentProvider", "fetching: " + uri);
        List<String> segments = uri.getPathSegments();
        String relPath = "";
        String byteRangeSegment = null;
        boolean useByteRangeFetching = false;
        for (int i = 0; i < segments.size(); i++) {
            if (i + 1 == segments.size()) {
                String lastSegment = segments.get(i);
                if (lastSegment.startsWith("bytes=")) {
                    useByteRangeFetching = true;
                    byteRangeSegment = lastSegment;
                    break;
                }
            }
            relPath += "/" + segments.get(i);
        }

        if (useByteRangeFetching) {
            // creates a temporary file for the byte range request and return it
            // as a ParcelFileDescriptor
            File tempFile = null;
            try {
                byte[] buffer = null;
                int bytesToRead = 0;
                try {
                    RandomAccessFile raFile = new RandomAccessFile(relPath, "r");

                    String ranges = byteRangeSegment.substring(6);
                    String[] rangeArr = ranges.split("[,]");

                    int byteStart = 0;
                    int byteEnd = 0;

                    byteStart = Integer.parseInt(rangeArr[0]);
                    if (byteStart < 0) {
                        byteStart += raFile.length();
                    }
                    if (rangeArr.length < 2) {
                        byteEnd = (int)raFile.length();
                    } else {
                        byteEnd = Integer.parseInt(rangeArr[1]);
                    }
                    bytesToRead = byteEnd - byteStart;
                    //Log.d("LocalFileContentProvider", "bytes: " + byteStart + " " + bytesToRead);
                    
                    buffer = new byte[(int)bytesToRead];
                    raFile.seek(byteStart);
                    raFile.read(buffer, 0, bytesToRead);

                    raFile.close();
                } catch (Exception e) {
                    Log.e("LocalFileContentProvider", "uri " + uri.toString(), e);
                } finally {

                }

                // Create the tempfile form a stream
                tempFile = File.createTempFile("tempfilef", ".dat", getContext().getCacheDir());
                BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(tempFile),
                        8192);
                
                out.write(buffer, 0, bytesToRead);
                out.close();

                if (mode.equals("r")) {
                    return ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY);
                }
            } catch (IOException e) {
                Log.e("Error in accessing file.", "Error", e);
            } finally {
                if (tempFile != null) {
                    tempFile.delete();
                }
            }
        } else {
            // returns a ParcelFileDescriptor for the entire xod file (to
            // support WebViewer streaming)
            File file = new File(relPath);
            try {
                ParcelFileDescriptor parcel = null;
                parcel = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
                return parcel;

            } catch (FileNotFoundException e) {
                Log.e("LocalFileContentProvider", "uri " + uri.toString(), e);
            }

        }
        return null;
    }

    public static Uri createContentUriFromFilePath(String path) {
        String namespace = LocalFileContentProvider.class.getPackage().getName();
        String uriString = "content://" + namespace + path;
        Uri uri = Uri.parse(uriString);
        return uri;
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public int delete(Uri uri, String s, String[] as) {
        throw new UnsupportedOperationException("Not supported by this provider");
    }

    @Override
    public String getType(Uri uri) {
        throw new UnsupportedOperationException("Not supported by this provider");
    }

    @Override
    public Uri insert(Uri uri, ContentValues contentvalues) {
        throw new UnsupportedOperationException("Not supported by this provider");
    }

    @Override
    public Cursor query(Uri uri, String[] as, String s, String[] as1, String s1) {
        throw new UnsupportedOperationException("Not supported by this provider");
    }

    @Override
    public int update(Uri uri, ContentValues contentvalues, String s, String[] as) {
        throw new UnsupportedOperationException("Not supported by this provider");
    }
}
