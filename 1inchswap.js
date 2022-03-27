const { ethers, BigNumber } = require("ethers");
const { parseUnits, formatUnits, formatEther } = require("ethers/lib/utils");
const apiBaseUrl = "https://api.1inch.io/v4.0/137";
const quotemethod = "/quote";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const mywallet = "0x371B0b9241247c59cD60C1dd7aCf311E323eeEd8";
const initialusdt = 50000;
const initialmatic = 34000;
function apiRequestUrl(methodName, queryParams) {
  return (
    apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString()
  );
}
//STEP 1 SWAP USDT TO DAI
const quote1Params = {
  fromTokenAddress: USDT, // 1INCH
  toTokenAddress: DAI, // DAI
  amount: parseUnits(initialusdt.toString(), "6").toString(),
};

const quote2Params = {
  fromTokenAddress: WMATIC,
  toTokenAddress: USDT,
  amount: parseUnits(initialmatic.toString(), "18").toString(),
};

const arbitrage = async () => {
  let module = await import("./node_modules/node-fetch/src/index.js");

  // STEP 1 USDT -------> DAI
  const res1 = await module.fetch(apiRequestUrl(quotemethod, quote1Params));
  const usdt_to_dai_1 = formatEther(
    BigNumber.from((await res1.json()).toTokenAmount)
  );
  // console.log(`${initialusdt} USDT = ${usdt_to_dai_1} DAI`);
  //STEP 2 MATIC --------> USDT
  const res2 = await module.fetch(apiRequestUrl(quotemethod, quote2Params));
  const matic_to_usdt_2 = formatUnits(
    BigNumber.from((await res2.json()).toTokenAmount),
    "6"
  );
  // console.log(`${initialmatic} MATIC = ${matic_to_usdt_2} USDT`);

  //STEP 3 USDT TO MATIC
  const remainedusdt = (
    parseFloat(matic_to_usdt_2) -
    initialusdt -
    0.0009 * initialusdt
  ).toFixed(6);
  console.log(remainedusdt);

  // console.log(`Remained USDT = ${remainedusdt} USDT`);

  const quote3Params = {
    fromTokenAddress: USDT, // 1INCH
    toTokenAddress: WMATIC, // DAI
    amount: parseUnits(remainedusdt, "6"),
  };
  const res3 = await module.fetch(apiRequestUrl(quotemethod, quote3Params));
  const rusdt_to_matic_3 = formatUnits(
    BigNumber.from((await res3.json()).toTokenAmount),
    "18"
  );

  //STEP 4 DAI ------> MATIC

  const quote4Params = {
    fromTokenAddress: DAI, // 1INCH
    toTokenAddress: WMATIC, // DAI
    amount: parseUnits(usdt_to_dai_1, "18"),
  };
  const res4 = await module.fetch(apiRequestUrl(quotemethod, quote4Params));
  const dai_to_matic_4 = formatUnits(
    BigNumber.from((await res4.json()).toTokenAmount),
    "18"
  );

  // console.log(`${usdt_to_dai_1} DAI = ${dai_to_matic_4} MATIC`);

  // console.log(`${remainedusdt} USDT = ${rusdt_to_matic_3} MATIC`);
  // console.log(
  //   `Total MATIC : ${parseFloat(rusdt_to_matic_3) + parseFloat(dai_to_matic_4)}`
  // );
  console.log(
    `Fee [${initialusdt * 0.0009} USDT , ${
      initialmatic * 0.0009
    } MATIC]\nProfit(MATIC) = ${
      parseFloat(rusdt_to_matic_3) +
      parseFloat(dai_to_matic_4) -
      initialmatic -
      initialmatic * 0.0009
    }\n-------------------------------------------------------`
  );
  arbitrage();
};

arbitrage();
