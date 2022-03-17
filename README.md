# Arbitrage Bot
Trading bot that utilizes custom Solidity contracts, in conjunction with decentralized exchange contracts, to execute token arbitrage opportunities on any EVM compatible blockchain. 


## Technologies
Javascript/Node.js, Solidity, Hardhat, Ethers.js, Waffle. 


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
The first-pass strategy implemented is only a simple example that goes along with the local price manipulation script. Note that profitable strategies may require more DEXs than just uniswap and sushiswap.

TODO: make strategy more intentional. Still dealing with hooking things up.

If arbitrage direction is opposite, this strategy can fall apart. At least in the case that Sushiswap has lower reserves than uniswap. TODO: this can prob be fixed with a simple check.


## Tests
Each .js file in ```Tests``` serves a uniqie purpose, and allowed for test driven development. 

```LocalPriceManipulationTests.js```: First forks the Ethereum network, specified by a block in the hardhat configuration file. This is achieved via the Alchemy API. We then execute a JSON RPC to the local hardhat test provider to impersonate a specific ethereum account; a whale with enough relevant ERC20 tokens to manipulate the price of a token pair on a DEX contract already deployed to our local test network. The manipulation of price by dumping a large amount of tokens is tested and verified. Note, this functionality is only used to create arbitrage opportunities within a local testing environment.     

```ArbitrageTests.js```: Verifies on-chain functionality for the arbitrage contract, and how it interacts with various deployed contracts. Also verifies critical arbitrage functions within the bot service. TODO: update this.

```BotTests.js```: TODO: update this.


## TODOs
 - general cleanup of documentation
 - Once all the below points are completed.. fork this repo into a private one which will contain arb strategies that should not be shared ;)
 - see TODOs from written notes.
 - move some of the code (like bot.js and helpers) into an src folder. 
 - Figure out unexpectidely small profits from unit tests. Prob has to do with high gas fees and high slippage in making one large transaction in one DEX.
 - In general, maybe even future contract code should be kept private, disallowing people front running hard earned arb
 - Make "FlashAmount more intentional within bot.js. In the unit tests for arb, the flash amount is essentially arbitrary. How should we choose that value? 
 - In reference to above, make profit calc more intelligent
 - Make bot.js consider more than just swaps between two hardcoded token addresses.
- make unit tests for basic functionality of bot.js. Try to brainstorm how that module could be portable for different (private) arb strategies.
 - setup deploy script for mainnet deployments, make it easy to deploy to different chains, see https://docs.ethers.io/v5/api/contract/example/#example-erc-20-contract--deploying-a-contract. Figure out how to set the hardhat config for AVAX network for example.
 - Watch flash loan masterclasses, see where it can be applied to this proj
 - Finish porting over web3 refs to ethers. Unit test more and more of bot.js functionality. 
 - Research new stategies, create modular scripts for each blockchain, implement bot for DEXs on AVAX/FTM/MATIC, etc. 
 - Learn about hardhat tasks, see where they'd have use here. 
 - Ideally make this super portable for new DEXs
