pragma solidity ^0.4.11;

import '../ClimatePlaceHolder.sol';

// @dev ClimatePlaceHolderMock mocks current block number

contract ClimatePlaceHolderMock is ClimatePlaceHolder {

    uint mock_time;

    function ClimatePlaceHolderMock(address _owner, address _climate, address _contribution)
            ClimatePlaceHolder(_owner, _climate, _contribution) {
        mock_time = now;
    }

    function getTime() internal returns (uint) {
        return mock_time;
    }

    function setMockedTime(uint _t) public {
        mock_time = _t;
    }
}
