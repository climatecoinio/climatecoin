const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Climate = artifacts.require("Climate");
const ClimateContribution = artifacts.require("ClimateContribution");
const ContributionWallet = artifacts.require("ContributionWallet");
const DevTokensHolder = artifacts.require("DevTokensHolder");
const ClimatePlaceHolder = artifacts.require("ClimatePlaceHolder");
const ReserveTokensHolder = artifacts.require("ReserveTokensHolder");


// All of these constants need to be configured before deploy
const addressBitcoinSuisse = "0x8a838b1722750ba185f189092833791adb98955f";  //address test
const addressMainOwner = "0x5f61a7da478e982bbd147201380c089e34543ab4";

const addressesReserve = [
    addressMainOwner
];
const multisigReserveReqs = 1;

const addressesDevs = [
    addressMainOwner
];
const multisigDevsReqs = 1;

const addressesBounties = [
    addressMainOwner
];
const multisigBountiesReqs = 1;

const startBlock = 1567500;
const endBlock = 1568000;


module.exports = async function(deployer, network, accounts) {
    //if (network === "development") return;  // Don't deploy on tests

    // MultiSigWallet send
    let multisigReserveFuture = MultiSigWallet.new(addressesReserve, multisigReserveReqs);
    let multisigDevsFuture = MultiSigWallet.new(addressesDevs, multisigDevsReqs);
    let multisigBountiesFuture = MultiSigWallet.new(addressesBounties, multisigBountiesReqs);
    // MiniMeTokenFactory send
    let miniMeTokenFactoryFuture = MiniMeTokenFactory.new();

    // MultiSigWallet wait
    let multisigReserve = await multisigReserveFuture;
    console.log("MultiSigWallet Reserve: " + multisigReserve.address);
    let multisigDevs = await multisigDevsFuture;
    console.log("MultiSigWallet Devs: " + multisigDevs.address);
    let multisigBounties = await multisigBountiesFuture;
    console.log("MultiSigWallet Bounties: " + multisigBounties.address);
    // MiniMeTokenFactory wait
    let miniMeTokenFactory = await miniMeTokenFactoryFuture;
    console.log("MiniMeTokenFactory: " + miniMeTokenFactory.address);
    console.log();

    // Climate send
    let climateFuture = Climate.new(miniMeTokenFactory.address);
    // StatusContribution send
    let climateCrowdsaleFuture = ClimateContribution.new();

    // climate wait
    let climate = await climateFuture;
    console.log("Climate: " + climate.address);
    // StatusContribution wait
    let climateContribution = await climateCrowdsaleFuture;
    console.log("Climate contribution: " + climateContribution.address);
    console.log();

    // climate initialize checkpoints for 0th TX gas savings
    await climate.generateTokens('0x0', 1);
    await climate.destroyTokens('0x0', 1);

    // climate changeController send
    let climateChangeControllerFuture = climate.changeController(climateContribution.address);
    // // ContributionWallet send
    // let contributionWalletFuture = ContributionWallet.new(
    //     addressBitcoinSuisse,
    //     endBlock,
    //     realCrowdsale.address);
    // DevTokensHolder send
    let devTokensHolderFuture = DevTokensHolder.new(
        multisigDevs.address,
        climateContribution.address);

    // ReserveTokensHolder send
    let reserveTokensHolderFuture = ReserveTokensHolder.new(
        multisigReserve.address,
        climateContribution.address);

    // // ContributionWallet wait
    // let contributionWallet = await contributionWalletFuture;
    // console.log("ContributionWallet: " + contributionWallet.address);
    // DevTokensHolder wait
    let devTokensHolder = await devTokensHolderFuture;
    console.log("DevTokensHolder: " + devTokensHolder.address);
    console.log();

    let reserveTokensHolder = await reserveTokensHolderFuture;
    console.log("ReserveTokensHolder: " + reserveTokensHolder.address);
    console.log();

    // ClimatePlaceHolder send
    let climatePlaceHolderFuture = ClimatePlaceHolder.new(
        addressMainOwner,
        climate.address,
        climateContribution.address);

    // climate placeholder wait
    let placeHolder = await climatePlaceHolderFuture;
    console.log("Climate placeholder: " + placeHolder.address);
    console.log();

    // StatusContribution initialize send/wait
    await climateContribution.initialize(
        climate.address,
        placeHolder.address,

        startBlock,
        endBlock,

        addressBitcoinSuisse,

        reserveTokensHolder.address,
        devTokensHolder.address,
        multisigBounties.address);
    console.log("Climate Crowdsale initialized!");
};
