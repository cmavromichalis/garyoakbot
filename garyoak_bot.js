var Botkit = require('./lib/Botkit.js');
var os = require('os');
var test = require('tape');
var GaryOak = require('pokemon-go-node-api')

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
    token: ''
}).startRTM();

// Login information
var username = process.env.PGO_USERNAME || '';
var password = process.env.PGO_PASSWORD || '';
var provider = process.env.PGO_PROVIDER || 'google';

// Globals (gross)
var location;
var latitude;
var longitude;

controller.hears(['find pokemon at (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var locationName = message.match[1];

    bot.reply(message, 'Looking for Pokemon at ' + locationName + '...');

    switch (locationName) {
        case 'work':
            latitude = ;
            longitude = ;

            location = {
                type: 'coords',
                coords: {
                    latitude: ,
                    longitude: ,
                    altitude: 0
                }
            };
            break;

        case 'work2':
            latitude = ;
            longitude = ;

            location = {
                type: 'coords',
                coords: {
                    latitude: ,
                    longitude: ,
                    altitude: 0
                }
            };
            break;

        default:
            break;
    }

    GaryOak.init(username, password, location, provider, function (err) {

        test('poke.io.SetLocation - fail to set location.name', function (t) {
            t.plan(4);

            GaryOak.SetLocation(location, function (err, coords) {
                t.error(err, 'No error returned');

                t.equal(coords.latitude, latitude, 'Returned expected latitude');
                t.equal(coords.longitude, longitude, 'Returned expected longitude');
                t.equal(coords.altitude, 0, 'Returned expected altitude');
            });
        });

        bot.api.reactions.add({
            timestamp: message.ts,
            channel: message.channel,
            name: 'robot_face',
        }, function (err, res) {
            if (err) {
                bot.botkit.log('Failed to add emoji reaction :(', err);
            }
        });

        if (err) throw err;

        var outputme = '... I searched ' + GaryOak.playerInfo.locationName + ' and found: ';

        bot.reply(message, outputme);
        console.log('[i] lat/long/alt: : ' + GaryOak.playerInfo.latitude + ' ' + GaryOak.playerInfo.longitude + ' ' + GaryOak.playerInfo.altitude)

        GaryOak.GetProfile(function (err, profile) {
            if (err) throw err;

            GaryOak.Heartbeat(function (err, hb) {
                if (err) {
                    console.log(err);
                }

                for (var i = hb.cells.length - 1; i >= 0; i--) {
                    if (hb.cells[i].NearbyPokemon[0]) {

                        var pokemon = GaryOak.pokemonlist[parseInt(hb.cells[i].NearbyPokemon[0].PokedexNumber) - 1]

                        console.log('Pokedex number: ' + hb.cells[i].NearbyPokemon[0].PokedexNumber);

                        bot.reply(message, '[:' + pokemon.name.toLowerCase() + ':] There is a ' + pokemon.name + ' at ' + hb.cells[i].NearbyPokemon[0].DistanceMeters.toString() + ' meters')
                    }
                }

            });
        });
    });
});


controller.hears(['hello', 'hi', 'whats up'], 'direct_message,direct_mention,mention', function (bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function (err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!');
        } else {
            bot.reply(message, 'Sup');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function (bot, message) {

    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function (err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function (response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function (response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function (response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function (response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function (convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function (err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });


                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});


controller.hears(['shutdown', 'go away'], 'direct_message,direct_mention,mention', function (bot, message) {

    bot.startConversation(message, function (err, convo) {

        convo.ask('Can\'t handle a real Pokemon trainer huh? (Gary Oak will shut down)', [
            {
                pattern: bot.utterances.yes,
                callback: function (response, convo) {
                    convo.say('Smell you later losers!');
                    convo.next();
                    setTimeout(function () {
                        process.exit();
                    }, 3000);
                }
            },
            {
                pattern: bot.utterances.no,
                default: true,
                callback: function (response, convo) {
                    convo.say('I knew you would miss me to much.');
                    convo.next();
                }
            }
        ]);
    });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            'I am a bot named <@' + bot.identity.name + '>; aka Gary effing Oak. I have been running for ' + uptime);
    });

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
