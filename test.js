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

    destinations_db.insert({destinations, date: now, id: id, departure: 'EIN', index: {month: '01'}});
    
    destinations.forEach(function(element) {
      
      var counter = 0;
      
      function myFunction(element, counter) {
      
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
                  
                  if (Skyscanner_data.Quotes.length > 0) {

                  resolve(flight_data)
                  } else {
                    
                    counter++
                    console.log(counter);
                    
                  if (counter <= 3) {
                  setTimeout(function(){
                    myFunction(element, counter);
                  }, 5000);
                  }
                    
                  }

                } else {
                  
                    counter++
                  console.log(element)
                  
                  if (counter <= 3) {
                  setTimeout(function(){
                    myFunction(element, counter);
                  }, 5000);
                  }

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
                
                var airline = flight_data['2'].Carriers.filter(obj => {
                  return obj.CarrierId === element.OutboundLeg.CarrierIds['0'];
                })

                var airline_name = airline['0'].Name;
                
                if (airline_name === "Kartika Airlines") {
                  airline_name = "Wizz Air";
                }

                var flight_obj = {
                  price: element.MinPrice,
                  direct: element.Direct,
                  carrier: {
                    id: element.OutboundLeg.CarrierIds['0'],
                    name: airline_name
                  },
                  departure: element.OutboundLeg.DepartureDate
                }
                
                                if (flight_obj.price <= 15) {
                console.log(flight_obj);
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
      
      myFunction(element, counter);
      
    });
    
      setTimeout(function(){
        
                      Whatsappclient.messages.create({
                        body: 'De tien goedkoopste enkele vluchten vanaf Eindhoven (EIN) worden verzameld. Een ogenblik geduld...',
                        from: 'whatsapp:+14155238886',
                        to: 'whatsapp:+31634948646'
                      }).then(message => console.log(message.sid))
                      .done();
        
        destinations_db.findOne({departure: 'EIN'}).then((doc) => {
          
          if (doc) {
            
            var cheapest_flights = [];
            
            doc.destinations.forEach(function(element_destination) {
              
              var destination = element_destination.iata;
              
              if (typeof element_destination.flights != "undefined") {
              
                element_destination.flights.forEach(function(element) {

                  var flight = {
                    from: 'EIN',
                    to: destination,
                    city: element_destination.city,
                    price: element.price,
                    direct: element.direct,
                    carrier: element.carrier.name,
                    departure: element.departure
                  }
                  
                  cheapest_flights.push(flight);

                });
                
              }
              
            });
            
            
            cheapest_flights.sort((a, b) => a.price - b.price);
              
            var cheapest_fares = [];
            
            cheapest_flights.forEach(function(element) {
            
              if (cheapest_fares.some(e => e.city === element.city)) {

                objIndex = cheapest_fares.findIndex((obj => obj.city === element.city));

                if (element.price == cheapest_fares[objIndex].price && element.carrier === cheapest_fares[objIndex].carrier) {
                  cheapest_fares[objIndex].departures.push({departure: element.departure})
                }

              } else {

                var fare = {
                  city: element.city,
                  iata: element.to,
                  price: element.price,
                  direct: element.direct,
                  carrier: element.carrier,
                  departures: [{departure: element.departure}]
                }

                cheapest_fares.push(fare)
              }
              
            });
            
            var cheapest_fares_list = [];
            
            var counter = 0;
            
            cheapest_fares.forEach(function(element) {
              
                 counter++

                if (counter <= 10) {
                  
                  if (element.departures.length > 1) {
                    
                    var length_counter = 1;
              
                    var last_but_one = element.departures.length - 1;
                    
                    var date_text = ""
                    
                    if (element.departures.length == 2) {
                      
                      element.departures.forEach(function(departure) {

                        var date = dateFormat(departure.departure, "dd-mm-yyyy");

                        if (length_counter == 1) {
                          date_text += date + ' en ';
                        } else {
                          date_text += date;
                        }

                        length_counter++

                      });
                      
                    } else {
                    
                      element.departures.forEach(function(departure) {

                        var date = dateFormat(departure.departure, "dd-mm-yyyy");

                        if (length_counter == 1) {
                          date_text += date + ', ';
                        } else if (length_counter == last_but_one) {
                          date_text += date + ' en ';
                        } else if (length_counter == element.departures.length) {
                          date_text += date;
                        }

                        length_counter++

                      });
                      
                    }
                    
                    Whatsappclient.messages.create({
                      body: 'Voor ' + element.price + ' euro vlieg je vanaf Eindhoven (EIN) naar ' + element.city + ' (' + element.iata + ') en vertrekt op ' + date_text + '. Deze vluchten worden uitgevoerd door ' + element.carrier + '.',
                      from: 'whatsapp:+14155238886',
                      to: 'whatsapp:+31634948646'
                    }).then(message => console.log(message.sid))
                    .done();
                    
                  } else {
                    
                    element.departures.forEach(function(departure) {
                      
                      var date = dateFormat(departure.departure, "dd-mm-yyyy");

                      Whatsappclient.messages.create({
                        body: 'Voor ' + element.price + ' euro vlieg je vanaf Eindhoven (EIN) naar ' + element.city + ' (' + element.iata + ') en vertrekt op ' + date + '. Deze vlucht wordt uitgevoerd door ' + element.carrier + '.',
                        from: 'whatsapp:+14155238886',
                        to: 'whatsapp:+31634948646'
                      }).then(message => console.log(message.sid))
                      .done();

                    });
                    
                  }
                  
                  cheapest_fares_list.push(element);
                  
                }
              
            });
            
            console.log(cheapest_fares_list);
            
            destinations_db.update({departure: "EIN"}, { $set: {cheapest: cheapest_fares_list} });
            
          } else {
            
          }
        
        })
        
      }, 60000);

  });
  
}