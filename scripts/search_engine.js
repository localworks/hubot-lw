'use strict';

var elasticsearch = require('elasticsearch');
var cheerio = require('cheerio-httpcli');

var indexName = 'search';
var typeName = 'articles';

var client = new elasticsearch.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});

var _searchURL = function _searchURL(url) {
    return new Promise(function (resolve, reject) {
        client.search({
            index: indexName,
            type: typeName,
            body: {
                query: {
                    match: {
                        url: url
                    }
                }
            }
        }, function (error, searchResult) {
            if (error) {
                reject(error);
            } else {
                resolve(searchResult);
            }
        });
    });
};

var _promiseCheerio = function _promiseCheerio(url) {
    return new Promise(function (resolve, reject) {
        cheerio.fetch(url, function (err, $, __, body) {
            if (err) {
                reject(err);
            } else {
                resolve($);
            }
        });
    });
};

var _register = function _register(searchResult, url, title, article) {
    return new Promise(function (resolve, reject) {
        if (searchResult.hits.hits.length == 0) {
            client.index({
                index: indexName,
                type: typeName,
                body: {
                    url: url,
                    title: title,
                    article: article,
                    room_tag: 'dev'
                }
            }, function (error) {
                if (error) throw new Error(error.message);
                resolve('\u767B\u9332\u3057\u307E\u3057\u305F ' + url);
            });
        } else {
            var id = searchResult.hits.hits[0]._id;
            client.update({
                index: indexName,
                type: typeName,
                id: id,
                body: {
                    doc: {
                        url: url,
                        title: title,
                        article: article,
                        room_tag: 'dev'
                    }
                }
            }, function (error) {
                if (error) throw new Error(error.message);
                resolve('\u66F4\u65B0\u3057\u307E\u3057\u305F ' + url);
            });
        }
    });
};

module.exports = function (hubot) {
    hubot.respond(/search register (https?:\/\/qiita.com\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, function (res) {
        var url = res.match[1];

        Promise.all([_searchURL(url), _promiseCheerio(url)]).then(function (values) {
            var searchResult = values[0];
            var $ = values[1];

            var title = $('h1.itemsShowHeaderTitle_title').text();
            var article = $('section.markdownContent').text();
            article = article.replace(/\n\n+/g, '\n');

            return _register(searchResult, url, title, article);
        }).then(function (msg) {
            res.send(msg);
        }).catch(function (err) {
            console.log(err);
        });
    });

    hubot.respond(/search register (https?:\/\/[\w:%#\$&\?\(\)~\.=\+\-]+.(hatenablog|hatenadiary|hateblo).(com|jp)\/entry\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, function (res) {
        var url = res.match[1];

        Promise.all([_searchURL(url), _promiseCheerio(url)]).then(function (values) {
            var searchResult = values[0];
            var $ = values[1];

            var title = $('h1.entry-title').text().replace(/\s+/g, '');
            var article = $('.entry-content').text();
            article = article.replace(/\n\n+/g, '\n');

            _register(res, searchResult, url, title, article);
        }).catch(function (err) {
            console.log(err);
        });
    });

    hubot.respond(/search register (https?:\/\/d.hatena.ne.jp\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, function (res) {
        var url = res.match[1];

        Promise.all([_searchURL(url), _promiseCheerio(url)]).then(function (values) {
            var searchResult = values[0];
            var $ = values[1];

            var title = $('title').text();
            var article = $('.section').text();
            article = article.replace(/\n\n+/g, '\n');

            _register(res, searchResult, url, title, article);
        }).catch(function (err) {
            console.log(err);
        });
    });

    hubot.respond(/search query (.+)$/i, function (res) {
        var query = res.match[1];
        var room = res.message.user.room;

        var mustQuery = {
            multi_match: {
                query: query,
                fields: ['title', 'article']
            } };

        var shouldQuery = { match: { room_tag: room } };

        client.search({
            index: indexName,
            type: typeName,
            body: {
                query: {
                    bool: {
                        must: mustQuery,
                        should: shouldQuery
                    }
                },
                highlight: {
                    fields: { article: {} },
                    pre_tags: [" *"],
                    post_tags: ["* "]
                },
                size: 3
            }
        }, function (error, data) {
            console.log(data);

            var results = data.hits.hits;
            console.log(data.hits.hits);

            var messages = results.map(function (result) {
                var searchResult = result._source.title + ': ' + result._source.url;

                var snippet = '';
                if (result.highlight) {
                    snippet = result.highlight.article[0];
                    snippet = '\n>' + snippet.replace(/\n/g, '\n>');
                }

                return searchResult + snippet;
            });
            res.send(messages.join('\n'));
        });
    });

    hubot.respond(/search delete (https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, function (res) {
        var url = res.match[1];

        _searchURL(url).then(function (searchResult) {
            if (searchResult.hits.hits.length > 0) {
                var id = searchResult.hits.hits[0]._id;
                client.delete({
                    index: indexName,
                    type: typeName,
                    id: id
                }, function (error, result) {
                    if (error) throw new Error(error.message);
                    res.send('削除しました');
                });
            } else {
                res.send('削除するURLは見つかりませんでした');
            }
        }).catch(function (err) {
            console.log(err);
        });
    });

    hubot.respond(/search help$/i, function (res) {
        var msg = 'search query {keywords} : keywords\u3092\u30AD\u30FC\u30EF\u30FC\u30C9\u3057\u3066\u691C\u7D22\nsearch register {url} : url\u3092\u691C\u7D22\u30A8\u30F3\u30B8\u30F3\u306B\u767B\u9332\nsearch delete {url} : url\u3092\u691C\u7D22\u30A8\u30F3\u30B8\u30F3\u304B\u3089\u524A\u9664';

        res.send(msg);
    });
};