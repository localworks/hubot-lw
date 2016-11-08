const google = require('googleapis');
const ChartjsNode = require('chartjs-node')
const Cron = require('cron').CronJob;
const Promise = require('promise');
const _ = require('lodash')
const cloudinary = require('cloudinary')

const viewId = '124954579'; // 設定画面で確認した「ビューID」
const metrics = [
    'ga:sessions',
    'ga:organicSearches'
]
const room = 'traffic'

const jwtClient = new google.auth.JWT(process.env.GA_CLIENT_EMAIL,
                                      null,
                                      process.env.GA_PRIVATE_KEY.replace(/\\n/g, '\n'),
                                      ['https://www.googleapis.com/auth/analytics'],
                                      null);
const analytics = google.analytics('v3');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const authTask = () => {
  return new Promise((resolve, reject) => {
    jwtClient.authorize((err, result) => {
      if (err) {
        console.log('authTask/reject');
        reject(err);
      } else {
        console.log('authTask/resolve');
        resolve(result);
      }
    });
  });
}

const gaTask = (token) => {
  return new Promise((resolve, reject) => {
    analytics.data.ga.get({
      'ids': 'ga:' + viewId,
      'start-date': '22daysAgo',
      'end-date': 'yesterday',
      'metrics': metrics.join(','),
      'dimensions': 'ga:date',
      'access_token': token
    }, (err, result) => {
      if (err) {
        console.log('gaTask/reject');
        reject(err);
      } else {
        console.log('gaTask/resolve');
        resolve(result);
      }
    });
  });
}

const _rowsToData = (rows) => {
    let thisWeek = rows.slice(-15)
    let twoWeeksAgo = rows.slice(0, 15)

    let labels = thisWeek.map(item => item[0])
    let datasets = [
        {
            label: 'This week',
            data: thisWeek.map(item => item[1]),
            backgroundColor: "rgba(75,192,192,0.2)",
            borderColor: "rgba(75,192,192,1)",
            lineTension: 0
        },
        {
            label: 'Last week',
            data: twoWeeksAgo.map(item => item[1]),
            backgroundColor: "rgba(75,192,192,0)",
            borderColor: "rgba(75,192,192,0.6)",
            lineTension: 0,
            borderDash: [5, 5]
        }
    ]

    return {
        labels,
        datasets
    }
}

const _sessionMsg = (rows) => {
    let thisWeek = rows.slice(-7)
    let lastWeek = rows.slice(8,-7)

    let thisWeekSum = _.chain(thisWeek)
            .map(item => item[1]).map(_.parseInt)
            .tap(item => { console.log('This week: ' + item) })
            .sum()
            .tap(item => { console.log('Sum of this week: ' + item) })
    let lastWeekSum = _.chain(lastWeek)
            .map(item => item[1]).map(_.parseInt)
            .tap(item => { console.log('Last week: ' + item) })
            .sum()
            .tap(item => { console.log('Sum of last week: ' + item) })

    let rateOfIncrease = (thisWeekSum - lastWeekSum) / lastWeekSum * 100
    rateOfIncrease = rateOfIncrease.toFixed(2)
    let lastDay = _.last(thisWeek)[1]

    rateOfIncrease = (rateOfIncrease > 0)
        ? '↑ ' + rateOfIncrease.toString()
        : '↓ ' + (-1 * rateOfIncrease).toString()
    thisWeekSum = thisWeekSum.toLocaleString()
    lastDay = lastDay.toLocaleString()

    let msg = `- 合計セッション数（週）: ${thisWeekSum} （${rateOfIncrease}%）
- セッション数（日）： ${lastDay}`

    return msg
}

const _makeChart = (data) => {
    return new Promise((resolve, reject) => {
        let writeTo = 'tmp/chart.png'
        let chartNode = new ChartjsNode(600, 300);

        let options = {
            scales: {
                yAxes: [{
                    ticks: {
                        min: 0
                    }
                }]
            }
        }
        chartNode.drawChart({
            type: 'line',
            data,
            options
        }).then(() => {
            chartNode.getImageBuffer('image/png').then(buffer => {
                let uri = 'data:image/png;base64,' + buffer.toString('base64')
                chartNode.destroy()

                cloudinary.uploader.upload(uri, (result) => {
                    console.log(result)
                    resolve(result)
                });
            })
        })

    })
}

const _main = (robot) => {
    return () => {
        authTask().then(result => {
            return gaTask(result.access_token);
        }).then(respond => {
            console.log(JSON.stringify(respond));

            let msg = _sessionMsg(respond.rows)
            robot.send({ room }, msg)
            let data = _rowsToData(respond.rows)
            return _makeChart(data)

        }).then(result =>{
            robot.send({ room }, result.secure_url)
        }).catch(err => {
            console.log(err);
        });
    }
}

module.exports = robot => {
    new Cron('00 30 07 * * *', _main(robot)).start()

    robot.respond(/ga/i, _main(robot))
};
