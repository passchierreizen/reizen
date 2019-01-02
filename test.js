const {Wit, log} = require('node-wit');
const client = new Wit({
  accessToken: 'AFG2MYMS3A6OHZZEBNHITEBICFECVLNP'
});
const accountSid = 'AC45e2557cc7d6e335cc8ffc89179cfd79';
const authToken = 'a05affcdf1f4cb6ec177180021d99245';
const Whatsappclient = require('twilio')(accountSid, authToken);
const db = require('monk')('mongodb://milanpasschier:detering1@ds143614.mlab.com:43614/reizen')
const flights_db = db.get('flights');
const destinations_db = db.get('destinations');
const iata_db = db.get('iata');
var request = require('request');
var randomstring = require("randomstring");
var dateFormat = require('dateformat');
var airports = require('airport-codes').toJSON();
const cheerio = require('cheerio');
var now = new Date();

destinations_db.findOne({departure: 'EIN'}).then((doc) => {
    
  var departure = 'EIN';
  
  if (doc) {
    
    destinations_db.findOneAndDelete({departure: 'EIN'}).then((doc) => {})
    
    myFunction(departure)
    
    
  } else {
    
    myFunction(departure)
    
  }
  
})

function myFunction(departure) {

  var p1 = new Promise(function(resolve, reject) {

    var destinations = [];

    var options = {
      method: "GET",
      url: 'https://www.eindhovenairport.nl/en/destinations'
    };

    function callback(error, response, body) {

      var $ = cheerio.load(body);

      $('div.destination').each(function(i, elem) {

        var destination = {};

        var destination_city = $(this).text().trim();
        destination.city = destination_city;

        var destination_obj = airports.filter(obj => {
          return obj.city === destination_city;
        });

        var destination_iata = "";

        if (typeof destination_obj['0'] === "undefined") {
          destination_iata = "undefined";
        } else {
          destination_iata = destination_obj['0'].iata;
        }

        if (destination_iata === "") {
          destination_iata = "undefined";
        }
        
        iata_db.findOne({city: destination.city}).then((doc) => {

          if (doc) {
            
            destination.iata = doc.iata;

        destinations.push(destination);
          } else {
            destination.iata = destination_iata;
            iata_db.insert(destination);
            destinations.push({city: destination.city, iata: destination_iata});
          }

        });

      });
      
      setTimeout(function(){
        resolve(destinations);
      }, 5000);

    }

    request(options, callback);

  });

  p1.then(function(destinations) {

    var id =  randomstring.generate(10);

    destinations_db.insert({destinations, date: now, id: id, departure: 'EIN'});
    
    destinations.forEach(function(element) {
      
      function myFunction(element) {
      
        if (element.iata != "undefined") {

          var flight_data = [];

          var p1 = new Promise(function(resolve, reject) {

            var options = {
              method: "GET",
              url: 'https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/NL/EUR/nl-NL/EIN-sky/' + element.iata + '-sky/2019-01',
              headers: {
                "X-RapidAPI-Key": "9628f4a60dmsh95c58f1ac2489a4p1c7027jsn4af9bb3ba2c2",
                "content-type": "application/json",
              }
            };

            function callback(error, response, body) {

              if (error) {

                console.log(error);

              } else {

                var Skyscanner_data = JSON.parse(body);

                if (typeof Skyscanner_data.ValidationErrors === "undefined") {

                  var Quotes = Skyscanner_data.Quotes;
                  Quotes.sort((a, b) => a.MinPrice - b.MinPrice);

                  flight_data.push({Quotes: Quotes});
                  flight_data.push({Places: Skyscanner_data.Places});
                  flight_data.push({Carriers: Skyscanner_data.Carriers});
                  flight_data.push({Currencies: Skyscanner_data.Currencies});
                  flight_data.push({iata: element.iata});

                  resolve(flight_data)

                } else {
                  
                  console.log(element);
                  
                  setTimeout(function(){
                    myFunction(element);
                  }, 5000);

                }

              }

            }

            request(options, callback);

          });

          p1.then(function(flight_data) {

            var flights = [];

            if (typeof flight_data['4'] != "undefined") {

            var flights_counter = 0;

              flight_data['0'].Quotes.forEach(function(element) {

                var flight_obj = {
                  price: element.MinPrice,
                  direct: element.Direct,
                  carrier: {
                    id: element.OutboundLeg.CarrierIds['0']
                  },
                  departure: element.OutboundLeg.DepartureDate
                }

                  flights_counter++

                if (flights_counter <= 10) {
                flights.push(flight_obj);
                }


              });

            destinations_db.update({departure: "EIN", "destinations.iata": flight_data['4'].iata}, { $set: {"destinations.$.flights": flights} });

            }

          });

        } else {
          console.log('undefined');
        }

      }
      
      myFunction(element);
      
    });

  });
  
}