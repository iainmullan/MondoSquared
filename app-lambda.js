var foursquare = require('./foursquare');

exports.handler = function (event, context, callback) {

    var body = JSON.parse(event.body);

    foursquare.checkTransaction(body, function(message) {

        var response = {
            "statusCode": 200,
            "body": JSON.stringify(message),
            "isBase64Encoded": false
        };

        callback(null, response);
    });

};