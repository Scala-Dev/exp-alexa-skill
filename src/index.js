/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

'use strict';

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');
var EXP = require('exp-sdk');

/**
 * App ID for the skill
 */
var APP_ID; // set to 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * The active instances of the EXP SDK.
 */
var exp;

/**
 * Fling is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Fling = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
Fling.prototype = Object.create(AlexaSkill.prototype);
Fling.prototype.constructor = Fling;

Fling.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log('Fling onSessionStarted requestId: ' + sessionStartedRequest.requestId + ', sessionId: ' + session.sessionId);
    // any initialization logic goes here
    exp = EXP.start(require('./device-credentials.json'));
};

Fling.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log('Fling onLaunch requestId: ' + launchRequest.requestId + ', sessionId: ' + session.sessionId);
    var speechOutput = 'Welcome to E X P, I can fling content for you';
    var repromptText = 'Ask me to show you something';
    response.ask(speechOutput, repromptText);
};

Fling.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log('Fling onSessionEnded requestId: ' + sessionEndedRequest.requestId + ', sessionId: ' + session.sessionId);
    // any cleanup logic goes here
    exp.stop();
};

Fling.prototype.intentHandlers = {
    // register custom intent handlers
    'FlingIntent': function (intent, session, response) {

        var searchTermValue = intent.slots.searchTerm.value;
        var destinationValue = intent.slots.destination.value;

        exp.findContent({ limit: 1, 'labels~': searchTermValue }).then(function (res) {

            if (res.total < 1) return response.tellWithCard('Sorry, I could not find that content.', 'Content Not Found', 'Could not find content labeled: ' + searchTermValue);

            return Promise.resolve(res[0]).then(function (content) {

                if (!destinationValue) {
                    return exp.getChannel('organization').fling({ content: content.uuid });
                }

                // try to find destination by name and labels
                return exp.findLocations({ limit: 1, 'name~': destinationValue }).then(function (res) {
                    if (res.total > 0) return res[0].getChannel();
                    else return exp.findLocations({ limit: 1, 'labels~': destinationValue }).then(function (res) {
                        if (res.total > 0) return res[0].getChannel();
                        else return exp.findDevices({ limit: 1, 'name~': destinationValue }).then(function (res) {
                            if (res.total > 0) return res[0].getChannel();
                            else return exp.findDevices({ limit: 1, 'labels~': destinationValue }).then(function (res) {
                                if (res.total > 0) return res[0].getChannel();
                                else return exp.getChannel('organization');
                            });
                        });
                    });
                })
                .then(function (channel) {
                    return channel.fling({ content: content.uuid });
                });
            })
            .then(function () {
                response.tellWithCard('Showing ' + searchTermValue, 'Showing Content', 'Showing ' + searchTermValue + (destinationValue ? ' on ' + destinationValue + '.' : '.'));
            });
        })
        .catch(function (err) {
            response.tellWithCard('Sorry there was an error flinging content.', 'Fling Error', 'Error: ' + err.message);
        });

        
    },
    'AMAZON.HelpIntent': function (intent, session, response) {
        response.ask('You can ask me to show you content!', 'You can ask me to show you content!');
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HelloWorld skill.
    var fling = new Fling();
    fling.execute(event, context);
};

