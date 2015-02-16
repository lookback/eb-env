install:

`npm install -g lookback/eb-env`

setup:

must export `AWS_CREDENTIAL_FILE` pointing to a file with
```
AWSAccessKeyId=key
AWSSecretKey=secret
```
(same as eb CLI uses)

run:

`eb-env applicationName environmentName region`

applicationName and environmentName are required. region is optional and defaults to eu-west-1

[list or regions](http://docs.aws.amazon.com/general/latest/gr/rande.html#elasticbeanstalk_region)

using $EDITOR or vi for editing.
