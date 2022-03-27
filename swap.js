require("dotenv").config();
const { decode } = require("./txdata");

const { ethers, BigNumber } = require("ethers");
const {
  parseUnits,
  formatUnits,
  formatEther,
  AbiCoder,
} = require("ethers/lib/utils");
const abicoder = new AbiCoder();

const apiBaseUrl = "https://api.1inch.io/v4.0/137";
const quotemethod = "/swap";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const mywallet = "0x371B0b9241247c59cD60C1dd7aCf311E323eeEd8";
const fladdress = "0xd4A2A37938EB34B4df6221aA9Dc53B4D96E964f4";

const flabi = ["function flashloancall(uint256[]  amount, bytes  parameters)"];

const provider = new ethers.providers.WebSocketProvider(process.env.POLYGON);
let wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const flashloan = new ethers.Contract(fladdress, flabi, provider);

const initialusdt = 10;
const initialmatic = 80;
function apiRequestUrl(methodName, queryParams) {
  return (
    apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString()
  );
}
const swapParams1 = {
  fromTokenAddress: USDT,
  toTokenAddress: DAI,
  amount: parseUnits(initialusdt.toString(), "6"),
  fromAddress: fladdress,
  slippage: 1,
  disableEstimate: true,

  allowPartialFill: false,
};
const swapParams2 = {
  fromTokenAddress: WMATIC,
  toTokenAddress: USDT,
  amount: parseUnits(initialmatic.toString(), "18"),
  fromAddress: mywallet,
  slippage: 1,
  disableEstimate: true,
  allowPartialFill: false,
};
const swapParams3 = {
  fromTokenAddress: USDT,
  toTokenAddress: WMATIC,
  amount: 0,
  fromAddress: mywallet,
  slippage: 1,
  disableEstimate: true,
  allowPartialFill: false,
};
const swapParams4 = {
  fromTokenAddress: DAI,
  toTokenAddress: WMATIC,
  amount: 0,
  fromAddress: mywallet,
  slippage: 1,
  disableEstimate: true,
  allowPartialFill: false,
};
let maxprofit = -50;
const arbitrage = async () => {
  let module = await import("./node_modules/node-fetch/src/index.js");

  //STEP 1 USDT ----> DAI
  const res1 = await module.fetch(apiRequestUrl(quotemethod, swapParams1));
  const json1 = await res1.json();

  const usdt_to_dai_1 = formatEther(BigNumber.from(json1.toTokenAmount));

  console.log(`${initialusdt} USDT = ${usdt_to_dai_1} DAI`);

  //STEP 2 MATIC --------> USDT
  const res2 = await module.fetch(apiRequestUrl(quotemethod, swapParams2));
  const json2 = await res2.json();
  const matic_to_usdt_2 = formatUnits(BigNumber.from(json2.toTokenAmount), "6");

  console.log(`${initialmatic} MATIC = ${matic_to_usdt_2} USDT`);

  //STEP 3 USDT TO MATIC
  const remainedusdt = (
    parseFloat(matic_to_usdt_2) -
    initialusdt -
    0.0009 * initialusdt
  ).toFixed(6);

  console.log(`Remained USDT = ${remainedusdt} USDT`);
  swapParams3.amount = parseUnits(remainedusdt, "6");
  const res3 = await module.fetch(apiRequestUrl(quotemethod, swapParams3));
  const json3 = await res3.json();
  const rusdt_to_matic_3 = formatUnits(
    BigNumber.from(json3.toTokenAmount),
    "18"
  );
  console.log(`${remainedusdt} USDT = ${rusdt_to_matic_3} MATIC`);

  //STEP 4 DAI ------> MATIC
  swapParams4.amount = parseUnits(usdt_to_dai_1, "18").toString();
  const res4 = await module.fetch(apiRequestUrl(quotemethod, swapParams4));
  const json4 = await res4.json();

  const dai_to_matic_4 = formatUnits(BigNumber.from(json4.toTokenAmount), "18");

  console.log(`${usdt_to_dai_1} DAI = ${dai_to_matic_4} MATIC`);
  const profit =
    parseFloat(rusdt_to_matic_3) +
    parseFloat(dai_to_matic_4) -
    initialmatic -
    initialmatic * 0.0009;
  console.log(profit);
  if (profit > maxprofit) {
    maxprofit = profit;
  }
  console.log(`Max Profit: ${maxprofit}`);

  // console.log(
  //   `Fee [${initialusdt * 0.0009} USDT , ${
  //     initialmatic * 0.0009
  //   } MATIC]\nProfit(MATIC) = ${
  //     parseFloat(rusdt_to_matic_3) +
  //     parseFloat(dai_to_matic_4) -
  //     initialmatic -
  //     initialmatic * 0.0009
  //   }\n-------------------------------------------------------`
  // );

  // TRANSACTION EXECUTION

  if (profit > 0.05) {
    const param2 = abicoder.encode(
      ["bytes", "bytes", "bytes", "bytes"],
      [
        decode(json1.tx.data),
        decode(json2.tx.data),
        decode(json3.tx.data),
        decode(json4.tx.data),
      ]
    );

    const param1 = [
      parseUnits(initialusdt.toString(), "6"),
      parseUnits(initialmatic.toString(), "18"),
    ];
    const flashloansigner = flashloan.connect(wallet);

    const tx = await flashloansigner.flashloancall(param1, param2, {
      gasLimit: 2000000,
      gasPrice: 31000000000,
    });
    await tx.wait();
  }
  arbitrage();
};
arbitrage();
