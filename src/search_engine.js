const elasticsearch = require('elasticsearch')
const cheerio = require('cheerio-httpcli');

const indexName = 'search'
const typeName = 'articles'

const client = new elasticsearch.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});


const _searchURL = (url) => {
    return new Promise((resolve, reject) => {
        client.search({
            index: indexName,
            type: typeName,
            body: {
                query: {
                    match: {
                        url
                    }
                }
            }
        }, (error, searchResult) => {
            if (error) {
                reject(error)
            } else {
                resolve(searchResult)
            }
        })
    })
}

const _promiseCheerio = (url) => {
    return new Promise((resolve, reject) => {
        cheerio.fetch(url, (err, $, __, body) => {
            if (err) {
                reject(err)
            } else {
                resolve($)
            }
        })
    })
}

const _register = (searchResult, url, title, article) => {
    return new Promise((resolve, reject) => {
        if (searchResult.hits.hits.length == 0) {
            client.index({
                index: indexName,
                type: typeName,
                body: {
                    url,
                    title,
                    article,
                    room_tag: 'dev'
                }
            }, (error) => {
                if (error) throw new Error(error.message)
                resolve(`登録しました ${url}`)
            })
        } else {
            let id = searchResult.hits.hits[0]._id
            client.update({
                index: indexName,
                type: typeName,
                id,
                body:
                {
                    doc: {
                        url,
                        title,
                        article,
                        room_tag: 'dev'
                    }
                }
            }, (error) => {
                if (error) throw new Error(error.message)
                resolve(`更新しました ${url}`)
            })
        }
    })
}


module.exports = (hubot) => {
    hubot.respond(/search register (https?:\/\/qiita.com\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, (res) => {
        let url = res.match[1]

        Promise.all([_searchURL(url), _promiseCheerio(url)]).then((values) => {
            let searchResult = values[0]
            let $ = values[1]

            let title = $('h1.itemsShowHeaderTitle_title').text()
            let article = $('section.markdownContent').text()
            article = article.replace(/\n\n+/g, '\n')

            return _register(searchResult, url, title, article)
        }).then((msg) => {
            res.send(msg)
        }).catch((err) => { console.log(err) })
    })

    hubot.respond(/search register (https?:\/\/[\w:%#\$&\?\(\)~\.=\+\-]+.(hatenablog|hatenadiary|hateblo).(com|jp)\/entry\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, (res) => {
        let url = res.match[1]

        Promise.all([_searchURL(url), _promiseCheerio(url)]).then((values) => {
            let searchResult = values[0]
            let $ = values[1]

            let title = $('h1.entry-title').text().replace(/\s+/g, '')
            let article = $('.entry-content').text()
            article = article.replace(/\n\n+/g, '\n')

            _register(res, searchResult, url, title, article)

        }).catch((err) => { console.log(err) })
    })

    hubot.respond(/search register (https?:\/\/d.hatena.ne.jp\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, (res) => {
        let url = res.match[1]

        Promise.all([_searchURL(url), _promiseCheerio(url)]).then((values) => {
            let searchResult = values[0]
            let $ = values[1]

            let title = $('title').text()
            let article = $('.section').text()
            article = article.replace(/\n\n+/g, '\n')

            _register(res, searchResult, url, title, article)

        }).catch((err) => { console.log(err) })
    })

    hubot.respond(/search query (.+)$/i, (res) => {
        let query = res.match[1]
        let room = res.message.user.room

        let mustQuery = {
            multi_match: {
                query,
                fields: ['title', 'article']
            }}

        let shouldQuery = { match: { room_tag: room } }

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
                    pre_tags: [ " *" ],
                    post_tags: [ "* " ]
                },
                size: 3
            }
        }, (error, data)=> {
            console.log(data)

            let results = data.hits.hits
            console.log(data.hits.hits)

            let messages = results.map((result) => {
                let searchResult = `${result._source.title}: ${result._source.url}`

                let snippet = ''
                if (result.highlight) {
                    snippet = result.highlight.article[0]
                    snippet = '\n>' + snippet.replace(/\n/g, '\n>')
                }

                return searchResult + snippet
            })
            res.send(messages.join('\n'))
        })
    })

    hubot.respond(/search delete (https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+)$/i, (res) => {
        let url = res.match[1]

        _searchURL(url)
            .then((searchResult) => {
                if (searchResult.hits.hits.length > 0) {
                    let id = searchResult.hits.hits[0]._id
                    client.delete({
                        index: indexName,
                        type: typeName,
                        id
                    }, (error, result) => {
                        if (error) throw new Error(error.message)
                        res.send('削除しました')
                    })
                } else {
                    res.send('削除するURLは見つかりませんでした')
                }
            })
            .catch((err) => { console.log(err) })
    })

    hubot.respond(/search help$/i, (res) => {
        let msg = `search query {keywords} : keywordsをキーワードして検索
search register {url} : urlを検索エンジンに登録
search delete {url} : urlを検索エンジンから削除`

        res.send(msg)
    })
}
