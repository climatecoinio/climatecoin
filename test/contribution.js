// Simulate a full contribution

const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Climate = artifacts.require("ClimateMock");
const ClimateContributionClass = artifacts.require("ClimateContributionMock");
const ContributionWallet = artifacts.require("ContributionWallet");
const DevTokensHolder = artifacts.require("DevTokensHolderMock");
const ResTokensHolder = artifacts.require("ReserveTokensHolderMock");
const ClimatePlaceHolderClass = artifacts.require("ClimatePlaceHolderMock");



const assertFail = require("./helpers/assertFail");

contract("ClimateContribution", function (accounts) {
    const addressClimate = accounts[0];
    const addressCommunity = accounts[1];
    const addressReserve = accounts[2];
    const addressBounties = accounts[9];
    const addressDevs = accounts[3];
    const addressREALHolder = accounts[4];

    const addressGuaranteed0 = accounts[7];
    const addressGuaranteed1 = accounts[8];

    let multisigClimate;
    let multisigCommunity;
    let multisigReserve;
    let multisigBounties;
    let multisigDevs;
    let miniMeTokenFactory;
    let climate;
    let climateContribution;
    let contributionWallet;
    let devTokensHolder;
    let reserveTokensHolder;
    let climatePlaceHolder;

    const startBlock = 1000000;
    const endBlock = 1040000;

    it("Deploys all contracts", async function () {
        multisigClimate = await MultiSigWallet.new([ addressClimate ], 1);
        multisigCommunity = await MultiSigWallet.new([addressCommunity], 1);
        multisigReserve = await MultiSigWallet.new([addressReserve], 1);
        multisigBounties = await MultiSigWallet.new([addressBounties], 1);
        multisigDevs = await MultiSigWallet.new([addressDevs], 1);

        miniMeTokenFactory = await MiniMeTokenFactory.new();

        climate = await Climate.new(miniMeTokenFactory.address);
        climateContribution = await ClimateContributionClass.new();

        contributionWallet = await ContributionWallet.new(
            multisigClimate.address,
            endBlock,
            climateContribution.address);

        devTokensHolder = await DevTokensHolder.new(
            multisigDevs.address,
            climateContribution.address,
            climate.address);


        reserveTokensHolder = await ResTokensHolder.new(
            multisigReserve.address,
            climateContribution.address,
            climate.address);

        climatePlaceHolder = await ClimatePlaceHolderClass.new(
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

            reserveTokensHolder.address,
            devTokensHolder.address,
            multisigBounties.address);
    });

    it("Checks initial parameters", async function () {
        assert.equal(await climate.controller(), climateContribution.address);
    });

    it("Checks that nobody can buy before the sale starts", async function () {
        await assertFail(async function () {
            await climate.send(web3.toWei(1));
        });
    });

    it("Adds 2 guaranteed addresses", async function () {
        await climateContribution.setGuaranteedAddress(addressGuaranteed0, 120);
        await climateContribution.setGuaranteedAddress(addressGuaranteed1, 140);
    });

    it("Moves time to start of the ICO, and does the first buy", async function () {
        await climateContribution.setMockedBlockNumber(1000000);
        await climate.setMockedBlockNumber(1000000);

        await climate.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressClimate
        });

        const balance = await climate.balanceOf(addressClimate);

        assert.equal(web3.fromWei(balance).toNumber(), 262.5);
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

    it("Returns the remaining of the last transaction ", async function () {
        const initialBalance = await web3.eth.getBalance(addressClimate);
        await climate.sendTransaction({ value: web3.toWei(5), gas: 300000, gasPrice: "20000000000" });
        const finalBalance = await web3.eth.getBalance(addressClimate);

        const spent = web3.fromWei(initialBalance.sub(finalBalance)).toNumber();

        assert.isAbove(spent, 5);
        assert.isBelow(spent, 5.02);

        const totalCollected = await climateContribution.totalCollected();
        assert.equal(web3.fromWei(totalCollected), 6);

        const balanceContributionWallet = await web3.eth.getBalance(contributionWallet.address);
        assert.equal(web3.fromWei(balanceContributionWallet), 6);
    });

    it("Finalizes", async function () {
        await climateContribution.setMockedBlockNumber(endBlock + 1);
        await climateContribution.finalize();

        const totalSupply = await climate.totalSupply();

        assert.isBelow(web3.fromWei(totalSupply).toNumber() - (180000 / 0.46), 0.01);

        const balanceDevs = await climate.balanceOf(devTokensHolder.address);
        assert.equal(balanceDevs.toNumber(), totalSupply.mul(0.20).toNumber(), 'devs');

        const balanceSecondary = await climate.balanceOf(reserveTokensHolder.address);
        assert.equal(balanceSecondary.toNumber(), totalSupply.mul(0.15).toNumber(), 'reserve');

        const balanceThird = await climate.balanceOf(multisigBounties.address);
        assert.equal(balanceThird.toNumber(), totalSupply.mul(0.14).toNumber(), 'bounties');
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

    it("Doesn't allow transfers in the 1 week period", async function() {
            await assertFail(async function() {
                await climate.transfer(addressREALHolder, web3.toWei(1000));
            });
      });

    it("Allows transfers after 1 week period", async function () {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 7) + 1000;
        await climatePlaceHolder.setMockedTime(t);

        await climate.transfer(accounts[ 5 ], web3.toWei(1000));

        const balance2 = await climate.balanceOf(accounts[ 5 ]);

        assert.equal(web3.fromWei(balance2).toNumber(), 1000);
    });

    it("Disallows devs from transfering before 6 months have past", async function () {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 7) + 1000;
        await devTokensHolder.setMockedTime(t);

        // This function will fail in the multisig
        await multisigDevs.submitTransaction(
            devTokensHolder.address,
            0,
            devTokensHolder.contract.collectTokens.getData(),
            { from: addressDevs, gas: 1000000 });

        const balance = await climate.balanceOf(multisigDevs.address);
        assert.equal(balance, 0);
    });

    it("Allows devs to extract after 6 months", async function () {
        const t = (await climateContribution.finalizedTime()).toNumber() + (86400 * 360);
        await devTokensHolder.setMockedTime(t);

        const totalSupply = await climate.totalSupply();

        await multisigDevs.submitTransaction(
            devTokensHolder.address,
            0,
            devTokensHolder.contract.collectTokens.getData(),
            { from: addressDevs });

        const balance = await climate.balanceOf(multisigDevs.address);

        const calcTokens = web3.fromWei(totalSupply.mul(0.20).mul(0.5)).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        assert.equal(realTokens, calcTokens);
    });

    it("Allows devs to extract everything after 24 months", async function () {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 360 * 2);
        await devTokensHolder.setMockedTime(t);

        const totalSupply = await climate.totalSupply();

        await multisigDevs.submitTransaction(
            devTokensHolder.address,
            0,
            devTokensHolder.contract.collectTokens.getData(),
            { from: addressDevs });

        const balance = await climate.balanceOf(multisigDevs.address);

        const calcTokens = web3.fromWei(totalSupply.mul(0.20)).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        assert.equal(calcTokens, realTokens);
    });

    it("Checks that Climate's Controller is upgradeable", async function () {
        await multisigCommunity.submitTransaction(
            climatePlaceHolder.address,
            0,
            climatePlaceHolder.contract.changeController.getData(accounts[ 6 ]),
            { from: addressCommunity });

        const controller = await climate.controller();

        assert.equal(controller, accounts[ 6 ]);
    });
});
