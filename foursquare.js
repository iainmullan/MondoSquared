var foursquareUserToken = process.env["FOURSQUARE_USER_TOKEN"];
var foursquareConfig = {
  'secrets' : {
    'clientId' : process.env["FOURSQUARE_CLIENT_ID"],
    'clientSecret' : process.env["FOURSQUARE_CLIENT_SECRET"],
    'redirectUrl' : process.env["FOURSQUARE_REDIRECT_URI"]
  }
};
var foursquareApi = require('node-foursquare')(foursquareConfig);

var response = {
    message: "(none)"
};

exports.checkTransaction = function(body, callback) {

    var type = body.type;

    if (type != "transaction.created") {
        callback({"message":"Unsupported event type:" + type});
        return;
    }

    var tx = body.data;

    var myAccountId = process.env["MONZO_ACCOUNT_ID"];
    if (!myAccountId || (tx.account_id !== myAccountId)) {
        callback({"message": "Monzo Account ID does not match"});
        return;
    }

    var merchant = tx.merchant;

    if (merchant.online) {
        callback({"message":"Unsupported transaction: online"});
        return;
    }

    response.merchant = merchant.name

    // First we need a foursquare id
    if (merchant.metadata.foursquare_id) {

        console.log('getDetails for ' + merchant.metadata.foursquare_id);

        foursquareApi.Venues.getDetails(merchant.metadata.foursquare_id, {}, foursquareUserToken, function(error, fsqVenue) {

            console.log("Transaction detected at: " + merchant.name);

            /*
            // Foursquare response contains this block:
            beenHere: {
                count: 20,
                unconfirmedCount: 0,
                marked: true,
                lastVisitedAt: 1476107751,
                lastCheckinExpiredAt: 1476118551
            }
            */

            var beenHere = fsqVenue.venue.beenHere;

            // check been here before BUT not today / lastCheckinExpired
            if (beenHere.count > 0) {

                today = new Date();
                today.setHours(0);
                today.setMinutes(0);
                today.setSeconds(0);

                var lastVisit = new Date(beenHere.lastVisitedAt * 1000);

                if (lastVisit.getTime() < today.getTime()) {

                    // attempt checkin
                    foursquareApi.Checkins.add(merchant.metadata.foursquare_id, {}, foursquareUserToken, function(error, checkinResponse) {

                        if (error) {
                            response.message = "Error posting to Swarm";
                            response.error = error;
                            callback(response);
                        } else {
                            response.message = "Checked-in 👍";
                            callback(response);
                        }

                    });

                } else {
                    response.message = 'Already checked in here today, abort!';
                    callback(response);
                }

            } else {
                response.message = 'No previous checkins here, abort!';
                callback(response);
            }

        });

    } else {
        response.message = 'No foursquare ID available, abort!';
        callback(response);
    }

};
