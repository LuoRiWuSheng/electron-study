//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------

((exports) => {
  'use strict';

  exports.runTextExtractTest = async() => {
    // A utility method used to dump all text content in the console window.
    const dumpAllText = async(reader) => {
      let element, bbox, arr;
      while ((element = await reader.next()) !== null) {
        switch (await element.getType()) {
          case PDFNet.Element.Type.e_text_begin:
            console.log('--> Text Block Begin');
            break;
          case PDFNet.Element.Type.e_text_end:
            console.log('--> Text Block End');
            break;
          case PDFNet.Element.Type.e_text:
            bbox = await element.getBBox();
            console.log('--> BBox: ' + bbox.x1 + ', ' + bbox.y1 + ', ' + bbox.x2 + ', ' + bbox.y2 + '\n');
            arr = await element.getTextString();
            console.log(arr);
            break;
          case PDFNet.Element.Type.e_text_new_line:
            break;
          case PDFNet.Element.Type.e_form:
            reader.formBegin();
            await dumpAllText(reader);
            reader.end();
            break;
        }
      }
    };

    // helper method for ReadTextFromRect
    const rectTextSearch = async(reader, pos, srchStr) => {
      let element, arr;
      while ((element = await reader.next()) !== null) {
        let bbox;
        switch (await element.getType()) {
          case PDFNet.Element.Type.e_text:
            bbox = await element.getBBox();
            if (await bbox.intersectRect(bbox, pos)) {
              arr = await element.getTextString();
              srchStr += arr + '\n';
            }
            break;
          case PDFNet.Element.Type.e_text_new_line:
            break;
          case PDFNet.Element.Type.e_form:
            reader.formBegin();
            srchStr += await rectTextSearch(reader, pos, srchStr); // possibly need srchStr = ...
            reader.end();
            break;
        }
      }
      return srchStr;
    };

    const readTextFromRect = async(page, pos, reader) => {
      let srchStr = '';
      reader.beginOnPage(page); // uses default parameters.
      srchStr += await rectTextSearch(reader, pos, srchStr);
      reader.end();
      return srchStr;
    };

    const printStyle = async(s) => {
      const rgb = await s.getColor();
      const rColorVal = await rgb.get(0);
      const gColorVal = await rgb.get(1);
      const bColorVal = await rgb.get(2);
      const fontName = await s.getFontName();
      const fontSize = await s.getFontSize();
      const serifOutput = ((await s.isSerif()) ? ' sans-serif; ' : ' ');
      const returnString = 'style="font-family:' + fontName + ';font-size:' + fontSize + ';' + serifOutput + 'color: #' + rColorVal.toString(16) + ', ' + gColorVal.toString(16) + ', ' + bColorVal.toString(16) + ')"';
      return returnString;
    };

    const main = async() => {
      console.log('Beginning Test');

      // eslint-disable-next-line no-unused-vars
      let ret = 0;
      await PDFNet.initialize(); // need to await since it initializes the worker

      // Relative path to the folder containing test files.
      const inputURL = '../TestFiles/';
      const inputFilename = 'newsletter.pdf'; // addimage.pdf, newsletter.pdf

      const example1Basic = false;
      const example2XML = false;
      const example3Wordlist = false;
      const example4Advanced = true;
      const example5LowLevel = false;
      let doc = null;

      try {
        await PDFNet.startDeallocateStack();
        doc = await PDFNet.PDFDoc.createFromURL(inputURL + inputFilename);
        doc.initSecurityHandler();
        doc.lock();

        const page = await doc.getPage(1);

        if (page.id === '0') {
          console.log('Page not found.');
          return 1;
        }

        const txt = await PDFNet.TextExtractor.create();
        const rect = new PDFNet.Rect(0, 0, 612, 794);
        txt.begin(page, rect);
        // let element = await readertest.next();
        // let eltype = await element.getType();

        // eslint-disable-next-line no-unused-vars
        const count = await txt.getNumLines();
        let text, line, word;

        if (example1Basic) {
          const wordCount = await txt.getWordCount();
          console.log('Word Count: ' + wordCount);
          text = await txt.getAsText();
          console.log('- GetAsText  -------------------------------');
          console.log(text);
          console.log('-----------------------------------------');
        }

        if (example2XML) {
          text = await txt.getAsXML(PDFNet.TextExtractor.XMLOutputFlags.e_words_as_elements | PDFNet.TextExtractor.XMLOutputFlags.e_output_bbox | PDFNet.TextExtractor.XMLOutputFlags.e_output_style_info);
          console.log('- GetAsXML  --------------------------' + text);
          console.log('-----------------------------------------------------------');
        }

        if (example3Wordlist) {
          line = await txt.getFirstLine();
          for (; (await line.isValid()); line = (await line.getNextLine())) {
            for (word = await line.getFirstWord(); (await word.isValid()); word = (await word.getNextWord())) {
              text = await word.getString();
              console.log(text);
            }
          }
          console.log('-----------------------------------------------------------');
        }

        if (example4Advanced) {
          let b;
          let q;
          let curFlowID = -1;
          let curParaID = -1;

          /* eslint-disable no-unused-vars */
          const builder = await PDFNet.ElementBuilder.create(); // ElementBuilder, used to build new element Objects
          const writer = await PDFNet.ElementWriter.create(); // ElementWriter, used to write elements to the page
          /* eslint-enable no-unused-vars */

          for (line = await txt.getFirstLine(); await line.isValid(); line = await line.getNextLine()) {
            if ((await line.getNumWords()) === 0) {
              continue;
            }
            if ((await line.getFlowID()) !== curFlowID) {
              if (curFlowID !== -1) {
                if (curParaID !== -1) {
                  curParaID = -1;
                  console.log('</Para>');
                }
                console.log('</Flow>');
              }
              curFlowID = await line.getFlowID();
              console.log('<Flow id="' + curFlowID + '">');
            }
            if ((await line.getParagraphID()) !== curParaID) {
              if (curParaID !== -1) {
                console.log('</Para>');
              }
              curParaID = await line.getParagraphID();
              console.log('<Para id="' + curParaID + '">');
            }
            b = await line.getBBox();
            const lineStyle = await line.getStyle();
            let outputStringLineBox = '<Line box="' + b.x1 + ', ' + b.y1 + ', ' + b.x2 + ', ' + b.y1 + '">';
            outputStringLineBox += (await printStyle(lineStyle));
            const currentLineNum = await line.getCurrentNum();
            outputStringLineBox += ' cur_num="' + currentLineNum + '">';
            console.log(outputStringLineBox);

            // For each word in the line...
            let outputStringWord = '';
            for (word = await line.getFirstWord(); await word.isValid(); word = await word.getNextWord()) {
              // output bounding box for the word
              q = await word.getBBox();
              const currentNum = await word.getCurrentNum();
              outputStringWord += '<Word box="' + q.x1 + ', ' + q.y1 + ', ' + q.x2 + ', ' + q.y2 + '" cur_num="' + currentNum + '"';
              const sz = await word.getStringLen();
              if (sz === 0) {
                continue;
              }
              // if the word style is different from the parent style, output the new style
              const sty = await word.getStyle();
              if (!(await sty.compare(lineStyle))) {
                console.log((await printStyle(sty)));
              }
              outputStringWord += '>' + (await word.getString()) + '</Word>';
              console.log(outputStringWord);
            }
            console.log('</Line>');
          }
          if (curFlowID !== -1) {
            if (curParaID !== -1) {
              curParaID = -1;
              console.log('</Para>');
            }
            console.log('</Flow>\n');
          }
        }
        console.log('done');
        await PDFNet.endDeallocateStack();
      } catch (err) {
        console.log(err);
        console.log(err.stack);
        ret = 1;
      }


      if (example5LowLevel) {
        ret = 0;
        try {
          await PDFNet.startDeallocateStack();
          doc = await PDFNet.PDFDoc.createFromURL(inputURL + inputFilename);
          doc.initSecurityHandler();
          doc.lock();

          // Example 1. Extract all text content from the document
          const reader = await PDFNet.ElementReader.create();
          const itr = await doc.getPageIterator(1);

          //  Read every page
          for (itr; await itr.hasNext(); itr.next()) {
            const page = await itr.current();
            reader.beginOnPage(page);
            await dumpAllText(reader);
            reader.end();
          }
          // Example 2. Extract text content based on the
          // selection rectangle.
          console.log('----------------------------------------------------');
          console.log('Extract text based on the selection rectangle.');
          console.log('----------------------------------------------------');


          const firstPage = await (await doc.getPageIterator()).current();
          let s1 = await readTextFromRect(firstPage, (await PDFNet.Rect.init(27, 392, 563, 534)), reader);
          console.log('Field 1: ' + s1);

          s1 = await readTextFromRect(firstPage, (await PDFNet.Rect.init(28, 551, 106, 623)), reader);
          console.log('Field 2: ' + s1);

          s1 = await readTextFromRect(firstPage, (await PDFNet.Rect.init(208, 550, 387, 621)), reader);
          console.log('Field 3: ' + s1);

          // ...
          console.log('Done');
          await PDFNet.endDeallocateStack();
        } catch (err) {
          console.log(err.stack);
          ret = 1;
        }
      }
    };
    // start the generator
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=TextExtractTest.js