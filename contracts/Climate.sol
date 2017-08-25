pragma solidity ^0.4.11;

import "./MiniMeToken.sol";

contract Climate is MiniMeToken {
    // @dev Climate constructor just parametrizes the MiniMeIrrevocableVestedToken constructor
    function Climate(address _tokenFactory)
            MiniMeToken(
                _tokenFactory,
                0x0,                     // no parent token
                0,                       // no snapshot block number from parent
                "Climatecoin",           // Token name
                18,                      // Decimals
                "CO2",                   // Symbol
                true                     // Enable transfers
            ) {}
}
