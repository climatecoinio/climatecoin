# Climatecoin

- [Whitepaper](http://climatecoin.io/downloads/climatecoin_whitepaper_20082017.pdf)

## Technical definition

At the technical level Climate is a ERC20-compliant tokens, derived from the [MiniMe Token](https://github.com/Giveth/minime) that allows for token cloning (forking), which will be useful for many future use-cases.

## Contracts

- [Climate.sol](/contracts/Climate.sol): Main contract for the token.
- [MiniMeToken.sol](/contracts/MiniMeToken.sol): Token implementation.
- [ClimateContribution.sol](/contracts/ClimateContribution.sol): Implementation of the initial distribution of CO2.
- [ClimatePlaceHolder.sol](/contracts/ClimatePlaceHolder.sol): Placeholder for the Climatecoin before its deployment.
- [ContributionWallet.sol](/contracts/ContributionWallet.sol): Simple contract that will hold all funds until final block of the contribution period.
- [MultiSigWallet.sol](/contracts/MultiSigWallet.sol): ConsenSys multisig used for Climatecoin and community multisigs.
- [DevTokensHolder.sol](/contracts/DevTokensHolder.sol): Contract where tokens belonging to developers will be held. This contract will release this tokens in a vested timing.

See [INSTRUCTIONS.md](/INSTRUCTIONS.md) for instructions on how to test and deploy the contracts.