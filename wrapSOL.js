const { NATIVE_MINT, createSyncNativeInstruction, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const { Transaction, SystemProgram, sendAndConfirmTransaction, Keypair, Connection, clusterApiUrl } = require('@solana/web3.js');

async function main() {
    const Arry1 = JSON.parse(
        require("fs").readFileSync(
            "/Users/tusharsahoo/.config/solana/id.json",
            "utf8"
        )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const payer = Keypair.fromSecretKey(secretKey1);

    const connection = new Connection(
        clusterApiUrl('mainnet-beta'),
        'finalized'
    );

    const amount = 0.01 // 0.01 SOL
    const lamports = amount * (10 ** 9);

    const wSOLTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        NATIVE_MINT,
        payer.publicKey
    )

    const latestBlockHash = await connection.getLatestBlockhash("finalized");

    const tx = new Transaction();
    tx.add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: wSOLTokenAccount.address,
            lamports
        }),
        createSyncNativeInstruction(wSOLTokenAccount.address)
    );
    tx.recentBlockhash = latestBlockHash.blockhash;
    const signature = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'finalized', preflightCommitment: 'finalized', maxRetries: 2 });

    console.log("Transaction Signature:", signature);
}

main();