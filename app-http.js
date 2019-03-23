require('dotenv').config();

const foursquare = require('./foursquare');

/* http setup */
var express = require('express');
var async = require('async');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
/* / http setup */

app.post('/checkin', function (req, res) {

    var body = req.body;

    foursquare.checkTransaction(body, function(response) {
        foursquare.postToSlack(response, function(response) {
          res.send(response);
        });
    });

});

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

/* start up the server */
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('monzo-squared listening on port:', port);
});
