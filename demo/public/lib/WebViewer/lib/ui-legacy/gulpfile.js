// This gulpfile (http://gulpjs.com/) can be used to create a minified build of the HTML5 viewer
// If you are adding/removing extra scripts then make sure to add/remove them from this file as well
// To use:
// 1. Install node.js (http://nodejs.org/)
// 2. Open a command window in this directory and run "npm install"
// 3. Install gulp globally using "npm install -g gulp"
// 4. Run the command "gulp"
// 5. Once this is complete there will be a lib/html5-min directory.
//    Add the option html5Path: "html5-min/ReaderControl.html" and html5MobilePath: "html5-min/MobileReaderControl.html" to your WebViewer options

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var minifyHTML = require('gulp-minify-html');
var replace = require('gulp-replace');
var del = require('del');
var runSequence = require('run-sequence');

var recursive = '/**/*.*';
var input = '../ui-legacy';
var output = '../ui-legacy-min';

// paths to input files
var paths = {
  externalScripts: [input + '/external/jquery-3.2.1.min.js', input + '/external/jquery-ui/jquery-ui-1.11.1.custom.min.js', input + '/external/jquery.treeview.js',
    input + '/external/jquery.mousewheel.js', input + '/external/jquery.flexibleArea.js', input + '/external/moment.min.js', input + '/external/i18next-1.6.0.min.js',
    input + '/external/modernizr.custom.js', input + '/external/drop/drop.min.js', input + '/external/Autolinker.min.js', input + '/external/context.js', input + '/external/html2canvas.min.js'
  ],

  mobileExternalScripts: [input + '/external/jquery-3.2.1.min.js', input + '/external/jquery-migrate-3.0.0.min.js', input + '/mobileSetup.js', input + '/external/jquery.mobile/jquery.mobile-1.4.4.min.js', input + '/external/i18next-1.6.0.min.js',
    input + 'external/jquery.doubletap.js', input + '/external/fastclick.js', input + '/external/touchr.js', input + '/external/modernizr.custom.js', input + '/external/drop/drop.min.js', input + '/external/html2canvas.min.js'
  ],

  readerControlScripts: [input + '/WebViewerInterface.js', input + '/ControlUtils.js', input + '/AnnotationEdit.js', input + '/NotesPanel.js', input + '/BaseReaderControl.js',
    input + '/ReaderControl.js', input + '/ReaderControlConfig.js'
  ],

  mobileReaderControlScripts: [input + '/WebViewerInterface.js', input + '/ControlUtils.js', input + '/BaseReaderControl.js', input + '/MobileReaderControl.js', input + '/ReaderControlConfig.js'],

  viewerCSS: [input + '/external/jquery.treeview.css', input + '/ReaderControl.css', input + '/docViewer.css', input + '/AnnotationEdit.css', input + '/external/drop/css/drop-theme-basic.css',
    input + '/external/drop/css/drop-theme-arrows.css', input + '/external/drop/css/drop-theme-arrows-bounce.css', input + '/external/context.standalone.css'
  ],

  mobileViewerCSS: [input + '/MobileReaderControl.css', input + '/external/jquery.mobile/jquery.mobile-1.4.4.min.css', input + '/external/drop/css/drop-theme-basic.css',
    input + '/external/drop/css/drop-theme-arrows.css', input + '/external/drop/css/drop-theme-arrows-bounce.css'
  ],

  iconsCSS: [input + '/Resources/icons/css/glyphicons.css', input + '/Resources/icons/css/customicons.css', input + '/Resources/icons/css/controls.css'],

  readerControlHTML: [input + '/ReaderControl.html'],

  mobileReaderControlHTML: [input + '/MobileReaderControl.html'],

  pdfScripts: [input + '/pdf/PDFReaderControl.js'],

  pdfCSS: [input + '/pdf/PDFReaderControl.css']
};

// output file locations
var outputs = {
  externaljs: 'external.min.js',
  externaljsPath: 'external',

  mobileExternaljs: 'mobileExternal.min.js',
  mobileExternaljsPath: 'external',

  readerControljs: 'ReaderControl.min.js',
  readerControljsPath: '.',

  mobileReaderControljs: 'MobileReaderControl.min.js',
  mobileReaderControljsPath: '.',

  viewerCSS: 'viewer.min.css',
  viewerCSSPath: 'external',

  mobileViewerCSS: 'mobileViewer.min.css',
  mobileViewerCSSPath: 'external/jquery.mobile',

  iconsCSS: 'icons.min.css',
  iconsCSSPath: 'Resources/icons/css',

  pdfPath: 'pdf'
};

var replaceResources = function(name, finalName) {
  var type = name.split('-').pop();

  var output = finalName ? type + "Files.push('" + finalName + "');" : '';

  return replace(new RegExp('\\/\\* build:' + name + ' \\*\\/[\\s\\S]+?\\/\\* endbuild \\*\\/'), output);
};

gulp.task('external-scripts', function() {
  return gulp.src(paths.externalScripts)
    .pipe(concat(outputs.externaljs))
    .pipe(uglify())
    .pipe(gulp.dest(output + '/' + outputs.externaljsPath));
});

gulp.task('mobile-external-scripts', function() {
  return gulp.src(paths.mobileExternalScripts)
    .pipe(concat(outputs.mobileExternaljs))
    .pipe(uglify())
    .pipe(gulp.dest(output + '/' + outputs.mobileExternaljsPath));
});

gulp.task('readercontrol-scripts', function() {
  return gulp.src(paths.readerControlScripts)
    .pipe(concat(outputs.readerControljs))
    .pipe(uglify())
    .pipe(gulp.dest(output + '/' + outputs.readerControljsPath));
});

gulp.task('mobile-readercontrol-scripts', function() {
  return gulp.src(paths.mobileReaderControlScripts)
    .pipe(concat(outputs.mobileReaderControljs))
    .pipe(uglify())
    .pipe(gulp.dest(output + '/' + outputs.mobileReaderControljsPath));
});

gulp.task('pdf-scripts', function() {
  return gulp.src(paths.pdfScripts)
    .pipe(uglify())
    .pipe(gulp.dest(output + '/' + outputs.pdfPath));
});

gulp.task('viewer-css', function() {
  return gulp.src(paths.viewerCSS)
    .pipe(concat(outputs.viewerCSS))
    .pipe(minifyCSS())
    .pipe(gulp.dest(output + '/' + outputs.viewerCSSPath));
});

gulp.task('mobile-viewer-css', function() {
  return gulp.src(paths.mobileViewerCSS)
    .pipe(concat(outputs.mobileViewerCSS))
    .pipe(minifyCSS())
    .pipe(gulp.dest(output + '/' + outputs.mobileViewerCSSPath));
});

gulp.task('icons-css', function() {
  return gulp.src(paths.iconsCSS)
    .pipe(concat(outputs.iconsCSS))
    .pipe(minifyCSS())
    .pipe(gulp.dest(output + '/' + outputs.iconsCSSPath));
});

gulp.task('pdf-css', function() {
  return gulp.src(paths.pdfCSS)
    .pipe(minifyCSS())
    .pipe(gulp.dest(output + '/' + outputs.pdfPath));
});

gulp.task('update-tags-html', function() {
  return gulp.src(paths.readerControlHTML)
    .pipe(replaceResources('icons-css', outputs.iconsCSSPath + '/' + outputs.iconsCSS))
    .pipe(replaceResources('viewer-css', outputs.viewerCSSPath + '/' + outputs.viewerCSS))
    .pipe(replaceResources('external-js', outputs.externaljsPath + '/' + outputs.externaljs))
    .pipe(replaceResources('readercontrol-js', outputs.readerControljsPath + '/' + outputs.readerControljs))
    .pipe(minifyHTML())
    .pipe(gulp.dest(output));
});

gulp.task('mobile-update-tags-html', function() {
  return gulp.src(paths.mobileReaderControlHTML)
    .pipe(replaceResources('icons-css', outputs.iconsCSSPath + '/' + outputs.iconsCSS))
    .pipe(replaceResources('viewer-css', outputs.mobileViewerCSSPath + '/' + outputs.mobileViewerCSS))
    .pipe(replaceResources('external-js', outputs.mobileExternaljsPath + '/' + outputs.mobileExternaljs))
    .pipe(replaceResources('readercontrol-js', outputs.mobileReaderControljsPath + '/' + outputs.mobileReaderControljs))
    .pipe(minifyHTML())
    .pipe(gulp.dest(output));
});

gulp.task('copy-files', function() {
  // exclude everything in the paths because they're going to be concatenated into separate files
  var excludedFiles = [];
  for (var pathList in paths) {
    var files = paths[pathList];
    // excluded files should have an exclamation mark at the start
    var excludedRules = files.map(function(fileName) {
      return '!' + fileName;
    });

    excludedFiles = excludedFiles.concat(excludedRules);
  }

  excludedFiles.push('!' + input + '/doc' + recursive);
  excludedFiles.push('!' + input + '/external/drop' + recursive);
  excludedFiles = excludedFiles.concat([ '!gulpfile.js', '!legal.txt', '!package-lock.json', '!package.json' ]);

  return gulp.src([input + recursive, input + '/**/.*'].concat(excludedFiles))
    .pipe(gulp.dest(output));
});

gulp.task('clean', function(callback) {
  del(output, callback);
});

gulp.task('build', function() {
  // make sure that clean happens first before everything else
  runSequence('clean', ['copy-files', 'external-scripts', 'mobile-external-scripts', 'readercontrol-scripts', 'mobile-readercontrol-scripts', 'pdf-scripts',
    'viewer-css', 'mobile-viewer-css', 'icons-css', 'pdf-css', 'update-tags-html', 'mobile-update-tags-html'
  ]);
});

gulp.task('default', ['build']);