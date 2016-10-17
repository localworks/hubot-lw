'use strict';

var fs = require('fs');
var google = require('googleapis');
var ChartjsNode = require('chartjs-node');
var exec = require('child_process').exec;
var Cron = require('cron').CronJob;
var Promise = require('promise');
var key = JSON.parse(fs.readFileSync('./hubot-9c61d00b1b55.json', 'utf8'));
var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/analytics'], null);
var analytics = google.analytics('v3');
var viewId = '124954579'; // 設定画面で確認した「ビューID」
var metrics = ['ga:sessions', 'ga:organicSearches'];
var room = 'traffic';

var authTask = function authTask() {
    return new Promise(function (resolve, reject) {
        jwtClient.authorize(function (err, result) {
            if (err) {
                console.log('authTask/reject');
                reject(err);
            } else {
                console.log('authTask/resolve');
                resolve(result);
            }
        });
    });
};

var gaTask = function gaTask(token) {
    return new Promise(function (resolve, reject) {
        analytics.data.ga.get({
            'ids': 'ga:' + viewId,
            'start-date': '22daysAgo',
            'end-date': 'yesterday',
            'metrics': metrics.join(','),
            'dimensions': 'ga:date',
            'access_token': token
        }, function (err, result) {
            if (err) {
                console.log('gaTask/reject');
                reject(err);
            } else {
                console.log('gaTask/resolve');
                resolve(result);
            }
        });
    });
};

var _rowsToData = function _rowsToData(rows) {
    var thisWeek = rows.slice(-7);
    var lastWeek = rows.slice(7, 14);
    var twoWeeksAgo = rows.slice(0, 7);

    var labels = thisWeek.map(function (item) {
        return item[0];
    });
    var datasets = [{
        label: '今週セッション',
        data: thisWeek.map(function (item) {
            return item[1];
        }),
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)"
    }, {
        label: '先週セッション',
        data: lastWeek.map(function (item) {
            return item[1];
        }),
        backgroundColor: "rgba(75,192,192,0)",
        borderColor: "rgba(75,192,192,0.7)"
    }, {
        label: '二週間前セッション',
        data: twoWeeksAgo.map(function (item) {
            return item[1];
        }),
        backgroundColor: "rgba(75,192,192,0)",
        borderColor: "rgba(75,192,192,0.4)"
    }
    /*
    {
        label: '今週オーガニック',
        data: thisWeek.map(item => item[2]),
        backgroundColor: "rgba(205,187,151,0.2)",
        borderColor: "rgba(205,187,151,1)",
    },
    {
        label: '先週オーガニック',
        data: lastWeek.map(item => item[2]),
        backgroundColor: "rgba(205,187,151,0)",
        borderColor: "rgba(205,187,151,0.5)",
    }
     */
    ];

    return {
        labels: labels,
        datasets: datasets
    };
};

var _makeChart = function _makeChart(data) {
    var writeTo = '/tmp/chart.png';
    var chartNode = new ChartjsNode(600, 300);

    var options = {
        scales: {
            yAxes: [{
                ticks: {
                    min: 0
                }
            }]
        },
        legend: {
            display: false
        }
    };
    chartNode.drawChart({
        type: 'line',
        data: data,
        options: options
    }).then(function () {
        chartNode.getImageBuffer('image/png');
        chartNode.getImageStream('image/png');
        chartNode.writeImageToFile('image/png', writeTo);

        var cmd = 'curl -F file=@' + writeTo + ' -F channels=' + room + ' -F token=' + process.env.HUBOT_SLACK_TOKEN + ' https://slack.com/api/files.upload';
        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                console.log(err.name + ': ' + err.message);
            } else {
                console.log('success!');
            }
        });
    });
};

module.exports = function (robot) {
    new Cron('00 30 22 * * *', function () {
        authTask().then(function (result) {
            return gaTask(result.access_token);
        }).then(function (respond) {
            console.log(JSON.stringify(respond));

            var data = _rowsToData(respond.rows);
            _makeChart(data);
        }).catch(function (err) {
            console.log(err);
        });
    }).start();
};
