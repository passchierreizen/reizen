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

// var request = require('request');

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
            
            departures.push({departure: date, price: {edreams: body.cheapestItineraryPrice, provider: body.cheapestItineraryProviderPrice}})
            
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

ONE1JSESSIONID=5ufyo1CTJZV3DE-GNteW+ctH.bcn1-app-front-012p4; 
TS010aeccd=017fb7f60a63b7487c5ad18883ba2b93b613a8b465b735db2eccadcb5748f8ef29f00c340b315671c09556ae412dfa7cb9d0725c6f;
AKA_A2=A;
locale=nl_NL;
userDevice=970d0d18-656a-4b90-805c-eca5940709e6;
TestTokenSpace=1#3455-2#20612-3#4329-4#70653-5#946500-6#41483-7#44428-8#33495657639-9#40003891880-10#79031078918-11#24966552730-12#24679755488-13#27491261789-14#79506206585-15#33370234901-16#49805958893-17#77704982916-18#53029511461-19#54581358689-20#55896197379-21#59779226641-22#49587739674|08-02-2019.13:02;
mktportal=KayakR;
TS019e0659=017fb7f60a4d39d5ed03557cd57628ad3f171e0de0590e9fae42eaad666b19c29180397cab3db337bdb31ddce266779f878f0f2381; TS01a885bf=017fb7f60a4d39d5ed03557cd57628ad3f171e0de0590e9fae42eaad666b19c29180397cab3db337bdb31ddce266779f878f0f2381;
tc_cj_v2=%28%20/%7B.%20%7B-%7D%23ZZZ%28*%28*%29%7E*%29%27ZZZKONSPLNJRLKRSZZZ%5Dfc%5De777%5Ecl_%5Dny%5B%5D%5D_mmZZZZZZKONSPLQMOPOLSZZZ%5D;
ens_abcSplit=groupb;
tCdebugLib=1;
_ga=GA1.2.1119184272.1549624046;
_gid=GA1.2.100766855.1549624046;
D_IID=3D54D0F2-1877-3DE9-B60E-84BF57E41036;
D_UID=55A65A45-3878-3A03-9441-6CDB0CEF6DEB;
D_ZID=CF77C0FB-5BBD-3230-BEEE-28C6A3538FA7;
D_ZUID=8514D94D-E13F-3482-BF53-FA29EE50D6AD;
D_HID=45F2B081-AB62-3B20-96E6-73F672E5CB34;
D_SID=143.179.3.15:tnfvX1nGc3FrqIF07Fnvz9iEszWcE+91c0FzzLWxmSE;
G_ENABLED_IDPS=google;
__utma=144834667.1119184272.1549624046.1549624049.1549624049.2;
__utmc=144834667;
__utmz=144834667.1549624049.1.1.utmcsr=momondonl|utmccn=EIN-STN|utmcmd=metasearch|utmctr=flight|utmcct=eFqGASpZFatsRwhqrNZiFA;
cto_lwid=49141cb9-8425-43c8-9fd4-65c05cbe827c;
bid_grY1NOtKhm4xhDV9rsny82DvKa1iYFBN=fc5327d8-766e-43f2-be34-04b2ae4bf711;
UTM_user_id=ab364c8e-518b-4f99-a80f-c61f11f4e306;
HOME1JSESSIONID=Zr8veJfwLmI6FB8unZadIiBM.bcn1-app-home-262p9;
__gads=ID=b7dde5c48d877108:T=1549624083:S=ALNI_MZK6sZQVgVa588L9eFrEP3rWKY2HQ;
CookiePolicyAccepted=1;
_gat=1;
_gaActiveSession=1;
__utmb=144834667.4.6.1549627337472;
comebackToNewHome=false;
ADRUM=s=1549627337596&r=https%3A%2F%2Frentacar.edreams.com%2Fpartners%2Fintegrations%2Fstand-alone-app%2F%3F1724999543;
viI=eJztlM9rHkUYx+cxsamKthQR9fSWLaGhzO78np3kFOz7ltA3b6RvYuC9yPbdyZtt3919s7tJ3ogUvPUg3gU9iTcP1UPPCuKpWCjouQchIi0oVo/ibN+0JqXtX+CyzMzO83w/zzMP+wzASdgo8qyyWYw3q3QosY2KeepzbfwbECRZbMf+lfJ3yO51bn10GgDBxWgvunrn0cSkpDfhdYDmUgd3V39EYFtbFxa7o14rqspLu5tbRaeXtL6D1FZR6eD9XyHN0zyL8+webAyTweYDhE7A3X9++u2vadifph4XUmLmMaIow9wTnBksPE2U5Fh6RihJCFaeoCLkWHtCCBbi0ONcGKmkVtxg4wlCCA8NDUOCKfG0IZwSXW9gSj0mjFJSMs2d1YUSShstpQidlXtMC0OZos4dUxfZSKJcNjKUmEoXh2vCXDBCMXVpmJBII8PQcEy1p7UmbosZqjANPckJM5JSoZyz8aSQIeUyVI7MiCdlaBQ12lUbM+pJo7VhTClBMWOOLEOtuVFafEhCTJiTUONTPk/YqwA//1+qp5UKPDgDn9z9c/9j/Nm3+7c/7c1Cc7vIRzZYjuIi+eVN+OHL66+8BV/dRy+WBcL9PPXzOBnY3N9JysR1wiDJrL9d2iIa2Kzy19xqsV5dtHto8sAL6FgPHd9NCju0ZdlGL8d2J+nb1b2RrdBs2zGDCTOYGGJb2X6VF8H5x34LbXQsLyeKs89RrHRbUZoM9w40L+Xle7YoE9ez6FT7SrQTBcMoGwTdqkiygXM4sf0o34muQueeQ1876uz0Jx/rD+JsoWtoajxC1wp05lCxjoL8/w52UCN0CqFxgV6rU/TrFP1mtp0eNo4qdPydleV311ablxx89tnwwzU4TKhTm6nQzPpS5/zKerdC05T4xLHmns164sRPwy2v9Jba7UWHU9IncBuW8w+S4TAK3Ffj7Lq7FPPdstFZbdTRFhpuQ4mFxrgeip35WjPXuGD7V/PANSxxL2203K+ykY+Dh0CjSUxi115KqgiLy4Zg1xh9bPuRNIJoYuxNoEL6wvjuHmbkxvW/P//ji6k34ME3M9D8Hjq3oLl253Q9Z8P3H46+jQsbpaXfz+/PAUxNDG+fc8vZKXdLU/o1pP5RP6iiy0NbPbH7L9fBrcc=;
ONE1=!MDBbIda02hBrXYbu7CGVI2rS0Ip2HjApL6JJzDvXjxnX/4+DsA2aTi8eHIO2exapll1UImil7XLkkwE=