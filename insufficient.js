const {
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  PublicKey,
  SystemProgram,
} = require("@solana/web3.js");
const axios = require("axios");

const RPC =
  "https://solana-mainnet.api.syndica.io/api-token/2kRSfTR6ADufb4vPAmnaunPi3XfWsnVELczrumdhGW5HKSQ3jU4kvmsWVKYFQkDYaksEfxLzua6NLM5YuW1qByHGGAMtv5oUpkrQif3UsG1RCAn6JcMLokUY8bKHg3HYERwps7HtymFpaaNgnxqXVvzYfSDFdX717CtNaD9Gwb7aJiQwziox88BNj6tvo5BB1Z6MYNTgSTzmMTnjxN4oEUudVtFSBqSDWEw2ULYTKUKSFmvvPQsntjrud2QPPNGbjibk1UrtaVb44yhFdmh6m24SxukkxugFPW9kQFfb11usUSXxLEb6ppspqJwzXg4ZQjSvNrALUHtEfXz7FaDNToAmGL8Ag11h4738rupr1WVbtQPLaSzDab7wKgCWyL9upvHyyHJPmKySZ7RgqeEoZC95afknMveR5FmF56MXNAWX6xRbJPxqt1unRLRsvfF4NarHEXe6rSXRRhxjSRMK2uPGzHb2mBGqpEFLo7jZ9JYkMJ2HVwQKskZxgukCA";
const connection = new Connection(RPC, "finalized");

async function transferSOL() {
  try {
    // My Secret Key File
    const Arry1 = JSON.parse(
      require("fs").readFileSync(
        "/Users/tusharsahoo/.config/solana/id.json", // Change this to the location of your secret key file
        "utf8"
      )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey1);

    const to = new PublicKey("EpPTwAEnE4p5b8HSP65vNiUoqMDKEk9d5JXHcTwTNGic");

    const latestBlockHash = await connection.getLatestBlockhash("finalized");

    const lamportsToTransfer = LAMPORTS_PER_SOL * 0.00001;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: FROM_KEYPAIR.publicKey,
        toPubkey: to,
        lamports: lamportsToTransfer,
      })
    );

    transaction.recentBlockhash = latestBlockHash.blockhash;
    transaction.feePayer = FROM_KEYPAIR.publicKey;
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      FROM_KEYPAIR,
    ]);
    console.log("Transaction Signature:", signature);
  } catch (error) {
    console.error("Error:", error.logs);
    const found = error.logs.find((log) =>
      log.includes("insufficient lamports")
    );
    if (found) {
    }
  }
}

transferSOL();

async function testGecko() {
  // try {
  //     const url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
  //     const response = await axios.get(url);
  //     console.log(response.data.solana.usd);
  // }
  // catch (error) {
  //     console.error("Error:", error);
  // }
  // const q = Keypair.generate();

  console.log(q);
}

async function parsedAccountCheck(){
  try {
    const Arry1 = JSON.parse(
      require("fs").readFileSync(
        "/Users/tusharsahoo/.config/solana/id.json", // Change this to the location of your secret key file
        "utf8"
      )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey1);
  } catch (error) {
    
  }
}

// testGecko();
