pragma solidity ^0.4.11;

import '../ClimateContribution.sol';

// @dev ClimateContributionMock mocks current block number

contract ClimateContributionMock is ClimateContribution {

    function ClimateContributionMock() ClimateContribution() {}

    function getBlockNumber() internal constant returns (uint) {
        return mock_blockNumber;
    }

    function setMockedBlockNumber(uint _b) public {
        mock_blockNumber = _b;
    }

    uint mock_blockNumber = 1;
}
