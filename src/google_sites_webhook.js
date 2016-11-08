const elasticsearch = require('elasticsearch')

const indexName = 'search'
const typeName = 'articles'

const client = new elasticsearch.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});

module.exports = (robot) => {
    robot.router.post('/google-sites/webhook', (req, res) => {
        console.log(req.body.payload)
        let payload = JSON.parse(req.body.payload)

        client.update({
            index: indexName,
            type: typeName,
            id: payload.id,
            body:
            {
                doc: {
                    url: payload.url,
                    title: payload.title,
                    article: payload.article,
                    room_tag: 'operation'
                },
                doc_as_upsert : true
            }
        }, (error) => {
            if (error) {
                console.log(error.message)
                res.send('NG')
            } else {
                console.log('google sites webhook: update ' + payload.id)
                res.send('OK')
            }
        })
    })
}
