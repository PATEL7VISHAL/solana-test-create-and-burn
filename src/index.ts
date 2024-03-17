import { web3 } from "@project-serum/anchor";
import yargs, { command, option } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getPubkeyFromStr } from "./utils";
import { burn, createToken, mintTo, revokeAuthority } from "./txHandler";

const log = console.log;

const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .command('createtoken', 'token creation', yargs => {
        return yargs.option('name', {
            alias: 'n',
            describe: "Token name",
            type: "string",
            demandOption: "Token name is required"
        }).option('uri', {
            describe: "Json metadata uri",
            type: "string",
            demandOption: "Json metadata uri require"
        }).option('symbol', {
            alias: 's',
            describe: "Token symbol",
            type: "string",
        }).option('decimals', {
            alias: 'd',
            describe: "token decimals (default: 6)",
            default: 6,
            type: 'number'
        }).option("supply", {
            alias: 'sp',
            describe: "How many token you want to mint initially ? (default: 0)",
            type: 'number',
            default: 0
        }).option("url", {
            alias: 'u',
            describe: "network type (devnet/mainnet) default (mainnet)",
            type: 'string',
            default: "mainnet"
        })
    }, async (argv) => {
        const { name, symbol, decimals, url, supply, uri } = argv
        log("Creating token ...")
        const res = await createToken({
            name, symbol, url: url as any, decimals, initialMintingAmount: supply, uri
        }).catch(createTokenError => { log({ createTokenError }); return null })
        if (!res) {
            log("failed to create tx")
            return
        }
        if (res.Ok) {
            log("---- Token successfully minted ----")
            log("Tx Signature : ", res.Ok.txSignature)
            log("Token Address : ", res.Ok.tokenId)
        } else if (res.Err) {
            log(res.Err)
        }
    }).command('minting', 'token minting', yargs => {
        return yargs.option('token', {
            alias: 't',
            describe: "Token address",
            type: "string",
            demandOption: "token address require"
        }).option('amount', {
            alias: 'a',
            describe: "how many tokens to mint",
            type: 'number',
            demandOption: "token address require"
        }).option('url', {
            alias: 'u',
            describe: "solana network type (default: mainnet )(ex: mainnet / devnet)",
            type: "string",
            default: 'mainnet'
        })
    }, async args => {
        log("token minting ...")
        const url = args.url
        if (url != 'mainnet' && url != 'devnet') return log("invalid url value")
        const token = getPubkeyFromStr(args.token)
        if (!token) return log("Please enter valid token address")
        const amount = args.amount
        await mintTo({ token, amount, url })
    }).command("revokeauth", 'revoke token authority', yargs => {
        return yargs.option('token', {
            alias: 't',
            description: "Token address",
            type: 'string',
            demandOption: "token address must require"
        }).option('url', {
            alias: 'u',
            describe: "solana network type (default: mainnet )(ex: mainnet / devnet)",
            type: "string",
            default: 'mainnet'
        })
    }, async args => {
        const { url } = args
        const token = getPubkeyFromStr(args.token)
        if (!token) {
            log("Invalid token address")
            return
        }
        if (url != 'mainnet' && url != 'devnet') {
            log("Invalid url")
            return
        }
        await revokeAuthority({ token, url })
    }).command('burn', 'token minting', yargs => {
        return yargs.option('token', {
            alias: 't',
            describe: "Token address",
            type: "string",
            demandOption: "token address require"
        }).option('amount', {
            alias: 'a',
            describe: "how many tokens to burn",
            type: 'number',
            demandOption: "token address require"
        }).option('url', {
            alias: 'u',
            describe: "solana network type (default: mainnet )(ex: mainnet / devnet)",
            type: "string",
            default: 'mainnet'
        })
    }, async (args) => {
        const { url, amount } = args
        const token = getPubkeyFromStr(args.token)
        if (!token) {
            log("Invalid token address")
            return
        }
        if (url != 'mainnet' && url != 'devnet') {
            log("Invalid url")
            return
        }
        await burn({ amount, token, url })
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging'
    })
    .parse();

