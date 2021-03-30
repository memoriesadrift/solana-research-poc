To github.com:memoriesadrift/solana-research-poc.git
   dfa87c9..f242128  main -> main
A simple script that creates two accounts on the Solana devnet, airdrops some funds into them and then transfers funds from one account to the other. 

# Run
Install dependenciess, then run, simple.

```
npm install 
node index.js
```

# To-do
- [x] Send Transaction
- [x] Create Staking Account
- [x] Delegate Stake

# Key Innovation Concept
Proof of History - Trustless establishment of a concept of time
	Uses a verifiable delay function, VDF
This allows transactions to happen very quickly, a new block is created every ~400ms

# Development Details
* Smart contracts are written in Rust or C (or C++, but I haven't found any tutorials aimed explicitly at C++), with Rust generally being preferred.
* The JS library, solana-web3-js is not documented very well and mostly contains just an overview of functions that are available and the parameters they take.
    * It seems the docs are being reworked now, though, so we shall see what comes of it.
	
# Staking on Solana
* SOL tokens in your wallet must first be moved into a stake account. You can create as many stake accounts as you like, and deposit as much or as little SOL into each stake account as you want. Each new stake account has a unique address, and a single wallet can manage or “authorize” many different stake accounts. https://docs.solana.com/staking/stake-accounts
	* Certain types of accounts may have one or more signing authorities associated with a given account. Staking accounts have the _stake authority_ and the _withdraw authority_ which allows that account to delegate tokens and the tokens to be withdrawn _and for a new instance of each of these authorties to be set!_ 
* It is possible to stake locked tokens (such as tokens received as rewards from Solana grants)
* Process of staking: https://solana.com/staking#removetokensstake
* Rewards are issued once per Epoch
* As the number of nodes on Mainnet Beta continues to grow, the Solana Foundation is committed to continuing to delegate 100M SOL to be split evenly among qualified validators. In order to increase growth to up to 500 individual nodes, which will help increase the security of the network, qualified validators will receive Foundation delegations of up to 200,000 SOL.
 
## Slashing
* Fundamentally, our goal for slashing is *to slash 100% in cases where the node is maliciously trying to violate safety rules* and 0% during routine operation. How we aim to achieve that is to first implement slashing proofs without any automatic slashing whatsoever. 
* Right now, for regular consensus, after a safety violation, the network will halt. We can analyze the data and figure out who was responsible and propose that the stake should be slashed after restart. 
	* A similar approach will be used with an optimistic conf. An optimistic conf safety violation is easily observable, but under normal circumstances, an optimistic confirmation safety violation may not halt the network. Once the violation has been observed, the validators will freeze the affected stake in the next epoch and will decide on the next upgrade if the violation requires slashing. In the long term, transactions should be able to recover a portion of the slashing collateral if the optimistic safety violation is proven. In that scenario, each block is effectively insured by the network.
  * https://docs.solana.com/proposals/optimistic-confirmation-and-slashing#slashing-roadmap

## Inflation
* 100% of the inflationary issuances are proposed to be delivered to delegated stake accounts and validators.
*   Initial Inflation Rate: 8 %
    Dis-inflation Rate: −15%
    Long-term Inflation Rate: 1.5% 
    https://solana.com/staking#inflationrate
    
# Staking Workflow
1. Create a Staking Account. Can be done via Solana CLI or via code in JS / Rust ->  An on-chain transaction.
2. Send funds to Staking Account.
3. Delegate your Staking Account to a validator.
## On Adding Stake, Redelegating
If you transfer tokens into a stake account that is already delegated, these new tokens **will not automatically be delegated.**
In order to get these new tokens also delegated and earning rewards, you would need to *un-delegate the entire account, then re-delegate the same account.*
As un-delegating and re-delegating can take several days to take effect, your original stake would not be earning rewards during this transition period
*Therefore, we recommend only transferring SOL into a stake account when it is first created or otherwise not delegated.*
