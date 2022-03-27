require("dotenv").config();
const quickswap = require("./DexIntigration/quickswap");
const apeswap = require("./DexIntigration/apeswap");
const dyfn = require("./DexIntigration/dfyn");

const { abi } = require("./abis");
const { addresses } = require("./address");
const { ethers, BigNumber } = require("ethers");
const { formatEther, parseUnits, formatUnits } = require("ethers/lib/utils");
const provider = new ethers.providers.WebSocketProvider(process.env.POLYGON);

const arbitrage = async () => {
  let initialusdt = 100;
  const EurA3CrvPool = new ethers.Contract(
    addresses.mainnet.polygon.curve_eura3crvpool,
    abi.IEurA3CrvPool,
    provider
  );
  const Quoter = new ethers.Contract(
    addresses.mainnet.polygon.quoter,
    abi.IQuoter,
    provider
  );

  const dy_dai_from_usdt = await EurA3CrvPool.get_dy_underlying(
    3,
    1,
    parseUnits(initialusdt.toString(), "6")
  ); // returns amount of dai in 18 decimals
  console.log(
    `${initialusdt} USDT =  ${formatUnits(
      dy_dai_from_usdt.toString(),
      "18"
    )} DAI`
  );

  const dy2 = Math.max(
    parseFloat(await quickswap(2, dy_dai_from_usdt, provider)),
    parseFloat(await apeswap(2, dy_dai_from_usdt, provider)),
    formatUnits(
      (await Quoter.callStatic
        .quoteExactInputSingle(
          addresses.mainnet.polygon.dai,
          addresses.mainnet.polygon.wmatic,
          3000,
          dy_dai_from_usdt,
          0
        )
        .toString(),
      "18")
    )
  );

  console.log(
    `${formatUnits(dy_dai_from_usdt.toString(), "18")} DAI = ${dy2} MATIC`
  );
  const dy3 = Math.max(
    parseFloat(await quickswap(3, parseUnits(dy2.toString(), "18"), provider)),
    parseFloat(await apeswap(3, parseUnits(dy2.toString(), "18"), provider)),
    parseFloat(await dyfn(3, parseUnits(dy2.toString(), "18"), provider)),
    formatUnits(
      (await Quoter.callStatic
        .quoteExactInputSingle(
          addresses.mainnet.polygon.wmatic,
          addresses.mainnet.polygon.usdt,
          500,
          dy_dai_from_usdt,
          0
        )
        .toString(),
      "18")
    )
  );

  console.log(`${dy2.toString()} MATIC = ${dy3} USDT`);

  const diff = -initialusdt + dy3;
  console.log(diff);
  //});
};
arbitrage();
