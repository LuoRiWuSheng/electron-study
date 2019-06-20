

((exports) => {
  'use strict';

  exports.runElementBuilderTest = () => {
    const main = async() => {
      let ret = 0;

      // Relative path to the folder containing test files.
      const inputUrl = '../TestFiles/';

      try {
        const doc = await PDFNet.PDFDoc.create();

        // ElementBuilder is used to build new Element objects
        const eb = await PDFNet.ElementBuilder.create();
        // ElementWriter is used to write Elements to the page
        const writer = await PDFNet.ElementWriter.create();

        let element;
        let gstate;

        // Start a new page ------------------------------------

        const pageRect = await PDFNet.Rect.init(0, 0, 612, 794);
        let page = await doc.pageCreate(pageRect);

        // begin writing to the page
        writer.beginOnPage(page);

        // Create an Image that can be reused in the document or on the same page.
        const img = await PDFNet.Image.createFromURL(doc, inputUrl + 'peppers.jpg');

        element = await eb.createImageFromMatrix(img, await PDFNet.Matrix2D.create((await img.getImageWidth()) / 2, -145, 20, (await img.getImageHeight()) / 2, 200, 150));
        writer.writePlacedElement(element);

        // use the same image (just change its matrix)
        gstate = await element.getGState();
        gstate.setTransform(200, 0, 0, 300, 50, 450);
        writer.writePlacedElement(element);

        // use the same image again (just change its matrix).
        writer.writePlacedElement(await eb.createImageScaled(img, 300, 600, 200, -150));

        writer.end(); // save changes to the current page
        doc.pagePushBack(page);

        // Start a new page ------------------------------------
        // Construct and draw a path object using different styles
        page = await doc.pageCreate(pageRect);

        // begin writing to this page
        writer.beginOnPage(page);
        // Reset the GState to default
        eb.reset();

        // start constructing the path
        eb.pathBegin();
        eb.moveTo(306, 396);
        eb.curveTo(681, 771, 399.75, 864.75, 306, 771);
        eb.curveTo(212.25, 864.75, -69, 771, 306, 396);
        eb.closePath();
        // the path is now finished
        element = await eb.pathEnd();
        // the path should be filled
        element.setPathFill(true);

        // Set the path color space and color
        gstate = await element.getGState();
        gstate.setFillColorSpace(await PDFNet.ColorSpace.createDeviceCMYK());
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0, 0)); // cyan
        gstate.setTransform(0.5, 0, 0, 0.5, -20, 300);
        writer.writePlacedElement(element);

        // Draw the same path using a different stroke color
        // this path is should be filled and stroked
        element.setPathStroke(true);
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(0, 0, 1, 0)); // yellow
        gstate.setStrokeColorSpace(await PDFNet.ColorSpace.createDeviceRGB());
        gstate.setStrokeColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0)); // red
        gstate.setTransform(0.5, 0, 0, 0.5, 280, 300);
        gstate.setLineWidth(20);
        writer.writePlacedElement(element);

        // Draw the same path with with a given dash pattern
        // this path is should be only stroked
        element.setPathFill(false);
        gstate.setStrokeColorWithColorPt(await PDFNet.ColorPt.init(0, 0, 1)); // blue
        gstate.setTransform(0.5, 0, 0, 0.5, 280, 0);
        const dashPattern = [];
        dashPattern.push(30);
        gstate.setDashPattern(dashPattern, 0);
        writer.writePlacedElement(element);

        // Use the path as a clipping path
        // Save the graphics state
        writer.writeElement(await eb.createGroupBegin());
        // Start constructing the new path (the old path was lost when we created
        // a new Element using CreateGroupBegin()).
        eb.pathBegin();
        eb.moveTo(306, 396);
        eb.curveTo(681, 771, 399.75, 864.75, 306, 771);
        eb.curveTo(212.25, 864.75, -69, 771, 306, 396);
        eb.closePath();
        // path is now constructed
        element = await eb.pathEnd();
        // this path is a clipping path
        element.setPathClip(true);
        // this path should be filled and stroked
        element.setPathStroke(true);
        gstate = await element.getGState();
        gstate.setTransform(0.5, 0, 0, 0.5, -20, 0);

        writer.writeElement(element);

        writer.writeElement(await eb.createImageScaled(img, 100, 300, 400, 600));

        // Restore the graphics state
        writer.writeElement(await eb.createGroupEnd());

        writer.end(); // save changes to the current page
        doc.pagePushBack(page);


        // Start a new page ------------------------------------
        page = await doc.pageCreate(pageRect);

        // begin writing to this page
        writer.beginOnPage(page);
        // Reset the GState to default
        eb.reset();

        // Begin writing a block of text
        element = await eb.createTextBeginWithFont(await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_times_roman), 12);
        writer.writeElement(element);

        element = await eb.createNewTextRun('Hello World!');
        element.setTextMatrixEntries(10, 0, 0, 10, 0, 600);
        gstate = await element.getGState();
        // Set the spacing between lines
        gstate.setLeading(15);
        writer.writeElement(element);

        writer.writeElement(await eb.createTextNewLine()); // New line

        element = await eb.createNewTextRun('Hello World!');
        gstate = await element.getGState();
        gstate.setTextRenderMode(PDFNet.GState.TextRenderingMode.e_stroke_text);
        gstate.setCharSpacing(-1.25);
        gstate.setWordSpacing(-1.25);
        writer.writeElement(element);

        writer.writeElement(await eb.createTextNewLine()); // New line

        element = await eb.createNewTextRun('Hello World!');
        gstate = await element.getGState();
        gstate.setCharSpacing(0);
        gstate.setWordSpacing(0);
        gstate.setLineWidth(3);
        gstate.setTextRenderMode(PDFNet.GState.TextRenderingMode.e_fill_stroke_text);
        gstate.setStrokeColorSpace(await PDFNet.ColorSpace.createDeviceRGB());
        gstate.setStrokeColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0)); // red
        gstate.setFillColorSpace(await PDFNet.ColorSpace.createDeviceCMYK());
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0, 0)); // cyan
        writer.writeElement(element);


        writer.writeElement(await eb.createTextNewLine()); // New line

        // Set text as a clipping path to the image.
        element = await eb.createNewTextRun('Hello World!');
        gstate = await element.getGState();
        gstate.setTextRenderMode(PDFNet.GState.TextRenderingMode.e_clip_text);
        writer.writeElement(element);

        // Finish the block of text
        writer.writeElement(await eb.createTextEnd());

        // Draw an image that will be clipped by the above text
        writer.writeElement(await eb.createImageScaled(img, 10, 100, 1300, 720));

        writer.end(); // save changes to the current page
        doc.pagePushBack(page);

        // Start a new page ------------------------------------
        //
        // The example also shows how ElementReader can be used to copy and modify
        // Elements between pages.

        const reader = await PDFNet.ElementReader.create();

        // Start reading Elements from the last page. We will copy all Elements to
        // a new page but will modify the font associated with text.
        reader.beginOnPage(await doc.getPage(await doc.getPageCount()));

        page = await doc.pageCreate(await PDFNet.Rect.init(0, 0, 1300, 794));

        // begin writing to this page
        writer.beginOnPage(page);
        // Reset the GState to default
        eb.reset();

        const font = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica);

        // Read page contents
        while ((element = await reader.next())) {
          if ((await element.getType()) === PDFNet.Element.Type.e_text) {
            (await element.getGState()).setFont(font, 14);
          }

          writer.writeElement(element);
        }

        reader.end();
        writer.end(); // save changes to the current page

        doc.pagePushBack(page);


        // Start a new page ------------------------------------
        //
        // The example also shows how ElementReader can be used to copy and modify
        // Elements between pages.

        // Start reading Elements from the last page. We will copy all Elements to
        // a new page but will modify the font associated with text.
        reader.beginOnPage(await doc.getPage(await doc.getPageCount()));

        page = await doc.pageCreate(await PDFNet.Rect.init(0, 0, 1300, 794));

        // begin writing to this page
        writer.beginOnPage(page);
        // Reset the GState to default
        eb.reset();

        // Embed an external font in the document.
        // MISSING createType1Font
        // Font font2 = Font::CreateType1Font(doc, (inputUrl + "Misc-Fixed.pfa").c_str());
        const font2 = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_courier_bold);

        // Read page contents
        while ((element = await reader.next())) {
          if ((await element.getType()) === PDFNet.Element.Type.e_text) {
            (await element.getGState()).setFont(font2, 16);
          }
          writer.writeElement(element);
        }

        reader.end();
        writer.end(); // save changes to the current page
        doc.pagePushBack(page);


        // Start a new page ------------------------------------
        page = await doc.pageCreate();
        // begin writing to this page
        writer.beginOnPage(page);
        // Reset the GState to default
        eb.reset();

        // Begin writing a block of text
        element = await eb.createTextBeginWithFont(await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_times_roman), 12);
        element.setTextMatrixEntries(1.5, 0, 0, 1.5, 50, 600);
        // Set the spacing between lines
        (await element.getGState()).setLeading(15);
        writer.writeElement(element);


        const para = 'A PDF text object consists of operators that can show ' +
                        'text strings, move the text position, and set text state and certain ' +
                        'other parameters. In addition, there are three parameters that are ' +
                        'defined only within a text object and do not persist from one text ' +
                        'object to the next: Tm, the text matrix, Tlm, the text line matrix, ' +
                        'Trm, the text rendering matrix, actually just an intermediate result ' +
                        'that combines the effects of text state parameters, the text matrix ' +
                        '(Tm), and the current transformation matrix';

        const paraEnd = para.Length;
        let textRun = 0;
        let textRunEnd;

        const paraWidth = 300; // paragraph width is 300 units
        let curWidth = 0;

        while (textRun < paraEnd) {
          textRunEnd = para.indexOf(' ', textRun);
          if (textRunEnd < 0) {
            textRunEnd = paraEnd - 1;
          }

          let text = para.substring(textRun, textRunEnd - textRun + 1);
          element = await eb.createNewTextRun(text);
          if (curWidth + (await element.getTextLength()) < paraWidth) {
            writer.writeElement(element);
            curWidth += await element.getTextLength();
          } else {
            writer.writeElement(await eb.createTextNewLine()); // New line
            text = para.substr(textRun, textRunEnd - textRun + 1);
            element = await eb.createNewTextRun(text);
            curWidth = await element.getTextLength();
            writer.writeElement(element);
          }

          textRun = textRunEnd + 1;
        }

        // -----------------------------------------------------------------------
        // The following code snippet illustrates how to adjust spacing between
        // characters (text runs).
        element = await eb.createTextNewLine();
        writer.writeElement(element); // Skip 2 lines
        writer.writeElement(element);

        writer.writeElement(await eb.createNewTextRun('An example of space adjustments between inter-characters:'));
        writer.writeElement(await eb.createTextNewLine());

        // Write string "AWAY" without space adjustments between characters.
        element = await eb.createNewTextRun('AWAY');
        writer.writeElement(element);

        writer.writeElement(await eb.createTextNewLine());

        // Write string "AWAY" with space adjustments between characters.
        element = await eb.createNewTextRun('A');
        writer.writeElement(element);

        element = await eb.createNewTextRun('W');
        element.setPosAdjustment(140);
        writer.writeElement(element);

        element = await eb.createNewTextRun('A');
        element.setPosAdjustment(140);
        writer.writeElement(element);

        element = await eb.createNewTextRun('Y again');
        element.setPosAdjustment(115);
        writer.writeElement(element);

        // Draw the same strings using direct content output...
        writer.flush(); // flush pending Element writing operations.

        // You can also write page content directly to the content stream using
        // ElementWriter.WriteString(...) and ElementWriter.WriteBuffer(...) methods.
        // Note that if you are planning to use these functions you need to be familiar
        // with PDF page content operators (see Appendix A in PDF Reference Manual).
        // Because it is easy to make mistakes during direct output we recommend that
        // you use ElementBuilder and Element interface instead.

        writer.writeString('T* T* '); // Skip 2 lines
        writer.writeString('(Direct output to PDF page content stream:) Tj  T* ');
        writer.writeString('(AWAY) Tj T* ');
        writer.writeString('[(A)140(W)140(A)115(Y again)] TJ ');

        // Finish the block of text
        writer.writeElement(await eb.createTextEnd());

        writer.end(); // save changes to the current page
        doc.pagePushBack(page);

        // Start a new page ------------------------------------

        // Image Masks
        //
        // In the opaque imaging model, images mark all areas they occupy on the page as
        // if with opaque paint. All portions of the image, whether black, white, gray,
        // or color, completely obscure any marks that may previously have existed in the
        // same place on the page.
        // In the graphic arts industry and page layout applications, however, it is common
        // to crop or 'mask out' the background of an image and then place the masked image
        // on a different background, allowing the existing background to show through the
        // masked areas. This sample illustrates how to use image masks.

        page = await doc.pageCreate();
        // begin writing to the page
        writer.beginOnPage(page);


        // INVESTIGATE THIS SECTION

        // Create the Image Mask
        const embedFile = await PDFNet.Filter.createURLFilter(inputUrl + 'imagemask.dat');
        const maskRead = await PDFNet.FilterReader.create(embedFile);

        // INVESTIGATE THIS SECTION

        const deviceGray = await PDFNet.ColorSpace.createDeviceGray();
        const mask = await PDFNet.Image.createDirectFromStream(doc, maskRead, 64, 64, 1, deviceGray, PDFNet.Image.InputFilter.e_ascii_hex);

        (await mask.getSDFObj()).putBool('ImageMask', true);

        element = await eb.createRect(0, 0, 612, 794);
        element.setPathStroke(false);
        element.setPathFill(true);
        gstate = await element.getGState();

        gstate.setFillColorSpace(deviceGray);
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(0.8));
        writer.writePlacedElement(element);

        element = await eb.createImageFromMatrix(mask, await PDFNet.Matrix2D.create(200, 0, 0, -200, 40, 680));
        (await element.getGState()).setFillColorWithColorPt(await PDFNet.ColorPt.init(0.1));
        writer.writePlacedElement(element);

        gstate = await element.getGState();
        gstate.setFillColorSpace(await PDFNet.ColorSpace.createDeviceRGB());
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0));
        element = await eb.createImageFromMatrix(mask, await PDFNet.Matrix2D.create(200, 0, 0, -200, 320, 680));
        writer.writePlacedElement(element);

        (await element.getGState()).setFillColorWithColorPt(await PDFNet.ColorPt.init(0, 1, 0));
        element = await eb.createImageFromMatrix(mask, await PDFNet.Matrix2D.create(200, 0, 0, -200, 40, 380));
        writer.writePlacedElement(element);

        {
          // This sample illustrates Explicit Masking.
          const img = await PDFNet.Image.createFromURL(doc, (inputUrl + 'peppers.jpg'));

          // mask is the explicit mask for the primary (base) image
          img.setMask(mask);

          element = await eb.createImageFromMatrix(img, await PDFNet.Matrix2D.create(200, 0, 0, -200, 320, 380));
          writer.writePlacedElement(element);
        }

        writer.end(); // save changes to the current page
        doc.pagePushBack(page);

        // Transparency sample ----------------------------------

        // Start a new page -------------------------------------
        page = await doc.pageCreate();
        // begin writing to this page
        writer.beginOnPage(page);
        // Reset the GState to default
        eb.reset();

        // Write some transparent text at the bottom of the page.
        element = await eb.createTextBeginWithFont(await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_times_roman), 100);

        // Set the text knockout attribute. Text knockout must be set outside of
        // the text group.
        gstate = await element.getGState();
        gstate.setTextKnockout(false);
        gstate.setBlendMode(PDFNet.GState.BlendMode.e_bl_difference);
        writer.writeElement(element);

        element = await eb.createNewTextRun('Transparency');
        element.setTextMatrixEntries(1, 0, 0, 1, 30, 30);
        gstate = await element.getGState();
        gstate.setFillColorSpace(await PDFNet.ColorSpace.createDeviceCMYK());
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0, 0));

        gstate.setFillOpacity(0.5);
        writer.writeElement(element);

        // Write the same text on top the old; shifted by 3 points
        element.setTextMatrixEntries(1, 0, 0, 1, 33, 33);
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(0, 1, 0, 0));
        gstate.setFillOpacity(0.5);

        writer.writeElement(element);
        writer.writeElement(await eb.createTextEnd());

        // Draw three overlapping transparent circles.
        // start constructing the path
        eb.pathBegin();
        eb.moveTo(459.223, 505.646);
        eb.curveTo(459.223, 415.841, 389.85, 343.04, 304.273, 343.04);
        eb.curveTo(218.697, 343.04, 149.324, 415.841, 149.324, 505.646);
        eb.curveTo(149.324, 595.45, 218.697, 668.25, 304.273, 668.25);
        eb.curveTo(389.85, 668.25, 459.223, 595.45, 459.223, 505.646);
        element = await eb.pathEnd();
        element.setPathFill(true);

        gstate = await element.getGState();
        gstate.setFillColorSpace(await PDFNet.ColorSpace.createDeviceRGB());
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(0, 0, 1)); // Blue Circle

        gstate.setBlendMode(PDFNet.GState.BlendMode.e_bl_normal);
        gstate.setFillOpacity(0.5);
        writer.writeElement(element);

        // Translate relative to the Blue Circle
        gstate.setTransform(1, 0, 0, 1, 113, -185);
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(0, 1, 0)); // Green Circle
        gstate.setFillOpacity(0.5);
        writer.writeElement(element);

        // Translate relative to the Green Circle
        gstate.setTransform(1, 0, 0, 1, -220, 0);
        gstate.setFillColorWithColorPt(await PDFNet.ColorPt.init(1, 0, 0)); // Red Circle
        gstate.setFillOpacity(0.5);
        writer.writeElement(element);

        writer.end(); // save changes to the current page
        doc.pagePushBack(page);

        // End page ------------------------------------

        const docBuffer = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_remove_unused);
        saveBufferAsPDFDoc(docBuffer, 'element_builder.pdf');

        console.log('Done. Result saved in element_builder.pdf...');
      } catch (e) {
        console.log(e);
        ret = 1;
      }
      return ret;
    };


    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=ElementBuilderTest.js