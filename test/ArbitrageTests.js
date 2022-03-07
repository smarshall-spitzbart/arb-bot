const { expect } = require("chai");
const { ethers } = require("hardhat");
const config = require('../config.json');
const { setupAndManipulatePrice, AMOUNT } = require("../helpers/localPriceManipulator");
const { abi: erc20Abi } = require('@openzeppelin/contracts/build/contracts/ERC20.json');

let deployedContract, arbAgainstContract, deployer;
before(async function () {

  // Use contract factory instead of instantiating ethers.Contract object,
  // since the relevant contract is not already deployed.
  // Note: real deploys should use contract factory constructor instead of "getContractFactory". 
  const flashLoanContract = await ethers.getContractFactory("Arbitrage");
  
  // With hardhat-ethers plugin, contract is deployed to first signer by default.
  deployedContract = await flashLoanContract.deploy(
    config.SUSHISWAP.V2_ROUTER_02_ADDRESS, 
    config.UNISWAP.V2_ROUTER_02_ADDRESS
  );
  [deployer] = await ethers.getSigners();
  arbForContract = new ethers.Contract(process.env.ARB_FOR, erc20Abi, deployer);
})

describe("Arbitrage contract", async function () {
  it("Test token to market Id mapping.", async function () {
   const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const marketId = await deployedContract.getMarketId(wethAddress);
    expect(marketId).to.equal(0);
  });

  it("Test arb opportunity execution.", async function() {
    // Assumes that uniswap price is manipulated, then we have an arb opportunity.
    await setupAndManipulatePrice();
    const startOnUniswap = true;
    const token0 = process.env.ARB_FOR; // WETH.
    const token1 = process.env.ARB_AGAINST; // SHIB was dumped, we wanna pickup the sale.
    console.log("TODO: hardcoded flash amount for now. Can prob unit test more of the profit finding" +
    " functionality from bot.js");
    const flashAmount = AMOUNT / 3; // eh for now lets say we are able to borrow some portion of what the whale dumped.

    const balanceBefore = await arbForContract.balanceOf(await deployer.getAddress());

    await deployedContract.executeTrade(
      startOnUniswap,
      token0,
      token1,
      flashAmount
    );

    const balanceAfter = await arbForContract.balanceOf(await deployer.getAddress());

    const someArbitraryProfit = ethers.utils.parseEther("0.001"); // Probobly around 2.5 dollars, at least in 2022 ;)
    expect(balanceAfter - balanceBefore).to.be.greaterThanOrEqual(Number(someArbitraryProfit));
  })
});

// TODO: is it useful to write full stack tests for a later developed optimization problem for profit/arb detection? 
