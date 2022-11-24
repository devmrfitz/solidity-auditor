import {useState, useRef} from "react";

function App() {
  const [code, setCode] = useState('');
  const [blockExplorerUrl, setBlockExplorerUrl] = useState('');
  const fileUploadRef = useRef(null);
  return (
    <div className="m-5 max-w-7xl mx-auto w-100">
      <h1 className="text-5xl mx-auto w-100 text-center my-4">
        Solidity code auditor
      </h1>
      <div className="my-4 w-8/12">
        <textarea className="my-4 w-full h-[25rem]" placeholder="Write solidity code here..."
          onChange={e => setCode(e.target.value)}
          value={code}
        >

        </textarea>

        <div className="flex justify-center">
          <input type="file" className="hidden" onChange={(e)=> {
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
              setCode(e.target.result);
            };
            fileReader.readAsText(e.target.files[0]);
          }}
          ref={fileUploadRef}/>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  onClick={()=> {
                      fileUploadRef.current.click()
          }}>
              Upload solidity code (.sol file)
          </button>
        </div>

        <div>
        {/*  take etherscan addresses */}
          <div className="my-4">
            <div className="flex justify-center">
              <input type="text" className="w-full" placeholder="Enter etherscan address..."
                     value={blockExplorerUrl}
                     onChange={e => setBlockExplorerUrl(e.target.value)}
              />
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap"
                      onClick={() => {
                        const etherscanAddress = blockExplorerUrl.split('/').pop();
                        let apiUrl = "https://api.etherscan.io/";
                        if (blockExplorerUrl.includes("goerli")) {
                          apiUrl = "https://api-goerli.etherscan.io/";
                        }
                        else if (blockExplorerUrl.includes("kovan")) {
                          apiUrl = "https://api-kovan.etherscan.io/";
                        }
                        else if (blockExplorerUrl.includes("rinkeby")) {
                          apiUrl = "https://api-rinkeby.etherscan.io/";
                        }
                        else if (blockExplorerUrl.includes("ropsten")) {
                          apiUrl = "https://api-ropsten.etherscan.io/";
                        }
                        else if (blockExplorerUrl.includes("sepolia")) {
                          apiUrl = "https://api-sepolia.etherscan.io/";
                        }
                        console.log(etherscanAddress);
                        fetch(apiUrl+
                        `api?module=contract&action=getsourcecode&address=${etherscanAddress}&`+
                            `apikey=YQGC4KH8FF3678SIHA8NP1RXAQHZ2AZAUN`).then((response) => response.json())
                        .then((data) => setCode(data.result[0].SourceCode));
                      }
                      }
              >
                  Load contract
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
