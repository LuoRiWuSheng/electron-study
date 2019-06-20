/**
 * annotationHandler.js
 * This node.js script is a sample of basic server-side annotation handling.
 * When WebViewer makes a POST request with annotations to save, this script will save the annotations to a file.
 * When WebViewer makes a GET request to load the annotations, this script will fetch the annotations from the file and return it.
 * Note that this is only a sample and does not take account of security and concurrency.
 *
 * This example is standalone but you could move just the annotation handling code into your own server.
 * To run this sample you can run "node annotationHandler.js" which will start up a server on port 3000.
 * Then in WebViewer set your serverUrl to localhost:3000/annotations
 *
 * For production, please consider the following:
 * 1. Your server should assign a document identifier 'did' to the WebViewer. When saving and loading annotations, use this 'did' to uniquely identify the annotation file to use.
 * 2. You may also want to use 'did' as a session token, in order to authenticate the client user.
 * 3. You may want to consider a better storage for your annotation file (e.g. save the annotation in a database)
 **/

const http = require('http');
const fs = require('fs');
const url = require('url');
const qs = require('querystring');

// Annotation handling code
const handleAnnotationLoad = (fileLocation, response) => {
  fs.readFile(fileLocation, (err, data) => {
    if (err) {
      // file doesn't exist or can't read for some reason
      response.statusCode = 204;
      response.end();
    } else {
      // returns contents of existing xfdf
      response.setHeader('Content-Type', 'text/xml');
      response.write(data.toString());
      response.end();
    }
  });
};

const handleAnnotationSave = (fileLocation, request, response) => {
  let body = '';
  request.on('data', (data) => {
    body += data;
  }).on('end', () => {
    const post = qs.parse(body);
    fs.writeFile(fileLocation, post.data, (err) => {
      if (err) {
        response.statusCode = 500;
      }
      response.end();
    });
  });
};

const folderName = 'annotations';

const handleAnnotationRequest = (request, response) => {
  const parsedUrl = url.parse(request.url);
  const queryParams = qs.parse(parsedUrl.query);

  // if a document id is specified then use a different filename for each id
  const fileName = queryParams.did || 'default';
  const filePath = folderName + '/' + fileName + '.xfdf';

  fs.mkdir(folderName, () => {
    if (request.method === 'GET') {
      handleAnnotationLoad(filePath, response);
    } else if (request.method === 'POST') {
      handleAnnotationSave(filePath, request, response);
    }
  });
};


// Main Server Code
const port = 3000;

const requestHandler = (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');

  if (request.url.startsWith('/annotations')) {
    handleAnnotationRequest(request, response);
  }
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log(`server is listening on ${port}`);
});

