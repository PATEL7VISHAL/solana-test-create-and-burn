import { config } from "dotenv"

config();

// export const RPC_ENDPOINT_MAIN = "https://api.mainnet-beta.solana.com"
// export const RPC_ENDPOINT_DEV = "https://api.devnet.solana.com"

export const RPC_ENDPOINT_MAIN = "http://127.0.0.1:8899"
export const RPC_ENDPOINT_DEV = "http://127.0.0.1:8899"

// const IN_PRODUCTION = process.env.PRODUCTION == '1' ? true : false
// const PINATA_API_kEY = process.env.PINATA_API_KEY!
// const PINATA_DOMAIN = process.env.PINATA_DOMAIN!
// const PINATA_API_SECRET_KEY = process.env.PINATA_API_SECRET_KEY!

export const ENV = {
    // PINATA_API_kEY,
    // PINATA_API_SECRET_KEY,
    // PINATA_DOMAIN,
    // IN_PRODUCTION,
}
