// Simulate a full contribution

const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Climate = artifacts.require("ClimateMock");
const ClimateContributionMock = artifacts.require("ClimateContributionMock");
const ContributionWallet = artifacts.require("ContributionWallet");
const DevTokensHolder = artifacts.require("DevTokensHolderMock");
const ClimatePlaceHolderMock = artifacts.require("ClimatePlaceHolderMock");

const assertFail = require("./helpers/assertFail");

contract("ClimateContribution", function (accounts) {
    const addressClimate = accounts[ 0 ];
    const addressCommunity = accounts[ 1 ];
    const addressReserve = accounts[ 2 ];
    const addressDevs = accounts[ 3 ];
    const addressDiscounts = accounts[ 4 ];

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

    const startBlock = 1000000;
    const endBlock = 1040000;

    it("Deploys all contracts", async function () {
        multisigClimate = await MultiSigWallet.new([ addressClimate ], 1);
        multisigCommunity = await MultiSigWallet.new([ addressCommunity ], 1);
        multisigReserve = await MultiSigWallet.new([ addressReserve ], 1);
        multisigDevs = await MultiSigWallet.new([ addressDevs ], 1);

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
    });

    it("Checks initial parameters", async function () {
        assert.equal(await climate.controller(), climateContribution.address);
    });

    it("Moves time to start of the ICO and checks sale discounts for early participants", async function () {
        climateContribution.setTotalNormalCollected(0);

        await climateContribution.setMockedBlockNumber(1000000);
        await climate.setMockedBlockNumber(1000000);

        await climate.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        let balanceBountiesWallet = await climate.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), 250 * 1.25);

        climateContribution.setTotalNormalCollected(web3.toWei(150000));

        await climateContribution.setMockedBlockNumber(1001000);
        await climate.setMockedBlockNumber(1001000);

        await climate.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await climate.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), 312.5 + 250 * 1.20);

        climateContribution.setTotalNormalCollected(web3.toWei(250000));

        await climateContribution.setMockedBlockNumber(1002000);
        await climate.setMockedBlockNumber(1002000);

        await climate.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await climate.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), 612.5 + 250 * 1.15);

        climateContribution.setTotalNormalCollected(web3.toWei(350000));

        await climateContribution.setMockedBlockNumber(1003000);
        await climate.setMockedBlockNumber(1003000);

        await climate.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await climate.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), 900 + 250 * 1.05);

        climateContribution.setTotalNormalCollected(web3.toWei(450000));

        await climateContribution.setMockedBlockNumber(1004000);
        await climate.setMockedBlockNumber(1004000);

        await climate.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await climate.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), 1162.5 + 250);
    });

    it("Pauses and resumes the contribution ", async function () {
        await climateContribution.setMockedBlockNumber(1005000);
        await climate.setMockedBlockNumber(1005000);
        await climateContribution.pauseContribution();
        await assertFail(async function () {
            await climate.sendTransaction({ value: web3.toWei(5), gas: 300000, gasPrice: "20000000000" });
        });
        await climateContribution.resumeContribution();
    });

    it("Finalizes", async function () {
        await climateContribution.setMockedBlockNumber(endBlock + 1);
        await climateContribution.finalize();

        const totalSupply = await climate.totalSupply();

        assert.isBelow(web3.fromWei(totalSupply).toNumber() - (180000 / 0.46), 0.01);

        const balanceDevs = await climate.balanceOf(devTokensHolder.address);
        assert.equal(balanceDevs.toNumber(), totalSupply.mul(0.20).toNumber());

        const balanceSecondary = await climate.balanceOf(multisigReserve.address);
        assert.equal(balanceSecondary.toNumber(), totalSupply.mul(0.29).toNumber());
    });

    it("Moves the Ether to the final multisig", async function () {
        /** Check the balance of the contribution wallet, move all the ether to multisig and check
         * if the transaction is successful comparing both accounts*/
        const preBalanceContribution = web3.eth.getBalance(contributionWallet.address);

        await multisigClimate.submitTransaction(
            contributionWallet.address,
            0,
            contributionWallet.contract.withdraw.getData());

        const balanceContribution = await web3.eth.getBalance(contributionWallet.address);
        const balanceMultiSig = await web3.eth.getBalance(multisigClimate.address);

        assert.isBelow(Math.abs(web3.fromWei(balanceContribution).toNumber()), 0.00001);
        assert.equal(web3.fromWei(preBalanceContribution).toNumber(), web3.fromWei(balanceMultiSig).toNumber());
    });
});
