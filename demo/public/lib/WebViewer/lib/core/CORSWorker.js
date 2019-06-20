/* eslint-env worker */
function getWorkerParams(src) {
  var params = {};
  var search = decodeURIComponent(src.slice(1));
  var definitions = search.split('&');
  definitions.forEach(function(val) {
    var parts = val.split('=', 2);
    params[parts[0]] = parts[1];
  });
  return params;
}

var params = getWorkerParams(self.location.search);
if (params.path) {
  self.workerBasePath = params.path;
  self.pdfWorkerPath = params.path + 'pdf/';
  self.officeWorkerPath = params.path + 'office/';
}

importScripts(params.file);