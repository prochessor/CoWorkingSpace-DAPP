App = {
  web3Provider: null,
  contracts: {},
  account: null, // Store the connected account
  storeAllSpaces: [],
  spaceAvailability: {},

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        // Get the first account
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        console.log(accounts);
        App.account = accounts[0];
      } catch (error) {
        console.error("User denied account access");
      }
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider("http://localhost:7545");
    }

    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('PostSpace.json', function (data) {
      var PostSpaceArtifact = data;
      App.contracts.PostSpace = TruffleContract(PostSpaceArtifact);
      App.contracts.PostSpace.setProvider(App.web3Provider);

      // Bind event for the form submission
      $("#postSpaceForm").on("submit", App.handlePostSpace);
      $("#searchButton").on("click", App.handleSearch);

      App.displayCoworkingSpaces();

      // Listen for the BookingStatus event
      App.contracts.PostSpace.deployed().then(function (instance) {
        instance.BookingStatus({}, { fromBlock: 0, toBlock: 'latest' }).watch(function (error, event) {
          if (error) {
            console.error("Error processing event:", error);
          } else {
            // Handle the event
            if (!event.args.success) {
              alert("Error booking space: Owner cannot book their own space");
            }
          }
        });
      });
    });

    return App.bindEvents();
  },

  handleBooking: async function (index, spaceRow) {

    // Get the space details
    App.contracts.PostSpace.deployed().then(function (instance) {
      return instance.getSpace(index);
    }).then(function (space) {
      // Check if the current user is the owner of the space
      if (space[4] === App.account) {
        alert("Error: Owner cannot book their own space");
      }
      // Check if the space is available
      else if (space[3] <= 0) {
        alert("Error: Space is not available");
      }
      else {
        // Proceed with the booking process
        App.contracts.PostSpace.deployed().then(function (instance) {
          return instance.bookSpace(index, {
            from: App.account
          });
        }).then(function (result) {
          // Update availability status
          App.spaceAvailability[index] = false;

          // Update the UI
          spaceRow.find(".review-btn").prop("disabled", true).text("Booked");
        }).catch(function (err) {
          console.error(err);
        });
      }
    }).catch(function (err) {
      console.error(err);
    });
  },

  handlePostSpace: function (event) {
    event.preventDefault();

    // Get form inputs
    const picture = $("#picture").val();
    const location = $("#location").val();
    const price = parseInt($("#price").val());
    const availability = parseInt($("#availability").val());

    App.contracts.PostSpace.deployed().then(function (instance) {
      return instance.postspace(picture, location, price, availability, {
        from: App.account // Use the connected account
      });
    }).then(function (result) {
      // Refresh the displayed coworking spaces
      App.displayCoworkingSpaces();
      console.log(App.storeAllSpaces);

    }).catch(function (err) {
      console.error(err);
    });
  },

  displayCoworkingSpaces: function () {
    $("#coworkingSpaces").empty();
    App.storeAllSpaces = [];
    App.contracts.PostSpace.deployed().then(function (instance) {
      return instance.getSpaceCount();
    }).then(function (spaceCount) {
      for (let i = 0; i < spaceCount; i++) {
        App.displayCoworkingSpace(i);
      }
    }).catch(function (err) {
      console.error(err);
    });
  },

  displayCoworkingSpace: function (index) {
    App.contracts.PostSpace.deployed().then(function (instance) {
      return instance.getSpace(index);
    }).then(function (space) {
      App.storeAllSpaces.push(space);

      const spaceRow = $("<div class='card'>");
      spaceRow.append(`<img src="${space[0]}" />`);
      spaceRow.append(`<p><strong>Location:</strong> ${space[1]}</p>`);
      spaceRow.append(`<p><strong>Price:</strong> ${space[2]}</p>`);
      spaceRow.append(`<p><strong>Availability:</strong> ${space[3]}</p>`);
      spaceRow.append(`<p class="Owner"><strong>Owner:</strong> ${space[4]}</p>`);

      // Create the booking button
      const bookButton = $("<button>")
        .addClass("btn btn-success")
        .text(App.spaceAvailability[index] === false ? "Booked" : "Book")
        .prop("disabled", App.spaceAvailability[index] === false)
        .on("click", function () {
          App.handleBooking(index, spaceRow);
        });

      // Append the button to the space card
      spaceRow.append(bookButton);

      const reviewButton = $("<button>")
        .addClass("btn btn-info")
        .text("Review")
        .on("click", function () {
          // Get the space details
          App.contracts.PostSpace.deployed().then(function (instance) {
            return instance.getSpace(index);
          }).then(function (space) {
            // Check if the current user is the owner of the space
            if (space[4] === App.account) {
              alert("Error: Owner cannot add reviews");
            } else {
              // Open a form for the user to enter their review
              const userName = prompt("Please enter your name:");
              const reviewDescription = prompt("Please enter your review:");

              // Add the review to the smart contract
              App.contracts.PostSpace.deployed().then(function (instance) {
                return instance.addReview(index, userName, reviewDescription, {
                  from: App.account
                });
              }).then(function (result) {
                // Refresh the displayed coworking spaces
                App.displayCoworkingSpaces();
              }).catch(function (err) {
                console.error(err);
              });
            }
          }).catch(function (err) {
            console.error(err);
          });
        });
      // Append the review button to the space card
      spaceRow.append(reviewButton);

      const displayReviewsButton = $("<button>")
        .addClass("btn btn-info review-btn")
        .text("Show Reviews")
        .on("click", function () {
          App.contracts.PostSpace.deployed().then(function (instance) {
            return instance.getReviewCount(index);
          }).then(function (reviewCount) {
            for (let i = 0; i < reviewCount; i++) {
              App.contracts.PostSpace.deployed().then(function (instance) {
                return instance.getReview(index, i);
              }).then(function (review) {
                var reviewer = review[0];
                var name = review[1];
                var description = review[2];

                alert("Review by " + name + ": " + description);
              }).catch(function (err) {
                console.error(err);
              });
            }
          }).catch(function (err) {
            console.error(err);
          });
        });


      // Append the "Display Reviews" button to the space card
      spaceRow.append(displayReviewsButton);
      // Append the space card to the DOM
      $("#coworkingSpaces").append(spaceRow);
    }).catch(function (err) {
      console.error(err);
    });
  },



  bindEvents: function () {
    $(window).on("load", App.init);
  },
  handleSearch: function (event) {
    event.preventDefault();
    // Append the space card to the DOM
    $("#search-results").empty()


    // Get the search term from the input form
    const searchTerm = $("#searchLocation").val().toLowerCase();

    App.contracts.PostSpace.deployed().then(function (instance) {
      return instance.getSpaceCount();
    }).then(function (spaceCount) {
      for (let i = 0; i < spaceCount; i++) {
        App.displayFilteredSpaces(i, searchTerm);
      }
    }).catch(function (err) {
      console.error(err);
    });
  },

  // Function to display a list of filtered coworking spaces
  // Function to display a list of filtered coworking spaces
  displayFilteredSpaces: function (index, searchTerm) {
    App.contracts.PostSpace.deployed().then(function (instance) {
      return instance.getSpace(index);
    }).then(function (space) {
      App.storeAllSpaces.push(space);
      console.log(space[1], searchTerm)
      if (space[1].toLowerCase() != searchTerm)
        return
      const spaceRow = $("<div class='card'>");
      spaceRow.append(`<img src="${space[0]}" />`);
      spaceRow.append(`<p><strong>Location:</strong> ${space[1]}</p>`);
      spaceRow.append(`<p><strong>Price:</strong> ${space[2]}</p>`);
      spaceRow.append(`<p><strong>Availability:</strong> ${space[3]}</p>`);
      spaceRow.append(`<p class="Owner"><strong>Owner:</strong> ${space[4]}</p>`);

      // Create the booking button
      const bookButton = $("<button>")
        .addClass("btn btn-success")
        .text(App.spaceAvailability[index] === false ? "Booked" : "Book")
        .prop("disabled", App.spaceAvailability[index] === false)
        .on("click", function () {
          App.handleBooking(index, spaceRow);
        });

      // Append the button to the space card
      spaceRow.append(bookButton);

      const reviewButton = $("<button>")
        .addClass("btn btn-info review-btn")
        .text("Review")
        .on("click", function () {
          // Get the space details
          App.contracts.PostSpace.deployed().then(function (instance) {
            return instance.getSpace(index);
          }).then(function (space) {
            // Check if the current user is the owner of the space
            if (space[4] === App.account) {
              alert("Error: Owner cannot add reviews");
            } else {
              // Open a form for the user to enter their review
              const userName = prompt("Please enter your name:");
              const reviewDescription = prompt("Please enter your review:");

              // Add the review to the smart contract
              App.contracts.PostSpace.deployed().then(function (instance) {
                return instance.addReview(index, userName, reviewDescription, {
                  from: App.account
                });
              }).then(function (result) {
                // Refresh the displayed coworking spaces
                App.displayCoworkingSpaces();
              }).catch(function (err) {
                console.error(err);
              });
            }
          }).catch(function (err) {
            console.error(err);
          });
        });
      // Append the review button to the space card
      spaceRow.append(reviewButton);

      const displayReviewsButton = $("<button>")
        .addClass("btn btn-info")
        .text("Show Reviews")
        .on("click", function () {
          App.contracts.PostSpace.deployed().then(function (instance) {
            return instance.getReviewCount(index);
          }).then(function (reviewCount) {
            for (let i = 0; i < reviewCount; i++) {
              App.contracts.PostSpace.deployed().then(function (instance) {
                return instance.getReview(index, i);
              }).then(function (review) {
                var reviewer = review[0];
                var name = review[1];
                var description = review[2];

                alert("Review by " + name + ": " + description);
              }).catch(function (err) {
                console.error(err);
              });
            }
          }).catch(function (err) {
            console.error(err);
          });
        });

      // Append the "Display Reviews" button to the space card
      spaceRow.append(displayReviewsButton);


      $("#search-results").append(spaceRow);
    }).catch(function (err) {
      console.error(err);
    });
  },

  // $("#postSpaceForm").on("submit", App.handlePostSpace);




}; SyntaxError

$(function () {
  App.init();
});
