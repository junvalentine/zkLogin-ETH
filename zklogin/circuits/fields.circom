pragma circom 2.1.6;

include "./utils.circom";
include "./constants.circom";

template extractNonce(maxPayloadLength, maxNonceLength) {
    signal input payload[maxPayloadLength];
    signal input nonceKeyStartIndex;
    signal input nonceLength;

    signal output nonce;

    // verify nonce key
    var nonceKeyLength = NONCE_KEY_LENGTH();
    var nonceKey[nonceKeyLength] = NONCE_KEY();
    signal nonceKeyMatch[nonceKeyLength] <== revealSubstring(maxPayloadLength, nonceKeyLength)(payload, nonceKeyStartIndex, nonceKeyLength);
    for (var i = 0; i < nonceKeyLength; i++) {
        nonceKeyMatch[i] === nonceKey[i];
    }

    // Extract nonce, ignore "
    signal nonceStartIndex <== nonceKeyStartIndex + nonceKeyLength + 1;
    signal nonceMatch[maxNonceLength] <== revealSubstring(maxPayloadLength, maxNonceLength)(payload, nonceStartIndex, nonceLength);
    nonce <== strToInt(maxNonceLength)(nonceMatch, nonceLength);
}

template extractSub(maxPayloadLength, maxSubLength) {
    signal input payload[maxPayloadLength];
    signal input subKeyStartIndex;
    signal input subLength;

    signal output sub;

    // Verify if the key `sub` in the payload is unique
    var subKeyLength = SUB_KEY_LENGTH();
    var subKey[subKeyLength] = SUB_KEY();
    signal subKeyMatch[subKeyLength] <== revealSubstring(maxPayloadLength, subKeyLength)(payload, subKeyStartIndex, subKeyLength);
    for (var i = 0; i < subKeyLength; i++) {
        subKeyMatch[i] === subKey[i];
    }

    // Extract sub
    signal subStartIndex <== subKeyStartIndex + subKeyLength + 1;
    signal subMatch[maxSubLength] <== revealSubstring(maxPayloadLength, maxSubLength)(payload, subStartIndex, subLength);
    sub <== strToInt(maxSubLength)(subMatch ,subLength);

}

template extractIss(maxPayloadLength, maxIssLength) {
    signal input payload[maxPayloadLength];
    signal input issKeyStartIndex;
    signal input issLength;

    signal output iss;

    // Verify if the key `iss` in the payload is unique
    var issKeyLength = ISS_KEY_LENGTH();
    var issKey[issKeyLength] = ISS_KEY();
    signal issKeyMatch[issKeyLength] <== revealSubstring(maxPayloadLength, issKeyLength)(payload, issKeyStartIndex, issKeyLength);
    for (var i = 0; i < issKeyLength; i++) {
        issKeyMatch[i] === issKey[i];
    }

    // Extract iss
    signal issStartIndex <== issKeyStartIndex + issKeyLength + 1;
    signal issMatch[maxIssLength] <== revealSubstring(maxPayloadLength, maxIssLength)(payload, issStartIndex, issLength);
    iss <== bytesToLong(maxIssLength)(issMatch, issLength);
}

template extractAud(maxPayloadLength, maxAudLength) {
    signal input payload[maxPayloadLength];
    signal input audKeyStartIndex;
    signal input audLength;

    signal output aud;

    // Verify if the key `aud` in the payload is unique
    var audKeyLength = AUD_KEY_LENGTH();
    var audKey[audKeyLength] = AUD_KEY();
    signal audKeyMatch[audKeyLength] <== revealSubstring(maxPayloadLength, audKeyLength)(payload, audKeyStartIndex, audKeyLength);
    for (var i = 0; i < audKeyLength; i++) {
        audKeyMatch[i] === audKey[i];
    }

    // Extract iss
    signal audStartIndex <== audKeyStartIndex + audKeyLength + 1;
    signal audMatch[maxAudLength] <== revealSubstring(maxPayloadLength, maxAudLength)(payload, audStartIndex, audLength);
    aud <== bytesToLong(maxAudLength)(audMatch, audLength);
}