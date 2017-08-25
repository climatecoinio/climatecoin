const randomBytes = require("random-bytes");

const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Climate = artifacts.require("Climate");
const ClimateContribution= artifacts.require("ClimateContribution");
const ContributionWallet = artifacts.require("ContributionWallet");
const DevTokensHolder = artifacts.require("DevTokensHolder");
const ClimatePlaceHolder = artifacts.require("ClimatePlaceHolder");

// All of these constants need to be configured before deploy
const addressOwner = "0xf93df8c288b9020e76583a6997362e89e0599e99";
const addressesClimate = [
    "0x2ca9d4d0fd9622b08de76c1d484e69a6311db765",
];
const multisigClimateReqs = 1
const addressesCommunity = [
    "0x166ddbcfe4d5849b0c62063747966a13706a4af7",
];
const multisigCommunityReqs = 1
const addressesReserve = [
    "0x4781fee94e7257ffb6e3a3dcc5f8571ddcc02109",
];
const multisigReserveReqs = 1
const addressesDevs = [
    "0xcee9f54a23324867d8537589ba8dc6c8a6e9d0b9",
];
const multisigDevsReqs = 1

const startBlock = 3800000;
const endBlock = 3900000;

module.exports = async function(deployer, network, accounts) {
    if (network === "development") return;  // Don't deploy on tests

    // MultiSigWallet send
    let multisigClimateFuture = MultiSigWallet.new(addressesClimate, multisigClimateReqs);
    let multisigCommunityFuture = MultiSigWallet.new(addressesCommunity, multisigCommunityReqs);
    let multisigReserveFuture = MultiSigWallet.new(addressesReserve, multisigReserveReqs);
    let multisigDevsFuture = MultiSigWallet.new(addressesDevs, multisigDevsReqs);
    // MiniMeTokenFactory send
    let miniMeTokenFactoryFuture = MiniMeTokenFactory.new();

    // MultiSigWallet wait
    let multisigClimate = await multisigClimateFuture;
    console.log("\nMultiSigWallet Climate: " + multisigClimate.address);
    let multisigCommunity = await multisigCommunityFuture;
    console.log("MultiSigWallet Community: " + multisigCommunity.address);
    let multisigReserve = await multisigReserveFuture;
    console.log("MultiSigWallet Reserve: " + multisigReserve.address);
    let multisigDevs = await multisigDevsFuture;
    console.log("MultiSigWallet Devs: " + multisigDevs.address);
    // MiniMeTokenFactory wait
    let miniMeTokenFactory = await miniMeTokenFactoryFuture;
    console.log("MiniMeTokenFactory: " + miniMeTokenFactory.address);
    console.log();

    // Climate initialize checkpoints for 0th TX gas savings
    await climate.generateTokens('0x0', 1);
    await climate.destroyTokens('0x0', 1);

    // Climate changeController send
    let climateChangeControllerFuture = climate.changeController(climateContribution.address);
    // ContributionWallet send
    let contributionWalletFuture = ContributionWallet.new(
        multisigClimate.address,
        endBlock,
        climateContribution.address);
    // DevTokensHolder send
    let devTokensHolderFuture = DevTokensHolder.new(
        multisigDevs.address,
        climateContribution.address,
        climate.address);

    // Climate changeController wait
    await climateChangeControllerFuture;
    console.log("Climate changed controller!");
    // ContributionWallet wait
    let contributionWallet = await contributionWalletFuture;
    console.log("ContributionWallet: " + contributionWallet.address);
    // DevTokensHolder wait
    let devTokensHolder = await devTokensHolderFuture;
    console.log("DevTokensHolder: " + devTokensHolder.address);
    console.log();

    // ClimatePlaceHolder send
    let climatePlaceHolderFuture = ClimatePlaceHolder.new(
        multisigCommunity.address,
        climate.address,
        climateContribution.address);

    // ClimatePlaceHolder wait
    let climatePlaceHolder = await climatePlaceHolderFuture;
    console.log("ClimatePlaceHolder: " + climatePlaceHolder.address);
    console.log();

    // ClimateContribution initialize send/wait
    await climateContribution.initialize(
        climate.address,
        climatePlaceHolder.address,

        startBlock,
        endBlock,

        contributionWallet.address,

        multisigReserve.address,
        devTokensHolder.address);
    console.log("ClimateContribution initialized!");
};
