const { PoolFetchType, Raydium, fetchMultipleInfo } = require("@raydium-io/raydium-sdk-v2");
const { PublicKey, Keypair, Connection } = require("@solana/web3.js");

const connection = new Connection(
    "http://pixel-aler168.helius-rpc.com",
    "finalized"
);

async function main() {
    try {
        const tokenToSend = "So11111111111111111111111111111111111111112"; // e.g. SOLANA mint address
        const tokenToGet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; //
        // const tokenToGet = "976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM"; //

        const amountToSend = 0.005; // 0.005 SOL

        const Arry1 = JSON.parse(
            require("fs").readFileSync(
                "/Users/tusharsahoo/.config/solana/id.json",
                "utf8"
            )
        );
        let secretKey1 = await Uint8Array.from(Arry1);
        const payer = Keypair.fromSecretKey(secretKey1);

        const raydium = await initRaydium();

        const list = await raydium.api.fetchPoolByMints({
            mint1: tokenToGet, // required
            mint2: tokenToSend, // optional
            type: PoolFetchType.Concentrated, // optional
            sort: "liquidity", // optional
            order: "desc", // optional
        });
        const poolId = list.data[0].id;
        console.log(poolId);
        // console.log(list.data[0]);

        // const data = await raydium.api.fetchPoolById({ ids: poolId });

        // const poolInfo = data[0];

        // const poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId);

        // const res = await fetchMultipleInfo({
        //     connection: raydium.connection,
        //     poolKeysList: [poolKeys],
        //     config: undefined,
        // });
        // const pool = res[0];

        console.log(list.data[0].type);
    } catch (error) {
        console.log(error);
    }
}

async function initRaydium() {
    const raydium = await Raydium.load({ connection });
    return raydium;
}

main();
