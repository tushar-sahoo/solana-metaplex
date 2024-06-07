const { Keypair } = require("@solana/web3.js");

async function main() {
  const baseToken = "So11111111111111111111111111111111111111112"; // SOL devnet
  const quoteToken = "4hCBSzcFE9ngFKQ9fZL8AVXXKzd4tfDdWhrqK2F4KNKf"; // Something devnet
  const targetMarketId = Keypair.generate().publicKey;
  const addBaseAmount = new BN(1); // 10000 / 10 ** 6,
  const addQuoteAmount = new BN(10000); // 10000 / 10 ** 6,
  const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // start from 7 days later
  const walletTokenAccounts = await getWalletTokenAccount(
    connection,
    wallet.publicKey
  );
}
