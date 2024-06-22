pragma solidity ^0.5.0;

contract PostSpace {
    struct Space {
        string picture;
        string location;
        uint price;
        uint availability;
        address owner;
    }

    struct Review {
        address reviewer;
        string name;
        string description;
    }

    Space[] public spaces;
    mapping(uint => Review[]) public reviews; // Map each space to an array of its reviews

    event SpacePosted(string picture, string location, uint price, uint availability, address indexed owner);
    event BookingStatus(uint index, bool success);

    function postspace(string memory _picture, string memory _location, uint _price, uint _availability) public {
        spaces.push(Space(_picture, _location, _price, _availability, msg.sender));
        emit SpacePosted(_picture, _location, _price, _availability, msg.sender);
    }

    function getSpace(uint index) public view returns (string memory, string memory, uint, uint, address) {
        require(index < spaces.length, "Index out of bounds");
        Space memory space = spaces[index];
        return (space.picture, space.location, space.price, space.availability, space.owner);
    }

    function getSpaceCount() public view returns (uint) {
        return spaces.length;
    }
    
    function bookSpace(uint index) public {
        bool success = true;
        if(index >= spaces.length) {
            success = false;
        } else if(spaces[index].availability <= 0) {
            success = false;
        } else if(spaces[index].owner == msg.sender) {
            success = false;
        } else {
            spaces[index].availability -= 1 ;  // Mark as booked
        }
        emit BookingStatus(index, success);
    }

    function addReview(uint index, string memory name, string memory description) public {
        require(index < spaces.length, "Index out of bounds");
        reviews[index].push(Review(msg.sender, name, description));
    }

    function getReview(uint spaceIndex, uint reviewIndex) public view returns (address, string memory, string memory) {
        require(spaceIndex < spaces.length, "Space index out of bounds");
        require(reviewIndex < reviews[spaceIndex].length, "Review index out of bounds");
        Review memory review = reviews[spaceIndex][reviewIndex];
        return (review.reviewer, review.name, review.description);
    }

    function getReviewCount(uint index) public view returns (uint) {
        require(index < spaces.length, "Index out of bounds");
        return reviews[index].length;
    }
}
