import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { WebViewerComponent } from './webviewer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild(WebViewerComponent) private webviewerComponent: WebViewerComponent;

  ngAfterViewInit() {
    this.listenToPageChange();
  }

  // shows how to listen to an event on the viewer element
  listenToPageChange(): void {
    this.webviewerComponent.getElement().addEventListener('pageChanged', function(e) {
      const [ pageNumber ] = e.detail;
      console.log('Current page is', pageNumber);
    });
  }

  getReaderControl(): any {
    return this.webviewerComponent.getWebViewer().getInstance();
  }

  // shows how to call a function on WebViewer instance
  loadDocument(): void {
    this.webviewerComponent.getWebViewer().loadDocument('https://pdftron.s3.amazonaws.com/downloads/pl/sheet_music.xod');
  }

  // shows how to call functions on APIs defined in the WebViewer iframe
  addAnnotation(): void {
    const viewerWindow = this.webviewerComponent.getWindow();

    const annotManager = this.getReaderControl().docViewer.getAnnotationManager();
    const rectangle = new viewerWindow.Annotations.RectangleAnnotation();
    rectangle.PageNumber = 1;
    rectangle.X = 100;
    rectangle.Y = 100;
    rectangle.Width = 250;
    rectangle.Height = 250;
    rectangle.Author = annotManager.getCurrentUser();
    annotManager.addAnnotation(rectangle);
    annotManager.drawAnnotations(rectangle.PageNumber);
  }

  // shows how to call a function that was defined in config.js
  rotatePages(): void {
    const viewerWindow = this.webviewerComponent.getWindow();
    viewerWindow.rotatePages();
  }
}
