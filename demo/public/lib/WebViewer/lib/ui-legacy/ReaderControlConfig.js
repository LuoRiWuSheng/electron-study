/**
 * ReaderControl config file
 * ------------------------------
 * This js file is meant to simplify configuring commonly used settings for ReaderControl.
 * For advanced customizations, feel free to modify ReaderControl.js directly.
 */


/**
 *Static configuration options for ReaderControl
 *@name ReaderControl.config
 *@static
 *@property {string} customScript a URL path to a custom JavaScript file that is loaded through ajax.
 *@property {string} customStyle a URL path to a custom CSS file that is loaded through ajax.
 *@property {string} defaultUser the Author name that is set for every annotation created by this client if "user" is not specified in the query parameter.
 *@property {string} serverURL a URL path to a server handler for annotation loading and saving.
 *@property {object} ui Static UI configuration options for ReaderControl.
 *@property {boolean} [ui.hideSidePanel=false] hides the side panel
 *@property {boolean} [ui.hideAnnotationPanel=false] hides the side panel's annotation tab
 *@property {boolean} [ui.hideControlBar=false] hides the top control bar
 *@property {boolean} [ui.hideDisplayModes=false] hides the display mode dropdown button in the control bar
 *@property {boolean} [ui.hideZoom=false] hides the zoom selection controls in the control bar
 *@property {boolean} [ui.hideTextSearch=false] hides the text search controls in the control bar
 *@property {boolean} [ui.hidePrint=false] hides the print button
 *@example Usage: define these static properties before creating a new instance of ReaderControl
 */
ReaderControl.config = {
  // customScript : 'defaultScriptExtension.js',
  // customStyle : 'defaultStyleExtension.css',
  serverURL: 'annotationHandler.php', // The server-side script that handles saving/loading of annotations
  defaultUser: 'Guest' // The default username for annotations created
};

ReaderControl.config.ui = {
  //    // main UI elements
  hideAnnotationPanel: false,
  hideControlBar: false,
  hideSidePanel: false,

  // UI subelements
  hideDisplayModes: false,
  hideZoom: false,
  hideTextSearch: false,
  hidePrint: false
};