
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');

const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const BLINK = "\x1b[5m";
const UNDER = "\x1b[4m";

let resourceDir = path.resolve(__dirname, '../webviewer-salesforce/')
let resourcesForZip = [
  [resourceDir + '/resource'],
  [resourceDir + '/external'],
];
const globalPrompt = {
  message: "Answer must be 'y' or 'n'",
  pattern: /^[yn]$/,
  required: true,
  type: 'string'
};


(async () => {
  try {
    require.resolve('prompt');
    require.resolve('fs-extra');
    require.resolve('archiver');
  } catch (e) {
    console.log(CYAN, `Installing required dependencies...`, RESET);
    await exec(`npm i prompt --save-dev && npm i fs-extra --save-dev && npm i archiver --save-dev`);
  }

  console.log(CYAN, `\nThis script will delete any files you won't be using in your lib folder. Please use with caution!`)
  console.log(CYAN, `\nPress CTRL + C at any time to safely cancel this process. If you are unsure of any answer, ${UNDER}please clarify${RESET}${CYAN} before answering them.`, RESET);

  const prompt = require('prompt');
  const fs = require('fs-extra');
  const archiver = require('archiver');

  prompt.start();
  prompt.message = `${MAGENTA}\nOptimize`;
  prompt.delimiter = `: ${RESET}`;

  const backupExists = await fs.pathExists(path.resolve(__dirname, '../lib-backup'));
  if (backupExists) {
    console.log(CYAN, `\nA backup will not be created because a backup already exists!`);
  }

  const schema = {
    properties: {
      backup: {
        description: "Do you want us to backup your files before optimizing? [y/n]" + RESET,
        ask: () => {
          return !backupExists;
        },
        ...globalPrompt
      },
      ui: {
        description: "Will you be using the new UI? [y/n]" + RESET,
        ...globalPrompt
      },
      webViewerServer: {
        description: `Will you be using WebViewer Server? See ${CYAN}https://www.pdftron.com/documentation/web/guides/wv-server/${RESET}${DIM} for more info. [y/n]` + RESET,
        ...globalPrompt,
      },
      xod: {
        description: `Will you be converting all your documents to XOD? See ${CYAN}https://www.pdftron.com/documentation/web/guides/optimize-lib-folder${RESET}${DIM} for more info. [y/n]` + RESET,
        ...globalPrompt,
        ask: () => {
          return prompt.history('webViewerServer').value === 'n';
        }
      },
      office: {
        description: "Do you need client side office viewing support? [y/n]" + RESET,
        ...globalPrompt,
        ask: () => {
          return prompt.history('xod') && prompt.history('xod').value === 'n' && prompt.history('webViewerServer').value === 'n';
        }
      },
      type: {
        description: `Do you need the full PDF API? See ${CYAN}https://www.pdftron.com/documentation/web/guides/optimize-lib-folder${RESET}${DIM} for more info (most users dont need this option). [y/n]` + RESET,
        ...globalPrompt,
        ask: () => {
          return prompt.history('xod') && prompt.history('xod').value === 'n' && prompt.history('webViewerServer').value === 'n';
        }
      },
      salesforce: {
        description: `Do you need to deploy to Salesforce? See ${CYAN}https://www.pdftron.com/documentation/web/guides/optimize-lib-folder${RESET}${DIM} for more info (most users dont need this option). [y/n]` + RESET,
        ...globalPrompt,
        ask: () => {
          return prompt.history('xod') && prompt.history('xod').value === 'n' && prompt.history('webViewerServer').value === 'n';
        }
      }
    }
  }

  prompt.get(schema, (err, result) => {

    if (err) {
      console.log(`\n\n${RED}Process exited. No action will be taken.${RESET}\n`)
      return;
    }

    const { ui, xod = 'n', office = 'n', type = 'n', backup = 'n', salesforce = 'n', webViewerServer = 'n' } = result;

    let filesToDelete = [
      path.resolve(__dirname, '../lib/webviewer.js')
    ];

    let filesToDeleteForSalesforce = [

    ]

    let filesToRelocate = [
      [path.resolve(__dirname, '../lib/core/pdf/pdfnet.res'), resourceDir + '/resource'],
      [path.resolve(__dirname, '../lib/core/pdf/PDFworker.js'), resourceDir + '/resource'],
      [path.resolve(__dirname, '../lib/core/pdf/ResizableWorker.js'), resourceDir + '/resource'],
      [path.resolve(__dirname, '../lib/core/external/'), resourceDir + '/', true],
      [path.resolve(__dirname, '../lib/core/assets'), resourceDir + '/lib/core/', true],
      [path.resolve(__dirname, '../lib/core/external'), resourceDir + '/lib/core/', true],
      [path.resolve(__dirname, '../lib/core/pdf/PDFNet.js'), resourceDir + '/lib/core/pdf/', true],
      [path.resolve(__dirname, '../lib/core/CoreControls.js'), resourceDir + '/lib/core/', true],
      [path.resolve(__dirname, '../lib/core/CoreWorker.js'), resourceDir + '/lib/core/', true],
      [path.resolve(__dirname, '../lib/core/CORSWorker.js'), resourceDir + '/lib/core/', true],
      [path.resolve(__dirname, '../lib/core/DecryptWorker.js'), resourceDir + '/lib/core/', true],
      [path.resolve(__dirname, '../lib/package.json'), resourceDir + '/lib/', true],
      [path.resolve(__dirname, '../lib/webviewer.min.js'), resourceDir + '/lib/', true]

    ]

    // if they are using the new UI
    if (ui === 'y') {
      filesToDelete = [
        ...filesToDelete,
        path.resolve(__dirname, '../lib/ui-legacy'),
        path.resolve(__dirname, '../lib/ui/assets'),
        path.resolve(__dirname, '../lib/ui/CONTRIBUTING.md'),
        path.resolve(__dirname, '../lib/ui/dev-server.js'),
        path.resolve(__dirname, '../lib/ui/i18n'),
        path.resolve(__dirname, '../lib/ui/LICENSE'),
        path.resolve(__dirname, '../lib/ui/.babelrc'),
        path.resolve(__dirname, '../lib/ui/.eslintrc'),
        path.resolve(__dirname, '../lib/ui/package.json'),
        path.resolve(__dirname, '../lib/ui/README.md'),
        path.resolve(__dirname, '../lib/ui/src'),
        path.resolve(__dirname, '../lib/ui/webpack.config.dev.js'),
        path.resolve(__dirname, '../lib/ui/webpack.config.prod.js'),
      ];
      filesToRelocate.push(
        [path.resolve(__dirname, '../lib/ui'), resourceDir + '/lib/', true],
      )
    }
    // If they are using the OLD UI
    else {
      filesToDelete.push(
        path.resolve(__dirname, '../lib/ui')
      );
      filesToRelocate.push(
        [path.resolve(__dirname, '../lib/ui-legacy'), resourceDir + '/lib/', true],
      )
    }

    // If they are not using XOD
    if ( webViewerServer === 'n' && xod === 'n') {

      // if they dont need office
      if (office === 'n') {
        filesToDelete.push(
          path.resolve(__dirname, '../lib/core/office')
        );
      } else {
        filesToRelocate.push(
          [path.resolve(__dirname, '../lib/core/office/OfficeWorker.js'), resourceDir + '/office'],
          [path.resolve(__dirname, '../lib/core/office/WebOfficeWorkerWasm.br.wasm'), resourceDir + '/office'],
          [path.resolve(__dirname, '../lib/core/office/WebOfficeWorkerWasm.br.js.mem'), resourceDir + '/office'],
          // [path.resolve(__dirname, '../lib/core/office/OfficeWorker.js'), resourceDir + '/officeResource'],
          // [path.resolve(__dirname, '../lib/core/office/WebOfficeWorker.gz.mem'), resourceDir + '/officeResource']
        )
        resourcesForZip.push(
          [resourceDir + '/office'],
          // [resourceDir + '/officeResource'],
        )
      }

      // If they dont need the full api
      if (type === 'n') {
        filesToDelete.push(
          path.resolve(__dirname, '../lib/core/pdf/full')
        );
        filesToRelocate.push(
          [path.resolve(__dirname, '../lib/core/pdf/lean/PDFNetCWasm.br.js.mem'), resourceDir + '/lean'],
          [path.resolve(__dirname, '../lib/core/pdf/lean/PDFNetCWasm.br.wasm'), resourceDir + '/lean'],
          [path.resolve(__dirname, '../lib/core/pdf/lean/PDFNetC.gz.js.mem'), resourceDir + '/asm/lean'],
          // [path.resolve(__dirname, '../lib/core/pdf/lean/PDFNetC.gz.mem'), resourceDir + '/asm/lean'],
          [path.resolve(__dirname, '../lib/core/pdf/lean/PDFNetC.gz.mem'), resourceDir + '/resource/lean'],
        )
        resourcesForZip.push(
          [resourceDir + '/lean'],
          [resourceDir + '/asm', 'asm'],
        )
      }
      // If they do need the full API
      else {
        filesToDelete.push(
          path.resolve(__dirname, '../lib/core/pdf/lean')
        );

        filesToRelocate.push(
          [path.resolve(__dirname, '../lib/core/pdf/full/PDFNetCWasm.br.js.mem'), resourceDir + '/full'],
          [path.resolve(__dirname, '../lib/core/pdf/full/PDFNetCWasm.br.wasm'), resourceDir + '/full'],
          [path.resolve(__dirname, '../lib/core/pdf/full/PDFNetC.gz.js.mem'), resourceDir + '/asm/full'],
          [path.resolve(__dirname, '../lib/core/pdf/full/PDFNetC.gz.mem'), resourceDir + '/asm/full'],
          [path.resolve(__dirname, '../lib/core/pdf/full/PDFNetC.gz.mem'), resourceDir + '/resource/full'],
        )
        resourcesForZip.push(
          [resourceDir + '/full'],
          [resourceDir + '/asm', 'asm'],
        )
      }
    }
    // if they are using XOD
    else  if (webViewerServer === 'n') {
      filesToDelete.push(
        path.resolve(__dirname, '../lib/core/office')
      );
      filesToDelete.push(
        path.resolve(__dirname, '../lib/core/pdf')
      );
    }

    if (webViewerServer === 'y') {
      filesToDelete.push(
        path.resolve(__dirname, '../lib/core/pdf/PDFNet.js'),
        path.resolve(__dirname, '../lib/core/office'),
        path.resolve(__dirname, '../lib/core/pdf/full'),
      );
    }
    if (salesforce === 'y') {
      // If they dont need the full api
      if (type === 'n') {
        filesToDeleteForSalesforce.push(
          path.resolve(__dirname, '../lib/core/pdf/lean/PDFWorker.nmf'),
          path.resolve(__dirname, '../lib/core/pdf/lean/PDFWorker.pexe'),
          path.resolve(__dirname, '../lib/core/pdf/lean/PDFWorkerSubzero.nmf'),
        );
      }
      // If they do need the full API
      else {
        filesToDeleteForSalesforce.push(
          path.resolve(__dirname, '../lib/core/pdf/full/PDFWorker.nmf'),
          path.resolve(__dirname, '../lib/core/pdf/full/PDFWorker.pexe'),
          path.resolve(__dirname, '../lib/core/pdf/full/PDFWorkerSubzero.nmf')
        );
      }

      filesToDeleteForSalesforce.push(
        path.resolve(__dirname, '../lib/core/office/WebOfficeWorker.nmf'),
        path.resolve(__dirname, '../lib/core/office/WebOfficeWorker.pexe'),
        path.resolve(__dirname, '../lib/core/office/WebOfficeWorkerSubzero.nmf'),
        path.resolve(__dirname, '../lib/core/office/WebOfficeWorkerWasm.br.wasm')
      )
      resourcesForZip.push([resourceDir + '/lib'])
    }
    console.log(`\n==== ${RED}${BLINK + UNDER}FILES & FOLDERS TO DELETE${RESET} ====\n`)

    filesToDelete.forEach(f => {
      console.log(`${RED}${f}${RESET}`);
    })

    console.log('\n===================================')

    prompt.get({
      properties: {
        delete: {
          description: `The above files will be permanently deleted. Is this okay? ${backup === 'y' ? "(A backup will be created in './lib-backup')" : "(A backup will NOT be created)"} [y|n]${RESET}`,
          ...globalPrompt,
        }
      }
    }, async (err, result) => {

      if (err) {
        console.log(`\n\n${RED}Process exited. No action will be taken.${RESET}\n`)
        return;
      }

      if (result.delete === 'y') {

        if (backup === 'y') {
          console.log(`\n${GREEN}Creating backup...${RESET}`);
          await fs.copy(
            path.resolve(__dirname, '../lib'),
            path.resolve(__dirname, '../lib-backup'),
          )
        }

        console.log(`\n${GREEN}Deleting files...${RESET}`);

        const promises = filesToDelete.map(file => {
          return fs.remove(file);
        })

        await Promise.all(promises);

        if (salesforce === 'y') {
          console.log(`\n${GREEN}Extracting files for salesforce build...${RESET}`);
          const relocatePromises = filesToRelocate.map(([file, dest, isCopy]) => {
            let f = path.basename(file);
            dest = path.resolve(dest, f);
            let func = (isCopy) ? fs.copy : fs.copy ;
            return func(file, dest)
          })

          await Promise.all(relocatePromises);

          console.log(`\n${GREEN}Compressing files...${RESET}`);

          const zipPromises = resourcesForZip.map(item => {
            let [source, tmp=''] = item;
            return new Promise(function(resolve, reject) {
              var output = fs.createWriteStream(source + '.zip');
              var archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
              });
              output.on('close', () => {
                let fi = path.basename(source);
                console.log(fi + '.zip');
                fs.remove(source)
                resolve()
              })
              archive.on('error', reject);
              archive.pipe(output);
              archive.directory(source, tmp);
              archive.finalize();
            })
          })
          await Promise.all(zipPromises);
          console.log(`\n${GREEN}${UNDER}Done! Copy above zipped files into "staticresources" folder of your salesforce app.${RESET}\n`);
          return;
        }
      } else {
        console.log(`\n${RED}Process exited. No action will be taken.${RESET}\n`)
        return;
      }

      console.log(`\n${GREEN}${UNDER}Done! Your lib folder is now optimized for production use.${RESET}\n\n`);
    })

  })
})()
