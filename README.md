# MonzoSquared

Automatically check in on Swarm when you spend money.

## Setup

	cp .env.example .env

Edit `.env` to include Foursquare API creds

## Usage

	npm install
	node app.js

By default the app will run on `localhost:3000`. In this case the transactions should be `POST`ed to `http://localhost:3000/hook`

Below is a minimal sample payload containing the data used by MonzoSquared. You can use this to test locally.

	{
		"type": "transaction.created",
		"data": {
			"merchant": {
				"online": false,
				"name": "Hackney Picturehouse",
				"metadata": {
					"foursquare_id": "4dc91970b0fbf26798c2c42c"
				}
			}
		}
	}
 

Create a webhook in your monzo account with the URL the app is running on. Then get spending!


## Checkin criteria

Automatic checkin will happen if all the following are true:

 - The transaction payload received from Monzo contains a `foursquare_id`.
 - The venue is somehwere you've checked in to before.
 - You haven't checked in to this venue so far today (since midnight).

