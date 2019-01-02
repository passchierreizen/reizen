require('newrelic');
var express = require('express');
var router = express.Router();
const {Wit, log} = require('node-wit');
const client = new Wit({
  accessToken: 'AFG2MYMS3A6OHZZEBNHITEBICFECVLNP'
});
const accountSid = 'AC45e2557cc7d6e335cc8ffc89179cfd79';
const authToken = 'a05affcdf1f4cb6ec177180021d99245';
const Whatsappclient = require('twilio')(accountSid, authToken);
const db = require('monk')('mongodb://milanpasschier:detering1@ds143614.mlab.com:43614/reizen')
const flights_db = db.get('flights');
var request = require('request');
var randomstring = require("randomstring");
var dateFormat = require('dateformat');
var airports = require('airport-codes').toJSON();

/* GET home page. */
router.get('/', function(req, res, next) {
 
// var options = {
//   method: "GET",
//   url: 'https://api.schiphol.nl/public-flights/flights?app_id=e0bb7953&app_key=8bf24954136b8c5095f6aabc63057828',
//   headers: {
//     "resourceversion": "v3",
//     "content-type": "application/json",
//     "host": "api.schiphol.nl"
//   }
// };
 
// function callback(error, response, body) {
  
//   var data = JSON.parse(body);
  
  
//   data.flights.forEach(function(element) {
//   console.log(element);
// });
  
// }
 
// request(options, callback);
  
res.render('index', { title: 'Express' });
  
});

router.post('/reply', function(req, res, next) {
  
client.message(req.body.Body, {})
.then((data) => {
  
  if (data.entities.intent == null) {
    
    Whatsappclient.messages.create({
      body: 'Ik begrijp niet wat je bedoelt met je bericht "' + req.body.Body + '". Typ bijvoorbeeld eens "Zoek in maart naar een enkele vlucht van Eindhoven naar Edinburgh"',
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+31634948646'
    }).then(message => console.log(message.sid))
    .done();
    
  } else {
    
    if (data.entities.intent['0'].value === "one") {
      
      var date = dateFormat(data.entities.datetime['0'].value, "mm");

//       if (date == 12) {

//         date = "01";

//       } else {

//         date = Number(date) + 1;
        
//         if (date < 10) {
          
//           date = "0" + date
          
//         }

//       }
      
      var from = data.entities.location['0'].value;
      var to = data.entities.location['1'].value;
      
      var airport_from_obj = airports.filter(obj => {
        return obj.city === from;
      });
      
      var airport_to_obj = airports.filter(obj => {
        return obj.city === to;
      });
      
      var airport_from_iata = airport_from_obj['0'].iata;
      var airport_to_iata = airport_to_obj['0'].iata;

      Whatsappclient.messages.create({
        body: 'Ik ga zoeken naar de goedkoopste enkele vlucht van ' + from + ' (' + airport_from_iata + ') naar ' + to + ' (' + airport_to_iata + ') in maandnummer ' + date + '. Een ogenblik geduld...',
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+31634948646'
      }).then(message => console.log(message.sid))
      .done();
      
var flight_data = [];
  
var p1 = new Promise(function(resolve, reject) {   
  
  var options = {
    method: "GET",
    url: 'https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/NL/EUR/nl-NL/' + airport_from_iata + '-sky/' + airport_to_iata + '-sky/2019-' + date,
    headers: {
      "X-RapidAPI-Key": "9628f4a60dmsh95c58f1ac2489a4p1c7027jsn4af9bb3ba2c2",
      "content-type": "application/json",
    }
  };

  function callback(error, response, body) {

    var Skyscanner_data = JSON.parse(body);
    
    console.log(Skyscanner_data)
    
    var Quotes = Skyscanner_data.Quotes;
    Quotes.sort((a, b) => a.MinPrice - b.MinPrice);
    
    flight_data.push({Quotes: Quotes});
    flight_data.push({Places: Skyscanner_data.Places});
    flight_data.push({Carriers: Skyscanner_data.Carriers});
    flight_data.push({Currencies: Skyscanner_data.Currencies});
    
    resolve(flight_data)
    
  }

  request(options, callback);
  
});
  
p1.then(function(flight_data) {
  
  flight_data.push({flight_data_id: randomstring.generate(10)});
  
  var Outbound = flight_data['0'].Quotes['0'].OutboundLeg.DepartureDate;
  var date = dateFormat(Outbound, "dd-mm-yyyy");
  
  var price = flight_data['0'].Quotes['0'].MinPrice;
  
  var carrier_id = flight_data['0'].Quotes['0'].OutboundLeg.CarrierIds['0'];
  
  var airline = flight_data['2'].Carriers.filter(obj => {
    return obj.CarrierId === carrier_id;
  })
  
  var airline_name = airline['0'].Name;
  
  Whatsappclient.messages.create({
    body: 'De goedkoopste vlucht van ' + from + ' naar ' + to + ' kost ' + price + ' euro en vertrekt op ' + date + '. Deze vlucht wordt uitgevoerd door ' + airline_name + '. Deze vluchtinformatie is verstrekt via Skyscanner.',
    from: 'whatsapp:+14155238886',
    to: 'whatsapp:+31634948646'
  }).then(message => console.log(message.sid))
  .done();
  
});


    } else if (data.entities.intent['0'].value === "return") {

      Whatsappclient.messages.create({
        body: 'Ik ga zoeken naar de goedkoopste retourvlucht.',
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+31634948646'
      }).then(message => console.log(message.sid))
      .done();

    }

  }
  
})
.catch(console.error);
  
});

module.exports = router;
