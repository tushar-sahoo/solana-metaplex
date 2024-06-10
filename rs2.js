const {
    PoolFetchType,
    Raydium,
    fetchMultipleInfo,
    AMM_V4,
    AMM_STABLE,
    CLMM_PROGRAM_ID,
    CREATE_CPMM_POOL_PROGRAM,
    TxVersion,
    PoolUtils,
    CurveCalculator,
} = require("@raydium-io/raydium-sdk-v2");
const BN = require("bn.js");
const { PublicKey, Keypair, Connection } = require("@solana/web3.js");

const connection = new Connection(
    "http://pixel-aler168.helius-rpc.com",
    "finalized"
);

const Arry1 = JSON.parse(require("fs").readFileSync("./wallet.json", "utf8"));
let secretKey1 = Uint8Array.from(Arry1);
const owner = Keypair.fromSecretKey(secretKey1);

async function main() {
    try {
        const tokenToSend = "So11111111111111111111111111111111111111112"; // e.g. SOLANA mint address
        const tokenToGet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; //
        // const tokenToGet = "976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM"; //

        const amountToSend = 0.01; // 0.01 SOL

        const raydium = await initRaydium();

        const list = await raydium.api.fetchPoolByMints({
            mint1: tokenToGet, // required
            mint2: tokenToSend, // optional
            type: PoolFetchType.All, // optional
            sort: "liquidity", // optional
            order: "desc", // optional
        });
        const poolId = list.data[0].id;

        const data = await raydium.api.fetchPoolById({ ids: poolId });

        const poolInfo = data[0];
        // console.log(poolInfo);

        console.log(isValidAmm(poolInfo.programId));

        if (isValidAmm(poolInfo.programId)) {
            console.log("AMM Pool");
            const poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId);
            // console.log(poolKeys);

            const res = await fetchMultipleInfo({
                connection: raydium.connection,
                poolKeysList: [poolKeys],
                config: undefined,
            });
            const pool = res[0];
            console.log(pool);

            const out = raydium.liquidity.computeAmountOut({
                poolInfo: {
                    ...poolInfo,
                    baseReserve: pool.baseReserve,
                    quoteReserve: pool.quoteReserve,
                },
                amountIn: new BN(amountToSend),
                mintIn: poolInfo.mintA.address, // swap mintB -> mintA, use: poolInfo.mintB.address
                mintOut: poolInfo.mintB.address, // swap mintB -> mintA, use: poolInfo.mintA.address
                slippage: 0.01, // range: 1 ~ 0.0001, means 100% ~ 0.01%
            });

            const swap = await raydium.liquidity.swap({
                poolInfo,
                amountIn: new BN(amountToSend),
                amountOut: out.minAmountOut, // out.amountOut means amount 'without' slippage
                fixedSide: "in",
                inputMint: poolInfo.mintA.address, // swap mintB -> mintA, use: poolInfo.mintB.address
                associatedOnly: false,
                txVersion: TxVersion.LEGACY,
            });
            console.log(swap.transaction);

            const blockHash = await connection.getLatestBlockhash("finalized");
            const tx = swap.transaction;

            tx.recentBlockhash = blockHash.blockhash;
            tx.feePayer = owner.publicKey;
            tx.lastValidBlockHeight = blockHash.lastValidBlockHeight;
            tx.sign(owner);

            const txId = await connection.sendTransaction(tx, [owner], {
                skipPreflight: true,
            });
            console.log(txId);
        } else if (isValidClmm(poolInfo.programId)) {
            console.log("CLMM Pool");

            const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
                connection: raydium.connection,
                poolInfo,
            });

            const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
                connection: raydium.connection,
                poolKeys: [clmmPoolInfo],
            });

            const { minAmountOut, remainingAccounts } =
                await PoolUtils.computeAmountOutFormat({
                    poolInfo: clmmPoolInfo,
                    tickArrayCache: tickCache[poolId],
                    amountIn: new BN(amountToSend),
                    tokenOut: poolInfo.mintB,
                    slippage: 0.01,
                    epochInfo: await raydium.fetchEpochInfo(),
                });

            const swap = await raydium.clmm.swap({
                poolInfo,
                inputMint: poolInfo.mintA.address,
                amountIn: new BN(amountToSend),
                amountOutMin: minAmountOut.amount.raw,
                observationId: clmmPoolInfo.observationId,
                ownerInfo: {
                    useSOLBalance: true,
                },
                remainingAccounts,
                txVersion: TxVersion.LEGACY,
            });

            const blockHash = await connection.getLatestBlockhash("finalized");
            const tx = swap.transaction;

            tx.recentBlockhash = blockHash.blockhash;
            tx.feePayer = owner.publicKey;
            tx.lastValidBlockHeight = blockHash.lastValidBlockHeight;
            tx.sign(owner);

            const txId = await connection.sendTransaction(tx, [owner], {
                skipPreflight: true,
            });
            console.log(txId);
        } else if (isValidCpmm(poolInfo.programId)) {
            console.log("CPMM Pool");

            const rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true);

            const inputAmount = new BN(amountToSend);

            const swapResult = CurveCalculator.swap(
                inputAmount,
                rpcData.baseReserve,
                rpcData.quoteReserve,
                rpcData.configInfo.tradeFeeRate
            );

            const swap = await raydium.cpmm.swap({
                poolInfo,
                swapResult,
                slippage: 0.1,
                baseIn: true,
            });

            const blockHash = await connection.getLatestBlockhash("finalized");
            const tx = swap.transaction;

            tx.recentBlockhash = blockHash.blockhash;
            tx.feePayer = owner.publicKey;
            tx.lastValidBlockHeight = blockHash.lastValidBlockHeight;
            tx.sign(owner);

            const txId = await connection.sendTransaction(tx, [owner], {
                skipPreflight: true,
            });
            console.log(txId);
        } else console.error("No Valid Pool");
    } catch (error) {
        console.log(error);
    }
}

async function initRaydium(loadToken = false) {
    const raydium = await Raydium.load({
        connection,
        owner,
        cluster: "mainnet",
        disableFeatureCheck: true,
        disableLoadToken: loadToken,
    });
    return raydium;
}

function isValidAmm(id) {
    const VALID_PROGRAM_ID = new Set([AMM_V4.toBase58(), AMM_STABLE.toBase58()]);
    return VALID_PROGRAM_ID.has(id);
}

function isValidClmm(id) {
    const VALID_PROGRAM_ID = new Set([CLMM_PROGRAM_ID.toBase58()]);
    return VALID_PROGRAM_ID.has(id);
}

function isValidCpmm(id) {
    const VALID_PROGRAM_ID = new Set([CREATE_CPMM_POOL_PROGRAM.toBase58()]);
    return VALID_PROGRAM_ID.has(id);
}

main();
