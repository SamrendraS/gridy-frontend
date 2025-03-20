import { Contract, Account } from "starknet";

// Replace with actual contract addresses
const BRIDGE_ADDRESS = "0x68a7cf80bd038300bc7455f8d12b07442a2b08694e173d26c48c77495e23fd4";
const GRIDY_CONTRACT_ADDRESS = "0x61dabf5527d64169587abaf0aaf489dd49e542defed2ee962e6c96fb6b64618";
const l3Registry = "0x4407329ceb7c8ba43f74e9f89d84a7c44ec46835bbc5337aa82f0aa41ae1368";
const gridTokenAddress = "0x03821bdc7aaa3c501cc6bba524ecfe79937692b74417bb6f996593c6b065cbe1";


export async function depositWithMessage(account: Account, playerAddress: string, tileLocation: string) {
  if (!account) {
    throw new Error("No wallet account connected.");
  }

  console.log("Player address:", playerAddress);
  console.log("Tile location:", tileLocation);

  // Convert tileLocation from string to bigint
  const tileLocationBigInt = BigInt(tileLocation);
  console.log("Tile location tileLocationBigInt:", tileLocationBigInt);


  try {
    const bridge_address = BRIDGE_ADDRESS;
    const cls = await account.getClassAt(bridge_address);
    console.log(cls);
    const bridge_contract = new Contract(cls.abi, bridge_address, account);
    const gridCls = await account.getClassAt(gridTokenAddress);
    console.log(gridCls);
    const gridToken = new Contract(gridCls.abi, gridTokenAddress, account);
    
    // Construct the message
    const message = [
      GRIDY_CONTRACT_ADDRESS, 
      "0x01b555c9bb592b0bf0cfe20e8cc50b24434d9e22946d755accc20393cfa40650", // deploy_bot function selector
      playerAddress
    ];

    const approve_call = gridToken.populate('approve', {
      spender: BRIDGE_ADDRESS,
      amount: 12n * 10n ** 18n
    });

    console.log(approve_call)


    const call = bridge_contract.populate('deposit_with_message', {
      token: gridTokenAddress,
      amount: 11n * 10n ** 18n,
      appchain_recipient: l3Registry,
      message: [
        playerAddress, // Player in game
        tileLocationBigInt // Dynamic location to mine based on the tile clicked
      ]
    });

    console.log(call)

    let result = await account.execute([approve_call, call]);

    
    console.log("Transaction sent:", result.transaction_hash);
    return result.transaction_hash;
  } catch (error) {
    console.error("Error deploying bot:", error);
    throw error;
  }
}