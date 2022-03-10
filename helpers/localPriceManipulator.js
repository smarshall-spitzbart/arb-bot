require("dotenv").config();
const { UNISWAP, SUSHISWAP } = require("../config.json");
const { ChainId, WETH } = require("@uniswap/sdk");
const { abi: uniSwapRouterAbi } = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const { abi: uniSwapFactoryAbi } = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const { abi: erc20Abi } = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const { ethers } = require("hardhat");
const { getPairContract, calculatePrice, getProvider, warnAboutEphemeralNetwork } = require("./generalHelpers");

// Impersonation account config, see etherscan for more details.
const ACCOUNT_TO_IMPERSONATE = "0x72a53cdbbcc1b9efa39c834a540550e23463aacb";  
const AMOUNT = "3000000000000"; // This is a lot of SHIB! TODO: Try out smaller dump values with smaller liquidity pools. 
const GAS = 450000;
const CHAIN_ID = ChainId.MAINNET; // We've forked mainnet here. 

/**
 * Manipulates the price of a relevant token pair, to properly test arbitrage opportunities
 * in a local dev environment.  
 * @param  {} amount of tokens to dump in order to manipulate price on local chain.  
 */
async function setupAndManipulatePrice(amount) {

    warnAboutEphemeralNetwork();

    const signer = await impersonateWhaleAccount();

    // Instantiate contract objects.
    // In this context, router contract will be used to actually execute swap,
    // while factory contract will be used to log before and after prices.
    const uniSwapFactory = new ethers.Contract(UNISWAP.FACTORY_ADDRESS, uniSwapFactoryAbi, signer);
    const uniSwapRouter = new ethers.Contract(UNISWAP.V2_ROUTER_02_ADDRESS, uniSwapRouterAbi, signer);
    const erc20Contract = new ethers.Contract(process.env.ARB_AGAINST, erc20Abi, signer);

    // TODO: Make more manipulation scenarios possible with this script.
    // const sushiSwapFactory = new ethers.Contract(SUSHISWAP.FACTORY_ADDRESS, uniSwapFactoryAbi, signer);
    // const sushiSwapRouter = new ethers.Contract(SUSHISWAP.V2_ROUTER_02_ADDRESS, uniSwapRouterAbi, signer);

    // Arbitrage opportunity will be against given ERC20 token.
    const wEthContract = new ethers.Contract(WETH[CHAIN_ID].address, erc20Abi, signer);

    const factoryToUse = uniSwapFactory;
    const routerToUse = uniSwapRouter;

    const pairContract = await getPairContract(factoryToUse, process.env.ARB_AGAINST, WETH[CHAIN_ID].address, signer);

    // Fetch price of SHIB/WETH before we execute the swap.
    const priceBefore = await calculatePrice(pairContract);

    // Note: Pass in original signer to recieve swapped token.
    const recieverOfSwap = signer.address;
    
    await manipulatePrice(erc20Contract, routerToUse, recieverOfSwap, amount); 

    // Fetch price of SHIB/WETH after the swap.
    const priceAfter = await calculatePrice(pairContract);

    const ercSymbol = await erc20Contract.symbol(); 
    const data = {
        'Price Before': `1 ${WETH[CHAIN_ID].symbol} = ${Number(priceBefore).toFixed(0)} ${ercSymbol}`,
        'Price After': `1 ${WETH[CHAIN_ID].symbol} = ${Number(priceAfter).toFixed(0)} ${ercSymbol}`,
    }
    console.table(data);

    const balance = await wEthContract.balanceOf(recieverOfSwap);
    balanceInWEth = ethers.utils.formatEther(balance.toString());

    console.log(`\nBalance in reciever account[${recieverOfSwap}]: ${balanceInWEth} WETH.\n`);

    await stopImpersonatingWhale();

    return {priceBefore, priceAfter};
}

/**
 * @returns A whale account signer from ACCOUNT_TO_IMPERSONATE globally defined above.
 */
async function impersonateWhaleAccount() {
    // Hardhat's method of impersonating a whale account. See https://hardhat.org/hardhat-network/reference/#hardhat-impersonateaccount.
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ACCOUNT_TO_IMPERSONATE],
    });
    return ethers.getSigner(ACCOUNT_TO_IMPERSONATE);
}

async function stopImpersonatingWhale() {
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ACCOUNT_TO_IMPERSONATE],
    });
}

/**
 * Dumps tokens specified by given ERC20 contract, swapped for WETH that is sent to specified address.
 * Creates an arbitrage opportunity to test against the bot.
 * @param {} Contract for ERC20 token that we're arbing against, assumed already signed.
 * @param {} DEX router to execute exchange, assumed already signed.
 * @param {} Address to recieve funds.
 * @param {} amount of tokens to dump in order to manipulate price on local chain.  
 */
async function manipulatePrice(erc20contract, router, addressToRecieve, amount) {
    const tokenSymbol = await erc20contract.symbol();
    const wEthSymbol = WETH[CHAIN_ID].symbol;
    console.log(`\nBeginning Swap...\n`);
    console.log(`Input Token: ${tokenSymbol}`);
    console.log(`Output Token: ${wEthSymbol}\n`);

    const amountInSmallestDecimal = ethers.utils.parseUnits(amount.toString(), "ether"); 
    const path = [erc20contract.address, WETH[CHAIN_ID].address];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes.
    const options = { gasLimit: GAS };

    await erc20contract.approve(router.address, amountInSmallestDecimal);
    
    // Both uniswap and sushiswap implement the "swapExactTokensForTokens" function. 
    // See: https://docs.uniswap.org/protocol/V2/reference/smart-contracts/router-02#swapexacttokensfortokens.
    // Note that swap will not fully execute at the current price, according to slippage.  
    const receipt = await router.swapExactTokensForTokens(
        amountInSmallestDecimal, // Amount of input tokens.
        0, // minimum amount of output tokens.
        path, // liquidity pool path.
        addressToRecieve, // Reciever of profit.
        deadline, // Timeout to fail transaction.
        options); // includes gas limit.

    console.log(`Swap Complete!\n`);

    return receipt;
}

module.exports = {
    AMOUNT,
    ACCOUNT_TO_IMPERSONATE,
    setupAndManipulatePrice,
    impersonateWhaleAccount,
    manipulatePrice,
};
