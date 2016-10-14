'use strict';

var fs = require('fs');
var google = require('googleapis');
var Chart = require('nchart');
var Canvas = require('canvas');
var exec = require('child_process').exec;
var Cron = require('cron').CronJob;
var Promise = require('promise')
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
      'start-date': '14daysAgo',
      'end-date': 'today',
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
  var lastWeek = rows.slice(0, 7);

  var labels = thisWeek.map(function (item) {
    return item[0];
  });
  var datasets = [{
    label: '今週セッション',
    data: thisWeek.map(function (item) {
      return item[1];
    }),
    fillColor: "rgba(75,192,192,0.2)",
    strokeColor: "rgba(75,192,192,1)"
  }, {
    label: '今週オーガニック',
    data: thisWeek.map(function (item) {
      return item[2];
    }),
    fillColor: "rgba(151,187,205,0.2)",
    strokeColor: "rgba(151,187,205,1)"
  }, {
    label: '先週セッション',
    data: lastWeek.map(function (item) {
      return item[1];
    }),
    fillColor: "rgba(75,192,192,0)",
    strokeColor: "rgba(75,192,192,0.5)"
  }, {
    label: '先週オーガニック',
    data: lastWeek.map(function (item) {
      return item[2];
    }),
    fillColor: "rgba(151,187,205,0)",
    strokeColor: "rgba(151,187,205,0.5)"
  }];

  return {
    labels: labels,
    datasets: datasets
  };
};

var _makeChart = function _makeChart(data) {
  var canvas = new Canvas(600, 300);
  var ctx = canvas.getContext('2d');

  var options = {
    legend: {
      display: true
    }
  };
  var linechart = new Chart(ctx).Line(data, options);

  canvas.toBuffer(function (err, buf) {
    var writeTo = '/tmp/chart.png';

    if (err) {
      console.log(err.name + ': ' + err.message);
    }
    fs.writeFile(writeTo, buf);

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
  new Cron('00 35 11 * * *', function () {
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

  robot.respond(/hi$/i, function (msg) {});
};
