const express = require('express');
const fs = require("fs");
const parser = require("@solidity-parser/parser");
const Git = require("nodegit");
const router = express.Router();

const PRICE_PER_LINE = 12;

router.post('/upload-code', function(req, res, next) {
  const code = req.body;
  const prettier = require("prettier");
  const fs = require('fs');

  const hashFiles = JSON.parse(fs.readFileSync(__dirname + '/../hashes_cache.json', 'utf-8'));
  const currentHashes = {};


  let notMatchingLines = 0;
  let matchingLines = 0;

  let matches = [];
  let needToBeManuallyAudited = [];




  // Write code to file
  let formattedCode = prettier.format(code, { semi: false, filepath: "solidity.sol" }).replace(/^\s*[\r\n]/gm, '')
      .split(/\r?\n/)
    .map(row => row.trim().split(/\s+/).join(' '))
    .join('\n');
  const parser = require('@solidity-parser/parser');

  const parsing_result = parser.parse(formattedCode, {
      loc: true,
    }).children.filter(child => child.type === 'ContractDefinition');
  // console.log(JSON.stringify(parsing_result, null, 2));
  const node_list = [];
  parsing_result.forEach(contract => {
    contract.subNodes.forEach(subNode => {
      if ( ['FunctionDefinition', 'ModifierDefinition', 'StructDefinition', 'StateVariableDeclaration'
      ].includes(subNode.type) ) {
        node_list.push([subNode.loc.start.line-1, subNode.loc.end.line-1, subNode.name, subNode.type]);
      }
    })});



    node_list.forEach(node => {
      const start = node[0];
      const end = node[1];
      const hash = require('crypto').createHash('sha256').update(formattedCode.split('\n').slice(start, end+1).join('\n')).digest('hex');
      currentHashes[hash] = [start, end, node[2]];
      if (hashFiles[hash]) {
        matchingLines += (end - start + 1);
        matches.push({
          OpenZeppelinVersion: hashFiles[hash][4],
          contract: hashFiles[hash][0],
          name: hashFiles[hash][3],
          type: node[3],
        });
      }
      else {
        notMatchingLines += (end - start + 1);
        needToBeManuallyAudited.push(node[2]);
      }
    })
  const estimatedPrice = `\$${notMatchingLines * PRICE_PER_LINE}`;
  res.json( { matches, matchingLines, totalLines: notMatchingLines + matchingLines, estimatedPrice,
    needToBeManuallyAudited });
});

function scan_folder(fileDir, fileContext, hashFiles) {

    function getAllFiles(dir, allFilesList = []) {
      const files = fs.readdirSync(dir);
      files.map(file => {
        const name = dir + '/' + file;
        if (fs.statSync(name).isDirectory()) { // check if subdirectory is present
          getAllFiles(name, allFilesList);     // do recursive execution for subdirectory
        } else {
          allFilesList.push(name);           // push filename into the array
        }
      })

      return allFilesList;
    }

    const allFiles = getAllFiles(fileDir);
    const fileEndsWith = allFiles.filter(file => file.endsWith('.sol'));

    let i = 0;
    fileEndsWith.forEach(file => {
      console.log(fileContext, i, "/", fileEndsWith.length);
      i = i + 1;
      const code = fs.readFileSync(file, 'utf8');

      const prettier = require("prettier");
      // Write code to file
      let formattedCode = prettier.format(code, {semi: false, filepath: "solidity.sol"}).replace(/^\s*[\r\n]/gm, '')
          .split(/\r?\n/)
          .map(row => row.trim().split(/\s+/).join(' '))
          .join('\n');
      const parser = require('@solidity-parser/parser');

      const parsing_result = parser.parse(formattedCode, {
        loc: true,
      }).children.filter(child => child.type === 'ContractDefinition');
      const node_list = [];
      parsing_result.forEach(contract => {
        contract.subNodes.forEach(subNode => {
          if ( ['FunctionDefinition', 'ModifierDefinition', 'StructDefinition', 'StateVariableDeclaration'
      ].includes(subNode.type) ) {
            node_list.push([subNode.loc.start.line - 1, subNode.loc.end.line - 1, subNode.name, subNode.type]);
          }
        })
      });

      node_list.forEach(node => {
        const start = node[0];
        const end = node[1];
        const hash = require('crypto').createHash('sha256').update(formattedCode.split('\n').slice(start, end + 1).join('\n')).digest('hex');
        hashFiles[hash] = [file.split("contracts-source/")[1], start, end, node[2], fileContext];
      })
    })
}

router.get('/get-code', async function (req, res, next) {
  const fs = require('fs');
  const hashFiles = {};

  fs.rmSync("contracts-source", {recursive: true, force: true})

  // Clone the OpenZeppelin repo
  const Git = require("nodegit");
  let repo = await Git.Clone("https://github.com/OpenZeppelin/openzeppelin-contracts.git", "contracts-source/openzeppelin-contracts")

  for (const releaseTag of ["v3.0.0", "v3.1.0", "v3.2.0", "v3.3", "v3.4", "v4.0", "v4.1", "v4.2",  "v4.3", "v4.4",
    "v4.5", "v4.6", "v4.7", "v4.8"]) {
    const branchName = `release-${releaseTag}`;

    await repo.checkoutRef(await repo.getBranch(`refs/remotes/origin/${branchName}`), {});

    const fileDir = __dirname + '/../contracts-source/openzeppelin-contracts/contracts';

    scan_folder(fileDir, `OpenZepplin-${releaseTag}`, hashFiles)
  }

  await Git.Clone("https://github.com/Uniswap/v2-core.git", "contracts-source/uniswap-v2-core")

  scan_folder(__dirname + '/../contracts-source/uniswap-v2-core/contracts', "Uniswap-v2-core", hashFiles)

  await Git.Clone("https://github.com/Uniswap/v3-core.git", "contracts-source/uniswap-v3-core")

  scan_folder(__dirname + '/../contracts-source/uniswap-v3-core/contracts', "Uniswap-v3-core", hashFiles)

  await Git.Clone("https://github.com/pancakeswap/pancake-smart-contracts.git", "contracts-source/pancake-smart-contracts")

  scan_folder(__dirname + '/../contracts-source/pancake-smart-contracts/projects', "PancakeSwap", hashFiles);


  // Write to file
  const filePath = __dirname + '/../hashes_cache.json';


  fs.writeFile(filePath, JSON.stringify(hashFiles, null, 2), function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });

  res.render('index', {title: 'done'});

})
module.exports = router;
