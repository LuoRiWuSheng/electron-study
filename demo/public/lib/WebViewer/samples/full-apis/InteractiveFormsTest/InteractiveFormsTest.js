//---------------------------------------------------------------------------------------
// Copyright (c) 2001-2019 by PDFTron Systems Inc. All Rights Reserved.
// Consult legal.txt regarding legal and license information.
//---------------------------------------------------------------------------------------
((exports) => {
  'use strict';

  exports.runInteractiveFormsTest = () => {
    PDFNet.CheckStyle = {
      e_check: 0,
      e_circle: 1,
      e_cross: 2,
      e_diamond: 3,
      e_square: 4,
      e_star: 5
    };

    const RenameAllFields = async(doc, name) => {
      let itr = await doc.getFieldIterator(name);
      for (let counter = 0; (await itr.hasNext()); itr = (await doc.getFieldIterator(name)), ++counter) {
        const f = await itr.current();
        f.rename(name + counter);
      }
    };

    // Note: The visual appearance of check-marks and radio-buttons in PDF documents is
    // not limited to CheckStyle-s. It is possible to create a visual appearance using
    // arbitrary glyph, text, raster image, or path object. Although most PDF producers
    // limit the options to the above 'standard' styles, using PDFNetJS you can generate
    // arbitrary appearances.
    const CreateCheckmarkAppearance = async(doc, style) => {
      const builder = await PDFNet.ElementBuilder.create();
      const writer = await PDFNet.ElementWriter.create();
      writer.begin(doc);
      writer.writeElement((await builder.createTextBegin()));

      let symbol;
      switch (style) {
        case PDFNet.CheckStyle.e_circle: symbol = '\x6C'; break;
        case PDFNet.CheckStyle.e_diamond: symbol = '\x75'; break;
        case PDFNet.CheckStyle.e_cross: symbol = '\x35'; break;
        case PDFNet.CheckStyle.e_square: symbol = '\x6E'; break;
        case PDFNet.CheckStyle.e_star: symbol = '\x48'; break;
          // ...
          // See section D.4 "ZapfDingbats Set and Encoding" in PDF Reference Manual
          // (http://www.pdftron.com/downloads/PDFReference16.pdf) for the complete
          // graphical map for ZapfDingbats font. Please note that all character codes
          // are represented using the 'octal' notation.
        default: // e_check
          symbol = '\x34';
      }

      const zapfDingbatsFont = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_zapf_dingbats);
      const checkmark = await builder.createTextRunWithSize(symbol, 1, zapfDingbatsFont, 1);
      writer.writeElement(checkmark);
      writer.writeElement((await builder.createTextEnd()));

      const stm = await writer.end();
      await stm.putRect('BBox', -0.2, -0.2, 1, 1); // Clip
      await stm.putName('Subtype', 'Form');
      return stm;
    };

    const CreateButtonAppearance = async(doc, buttonDown) => {
      // Create a button appearance stream ------------------------------------

      const builder = await PDFNet.ElementBuilder.create();
      const writer = await PDFNet.ElementWriter.create();
      writer.begin(doc);

      // Draw background
      let element = await builder.createRect(0, 0, 101, 37);
      element.setPathFill(true);
      element.setPathStroke(false);

      let elementGState = await element.getGState();
      elementGState.setFillColorSpace((await PDFNet.ColorSpace.createDeviceGray()));
      elementGState.setFillColorWithColorPt((await PDFNet.ColorPt.init(0.75)));
      writer.writeElement(element);

      // Draw 'Submit' text
      writer.writeElement((await builder.createTextBegin()));

      const text = 'Submit';
      const HelveticaBoldFont = await PDFNet.Font.create(doc, PDFNet.Font.StandardType1Font.e_helvetica_bold);
      element = await builder.createTextRunWithSize(text, text.length, HelveticaBoldFont, 12);
      elementGState = await element.getGState();
      elementGState.setFillColorWithColorPt((await PDFNet.ColorPt.init(0)));

      if (buttonDown) {
        element.setTextMatrixEntries(1, 0, 0, 1, 33, 10);
      } else {
        element.setTextMatrixEntries(1, 0, 0, 1, 30, 13);
      }
      writer.writeElement(element);

      writer.writeElement((await builder.createTextEnd()));

      const stm = await writer.end();

      // Set the bounding box
      await stm.putRect('BBox', 0, 0, 101, 37);
      await stm.putName('Subtype', 'Form');
      return stm;
    };

    const main = async() => {
      let docBuffer = null;

      try {
        console.log('Beginning Test 1');

        // Relative path to the folder containing test files.
        // eslint-disable-next-line no-unused-vars
        const inputPath = '../TestFiles/';

        const doc = await PDFNet.PDFDoc.create();
        doc.initSecurityHandler();
        doc.lock();
        console.log('PDF document initialized and locked');

        const blankPage = await doc.pageCreate();

        // create new fields
        const empFirstName = await doc.fieldCreateFromStrings('employee.name.first', PDFNet.Field.Type.e_text, 'John', '');
        const empLastName = await doc.fieldCreateFromStrings('employee.name.last', PDFNet.Field.Type.e_text, 'Doe', '');
        const empLastCheck1 = await doc.fieldCreateFromStrings('employee.name.check1', PDFNet.Field.Type.e_check, 'Yes', '');

        const submit = await doc.fieldCreate('submit', PDFNet.Field.Type.e_button);

        // Create page annotations for the above fields.

        // Create text annotation
        const annot1 = await PDFNet.WidgetAnnot.create(doc, (await PDFNet.Rect.init(50, 550, 350, 600)), empFirstName);
        const annot2 = await PDFNet.WidgetAnnot.create(doc, (await PDFNet.Rect.init(50, 450, 350, 500)), empLastName);

        // create checkbox annotation
        const annot3 = await PDFNet.WidgetAnnot.create(doc, (await PDFNet.Rect.init(64, 356, 120, 410)), empLastCheck1);
        // Set the annotation appearance for the "Yes" state
        // NOTE: if we call refreshFieldAppearances after this the appearance will be discarded
        const checkMarkApp = await CreateCheckmarkAppearance(doc, PDFNet.CheckStyle.e_check);
        // Set the annotation appearance for the "Yes" state...
        annot3.setAppearance(checkMarkApp, PDFNet.Annot.State.e_normal, 'Yes');

        // Create button annotation
        const annot4 = await PDFNet.WidgetAnnot.create(doc, (await PDFNet.Rect.init(64, 284, 163, 320)), submit);
        // Set the annotation appearances for the down and up state...
        const falseButtonApp = await CreateButtonAppearance(doc, false);
        const trueButtonApp = await CreateButtonAppearance(doc, true);
        await annot4.setAppearance(falseButtonApp, PDFNet.Annot.State.e_normal);
        await annot4.setAppearance(trueButtonApp, PDFNet.Annot.State.e_down);

        // Create 'SubmitForm' action. The action will be linked to the button.
        const url = await PDFNet.FileSpec.createURL(doc, 'http://www.pdftron.com');
        const buttonAction = await PDFNet.Action.createSubmitForm(url);

        // Associate the above action with 'Down' event in annotations action dictionary.
        const annotAction = await (await annot4.getSDFObj()).putDict('AA');
        annotAction.put('D', (await buttonAction.getSDFObj()));

        blankPage.annotPushBack(annot1); // Add annotations to the page
        blankPage.annotPushBack(annot2);
        blankPage.annotPushBack(annot3);
        blankPage.annotPushBack(annot4);

        doc.pagePushBack(blankPage); // Add the page as the last page in the document.

        // If you are not satisfied with the look of default auto-generated appearance
        // streams you can delete "AP" entry from the Widget annotation and set
        // "NeedAppearances" flag in AcroForm dictionary:
        //    doc.GetAcroForm().PutBool("NeedAppearances", true);
        // This will force the viewer application to auto-generate new appearance streams
        // every time the document is opened.
        //
        // Alternatively you can generate custom annotation appearance using ElementWriter
        // and then set the "AP" entry in the widget dictionary to the new appearance
        // stream.
        //
        // Yet another option is to pre-populate field entries with dummy text. When
        // you edit the field values using PDFNet the new field appearances will match
        // the old ones.

        // doc.GetAcroForm().PutBool("NeedAppearances", true);
        // NOTE: refreshFieldAppearances will replace previously generated appearance streams
        doc.refreshFieldAppearances();

        docBuffer = await doc.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docBuffer, 'forms_test1.pdf');

        console.log('Example 1 complete and everything deallocated.');
      } catch (err) {
        console.log(err.stack);
      }
      //----------------------------------------------------------------------------------
      // Example 2:
      // Fill-in forms / Modify values of existing fields.
      // Traverse all form fields in the document (and print out their names).
      // Search for specific fields in the document.
      //----------------------------------------------------------------------------------

      try {
        console.log('Beginning Test 2');

        // we use the forms test doc from the previous sample
        // Buffers passed into PDFNetJS functions are made invalid afterwards due to the functions taking ownership.
        // If you are using the same buffer to initialize multiple documents, pass in a copy of the buffer.
        const copyOfBuffer = new Uint8Array(docBuffer.buffer.slice(0));
        const doc2 = await PDFNet.PDFDoc.createFromBuffer(copyOfBuffer);

        doc2.initSecurityHandler();
        doc2.lock();
        console.log('Sample 2 PDF document initialized and locked');
        const itr = await doc2.getFieldIteratorBegin();

        for (; (await itr.hasNext()); itr.next()) {
          const currentItr = await itr.current();
          console.log('Field name: ' + (await currentItr.getName()));
          console.log('Field partial name: ' + (await currentItr.getPartialName()));

          console.log('Field type: ');
          const type = await currentItr.getType();
          const strVal = await currentItr.getValueAsString();

          switch (type) {
            case PDFNet.Field.Type.e_button:
            {
              console.log('Button');
              break;
            }
            case PDFNet.Field.Type.e_radio:
            {
              console.log('Radio button: Value = ' + strVal);
              break;
            }
            case PDFNet.Field.Type.e_check:
            {
              const currItr = await itr.current();
              currItr.setValueAsBool(true);
              console.log('Check box: Value = ' + strVal);
              break;
            }
            case PDFNet.Field.Type.e_text:
            {
              console.log('Text');
              // Edit all variable text in the document
              const currItr = await itr.current();
              currItr.setValueAsString('This is a new value. The old one was: ' + strVal);
              break;
            }
            case PDFNet.Field.Type.e_choice:
            {
              console.log('Choice');
              break;
            }
            case PDFNet.Field.Type.e_signature:
            {
              console.log('Signature');
              break;
            }
          }
          console.log('-----------------------');
        }
        const f = await doc2.getField('employee.name.first');
        if (f) {
          console.log('Field search for ' + (await f.getName()) + ' was successful');
        } else {
          console.log('Field search failed');
        }
        // Regenerate field appearances.
        doc2.refreshFieldAppearances();

        const docBuffer2 = await doc2.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docBuffer2, 'forms_test_edit.pdf');
        console.log('Example 2 complete and everything deallocated.');
      } catch (err) {
        console.log(err);
      }
      //----------------------------------------------------------------------------------
      // Sample 3: Form templating
      // Replicate pages and form data within a document. Then rename field names to make
      // them unique.
      //----------------------------------------------------------------------------------
      try {
        // we still keep using our original forms test doc.
        // If you are using the same buffer to initialize multiple documents, pass in a copy of the buffer.
        const copyOfBuffer3 = new Uint8Array(docBuffer.buffer.slice(0));
        const doc3 = await PDFNet.PDFDoc.createFromBuffer(copyOfBuffer3);
        doc3.initSecurityHandler();
        doc3.lock();
        console.log('Sample 3 PDF document initialized and locked');
        const srcPage = await doc3.getPage(1);
        doc3.pagePushBack(srcPage); // Append several copies of the first page
        doc3.pagePushBack(srcPage); // Note that forms are successfully copied
        doc3.pagePushBack(srcPage);
        doc3.pagePushBack(srcPage);

        // Now we rename fields in order to make every field unique.
        // You can use this technique for dynamic template filling where you have a 'master'
        // form page that should be replicated, but with unique field names on every page.
        await RenameAllFields(doc3, 'employee.name.first');
        await RenameAllFields(doc3, 'employee.name.last');
        await RenameAllFields(doc3, 'employee.name.check1');
        await RenameAllFields(doc3, 'submit');

        const docBuffer3 = await doc3.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docBuffer3, 'forms_test1_cloned.pdf');
        console.log('Example 3 complete and everything deallocated.');
      } catch (err) {
        console.log(err);
      }

      //----------------------------------------------------------------------------------
      // Sample:
      // Flatten all form fields in a document.
      // Note that this sample is intended to show that it is possible to flatten
      // individual fields. PDFNet provides a utility function PDFDoc.FlattenAnnotations()
      // that will automatically flatten all fields.
      //----------------------------------------------------------------------------------

      try {
        const copyOfBuffer4 = new Uint8Array(docBuffer.buffer.slice(0));
        const doc4 = await PDFNet.PDFDoc.createFromBuffer(copyOfBuffer4);
        doc4.initSecurityHandler();
        doc4.lock();
        console.log('Sample 4 PDF document initialized and locked');

        // Flatten all pages
        // eslint-disable-next-line no-constant-condition
        if (true) {
          doc4.flattenAnnotations();
        } else {
          // Manual flattening
          for (let pitr = await doc4.getPageIterator(); (await pitr.hasNext()); (await pitr.next())) {
            const page = await pitr.current();
            const annots = await page.getAnnots();

            if (annots) { // Look for all widget annotations (in reverse order)
              for (let i = parseInt(await annots.size(), 10) - 1; i >= 0; --i) {
                const annotObj = await annots.getAt(i);
                const annotObjSubtype = await annotObj.get('Subtype');
                // eslint-disable-next-line no-unused-vars
                const annotObjVal = await annotObjSubtype.value();
                const annotObjName = await (await (await annotObj.get('Subtype')).value()).getName();

                if (annotObjName === 'Widget') {
                  const field = await PDFNet.Field.create(annotObj);
                  field.flatten(page);

                  // Another way of making a read only field is by modifying
                  // field's e_read_only flag:
                  //    field.SetFlag(Field::e_read_only, true);
                }
              }
            }
          }
        }

        const docBuffer4 = await doc4.saveMemoryBuffer(0);
        saveBufferAsPDFDoc(docBuffer4, 'forms_test1_flattened.pdf');
        console.log('done - Example 4 complete and everything deallocated.');
      } catch (err) {
        console.log(err);
      }
    };
    PDFNet.runWithCleanup(main, window.sampleL); // replace with your own license key and remove the license-key.js script tag
  };
})(window);
// eslint-disable-next-line spaced-comment
//# sourceURL=InteractiveFormsTest.js