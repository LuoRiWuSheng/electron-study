//  externalScriptSample.js
// This JavaScript file is an example of ReaderControl customizations located in an isolated file.
// This file can be hosted externally if defined as a full URL path in ReaderControlConfig.js

/**
 * Add an about button to the tool bar that pops up
 * a dialog with viewer branding and information.
 */
var container = $('<div>').addClass('group');
$('#control .right-aligned').append(container);

var button = $('<span>').attr({
  'id': 'optionsButton',
  'class': 'glyphicons circle_info'
})
  .on('click', function() {
    var message = '<div style="margin: 5px 0"><img src="//www.pdftron.com/assets/images/logos/pdftron_logo.gif"></div>';
    message += '<div>WebViewer HTML5 Version ' + readerControl.docViewer.version + '<br/><a href="http://www.pdftron.com" target="_blank">www.pdftron.com</a></div>';
    message += '<p>The ReaderControl is a full-featured and customizable web component extended from the PDFNet WebViewer library.</p>';


    $.alert(message, 'About ReaderControl');
  });

container.append(button);