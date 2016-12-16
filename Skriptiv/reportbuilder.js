"use strict";

const cradle = require('cradle')
const fs = require('fs')

function primitiveCollect(howMany, callback) {
    let sharedObject = {results: []}

    return (function(result) {
        console.log("Debug: got response " + howMany)
        howMany--;
        if(result) {
            this.results.push(result);
        } else {
            console.log("Warn: threw away response " + howMany)
        }
        if(howMany == 0) {
            callback(this.results);
        }
    }).bind(sharedObject);
}


var db;
try {
    db = new(cradle.Connection)(process.argv[2], process.argv[3], {
        auth: {
            username: 'researcher',
            password: '12345'
        }
    }).database('research')
} catch(e) {
    console.log("Error!")
    console.log(e);
    process.exit(1);
}

db.all(function(err, reply) {
    if(err) {
        console.log(err)
    } else {
        let responder = primitiveCollect(reply.length, output)

        for(var i = 0; i < reply.length; i++) {
            db.get(reply[i].id, function(err, doc) {
                if(err) {
                    console.log(err)
                } else {
                    if(doc.consent) {
                        responder(doc)
                    } else {
                        responder(null)
                    }
                }
            })
        }
    }
})

function output(x) {
    console.log("%%%%%%%%%%% BEGIN CSV %%%%%%%%%%%%");
    let header = 'participant,consented,consentVersion,dem1,dem2,dem3,dem4,dem5,task,config,flipped,timeRemain,side,line,result'
    console.log('participant,consented,consentVersion,dem1,dem2,dem3,dem4,dem5,task,config,flipped,timeRemain,side,line,result')

    let results = [header]
    for(var i = 0; i < x.length; i++) {
        let temp = csvify(x[i],i);

        for(var z = 0; z < temp.length; z++) {
            results.push(temp[z])
        }
    }

    let outString = "";
    for(var i = 0; i < results.length; i++) {
        outString = outString + results[i] + "\n"
    }
    
    fs.writeFileSync("./data-out.csv", outString, {
        encoding: "utf-8"
    })
}

function csvify(object, index) {
    let rows = []
    for(var i = 0; i < object.questionResults.length; i++) {
        let c = object.consent;
        let d = object.demographicsResults;
        let q = object.questionResults[i];
        let lv = `${index},${c.consented},${c.consentVersion},${d.q1},${d.q2},${d.q3},${d.q4},${d.q5},${q.task},${q.config.bugVersion},${q.config.flipped},${q.timeRemaining},${q.rawResponse.side},${q.rawResponse.line},${q.result}`;
        console.log(lv)
        rows.push(lv)
    }
    return rows;
}