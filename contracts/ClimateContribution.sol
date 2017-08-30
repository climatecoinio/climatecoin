pragma solidity ^0.4.11;


import "./Owned.sol";
import "./MiniMeToken.sol";
import "./SafeMath.sol";
import "./ERC20Token.sol";


contract ClimateContribution is Owned, TokenController {
    using SafeMath for uint256;

    uint256 constant public fundingLimit = 600000 ether;

    uint256 constant public failSafeLimit = 800000 ether;

    uint256 constant public maxGuaranteedLimit = 30000 ether;

    uint256 constant public exchangeRate = 250;

    uint256 constant public maxGasPrice = 50000000000;

    uint256 constant public maxCallFrequency = 100;

    uint256 constant public firstBonusCap = 150000 ether;

    uint256 constant public firstBonusPercent = 25;

    uint256 constant public secondBonusCap = 250000 ether;

    uint256 constant public secondBonusPercent = 20;

    uint256 constant public thirdBonusCap = 350000 ether;

    uint256 constant public thirdBonusPercent = 15;

    uint256 constant public fourthBonusCap = 450000 ether;

    uint256 constant public fourthBonusPercent = 5;

    MiniMeToken public Climate;

    uint256 public startBlock;

    uint256 public endBlock;

    address public destEthDevs;

    address public destTokensDevs;

    address public destTokensReserve;

    address public climateController;

    mapping (address => uint256) public guaranteedBuyersLimit;

    mapping (address => uint256) public guaranteedBuyersBought;

    uint256 public totalGuaranteedCollected;

    uint256 public totalNormalCollected;

    uint256 public reservedGuaranteed;

    uint256 public finalizedBlock;

    uint256 public finalizedTime;

    mapping (address => uint256) public lastCallBlock;

    bool public paused;

    modifier initialized() {
        require(address(Climate) != 0x0);
        _;
    }

    modifier contributionOpen() {
        require(getBlockNumber() >= startBlock &&
        getBlockNumber() <= endBlock &&
        finalizedBlock == 0 &&
        address(Climate) != 0x0);
        _;
    }

    modifier notPaused() {
        require(!paused);
        _;
    }

    function ClimateContribution() {
        paused = false;
    }


    /// @notice This method should be called by the owner before the contribution
    ///  period starts This initializes most of the parameters
    /// @param _climate Address of the Climate token contract
    /// @param _climateController Token controller for the Climate that will be transferred after
    ///  the contribution finalizes.
    /// @param _startBlock Block when the contribution period starts
    /// @param _endBlock The last block that the contribution period is active
    /// @param _destEthDevs Destination address where the contribution ether is sent
    /// @param _destTokensReserve Address where the tokens for the reserve are sent
    /// @param _destTokensDevs Address where the tokens for the dev are sent
    function initialize(
    address _climate,
    address _climateController,

    uint256 _startBlock,
    uint256 _endBlock,

    address _destEthDevs,

    address _destTokensReserve,
    address _destTokensDevs
    ) public onlyOwner {
        // Initialize only once

        require(address(Climate) == 0x0);

        Climate = MiniMeToken(_climate);
        require(Climate.totalSupply() == 0);
        require(Climate.controller() == address(this));
        require(Climate.decimals() == 18);
        // Same amount of decimals as ETH

        require(_climateController != 0x0);
        climateController = _climateController;

        require(_startBlock >= getBlockNumber());
        require(_startBlock < _endBlock);
        startBlock = _startBlock;
        endBlock = _endBlock;

        require(_destEthDevs != 0x0);
        destEthDevs = _destEthDevs;

        require(_destTokensReserve != 0x0);
        destTokensReserve = _destTokensReserve;

        require(_destTokensDevs != 0x0);
        destTokensDevs = _destTokensDevs;
    }

    /// @notice Sets the limit for a guaranteed address. All the guaranteed addresses
    ///  will be able to get REALs during the contribution period with his own
    ///  specific limit.
    ///  This method should be called by the owner after the initialization
    ///  and before the contribution starts.
    /// @param _th Guaranteed address
    /// @param _limit Limit for the guaranteed address.
    function setGuaranteedAddress(address _th, uint256 _limit) public initialized onlyOwner {
        require(getBlockNumber() < startBlock);
        require(_limit > 0 && _limit <= maxGuaranteedLimit);
        guaranteedBuyersLimit[_th] = _limit;
        reservedGuaranteed = reservedGuaranteed + _limit;
        GuaranteedAddress(_th, _limit);
    }

    /// @notice If anybody sends Ether directly to this contract, consider he is
    ///  getting CO2s.
    function() public payable notPaused {
        proxyPayment(msg.sender);
    }


    //////////
    // MiniMe Controller functions
    //////////

    /// @notice This method will generally be called by the Climate token contract to
    ///  acquire CO2s. Or directly from third parties that want to acquire CO2s in
    ///  behalf of a token holder.
    /// @param _th Climate holder where the CO2s will be minted.
    function proxyPayment(address _th) public payable notPaused initialized contributionOpen returns (bool) {
        require(_th != 0x0);
        uint256 guaranteedRemaining = guaranteedBuyersLimit[_th].sub(guaranteedBuyersBought[_th]);
        if (guaranteedRemaining > 0) {
            buyGuaranteed(_th);
        }
        else {
            buyNormal(_th);
        }
        return true;
    }

    function onTransfer(address, address, uint256) public returns (bool) {
        return false;
    }

    function onApprove(address, address, uint256) public returns (bool) {
        return false;
    }

    function buyNormal(address _th) internal {
        require(tx.gasprice <= maxGasPrice);

        // Antispam mechanism
        address caller;
        if (msg.sender == address(Climate)) {
            caller = _th;
        }
        else {
            caller = msg.sender;
        }

        // Do not allow contracts to game the system
        require(!isContract(caller));

        require(getBlockNumber().sub(lastCallBlock[caller]) >= maxCallFrequency);
        lastCallBlock[caller] = getBlockNumber();

        uint256 toCollect = failSafeLimit - totalNormalCollected;

        uint256 toFund;
        if (msg.value <= toCollect) {
            toFund = msg.value;
        }
        else {
            toFund = toCollect;
        }

        totalNormalCollected = totalNormalCollected.add(toFund);
        doBuy(_th, toFund, false);
    }

    function buyGuaranteed(address _th) internal {
        uint256 toCollect = guaranteedBuyersLimit[_th];

        uint256 toFund;
        if (guaranteedBuyersBought[_th].add(msg.value) > toCollect) {
            toFund = toCollect.sub(guaranteedBuyersBought[_th]);
        }
        else {
            toFund = msg.value;
        }

        guaranteedBuyersBought[_th] = guaranteedBuyersBought[_th].add(toFund);
        totalGuaranteedCollected = totalGuaranteedCollected.add(toFund);
        doBuy(_th, toFund, true);
    }

    function doBuy(address _th, uint256 _toFund, bool _guaranteed) internal {
        assert(msg.value >= _toFund);
        // Not needed, but double check.
        assert(totalCollected() <= failSafeLimit);

        uint256 collected = totalCollected();
        uint256 totCollected = collected;
        collected = collected.sub(_toFund);

        if (_toFund > 0) {
            uint256 tokensGenerated = _toFund.mul(exchangeRate);
            uint256 tokensToBonusCap = 0;
            uint256 tokensToNextBonusCap = 0;
            uint256 bonusTokens = 0;

            if (_guaranteed) {
                uint256 guaranteedCollected = totalGuaranteedCollected - _toFund;
                if (guaranteedCollected < firstBonusCap) {
                    if (totalGuaranteedCollected < firstBonusCap) {
                        tokensGenerated = tokensGenerated.add(tokensGenerated.percent(firstBonusPercent));
                    }
                    else {
                        bonusTokens = firstBonusCap.sub(guaranteedCollected).percent(firstBonusPercent).mul(exchangeRate);
                        tokensToBonusCap = tokensGenerated.add(bonusTokens);
                        tokensToNextBonusCap = totalGuaranteedCollected.sub(firstBonusCap).percent(secondBonusPercent).mul(exchangeRate);
                        tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
                    }
                }
                else {
                    if (totalGuaranteedCollected < secondBonusCap) {
                        tokensGenerated = tokensGenerated.add(tokensGenerated.percent(secondBonusPercent));
                    }
                    else {
                        bonusTokens = secondBonusCap.sub(guaranteedCollected).percent(secondBonusPercent).mul(exchangeRate);
                        tokensToBonusCap = tokensGenerated.add(bonusTokens);
                        tokensToNextBonusCap = totalGuaranteedCollected.sub(secondBonusCap).percent(thirdBonusPercent).mul(exchangeRate);
                        tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
                    }
                }
            }
            else if (collected < firstBonusCap) {
                if (collected.add(_toFund) < firstBonusCap) {
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(firstBonusPercent));
                }
                else {
                    bonusTokens = firstBonusCap.sub(collected).percent(firstBonusPercent).mul(exchangeRate);
                    tokensToBonusCap = tokensGenerated.add(bonusTokens);
                    tokensToNextBonusCap = totCollected.sub(firstBonusCap).percent(secondBonusPercent).mul(exchangeRate);
                    tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);

                }
            }
            else if (collected < secondBonusCap) {
                if (collected.add(_toFund) < secondBonusCap) {
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(secondBonusPercent));
                }
                else {
                    bonusTokens = secondBonusCap.sub(collected).percent(secondBonusPercent).mul(exchangeRate);
                    tokensToBonusCap = tokensGenerated.add(bonusTokens);
                    tokensToNextBonusCap = totCollected.sub(secondBonusCap).percent(thirdBonusPercent).mul(exchangeRate);
                    tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
                }
            }
            else if (collected < thirdBonusCap) {
                if (collected.add(_toFund) < thirdBonusCap) {
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(thirdBonusPercent));

                }
                else {
                    bonusTokens = thirdBonusCap.sub(collected).percent(thirdBonusPercent).mul(exchangeRate);
                    tokensToBonusCap = tokensGenerated.add(bonusTokens);
                    tokensToNextBonusCap = totCollected.sub(thirdBonusCap).percent(fourthBonusPercent).mul(exchangeRate);
                    tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);

                }
            }
            else if (collected < fourthBonusCap) {
                if (collected.add(_toFund) < fourthBonusCap) {
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(fourthBonusPercent));

                }
                else {
                    bonusTokens = fourthBonusCap.sub(collected).percent(fourthBonusPercent).mul(exchangeRate);
                    tokensGenerated = tokensGenerated.add(bonusTokens);
                }
            }

            assert(Climate.generateTokens(_th, tokensGenerated));
            destEthDevs.transfer(_toFund);

            NewSale(_th, _toFund, tokensGenerated, _guaranteed);
        }

        uint256 toReturn = msg.value.sub(_toFund);
        if (toReturn > 0) {
            // If the call comes from the Token controller,
            // then we return it to the token Holder.
            // Otherwise we return to the sender.
            if (msg.sender == address(Climate)) {
                _th.transfer(toReturn);
            }
            else {
                msg.sender.transfer(toReturn);
            }
        }
    }

    // NOTE on Percentage format
    // Right now, Solidity does not support decimal numbers. (This will change very soon)
    //  So in this contract we use a representation of a percentage that consist in
    //  expressing the percentage in "x per 10**18"
    // This format has a precision of 16 digits for a percent.
    // Examples:
    //  3%   =   3*(10**16)
    //  100% = 100*(10**16) = 10**18
    //
    // To get a percentage of a value we do it by first multiplying it by the percentage in  (x per 10^18)
    //  and then divide it by 10**18
    //
    //              Y * X(in x per 10**18)
    //  X% of Y = -------------------------
    //               100(in x per 10**18)
    //


    /// @notice This method will can be called by the owner before the contribution period
    ///  end or by anybody after the `endBlock`. This method finalizes the contribution period
    ///  by creating the remaining tokens and transferring the controller to the configured
    ///  controller.
    function finalize() public initialized {
        require(getBlockNumber() >= startBlock);
        require(msg.sender == owner || getBlockNumber() > endBlock);
        require(finalizedBlock == 0);

        // Allow premature finalization if final limit is reached
        if (getBlockNumber() <= endBlock) {
            require(totalNormalCollected >= fundingLimit);
        }

        finalizedBlock = getBlockNumber();
        finalizedTime = now;

        uint256 percentageToDevs = percent(20);
        uint256 percentageToContributors = percent(51);
        uint256 percentageToReserve = percent(29);

        // Climate.totalSupply() -> Tokens minted during the contribution
        //  totalTokens  -> Total tokens that should be after the allocation
        //                   of devTokens and reserve
        //  percentageToContributors -> Which percentage should go to the
        //                               contribution participants
        //                               (x per 10**18 format)
        //  percent(100) -> 100% in (x per 10**18 format)
        //
        //                       percentageToContributors
        //  Climate.totalSupply() = -------------------------- * totalTokens  =>
        //                             percent(100)
        //
        //
        //                            percent(100)
        //  =>  totalTokens = ---------------------------- * Climate.totalSupply()
        //                      percentageToContributors
        //
        uint256 totalTokens = Climate.totalSupply().mul(percent(100)).div(percentageToContributors);

        //
        //                    percentageToReserve
        //  reserveTokens = ----------------------- * totalTokens
        //                      percentage(100)
        //
        assert(Climate.generateTokens(
        destTokensReserve,
        totalTokens.mul(percentageToReserve).div(percent(100))));

        //
        //                   percentageToDevs
        //  devTokens = ----------------------- * totalTokens
        //                   percentage(100)
        //
        assert(Climate.generateTokens(
        destTokensDevs,
        totalTokens.mul(percentageToDevs).div(percent(100))));

        Climate.changeController(climateController);

        Finalized();
    }

    function percent(uint256 p) internal returns (uint256) {
        return p.mul(10 ** 16);
    }

    /// @dev Internal function to determine if an address is a contract
    /// @param _addr The address being queried
    /// @return True if `_addr` is a contract
    function isContract(address _addr) constant internal returns (bool) {
        if (_addr == 0) return false;
        uint256 size;
        assembly {
        size := extcodesize(_addr)
        }
        return (size > 0);
    }


    //////////
    // Constant functions
    //////////

    /// @return Total tokens issued in weis.
    function tokensIssued() public constant returns (uint256) {
        return Climate.totalSupply();
    }

    /// @return Total Ether collected.
    function totalCollected() public constant returns (uint256) {
        return totalNormalCollected.add(totalGuaranteedCollected);
    }


    //////////
    // Testing specific methods
    //////////

    /// @notice This function is overridden by the test Mocks.
    function getBlockNumber() internal constant returns (uint256) {
        return block.number;
    }


    //////////
    // Safety Methods
    //////////

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    ///  set to 0 in case you want to extract ether.
    function claimTokens(address _token) public onlyOwner {
        if (Climate.controller() == address(this)) {
            Climate.claimTokens(_token);
        }
        if (_token == 0x0) {
            owner.transfer(this.balance);
            return;
        }

        ERC20Token token = ERC20Token(_token);
        uint256 balance = token.balanceOf(this);
        token.transfer(owner, balance);
        ClaimedTokens(_token, owner, balance);
    }


    /// @notice Pauses the contribution if there is any issue
    function pauseContribution() onlyOwner {
        paused = true;
    }

    /// @notice Resumes the contribution
    function resumeContribution() onlyOwner {
        paused = false;
    }

    event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);

    event NewSale(address indexed _th, uint256 _amount, uint256 _tokens, bool _guaranteed);

    event GuaranteedAddress(address indexed _th, uint256 _limit);

    event LogValue(uint256 amount);

    event Finalized();
}
