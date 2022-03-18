# Arbitrage Bot
Trading bot that utilizes custom Solidity contracts, in conjunction with decentralized exchange contracts, to execute token arbitrage opportunities on any EVM compatible blockchain. 

To potential employers reviewing my work, please reach out if you wish to see a private fork of this repo with more complexity and DEX integration, along with more in-depth tests. 



## Technologies
Javascript/Node.js, Solidity, Hardhat, Ethers.js, Waffle. 



## Design



### Anatomy of bot.js -- TODO: update from recent refactors, most functionality is in bot helpers.. docstrings there are fine. but a quick TLDR of overall idea is better here. 
The bot is essentially composed of 5 functions.
- *main()*
- *checkPrice()*
- *determineDirection()*
- *determineProfitability()*
- *executeTrade()*

The *main()* function subscribes to swap events from both Uniswap & Sushiswap, and loops forever. 

When a swap event occurs, *checkPrice()* is called, this function will query the current price of the assets on both Uniswap & Sushiswap, and return the **priceDifference**.

Then *determineDirection()* will determine the order of exchanges to execute token swaps. This function will return an array, **routerPath**. The array contains Uniswap & Sushiswap's router contracts. If no array is returned, this means the **priceDifference** returned earlier is not higher than **PRICE_DIFFERENCE** defined in the .env file.

If **routerPath** is not null, then *determineProfitability()* determines whether there is a potential arbitrage or not, and returns a boolean indicating this decision.

If *determineProfitability()* returns true, *executeTrade()* is called, where we make our call to the custom arbitrage contract to perform an arb trade. Afterwards a report is logged, and the bot resumes monitoring.



### Simple Strategy Overview
The first-pass strategy implemented is only a simple example with two hardcoded ERC20 tokens. Note that profitable strategies may require more complexity.

_Planning_

Consider two tokens, one we're "arbing for profits", and one intermediary token we're "arbing against". We'll also use two DEXs in this example, one to swap from our "arb for" token to the "arb against" token, and one to swap back from "arb against" to "arb for" tokens. The hope is that you'd end with more tokens than you've started with, after accounting for gas and flash loan fees.  

First, we get the token reserves from the second ("sell") DEX, then choose a portion of the token1 ("arb against") reserve. This portion will be the theoretical amount of token1 to obtain from the first ("buy") DEX, right now this is portion is 1/2. Next, compute the minimum amount of token0 ("arb for") it'll take to obtain our set amount of token1 from the "buy" DEX. Lastly, we compute the maximum amount of token0 we can obtain from selling our set amount of token1 on the "sell" DEX.
 
If the value of token0 that would be gained exceeds gas fees in ETH (and potential flash loan fees), the theoretical trade would be profitable.

_Execution_

If the planning stage suggests a profitable trade is possible, a flash loan will be used to borrow the relevant amount of token0 planned above. The planned DEX swaps will execute within the context of the custom arbitrage contract. Once finished, funds will automatically return to the flash loan provider, and relevant gains will be transfered to the deployer of the contract.



## Tests
Each .js file in ```Tests``` serves a unique purpose, and allowed for (light) test driven development. Note that tests are not super thorough yet, and really only verify that critical functions are generally working in the way we want them to. 

All tests fork the Ethereum network via Alchemy API, specified by a block number in the hardhat configuration file. They then execute a JSON RPC to the local hardhat provider to impersonate a specific ethereum account. From there, we have a lot of freedom to test arbitrary scenarios.

```LocalPriceManipulationTests.js```: Tests the module that impersonates a whale with enough relevant ERC20 tokens to manipulate the price of a token pair on a DEX contract already deployed to our local test network. The manipulation of price by dumping a large amount of tokens is tested and verified. Note, this functionality is only used to create arbitrage opportunities within a local testing environment.     

```ArbitrageTests.js```: Verifies on-chain functionality for the arbitrage contract, and how it interacts with various deployed contracts.

```BotTests.js```: Tests critical funcitons within the Javascript bot. These determine profitability, monitor prices, token reserves, etc. 



## Setup



### Create an .env file
Before running any scripts, you'll want to create a .env file with the following values (see .env.example):

- **ALCHEMY_API_KEY=""**
- **ARB_FOR="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"** (By default we are using WETH)
- **ARB_AGAINST="0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"** (By default we are using SHIB)
- **ACCOUNT=""** (Account to recieve profit/execute arbitrage contract)
- **PRICE_DIFFERENCE=0.50** (Difference in price between Uniswap & Sushiswap, default is 0.50%)
- **UNITS=0** (Only used for price reporting)
- **GAS_LIMIT=600000** (Currently a hardcoded value, may need to adjust during testing)
- **GAS_PRICE=0.0093** (Currently a hardcoded value, may need to adjust during testing)



### About config.json
Inside the *config.json* file, under the PROJECT_SETTINGS object, there are 2 keys that hold a boolean value:
- isLocal
- shouldExecuteTrade

isLocal: Whether bot should monitor a local hardhat netowork for arb opportunities. If false, the bot will monitor mainnet. 

shouldExecuteTrade: Whether the bot should execute a trade on the custom contract if an arb opportunity is found. This is helpful if you want to monitor mainnet for arb opportunities, but don'
t yet have a contract deployed. 



### Local Testing
1. Install Node.js if needed.
2. ```npm install``` should install needed dependencies to the ```node_modules``` folder. Confirm with ```npx hardhat compile```.
3. You're able to run tests against an ephemeral local network using ```npx hardhat test```.
4. To spin up a persistent local network forked off mainnet, first create an https://www.alchemy.com/ account, and copy the api key to ```.env```.
5. Next, run ```npx hardhat node```.
6. In a separate terminal, you can run scripts against this local network using hardhat CLI, example: ```npx hardhat run script.js --network localhost```.
7. If desired to run a script against an ephemeral network, leave out ```--network localhost```.
8. Run the bot with ```npx hardhat run bot.js --network localhost```.



## TODOs
 - general cleanup of documentation
 - Once all the below points are completed.. fork this repo into a private one which will contain arb strategies that should not be shared. Then can remove some of these TODOs from public repo **ARB-BOT-DELUXE**
 - Port over JS to TS.
 - Verify bot works and can subscribe to on-chain events in sim. Along with tests running.
 - Everything is fully commented
 - move some of the code (like bot.js and helpers) into an src folder. maybe remove the helpers folder altogether
 - Figure out unexpectidely small profits from tests. Prob has to do with high gas fees and high slippage in making one large transaction in one DEX. Try out buying/selling from multiple DEXs with one flashloan? Also try changing hardcoded estimated gas amount.
 - In reference to above, why does sushiswap liquidity pool only have 8 SHIB tokens from the EVM fork we're working off? Conversion error somewhere? Or do we just need to look at other DEXs and liquidity pools.
 - See ```determineProfitability``` - should we make a reserved depletion threshold to experiment with different fractions? Currently hardcoded as 1/2.
 - Make bot.js consider more than just swaps between two hardcoded token addresses.
 - make unit tests for basic functionality of bot.js. Try to brainstorm how that module could be portable for different arb strategies.
 - setup deploy script for mainnet deployments, make it easy to deploy to different chains, see https://docs.ethers.io/v5/api/contract/example/#example-erc-20-contract--deploying-a-contract. Figure out how to set the hardhat config for AVAX network for example.
 - Watch flash loan masterclasses, see where it can be applied to this proj
 - Research new stategies, create modular scripts for each blockchain, implement bot for DEXs on AVAX/FTM/MATIC, etc. 
 - Learn about hardhat tasks, see where they'd have use here. 
 - Ideally make this super portable for new DEXs
