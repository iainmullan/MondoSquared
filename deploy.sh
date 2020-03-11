#!/bin/bash

set -e

export AWS_DEFAULT_PROFILE=iainmullan

npm install --production

PACKAGE=latest.zip

zip -vr $PACKAGE app-lambda.js foursquare.js node_modules/

aws s3 cp $PACKAGE s3://brokenbricks-builds/monzo-squared/$PACKAGE
rm $PACKAGE

aws lambda update-function-code \
    --function-name monzo-squared \
    --s3-bucket brokenbricks-builds \
    --s3-key monzo-squared/$PACKAGE
