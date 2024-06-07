const { Connection, clusterApiUrl } = require("@solana/web3.js");

const connection = new Connection(clusterApiUrl("mainnet-beta"), "finalized");

// // Function that checks the signature status until the block is finalized
// const getConfirmation = async (connection, tx, txBlockHeight) => {
//     // If the transaction is empty, return false
//     if (!tx) return false;

//     // Gets the signature status
//     let result = await getSignatureStatus(connection, tx);
//     while (result === 'RPC_ERROR')
//         result = await getSignatureStatus(connection, tx);
//     let status = result.value?.confirmationStatus;

//     // Latest finalized block
//     let finalizedLatestBlockHash = await getBlockHash(connection);
//     while (finalizedLatestBlockHash === 'RPC_ERROR')
//         finalizedLatestBlockHash = await getBlockHash(connection);
//     let lastFinalizedBlockHeight =
//         finalizedLatestBlockHash.lastValidBlockHeight;

//     // Add a delay while checking the signature again
//     const sleep = (ms) => {
//         return new Promise((resolve) => setTimeout(resolve, ms));
//     };

//     // Loop until the confirmed block in which the signature is exceeds the latest finalized block
//     while (
//         status === 'confirmed' ||
//         lastFinalizedBlockHeight <= txBlockHeight
//     ) {
//         await sleep(2000);
//         result = await getSignatureStatus(connection, tx);
//         while (result === 'RPC_ERROR')
//             result = await getSignatureStatus(connection, tx);
//         status = result.value?.confirmationStatus;
//         finalizedLatestBlockHash = await getBlockHash(connection);
//         while (finalizedLatestBlockHash === 'RPC_ERROR')
//             finalizedLatestBlockHash = await getBlockHash(connection);
//         lastFinalizedBlockHeight =
//             finalizedLatestBlockHash.lastValidBlockHeight;
//     }
//     return status;
// };

const getSignatureStatus = async (connection, tx) => {
  try {
    const result = await connection.getSignatureStatus(tx, {
      searchTransactionHistory: true,
    });
    console.log(result);
    console.log(result.value?.status);
    console.log(result.value?.status.hasOwnProperty("Err"));
    console.log(result.value?.status.hasOwnProperty("Ok"));
    return result;
  } catch (error) {
    console.error(error);
    log.red("Internal: Error getting signature status");
    return "RPC_ERROR";
  }
};

getSignatureStatus(
  connection,
    "5rJ4u5ztN37TxWwPtzNRVeu7NbXXMy4Kx2JQwUG8ZGN6iQDhwFqy2Ls244dpHx2a3yV58usCT3THAvRZDxynPR8N"
//   "4JLeYZGjVx3ZBMGH9UgMGNbrviWKZC3YgHQttAaHXPJf95uriE3HtvS7CtsMjz6A9oeRGgL7Ddiba1dFbRvUYoJF"
);
