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
    sleep,
} = require("@raydium-io/raydium-sdk-v2");
const BN = require("bn.js");
const {
    PublicKey,
    Keypair,
    Connection,
    LAMPORTS_PER_SOL,
    Transaction,
} = require("@solana/web3.js");
const {
    getAssociatedTokenAddressSync,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
} = require("@solana/spl-token");

const connection = new Connection(
    // "http://pixel-aler168.helius-rpc.com",
    // "https://api.mainnet-beta.solana.com",
    "https://winter-hardworking-county.solana-mainnet.quiknode.pro/0f1458a96f5f33e57f904d5b93de9f95aced16f4/",
    "finalized"
);

const Arry1 = JSON.parse(
    require("fs").readFileSync(
        "/Users/tusharsahoo/Documents/GitHub/mmorbitt_yudiz/uploads/mmOrbitGenerated.json",
        "utf8"
    )
);
let secretKey1 = Uint8Array.from(Arry1);
const owner = Keypair.fromSecretKey(secretKey1);

async function main() {
    try {
        let bIsTokenSwap = false;
        // while (true) {
        const tokenToSend = "So11111111111111111111111111111111111111112"; // SOLANA mint address
        // const tokenToGet = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"; // USDT token
        // const tokenToGet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC token
        // const tokenToGet = "BGyjasmSzYM9hHiZ1LBU4EJ7KCtRjMSpbN4zTru3W5vf"; // ORBT token
        const tokenToGet = "HBoNJ5v8g71s2boRivrHnfSB5MVPLDHHyVjruPfhGkvL"; // CPMM token
        // bIsTokenSwap = !bIsTokenSwap;
        let inputToken = tokenToSend;

        const ata = getAssociatedTokenAddressSync(
            new PublicKey(tokenToGet),
            owner.publicKey
        );
        
        // const createIx = createAssociatedTokenAccountInstruction(owner.publicKey, ata, owner.publicKey, new PublicKey(tokenToGet));
        // const tx = new Transaction().add(createIx);
        // const blockHash = await connection.getLatestBlockhash("finalized");
        // tx.recentBlockhash = blockHash.blockhash;
        // tx.feePayer = owner.publicKey;
        // tx.lastValidBlockHeight = blockHash.lastValidBlockHeight;
        // tx.sign(owner);

        // const txId = await connection.sendTransaction(tx, [owner], {
        //     skipPreflight: true,
        // });
        // return;

        let amountToSend = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
        if (bIsTokenSwap) {
            const tokenBalance = await connection.getTokenAccountBalance(ata);
            console.log(tokenBalance);
            amountToSend = tokenBalance.value.amount;
            inputToken = tokenToGet;
        }

        let raydium = await initRaydium();

        raydium.setOwner(owner);

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

        if (isValidAmm(poolInfo.programId)) {
            console.log("AMM Pool");
            const poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId);
            const rpcData = await raydium.liquidity.getRpcPoolInfo(poolId);
            // console.log(poolKeys);

            // const res = await fetchMultipleInfo({
            //     connection: raydium.connection,
            //     poolKeysList: [poolKeys],
            //     config: undefined,
            // });
            // const pool = res[0];
            const [baseReserve, quoteReserve, status] = [
                rpcData.baseReserve,
                rpcData.quoteReserve,
                rpcData.status.toNumber(),
            ];

            const baseIn = inputToken === poolInfo.mintA.address.toString();
            const [mintIn, mintOut] = baseIn
                ? [poolInfo.mintA, poolInfo.mintB]
                : [poolInfo.mintB, poolInfo.mintA];

            const out = raydium.liquidity.computeAmountOut({
                poolInfo: {
                    ...poolInfo,
                    baseReserve,
                    quoteReserve,
                    status,
                    version: 4,
                },
                amountIn: new BN(amountToSend),
                mintIn: mintIn.address,
                mintOut: mintOut.address,
                slippage: 0.005, // range: 1 ~ 0.0001, means 100% ~ 0.01%
            });

            const swap = await raydium.liquidity.swap({
                poolInfo,
                poolKeys,
                amountIn: new BN(amountToSend),
                amountOut: out.minAmountOut, // out.amountOut means amount 'without' slippage
                fixedSide: "in",
                inputMint: mintIn.address, // swap mintB -> mintA, use: poolInfo.mintB.address
                txVersion: TxVersion.LEGACY,
                config: { associatedOnly: false },
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

            const poolKeys = await raydium.cpmm.getCpmmPoolKeys(poolInfo.id);
            const rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true);

            const inputAmount = new BN(amountToSend);

            const baseIn = inputToken === poolInfo.mintA.address.toString();

            // const reserveA =
            //     (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
            //         ? rpcData.quoteReserve
            //         : rpcData.baseReserve;

            // const reserveB =
            //     (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
            //         ? rpcData.baseReserve
            //         : rpcData.quoteReserve;

            // const baseIn =
            //     (poolInfo.mintA.address.toString() === tokenToSend) === bIsTokenSwap
            //         ? false
            //         : true;

            console.log(baseIn);

            // const swapResult = CurveCalculator.swap(
            //     inputAmount,
            //     reserveA,
            //     reserveB,
            //     rpcData.configInfo.tradeFeeRate
            // );

            const swapResult = CurveCalculator.swap(
                inputAmount,
                baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
                baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
                rpcData.configInfo.tradeFeeRate
            );

            const swap = await raydium.cpmm.swap({
                poolInfo,
                poolKeys,
                swapResult,
                slippage: 0.005,
                baseIn,
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
        // await new Promise((resolve) => setTimeout(resolve, 5000));
        // }
    } catch (error) {
        console.log(error);
    }
}

async function initRaydium(loadToken = false) {
    const raydium = await Raydium.load({
        connection,
        // owner,
        cluster: "mainnet",
        disableFeatureCheck: true,
        disableLoadToken: loadToken,
        blockhashCommitment: "finalized",
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
