'use strict';

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var client = new _elasticsearch2.default.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});

var builderPromise = function builderPromise(builder) {
    return new Promise(function (resolve, reject) {
        builder.build(function (error, tokenizer) {
            if (error) {
                reject(error);
            } else {
                resolve(tokenizer);
            }
        });
    });
};

var searchUsernamePromise = function searchUsernamePromise(username, room) {
    return new Promise(function (resolve, reject) {
        client.search({
            index: 'slack',
            type: 'logs',
            body: {
                sort: [{ timestamp: "desc" }],
                query: {
                    bool: {
                        must: [{ match: { username: username } }, { match: { channel: room } }]
                    }
                }
            }
        }, function (error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};

module.exports = function (robot) {

    robot.router.delete('/reset-slack-log/webhook', function (req, res) {
        client.deleteByQuery({
            index: 'slack',
            type: 'logs',
            body: {
                query: { match_all: {} }
            }
        }, function (error) {
            if (error) {
                console.log(error);
                res.send('NG');
            } else {
                res.send('OK');
            }
        });
    });

    robot.router.post('/slack-outgoing/webhook', function (req, res) {
        var body = req.body;

        var channel = body.channel_id;
        var userName = body.user_name;
        var timestamp = body.timestamp * 1000;
        var text = body.text;

        client.index({
            index: 'slack',
            type: 'logs',
            body: {
                username: userName,
                channel: channel,
                timestamp: timestamp,
                log: text
            }
        }, function (error) {
            if (error) {
                console.log(error);
                res.send('{}');
            } else {
                console.log('success for update the data of ' + userName + '.');
                res.send('{}');
            }
        });
    });

    robot.respond(/recommend/i, function (res) {
        var username = res.message.user.name;
        var room = res.message.user.room;

        searchUsernamePromise(username, room).then(function (data) {
            console.log(data);
            var source = data._source;

            client.search({
                index: 'search',
                type: 'articles',
                body: {
                    more_like_this: {
                        fields: ['title', 'article'],
                        like: source.logs
                    },
                    size: 3
                }
            }, function (error, data) {
                if (error) throw new Error(error);

                console.log(data);

                var results = data.hits.hits;
                console.log(data.hits.hits);

                var messages = results.map(function (result) {
                    return result._source.title + ': ' + result._source.url;
                });
                res.send(messages.join('\n'));
            });
        }).catch(function (error) {
            console.log(error);
        });
    });
};