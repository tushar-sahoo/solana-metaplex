const {
    PoolFetchType,
    Raydium,
    AMM_V4,
    AMM_STABLE,
    CLMM_PROGRAM_ID,
    CREATE_CPMM_POOL_PROGRAM,
    TxVersion,
    PoolUtils,
    CurveCalculator,
    makeSwapCpmmBaseInInInstruction,
} = require("@raydium-io/raydium-sdk-v2");
const BN = require("bn.js");
const {
    PublicKey,
    Keypair,
    Connection,
    LAMPORTS_PER_SOL,
    Transaction,
    ComputeBudgetProgram,
} = require("@solana/web3.js");
const {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createCloseAccountInstruction,
} = require("@solana/spl-token");

const connection = new Connection(
    // "http://pixel-aler168.helius-rpc.com",
    "https://api.mainnet-beta.solana.com",
    "finalized"
);

// const Arry1 = JSON.parse(
//     require("fs").readFileSync(
//         "/Users/tusharsahoo/Documents/GitHub/mmorbitt_yudiz/uploads/BC7fMUSWTyRqrMqZL3gVGYj8Y5myPQUBkmJEo5u83tv9.json",
//         "utf8"
//     )
// );
// let secretKey1 = Uint8Array.from(Arry1);
// const payer = Keypair.fromSecretKey(secretKey1);

const Arry2 = JSON.parse(
    require("fs").readFileSync(
        "/Users/tusharsahoo/Documents/GitHub/mmorbitt_yudiz/uploads/mmOrbitGenerated.json",
        "utf8"
    )
);
let secretKey2 = Uint8Array.from(Arry2);
const owner = Keypair.fromSecretKey(secretKey2);

async function main() {
    try {
        let bIsTokenSwap = true;
        const tokenToSend = "So11111111111111111111111111111111111111112"; // e.g. SOLANA mint address
        // const tokenToGet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; //
        // const tokenToGet = "BGyjasmSzYM9hHiZ1LBU4EJ7KCtRjMSpbN4zTru3W5vf"; // ORBT token
        // const tokenToGet = "976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM"; //
        const tokenToGet = "HBoNJ5v8g71s2boRivrHnfSB5MVPLDHHyVjruPfhGkvL"; // CPMM token
        let inputToken = tokenToSend;

        const ata = getAssociatedTokenAddressSync(
            new PublicKey(tokenToGet),
            owner.publicKey
        );
        console.log(ata);

        let amountToSend = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
        if (bIsTokenSwap) {
            const tokenBalance = await connection.getTokenAccountBalance(ata);
            console.log(tokenBalance);
            amountToSend = tokenBalance.value.amount;
            inputToken = tokenToGet;
        }

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
            const rpcData = await raydium.liquidity.getRpcPoolInfo(poolId);

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

            const rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true);

            const poolKeys = await raydium.cpmm.getCpmmPoolKeys(poolInfo.id);

            const inputAmount = new BN(amountToSend);

            const baseIn = inputToken === poolInfo.mintA.address.toString();

            const swapResult = CurveCalculator.swap(
                inputAmount,
                baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
                baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
                rpcData.configInfo.tradeFeeRate
            );

            let swap = null;

            if (bIsTokenSwap) {
                const transaction = new Transaction();

                const COMPUTE_UNIT_IX = ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200000,
                });

                const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 250000,
                });

                transaction.add(COMPUTE_UNIT_IX);
                transaction.add(PRIORITY_FEE_IX);

                const solATA = getAssociatedTokenAddressSync(
                    new PublicKey(tokenToSend),
                    owner.publicKey
                );

                const check = await connection.getParsedAccountInfo(solATA);

                if (check.value == null) {
                    const createAIAInstruction = createAssociatedTokenAccountInstruction(
                        owner.publicKey,
                        solATA,
                        owner.publicKey,
                        new PublicKey(tokenToSend)
                    );
                    transaction.add(createAIAInstruction);
                }

                const swapCpmmInstructions = makeSwapCpmmBaseInInInstruction(
                    new PublicKey(poolKeys.programId),
                    owner.publicKey,
                    new PublicKey(poolKeys.authority),
                    new PublicKey(poolKeys.config.id),
                    new PublicKey(poolKeys.id),
                    ata,
                    solATA,
                    poolKeys.mintA.address === tokenToSend
                        ? new PublicKey(poolKeys.vault.B)
                        : new PublicKey(poolKeys.vault.A),
                    poolKeys.mintA.address === tokenToSend
                        ? new PublicKey(poolKeys.vault.A)
                        : new PublicKey(poolKeys.vault.B),
                    poolKeys.mintA.address === tokenToSend
                        ? new PublicKey(poolKeys.mintB.programId)
                        : new PublicKey(poolKeys.mintA.programId),
                    poolKeys.mintA.address === tokenToSend
                        ? new PublicKey(poolKeys.mintA.programId)
                        : new PublicKey(poolKeys.mintB.programId),
                    poolKeys.mintA.address === tokenToSend
                        ? new PublicKey(poolKeys.mintB.address)
                        : new PublicKey(poolKeys.mintA.address),
                    poolKeys.mintA.address === tokenToSend
                        ? new PublicKey(poolKeys.mintA.address)
                        : new PublicKey(poolKeys.mintB.address),
                    rpcData.observationId,
                    swapResult.sourceAmountSwapped,
                    swapResult.destinationAmountSwapped
                );
                transaction.add(swapCpmmInstructions);

                const closeAccountInstructions = createCloseAccountInstruction(
                    solATA,
                    owner.publicKey,
                    owner.publicKey
                );
                transaction.add(closeAccountInstructions);

                swap = { transaction };
            } else {
                swap = await raydium.cpmm.swap({
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
            }

            const blockHash = await connection.getLatestBlockhash("finalized");

            tx = swap.transaction;

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

async function createRevSwapCPMMInstruction(poolInfo, rpcData, swapResult) {
    try {
    } catch (error) {
        console.log(error);
    }
}

main();
