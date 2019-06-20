//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runAnnotationTest = async() => {
    const PDFNet = exports.PDFNet;
    const AnnotationLowLevelAPI = async(doc) => {
      try {
        await PDFNet.startDeallocateStack(); // start stack-based deallocation. All objects will be deallocated by end of function
        console.log('running LowLevelAPI');
        const itr = await doc.getPageIterator(1);
        const page = await itr.current();

        let annots = await page.getAnnots();

        if (annots == null) {
          // If there are no annotations, create a new annotation
          // array for the page.
          annots = await doc.createIndirectArray();
          const sdfDoc = await page.getSDFObj();
          await sdfDoc.put('Annots', annots);
        }

        // Create a Text annotation
        const annot = await doc.createIndirectDict();
        await annot.putName('Subtype', 'Text');
        await annot.putBool('Open', true);
        await annot.putString('Contents', 'The quick brown fox ate the lazy mouse.');
        await annot.putRect('Rect', 266, 116, 430, 204);

        // Insert the annotation in the page annotation array
        await annots.pushBack(annot);

        // Create a Link annotation
        const link1 = await doc.createIndirectDict();
        await link1.putName('Subtype', 'Link');
        const dest = await PDFNet.Destination.createFit((await doc.getPage(2)));
        await link1.put('Dest', (await dest.getSDFObj()));
        await link1.putRect('Rect', 85, 705, 503, 661);
        await annots.pushBack(link1);

        // Create another Link annotation
        const link2 = await doc.createIndirectDict();
        await link2.putName('Subtype', 'Link');
        const dest2 = await PDFNet.Destination.createFit((await doc.getPage(3)));
        await link2.put('Dest', (await dest2.getSDFObj()));
        await link2.putRect('Rect', 85, 638, 503, 594);
        await annots.pushBack(link2);

        // link2 = annots.GetAt(annots.Size()-1);
        const tenthPage = await doc.getPage(10);
        // XYZ destination stands for 'left', 'top' and 'zoom' coordinates
        const XYZDestination = await PDFNet.Destination.createXYZ(tenthPage, 100, 722, 10);
        await link2.put('Dest', (await XYZDestination.getSDFObj()));

        // Create a third link annotation with a hyperlink action (all other
        // annotation types can be created in a similar way)
        const link3 = await doc.createIndirectDict();
        await link3.putName('Subtype', 'Link');
        await link3.putRect('Rect', 85, 570, 503, 524);

        // Create a URI action
        const action = await link3.putDict('A');
        await action.putName('S', 'URI');
        await action.putString('URI', 'http://www.pdftron.com');

        await annots.pushBack(link3);
        console.log('AnnotationLowLevel Done.');
        await PDFNet.endDeallocateStack();
      } catch (err) {
        console.log(err);
      }
    };

    const AnnotationHighLevelAPI = async(doc) => {
      await PDFNet.startDeallocateStack(); // start stack-based deallocation. All objects will be deallocated by end of function
      let firstPage = await doc.getPage(1);

      // The following code snippet traverses all annotations in the document
      console.log('Traversing all annotations in the document...');

      // let firstPage = await doc.getPage(1);

      let pageNum = 0;
      const itr = await doc.getPageIterator(1);
      for (itr; (await itr.hasNext()); (await itr.next())) {
        pageNum += 1;
        console.log('Page ' + pageNum + ': ');
        const page = await itr.current();
        const numAnnots = await page.getNumAnnots();
        for (let i = 0; i < numAnnots; ++i) {
          const annot = await page.getAnnot(i);
          if (!(await annot.isValid())) {
            continue;
          }

          const annotSDF = await annot.getSDFObj();
          const subType = await annotSDF.get('Subtype');
          const subTypeVal = await subType.value();

          let outputString = 'Annot Type: ' + (await subTypeVal.getName());

          const bbox = await annot.getRect();
          outputString += ';  Position: ' + bbox.x1 + ', ' + bbox.y1 + ', ' + bbox.x2 + ', ' + bbox.y2;
          console.log(outputString);
          const annotType = await annot.getType();
          switch (annotType) {
            case PDFNet.Annot.Type.e_Link:
              {
                const link = await PDFNet.LinkAnnot.createFromAnnot(annot);
                const action = await link.getAction();
                if (!(await action.isValid())) {
                  continue;
                }

                if ((await action.getType()) === PDFNet.Action.Type.e_GoTo) {
                  const dest = await action.getDest();
                  if (!(await dest.isValid())) {
                    console.log('  Destination is not valid');
                  } else {
                    const pageNumOut = await (await dest.getPage()).getIndex();
                    console.log('  Links to: page number ' + pageNumOut + ' in this document');
                  }
                } else if ((await action.getType()) === PDFNet.Action.Type.e_URI) {
                  const SDFObj = await action.getSDFObj();
                  const URI = await SDFObj.get('URI');
                  const URIval = await URI.value();
                  const URIText = await URIval.getAsPDFText(); // An Exception is thrown if this is not a Obj::Type::e_string.
                  console.log(' Links to: ' + URIText); // Other get methods such as getNumber do not work either, although some do, so confusing.
                  // deallocate dictionary object on C side
                  URI.destroy();
                }
              }
              break;
            case PDFNet.Annot.Type.e_Widget:
              break;
            case PDFNet.Annot.Type.e_FileAttachment:
              break;
            default:
              break;
          }

          await subType.destroy();
        }
      }
      // create a hyperlink
      firstPage = await doc.getPage(1);
      const createURIAction = await PDFNet.Action.createURI(doc, 'http://www.pdftron.com');
      const linkRect = new PDFNet.Rect(85, 570, 503, 524);
      const hyperlink = await PDFNet.LinkAnnot.create(doc, linkRect);
      await hyperlink.setAction(createURIAction);
      await firstPage.annotPushBack(hyperlink);

      // Create an intra-document link...
      const page3 = await doc.getPage(3);
      const gotoPage3 = await PDFNet.Action.createGoto(await PDFNet.Destination.createFitH(page3, 0));
      const link = await PDFNet.LinkAnnot.create(doc, (new PDFNet.Rect(85, 458, 503, 502)));
      await link.setAction(gotoPage3);

      // Set the annotation border width to 3 points...
      const borderStyle = await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 3, 0, 0);
      link.setBorderStyle(borderStyle, false); // default false
      const greenColorPt = await PDFNet.ColorPt.init(0, 0, 1, 0);
      await link.setColorDefault(greenColorPt);
      await firstPage.annotPushBack(link);

      // Create a stamp annotation ...
      const stamp = await PDFNet.RubberStampAnnot.create(doc, (new PDFNet.Rect(30, 30, 300, 200)));
      await stamp.setIconName('Draft');
      await firstPage.annotPushBack(stamp);


      const ink = await PDFNet.InkAnnot.create(doc, (new PDFNet.Rect(110, 10, 300, 200)));
      const pt3 = new PDFNet.Point(110, 10);
      await ink.setPoint(0, 0, pt3);
      pt3.x = 150;
      pt3.y = 50;
      await ink.setPoint(0, 1, pt3);
      pt3.x = 190;
      pt3.y = 60;
      await ink.setPoint(0, 2, pt3);
      pt3.x = 180;
      pt3.y = 90;
      await ink.setPoint(1, 0, pt3);
      pt3.x = 190;
      pt3.y = 95;
      await ink.setPoint(1, 1, pt3);
      pt3.x = 200;
      pt3.y = 100;
      await ink.setPoint(1, 2, pt3);
      pt3.x = 166;
      pt3.y = 86;
      await ink.setPoint(2, 0, pt3);
      pt3.x = 196;
      pt3.y = 96;
      await ink.setPoint(2, 1, pt3);
      pt3.x = 221;
      pt3.y = 121;
      await ink.setPoint(2, 2, pt3);
      pt3.x = 288;
      pt3.y = 188;
      await ink.setPoint(2, 3, pt3);
      const cyanColorPt = await PDFNet.ColorPt.init(0, 1, 1, 0);
      await ink.setColor(cyanColorPt, 3);
      firstPage.annotPushBack(ink);

      await PDFNet.endDeallocateStack();
    };

    const CreateTestAnnots = async(doc) => {
      await PDFNet.startDeallocateStack();
      const ew = await PDFNet.ElementWriter.create(); // elementWriter
      const eb = await PDFNet.ElementBuilder.create(); // elementBuilder
      let element;

      const firstPage = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      doc.pagePushBack(firstPage);
      ew.beginOnPage(firstPage, PDFNet.ElementWriter.WriteMode.e_overlay, false); // begin writing to this page
      ew.end(); // save changes to the current page

      // NOTE: The following code represents three different ways to create a text annotation.
      {
        const txtannot = await PDFNet.FreeTextAnnot.create(doc, new PDFNet.Rect(10, 400, 160, 570));
        await txtannot.setContents('\n\nSome swift brown fox snatched a gray hare out of the air by freezing it with an angry glare.\n\nAha!\n\nAnd there was much rejoicing!');
        const solidLine = await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 1, 10, 20);
        await txtannot.setBorderStyle(solidLine, true);
        await txtannot.setQuaddingFormat(0);
        await firstPage.annotPushBack(txtannot);
        await txtannot.refreshAppearance();
      }

      {
        const txtannot = await PDFNet.FreeTextAnnot.create(doc, new PDFNet.Rect(100, 100, 350, 500));
        await txtannot.setContentRect(new PDFNet.Rect(200, 200, 350, 500));
        await txtannot.setContents('\n\nSome swift brown fox snatched a gray hare out of the air by freezing it with an angry glare.\n\nAha!\n\nAnd there was much rejoicing!');
        await txtannot.setCalloutLinePoints(new PDFNet.Point(200, 300), new PDFNet.Point(150, 290), new PDFNet.Point(110, 110));
        const solidLine = await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 1, 10, 20);
        await txtannot.setBorderStyle(solidLine, true);
        await txtannot.setEndingStyle(PDFNet.LineAnnot.EndingStyle.e_ClosedArrow);
        const greenColorPt = await PDFNet.ColorPt.init(0, 1, 0, 0);
        await txtannot.setColorDefault(greenColorPt); // default value of last param is 0
        await txtannot.setQuaddingFormat(1);
        await firstPage.annotPushBack(txtannot);
        await txtannot.refreshAppearance();
      }
      {
        const txtannot = await PDFNet.FreeTextAnnot.create(doc, new PDFNet.Rect(400, 10, 550, 400));
        await txtannot.setContents('\n\nSome swift brown fox snatched a gray hare out of the air by freezing it with an angry glare.\n\nAha!\n\nAnd there was much rejoicing!');
        const solidLine = await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 1, 10, 20);
        await txtannot.setBorderStyle(solidLine, true);
        const redColorPt = await PDFNet.ColorPt.init(0, 0, 1, 0);
        await txtannot.setColorDefault(redColorPt);
        await txtannot.setOpacity(0.2);
        await txtannot.setQuaddingFormat(2);
        await firstPage.annotPushBack(txtannot);
        await txtannot.refreshAppearance();
      }
      const page = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      doc.pagePushBack(page);
      await ew.beginOnPage(page, PDFNet.ElementWriter.WriteMode.e_overlay, false);
      await eb.reset(new PDFNet.GState('0'));
      await ew.end(); // save changes to the current page
      {
        // Create a Line annotation...
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(250, 250, 400, 400));
        await line.setStartPoint(new PDFNet.Point(350, 270));
        await line.setEndPoint(new PDFNet.Point(260, 370));
        await line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Square);
        await line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_Circle);
        const darkGreenColorPt = await PDFNet.ColorPt.init(0.3, 0.5, 0, 0);
        await line.setColor(darkGreenColorPt, 3);
        await line.setContents('Dashed Captioned');
        await line.setShowCaption(true);
        await line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        const dash = new Float64Array([2.0, 2.0]);
        const bStyle = await PDFNet.AnnotBorderStyle.createWithDashPattern(PDFNet.AnnotBorderStyle.Style.e_dashed, 2, 0, 0, dash);
        line.setBorderStyle(bStyle, false);
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(347, 377, 600, 600));
        await line.setStartPoint(new PDFNet.Point(385, 410));
        await line.setEndPoint(new PDFNet.Point(540, 555));
        await line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Circle);
        await line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_OpenArrow);
        const redColorPt = await PDFNet.ColorPt.init(1, 0, 0, 0);
        await line.setColor(redColorPt, 3);
        const greenColorPt = await PDFNet.ColorPt.init(0, 1, 0, 0);
        await line.setInteriorColor(greenColorPt, 3);
        await line.setContents('Inline Caption');
        await line.setShowCaption(true);
        await line.setCapPos(PDFNet.LineAnnot.CapPos.e_Inline);
        await line.setLeaderLineExtensionLength(-4.0);
        await line.setLeaderLineLength(-12);
        await line.setLeaderLineOffset(2.0);
        await line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(10, 400, 200, 600));
        await line.setStartPoint(new PDFNet.Point(25, 426));
        await line.setEndPoint(new PDFNet.Point(180, 555));
        await line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Circle);
        await line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_Square);
        const blueColorPt = await PDFNet.ColorPt.init(0, 0, 1, 0);
        await line.setColor(blueColorPt, 3);
        const redColorPt = await PDFNet.ColorPt.init(1, 0, 0, 0);
        await line.setInteriorColor(redColorPt, 3);
        await line.setContents('Offset Caption');
        await line.setShowCaption(true);
        await line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        await line.setTextHOffset(-60);
        await line.setTextVOffset(10);
        await line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(200, 10, 400, 70));
        line.setStartPoint(new PDFNet.Point(220, 25));
        line.setEndPoint(new PDFNet.Point(370, 60));
        line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Butt);
        line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_OpenArrow);
        line.setColor((await PDFNet.ColorPt.init(0, 0, 1)), 3);
        line.setContents('Regular Caption');
        line.setShowCaption(true);
        line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        await line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(200, 70, 400, 130));
        line.setStartPoint(new PDFNet.Point(220, 111));
        line.setEndPoint(new PDFNet.Point(370, 78));
        line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Circle);
        line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_Diamond);
        line.setContents('Circle to Diamond');
        line.setColor((await PDFNet.ColorPt.init(0, 0, 1)), 3);
        line.setInteriorColor((await PDFNet.ColorPt.init(0, 1, 0)), 3);
        line.setShowCaption(true);
        line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(10, 100, 160, 200));
        line.setStartPoint(new PDFNet.Point(15, 110));
        line.setEndPoint(new PDFNet.Point(150, 190));
        line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Slash);
        line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_ClosedArrow);
        line.setContents('Slash to CArrow');
        line.setColor((await PDFNet.ColorPt.init(1, 0, 0)), 3);
        line.setInteriorColor((await PDFNet.ColorPt.init(0, 1, 1)), 3);
        line.setShowCaption(true);
        line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(270, 270, 570, 433));
        line.setStartPoint(new PDFNet.Point(300, 400));
        line.setEndPoint(new PDFNet.Point(550, 300));
        line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_RClosedArrow);
        line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_ROpenArrow);
        line.setContents('ROpen & RClosed arrows');
        line.setColor((await PDFNet.ColorPt.init(0, 0, 1)), 3);
        line.setInteriorColor((await PDFNet.ColorPt.init(0, 1, 0)), 3);
        line.setShowCaption(true);
        line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(195, 395, 205, 505));
        line.setStartPoint(new PDFNet.Point(200, 400));
        line.setEndPoint(new PDFNet.Point(200, 500));
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(55, 299, 150, 301));
        line.setStartPoint(new PDFNet.Point(55, 300));
        line.setEndPoint(new PDFNet.Point(155, 300));
        line.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_Circle);
        line.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_Circle);
        line.setContents(("Caption that's longer than its line."));
        line.setColor((await PDFNet.ColorPt.init(1, 0, 1)), 3);
        line.setInteriorColor((await PDFNet.ColorPt.init(0, 1, 0)), 3);
        line.setShowCaption(true);
        line.setCapPos(PDFNet.LineAnnot.CapPos.e_Top);
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      {
        const line = await PDFNet.LineAnnot.create(doc, new PDFNet.Rect(300, 200, 390, 234));
        line.setStartPoint(new PDFNet.Point(310, 210));
        line.setEndPoint(new PDFNet.Point(380, 220));
        line.setColor((await PDFNet.ColorPt.init(0, 0, 0)), 3);
        line.refreshAppearance();
        page.annotPushBack(line);
      }
      const page3 = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      ew.beginOnPage(page3); // begin writing to the page
      ew.end(); // save changes to the current page
      doc.pagePushBack(page3);
      {
        const circle = await PDFNet.CircleAnnot.create(doc, new PDFNet.Rect(300, 300, 390, 350));
        circle.setColor((await PDFNet.ColorPt.init(0, 0, 0)), 3);
        circle.refreshAppearance();
        page3.annotPushBack(circle);
      }
      {
        const circle = await PDFNet.CircleAnnot.create(doc, new PDFNet.Rect(100, 100, 200, 200));
        circle.setColor((await PDFNet.ColorPt.init(0, 1, 0)), 3);
        circle.setInteriorColor((await PDFNet.ColorPt.init(0, 0, 1)), 3);
        const dash = [2, 4];
        circle.setBorderStyle((await PDFNet.AnnotBorderStyle.createWithDashPattern(PDFNet.AnnotBorderStyle.Style.e_dashed, 3, 0, 0, dash)));
        circle.setPadding(new PDFNet.Rect(2, 2, 2, 2));
        circle.refreshAppearance();
        page3.annotPushBack(circle);
      }
      {
        const sq = await PDFNet.SquareAnnot.create(doc, new PDFNet.Rect(10, 200, 80, 300));
        sq.setColor((await PDFNet.ColorPt.init(0, 0, 0)), 3);
        sq.refreshAppearance();
        page3.annotPushBack(sq);
      }

      {
        const sq = await PDFNet.SquareAnnot.create(doc, new PDFNet.Rect(500, 200, 580, 300));
        sq.setColor((await PDFNet.ColorPt.init(1, 0, 0)), 3);
        sq.setInteriorColor((await PDFNet.ColorPt.init(0, 1, 1)), 3);
        const dash = [4, 2];
        sq.setBorderStyle((await PDFNet.AnnotBorderStyle.createWithDashPattern(PDFNet.AnnotBorderStyle.Style.e_dashed, 6, 0, 0, dash)));
        sq.setPadding(new PDFNet.Rect(4, 4, 4, 4));
        sq.refreshAppearance();
        page3.annotPushBack(sq);
      }

      {
        const poly = await PDFNet.PolygonAnnot.create(doc, new PDFNet.Rect(5, 500, 125, 590));
        poly.setColor((await PDFNet.ColorPt.init(1, 0, 0)), 3);
        poly.setInteriorColor((await PDFNet.ColorPt.init(1, 1, 0)), 3);
        poly.setVertex(0, new PDFNet.Point(12, 510));
        poly.setVertex(1, new PDFNet.Point(100, 510));
        poly.setVertex(2, new PDFNet.Point(100, 555));
        poly.setVertex(3, new PDFNet.Point(35, 544));
        const solidBorderStyle = await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 4, 0, 0);
        poly.setBorderStyle(solidBorderStyle);
        poly.setPadding(new PDFNet.Rect(4, 4, 4, 4));
        poly.refreshAppearance();
        page3.annotPushBack(poly);
      }
      {
        const poly = await PDFNet.PolyLineAnnot.create(doc, new PDFNet.Rect(400, 10, 500, 90));
        poly.setColor((await PDFNet.ColorPt.init(1, 0, 0)), 3);
        poly.setInteriorColor((await PDFNet.ColorPt.init(0, 1, 0)), 3);
        poly.setVertex(0, new PDFNet.Point(405, 20));
        poly.setVertex(1, new PDFNet.Point(440, 40));
        poly.setVertex(2, new PDFNet.Point(410, 60));
        poly.setVertex(3, new PDFNet.Point(470, 80));
        poly.setBorderStyle(await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 2, 0, 0));
        poly.setPadding(new PDFNet.Rect(4, 4, 4, 4));
        poly.setStartStyle(PDFNet.LineAnnot.EndingStyle.e_RClosedArrow);
        poly.setEndStyle(PDFNet.LineAnnot.EndingStyle.e_ClosedArrow);
        poly.refreshAppearance();
        page3.annotPushBack(poly);
      }
      {
        const lk = await PDFNet.LinkAnnot.create(doc, new PDFNet.Rect(5, 5, 55, 24));
        // lk.setColor(await PDFNet.ColorPt.init(0,1,0), 3 );
        lk.refreshAppearance();
        page3.annotPushBack(lk);
      }

      const page4 = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      ew.beginOnPage(page4); // begin writing to the page
      ew.end(); // save changes to the current page
      doc.pagePushBack(page4);

      {
        ew.beginOnPage(page4);
        const font = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica);
        element = await eb.createTextBeginWithFont(font, 16);
        element.setPathFill(true);
        ew.writeElement(element);
        element = await eb.createTextRun('Some random text on the page', font, 16);
        element.setTextMatrixEntries(1, 0, 0, 1, 100, 500);
        ew.writeElement(element);
        ew.writeElement((await eb.createTextEnd()));
        ew.end();
      }
      {
        const hl = await PDFNet.HighlightAnnot.create(doc, new PDFNet.Rect(100, 490, 150, 515));
        hl.setColor((await PDFNet.ColorPt.init(0, 1, 0)), 3);
        hl.refreshAppearance();
        page4.annotPushBack(hl);
      }
      {
        const sq = await PDFNet.SquigglyAnnot.create(doc, new PDFNet.Rect(100, 450, 250, 600));
        // sq.setColor(await PDFNet.ColorPt.init(1,0,0), 3 );
        sq.setQuadPoint(0, PDFNet.QuadPoint(122, 455, 240, 545, 230, 595, 101, 500));
        sq.refreshAppearance();
        page4.annotPushBack(sq);
      }
      {
        const cr = await PDFNet.CaretAnnot.create(doc, new PDFNet.Rect(100, 40, 129, 69));
        cr.setColor((await PDFNet.ColorPt.init(0, 0, 1)), 3);
        cr.setSymbol('P');
        cr.refreshAppearance();
        page4.annotPushBack(cr);
      }


      const page5 = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      ew.beginOnPage(page5); // begin writing to the page
      ew.end(); // save changes to the current page
      doc.pagePushBack(page5);
      const fs = await PDFNet.FileSpec.create(doc, '../TestFiles/butterfly.png', false);
      const page6 = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      ew.beginOnPage(page6); // begin writing to the page
      ew.end(); // save changes to the current page
      doc.pagePushBack(page6);

      for (let ipage = 0; ipage < 2; ++ipage) {
        for (let iann = 0; iann < 100; iann++) {
          if (!(iann > PDFNet.FileAttachmentAnnot.Icon.e_Tag)) {
            const fa = await PDFNet.FileAttachmentAnnot.createWithFileSpec(doc, new PDFNet.Rect(50 + 50 * iann, 100, 70 + 50 * iann, 120), fs, iann);
            if (ipage) {
              fa.setColor((await PDFNet.ColorPt.init(1, 1, 0)));
            }
            fa.refreshAppearance();
            if (ipage === 0) {
              page5.annotPushBack(fa);
            } else {
              page6.annotPushBack(fa);
            }
          }
          if (iann > PDFNet.TextAnnot.Icon.e_Note) {
            break;
          }
          const txt = await PDFNet.TextAnnot.create(doc, new PDFNet.Rect(10 + iann * 50, 200, 30 + iann * 50, 220));
          txt.setIcon(iann);
          txt.setContents((await txt.getIconName()));
          if (ipage) {
            txt.setColor((await PDFNet.ColorPt.init(1, 1, 0)));
          }
          txt.refreshAppearance();
          if (ipage === 0) {
            page5.annotPushBack(txt);
          } else {
            page6.annotPushBack(txt);
          }
        }
      }
      {
        const txt = await PDFNet.TextAnnot.create(doc, new PDFNet.Rect(10, 20, 30, 40));
        txt.setIconName('UserIcon');
        txt.setContents('User defined icon, unrecognized by appearance generator');
        txt.setColor((await PDFNet.ColorPt.init(0, 1, 0)));
        txt.refreshAppearance();
        page6.annotPushBack(txt);
      }
      {
        const ink = await PDFNet.InkAnnot.create(doc, new PDFNet.Rect(100, 400, 200, 550));
        ink.setColor((await PDFNet.ColorPt.init(0, 0, 1)));
        ink.setPoint(1, 3, new PDFNet.Point(220, 505));
        ink.setPoint(1, 0, new PDFNet.Point(100, 490));
        ink.setPoint(0, 1, new PDFNet.Point(120, 410));
        ink.setPoint(0, 0, new PDFNet.Point(100, 400));
        ink.setPoint(1, 2, new PDFNet.Point(180, 490));
        ink.setPoint(1, 1, new PDFNet.Point(140, 440));
        ink.setBorderStyle(await PDFNet.AnnotBorderStyle.create(PDFNet.AnnotBorderStyle.Style.e_solid, 3, 0, 0));
        ink.refreshAppearance();
        page6.annotPushBack(ink);
      }


      const page7 = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      ew.beginOnPage(page7); // begin writing to the page
      ew.end(); // save changes to the current page
      doc.pagePushBack(page7);

      {
        const snd = await PDFNet.SoundAnnot.create(doc, new PDFNet.Rect(100, 500, 120, 520));
        snd.setColor((await PDFNet.ColorPt.init(1, 1, 0)));
        snd.setIcon(PDFNet.SoundAnnot.Icon.e_Speaker);
        snd.refreshAppearance();
        page7.annotPushBack(snd);
      }
      {
        const snd = await PDFNet.SoundAnnot.create(doc, new PDFNet.Rect(200, 500, 220, 520));
        snd.setColor((await PDFNet.ColorPt.init(1, 1, 0)));
        snd.setIcon(PDFNet.SoundAnnot.Icon.e_Mic);
        snd.refreshAppearance();
        page7.annotPushBack(snd);
      }

      const page8 = await doc.pageCreate(new PDFNet.Rect(0, 0, 600, 600));
      ew.beginOnPage(page8); // begin writing to the page
      ew.end(); // save changes to the current page
      doc.pagePushBack(page8);

      for (let ipage = 0; ipage < 2; ++ipage) {
        let px = 5;
        let py = 520;
        for (let istamp = PDFNet.RubberStampAnnot.Icon.e_Approved; istamp <= PDFNet.RubberStampAnnot.Icon.e_Draft; istamp++) {
          const st = await PDFNet.RubberStampAnnot.create(doc, new PDFNet.Rect(1, 1, 100, 100));
          st.setIcon(istamp);
          st.setContents((await st.getIconName()));
          st.setRect(new PDFNet.Rect(px, py, px + 100, py + 25));
          py -= 100;
          if (py < 0) {
            py = 520;
            px += 200;
          }
          if (ipage === 0) {
            // page7.annotPushBack( st );
          } else {
            page8.annotPushBack(st);
            st.refreshAppearance();
          }
        }
      }
      const st = await PDFNet.RubberStampAnnot.create(doc, new PDFNet.Rect(400, 5, 550, 45));
      st.setIconName('UserStamp');
      st.setContents('User defined stamp');
      page8.annotPushBack(st);
      st.refreshAppearance();

      await PDFNet.endDeallocateStack();
    };

    const main = async() => {
      try {
        console.log('Beginning Annotation Test. This test will add different annotations to PDF documents.');
        const ret = 0;

        const inputPath = '../TestFiles/';
        const doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'numbered.pdf');
        doc.initSecurityHandler();
        doc.lock();

        console.log('PDFNet and PDF document initialized and locked');

        await AnnotationLowLevelAPI(doc);
        const docbuf = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf, 'annotation_testLowLevel.pdf');

        // eslint-disable-next-line no-unused-vars
        const firstPage = await doc.getPage(1);

        await AnnotationHighLevelAPI(doc);
        const docbuf2 = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(docbuf2, 'annotation_testHighLevel.pdf');

        // creating various annotations in a brand new document
        const docnew = await PDFNet.PDFDoc.create();
        docnew.lock();
        await CreateTestAnnots(docnew);
        const doc1buf = await docnew.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        saveBufferAsPDFDoc(doc1buf, 'new_annot_test_api.pdf');
        console.log('Done.');
        return ret;
      } catch (err) {
        console.log(err);
      }
    };
    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=AnnotationTest.js