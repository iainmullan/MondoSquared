# MonzoSquared

Originally forked from [MondoSquared](https://github.com/DanToml/MondoSquared), with the following updates:

 - config handled using [dotenv](https://www.npmjs.com/package/dotenv)
 - verifies the payload by comparing `account_id` with your config
 - uses `foursquare_id` directly, instead of fuzzy address matching
 - restrict checkins to 'been here before' and 'not been here today already'
 - extra endpoints for `/login` and `/fsq_callback` to help you get your user token
 - post to Slack with a webhook (optional)
 - AWS Lambda handler (`app-lambda.js`)

Automatically check in on Swarm when you spend money.

## Setup

	cp .env.example .env

Edit `.env` to include Foursquare API creds and Monzo account details

## Usage

	npm install
	node app-http.js

By default the app will run on `localhost:3000`. In this case the transactions should be `POST`ed to `http://localhost:3000/checkin`

Below is a minimal sample payload containing the data used by MonzoSquared. You can use this to test locally.

	{
		"type": "transaction.created",
		"data": {
			"account_id": "<your account id>"
			"merchant": {
				"online": false,
				"name": "Hackney Picturehouse",
				"metadata": {
					"foursquare_id": "4dc91970b0fbf26798c2c42c"
				}
			}
		}
	}


Create a webhook in your Monzo account with the URL the app is running on. Then get spending!


## Checkin criteria

Automatic checkin will happen if all the following are true:

 - The transaction payload received from Monzo contains a `foursquare_id`.
 - The venue is somehwere you've checked in to before.
 - You haven't checked in to this venue so far today (since midnight).


## AWS Lambda

It's also possible to run this as a Lambda function. Set the handler to `app-lambda.handler`. It needs a custom runtime for NodeJS v11, you can do this using Lambda Layers. I learned from [this guide](https://statsbot.co/blog/a-crash-course-on-serverless-with-aws-running-node11-on-lambda/). If you already know how to do layers, the one you need is `arn:aws:lambda:eu-west-2:553035198032:layer:nodejs11:12`.

Include the following in your deployment package:
 - `app-lambda.js`
 - `foursquare.js`
 - `node_modules/`

Remember to set your environment variables accordingly in Lambda too.
