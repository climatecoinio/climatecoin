pragma solidity ^0.4.11;

import '../Climate.sol';

// @dev ClimateMock mocks current block number

contract ClimateMock is Climate {

    function ClimateMock(address _tokenFactory) Climate(_tokenFactory) {}

    function getBlockNumber() internal constant returns (uint) {
        return mock_blockNumber;
    }

    function setMockedBlockNumber(uint _b) public {
        mock_blockNumber = _b;
    }

    uint mock_blockNumber = 1;
}
