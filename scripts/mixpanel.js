'use strict';

var _map2 = require('lodash/map');

var _map3 = _interopRequireDefault(_map2);

var _mixpanelDataExport = require('mixpanel-data-export');

var _mixpanelDataExport2 = _interopRequireDefault(_mixpanelDataExport);

var _chartjsNode = require('chartjs-node');

var _chartjsNode2 = _interopRequireDefault(_chartjsNode);

var _cron = require('cron');

var _cloudinary = require('cloudinary');

var _cloudinary2 = _interopRequireDefault(_cloudinary);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var funnelId = 2019370;
var room = 'traffic';

var panel = new _mixpanelDataExport2.default({
    api_key: process.env.HUBOT_MIXPANEL_API_KEY,
    api_secret: process.env.HUBOT_MIXPANEL_API_SECRET
});

var tokyo = {
    name: 'Tokyo',
    toString: function toString() {
        return 'Tokyo (GMT+0900)';
    },
    valueOf: function valueOf() {
        return 540;
    }
};

var per2d = function per2d(n) {
    return ("0" + n).slice(-2);
};

var panelFunnelsMonthConv = function panelFunnelsMonthConv() {
    return new Promise(function (resolve, reject) {

        var today = (0, _moment2.default)().subtract(1, 'day').format('YYYY-MM-DD');
        var lastMonth = (0, _moment2.default)().subtract(15, 'day').format('YYYY-MM-DD');

        panel.funnels({
            funnel_id: funnelId,
            from_date: lastMonth,
            to_date: today
        }, function (data) {
            var labels = data.meta.dates;
            var productsCount = (0, _map3.default)(labels, function (item) {
                return data.data[item].steps[0].count;
            });

            var formConvs = (0, _map3.default)(labels, function (item) {
                return data.data[item].steps[1].overall_conv_ratio * 100;
            });
            var doneConvs = (0, _map3.default)(labels, function (item) {
                return data.data[item].steps[2].overall_conv_ratio * 100;
            });

            labels = (0, _map3.default)(labels, function (item) {
                return item.replace(/-/g, '');
            });

            resolve({
                labels: labels,
                formConvs: formConvs,
                doneConvs: doneConvs,
                productsCount: productsCount
            });
        });
    });
};

var dataForDraw = function dataForDraw(data) {
    return {
        labels: data.labels,
        datasets: [{
            type: 'line',
            label: 'Form Conversion (%)',
            data: data.formConvs,
            backgroundColor: "rgba(75,192,192,0.0)",
            borderColor: "rgba(75,192,192,1)",
            lineTension: 0,
            yAxisID: 'conversion'
        }, {
            type: 'line',
            label: 'Done Conversion (%)',
            data: data.doneConvs,
            backgroundColor: "rgba(255,99,132,0.0)",
            borderColor: "rgba(255,99,132,1)",
            lineTension: 0,
            yAxisID: 'conversion'
        }, {
            type: 'bar',
            label: 'Products',
            data: data.productsCount,
            backgroundColor: 'rgba(54,162,235,0.2)',
            borderColor: 'rgba(54,162,235,1)',
            yAxisID: 'products'
        }]
    };
};

var drawFunnels = function drawFunnels(data) {

    return new Promise(function (resolve, reject) {
        var chartNode = new _chartjsNode2.default(600, 300);

        var options = {
            scales: {
                yAxes: [{
                    id: "products",
                    type: "linear",
                    position: "left",
                    ticks: {
                        min: 0
                    }
                }, {
                    id: "conversion",
                    type: "linear",
                    position: "right",
                    ticks: {
                        min: 0
                    }
                }]
            }
        };

        chartNode.drawChart({
            type: 'bar',
            data: data,
            options: options
        }).then(function () {
            chartNode.getImageBuffer('image/png').then(function (buffer) {
                chartNode.destroy();
                resolve(buffer);
            });
        });
    });
};

var saveToCloudinary = function saveToCloudinary(buffer) {

    return new Promise(function (resolve, reject) {
        var uri = 'data:image/png;base64,' + buffer.toString('base64');
        _cloudinary2.default.uploader.upload(uri, function (result) {
            console.log(result);
            resolve(result.secure_url);
        });
    });
};

module.exports = function (robot) {
    new _cron.CronJob('00 30 07 * * *', function () {
        panelFunnelsMonthConv().then(function (data) {
            data = dataForDraw(data);
            return drawFunnels(data);
        }).then(function (buffer) {
            return saveToCloudinary(buffer);
        }).then(function (url) {
            robot.send({ room: room }, url);
        });
    }).start();
};