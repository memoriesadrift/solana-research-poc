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
  console.log(`Transferred ${amt/ solanaWeb3.LAMPORTS_PER_SOL} $SOL from ${fromAccount.publicKey} to ${toAccount.publicKey}. Signature: ${txSignature}`)
  console.log(`Receipt: ${"https://explorer.solana.com/tx/" + txSignature + "?cluster=devnet"}`)
}

async function main() {
	let account1 = await newAccountWithLamports(connection);
	let account2 = await newAccountWithLamports(connection);

	let balance1 = await connection.getBalance(account1.publicKey);
	let balance2 = await connection.getBalance(account2.publicKey);
	console.log(`Balance before transfer is ${balance1 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account1.publicKey} `)
	console.log(`Balance before transfer is ${balance2 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account2.publicKey} `)

	await testTransfer(account1, account2, 1000000000);

	balance1 = await connection.getBalance(account1.publicKey);
	balance2 = await connection.getBalance(account2.publicKey);

	console.log(`Balance after transfer is ${balance1 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account1.publicKey} `)
	console.log(`Balance after transfer is ${balance2 / solanaWeb3.LAMPORTS_PER_SOL} $SOL for account ${account2.publicKey} `)
}

main().catch((err) => console.log(err));
