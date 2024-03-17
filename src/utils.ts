import { web3 } from "@project-serum/anchor"
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes"
import Axios from "axios"
import { config } from "dotenv"
import { ENV } from "./constants"
config()

export function calcNonDecimalValue(value: number, decimals: number): number {
  return Math.trunc(value * (Math.pow(10, decimals)))
}

export function calcDecimalValue(value: number, decimals: number): number {
  return value / (Math.pow(10, decimals))
}

export function getKeypairFromStr(str: string): web3.Keypair | null {
  try {
    return web3.Keypair.fromSecretKey(Uint8Array.from(bs58.decode(str)))
  } catch (error) {
    return null
  }
}

export function getKeypairFromEnv() {
  const keypairStr = process.env.KEYPAIR ?? ""
  try {
    const keypair = getKeypairFromStr(keypairStr)
    if (!keypair) throw "keypair not found"
    return keypair
  } catch (error) {
    console.log({error})
    throw "Keypair Not Found"
  }
}

// export async function deployJsonData(data: any): Promise<string | null> {
//   const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
//   const pinataApiKey = ENV.PINATA_API_kEY
//   const pinataSecretApiKey = ENV.PINATA_API_SECRET_KEY
//   // console.log({pinataApiKey, pinataSecretApiKey})
//   return Axios.post(url,
//     data,
//     {
//       headers: {
//         'Content-Type': `application/json`,
//         'pinata_api_key': pinataApiKey,
//         'pinata_secret_api_key': pinataSecretApiKey
//       }
//     }
//   ).then(function (response: any) {
//     return response?.data?.IpfsHash;
//   }).catch(function (error: any) {
//     console.log({ jsonUploadErr: error })
//     return null
//   });
// }

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export function getPubkeyFromStr(str?: string) {
  try {
    return new web3.PublicKey((str ?? "").trim())
  } catch (error) {
    return null
  }
}