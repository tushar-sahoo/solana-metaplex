import {
    Transaction,
    SystemProgram,
    Keypair,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createInitializeMintInstruction,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
} from "@solana/spl-token";
import {
    DataV2,
    createCreateMetadataAccountV3Instruction,
    createCreateMasterEditionV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
    bundlrStorage,
    keypairIdentity,
    Metaplex,
    UploadMetadataInput,
} from "@metaplex-foundation/js";
import secret from "/Users/tusharsahoo/.config/solana/id.json";

const endpoint =
    "https://burned-thrumming-wave.solana-devnet.discover.quiknode.pro/dfc9a609ddff6d9bad29f7714cd90e92fe8f8151/"; //Replace with your RPC Endpoint
const solanaConnection = new Connection(endpoint);
const userWallet = Keypair.fromSecretKey(new Uint8Array(secret));
const metaplex = Metaplex.make(solanaConnection)
    .use(keypairIdentity(userWallet))
    .use(
        bundlrStorage({
            address: "https://devnet.bundlr.network",
            providerUrl: endpoint,
            timeout: 60000,
        })
    );

const MINT_CONFIG = {
    numDecimals: 0,
    numberTokens: 2,
};

const MY_TOKEN_METADATA: UploadMetadataInput = {
    name: "SFT1",
    symbol: "TEST1",
    description: "This is a test sft1!",
    image:
        "https://cdn.pixabay.com/photo/2016/04/27/18/29/minion-1357212_640.jpg", //add public URL to image you'd like to use
};
const ON_CHAIN_METADATA = {
    name: MY_TOKEN_METADATA.name,
    symbol: MY_TOKEN_METADATA.symbol,
    uri: "https://gateway.pinata.cloud/ipfs/QmRBNrhP1PE9uqpDq5jz3Tc89xf8p3WQPvCCqqo5att4Vn",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: {
        verified: false,
        key: new PublicKey('2VpgjDWp2eALpyAyLA7iUeWp5oVQUgUMAoA9GQRpTeud')
    },
    uses: null,
} as DataV2;

/**
 *
 * @param wallet Solana Keypair
 * @param tokenMetadata Metaplex Fungible Token Standard object
 * @returns Arweave url for our metadata json file
 */
const uploadMetadata = async (
    tokenMetadata: UploadMetadataInput
): Promise<string> => {
    //Upload to Arweave
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
    console.log(`Arweave URL: `, uri);
    return uri;
};

const createNewMintTransaction = async (
    connection: Connection,
    payer: Keypair,
    destinationWallet: PublicKey,
    mintAuthority: PublicKey,
    freezeAuthority: PublicKey,
) => {
    console.log(`---STEP 2: Creating Mint Transaction---`);

    //Get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);

    const getTransactionInputs = await transactionInput(payer, requiredBalance);

    const createNewTokenTransaction = new Transaction().add(...getTransactionInputs.aTransactions);

    return { createNewTokenTransaction, aMintKeys: getTransactionInputs.aMintKeys };
};

const main = async () => {
    console.log(`---STEP 1: Uploading MetaData---`);
    const userWallet = Keypair.fromSecretKey(new Uint8Array(secret));
    let metadataUri = await uploadMetadata(MY_TOKEN_METADATA);

    ON_CHAIN_METADATA.uri = metadataUri;

    console.log(`---STEP 3: Executing Mint Transaction---`);
    for (let i = 0; i < MINT_CONFIG.numberTokens; i++) {

        let mintTransaction = await createNewMintTransaction(
            solanaConnection,
            userWallet,
            userWallet.publicKey,
            userWallet.publicKey,
            userWallet.publicKey,
        );

        const signers = [userWallet, ...mintTransaction.aMintKeys];

        const newMintTransaction = mintTransaction.createNewTokenTransaction;

        let { lastValidBlockHeight, blockhash } =
            await solanaConnection.getLatestBlockhash("finalized");

        newMintTransaction.recentBlockhash = blockhash;
        newMintTransaction.lastValidBlockHeight = lastValidBlockHeight;
        newMintTransaction.feePayer = userWallet.publicKey;

        try {
            const transactionId = await sendAndConfirmTransaction(
                solanaConnection,
                newMintTransaction,
                signers
            );
            // console.log(`Transaction ID: `, transactionId);
            console.log(
                `${i}>> View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`
            );
        } catch (error) {
            console.log("hiii");
            console.log(error);
        }
    }

};

const transactionInput = async (user: Keypair, rentLamports: number) => {
    const aMintKeys = [];
    const aTransactions = [];

    let mintKeypair = Keypair.generate();
    console.log(`New Mint Address: `, mintKeypair.publicKey.toString());
    aMintKeys.push(mintKeypair);
    //metadata account associated with mint
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });
    //master edition account associated with mint
    const masterEditionPDA = metaplex.nfts().pdas().masterEdition({ mint: mintKeypair.publicKey });
    //get associated token account of your wallet
    const tokenATA = getAssociatedTokenAddressSync(mintKeypair.publicKey, user.publicKey);

    aTransactions.push(
        SystemProgram.createAccount({
            fromPubkey: user.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: rentLamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKeypair.publicKey, //Mint Address
            MINT_CONFIG.numDecimals, //Number of Decimals of New mint
            user.publicKey, //Mint Authority
            user.publicKey, //Freeze Authority
            TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            user.publicKey, //Payer
            tokenATA, //Associated token account
            user.publicKey, //token owner
            mintKeypair.publicKey //Mint
        ),
        createMintToInstruction(
            mintKeypair.publicKey, //Mint
            tokenATA, //Destination Token Account
            user.publicKey, //Authority
            1 //number of tokens
        ),
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: mintKeypair.publicKey,
                mintAuthority: user.publicKey,
                payer: user.publicKey,
                updateAuthority: user.publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: ON_CHAIN_METADATA,
                    isMutable: true,
                    collectionDetails: null,
                },
            }
        ),
        createCreateMasterEditionV3Instruction(
            {
                edition: masterEditionPDA,
                mint: mintKeypair.publicKey,
                updateAuthority: user.publicKey,
                mintAuthority: user.publicKey,
                payer: user.publicKey,
                metadata: metadataPDA,
            },
            {
                createMasterEditionArgs: {
                    maxSupply: 0
                }
            }
        ),
    )


    return { aMintKeys, aTransactions }
}

main();

// import { Keypair,
//   Connection,
//   SystemProgram,
//   LAMPORTS_PER_SOL,
//   Transaction,
//   sendAndConfirmTransaction,
//  } from "@solana/web3.js";
// import { HDKey } from "micro-ed25519-hdkey";
// import * as bip39 from "bip39";

// (async () => {
//   const connection = new Connection(
//     "https://api.devnet.solana.com",
//     "confirmed"
//   );

//   const mnemonic =
//     "drop card quarter shrug ski raw bundle involve you festival chief fashion";
//   const seed = bip39.mnemonicToSeedSync(mnemonic, ""); // (mnemonic, password)
//   const hd = HDKey.fromMasterSeed(seed.toString("hex"));

//   const keypair = Keypair.fromSeed(hd.derive(`m/44'/501'/0'/0'`).privateKey);
//   const keypair2 = Keypair.fromSeed(hd.derive(`m/44'/501'/1'/0'`).privateKey);

//   console.log(`Public => ${keypair.publicKey.toBase58()}`);
//   console.log(`Public => ${keypair2.publicKey.toBase58()}`);

//     console.log(Uint8Array.from(keypair.secretKey))

//     const lamportsToSend = 1_000_000_000;

//     const transferTransaction = new Transaction().add(
//       SystemProgram.transfer({
//         fromPubkey: keypair.publicKey,
//         toPubkey: keypair2.publicKey,
//         lamports: lamportsToSend,
//       })
//     );

//     const tx = await sendAndConfirmTransaction(connection, transferTransaction, [
//       keypair,
//     ]);
//     console.log(tx);

//   // for (let i = 0; i < 10; i++) {
//   //   const path = `m/44'/501'/${i}'/0'`;
//   //   const keypair = Keypair.fromSeed(hd.derive(path).privateKey);

//   //   console.log(`${path} => ${keypair.publicKey.toBase58()}`);
//   //   console.log(Uint8Array.from(keypair.secretKey))

//   // }
// })();

// import { initializeKeypair } from "./initializeKeypair"
// import { Connection, clusterApiUrl, PublicKey, Signer } from "@solana/web3.js"
// import {
//   Metaplex,
//   keypairIdentity,
//   bundlrStorage,
//   toMetaplexFile,
//   NftWithToken,
// } from "@metaplex-foundation/js"
// import * as fs from "fs"

// interface NftData {
//   name: string
//   symbol: string
//   description: string
//   sellerFeeBasisPoints: number
//   imageFile: string
// }

// interface CollectionNftData {
//   name: string
//   symbol: string
//   description: string
//   sellerFeeBasisPoints: number
//   imageFile: string
//   isCollection: boolean
//   collectionAuthority: Signer
// }

// // example data for a new NFT
// const nftData = {
//   name: "IND_AUS",
//   symbol: "IND_AUS",
//   description: "IND/AUS match",
//   sellerFeeBasisPoints: 0,
//   imageFile: "ia.jpeg",
// }

// // example data for updating an existing NFT
// const updateNftData = {
//   name: "Update",
//   symbol: "UPDATE",
//   description: "Update Description",
//   sellerFeeBasisPoints: 100,
//   imageFile: "success.png",
// }

// async function uploadMetadata(
//   metaplex: Metaplex,
//   nftData: NftData
// ): Promise<string> {
//   // file to buffer
//   const buffer = fs.readFileSync("src/" + nftData.imageFile)

//   // buffer to metaplex file
//   const file = toMetaplexFile(buffer, nftData.imageFile)

//   // upload image and get image uri
//   const imageUri = await metaplex.storage().upload(file)
//   console.log("image uri:", imageUri)

//   // upload metadata and get metadata uri (off chain metadata)
//   const { uri } = await metaplex.nfts().uploadMetadata({
//     name: nftData.name,
//     symbol: nftData.symbol,
//     description: nftData.description,
//     image: imageUri,
//   })

//   console.log("metadata uri:", uri)
//   return uri
// }

// async function createNft(
//   metaplex: Metaplex,
//   uri: string,
//   nftData: NftData,
//   collectionMint: PublicKey
// ): Promise<NftWithToken> {
//   const { nft } = await metaplex.nfts().create(
//     {
//       uri: uri, // metadata URI
//       name: nftData.name,
//       sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
//       symbol: nftData.symbol,
//       collection: collectionMint,
//     },
//     { commitment: "finalized" }
//   )

//   console.log(
//     `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
//   )

//   await metaplex.nfts().verifyCollection({
//     //this is what verifies our collection as a Certified Collection
//     mintAddress: nft.mint.address,
//     collectionMintAddress: collectionMint,
//     isSizedCollection: true,
//   })

//   return nft
// }

// async function createCollectionNft(
//   metaplex: Metaplex,
//   uri: string,
//   data: CollectionNftData
// ): Promise<NftWithToken> {
//   const { nft } = await metaplex.nfts().create(
//     {
//       uri: uri,
//       name: data.name,
//       sellerFeeBasisPoints: data.sellerFeeBasisPoints,
//       symbol: data.symbol,
//       isCollection: true,
//     },
//     { commitment: "finalized" }
//   )

//   console.log(
//     `Collection Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
//   )

//   return nft
// }

// // helper function update NFT
// async function updateNftUri(
//   metaplex: Metaplex,
//   uri: string,
//   mintAddress: PublicKey
// ) {
//   // fetch NFT data using mint address
//   const nft = await metaplex.nfts().findByMint({ mintAddress })

//   // update the NFT metadata
//   const { response } = await metaplex.nfts().update(
//     {
//       nftOrSft: nft,
//       uri: uri,
//     },
//     { commitment: "finalized" }
//   )

//   console.log(
//     `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
//   )

//   console.log(
//     `Transaction: https://explorer.solana.com/tx/${response.signature}?cluster=devnet`
//   )
// }

// async function main() {
//   // create a new connection to the cluster's API
//   const connection = new Connection(clusterApiUrl("devnet"))

//   // initialize a keypair for the user
//   const user = await initializeKeypair(connection)

//   console.log("PublicKey:", user.publicKey.toBase58())

//   // metaplex set up
//   const metaplex = Metaplex.make(connection)
//     .use(keypairIdentity(user))
//     .use(
//       bundlrStorage({
//         address: "https://devnet.bundlr.network",
//         providerUrl: "https://api.devnet.solana.com",
//         timeout: 60000,
//       })
//     )

//   const collectionNftData = {
//     name: "WorldCup collection",
//     symbol: "world",
//     description: "WorldCup Collection",
//     sellerFeeBasisPoints: 100,
//     imageFile: "world.jpeg",
//     isCollection: true,
//     collectionAuthority: user,
//   }

//   // upload data for the collection NFT and get the URI for the metadata
//   const collectionUri = await uploadMetadata(metaplex, collectionNftData)

//   // create a collection NFT using the helper function and the URI from the metadata
//   const collectionNft = await createCollectionNft(
//     metaplex,
//     collectionUri,
//     collectionNftData
//   )

//   // upload the NFT data and get the URI for the metadata
//   const uri = await uploadMetadata(metaplex, nftData)

//   // create an NFT using the helper function and the URI from the metadata
//   const nft = await createNft(
//     metaplex,
//     uri,
//     nftData,
//     collectionNft.mint.address
//   )

//   // upload updated NFT data and get the new URI for the metadata
//   // const updatedUri = await uploadMetadata(metaplex, updateNftData)

//   // // update the NFT using the helper function and the new URI from the metadata
//   // await updateNftUri(metaplex, updatedUri, nft.address)
// }

// main()
//   .then(() => {
//     console.log("Finished successfully")
//     process.exit(0)
//   })
//   .catch((error) => {
//     console.log(error)
//     process.exit(1)
//   })
