const express = require('express');
const router = express.Router();

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
  const node_list = [];
  parsing_result.forEach(contract => {
    contract.subNodes.forEach(subNode => {
      if (subNode.type === 'FunctionDefinition') {
        node_list.push([subNode.loc.start.line-1, subNode.loc.end.line-1, subNode.name]);
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
          contract: hashFiles[hash][0],
          function: hashFiles[hash][3],
        });
      }
      else {
        notMatchingLines += (end - start + 1);
        needToBeManuallyAudited.push(node[2]);
      }
    })
  res.json( { matches, matchingLines, totalLines: formattedCode.split('\n').length, needToBeManuallyAudited });
});



router.get('/get-code', function(req, res, next) {
  // iterate through a directory and read all files
  const fs = require('fs');

  const fileDir = __dirname + '/../openzeppelin-contracts/contracts';

  function getAllFiles (dir, allFilesList = []){
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

  console.log(fileEndsWith);

  const hashFiles = {};
  let i = 0;
  fileEndsWith.forEach(file => {
    console.log(i,"/",fileEndsWith.length);
    i=i+1;
    const code = fs.readFileSync(file, 'utf8');

  const prettier = require("prettier");
  // Write code to file
  let formattedCode = prettier.format(code, { semi: false, filepath: "solidity.sol" }).replace(/^\s*[\r\n]/gm, '')
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
      if (subNode.type === 'FunctionDefinition') {
        node_list.push([subNode.loc.start.line-1, subNode.loc.end.line-1, subNode.name]);
      }
    })});

    node_list.forEach(node => {
      const start = node[0];
      const end = node[1];
      const hash = require('crypto').createHash('sha256').update(formattedCode.split('\n').slice(start, end+1).join('\n')).digest('hex');
      hashFiles[hash] = [file.split("openzeppelin-contracts/")[1], start, end, node[2]];
    })
  })



  const filePath = __dirname + '/../hashes_cache.json';


  fs.writeFile(filePath, JSON.stringify(hashFiles, null, 2), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file was saved!");
    });

  res.render('index', { title: 'done' });

})
module.exports = router;
