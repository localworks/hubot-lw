//const repo = 'localworks/localworks'
const repo = 'TeraBytesMemory/sandbox'
const urlPrefix = `https://api.github.com/repos/${repo}`

module.exports = robot => {
    const github = require('githubot')(robot)
    let room = 'dev'

    robot.router.post('circleci/webhooks', (req, res) => {
        github.get(`${urlPrefix}/pulls`, { state: 'all' }, (pulls) => {
            let prMessage = pulls[0].body

            let command = prMessage.match(/after_deploy:[\w @]+/g)
            let users = (command) ? command[0].slice('after_deploy:'.length) : ''
            users = (users) ? users + '\n' : ''

            robot.send({ room: 'bbs' }, `${users}デプロイ終わったよー`)
        })
    })

    robot.respond(/commits$/i, (res) => {
        github.get(`${urlPrefix}/commits`, {}, (commits) => {

            // コミット履歴を通知
            commits = commits.slice(0, 5)

            let messages = commits.map(commit => {
                let date = commit.commit.committer.date.slice(0, 10)
                let sha = commit.sha.slice(0, 6)
                let commitMessage = `${date} ${sha} (${commit.commit.committer.name})\n`
                commitMessage = commitMessage + `>${commit.commit.message.replace(/\n/g, '\n>')}`
                return commitMessage
            })

            // 関係者に通知
            // let comitters = commits.map(commit => commit.commit.comitter.name)

            res.send(messages.join('\n'))

        })
    })

    robot.respond(/deploy$/i, (res) => {
        let deplyBranch = 'deploy'
        let filepath = 'timestamp'

        github.get(`${urlPrefix}/contents/${filepath}`, { ref: 'deploy' }, (contents) => {
            let sha = contents.sha
            let timestamp = new Date().toString()

            // masterと差異をつける
            let query = {
                message: 'deploy',
                content: new Buffer(timestamp).toString('base64'),
                branch: 'deploy',
                sha
            }

            github.put(`${urlPrefix}/contents/${filepath}`, query, (commit) => {
                console.log(commit)

                let query = {
                    'title': 'deploy',
                    'body': 'デプロイしますよー\nfrom Hubot',
                    'head': 'deploy',
                    'base': 'master'
                }

                github.post(`${urlPrefix}/pulls`, query, (pull) => {
                    res.send(`デプロイしますよー ${pull.html_url}`)
                })
            })
        })
    })

    robot.respond(/pulls$/i, (res) => {
        github.get(`${urlPrefix}/pulls`, { state: 'all' }, (pulls) => {
            let prMessage = pulls[0].body

            let command = prMessage.match(/after_deploy:[\w @]+/g)
            let users = (command) ? command[0].slice('after_deploy:'.length) : ''
            users = (users) ? users + '\n' : ''

            robot.send({ room: 'bbs' }, `${users}デプロイ終わったよー`)
        })
    })
}
