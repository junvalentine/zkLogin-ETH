// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../core/BaseAccount.sol";
import "../core/Helpers.sol";
import "./callback/TokenCallbackHandler.sol";
import "./verifier.sol";
import "hardhat/console.sol";

/**
  * minimal account.
  *  this is sample minimal account.
  *  has execute, eth handling methods
  *  has a single signer that can send requests through the entryPoint.
  */
contract WalletContract is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable, Groth16Verifier {
    address public owner;
    // Groth16Verifier public verifier;
    uint256 zkaddr;

    IEntryPoint private immutable _entryPoint;

    event WalletContractInitialized(IEntryPoint indexed entryPoint, address indexed owner);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        // verifier = new Groth16Verifier();
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(msg.sender == owner || msg.sender == address(this), "only owner");
    }

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     * @param dest destination address to call
     * @param value the value to pass in this call
     * @param func the calldata to pass in this call
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }
    
    /**
     * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
     * a new implementation of WalletContract must be deployed with the new EntryPoint address, then upgrading
      * the implementation by calling `upgradeTo()`
      * @param anOwner the owner (signer) of this account
     */
    function initialize(address anOwner, uint256 salt) public virtual initializer {
        _initialize(anOwner);
        zkaddr = salt;
    }

    function _initialize(address anOwner) internal virtual {
        owner = anOwner;
        emit WalletContractInitialized(_entryPoint, owner);
    }

    // Require the function call went through EntryPoint or owner
    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == owner, "account: not Owner or EntryPoint");
    }

    /// implement template method of BaseAccount
    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
    internal override virtual returns (uint256 validationData) {
        // Parse signature
        (   uint[2] memory _pA, uint[2][2] memory _pB, 
            uint[2] memory _pC, uint[39] memory _pubSignals,
            bytes memory txSignature
        ) = abi.decode(
            userOp.signature,
            (uint[2], uint[2][2], uint[2], uint[39], bytes)
        );
        // Verify the ZK proof
        require(this.verifyProof(_pA, _pB, _pC, _pubSignals), "ZK proof verification failed");
        // Verify the public signals
        address _owner = verifyPubSignal(_pubSignals);
        
        // verify tx signature
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        // change owner, owner actually useless in this contract i think xD, just that i havent fully understand the whole erc to be confident to delete it.
        if (owner != ECDSA.recover(hash, txSignature)){
            if (_owner == ECDSA.recover(hash, txSignature)){
                owner = _owner;
            }
            else{
                return SIG_VALIDATION_FAILED;
            }
        }
        return SIG_VALIDATION_SUCCESS;
    }
    // Verify the public signals
    function verifyPubSignal(uint[39] memory _pubSignals) public view returns (address) {
        require(_pubSignals[0] == 42970254204555295091989521912744459954085180073481505391157407597, "Invalid issuer");
        // require(_pubSignals[1] == zkaddr, "Invalid address");
        // 2 -> 33 are pubOP, not use 
        // require(_pubSignals[34] < block.timestamp, "Expired proof");

        uint256 publicKeyX = _pubSignals[35]*(2**128) + _pubSignals[36];
        uint256 publicKeyY = _pubSignals[37]*(2**128) + _pubSignals[38];
        // Calculate Ethereum address from public key
        // First, we need to hash the public key using keccak256
        bytes32 pubKeyHash = keccak256(abi.encodePacked(publicKeyX, publicKeyY));
        // Then take the last 20 bytes to get the address
        address calculatedAddress = address(uint160(uint256(pubKeyHash)));
        return calculatedAddress; 
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyOwner();
    }
}

