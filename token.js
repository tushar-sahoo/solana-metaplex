const { getOrCreateAssociatedTokenAccount, transfer, createTransferInstruction } = require('@solana/spl-token');
const { clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');

async function transferToken() {
    // My Secret Key File 
    const Arry1 = JSON.parse(
        require("fs").readFileSync(
            "/Users/tusharsahoo/.config/solana/id.json", // Change this to the location of your secret key file
            "utf8"
        )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey1);

    // Establishing connection with Solana Devnet
    const connection = new Connection(
        'https://endpoints.omniatech.io/v1/sol/mainnet/145b655799a94099bccf9bfa41db8e7c',
        'finalized'
    );

    // My dummy token for test purposes
    const mint = new PublicKey("8eHFhKyirvjBaQRQrBVCFKsZBQPjtP5RmRKhh3zhFDz1");

    // Fetch token address of the sender
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        FROM_KEYPAIR,
        mint,
        FROM_KEYPAIR.publicKey
    )

    console.log("Sender Token Account:", fromTokenAccount.address.toBase58());

    // Address of the receiver of the token
    const receiver = new PublicKey("Hev1BALzvx2Da9r1WK5pUXrenzUqM9e5Z9d3qMh9Godd");

    // Fetch or create token address of the receiver
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        FROM_KEYPAIR,
        mint,
        receiver
    )

    console.log("Receiver Token Account:", toTokenAccount.address.toBase58());

    // Fetch the latest finalized block
    const latestBlockHash = await connection.getLatestBlockhash("finalized");
    let signature;
    try {
        // Transfer approach 1
        signature = await transfer(connection, FROM_KEYPAIR, fromTokenAccount.address, toTokenAccount.address, FROM_KEYPAIR.publicKey, 1 * (10 ** 9), [], { commitment: 'finalized', preflightCommitment: 'finalized', maxRetries: 15 })
        console.log("Transaction Signature:", signature);

        // Transfer approach 2
        // const tx = new Transaction();
        // tx.add(createTransferInstruction(fromTokenAccount.address, toTokenAccount.address, FROM_KEYPAIR.publicKey, 100000000000));
        // tx.recentBlockhash = latestBlockHash.blockhash;
        // const signature = await sendAndConfirmTransaction(connection, tx, [FROM_KEYPAIR], { commitment: 'confirmed', preflightCommitment: 'confirmed', maxRetries: 15 });
        // console.log("Transaction Signature:", signature);
    } catch (error) {
        console.log(error);
        signature = error.signature
    } finally {
        const status = await getConfirmation(connection, signature, latestBlockHash.lastValidBlockHeight);
        if (status)
            console.log("Transaction Status:", status);
        else console.log('Failed Transaction');
    }
    return;
}

// Function that checks the signature status until the block is finalized
const getConfirmation = async (connection, tx, txBlockHeight) => {

    // If the transaction is empty, return false
    if (!tx) return false;

    // Gets the signature status
    let result = await connection.getSignatureStatus(tx, {
        searchTransactionHistory: true,
    });
    let status = result.value?.confirmationStatus;

    // Latest finalized block
    let finalizedLatestBlockHash = await connection.getLatestBlockhash("finalized");
    let lastFinalizedBlockHeight = finalizedLatestBlockHash.lastValidBlockHeight;

    // Add a delay while checking the signature again
    const sleep = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Loop until the confirmed block in which the signature is exceeds the latest finalized block
    while (status === 'confirmed' || lastFinalizedBlockHeight <= txBlockHeight) {
        await sleep(2000);
        result = await connection.getSignatureStatus(tx, {
            searchTransactionHistory: true,
        });
        status = result.value?.confirmationStatus;
        finalizedLatestBlockHash = await connection.getLatestBlockhash("finalized");
        lastFinalizedBlockHeight = finalizedLatestBlockHash.lastValidBlockHeight;
    }
    return status;
};

transferToken()