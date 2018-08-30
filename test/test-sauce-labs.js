'use strict';

var testSauceLabs = require('test-saucelabs');

// https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities
var platforms = [{
  browserName: 'chrome',
  platform: 'OS X 10.11',
  version: '68.0'
},
{
  browserName: 'chrome',
  platform: 'Windows 10',
  version: '68.0'
}];

var url = 'http://localhost:3000/test/test.html';

testSauceLabs({
  urls: [{ name: "ir-reattach", url : url }],
  platforms: platforms
});
