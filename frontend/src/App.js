import {useState, useRef} from "react";

function App() {
  const [code, setCode] = useState('');
  const [blockExplorerUrl, setBlockExplorerUrl] = useState('');
  const [resp, setResp] = useState('');
  const fileUploadRef = useRef(null);
  console.log(resp);
  return (
    <div className="m-5 max-w-7xl mx-auto w-100 grid grid-cols-12 gap-5 ">
      <h1 className="text-5xl mx-auto w-100 text-center my-4 col-span-12">
        Solidity code auditor
      </h1>
      <div className="col-span-8 row-span-1">
        <textarea className="w-full h-[25rem]" placeholder="Write solidity code here..."
          onChange={e => setCode(e.target.value)}
          value={code}
        >

        </textarea>
      </div>

      <div className="col-span-4 row-span-1 h-full">
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
      <div className="col-span-8">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  fetch(`${process.env.REACT_APP_BACKEND_URL}/upload-code`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'text/plain'
                    },
                    body: code
                  }).then((response) => response.json())
                      .then((data) => setResp(data));
                }}
        >Submit for audit</button>
      </div>
      <div className={"col-span-12"}>
        {<pre>{JSON.stringify(resp, null, 2)}</pre>}
      </div>
    </div>
  );
}

export default App;
