const elasticsearch = require('elasticsearch')

const indexName = 'search'
const typeName = 'articles'

const client = new elasticsearch.Client({
    host: process.env.HUBOT_LW_ELASTICSEARCH,
    log: 'trace'
});

module.exports = (hubot) => {
    robot.router.post('/google-sites/webhook', (req, res) => {
        let payload = JSON.parse(req.body.payload)
        console.log(payload)

        client.update({
            index: indexName,
            type: typeName,
            id: payload.id,
            body:
            {
                doc: {
                    url: payload.url,
                    title: payload.title,
                    article: payload.article
                }
            }
        }, (error) => {
            if (error) {
                console.log(error.message)
            } else {
                console.log('google sites webhook: update ' + id)
            }
        })
    })
}
