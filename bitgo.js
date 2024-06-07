const { BitGo } = require("bitgo");

const BITGO_ACCESS_TOKEN =
  "v2xfc9b369542949876a1691ea7e515052f438e2105361b15c93ce5b363b8a2ec42";

const bitgo = new BitGo({ env: "test" });

const create = async () => {
  try {
    console.log("Getting Wallet");
    console.log("Creating Wallet II");
    const wallet = await bitgo.coin("tsol").wallets().generateWallet({
      label: "unique2",
      passphrase: "VerySecurePassword1234",
      type: "custodial",
    });
    console.log(JSON.stringify(wallet, undefined, 2));
  } catch (e) {
    console.log(e);
  }
};

const stake = async () => {};

create();
