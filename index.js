const solanaWeb3 = require('@solana/web3.js');

const url = 'https://api.devnet.solana.com';
const connection = new solanaWeb3.Connection(url, 'singleGossip');

// Helper function for newAccountWithLamports from solana/hello-world
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to create an account and populate it with tokens, from solana/hello-world
// The reason the account has to be created like this is that the airdrop function likes to take a while
// and hangs unexpectedly from time to time - I don't know why. It seems the Solana team are aware of this
// but since it's just a devnet / localnet feature, it doesn't really merit any worrying.
async function newAccountWithLamports(
  connection,
  lamports = 2000000000 // 2 SOL
) {
  const account = new solanaWeb3.Account();

  let retries = 0;
  await connection.requestAirdrop(account.publicKey, lamports);
  for (; ;) {
    await sleep(500);
    if (lamports == (await connection.getBalance(account.publicKey))) {
      return account;
    }
    if (++retries <= 10) {
      break;
    }
    console.log(`Airdrop retry ${retries}`);
  }
  throw new Error(`Airdrop of ${lamports} failed`);
}

async function testTransfer(
  fromAccount,
  toAccount,
  amt
) {
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: fromAccount.publicKey,
      toPubkey: toAccount.publicKey,
      lamports: amt,
    }),
  );
  let txSignature = await solanaWeb3.sendAndConfirmTransaction(connection, tx, [fromAccount]);
  console.log(`Transferred ${amt / solanaWeb3.LAMPORTS_PER_SOL} $SOL from ${fromAccount.publicKey} to ${toAccount.publicKey}. Signature: ${txSignature}`)
  console.log(`Receipt: ${"https://explorer.solana.com/tx/" + txSignature + "?cluster=devnet"}`)
}

async function testCreateStakeAccount(
  fromAccount,
  amt
) {
  let stakeAccount = new solanaWeb3.Account(); // The new stake account keypair
  let authorized = new solanaWeb3.Authorized(fromAccount.publicKey, fromAccount.publicKey); // An object to track who is authorised to Stake or Withdraw (addresses)
  let lockup = new solanaWeb3.Lockup(0, 0, fromAccount.publicKey); // Lockup is disabled if the unix timestamp and epoch are both zero

  // This is the actual transaction that creates the staking account.
  // It can be thought that it "populates" the account created above
  // with the necessary instructions to begin staking.
  let stakeAccountParams = {
    fromPubkey: fromAccount.publicKey,
    authorized: authorized,
    lamports: amt,
    lockup: lockup,
    stakePubkey: stakeAccount.publicKey
  };


  let createStakeAccountTx = solanaWeb3.StakeProgram.createAccount(stakeAccountParams);
  // Tx has to be signed by the payer as well as the stake account - to prove ownership of stake account
  // "to create any account on-chain, you need some proof of ownership of a private key associated with that account.
  // the simplest way is through a signature from the private key associated with that public key."
  let txSignature = await solanaWeb3.sendAndConfirmTransaction(connection, createStakeAccountTx, [fromAccount, stakeAccount]);
  let stakeAccountBalance = await connection.getBalance(stakeAccount.publicKey);

  console.log(`Created Staking Account with pubkey: ${stakeAccount.publicKey}. Its balance is: ${stakeAccountBalance / solanaWeb3.LAMPORTS_PER_SOL}`);
  console.log(`Receipt: ${"https://explorer.solana.com/tx/" + txSignature + "?cluster=devnet"}`);
  return stakeAccount;
}

async function testDelegateStake(
  stakeAccount,
  authorityAccount
) {
  // This is a hardcoded value of one of the devnet validators, to obtain others, install the solana cli, connect to the devnet cluster
  // and run solana validators
  let validatorVoteAccountPubKey = new solanaWeb3.PublicKey("5MMCR4NbTZqjthjLGywmeT66iwE9J9f7kjtxzJjwfUx2");
  console.log(`Validator key: ${validatorVoteAccountPubKey}`)
  let params = {
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: authorityAccount.publicKey,
    votePubkey: validatorVoteAccountPubKey
  }
  let tx = solanaWeb3.StakeProgram.delegate(params);

  let txSignature = await solanaWeb3.sendAndConfirmTransaction(connection, tx, [authorityAccount]);

  console.log(`Delegated Staking Account with pubkey: ${stakeAccount.publicKey} to the validator ${validatorVoteAccountPubKey}.`);
  console.log(`Receipt: ${"https://explorer.solana.com/tx/" + txSignature + "?cluster=devnet"}`);
}

async function createStakeAccountAndDelegate(
  fromAccount,
  amt,
) {
  let stakeAccount = new solanaWeb3.Account(); // The new stake account keypair
  let authorized = new solanaWeb3.Authorized(fromAccount.publicKey, fromAccount.publicKey); // An object to track who is authorised to Stake or Withdraw (addresses)
  let lockup = new solanaWeb3.Lockup(0, 0, fromAccount.publicKey); // Lockup is disabled if the unix timestamp and epoch are both zero

  // This is the actual transaction that creates the staking account.
  // It can be thought that it "populates" the account created above
  // with the necessary instructions to begin staking.
  let stakeAccountParams = {
    fromPubkey: fromAccount.publicKey,
    authorized: authorized,
    lamports: amt,
    lockup: lockup,
    stakePubkey: stakeAccount.publicKey
  };

  let validatorVoteAccountPubKey = new solanaWeb3.PublicKey("5MMCR4NbTZqjthjLGywmeT66iwE9J9f7kjtxzJjwfUx2");
  let delegateParams = {
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: fromAccount.publicKey,
    votePubkey: validatorVoteAccountPubKey
  }

  let createStakeAccountTx = solanaWeb3.StakeProgram.createAccount(stakeAccountParams);
  let delegateTx = solanaWeb3.StakeProgram.delegate(delegateParams);
  let tx = new solanaWeb3.Transaction();
  tx.add(createStakeAccountTx, delegateTx);

  let txSignature = await solanaWeb3.sendAndConfirmTransaction(connection, tx, [fromAccount, stakeAccount]);

  //console.log(`Created Staking Account with pubkey: ${stakeAccount.publicKey}. Its balance is: ${stakeAccountBalance / solanaWeb3.LAMPORTS_PER_SOL}`);
  console.log(`Receipt: ${"https://explorer.solana.com/tx/" + txSignature + "?cluster=devnet"}`);
  return stakeAccount;
}

async function main() {
  const ONE_SOL = 1000000000;
  let account1 = await newAccountWithLamports(connection);
  let account2 = await newAccountWithLamports(connection);

  let balance1 = await connection.getBalance(account1.publicKey);
  let balance2 = await connection.getBalance(account2.publicKey);
  console.log(`Balance before transfer is ${balance1 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account1.publicKey} `)
  console.log(`Balance before transfer is ${balance2 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account2.publicKey} `)

  await testTransfer(account1, account2, ONE_SOL);

  balance1 = await connection.getBalance(account1.publicKey);
  balance2 = await connection.getBalance(account2.publicKey);

  console.log(`Balance after transfer is ${balance1 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account1.publicKey} `)
  console.log(`Balance after transfer is ${balance2 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account2.publicKey} `)

  console.log(`Testing create and delegate stake account...`);
  let stakeAccount1 = await createStakeAccountAndDelegate(account2, ONE_SOL);
}

main().catch((err) => console.log(err));
