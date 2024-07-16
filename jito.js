const {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    clusterApiUrl,
    Transaction,
} = require("@solana/web3.js");
const bs58 = require("bs58");

const connection = new Connection(clusterApiUrl("mainnet-beta"), "finalized");
const jitoEngineUrl = "https://mainnet.block-engine.jito.wtf";

const Arry1 = JSON.parse(
    require("fs").readFileSync(
        "/Users/tusharsahoo/.config/solana/id.json",
        "utf8"
    )
);
let secretKey1 = Uint8Array.from(Arry1);
const payer = Keypair.fromSecretKey(secretKey1);

const main = async () => {
    const amount = 1000;

    const transferIx = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: new PublicKey("EpPTwAEnE4p5b8HSP65vNiUoqMDKEk9d5JXHcTwTNGic"),
        lamports: amount,
    });

    const tx = new Transaction().add(transferIx);

    const latestBlockHash = await connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = latestBlockHash.blockhash;
    tx.feePayer = payer.publicKey;
    tx.lastValidBlockHeight = latestBlockHash.blockhash;
    tx.sign(payer);

    const serializedTx = tx.serialize();

    const txInBase58 = bs58.encode(serializedTx);
    console.log("Transaction in Base58:", txInBase58);

    const payload1 = {
        method: "getTipAccounts",
        params: {},
        id: 1,
        jsonrpc: "2.0",
    };

    const response1 = await fetch(jitoEngineUrl + "/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload1),
    });
    if (!response1.ok) {
        console.log("Error HTTP:", response1.status);
        return false;
    }
    const data = await response1.json();

    const tipTaker = data.result[2];

    const transferIx1 = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: new PublicKey(tipTaker),
        lamports: amount,
    });

    const tx1 = new Transaction().add(transferIx1);

    const latestBlockHash1 = await connection.getLatestBlockhash("finalized");
    tx1.recentBlockhash = latestBlockHash1.blockhash;
    tx1.feePayer = payer.publicKey;
    tx1.lastValidBlockHeight = latestBlockHash1.blockhash;
    tx1.sign(payer);

    const serializedTx1 = tx1.serialize();

    const txInBase581 = bs58.encode(serializedTx1);

    const payload2 = {
        method: "sendBundle",
        params: [[txInBase58, txInBase581]],
        id: 1,
        jsonrpc: "2.0",
    };

    const response2 = await fetch(jitoEngineUrl + "/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload2),
    });
    if (!response2.ok) {
        console.log("Error HTTP:", response2.status);
        return false;
    }
    const data2 = await response2.json();

    console.log("Bundle Hash:", data2);
};

const check = async () => {
    const payload2 = {
        method: "getBundleStatuses",
        id: 1,
        jsonrpc: "2.0",
        params: [
            [
                "3d9086cf7e2683fa884011dfcb30847a14cfbfb3ab064e88bd5b6f1e795e3868"
            ]
        ],
    };

    const response2 = await fetch(jitoEngineUrl + "/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload2),
    });
    if (!response2.ok) {
        console.log("Error HTTP:", response2.status);
        return false;
    }
    const data2 = await response2.json();

    console.log(data2);

    console.log("Bundle Hash:", data2.result.value);
}

// main();
check();
