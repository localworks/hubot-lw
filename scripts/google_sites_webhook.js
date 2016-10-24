'use strict';

var elasticsearch = require('elasticsearch');

var indexName = 'search';
var typeName = 'articles';

var client = new elasticsearch.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});

module.exports = function (robot) {
    robot.router.post('/google-sites/webhook', function (req, res) {
        var payload = JSON.parse(req.body.payload);
        console.log(payload);

        client.update({
            index: indexName,
            type: typeName,
            id: payload.id,
            body: {
                doc: {
                    url: payload.url,
                    title: payload.title,
                    article: payload.article
                }
            }
        }, function (error) {
            if (error) {
                console.log(error.message);
            } else {
                console.log('google sites webhook: update ' + id);
            }
        });
    });
};