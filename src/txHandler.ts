import { Wallet, web3 } from "@project-serum/anchor";
import { BaseMpl } from "./base/baseMpl";
import { Result } from "./base/types";
import { calcDecimalValue, calcNonDecimalValue, getKeypairFromEnv, sleep } from "./utils";
import { ENV, RPC_ENDPOINT_DEV, RPC_ENDPOINT_MAIN } from "./constants";
import { Metadata, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { AccountLayout, MintLayout, NATIVE_MINT, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createBurnInstruction, createCloseAccountInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { BaseSpl } from "./base/baseSpl";
import { BN } from "bn.js";
import { CreateTokenInput } from "./types";
import { sendAndConfirmTransaction } from "@solana/web3.js";
const log = console.log;

export async function createToken(input: CreateTokenInput): Promise<Result<{ tokenId: string, txSignature: string }, string>> {
    try {
        const { decimals, name, symbol, uri, url, initialMintingAmount } = input;
        const keypair = getKeypairFromEnv();
        const wallet = new Wallet(keypair)
        const endpoint = url == 'mainnet' ? RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV
        const baseMpl = new BaseMpl(wallet, { endpoint })
        const res = await baseMpl.createToken({
            name, uri,
            symbol,
            sellerFeeBasisPoints: 0,
            tokenStandard: TokenStandard.Fungible,
            creators: [{ address: wallet.publicKey, share: 100 }]
        }, { decimal: decimals, mintAmount: initialMintingAmount ?? 0 })
        if (!res) {
            return { Err: "Failed to send the transation" }
        }
        return {
            Ok: {
                txSignature: res.txSignature,
                tokenId: res.token
            }
        }
    }
    catch (error) {
        log({ error })
        return { Err: "failed to create the token" }
    }
}

export async function mintTo(input: { token: web3.PublicKey, amount: number, url: 'mainnet' | 'devnet' }) {
    const { token, url, amount } = input
    const keypair = getKeypairFromEnv();
    const user = keypair.publicKey
    const connection = new web3.Connection(url == 'mainnet' ? RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV)
    const baseSpl = new BaseSpl(connection)
    const ixs = await baseSpl.getMintToInstructions({ mint: token, mintAuthority: user, amount, init_if_needed: true })
    const tx = new web3.Transaction().add(...ixs)
    const res = await sendAndConfirmTransaction(connection, tx, [keypair]).catch((txError) => { log({ txError }); return null })
    if (!res) log("Tx failed")
    log("Transaction successfull\nTx Signature: ", res)
}

export async function revokeAuthority(input: { token: web3.PublicKey, url: 'mainnet' | 'devnet' }) {
    const { token, url } = input;
    const keypair = getKeypairFromEnv();
    const user = keypair.publicKey
    const wallet = new Wallet(keypair)
    const connection = new web3.Connection(url == 'mainnet' ? RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV)
    const baseSpl = new BaseSpl(connection)
    const baseMpl = new BaseMpl(wallet, { endpoint: connection.rpcEndpoint })
    const [mintAccountInfo, metadataAccountInfo] = await connection.getMultipleAccountsInfo([token, BaseMpl.getMetadataAccount(token)]).catch(error => [null, null])
    if (!mintAccountInfo) {
        log("Token not found")
        return
    }
    const ixs: web3.TransactionInstruction[] = []
    const mintInfo = MintLayout.decode(mintAccountInfo.data);
    if (mintInfo.mintAuthority.toBase58() == user.toBase58() && mintInfo.mintAuthorityOption == 1) {
        ixs.push(baseSpl.revokeAuthority({ authorityType: 'MINTING', currentAuthority: user, mint: token }))
    } else {
        if (mintInfo.mintAuthorityOption == 0) {
            log("Minting authority already been revoked")
        } else {
            log("You don't have minting authority")
        }
    }
    if (mintInfo.freezeAuthority.toBase58() == user.toBase58() && mintInfo.freezeAuthorityOption == 1) {
        ixs.push(baseSpl.revokeAuthority({ authorityType: 'FREEZING', currentAuthority: user, mint: token }))
    } else {
        if (mintInfo.freezeAuthorityOption == 0) {
            log("Freezing authority already been revoked")
        } else {
            log("You don't have freezing authority")
        }
    }
    if (metadataAccountInfo) {
        const metadataInfo = Metadata.deserialize(metadataAccountInfo.data)[0]
        const metadataUpdateAuthStr = metadataInfo.updateAuthority.toBase58();
        if (metadataUpdateAuthStr == user.toBase58() && metadataInfo.isMutable) {
            ixs.push(baseMpl.getRevokeMetadataAuthIx(token, user))
        } else if (!metadataInfo.isMutable) {
            log('Update authority already been revoked')
        } else {
            log("You don't have metadata update authority")
        }
    }
    if (ixs.length == 0) {
        log("All authority are revoked")
        return
    }
    const tx = new web3.Transaction().add(...ixs)
    const res = await sendAndConfirmTransaction(connection, tx, [keypair]).catch((txError) => { log({ txError }); return null })
    if (!res) log("Tx failed")
    log("Transaction successfull\nTx Signature: ", res)
}

export async function burn(input: { token: web3.PublicKey, amount: number, url: 'devnet' | 'mainnet' }) {
    const keypair = getKeypairFromEnv();
    const user = keypair.publicKey
    const mint = input.token
    const ata = getAssociatedTokenAddressSync(mint, user)
    const connection = new web3.Connection(input.url == 'mainnet' ? RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV)
    const infos = await connection.getMultipleAccountsInfo([mint, ata]).catch(() => null)
    if (!infos) throw "Failed to fetch some data"
    const [mintAccountInfo, ataAccountInfo] = infos
    if (!mintAccountInfo) throw "Token not found"
    if (!ataAccountInfo) throw "User token not found"
    const decimals = MintLayout.decode(mintAccountInfo.data).decimals
    const balance = Number(AccountLayout.decode(ataAccountInfo.data).amount.toString())
    const burnAmount = calcNonDecimalValue(input.amount, decimals)
    if (balance < burnAmount) throw "user don't have enough token to burn"
    const ix = createBurnInstruction(ata, mint, user, BigInt(burnAmount.toString()))
    const tx = new web3.Transaction().add(ix)
    const res = await sendAndConfirmTransaction(connection, tx, [keypair]).catch((txError) => { log({ txError }); return null })
    if (!res) throw "failed to send transaction"
    log("Transaction Signature: ", res)
}
