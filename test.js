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
            
            if (typeof doc.edreams != "undefined") {
              destination.edreams = doc.edreams;
            }

        destinations.push(destination);
          } else {
            destination.iata = destination_iata;
            iata_db.insert(destination);
            destinations.push({city: destination.city, iata: destination_iata});
          }
          
//             var options = {
//               method: "GET",
//               url: 'http://www.mapquestapi.com/geocoding/v1/address?key=gPQc8rPNA7c5ZP9k6gfGGXAZA0xDIpQ8&location=' + destination.city
//             };

//             function callback(error, response, body) {
              
//               var result = JSON.parse(body);
              
//               var latLng = result.results['0'].locations['0'].latLng;
              
//               iata_db.update({"city": destination.city}, { $set: {latLng: latLng} });
              
//             }
          
//             request(options, callback);

        });

      });
      
      setTimeout(function(){
        resolve(destinations);
      }, 30000);

    }

    request(options, callback);

  });

  p1.then(function(destinations) {

    var id =  randomstring.generate(10);

    destinations_db.insert({destinations, date: now, id: id, departure: 'EIN', index: {month: '03'}});
    
    destinations.forEach(function(element) {
      
      var counter = 0;
      
      function myFunction(element, counter) {
      
        if (element.iata != "undefined") {

          var flight_data = [];

          var p1 = new Promise(function(resolve, reject) {

            var options = {
              method: "GET",
              url: 'https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/browsequotes/v1.0/NL/EUR/nl-NL/EIN-sky/' + element.iata + '-sky/2019-03',
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
                  
                  if (typeof element.edreams != "undefined") {

                    flight_data.push({edreams: element.edreams});

                  }
                  
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
                  
//                   if (element.departures.length > 1) {
                    
//                     var length_counter = 1;
              
//                     var last_but_one = element.departures.length - 1;
                    
//                     var date_text = ""
                    
//                     if (element.departures.length == 2) {
                      
//                       element.departures.forEach(function(departure) {

//                         var date = dateFormat(departure.departure, "dd-mm-yyyy");

//                         if (length_counter == 1) {
//                           date_text += date + ' en ';
//                         } else {
//                           date_text += date;
//                         }

//                         length_counter++

//                       });
                      
//                     } else {
                    
//                       element.departures.forEach(function(departure) {

//                         var date = dateFormat(departure.departure, "dd-mm-yyyy");

//                         if (length_counter == 1) {
//                           date_text += date + ', ';
//                         } else if (length_counter == last_but_one) {
//                           date_text += date + ' en ';
//                         } else if (length_counter == element.departures.length) {
//                           date_text += date;
//                         }

//                         length_counter++

//                       });
                      
//                     }
                    
//                     Whatsappclient.messages.create({
//                       body: 'Voor ' + element.price + ' euro vlieg je vanaf Eindhoven (EIN) naar ' + element.city + ' (' + element.iata + ') en vertrekt op ' + date_text + '. Deze vluchten worden uitgevoerd door ' + element.carrier + '.',
//                       from: 'whatsapp:+14155238886',
//                       to: 'whatsapp:+31634948646'
//                     }).then(message => console.log(message.sid))
//                     .done();
                    
//                   } else {
                    
//                     element.departures.forEach(function(departure) {
                      
//                       var date = dateFormat(departure.departure, "dd-mm-yyyy");

//                       Whatsappclient.messages.create({
//                         body: 'Voor ' + element.price + ' euro vlieg je vanaf Eindhoven (EIN) naar ' + element.city + ' (' + element.iata + ') en vertrekt op ' + date + '. Deze vlucht wordt uitgevoerd door ' + element.carrier + '.',
//                         from: 'whatsapp:+14155238886',
//                         to: 'whatsapp:+31634948646'
//                       }).then(message => console.log(message.sid))
//                       .done();

//                     });
                    
//                   }
                  

                
                element.departures.sort(function(a,b){
                  // Turn your strings into dates, and then subtract them
                  // to get a value that is either negative, positive, or zero.
                  return new Date(a.departure) - new Date(b.departure);
                });
                  
                  element.index = counter;
                  
                  cheapest_fares_list.push(element);
                  
                }
              
            });
            
            console.log(cheapest_fares_list);
            
            destinations_db.update({departure: "EIN"}, { $set: {cheapest: cheapest_fares_list} });
            
            destinations_db.findOne({departure: 'EIN', }).then((doc) => {

              var edreams = [];

              doc.cheapest.forEach(function(cheapest_element) {

                var edreams_obj = {
                  city: cheapest_element.city,
                  iata: cheapest_element.iata,
                  direct: cheapest_element.direct,
                  carrier: cheapest_element.carrier,
                  index: cheapest_element.index
                }

                iata_db.findOne({iata: edreams_obj.iata}).then((doc) => {
                  
                  edreams_obj.latLng = doc.latLng;

                  if (typeof doc.edreams != "undefined") {

                    var departures = [];

                    cheapest_element.departures.forEach(function(element) {

                      var date = dateFormat(element.departure, "yyyy-mm-dd");

                      request.post('https://nl.edreams.com/travel/service/flow/search', {
                        headers: {
                              "Host": "nl.edreams.com",
                              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:65.0) Gecko/20100101 Firefox/65.0",
                              "Accept": "application/json, text/javascript, */*; q=0.01",
                              "Accept-Language": "nl,en-US;q=0.7,en;q=0.3",
                              "Accept-Encoding": "gzip, deflate, br",
                              "Referer": "https://nl.edreams.com/travel/",
                              "X-Distil-Ajax": "exayydezc",
                              "Content-Type": "application/json",
                              "X-Requested-With": "XMLHttpRequest",
                              "Cookie": "ONE1JSESSIONID=5ufyo1CTJZV3DE-GNteW+ctH.bcn1-app-front-012p4; TS010aeccd=017fb7f60a63b7487c5ad18883ba2b93b613a8b465b735db2eccadcb5748f8ef29f00c340b315671c09556ae412dfa7cb9d0725c6f; AKA_A2=A; locale=nl_NL; userDevice=970d0d18-656a-4b90-805c-eca5940709e6; TestTokenSpace=1#3455-2#20612-3#4329-4#70653-5#946500-6#41483-7#44428-8#33495657639-9#40003891880-10#79031078918-11#24966552730-12#24679755488-13#27491261789-14#79506206585-15#33370234901-16#49805958893-17#77704982916-18#53029511461-19#54581358689-20#55896197379-21#59779226641-22#49587739674|08-02-2019.13:02; mktportal=KayakR; TS019e0659=017fb7f60a4d39d5ed03557cd57628ad3f171e0de0590e9fae42eaad666b19c29180397cab3db337bdb31ddce266779f878f0f2381; TS01a885bf=017fb7f60a4d39d5ed03557cd57628ad3f171e0de0590e9fae42eaad666b19c29180397cab3db337bdb31ddce266779f878f0f2381; tc_cj_v2=%28%20/%7B.%20%7B-%7D%23ZZZ%28*%28*%29%7E*%29%27ZZZKONSPLNJRLKRSZZZ%5Dfc%5De777%5Ecl_%5Dny%5B%5D%5D_mmZZZZZZKONSPLQMOPOLSZZZ%5D; ens_abcSplit=groupb; tCdebugLib=1; _ga=GA1.2.1119184272.1549624046; _gid=GA1.2.100766855.1549624046; D_IID=3D54D0F2-1877-3DE9-B60E-84BF57E41036; D_UID=55A65A45-3878-3A03-9441-6CDB0CEF6DEB; D_ZID=CF77C0FB-5BBD-3230-BEEE-28C6A3538FA7; D_ZUID=8514D94D-E13F-3482-BF53-FA29EE50D6AD; D_HID=45F2B081-AB62-3B20-96E6-73F672E5CB34; D_SID=143.179.3.15:tnfvX1nGc3FrqIF07Fnvz9iEszWcE+91c0FzzLWxmSE; G_ENABLED_IDPS=google; __utma=144834667.1119184272.1549624046.1549624049.1549624049.2; __utmc=144834667; __utmz=144834667.1549624049.1.1.utmcsr=momondonl|utmccn=EIN-STN|utmcmd=metasearch|utmctr=flight|utmcct=eFqGASpZFatsRwhqrNZiFA; cto_lwid=49141cb9-8425-43c8-9fd4-65c05cbe827c; bid_grY1NOtKhm4xhDV9rsny82DvKa1iYFBN=fc5327d8-766e-43f2-be34-04b2ae4bf711; UTM_user_id=ab364c8e-518b-4f99-a80f-c61f11f4e306; HOME1JSESSIONID=Zr8veJfwLmI6FB8unZadIiBM.bcn1-app-home-262p9; __gads=ID=b7dde5c48d877108:T=1549624083:S=ALNI_MZK6sZQVgVa588L9eFrEP3rWKY2HQ; CookiePolicyAccepted=1; _gat=1; _gaActiveSession=1; __utmb=144834667.4.6.1549627337472; comebackToNewHome=false; ADRUM=s=1549627337596&r=https%3A%2F%2Frentacar.edreams.com%2Fpartners%2Fintegrations%2Fstand-alone-app%2F%3F1724999543; viI=eJztlM9rHkUYx+cxsamKthQR9fSWLaGhzO78np3kFOz7ltA3b6RvYuC9yPbdyZtt3919s7tJ3ogUvPUg3gU9iTcP1UPPCuKpWCjouQchIi0oVo/ibN+0JqXtX+CyzMzO83w/zzMP+wzASdgo8qyyWYw3q3QosY2KeepzbfwbECRZbMf+lfJ3yO51bn10GgDBxWgvunrn0cSkpDfhdYDmUgd3V39EYFtbFxa7o14rqspLu5tbRaeXtL6D1FZR6eD9XyHN0zyL8+webAyTweYDhE7A3X9++u2vadifph4XUmLmMaIow9wTnBksPE2U5Fh6RihJCFaeoCLkWHtCCBbi0ONcGKmkVtxg4wlCCA8NDUOCKfG0IZwSXW9gSj0mjFJSMs2d1YUSShstpQidlXtMC0OZos4dUxfZSKJcNjKUmEoXh2vCXDBCMXVpmJBII8PQcEy1p7UmbosZqjANPckJM5JSoZyz8aSQIeUyVI7MiCdlaBQ12lUbM+pJo7VhTClBMWOOLEOtuVFafEhCTJiTUONTPk/YqwA//1+qp5UKPDgDn9z9c/9j/Nm3+7c/7c1Cc7vIRzZYjuIi+eVN+OHL66+8BV/dRy+WBcL9PPXzOBnY3N9JysR1wiDJrL9d2iIa2Kzy19xqsV5dtHto8sAL6FgPHd9NCju0ZdlGL8d2J+nb1b2RrdBs2zGDCTOYGGJb2X6VF8H5x34LbXQsLyeKs89RrHRbUZoM9w40L+Xle7YoE9ez6FT7SrQTBcMoGwTdqkiygXM4sf0o34muQueeQ1876uz0Jx/rD+JsoWtoajxC1wp05lCxjoL8/w52UCN0CqFxgV6rU/TrFP1mtp0eNo4qdPydleV311ablxx89tnwwzU4TKhTm6nQzPpS5/zKerdC05T4xLHmns164sRPwy2v9Jba7UWHU9IncBuW8w+S4TAK3Ffj7Lq7FPPdstFZbdTRFhpuQ4mFxrgeip35WjPXuGD7V/PANSxxL2203K+ykY+Dh0CjSUxi115KqgiLy4Zg1xh9bPuRNIJoYuxNoEL6wvjuHmbkxvW/P//ji6k34ME3M9D8Hjq3oLl253Q9Z8P3H46+jQsbpaXfz+/PAUxNDG+fc8vZKXdLU/o1pP5RP6iiy0NbPbH7L9fBrcc=; ONE1=!MDBbIda02hBrXYbu7CGVI2rS0Ip2HjApL6JJzDvXjxnX/4+DsA2aTi8eHIO2exapll1UImil7XLkkwE=",
                              "Connection": "keep-alive"
                        },
                        json: {
                         "itinerarySearchRequest": {
                            "type": "ONE_WAY",
                            "numAdults": 1,
                            "numChildren": 0,
                            "numInfants": 0,
                            "cabinClass": "TOURIST",
                            "mainAirportsOnly": false,
                            "directFlightsOnly": false,
                            "searchMainProductType": "FLIGHT",
                            "airlinesCodes": [],
                            "externalSelectionRequest": {},
                            "dynpackSearch": false,
                            "segmentRequests": [
                               {
                                  "dateStr": date,
                                  "date": date,
                                  "departure": {
                                     "iata": "EIN",
                                     "name": "Eindhoven",
                                     "geoNodeId": 2558,
                                     "type": "CITY"
                                  },
                                  "destination": {
                                     "geoNodeId": doc.edreams.geoNodeId,
                                     "iata": doc.edreams.iata,
                                     "name": doc.edreams.name,
                                     "type": doc.edreams.type
                                  },
                                  "time": "0000"
                               }
                            ]
                         },
                         "extraItinerarySearchRequestList": [],
                         "buyPath": "FLIGHTS_HOME_SEARCH_FORM"
                      }

                      }, (error, res, body) => {
                        if (error) {
                          console.error(error)
                          return
                        }
                        console.log(body.cheapestItineraryPrice);
                        
                        var difference = (Number(body.cheapestItineraryPrice) - Number(body.cheapestItineraryProviderPrice)) / Number(body.cheapestItineraryProviderPrice);
                        var difference_fixed = difference.toFixed(2);

                        departures.push({departure: date, price: {edreams: body.cheapestItineraryPrice, provider: body.cheapestItineraryProviderPrice, difference: difference_fixed}})

                      })


                    })

                    setTimeout(function(){

                      departures.sort(function(a,b){
                        // Turn your strings into dates, and then subtract them
                        // to get a value that is either negative, positive, or zero.
                        return new Date(a.departure) - new Date(b.departure);
                      });

                      edreams_obj.departures = departures;

                      edreams.push(edreams_obj)

                    }, 15000);

                  }

                })

              })

              setTimeout(function(){

                edreams.sort((a, b) => a.index - b.index);

                destinations_db.update({departure: "EIN"}, { $set: {edreams: edreams} });       

                edreams.forEach(function(element) {

                  console.log(element)

                  element.departures.forEach(function(element) {

                    console.log(element.price)

                  })

                })

              }, 30000);

            })
            
          } else {
            
          }
        
        })
        
      }, 60000);

  });
  
}