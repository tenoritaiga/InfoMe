#!/usr/bin/env node

var GroupMe = require('../../index');
var sh = require('execSync');
var Wunderground = require('wundergroundnode');
var API = GroupMe.Stateless;
var $ = require('jquery');

const ACCESS_TOKEN = "";	//GroupMe API key
const USER_ID  = "";		//GroupMe User ID (numeric)
const BOT_NAME = "";		//Bot name (string)
const bot_id = "";		//Bot ID (numeric)
const WUNDERGROUND_KEY = "";	//WeatherUnderground API key
const MW_KEY = "";		//Merriam-Webster's API key

var retryCount = 3;
var wunderground = new Wunderground(WUNDERGROUND_KEY);

var Dictionary = require('mw-dictionary'),
		      
		      //pass the constructor a config object with your key
		      dict = new Dictionary({
			key: MW_KEY
		      });

function getDefinition(term)
{
  var dfd = new $.Deferred();
  
    dict.define(term, function(error, result){
      var dictdef = "";
      if(result != undefined)
      {
	try
	{
	  for(var i=0; i<result.length; i++){
	    dictdef += i+".\n"+
	    "Part of speech: "+result[i].partOfSpeech+"\n"+
	    "Definitions: "+result[i].definition+"\n"+
	    result[i].definition;
	}
	}
	
	catch(TypeError)
	{
	  API.Bots.post(ACCESS_TOKEN,bot_id,
			"There was a problem connecting to the dictionary.",
		 {},
		 function(err,res) {
		   if (err) {
		     console.log("[API.Bots.post] Reply Message Error!");
		   } else {
		     console.log("[API.Bots.post] Reply Message Sent!");
		   }});
		     return;
	}
      }
      else
      {
	console.log("FAIL!");
      }
	dfd.resolve(dictdef);
    });
    return dfd.promise();
}

function getWeather(zipcode)
{
  var dfd = new $.Deferred();
  
  wunderground.conditions().forecast().request(zipcode, function(err, response){
    
    var forecasttext = "";
    
    try{
      for(var i = 0; i <= 7; i++){
	forecasttext +=
	  response.forecast.txt_forecast.forecastday[i].title +
	  ": " +
	  response.forecast.txt_forecast.forecastday[i].fcttext
	  + " ";
	i++;	//skip nighttime data
      }
    }
    catch(TypeError){
      console.log("Error: Area code must be a number!");
      API.Bots.post(ACCESS_TOKEN,bot_id,
	"Can't look up weather for that area - please enter a valid zip code.",
	{},
	function(err,res) {
	  if (err) {
	    console.log("[API.Bots.post] Reply Message Error!");
	  } else {
	    console.log("[API.Bots.post] Reply Message Sent!");
	  }});
      return;
    }
    
    var threeday =
    "It's currently " +
    response.current_observation.temp_f +
    " degrees in " +
    response.current_observation.display_location.city +
    ", " +
    response.current_observation.display_location.state +
    ". " +
    forecasttext;
					       
    //console.log("got result from async weather api: " + threeday);
					       
					       
    dfd.resolve(threeday);
  });
  
  return dfd.promise();
}

function getDateTime() {
  
  var date = new Date();
  var weekday=new Array(7);
  
  weekday[0]="Sunday";
  weekday[1]="Monday";
  weekday[2]="Tuesday";
  weekday[3]="Wednesday";
  weekday[4]="Thursday";
  weekday[5]="Friday";
  weekday[6]="Saturday";
  
  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;
  
  var min  = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;
  
  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;
  
  var year = date.getFullYear();
  
  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;
  
  var day  = date.getDate();
  day = (day < 10 ? "0" : "") + day;
  
  var n = weekday[date.getDay()];
  
  return "Today is " + n + " " + month + "/" + day + " " + year + " and the current time is " +
  hour + ":" + min + ":" + sec + " EST";
}

function isItTuesday()
{
  var date = new Date();
  if(date.getDay() == 2)
  {
    return "Yes.";
  }
  return "No.";
}

function sleep(ms) {
  var start = new Date().getTime(), expire = start + ms;
  while (new Date().getTime() < expire) { }
  return;
}


//SplitArgs function, courtesy of https://github.com/Parent5446/web-bash
$.splitArgs = function( txt ) {    
  var cmd = "",
  split_text = [],
  inQuote = false,
  inDoubleQuote = false,
  backslash = false;
  
  if(txt == undefined) {
    return [];
  }
  
  for ( var i = 0; i < txt.length; i++ ) {
    if ( txt[i] === ' ' && ( inQuote || inDoubleQuote ) ) {
      cmd += txt[i];
    } else if ( txt[i] === ' ' && !( inQuote || inDoubleQuote ) ) {
      if ( cmd.length > 0 ) {
	split_text.push(cmd);
	cmd = "";
      }
      continue;
    } else if ( txt[i] === '\\' ) {
      if ( backslash || inQuote ) {
	cmd += '\\';
	backslash = false;
      } else {
	backslash = true;
      }
    } else if ( txt[i] === '\'' ) {
      if ( backslash ) {
	cmd += '\'';
	backslash = false;
      } else if ( inDoubleQuote ) {
	cmd += '\'';
      } else {
	inQuote = !inQuote;
      }
    } else if ( txt[i] === '\"' ) {
      if ( backslash ) {
	cmd += '\"';
	backslash = false;
      } else if ( inQuote ) {
	cmd += '\"';
      } else {
	inDoubleQuote = !inDoubleQuote;
      }
    } else if ( txt[i] === '$' && inQuote ) {
      cmd += '\\$';
    } else {
      cmd += txt[i];
      backslash = false;
    }
  }
  
  cmd = $.trim( cmd );
  if ( cmd !== '' ) {
    split_text.push( cmd );
  }
  
  return split_text;
};

// IncomingStream constructor

var incoming = new GroupMe.IncomingStream(ACCESS_TOKEN, USER_ID, null);

// Log IncomingStream status to terminal
incoming.on('status', function() {
  var args = Array.prototype.slice.call(arguments);
  var str = args.shift();
  console.log("[IncomingStream 'status']", str, args);
});

// Wait for messages on IncomingStream

incoming.on('message', function(msg) {
  console.log("[IncomingStream 'message'] Message Received");
  
  if(msg["data"] 
    && msg["data"]["subject"] 
    && msg["data"]["subject"]["text"]) {
    var message = $.splitArgs(""+msg["data"]["subject"]["text"]);
    if(message[0] == "@weather")
    {
      if (bot_id && msg["data"]["subject"]["name"] != "Kris") {
	$.when( getWeather(message[1]) ).then(
	  function( status ) {
	    API.Bots.post(
	      ACCESS_TOKEN, // Identify the access token
	      bot_id, // Identify the bot that is sending the message
	      status,
	      {}, // No pictures related to this post
	      function(err,res) {
		if (err) {
		  console.log("[API.Bots.post] Reply Message Error!");
		} else {
		  console.log("[API.Bots.post] Reply Message Sent!");
		}});
	  },
	  function( status ) {
	  },
	  function( status ) {
	  });
      }
    }
      if(message[0] == "@time")
      {
	if (bot_id && msg["data"]["subject"]["name"] != "BOT") {
	  API.Bots.post(ACCESS_TOKEN,bot_id,getDateTime(),{},
		 function(err,res) {
		   if (err) {
		     console.log("[API.Bots.post] Reply Message Error!");
		   } else {
		     console.log("[API.Bots.post] Reply Message Sent!");
		   }});
	}
      }
      if(message[0] == "@fortune")
      {
	    sleep(3000);
	    API.Bots.post(ACCESS_TOKEN,bot_id,
			  sh.exec('fortune -s').stdout,
			  {},
			  function(err,res) {
			    if (err) {
			      console.log("[API.Bots.post] Reply Message Error!");
			    } else {
			      console.log("[API.Bots.post] Reply Message Sent!");
			    }});
      }
      
      if(message[0] == "@coretemp")
      {
	  sleep(1000);
	  API.Bots.post(ACCESS_TOKEN,bot_id,
			sh.exec('sensors | grep "CPU Temperature"').stdout,
			{},
		 function(err,res) {
		   if (err) {
		     console.log("[API.Bots.post] Reply Message Error!");
		   } else {
		     console.log("[API.Bots.post] Reply Message Sent!");
		   }});
      }
      
      if(message[0] == "@help")
      {
	  sleep(1000);
	  API.Bots.post(ACCESS_TOKEN,bot_id,
	"List of current commands:\n" +
	"@time - prints the current time and date.\n" +
	"@weather <zip code> - prints the weather for the specified area.\n" +
	"@fortune - prints a short quote or witticism\n" +
	"@coretemp - prints CPU temp\n" +
	"@isittuesday - exactly what it sounds like\n" +
	"@help - prints this help message.",
			{},
		 function(err,res) {
		   if (err) {
		     console.log("[API.Bots.post] Reply Message Error!");
		   } else {
		     console.log("[API.Bots.post] Reply Message Sent!");
		   }});
      }
      
      if(message[0] == "@isittuesday" && message.length == 1)
      {
	sleep(1000);
	API.Bots.post(ACCESS_TOKEN,bot_id,
		      isItTuesday(),
		      {},
	       function(err,res) {
		 if (err) {
		   console.log("[API.Bots.post] Reply Message Error!");
		 } else {
		   console.log("[API.Bots.post] Reply Message Sent!");
		 }});
      }
      
      if(message[0] == "@define")
      {
	if(message.length == 1 || message.length > 2)
	{
	  API.Bots.post(ACCESS_TOKEN,bot_id,
			"Please provide a single word to define.",
		 {},
		 function(err,res) {
		   if (err) {
		     console.log("[API.Bots.post] Reply Message Error!");
		   } else {
		     console.log("[API.Bots.post] Reply Message Sent!");
		   }});
	  
	}
	else
	{
	  sleep(1000);
	  $.when( getDefinition(message[1]) ).then(
	    function( status ) {
	      API.Bots.post(
		ACCESS_TOKEN, // Identify the access token
		bot_id, // Identify the bot that is sending the message
		status,
		{}, // No pictures related to this post
		function(err,res) {
		  if (err) {
		    console.log("[API.Bots.post] Reply Message Error!");
		  } else {
		    console.log("[API.Bots.post] Reply Message Sent!");
		  }});
	    },
	    function( status ) {
	    },
	    function( status ) {
	    });
	}
      }
    }
    
});

//Listen for bot disconnect
incoming.on('disconnected', function() {
  console.log("[IncomingStream 'disconnect']");
  if (retryCount > 3) {
    retryCount = retryCount - 1;
    incoming.connect();
  }
})

//Listen for errors on IncomingStream
incoming.on('error', function() {
  var args = Array.prototype.slice.call(arguments);
  console.log("[IncomingStream 'error']", args);
  if (retryCount > 3) {
    retryCount = retryCount - 1;
    incoming.connect();    
  }
})


//Start connection process
incoming.connect();
