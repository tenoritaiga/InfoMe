var http = require('http');
var $ = require('jquery');

var symbol1 = "LTC";
var symbol2 = "USD";

var combined = symbol1 + "_" + symbol2;

var url = 'http://www.cryptocoincharts.info/v2/api/tradingPair/' + combined;

http.get(url, function(res) {
    var body = '';

    res.on('data', function(chunk) {
        body += chunk;
    });

    res.on('end', function() {
        var response = JSON.parse(body)
        console.log("Got back: ", response.id + " " + response.price);
    });
}).on('error', function(e) {
        console.log("Got error: ", e);
    });