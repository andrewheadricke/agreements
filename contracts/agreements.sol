pragma solidity ^0.5.1;

contract Agreements {

    struct userStruct {
        uint128 contested;
        uint128 successful;
        uint blockFirstAgreement;
        bytes32 profileHash;
        bytes32 rolloverHash;
        uint lastUsedNonce;
        uint activeAgreementId;
    }

    struct agreementStruct {
        address u1;
        address u2;
        uint blockAgreementCreated;
        uint blockAgreementConfirmed;
        uint blockAgreementEnded;
        bytes32 meta; // ipfs hash meta data like location, duration, agreement type etc
        uint8 successOrContested; // 0 = null, 1 = success, 2 = contested

        bool u1_ack;
        bool u2_ack;

        bytes32 u1_caseHash;
        bytes32 u2_caseHash;
    }

    mapping (address => userStruct) users;
    agreementStruct[] agreements;

    event AgreementConfirmed(uint indexed agreementIdx, address indexed u1, address indexed u2);

    constructor() public {
        agreements.length++;
    }

    function agreementCount() public view returns (uint) {
        return agreements.length - 1;
    }

    function getAgreementDetails(uint agreementIdx) public view returns (
            address u1,
            address u2,
            uint blockAgreementCreated,
            uint blockAgreementConfirmed,
            uint blockAgreementEnded,
            bytes32 meta,
            uint8 successOrContested,

            bool u1_ack,
            bool u2_ack,

            bytes32 u1_caseHash,
            bytes32 u2_caseHash
        ) {

        u1 = agreements[agreementIdx].u1;
        u2 = agreements[agreementIdx].u2;
        blockAgreementCreated = agreements[agreementIdx].blockAgreementCreated;
        blockAgreementConfirmed = agreements[agreementIdx].blockAgreementConfirmed;
        blockAgreementEnded = agreements[agreementIdx].blockAgreementEnded;
        meta = agreements[agreementIdx].meta;
        successOrContested = agreements[agreementIdx].successOrContested;
        u1_ack = agreements[agreementIdx].u1_ack;
        u2_ack = agreements[agreementIdx].u2_ack;
        u1_caseHash = agreements[agreementIdx].u1_caseHash;
        u2_caseHash = agreements[agreementIdx].u2_caseHash;
    }

    function getUserDetails(address a) public view returns (
            uint successful, 
            uint contested, 
            uint blockFirstAgreement, 
            bytes32 profileHash, 
            bytes32 rolloverHash,
            uint activeAgreementId
        ) {

        successful = users[a].successful;
        contested = users[a].contested;
        blockFirstAgreement = users[a].blockFirstAgreement;
        profileHash = users[a].profileHash;
        rolloverHash = users[a].rolloverHash;
        activeAgreementId = users[a].activeAgreementId;
    }

    function updateProfile(uint nonce, bytes32 profileHash, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 agreementHash = keccak256(abi.encodePacked("Agreement:UpdateProfile:", nonce));

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, agreementHash));
        address a = ecrecover(prefixedHash, v, r, s);

        if (users[a].lastUsedNonce + 1 != nonce)
            revert();

        users[a].profileHash = profileHash;
        users[a].lastUsedNonce = nonce;
    }

    function startAgreement(address u1, address u2, bytes32 meta) public {

        if (users[u1].rolloverHash != 0x00) 
            revert();
        if (users[u2].rolloverHash != 0x00) 
            revert();

        uint idx = agreements.length++;
        agreements[idx].u1 = u1;
        agreements[idx].u2 = u2;
        agreements[idx].blockAgreementCreated = block.number;
        agreements[idx].meta = meta;
    }

    function confirmAgreement(uint agreementIdx, uint8 v, bytes32 r, bytes32 s) public {

        if (agreementIdx == 0) revert();

        bytes32 agreementHash = keccak256(abi.encodePacked("Agreement:Start:", agreementIdx));

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, agreementHash));
        address a = ecrecover(prefixedHash, v, r, s);

        if (agreements[agreementIdx].u1 == a) {
            if (users[agreements[agreementIdx].u1].activeAgreementId > 0) revert();
            agreements[agreementIdx].u1_ack = true;
        } else if (agreements[agreementIdx].u2 == a) {
            if (users[agreements[agreementIdx].u2].activeAgreementId > 0) revert();
            agreements[agreementIdx].u2_ack = true;
        } else {
            revert();
        }

        users[a].blockFirstAgreement = block.number;

        if (agreements[agreementIdx].blockAgreementConfirmed == 0 && agreements[agreementIdx].u1_ack && agreements[agreementIdx].u2_ack) {

            agreements[agreementIdx].blockAgreementConfirmed = block.number;

            users[agreements[agreementIdx].u1].activeAgreementId = agreementIdx;
            users[agreements[agreementIdx].u2].activeAgreementId = agreementIdx;

            emit AgreementConfirmed(agreementIdx, agreements[agreementIdx].u1, agreements[agreementIdx].u2);

            agreements[agreementIdx].u1_ack = false;
            agreements[agreementIdx].u2_ack = false;
        }
    }

    function endAgreementSuccess(uint agreementIdx, uint8 v, bytes32 r, bytes32 s) public {

        if (agreementIdx == 0) revert();

        bytes32 agreementHash = keccak256(abi.encodePacked("Agreement:End:", agreementIdx));

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, agreementHash));
        address a = ecrecover(prefixedHash, v, r, s);

        if (agreements[agreementIdx].successOrContested == 2 || agreements[agreementIdx].blockAgreementEnded > 0) 
            revert();

        if (agreements[agreementIdx].u1 == a && agreements[agreementIdx].u1_ack == false) {
            agreements[agreementIdx].u1_ack = true;
            users[agreements[agreementIdx].u1].successful++;    
        } else if (agreements[agreementIdx].u2 == a && agreements[agreementIdx].u2_ack == false) {
            agreements[agreementIdx].u2_ack = true;
            users[agreements[agreementIdx].u2].successful++;
        } else {
            revert();
        }

        if (agreements[agreementIdx].u1_ack && agreements[agreementIdx].u2_ack) {
            agreements[agreementIdx].blockAgreementEnded = block.number;
            agreements[agreementIdx].successOrContested = 1;

            users[agreements[agreementIdx].u1].activeAgreementId = 0;
            users[agreements[agreementIdx].u2].activeAgreementId = 0;
        }
            
    }

    function endAgreementContested(uint agreementIdx, bytes32 caseHash, uint8 v, bytes32 r, bytes32 s) public {

        if (agreementIdx == 0) revert();
        
        // this can be called multiple times so each party can add their case

        bytes32 agreementHash = keccak256(abi.encodePacked("Agreement:End:", agreementIdx));

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, agreementHash));
        address a = ecrecover(prefixedHash, v, r, s);

        if (agreements[agreementIdx].successOrContested != 2) {
            agreements[agreementIdx].successOrContested = 2;
            // increment the contested count for each party
            users[agreements[agreementIdx].u1].contested++;
            users[agreements[agreementIdx].u2].contested++;

            agreements[agreementIdx].blockAgreementEnded = block.number;

            if (agreements[agreementIdx].u1_ack)
                users[agreements[agreementIdx].u1].successful--;
            if (agreements[agreementIdx].u2_ack)
                users[agreements[agreementIdx].u2].successful--;
        }

        users[agreements[agreementIdx].u1].activeAgreementId = 0;
        users[agreements[agreementIdx].u2].activeAgreementId = 0;

        if (agreements[agreementIdx].u1 == a && agreements[agreementIdx].u1_caseHash == 0x00) {
            agreements[agreementIdx].u1_caseHash = caseHash;
        } else if (agreements[agreementIdx].u2 == a && agreements[agreementIdx].u2_caseHash == 0x00) {
            agreements[agreementIdx].u2_caseHash = caseHash;
        } else {
            revert();
        }

    }

    function rolloverAccount(bytes32 newAccountHash, uint8 v, bytes32 r, bytes32 s) public {

        bytes32 rolloverStringHash = keccak256(abi.encodePacked("Agreement:Rollover"));

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 rolloverHash = keccak256(abi.encodePacked(prefix, rolloverStringHash));
        address a = ecrecover(rolloverHash, v, r, s);

        // rollover not allowed if in an agreement
        if (users[a].activeAgreementId > 0) revert();

        if (users[a].blockFirstAgreement != 0 && users[a].rolloverHash == 0x00) {
            users[a].rolloverHash = newAccountHash;
        } else {
            revert();
        }

    }

}