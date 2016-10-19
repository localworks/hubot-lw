'use strict';

var repo = 'localworks/localworks';
var urlPrefix = 'https://api.github.com/repos/' + repo;

module.exports = function (robot) {
    var github = require('githubot')(robot);
    var room = 'dev';

    robot.router.post('circleci/webhooks', function (req, res) {});

    robot.respond(/commits/i, function (res) {
        github.get(urlPrefix + '/commits', {}, function (commits) {

            // コミット履歴を通知
            commits = commits.slice(0, 5);

            var messages = commits.map(function (commit) {
                var date = commit.commit.committer.date.slice(0, 10);
                var sha = commit.sha.slice(0, 6);
                return date + ' ' + sha + ' (' + commit.commit.committer.name + '): ' + commit.commit.message;
            });

            // 関係者に通知
            // let comitters = commits.map(commit => commit.commit.comitter.name)

            res.send(messages.join('\n'));
        });
    });

    robot.respond(/deploy/i, function (res) {
        var deplyBranch = 'deploy';
        var filepath = 'timestamp';

        github.get(urlPrefix + '/contents/' + filepath, { ref: 'master' }, function (contents) {
            var sha = contents.sha;
            var timestamp = new Date().toString();

            // masterと差異をつける
            var query = {
                message: 'deploy',
                content: new Buffer(timestamp).toString('base64'),
                branch: 'master',
                sha: sha
            };

            github.put(urlPrefix + '/contents/' + filepath, query, function (commit) {
                console.log(commit);

                var query = {
                    'title': 'deploy',
                    'body': 'デプロイしますよー\nfrom Hubot',
                    'head': 'master',
                    'base': 'deploy'
                };

                github.post(urlPrefix + '/pulls', query, function (pull) {
                    res.send('\u30C7\u30D7\u30ED\u30A4\u3057\u307E\u3059\u3088\u30FC ' + pull.html_url);
                });
            });
        });
    });
};