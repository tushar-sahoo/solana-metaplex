const {
    getOrCreateAssociatedTokenAccount,
    getAssociatedTokenAddressSync,
    createTransferInstruction,
    NATIVE_MINT,
} = require("@solana/spl-token");
const {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl,
    Transaction,
    LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

// CHANGE THESE VALUES AS PER YOUR REQUIREMENT
const SFT_MINT = "Bu5HMsQvddgsksAzgidXuXdyJUuE4uotfi4V5pQ6jFgr";

// Using wSOL instead of USDC on Devnet
// const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_MINT = NATIVE_MINT.toBase58(); //wSOL

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const Arry1 = JSON.parse(
    require("fs").readFileSync(
        "/Users/tusharsahoo/.config/solana/id.json",
        "utf8"
    )
);
let secretKey1 = Uint8Array.from(Arry1);
const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey1);

async function transferToken() {
    try {
        const mint2 = new PublicKey(USDC_MINT);
        const receiver = new PublicKey(
            "Hev1BALzvx2Da9r1WK5pUXrenzUqM9e5Z9d3qMh9Godd"
        );

        const tx = new Transaction();

        // FOR SFT
        const mint = new PublicKey(SFT_MINT);
        const SFTAmountToTransfer = 1;

        const fromTokenAccount = getAssociatedTokenAddressSync(
            mint,
            FROM_KEYPAIR.publicKey
        );

        console.log("Sender Token Account:", fromTokenAccount.toBase58());

        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            FROM_KEYPAIR,
            mint,
            receiver
        );

        console.log("Receiver Token Account:", toTokenAccount.address.toBase58());

        tx.add(
            createTransferInstruction(
                fromTokenAccount,
                toTokenAccount.address,
                FROM_KEYPAIR.publicKey,
                SFTAmountToTransfer
            )
        );

        // FOR USDC

        const USDCAmountToTransfer = 1 * LAMPORTS_PER_SOL; // Change this to the amount you want to transfer

        const fromTokenAccount2 = getAssociatedTokenAddressSync(
            mint2,
            FROM_KEYPAIR.publicKey
        );

        console.log("Sender Token Account:", fromTokenAccount2.toBase58());

        const toTokenAccount2 = await getOrCreateAssociatedTokenAccount(
            connection,
            FROM_KEYPAIR,
            mint2,
            receiver
        );

        console.log("Receiver Token Account:", toTokenAccount2.address.toBase58());

        tx.add(
            createTransferInstruction(
                fromTokenAccount2,
                toTokenAccount2.address,
                FROM_KEYPAIR.publicKey,
                USDCAmountToTransfer
            )
        );

        // Prepare Transaction

        const latestBlockHash = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = latestBlockHash.blockhash;
        tx.feePayer = FROM_KEYPAIR.publicKey;
        tx.lastValidBlockHeight = latestBlockHash.lastValidBlockHeight;
        tx.sign(FROM_KEYPAIR);

        // Send Transaction

        const txId = await connection.sendTransaction(tx, [FROM_KEYPAIR], {
            skipPreflight: true,
        });
        console.log("Transaction Signature:", txId);

        // Check Transaction Status

        const status = await connection.confirmTransaction(txId, "confirmed");
        console.log("Transaction Status:", status);
    } catch (e) {
        console.log(e);
    }
}

transferToken();
