#!/usr/bin/env node

var childProcess = require('child_process');
var exec = childProcess.exec;
var spawn = childProcess.spawn
var AWS = require('aws-sdk');
var fs = require('fs');

var creds = fs.readFileSync(process.env.AWS_CREDENTIAL_FILE).toString('utf8').split('\n');

var key = creds[0].split('=')[1]
var secret = creds[1].split('=')[1]

if (!key || !secret)
  throw new Error('Missing AWS key or secret');

var applicationName = process.argv[2];
var environmentName = process.argv[3];

if (!applicationName || !environmentName)
  throw new Error('Missing application name or environment name!');

var region = process.argv[4] || 'eu-west-1';

AWS.config.update({
  accessKeyId: key,
  secretAccessKey: secret,
  region: region,
  endpoint: new AWS.Endpoint('https://elasticbeanstalk.' + region + '.amazonaws.com')
});

var eb = new AWS.ElasticBeanstalk({apiVersion: '2010-12-01'});


var namespace = 'aws:elasticbeanstalk:application:environment';

eb.describeConfigurationSettings({
  ApplicationName: applicationName,
  EnvironmentName: environmentName
},
  function(err, res) {
    if (err) throw new Error(err);

    var oldConfig = {}
    res.ConfigurationSettings[0].OptionSettings.every(function(setting) {
      if (setting.Namespace === namespace) {
        if (oldConfig[setting.OptionName])
          throw new Error('Param listed twice');

        var value;
        try {
          value = JSON.parse(setting.Value);
        } catch (e) {
          value = setting.Value;
        }

        oldConfig[setting.OptionName] = value;
      }
      return true
    });

    var filename = '.ebconfig.txt';
    fs.writeFileSync(filename, JSON.stringify(oldConfig, null, '\t'));

    process.stdin.pause()

    var editor = process.env.EDITOR || 'vi';
    var edit = spawn(editor, [filename], {stdio: 'inherit'});

    edit.on('exit', function() {
      function exit(e) {
        exec('rm -rf ' + filename)
        if (e)
          throw new Error(e);
      }

      try {
        var newConfig = JSON.parse(fs.readFileSync(filename).toString('utf8'));
      } catch (e) {
        console.log('Could not parse JSON :(')
        exit(e);
      }

      var optionSettings = [];
      var optionsToRemove = [];
      for (key in newConfig) {
        var value = newConfig[key];
        if (typeof value !== "string")
          value = JSON.stringify(value);

        optionSettings.push({
          Namespace: namespace,
          OptionName: key,
          Value: value
        });
      }

      // Remove key if it was present in the old config but not in the new
      for (key in oldConfig) {
        if (typeof newConfig[key] === 'undefined') {
          optionsToRemove.push({
            Namespace:namespace,
            OptionName: key
          });
        }
      }


      eb.updateEnvironment({
        EnvironmentName: environmentName,
        OptionSettings: optionSettings,
        OptionsToRemove: optionsToRemove
      }, function(err, res) {
        if (err) {
          console.log('Error :(');
          exit(err);
        }

        console.log('Update started. Ciao!');
        exit();
      });
    });
});
