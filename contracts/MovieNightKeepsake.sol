// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Resolved automatically by Remix (OpenZeppelin Contracts v5).
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MovieNightKeepsake
 * @notice A permanent, on-chain memory of a Pelli movie night.
 *
 * Minting writes the night — the film, who watched, when, and the reaction they
 * shared most — immutably into contract storage and issues an ERC-721 whose
 * metadata is built entirely on-chain (a base64 data URI). There is no off-chain
 * server or IPFS pin that can rot: the keepsake is the chain.
 *
 * This is the only place Pelli touches the blockchain. The core experience
 * (rooms, sync, chat) never depends on it.
 */
contract MovieNightKeepsake is ERC721 {
    using Strings for uint256;

    struct MovieNight {
        string title;
        string[] participants;
        uint64 watchedAt; // unix seconds
        string topReaction; // an emoji
        address mintedBy;
    }

    uint256 private _nextId = 1;
    mapping(uint256 => MovieNight) private _nights;

    event MovieNightMinted(
        uint256 indexed tokenId,
        address indexed mintedBy,
        string title,
        uint64 watchedAt
    );

    constructor() ERC721("Pelli Movie Night", "PELLI") {}

    /**
     * @notice Mint a keepsake of one movie night.
     * @param to           Who receives the token (usually the connected wallet).
     * @param title        The film's title.
     * @param participants Display names of everyone who watched.
     * @param watchedAt    When the night happened (unix seconds).
     * @param topReaction  The most-used reaction emoji of the night.
     * @return tokenId     The new keepsake's id.
     */
    function mintMovieNight(
        address to,
        string calldata title,
        string[] calldata participants,
        uint64 watchedAt,
        string calldata topReaction
    ) external returns (uint256 tokenId) {
        require(to != address(0), "to is zero address");
        require(bytes(title).length > 0, "title required");

        tokenId = _nextId++;
        _nights[tokenId] = MovieNight({
            title: title,
            participants: participants,
            watchedAt: watchedAt,
            topReaction: topReaction,
            mintedBy: msg.sender
        });

        _safeMint(to, tokenId);
        emit MovieNightMinted(tokenId, msg.sender, title, watchedAt);
    }

    /// @notice The stored record for a keepsake.
    function getMovieNight(uint256 tokenId) external view returns (MovieNight memory) {
        _requireOwned(tokenId);
        return _nights[tokenId];
    }

    /// @notice How many keepsakes have been minted.
    function totalMinted() external view returns (uint256) {
        return _nextId - 1;
    }

    /// @notice Fully on-chain metadata as a base64 JSON data URI.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        MovieNight memory n = _nights[tokenId];

        bytes memory json = abi.encodePacked(
            '{"name":"Pelli Movie Night - ',
            _escape(n.title),
            '","description":"A movie night watched together on Pelli, kept forever on Monad.",',
            '"attributes":[',
            '{"trait_type":"Film","value":"',
            _escape(n.title),
            '"},',
            '{"trait_type":"Watched","display_type":"date","value":',
            uint256(n.watchedAt).toString(),
            "},",
            '{"trait_type":"Top reaction","value":"',
            n.topReaction,
            '"},',
            '{"trait_type":"Watched by","value":"',
            _joinParticipants(n.participants),
            '"}]}'
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(json)
                )
            );
    }

    function _joinParticipants(string[] memory parts)
        internal
        pure
        returns (string memory)
    {
        bytes memory out;
        for (uint256 i = 0; i < parts.length; i++) {
            out = i == 0
                ? abi.encodePacked(_escape(parts[i]))
                : abi.encodePacked(out, ", ", _escape(parts[i]));
        }
        return string(out);
    }

    /// @dev Minimal JSON escaping so a title with a quote can't break metadata.
    function _escape(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (c == '"' || c == "\\") {
                out = abi.encodePacked(out, "\\", c);
            } else {
                out = abi.encodePacked(out, c);
            }
        }
        return string(out);
    }
}
