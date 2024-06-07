import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { publicKey, generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { bundlrUploader } from '@metaplex-foundation/umi-uploader-bundlr';
import { none } from '@metaplex-foundation/umi';
import {
    createTree,
    fetchMerkleTree,
    mintV1,
    mintToCollectionV1,
    getAssetWithProof,
    transfer,
} from '@metaplex-foundation/mpl-bubblegum';
import { createMetadataAccountV3 } from "@metaplex-foundation/mpl-token-metadata";
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';

import secret from "/Users/tusharsahoo/.config/solana/id.json";

// Use the RPC endpoint of your choice.
const RPC_ENDPOINT = "https://api.devnet.solana.com";

const umi = createUmi(RPC_ENDPOINT).use(mplBubblegum()).use(dasApi());

const myKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const myKeypairSigner = createSignerFromKeypair(umi, myKeypair);


umi.use(signerIdentity(myKeypairSigner)).use(bundlrUploader({
    address: "https://devnet.bundlr.network",
    providerUrl: RPC_ENDPOINT,
    timeout: 60000,
}));

// CreateTreeBubble();
// FetchTreeBubble();
// MintNFTnoCol();
// MintNFTCol();
// fetchNFTid();
transferBubbleNFT()

// FUNCTIONS ;P
async function CreateTreeBubble() {
    try {
        const merkleTree = generateSigner(umi)
        console.log({ merkleTree });
        const builder = await createTree(umi, {
            merkleTree,
            maxDepth: 14,
            maxBufferSize: 64,
        })
        const tx = await builder.sendAndConfirm(umi);
        console.log(tx);

    } catch (error) {
        console.log(error);
    }
}

async function FetchTreeBubble() {
    try {
        const merkleTreeAddress = publicKey("GkcVa3AcFQVNdC95B7hbpKftURvD8KAQnZaCRWBUEFGm");
        const merkleTree = await fetchMerkleTree(umi, merkleTreeAddress);
        console.log({ merkleTree });
    } catch (error) {
        console.log(error);
    }
}

async function MintNFTnoCol() {
    const MY_TOKEN_METADATA = {
        name: "NFT1",
        symbol: "TEST1",
        description: "This is a test nft1!",
        image:
            "https://www.simplilearn.com/ice9/free_resources_article_thumb/what_is_image_Processing.jpg", //add public URL to image you'd like to use
    };
    const uri = await umi.uploader.uploadJson(MY_TOKEN_METADATA);
    const merkleTreeAddress = publicKey("GkcVa3AcFQVNdC95B7hbpKftURvD8KAQnZaCRWBUEFGm");
    await mintV1(umi, {
        leafOwner: myKeypair.publicKey,
        merkleTree: merkleTreeAddress,
        metadata: {
            name: MY_TOKEN_METADATA.name,
            uri: uri,
            sellerFeeBasisPoints: 500, // 5%
            collection: none(),
            creators: [
                { address: umi.identity.publicKey, verified: false, share: 100 },
            ],
        },
    }).sendAndConfirm(umi);
    const merkleTree = await fetchMerkleTree(umi, merkleTreeAddress);
    console.log({ merkleTree });
}

async function MintNFTCol() {
    const MY_TOKEN_METADATA = {
        name: "NFT2",
        symbol: "TEST2",
        description: "This is a test nft2!",
        image:
            "https://www.simplilearn.com/ice9/free_resources_article_thumb/what_is_image_Processing.jpg", //add public URL to image you'd like to use
    };
    const uri = await umi.uploader.uploadJson(MY_TOKEN_METADATA);
    const merkleTreeAddress = publicKey("GkcVa3AcFQVNdC95B7hbpKftURvD8KAQnZaCRWBUEFGm");
    const collectionAddress = publicKey("2VpgjDWp2eALpyAyLA7iUeWp5oVQUgUMAoA9GQRpTeud");

    await mintToCollectionV1(umi, {
        leafOwner: myKeypair.publicKey,
        merkleTree: merkleTreeAddress,
        collectionMint: collectionAddress,
        metadata: {
            name: MY_TOKEN_METADATA.name,
            uri: uri,
            sellerFeeBasisPoints: 500, // 5%
            collection: { key: collectionAddress, verified: false },
            creators: [
                { address: umi.identity.publicKey, verified: false, share: 100 },
            ],
        },
    }).sendAndConfirm(umi)
}

async function fetchNFTid() {
    const merkleTreeAddress = publicKey("GkcVa3AcFQVNdC95B7hbpKftURvD8KAQnZaCRWBUEFGm");
    const collectionAddress = publicKey("2VpgjDWp2eALpyAyLA7iUeWp5oVQUgUMAoA9GQRpTeud");

    // const rpcAssetList = await umi.rpc.getAssetsByOwner({ owner: myKeypair.publicKey })
    const rpcAssetList = await umi.rpc.getAssetsByGroup({
        groupKey: 'collection',
        groupValue: collectionAddress,
    })
    // const rpcAssetList = await umi.rpc.getAssetsByCreator({
    //     creator: myKeypair.publicKey,
    //     onlyVerified: false,
    // })

    console.log(rpcAssetList.items[0].id);
}

async function transferBubbleNFT() {
    const assetId = publicKey("CSrfmaDPyu8QFKUFat8PGk9JNsAkhfhmsauPL8CDtgfA");
    const newLeafOwner = publicKey("QbxZxLjsHpbM3EZBuwzFCoVWNmQHwLoKjQbBhsCTKJX");
    const assetWithProof = await getAssetWithProof(umi, assetId);
    console.log(assetWithProof);
    await transfer(umi, {
        ...assetWithProof,
        leafOwner: myKeypair.publicKey,
        newLeafOwner: newLeafOwner,
    }).sendAndConfirm(umi)
}
