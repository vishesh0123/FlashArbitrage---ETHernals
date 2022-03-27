// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {FlashLoanReceiverBase} from "@aave/protocol-v2/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import {ILendingPool} from "@aave/protocol-v2/contracts/interfaces/ILendingPool.sol";
import {ILendingPoolAddressesProvider} from "@aave/protocol-v2/contracts/interfaces/ILendingPoolAddressesProvider.sol";
import {IERC20} from "@aave/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

interface IChi is IERC20 {
    function mint(uint256 value) external;

    function free(uint256 value) external returns (uint256 freed);

    function freeFromUpTo(address from, uint256 value)
        external
        returns (uint256 freed);
}

interface IGasDiscountExtension {
    function calculateGas(
        uint256 gasUsed,
        uint256 flags,
        uint256 calldataLength
    ) external view returns (IChi, uint256);
}

interface IAggregationExecutor is IGasDiscountExtension {
    /// @notice Make calls on `msgSender` with specified data
    function callBytes(address msgSender, bytes calldata data) external payable; // 0x2636f7f8
}

interface AggregationRouterV4 {
    struct SwapDescription {
        IERC20 srcToken;
        IERC20 dstToken;
        address payable srcReceiver;
        address payable dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
        bytes permit;
    }

    function swap(
        IAggregationExecutor caller,
        SwapDescription calldata desc,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 gasLeft);
}

contract FlashLoan is FlashLoanReceiverBase {
    address public owner;

    constructor(address provider)
        public
        FlashLoanReceiverBase(ILendingPoolAddressesProvider(provider))
    {
        owner = msg.sender;
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        //ROUTER
        AggregationRouterV4 router = AggregationRouterV4(
            0x1111111254fb6c44bAC0beD2854e76F90643097d
        );

        //STEP 1 USDT TO DAI (USDT ---> DAI)
        (
            IAggregationExecutor a1,
            AggregationRouterV4.SwapDescription memory b1,
            bytes memory c1
        ) = abi.decode(
                decodeparams(params, 1),
                (
                    IAggregationExecutor,
                    AggregationRouterV4.SwapDescription,
                    bytes
                )
            );
        b1.dstReceiver = payable(address(this));
        router.swap(a1, b1, c1);

        //STEP 2 WMATIC TO USDT (MATIC-FEE ------> USDT)
        (a1, b1, c1) = abi.decode(
            decodeparams(params, 2),
            (IAggregationExecutor, AggregationRouterV4.SwapDescription, bytes)
        );
        b1.dstReceiver = payable(address(this));
        router.swap(a1, b1, c1);

        //STEP 3 USDT --------> WMATIC
        (a1, b1, c1) = abi.decode(
            decodeparams(params, 3),
            (IAggregationExecutor, AggregationRouterV4.SwapDescription, bytes)
        );
        b1.dstReceiver = payable(address(this));

        b1.amount =
            IERC20(0xc2132D05D31c914a87C6611C10748AEb04B58e8F).balanceOf(
                address(this)
            ) -
            amounts[0] -
            premiums[0];
        router.swap(a1, b1, c1); // DAI +MATIC REMAINED

        //STEP 4 DAI ----> MATIC , PROFIT MATIC - MATICLOAN - PREMIUM
        (a1, b1, c1) = abi.decode(
            decodeparams(params, 4),
            (IAggregationExecutor, AggregationRouterV4.SwapDescription, bytes)
        );
        b1.dstReceiver = payable(address(this));

        b1.amount = IERC20(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063)
            .balanceOf(address(this));
        router.swap(a1, b1, c1);

        //Approve
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 amountOwing = amounts[i].add(premiums[i]);
            IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        }

        return true;
    }

    function decodeparams(bytes calldata params, uint256 step)
        public
        pure
        returns (bytes memory p)
    {
        (bytes memory a, bytes memory b, bytes memory c, bytes memory d) = abi
            .decode(params, (bytes, bytes, bytes, bytes));

        if (step == 1) {
            return a;
        }
        if (step == 2) {
            return b;
        }
        if (step == 3) {
            return c;
        }
        if (step == 4) {
            return d;
        }
    }

    function flashloancall(uint256[] calldata amount, bytes calldata parameters)
        public
        onlyowner
    {
        address receiverAddress = address(this);
        address onBehalfOf = address(this);
        uint16 referralCode = 0;

        address[] memory assets = new address[](2);
        assets[0] = address(0xc2132D05D31c914a87C6611C10748AEb04B58e8F);
        assets[1] = address(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amount[0];
        amounts[1] = amount[1];

        uint256[] memory modes = new uint256[](2);
        modes[0] = 0;
        modes[1] = 0;

        bytes memory params = parameters;

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    function withdraw(address token, address to)
        public
        onlyowner
        returns (bool)
    {
        IERC20 payer = IERC20(token);
        uint256 amount = payer.balanceOf(address(this));
        payer.transfer(to, amount);
    }

    function approve(
        address token,
        address to,
        uint256 amount
    ) public onlyowner {
        IERC20 token = IERC20(token);
        token.approve(to, amount);
    }

    modifier onlyowner() {
        require(msg.sender == owner);
        _;
    }
}
