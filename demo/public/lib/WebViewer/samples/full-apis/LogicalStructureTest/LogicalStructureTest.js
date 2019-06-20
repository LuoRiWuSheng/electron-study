//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------


//---------------------------------------------------------------------------------------
// This sample explores the structure and content of a tagged PDF document and dumps
// the structure information to the console window.
//
// In tagged PDF documents StructTree acts as a central repository for information
// related to a PDF document's logical structure. The tree consists of StructElement-s
// and ContentItem-s which are leaf nodes of the structure tree.
//
// The sample can be extended to access and extract the marked-content elements such
// as text and images.
//---------------------------------------------------------------------------------------


((exports) => {
  'use strict';

  exports.runLogicalStructureTest = () => {
    const PrintAndIndent = (printState, indent) => {
      if (printState.str) {
        let indentStr = '';
        const lastIndent = printState.indent;
        for (let i = 0; i < lastIndent; ++i) {
          indentStr += '  ';
        }
        console.log(indentStr + printState.str);
      }
      printState.str = '';
      printState.indent = indent;
    };

    // Used in code snippet 1.
    const ProcessStructElement = async(element, indent, printState) => {
      if (!(await element.isValid())) {
        return;
      }


      // Print out the type and title info, if any.
      PrintAndIndent(printState, indent++);
      printState.str += 'Type: ' + (await element.getType());
      if (await element.hasTitle()) {
        printState.str += '. Title: ' + (await element.getTitle());
      }

      const num = await element.getNumKids();
      for (let i = 0; i < num; ++i) {
        // Check is the kid is a leaf node (i.e. it is a ContentItem).
        if (await element.isContentItem(i)) {
          const cont = await element.getAsContentItem(i);
          const type = await cont.getType();

          const page = await cont.getPage();

          PrintAndIndent(printState, indent);
          printState.str += 'Content Item. Part of page #' + (await page.getIndex());

          PrintAndIndent(printState, indent);
          switch (type) {
            case PDFNet.ContentItem.Type.e_MCID:
            case PDFNet.ContentItem.Type.e_MCR:
              printState.str += 'MCID: ' + (await cont.getMCID());
              break;
            case PDFNet.ContentItem.Type.e_OBJR:
              {
                printState.str += 'OBJR ';
                const refObj = await cont.getRefObj();
                if (refObj) {
                  printState.str += '- Referenced Object#: ' + refObj.getObjNum();
                }
              }
              break;
            default:
              break;
          }
        } else { // the kid is another StructElement node.
          await ProcessStructElement(await element.getAsStructElem(i), indent, printState);
        }
      }
    };

    // Used in code snippet 2.
    const ProcessElements = async(reader, printState) => {
      let element;
      while (element = await reader.next()) { // Read page contents
        // In this sample we process only paths & text, but the code can be
        // extended to handle any element type.
        const type = await element.getType();
        if (type === PDFNet.Element.Type.e_path || type === PDFNet.Element.Type.e_text || type === PDFNet.Element.Type.e_path) {
          switch (type) {
            case PDFNet.Element.Type.e_path: // Process path ...
              printState.str += '\nPATH: ';
              break;
            case PDFNet.Element.Type.e_text: // Process text ...
              printState.str += '\nTEXT: ' + (await element.getTextString()) + '\n';
              break;
            case PDFNet.Element.Type.e_form: // Process form XObjects
              printState.str += '\nFORM XObject: ';
              // reader.formBegin();
              // await ProcessElements(reader);
              // reader.end();
              break;
          }

          // Check if the element is associated with any structural element.
          // Content items are leaf nodes of the structure tree.
          const structParent = await element.getParentStructElement();
          if (await structParent.isValid()) {
            // Print out the parent structural element's type, title, and object number.
            printState.str += ' Type: ' + (await structParent.getType())
            + ', MCID: ' + (await element.getStructMCID());
            if (await structParent.hasTitle()) {
              printState.str += '. Title: ' + (await structParent.getTitle());
            }
            printState.str += ', Obj#: ' + (await (await structParent.getSDFObj()).getObjNum());
          }
        }
      }
    };

    // Used in code snippet 3.
    const ProcessElements2 = async(reader, mcidPageMap) => {
      let element;
      while (element = await reader.next()) { // Read page contents
        // In this sample we process only text, but the code can be extended
        // to handle paths, images, or any other Element type.
        const mcid = await element.getStructMCID();
        if (mcid >= 0 && (await element.getType()) === PDFNet.Element.Type.e_text) {
          const val = await element.getTextString();
          if (mcid in mcidPageMap) {
            mcidPageMap[mcid] += val;
          } else {
            mcidPageMap[mcid] = val;
          }
        }
      }
    };

    // Used in code snippet 3.
    const ProcessStructElement2 = async(element, mcidDocMap, indent, printState) => {
      if (!(await element.isValid())) {
        return;
      }

      // Print out the type and title info, if any.
      PrintAndIndent(printState, indent);
      printState.str += '<' + (await element.getType());
      if (await element.hasTitle()) {
        printState.str += ' title="' + (await element.getTitle()) + '"';
      }
      printState.str += '>';

      const num = await element.getNumKids();
      for (let i = 0; i < num; ++i) {
        if (await element.isContentItem(i)) {
          const cont = await element.getAsContentItem(i);
          if ((await cont.getType()) === PDFNet.ContentItem.Type.e_MCID) {
            const pageNum = await (await cont.getPage()).getIndex();
            const mcidPageMap = mcidDocMap[pageNum];
            if (mcidPageMap) {
              const mcid = await cont.getMCID();
              if (mcid in mcidPageMap) {
                printState.str += mcidPageMap[mcid];
              }
            }
          }
        } else { // the kid is another StructElement node.
          await ProcessStructElement2(await element.getAsStructElem(i), mcidDocMap, indent + 1, printState);
        }
      }

      PrintAndIndent(printState, indent);
      printState.str += '</' + (await element.getType()) + '>';
    };


    const main = async() => {
      // Relative path to the folder containing test files.
      const inputPath = '../TestFiles/';
      const printState = { str: '' };
      try { // Extract logical structure from a PDF document
        const doc = await PDFNet.PDFDoc.createFromURL(inputPath + 'tagged.pdf');
        doc.initSecurityHandler();

        let reader = null;
        let tree = null;

        console.log('____________________________________________________________');
        console.log('Sample 1 - Traverse logical structure tree...');
        {
          tree = await doc.getStructTree();
          if (await tree.isValid()) {
            console.log('Document has a StructTree root.');
            for (let i = 0, numKids = await tree.getNumKids(); i < numKids; ++i) {
              // Recursively get structure info for all child elements.
              await ProcessStructElement(await tree.getKid(i), 0, printState);
            }
          } else {
            console.log('This document does not contain any logical structure.');
          }
        }
        PrintAndIndent(printState, 0);
        console.log('Done 1.');

        console.log('____________________________________________________________');
        console.log('Sample 2 - Get parent logical structure elements from');
        console.log('layout elements.');
        {
          reader = await PDFNet.ElementReader.create();
          for (let itr = await doc.getPageIterator(); await itr.hasNext(); itr.next()) {
            reader.beginOnPage(await itr.current());
            await ProcessElements(reader, printState);
            reader.end();
          }
        }
        PrintAndIndent(printState, 0);
        console.log('Done 2.');

        console.log('____________________________________________________________');
        console.log("Sample 3 - 'XML style' extraction of PDF logical structure and page content.");
        {
          const mcidDocMap = {};
          for (let itr = await doc.getPageIterator(); await itr.hasNext(); itr.next()) {
            const page = await itr.current();
            reader.beginOnPage(page);
            const pageNum = await page.getIndex();
            const pageMcidMap = {};
            mcidDocMap[pageNum] = pageMcidMap;
            await ProcessElements2(reader, pageMcidMap);
            reader.end();
          }

          tree = await doc.getStructTree();
          if (await tree.isValid()) {
            for (let i = 0, numKids = await tree.getNumKids(); i < numKids; ++i) {
              await ProcessStructElement2(await tree.getKid(i), mcidDocMap, 0, printState);
            }
          }
        }
        PrintAndIndent(printState, 0);
        console.log('Done 3.');
        const docBuffer = await doc.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docBuffer, 'bookmark.pdf');
      } catch (err) {
        console.log(err);
      }
    };


    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=LogicalStructureTest.js