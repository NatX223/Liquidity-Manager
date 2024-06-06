// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
interface IWETH {
    function deposit() external payable;
    function transfer(address dst, uint256 wad) external;
    function balanceOf(address owner) external returns(uint256);
    function withdraw(uint256 wad) external;
}

contract LiquidityManager is ERC20, Ownable {
    address public wethAddress;
    address public agentController;
    constructor(address _agentController, address _wethAddress) ERC20("LIQUIDITYMANAGER", "LQMN") Ownable(_agentController) {
        wethAddress = _wethAddress;
        agentController = _agentController;
    }

    function buy() external payable {
        require(msg.value > 0, "amount must be greater than 0");
        IWETH weth = IWETH(wethAddress);
        weth.deposit{value: msg.value}();
        uint256 balance = weth.balanceOf(msg.sender);
        weth.transfer(agentController, balance);
        _mint(msg.sender, balance);
    }

    function redeem() external {
        require(balanceOf(msg.sender) > 0, "low balance");
        uint256 userBal = balanceOf(msg.sender);
        _burn(msg.sender, balanceOf(msg.sender));
        IWETH weth = IWETH(wethAddress);
        weth.withdraw(userBal);

        payable(msg.sender).transfer(userBal);
    }
}