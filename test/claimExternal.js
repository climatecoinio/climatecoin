// Simulate a an external claim

const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Climate = artifacts.require("Climate");
const ClimateContributionMock = artifacts.require("ClimateContributionMock");
const ContributionWallet = artifacts.require("ContributionWallet");
const DevTokensHolder = artifacts.require("DevTokensHolderMock");
const ClimatePlaceHolderMock = artifacts.require("ClimatePlaceHolderMock");
const ExternalToken = artifacts.require("ExternalToken");

contract("ClimateContribution", function(accounts) {
    const addressClimate = accounts[0];
    const addressCommunity = accounts[1];
    const addressReserve = accounts[2];
    const addressDevs = accounts[3];

    let multisigClimate;
    let multisigCommunity;
    let multisigReserve;
    let multisigDevs;
    let miniMeTokenFactory;
    let climate;
    let climateContribution;
    let contributionWallet;
    let devTokensHolder;
    let climatePlaceHolder;
    let externalToken;

    const startBlock = 1000000;
    const endBlock = 1003000;

    it("Deploys all contracts", async function() {
        multisigClimate = await MultiSigWallet.new([addressClimate], 1);
        multisigCommunity = await MultiSigWallet.new([addressCommunity], 1);
        multisigReserve = await MultiSigWallet.new([addressReserve], 1);
        multisigDevs = await MultiSigWallet.new([addressDevs], 1);

        miniMeTokenFactory = await MiniMeTokenFactory.new();

        climate = await Climate.new(miniMeTokenFactory.address);
        climateContribution = await ClimateContributionMock.new();
        contributionWallet = await ContributionWallet.new(
            multisigClimate.address,
            endBlock,
            climateContribution.address);
        devTokensHolder = await DevTokensHolder.new(
            multisigDevs.address,
            climateContribution.address,
            climate.address);
        climatePlaceHolder = await ClimatePlaceHolderMock.new(
            multisigCommunity.address,
            climate.address,
            climateContribution.address);

        await climate.changeController(climateContribution.address);

        await climateContribution.initialize(
            climate.address,
            climatePlaceHolder.address,

            startBlock,
            endBlock,

            contributionWallet.address,

            multisigReserve.address,
            devTokensHolder.address);

        externalToken = await ExternalToken.new();
        await externalToken.generateTokens(addressClimate, 1000);
    });

    it("Sends to and recover tokens from the ClimateContribution", async function() {
        await externalToken.transfer(climateContribution.address, 100);
        const balanceBefore = await externalToken.balanceOf(addressClimate);
        assert.equal(balanceBefore.toNumber(), 900);

        await climateContribution.claimTokens(externalToken.address);
        const afterBefore = await externalToken.balanceOf(addressClimate);
        assert.equal(afterBefore.toNumber(), 1000);
    });

    it("Recovers tokens sent to Climate", async function() {
        await externalToken.transfer(climate.address, 100);
        const balanceBefore = await externalToken.balanceOf(addressClimate);
        assert.equal(balanceBefore.toNumber(), 900);

        await climateContribution.claimTokens(externalToken.address);
        const afterBefore = await externalToken.balanceOf(addressClimate);
        assert.equal(afterBefore.toNumber(), 1000);
    });
});
