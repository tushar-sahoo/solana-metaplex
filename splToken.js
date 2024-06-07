const { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, transfer, createTransferInstruction } = require('@solana/spl-token');
const { clusterApiUrl, Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');


async function mint() {
    const Arry1 = JSON.parse(
        require("fs").readFileSync(
            "/Users/tusharsahoo/.config/solana/id.json",
            "utf8"
        )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const payer = Keypair.fromSecretKey(secretKey1);
    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();

    const connection = new Connection(
        clusterApiUrl('testnet'),
        'confirmed'
    );
    const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        9 // We are using 9 to match the CLI decimal default exactly
    );

    // const mint = new PublicKey("3TGfLW4wKRsoFKpWfQ72g3wZTHMcjzHhoW6Wnj5jNmZ6");

    console.log("Mint Address:", mint.toBase58());

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    )

    console.log("Holder Account:", tokenAccount.address.toBase58());

    await mintTo(
        connection,
        payer,
        mint,
        tokenAccount.address,
        payer,
        1000 * (10 ** 9) // because decimals for the mint are set to 9 
    )

    const tokenAccountInfo = await getAccount(
        connection,
        tokenAccount.address
    )

    console.log("Token account balance", tokenAccountInfo.amount / (10 ** 9));
}

async function transferToken() {
    try {
        const Arry1 = JSON.parse(
            require("fs").readFileSync(
                "/Users/tusharsahoo/.config/solana/id.json",
                "utf8"
            )
        );
        let secretKey1 = await Uint8Array.from(Arry1);
        const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey1);

        const connection = new Connection(
            clusterApiUrl('devnet'),
            'confirmed'
        );

        const mint = new PublicKey("3TGfLW4wKRsoFKpWfQ72g3wZTHMcjzHhoW6Wnj5jNmZ6");

        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            FROM_KEYPAIR,
            mint,
            FROM_KEYPAIR.publicKey
        )

        console.log("Sender Token Account:", fromTokenAccount.address.toBase58());

        const receiver = new PublicKey("Hev1BALzvx2Da9r1WK5pUXrenzUqM9e5Z9d3qMh9Godd");

        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            FROM_KEYPAIR,
            mint,
            receiver
        )

        console.log("Receiver Token Account:", toTokenAccount.address.toBase58());
        
        const latestBlockHash = await connection.getLatestBlockhash("confirmed");

        // Transfer approach 1
        const signature = await transfer(connection, FROM_KEYPAIR, fromTokenAccount.address, toTokenAccount.address, FROM_KEYPAIR.publicKey, 1 * (10 ** 9), [], { commitment: 'confirmed', preflightCommitment: 'confirmed', maxRetries: 15 })
        console.log("Transaction Signature:", signature);

        // Transfer approach 2
        // const tx = new Transaction();
        // tx.add(createTransferInstruction(fromTokenAccount.address, toTokenAccount.address, FROM_KEYPAIR.publicKey, 100000000000));
        // tx.recentBlockhash = latestBlockHash.blockhash;
        // const signature = await sendAndConfirmTransaction(connection, tx, [FROM_KEYPAIR], { commitment: 'confirmed', preflightCommitment: 'confirmed', maxRetries: 15 });
        // console.log("Transaction Signature:", signature);

        // Check Transaction Status
        const status = await getConfirmation(connection, signature, latestBlockHash.lastValidBlockHeight);
        console.log("Transaction Status:", status);

    } catch (e) {
        console.log(e)
    }
}

async function getTransactionStatus() {
    const connection = new Connection(
        clusterApiUrl('devnet'),
        'confirmed'
    );
    const signature = "3YLgjk6NU5cp2W3SUrYZAnoJrvJv7AtBSQKL6gVZJFmGYWsECpbish8iWRWgYLWC2MvsXYrbBbvmjyatm4meGchh";
    const status = await getConfirmation(connection, signature);
    console.log("Transaction Status:", status);
}

const getConfirmation = async (connection, tx, txBlockHeight) => {

    let result = await connection.getSignatureStatus(tx, {
        searchTransactionHistory: true,
    });

    let status = result.value?.confirmationStatus;
    let finalizedLatestBlockHash = await connection.getLatestBlockhash("finalized");
    let lastFinalizedBlockHeight = finalizedLatestBlockHash.lastValidBlockHeight;

    const sleep = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    while (lastFinalizedBlockHeight <= txBlockHeight) {
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

const confirmTransactionNow = async (connection, tx) => {
    try {
        const result = await connection.confirmTransaction({ signature: tx }, 'finalized');
        return result;
    } catch (error) {
        console.log({ error });
    }
}

mint()
// transferToken()
// getTransactionStatus()