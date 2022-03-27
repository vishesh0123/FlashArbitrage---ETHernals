const { ethers } = require("hardhat");

async function main() {
  const FlashLoan = await ethers.getContractFactory("FlashLoan");
  const flashloan = await FlashLoan.deploy(
    "0x178113104fEcbcD7fF8669a0150721e231F0FD4B"
  );

  await flashloan.deployed();

  console.log("FlashLoan deployed to:", flashloan.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
