const {
    NATIVE_MINT,
    createSyncNativeInstruction,
    getOrCreateAssociatedTokenAccount,
} = require("@solana/spl-token");
const {
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    Keypair,
    Connection,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

async function main() {
    const Arry1 = JSON.parse(
        require("fs").readFileSync(
            "/Users/tusharsahoo/.config/solana/id.json",
            // "/Users/tusharsahoo/Documents/GitHub/mmorbitt_yudiz/uploads/mmOrbitGenerated.json",
            "utf8"
        )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const payer = Keypair.fromSecretKey(secretKey1);

    const connection = new Connection(clusterApiUrl("devnet"), "finalized");

    const amount = 10; // 10 SOL
    const lamports = amount * LAMPORTS_PER_SOL;

    const wSOLTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        NATIVE_MINT,
        payer.publicKey
    );
    // return;

    const latestBlockHash = await connection.getLatestBlockhash("finalized");

    const tx = new Transaction();
    tx.add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: wSOLTokenAccount.address,
            lamports,
        }),
        createSyncNativeInstruction(wSOLTokenAccount.address)
    );
    tx.recentBlockhash = latestBlockHash.blockhash;
    const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "finalized",
        preflightCommitment: "finalized",
        maxRetries: 2,
    });

    console.log("Transaction Signature:", signature);
}

main();
