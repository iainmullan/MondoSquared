var foursquareUserToken = process.env["FOURSQUARE_USER_TOKEN"];
var foursquareConfig = {
  'secrets' : {
    'clientId' : process.env["FOURSQUARE_CLIENT_ID"],
    'clientSecret' : process.env["FOURSQUARE_CLIENT_SECRET"],
    'redirectUrl' : process.env["FOURSQUARE_REDIRECT_URI"]
  }
};
var foursquareApi = require('node-foursquare')(foursquareConfig);

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
                            console.log("Error posting to Swarm:", error);
                        } else {
                            console.log("Posted to Swarm:", merchant.name);

                            if (process.env["MONZO_ACCESS_TOKEN"]) {

                                // now create a Monzo feed item
                                var icon = checkinResponse.checkin.venue.categories[0].icon;
                                var imageUrl = icon.prefix + '88' + icon.suffix;

                                var feedParams = {
                                    account_id: process.env["MONZO_ACCOUNT_ID"],
                                    params: {
                                        title: "Checked in @ " + checkinResponse.checkin.venue.name,
                                        image_url: imageUrl
                                    },
                                    url: 'https://foursquare.com/v/' + checkinResponse.checkin.venue.id
                                };

                                var mondo = require('monzo-bank');
                                mondo.createFeedItem(feedParams, process.env["MONZO_ACCESS_TOKEN"], function(err, value) {
                                    if (err) {
                                        console.log('Error publishing feed item');
                                        console.log(err);
                                    } else {
                                        console.log('Feed item has published');
                                    }
                                });

                            } else {
                                console.log('Monzo token not configured, skip feed item');
                            }

                        }

                    });

                } else {
                    console.log('Already checked in here today, abort!');
                }

            } else {
                console.log('No previous checkins here, abort!');
            }

        });

    } else {
        console.log('No foursquare ID available, abort!');
    }

    callback({"message":"done"});
};
