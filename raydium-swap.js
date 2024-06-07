const {
    Connection,
    PublicKey,
    Keypair,
    clusterApiUrl,
    Transaction,
    sendAndConfirmTransaction,
} = require("@solana/web3.js");
const {
    jsonInfo2PoolKeys,
    Liquidity,
    Token,
    TokenAmount,
    Percent,
    TOKEN_PROGRAM_ID,
    SPL_ACCOUNT_LAYOUT,
    MARKET_STATE_LAYOUT_V3,
    LIQUIDITY_STATE_LAYOUT_V4,
    SPL_MINT_LAYOUT,
    Market,
} = require("@raydium-io/raydium-sdk");
import { PoolFetchType } from '@raydium-io/raydium-sdk-v2'
const axios = require("axios");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const bs58 = require("bs58");
// 976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM
async function main() {
    const tokenToSend = "So11111111111111111111111111111111111111112"; // e.g. SOLANA mint address
    // const tokenToGet = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // e.g. USDT mint address
    const tokenToGet = "976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM";

    // const tokenToSend = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"; // e.g. USDT mint address
    // const tokenToGet = "So11111111111111111111111111111111111111112"; // e.g. SOLANA mint address

    const amountToSend = 0.005; // 0.005 SOL
    // const amountToSend = '0.76'; // 0.05 USDT

    const Arry1 = JSON.parse(
        require("fs").readFileSync(
            // "/Users/tusharsahoo/Documents/GitHub/mmorbitt_yudiz/uploads/mmOrbitGenerated.json",
            "/Users/tusharsahoo/.config/solana/id.json",
            "utf8"
        )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const payer = Keypair.fromSecretKey(secretKey1);

    const connection = new Connection(
        "http://pixel-aler168.helius-rpc.com",
        "finalized"
    );

    const swapTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        new PublicKey(tokenToGet),
        payer.publicKey
    );

    // const poolInfo = await getPoolInfoFromToken(connection, tokenToGet);

    let poolInfo2 = await axios.get('https://api.raydium.io/v2/ammV3/ammPools');
    poolInfo2 = await poolInfo2.data;
    console.log(poolInfo2, "poolInfo2");

    // const allPoolKeysJson = await loadPoolKeys();
    // if (!allPoolKeysJson.length) {
    //     console.log("No pool keys found");
    //     return;
    // }

    // const poolInfo = getPoolInfo(allPoolKeysJson, tokenToSend, tokenToGet);

    // const poolInfo = await getPoolInfoFromID(
    //     connection,
    //     "BEvXE7caJpLHyD8f3eDar7PQ3vffRyt5HaR2LTS6C8cE",
    //     4,
    //     4
    // );
    // console.log(poolInfo, "poolInfo");
    // if (!poolInfo) {
    //     console.log("No pool found for the given tokens");
    //     return;
    // }
    return;

    const directionWRTPool = poolInfo.quoteMint.toString() == tokenToGet;
    const { minAmountOut, amountIn } = await calculateAmountOut(
        connection,
        poolInfo,
        amountToSend,
        directionWRTPool
    );
    const senderTokenAccounts = await getSenderTokenAccounts(
        connection,
        payer.publicKey
    );

    const swapInstructions = await getSwapTransactionInstructions(
        connection,
        poolInfo,
        senderTokenAccounts,
        payer.publicKey,
        amountIn,
        minAmountOut
    );

    const recentBlockhash = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction();
    tx.recentBlockhash = recentBlockhash.blockhash;
    tx.feePayer = payer.publicKey;
    tx.lastValidBlockHeight = recentBlockhash.lastValidBlockHeight;
    tx.add(...swapInstructions);
    tx.sign(payer);

    const estimate = await getPriorityFeeEstimate("High", tx);

    // const signature = await connection.simulateTransaction(tx);

    // const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
    //     commitment: "finalized",
    //     preflightCommitment: "finalized",
    //     maxRetries: 2,
    // });

    // console.log(signature);
    console.log(estimate);
}

async function getPoolInfo(){
    const list = await raydium.api.fetchPoolByMints({
        mint1: '976AfpLCtaDqMZNoFJQHLSCVoSBSZHSW2Ra7YWvSyznM', // required
        mint2: 'So11111111111111111111111111111111111111112', // optional
        type: PoolFetchType.All, // optional
        sort: 'liquidity', // optional
        order: 'desc', // optional
        page: 1, // optional
      });    
}

async function getPriorityFeeEstimate(priorityLevel, transaction) {
    const response = await fetch("http://pixel-aler168.helius-rpc.com/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: "1",
            method: "getPriorityFeeEstimate",
            params: [
                {
                    transaction: bs58.encode(transaction.serialize()), // Pass the serialized transaction in Base58
                    options: { priorityLevel: priorityLevel },
                },
            ],
        }),
    });
    const data = await response.json();
    console.log(data);
    console.log(
        "Fee in function for",
        priorityLevel,
        " :",
        data.result.priorityFeeEstimate
    );
    return data.result;
}

const getPoolInfoFromToken = async (connection, mintAddress) => {
    try {
        const liquidityJsonResp = await axios.get(
            `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
        );
        if (!liquidityJsonResp.data.pairs) return null;
        const solPairOnRaydium = liquidityJsonResp.data.pairs.find(
            (pair) =>
                pair.chainId === "solana" &&
                pair.dexId === "raydium" &&
                (pair.baseToken.address ===
                    "So11111111111111111111111111111111111111112" ||
                    pair.quoteToken.address ===
                    "So11111111111111111111111111111111111111112")
        );
        if (!solPairOnRaydium) return null;
        console.log(solPairOnRaydium.pairAddress);
        const poolInfo = await getPoolInfoFromID(
            connection,
            solPairOnRaydium.pairAddress,
            4,
            4
        );
        return poolInfo;
    } catch (error) {
        console.log(error);
    }
};

const getPoolInfoFromID = async (
    connection,
    poolId,
    version,
    marketVersion
) => {
    poolId = new PublicKey(poolId);

    let account = await getAccountDetails(connection, poolId);
    while (account === "RPC_ERROR")
        account = await getAccountDetails(connection, poolId);

    if (account === null) throw Error(" get id info error ");
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

    const marketId = info.marketId;
    const marketAccount = await getAccountDetails(connection, marketId);
    while (marketAccount === "RPC_ERROR")
        account = await getAccountDetails(connection, marketId);

    if (marketAccount === null) throw Error(" get market info error");
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

    const lpMint = info.lpMint;
    const lpMintAccount = await getAccountDetails(connection, lpMint);
    while (lpMintAccount === "RPC_ERROR")
        account = await getAccountDetails(connection, lpMint);

    if (lpMintAccount === null) throw Error(" get lp mint info error");
    // const lpMintInfo2 = SPL_MINT
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

    const poolKeys = {
        id: poolId,
        baseMint: info.baseMint,
        quoteMint: info.quoteMint,
        lpMint: info.lpMint,
        baseDecimals: info.baseDecimal.toNumber(),
        quoteDecimals: info.quoteDecimal.toNumber(),
        lpDecimals: lpMintInfo.decimals,
        version: version,
        programId: account.owner,
        authority: Liquidity.getAssociatedAuthority({
            programId: account.owner,
        }).publicKey,
        openOrders: info.openOrders,
        targetOrders: info.targetOrders,
        baseVault: info.baseVault,
        quoteVault: info.quoteVault,
        withdrawQueue: info.withdrawQueue,
        lpVault: info.lpVault,
        marketVersion: marketVersion,
        marketProgramId: info.marketProgramId,
        marketId: info.marketId,
        marketAuthority: Market.getAssociatedAuthority({
            programId: info.marketProgramId,
            marketId: info.marketId,
        }).publicKey,
        marketBaseVault: marketInfo.baseVault,
        marketQuoteVault: marketInfo.quoteVault,
        marketBids: marketInfo.bids,
        marketAsks: marketInfo.asks,
        marketEventQueue: marketInfo.eventQueue,
        lookupTableAccount: PublicKey.default,
    };

    return poolKeys;
};

async function loadPoolKeys() {
    const liquidityJsonResp = await fetch(
        "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
    );
    if (!liquidityJsonResp.ok) return [];
    const liquidityJson = await liquidityJsonResp.json();
    const allPoolKeysJson = [
        ...(liquidityJson?.official ?? []),
        ...(liquidityJson?.unOfficial ?? []),
    ];
    return allPoolKeysJson;
}

async function calculateAmountOut(
    connection,
    poolKeys,
    rawAmountIn,
    swapDirectionWRTPool
) {
    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });

    let currencyInMint = poolKeys.baseMint;
    let currencyOutMint = poolKeys.quoteMint;
    let currencyInDecimals = poolInfo.baseDecimals;
    let currencyOutDecimals = poolInfo.quoteDecimals;

    if (!swapDirectionWRTPool) {
        currencyInMint = poolKeys.quoteMint;
        currencyOutMint = poolKeys.baseMint;
        currencyInDecimals = poolInfo.quoteDecimals;
        currencyOutDecimals = poolInfo.baseDecimals;
    }

    const currencyIn = new Token(
        TOKEN_PROGRAM_ID,
        currencyInMint,
        currencyInDecimals
    );
    const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
    const currencyOut = new Token(
        TOKEN_PROGRAM_ID,
        currencyOutMint,
        currencyOutDecimals
    );
    const slippage = new Percent(5, 100); // 5% slippage

    const {
        amountOut,
        minAmountOut,
        currentPrice,
        executionPrice,
        priceImpact,
        fee,
    } = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn,
        currencyOut,
        slippage,
    });

    return { minAmountOut, amountIn };
}

async function getSenderTokenAccounts(connection, sender) {
    const senderTokenAccounts = await connection.getTokenAccountsByOwner(sender, {
        programId: TOKEN_PROGRAM_ID,
    });

    return senderTokenAccounts.value.map((i) => ({
        pubkey: i.pubkey,
        programId: i.account.owner,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
}

async function getSwapTransactionInstructions(
    connection,
    poolKeys,
    tokenAccounts,
    sender,
    amountIn,
    minAmountOut,
    maxLamports = 100000,
    fixedSide = "in"
) {
    const swapTransaction = await Liquidity.makeSwapInstructionSimple({
        connection,
        makeTxVersion: 1,
        poolKeys: { ...poolKeys },
        userKeys: {
            tokenAccounts,
            owner: sender,
        },
        amountIn,
        amountOut: minAmountOut,
        fixedSide,
        config: { bypassAssociatedCheck: false },
        // computeBudgetConfig: { microLamports: maxLamports },
    });
    const swapTransactionInstructions =
        swapTransaction.innerTransactions[0].instructions.filter(Boolean);
    return swapTransactionInstructions;
}

function getPoolInfo(pool, tokenA, tokenB) {
    const poolData = pool.find(
        (pool) =>
            (pool.baseMint === tokenA && pool.quoteMint === tokenB) ||
            (pool.baseMint === tokenB && pool.quoteMint === tokenA)
    );
    if (!poolData) return null;
    return jsonInfo2PoolKeys(poolData);
}

async function getAccountDetails(connection, publicKey) {
    try {
        const accountInfo = await connection.getAccountInfo(publicKey);
        return accountInfo;
    } catch (error) {
        log.red(error, "Error getting account details");
        if (error.code === "RPC_ERROR") return "RPC_ERROR";
    }
}

main();
