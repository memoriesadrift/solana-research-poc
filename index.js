const solanaWeb3 = require('@solana/web3.js');

const url = 'https://devnet.solana.com';
const connection = new solanaWeb3.Connection(url, 'singleGossip');

// Helper function for newAccountWithLamports from solana/hello-world
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to create an account and populate it with tokens, from solana/hello-world
async function newAccountWithLamports(
  connection,
  lamports = 2000000000
){
  const account = new solanaWeb3.Account();

  let retries = 10;
  await connection.requestAirdrop(account.publicKey, lamports);
  for (;;) {
    await sleep(500);
    if (lamports == (await connection.getBalance(account.publicKey))) {
      return account;
    }
    if (--retries <= 0) {
      break;
    }
    console.log(`Airdrop retry ${retries}`);
  }
  throw new Error(`Airdrop of ${lamports} failed`);
}
// Tx sending code from https://github.com/project-serum/spl-token-wallet/blob/5ca3e3d90366be74383ec04aaa4cfbdb3ef77e22/src/utils/tokens/index.js#L102

// Surprisingly complicated!
async function signAndSendTransaction(
  connection,
  transaction,
  fromAccount,
  signers,
  skipPreflight = false,
) {
  let blockhash = await connection.getRecentBlockhash('max');
  console.log("[DEBUG] blockhash: ", blockhash);
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash;
  transaction.setSigners(
    // fee payed by the sender
    fromAccount.publicKey, 
    ...signers.map((s) => s.publicKey),
  );

  console.log("[DEBUG] signers: ", signers);
  if (signers.length > 0) {
    console.log("[DEBUG] Partial signing...")
    transaction.partialSign(...signers);
  }

  //console.log("[DEBUG] transaction after partial sign: ", transaction);
  //console.log("[DEBUG] fromAccount: ", fromAccount);
  transaction.partialSign(fromAccount);
  console.log("[DEBUG] transaction after sign: ", transaction);
  const rawTransaction = transaction.serialize();
  console.log("[DEBUG] rawTransaction: ", rawTransaction);
  let res = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight,
    preflightCommitment: 'single',
  });
  console.log("[DEBUG] result: ", res);
  return res;
}

async function nativeTransfer(connection, fromAccount, toAccount, lamports) {
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: fromAccount.publicKey,
      toPubkey: toAccount.publicKey,
      lamports: lamports,
    }),
  );
  console.log("[DEBUG] tx: ", tx);
  //return await solanaWeb3.sendAndConfirmTransaction(connection, tx, [fromAccount]);
  return await signAndSendTransaction(connection, tx, fromAccount, []);
}


async function testTransfer(
	account1,
	account2
) {
	let balance1 = await connection.getBalance(account1.publicKey);
	let balance2 = await connection.getBalance(account2.publicKey);
	console.log(`Balance before transfer is ${balance1 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account1.publicKey} `)
	console.log(`Balance before transfer is ${balance2 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account2.publicKey} `)

  let txSignature = await nativeTransfer(connection, account1, account2, 1000000000);
  console.log(`Transferred ${1000000000/ solanaWeb3.LAMPORTS_PER_SOL} $SOL from ${account1.publicKey} to ${account2.publicKey}. Signature: ${txSignature}`)

	balance1 = await connection.getBalance(account1.publicKey);
	balance2 = await connection.getBalance(account2.publicKey);

	console.log(`Balance after transfer is ${balance1 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account1.publicKey} `)
	console.log(`Balance after transfer is ${balance2 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account2.publicKey} `)
}

async function main() {
	let account1 = await newAccountWithLamports(connection);
	let account2 = await newAccountWithLamports(connection);
	testTransfer(account1, account2);
}

main().catch((err) => console.log(err));
