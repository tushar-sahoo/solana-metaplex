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
const {
    PublicKey,
    Keypair,
    Connection,
    LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");

const connection = new Connection(
    // "http://pixel-aler168.helius-rpc.com",
    "https://api.mainnet-beta.solana.com",
    "finalized"
);

const Arry1 = JSON.parse(
    require("fs").readFileSync(
        "/Users/tusharsahoo/Documents/GitHub/mmorbitt_yudiz/uploads/BC7fMUSWTyRqrMqZL3gVGYj8Y5myPQUBkmJEo5u83tv9.json",
        "utf8"
    )
);
let secretKey1 = Uint8Array.from(Arry1);
const owner = Keypair.fromSecretKey(secretKey1);

async function main() {
    try {
        const tokenToSend = "So11111111111111111111111111111111111111112"; // e.g. SOLANA mint address
        // const tokenToGet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; //
        // const tokenToGet = "BGyjasmSzYM9hHiZ1LBU4EJ7KCtRjMSpbN4zTru3W5vf"; // ORBT token
        // const tokenToGet = "976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM"; //
        const tokenToGet = "3AxsZRdyYyiTdMBzjGFGxFZZsxf4Sk5kkug79t2PwooV"; // CPMM token
        bIsTokenSwap = true;

        const ata = getAssociatedTokenAddressSync(
            new PublicKey(tokenToGet),
            owner.publicKey
        );

        const tokenBalance = await connection.getTokenAccountBalance(ata);

        // const amountToSend = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
        const amountToSend = tokenBalance.value.amount;

        const raydium = await initRaydium();

        const list = await raydium.api.fetchPoolByMints({
            mint1: tokenToGet, // required
            mint2: tokenToSend, // optional
            type: PoolFetchType.All, // optional
            sort: "liquidity", // optional
            order: "desc", // optional
        });
        const poolId = list.data[0].id;
        // console.log(poolId);
        // const poolId = "2UfT57k2oE13nbRxfQgAPrpygu287wvC2a8YDPs3JJU5";

        const data = await raydium.api.fetchPoolById({ ids: poolId });

        const poolInfo = data[0];
        // console.log(poolInfo);

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

            const mintIn =
                (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
                    ? poolInfo.mintB.address
                    : poolInfo.mintA.address;

            const mintOut =
                (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
                    ? poolInfo.mintA.address
                    : poolInfo.mintB.address;

            const out = raydium.liquidity.computeAmountOut({
                poolInfo: {
                    ...poolInfo,
                    baseReserve: pool.baseReserve,
                    quoteReserve: pool.quoteReserve,
                },
                amountIn: new BN(amountToSend),
                mintIn: mintIn, // swap mintB -> mintA, use: poolInfo.mintB.address
                mintOut: mintOut, // swap mintB -> mintA, use: poolInfo.mintA.address
                slippage: 0.005, // range: 1 ~ 0.0001, means 100% ~ 0.01%
            });

            const swap = await raydium.liquidity.swap({
                poolInfo,
                amountIn: new BN(amountToSend),
                amountOut: out.minAmountOut, // out.amountOut means amount 'without' slippage
                fixedSide: "in",
                inputMint: mintIn, // swap mintB -> mintA, use: poolInfo.mintB.address
                associatedOnly: false,
                txVersion: TxVersion.LEGACY,
                computeBudgetConfig: {
                    units: 200000,
                    microLamports: 250000,
                },
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

            const confirmation = await connection.confirmTransaction(
                txId,
                "finalized"
            );
            console.log(confirmation);
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
                    slippage: 0.005,
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

            // console.log(rpcData);

            const inputAmount = new BN(amountToSend);

            const reserveA =
                (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
                    ? rpcData.quoteReserve
                    : rpcData.baseReserve;

            const reserveB =
                (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
                    ? rpcData.baseReserve
                    : rpcData.quoteReserve;

            const baseIn =
                (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
                    ? false
                    : true;

            console.log(baseIn);

            const swapResult = CurveCalculator.swap(
                inputAmount,
                reserveA,
                reserveB,
                rpcData.configInfo.tradeFeeRate
            );

            const swap = await raydium.cpmm.swap({
                poolInfo,
                swapResult,
                slippage: 0.005,
                baseIn: baseIn,
                computeBudgetConfig: {
                    units: 200000,
                    microLamports: 250000,
                },
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

            const confirmation = await connection.confirmTransaction(
                txId,
                "confirmed"
            );
            console.log(confirmation);
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
