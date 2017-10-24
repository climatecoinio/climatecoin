const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Climate = artifacts.require("ClimateMock");
const ClimateContributionClass = artifacts.require("ClimateContributionMock");
const ContributionWallet = artifacts.require("ContributionWallet");
const DevTokensHolder = artifacts.require("DevTokensHolderMock");
const ResTokensHolder = artifacts.require("ReserveTokensHolderMock");
const ClimatePlaceHolderClass = artifacts.require("ClimatePlaceHolderMock");



const assertFail = require("./helpers/assertFail");

contract("ClimateContribution limits 1", function (accounts) {
    const addressClimate = accounts[0];
    const addressCommunity = accounts[1];
    const addressReserve = accounts[2];
    const addressBounties = accounts[9];
    const addressDevs = accounts[3];
    const addressREALHolder = accounts[4];
    const addressTest1 = accounts[5];
    const addressTest2 = accounts[6];
    const addressTest3 = accounts[7];
    const addressTest4 = accounts[8];
    const addressTestDummy = accounts[10];
    const addressTestDummy2 = accounts[11];

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

    it("Pauses and resumes the contribution ", async function() {
        await climateContribution.setMockedBlockNumber(1000000);
        await climate.setMockedBlockNumber(1000000);
        await climateContribution.pauseContribution();
        await assertFail(async function() {
            await climate.sendTransaction({value: web3.toWei(5), gas: 300000, gasPrice: "20000000000"});
        });
        await climateContribution.resumeContribution();
    });

    it("Checks limits", async function() {
      var currentTotalCollected = 0;

      await climateContribution.setMockedBlockNumber(1000000);
      await climate.setMockedBlockNumber(1000000);

      await climate.sendTransaction({value: web3.toWei(1), gas: 300000, from: addressTest1});
      var balanceTest1 = await climate.balanceOf(addressTest1);
      assert.equal(web3.fromWei(balanceTest1).toNumber(), 210*1.25);

      await climate.sendTransaction({value: web3.toWei(149949), gas: 300000, from: addressTestDummy}); //24950
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 149950);

      await climateContribution.setMockedBlockNumber(1001000);
      await climate.setMockedBlockNumber(1001000);

      await climate.sendTransaction({value: web3.toWei(100), gas: 300000, from: addressTest1}); //25050
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 150050);
      balanceTest1 = await climate.balanceOf(addressTest1);
      assert.equal(web3.fromWei(balanceTest1).toNumber(), (1*210*1.25)+(50*210*1.25)+(50*210*1.20));

      await climate.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy}); //25300
      await climateContribution.setMockedBlockNumber(1002000);
      await climate.setMockedBlockNumber(1002000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 150300);

      await climate.sendTransaction({value: web3.toWei(10), gas: 300000, from: addressTest2}); //25310
      var balanceTest2 = await climate.balanceOf(addressTest2);
      assert.equal(web3.fromWei(balanceTest2).toNumber(), 10*210*1.20);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 150310);


      await climate.sendTransaction({value: web3.toWei(4801), gas: 300000, from: addressTestDummy}); //49950 19839
      await climate.sendTransaction({value: web3.toWei(94839), gas: 300000, from: addressTestDummy2});
      await climateContribution.setMockedBlockNumber(1003000);
      await climate.setMockedBlockNumber(1003000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 249950);

      await climate.sendTransaction({value: web3.toWei(100), gas: 300000, from: addressTest2}); //50050
      balanceTest2 = await climate.balanceOf(addressTest2);
      assert.equal(web3.fromWei(balanceTest2).toNumber(), 10*210*1.20+(50*210*1.20)+(50*210*1.15));
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 250050);

      await climate.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy}); //50300
      await climateContribution.setMockedBlockNumber(1004000);
      await climate.setMockedBlockNumber(1004000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 250300);

      await climate.sendTransaction({value: web3.toWei(10), gas: 300000, from: addressTest3}); //50310
      var balanceTest3 = await climate.balanceOf(addressTest3);
      assert.equal(web3.fromWei(balanceTest3).toNumber(), 10*210*1.15);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 250310);

      await climate.sendTransaction({value: web3.toWei(99640), gas: 300000, from: addressTestDummy});//99950
      await climateContribution.setMockedBlockNumber(1005000);
      await climate.setMockedBlockNumber(1005000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 349950);

      await climate.sendTransaction({value: web3.toWei(100), gas: 300000, from: addressTest3}); //100050
      balanceTest3 = await climate.balanceOf(addressTest3);
      assert.equal(web3.fromWei(balanceTest3).toNumber(), 10*210*1.15+(50*210*1.15)+(50*210*1.05));
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 350050);

      await climate.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy}); //100300
      await climateContribution.setMockedBlockNumber(1006000);
      await climate.setMockedBlockNumber(1006000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 350300);

      await climate.sendTransaction({value: web3.toWei(10), gas: 300000, from: addressTest4}); //100310
      var balanceTest4 = await climate.balanceOf(addressTest4);
      assert.equal(web3.fromWei(balanceTest4).toNumber(), 10*210*1.05);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 350310);

      await climate.sendTransaction({value: web3.toWei(99640), gas: 300000, from: addressTestDummy}); //149950
      await climateContribution.setMockedBlockNumber(1007000);
      await climate.setMockedBlockNumber(1007000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 449950);

      await climate.sendTransaction({value: web3.toWei(100), gas: 300000, from: addressTest4}); //150050
      balanceTest4 = await climate.balanceOf(addressTest4);
      assert.equal(web3.fromWei(balanceTest4).toNumber(), 10*210*1.05+(50*210*1.05)+(50*210));
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 450050);

      await climate.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy}); //150300
      await climateContribution.setMockedBlockNumber(1008000);
      await climate.setMockedBlockNumber(1008000);
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 450300);

      await climate.sendTransaction({value: web3.toWei(100), gas: 300000, from: addressTest4}); //150400
      balanceTest4 = await climate.balanceOf(addressTest4);
      assert.equal(web3.fromWei(balanceTest4).toNumber(), 10*210*1.05+(50*210*1.05)+(150*210));
      currentTotalCollected = await climateContribution.totalCollected();
      // console.log(web3.fromWei(currentTotalCollected).toNumber());
      assert.equal(web3.fromWei(currentTotalCollected).toNumber(), 450400);
    });
});
