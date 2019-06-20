// check if IE10 or older
if (navigator.appVersion.indexOf('MSIE') > -1) {
  alert('This sample is built around the new UI, which is not supported in your browser. We will redirect you to "Viewing with legacy UI" sample');
  window.location.replace('../../viewing/viewing-with-legacy-ui');
}