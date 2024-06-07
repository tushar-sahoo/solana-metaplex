import { Connection, PublicKey, Keypair, clusterApiUrl } from '@solana/web3.js';
import { Market } from '@project-serum/serum';

async function main() {
    const Arry1 = JSON.parse(
        require("fs").readFileSync(
            "/Users/tusharsahoo/.config/solana/id.json",
            "utf8"
        )
    );
    let secretKey1 = await Uint8Array.from(Arry1);
    const payer = Keypair.fromSecretKey(secretKey1);

    const connection = new Connection(
        clusterApiUrl('devnet'),
        'confirmed'
    );
}