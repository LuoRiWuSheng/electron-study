Get Started with WebViewer and Cordova

1) Learn about using Cordova from the command line here: https://cordova.apache.org/docs/en/latest/guide/cli/index.html
Note that this sample has a basic set up assuming that you are using Windows!  If you are using another platform then use cordova to create a new project and then replace the www/index.html file with the one in this sample.

2) Copy a XOD document into the www folder and make sure that it is referenced correctly from index.html.  By default index.html is looking for GettingStarted.xod so simply change this to the name of your file.

3) Copy WebViewer.min.js and the html5 folder from the WebViewer download into the www/js folder.

4) From the command line navigate to the cordova sample folder (the one where this README file is located) and add a platform by running the command "cordova platform add android" for example.

5) Run "cordova build" from the command line and it will copy the necessary files to the platform folders.

6) Run "cordova emulate android" to run the emulator or use your IDE of choice.