'use strict';

var google = require('googleapis');
var ChartjsNode = require('chartjs-node');
var Cron = require('cron').CronJob;
var Promise = require('promise');
var _ = require('lodash');
var cloudinary = require('cloudinary');

var viewId = '124954579'; // 設定画面で確認した「ビューID」
var metrics = ['ga:sessions', 'ga:organicSearches'];
var room = 'traffic';

var jwtClient = new google.auth.JWT(process.env.GA_CLIENT_EMAIL, null, process.env.GA_PRIVATE_KEY, ['https://www.googleapis.com/auth/analytics'], null);
var analytics = google.analytics('v3');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

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
    var thisWeek = rows.slice(-15);
    var twoWeeksAgo = rows.slice(0, 15);

    var labels = thisWeek.map(function (item) {
        return item[0];
    });
    var datasets = [{
        label: 'This week',
        data: thisWeek.map(function (item) {
            return item[1];
        }),
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)",
        lineTension: 0
    }, {
        label: 'Last week',
        data: twoWeeksAgo.map(function (item) {
            return item[1];
        }),
        backgroundColor: "rgba(75,192,192,0)",
        borderColor: "rgba(75,192,192,0.6)",
        lineTension: 0,
        borderDash: [5, 5]
    }];

    return {
        labels: labels,
        datasets: datasets
    };
};

var _sessionMsg = function _sessionMsg(rows) {
    var thisWeek = rows.slice(-7);
    var lastWeek = rows.slice(8, -7);

    var thisWeekSum = _.chain(thisWeek).map(function (item) {
        return item[1];
    }).map(_.parseInt).tap(function (item) {
        console.log('This week: ' + item);
    }).sum().tap(function (item) {
        console.log('Sum of this week: ' + item);
    });
    var lastWeekSum = _.chain(lastWeek).map(function (item) {
        return item[1];
    }).map(_.parseInt).tap(function (item) {
        console.log('Last week: ' + item);
    }).sum().tap(function (item) {
        console.log('Sum of last week: ' + item);
    });

    var rateOfIncrease = (thisWeekSum - lastWeekSum) / lastWeekSum * 100;
    rateOfIncrease = rateOfIncrease.toFixed(2);
    var lastDay = _.last(thisWeek)[1];

    rateOfIncrease = rateOfIncrease > 0 ? '↑ ' + rateOfIncrease.toString() : '↓ ' + (-1 * rateOfIncrease).toString();
    thisWeekSum = thisWeekSum.toLocaleString();
    lastDay = lastDay.toLocaleString();

    var msg = '- \u5408\u8A08\u30BB\u30C3\u30B7\u30E7\u30F3\u6570\uFF08\u9031\uFF09: ' + thisWeekSum + ' \uFF08' + rateOfIncrease + '%\uFF09\n- \u30BB\u30C3\u30B7\u30E7\u30F3\u6570\uFF08\u65E5\uFF09\uFF1A ' + lastDay;

    return msg;
};

var _makeChart = function _makeChart(data, robot) {
    var writeTo = 'tmp/chart.png';
    var chartNode = new ChartjsNode(600, 300);

    var options = {
        scales: {
            yAxes: [{
                ticks: {
                    min: 0
                }
            }]
        }
    };
    chartNode.drawChart({
        type: 'line',
        data: data,
        options: options
    }).then(function () {
        chartNode.getImageBuffer('image/png').then(function (buffer) {
            var uri = 'data:image/png;base64,' + buffer.toString('base64');
            cloudinary.uploader.upload(uri, function (result) {
                console.log(result);
                robot.send(room, result.secure_url);
            });
        });
        chartNode.destroy();
    });
};

var _main = function _main(robot) {
    return function () {
        authTask().then(function (result) {
            return gaTask(result.access_token);
        }).then(function (respond) {
            console.log(JSON.stringify(respond));

            var msg = _sessionMsg(respond.rows);
            robot.send({ room: room }, msg);
            var data = _rowsToData(respond.rows);
            _makeChart(data, robot);
        }).catch(function (err) {
            console.log(err);
        });
    };
};

module.exports = function (robot) {
    new Cron('00 30 07 * * *', _main(robot)).start();
};