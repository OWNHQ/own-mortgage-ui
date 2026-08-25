import type { Address, Hex } from 'viem'
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from './addresses'
import { LOAN_CREATED_BLOCK } from './loan'

export interface LenderCommitment {
  address: Address
  assets: bigint
}

// Generated from the active vault at the LOANCreated block by scripts/generate-lender-snapshot.ts.
// Every reconstructed share balance was checked against balanceOf, and their sums against totalSupply.
export const LENDER_COMMITMENT_SNAPSHOT = {
  blockHash: '0xc9b4381b9f3864f64db87fb95b8b705d5ba3a02d5045536c30bdee193c6e2be6' as Hex,
  blockNumber: LOAN_CREATED_BLOCK,
  digest: '0xbe946f93cb79533ccb2de732c53fc229ae429aacb6b319ee4ba72b1e6a21c0f4' as Hex,
  lenderCount: 41,
  totalAssets: 180_295_681_063n,
  vaultAddress: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
} as const

export const LENDER_COMMITMENTS = [
  { address: '0x537e0C85Ca9fD164B2f28cf4992420b53Fe65D02', assets: 53_462_556_965n },
  { address: '0xD6579e462d7853804110A9b43e447030015191CD', assets: 15_323_803_291n },
  { address: '0xE80BD8e84Df6FFfbE73b8b5A1d61c059DC709059', assets: 11_766_101_898n },
  { address: '0x90a6Dd2A5Ee1562190eD2009660a688ebAB9aCeF', assets: 10_734_633_986n },
  { address: '0xEf7F218D1CE9CE66ECE463f62f6EFAdDAe5Ed0Cc', assets: 10_731_191_567n },
  { address: '0x225f137127d9067788314bc7fcc1f36746a3c3B5', assets: 10_684_961_774n },
  { address: '0x2665FDdc0A9Ff128EA240793e8704B476397CF49', assets: 10_670_039_659n },
  { address: '0x5a35455c3534fD0B652667e6a94a60E3e9A56546', assets: 10_590_783_444n },
  { address: '0xEd6165Afa75AC816EEcc5313602A21488bd526E3', assets: 10_590_739_531n },
  { address: '0x1F4e60f583F1718cd4bf0FEf03f2Fc94D6431ad8', assets: 5_294_739_495n },
  { address: '0xd17fdbA23Ced5983483f70CceeF5fD53E0869Ac3', assets: 3_707_260_642n },
  { address: '0xb1Aa03ebadF1BF068D9056aF9392630686D76B92', assets: 3_300_269_848n },
  { address: '0xd1bBE4cEe00Fb503e38Bfc288285518D63E94EA3', assets: 3_188_446_240n },
  { address: '0xA63C78BAD9Af4bECB75d5AeA1ba02dd1Ab55839b', assets: 3_179_840_913n },
  { address: '0x3E02Ac054398e2C7886A4739AD3214163238872d', assets: 2_647_886_118n },
  { address: '0x6cb7948fE2A558Aa1568d0aAc3DF4264E1a18F78', assets: 1_176_528_576n },
  { address: '0x9aa150D72b1826f1E65ccfdEe95DA91125ED5f88', assets: 1_084_373_015n },
  { address: '0x8ea42a3334E2AaB7d144990FDa6afE67a85E2a5c', assets: 1_065_352_833n },
  { address: '0x42E3b2B9969308C2FA6c4B71f6a13762e3136a1a', assets: 1_064_360_343n },
  { address: '0x5f6Cb062Bf7C915460d5d01F5b9dafC649F54155', assets: 1_064_251_034n },
  { address: '0xE04885c3f1419C6E8495C33bDCf5F8387cd88846', assets: 1_062_536_453n },
  { address: '0x20309Eb9080288e31AB1161366Af6639f04d593e', assets: 1_061_371_417n },
  { address: '0x5D2ee40dBdd128fC0F9809C8c268EC3a91Fc35d9', assets: 1_060_518_974n },
  { address: '0xbDf46DBB8352B9c44833ec7A3EABcb837331B0A1', assets: 1_058_950_211n },
  { address: '0x8289432ACD5EB0214B1C2526A5EDB480Aa06A9ab', assets: 1_058_948_289n },
  { address: '0xAf0f557a9a7E84Bdd02aDBc14962df2789d95D4e', assets: 1_058_942_115n },
  { address: '0x15e06d063115FBE25815FCDBb04AcE5Dc1Df7Dc8', assets: 593_013_180n },
  { address: '0xF6A581EF8d79104D34C93e937E3ab7358077512B', assets: 481_857_894n },
  { address: '0xCaBba4560c96FADe3Dd6C29cF24Cfb16a228bC1c', assets: 445_504_426n },
  { address: '0xa0De2eEAFe72cd6FC297E09b0D454371753EC0a5', assets: 213_106_797n },
  { address: '0x1f76a6Bf03429480472B3695E08689219cE15ED6', assets: 200_000_868n },
  { address: '0xaAaAd377630a7Ce6dFB4CC5318f0399c611DE179', assets: 187_011_558n },
  { address: '0xa933d0540247EC65E84032e9bB4346267a895AE1', assets: 158_895_744n },
  { address: '0x4f57c97f76E8d1C889eaA74A02E150BE1e0EDe25', assets: 105_899_595n },
  { address: '0xF4B724be42e57b5Eb76dC8425B691aEF088178e5', assets: 105_895_188n },
  { address: '0x2A7eE44494E5Efe3D31C606C51e030a5AdaC1011', assets: 52_948_803n },
  { address: '0x3a4e6eD8B0F02BFBfaA3C6506Af2DB939eA5798c', assets: 19_009_845n },
  { address: '0x978452C747ee0B617285cAf3c50Cae0103aF5656', assets: 15_889_745n },
  { address: '0x8874943557c50c30b13Af7c71a2fB7e53a04Bb5a', assets: 12_770_718n },
  { address: '0x343CAc639Cf667Db581361D55BE8cbf712797C1b', assets: 10_000_042n },
  { address: '0xCD26e540F773dbC7abC46db7E2830Ad7f735Ce86', assets: 4_488_029n },
] as const satisfies readonly LenderCommitment[]
