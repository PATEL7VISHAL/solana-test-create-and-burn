export type CreateTokenInput = {
    name: string,
    symbol?: string,
    uri: string,
    decimals: number
    url: 'mainnet' | 'devnet'
    initialMintingAmount: number
}