import elasticsearch from 'elasticsearch'
import _ from 'lodash'

const client = new elasticsearch.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});


const builderPromise = (builder) => {
    return new Promise((resolve, reject) => {
        builder.build((error, tokenizer) => {
            if (error) {
                reject(error)
            } else {
                resolve(tokenizer)
            }
        })
    })
}

const searchUsernamePromise = (username, room) => {
    return new Promise((resolve, reject) => {
        client.search({
            index: 'slack',
            type: 'logs',
            body: {
                sort: [
                    { timestamp: "desc" }
                ],
                query: {
                    bool: {
                        must: [
                            { match: { username } },
                            { match: { channel: room } }
                        ]
                    }
                },
                size: 5
            }
        }, (error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        })
    })
}

const recommendByData = (data) => {
    return new Promise((resolve, reject) => {
        console.log(data.hits.hits)
        let source = data.hits.hits

        client.search({
            index: 'search',
            type: 'articles',
            body: {
                query: {
                    more_like_this: {
                        fields: ['title', 'article'],
                        like: _.map(source, (x) => x._source.log)
                    }
                },
                size: 3
            }
        }, (error, data) => {
            if (error) {
                reject(error)
            } else {
                console.log(data)

                let results = data.hits.hits
                console.log(results)

                let messages = results.map((result) => {
                    return `${result._source.title}: ${result._source.url}`
                })

                if (results.length == 0) {
                    messages = ['推薦できませんでした。']
                }

                resolve(messages.join('\n'))
            }
        })
    })
}

module.exports = (robot) => {

    robot.router.delete('/reset-slack-log/webhook', (req, res) => {
        client.deleteByQuery({
            index: 'slack',
            type: 'logs',
            body: {
                query: { match_all: {} }
            }
        }, (error) => {
            if (error) {
                console.log(error)
                res.send('NG')
            } else {
                res.send('OK')
            }
        })
    })

    robot.router.post('/slack-outgoing/webhook', (req, res) => {
        let body = req.body

        let channel = body.channel_id
        let userName = body.user_name
        let timestamp = body.timestamp * 1000
        let text = body.text

        client.index({
            index: 'slack',
            type: 'logs',
            body: {
                username: userName,
                channel: channel,
                timestamp: timestamp,
                log: text
            }
        }, (error) => {
            if (error) {
                console.log(error)
                res.send('{}')
            } else {
                console.log(`success for update the data of ${userName}.`)
                res.send('{}')
            }
        })
    })

    robot.respond(/recommend/i, (res)=> {
        let username = res.message.user.name
        let room = res.message.user.room

        searchUsernamePromise(username, room)
            .then(recommendByData)
            .then((message) => {
                res.send(message)
            })
            .catch((error) => {
                console.log(error)
            })
    })

    robot.hear(/マニュアル/i, (res)=> {
        let username = res.message.user.name
        let room = res.message.user.room

        searchUsernamePromise(username, room)
            .then(recommendByData)
            .then((message) => {
                res.send(message)
            })
            .catch((error) => {
                console.log(error)
            })
    })
}
