
require('dotenv').config();

var express = require('express');
var async = require('async');
var bodyParser = require('body-parser');

var foursquareUserToken = process.env["FOURSQUARE_USER_TOKEN"];

var foursquareConfig = {
  'secrets' : {
    'clientId' : process.env["FOURSQUARE_CLIENT_ID"],
    'clientSecret' : process.env["FOURSQUARE_CLIENT_SECRET"],
    'redirectUrl' : process.env["FOURSQUARE_REDIRECT_URI"]
  }
};

var foursquare = require('node-foursquare')(foursquareConfig);

var app = express();
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send({"message": "Hello, world!"});
    return;
});

app.get('/login', function (req, res) {
    res.redirect('https://foursquare.com/oauth2/authenticate?' +
        'client_id=' + foursquareConfig.secrets.clientId +
        '&response_type=code' +
        '&redirect_uri=' + foursquareConfig.secrets.redirectUrl
        )
});

app.get('/fsq_callback', function (req, res) {
    var code = req.query['code'];

    foursquare.getAccessToken(
      {
        code,
      },
      (error, accessToken) => {
        if (error) {
          res.send(`An error was thrown: ${error.message}`);
        } else if (!accessToken) {
          res.send(`No access token was provided`);
        } else {
          // Save access token and continue.
          res.send(accessToken);
          foursquareUserToken = accessToken;
        }
      });

});

app.post('/checkin', function (req, res) {

    var body = req.body;
    var type = body.type;
    var data = body.data;

    var myAccountId = process.env["MONZO_ACCOUNT_ID"];
    if (!myAccountId || (data.account_id !== myAccountId)) {
        res.send({"message": "Monzo Account ID does not match"});
        return;
    }

    if (type != "transaction.created") {
        console.log("Unsupported event type:", type);
        res.send({"message":"Unsupported event type:" + type});
        return;
    }

    var merchant = data.merchant;

    if (merchant.online) {
        console.log("Unsupported transaction: online");
        res.send({"message":"Unsupported transaction: online"});
        return;
    }

    // First we need a foursquare id
    if (merchant.metadata.foursquare_id) {

        console.log('getDetails for ' + merchant.metadata.foursquare_id);

        foursquare.Venues.getDetails(merchant.metadata.foursquare_id, {}, foursquareUserToken, function(error, data) {

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

            var beenHere = data.venue.beenHere;

            // check been here before BUT not today / lastCheckinExpired
            if (beenHere.count > 0) {

                today = new Date();
                today.setHours(0);
                today.setMinutes(0);
                today.setSeconds(0);

                var lastVisit = new Date(beenHere.lastVisitedAt * 1000);

                if (lastVisit.getTime() < today.getTime()) {

                    // attempt checkin
                    foursquare.Checkins.add(merchant.metadata.foursquare_id, {}, foursquareUserToken, function(error, data) {

                        if (error) {
                            console.log("Error posting to Swarm:", error);
                        } else {
                            console.log("Posted to Swarm:", merchant.name);

                            if (process.env["MONZO_ACCESS_TOKEN"]) {

                                // now create a Monzo feed item
                                var icon = data.checkin.venue.categories[0].icon;
                                var imageUrl = icon.prefix + '88' + icon.suffix;

                                var feedParams = {
                                    account_id: process.env["MONZO_ACCOUNT_ID"],
                                    params: {
                                        title: "Checked in @ " + data.checkin.venue.name,
                                        image_url: imageUrl
                                    },
                                    url: 'https://foursquare.com/v/' + data.checkin.venue.id
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

    res.send({"message":"done"});
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('app listening on port:', port);
});
