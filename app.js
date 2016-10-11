
require('dotenv').config()

var express = require('express');
var async = require('async');
var bodyParser = require('body-parser');
var mondo = require('mondo-bank');

var foursquareClientID = process.env["FOURSQUARE_CLIENT_ID"];
var foursquareClientSecret = process.env["FOURSQUARE_CLIENT_SECRET"];
var foursquareUserToken = process.env["FOURSQUARE_USER_TOKEN"];

var config = {
  'secrets' : {
    'clientId' : process.env["FOURSQUARE_CLIENT_ID"],
    'clientSecret' : process.env["FOURSQUARE_CLIENT_SECRET"],
    'accessToken' : process.env["FOURSQUARE_USER_TOKEN"],
    'redirectUrl': 'http://monzo.brokenbricks.org'
  }
}

var foursquare = require('node-foursquare')(config);

//var foursquare = require('node-foursquare')({ "client_id": foursquareClientID, "client_secret": foursquareClientSecret, "v": "20160123" });

var Venues = foursquare.Venues;

var app = express();
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send({"message": "Hello, world!"});
    return;
});

app.post('/hook', function (req, res) {
    var body = req.body;
    var type = body.type;
    var data = body.data;

    if (type != "transaction.created") {
        console.log("Unsupported event type:", type);
        res.send({"message":"Unsupported event type:", type});
        return;
    }

    var merchant = body.data.merchant;

    if (merchant.online) {
        console.log("Unsupported transaction: online."); res.send({"message":"Unsupported transaction: online."});
        return;
    }

    // if we have a foursquare id, great use that directly

    var address = merchant.address;

    var venue = false;

    if (merchant.metadata.foursquare_id) {

        foursquare.Venues.getVenue(merchant.metadata.foursquare_id, foursquareUserToken, function(error, data) {

            var beenHere = data.venue.beenHere;

            var icon = data.venue.categories[0].icon;
            var imageUrl = icon.prefix + '88' + icon.suffix;

            // /*
            //  beenHere:
            //   { count: 20,
            //     unconfirmedCount: 0,
            //     marked: true,
            //     lastVisitedAt: 1476107751,
            //     lastCheckinExpiredAt: 1476118551 }
            //     */

            // check been here before BUT not today / lastCheckinExpired
            if (beenHere.count > 0) {

                foursquare.Checkins.addCheckin(merchant.metadata.foursquare_id, {}, foursquareUserToken, function(error, data) {

                    if (error) {
                        console.log("Error posting to Swarm:", error);
                    } else {
                        console.log("Posted to Swarm:", merchant.name);
                        // create a feed item
                        // var params = {url: 'http://swarmapp.com/c/' + data.checkin.id}
                        createFeedItemPromise = mondo.createFeedItem({
                              account_id: process.env["MONZO_ACCOUNT_ID"],
                              params: {
                                title: "Checkin @ " + data.checkin.venue.name,
                                image_url: imageUrl
                              },
                              url: data.checkin.venue.canonicalUrl
                            }, process.env["MONZO_ACCESS_TOKEN"]);

                    }

                });

            }

        });

    }

    res.send({"message":"done"});
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('app listening on port:', port);
});
