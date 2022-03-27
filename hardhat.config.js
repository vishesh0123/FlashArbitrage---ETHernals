require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    polygon: {
      url: process.env.POLYGON_MAINNET,
      accounts: [process.env.PRIVATE_KEY],
    },
    mumbai: {
      url: process.env.POLYGON_MUMBAI,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      polygon: "NUCCYDTQF3VWJ8YT5YRQ5PT52S6G14CK4H",
      polygonMumbai: "NUCCYDTQF3VWJ8YT5YRQ5PT52S6G14CK4H",
    },
  },

  solidity: "0.6.12",
};
