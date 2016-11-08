import MixpanelExport from 'mixpanel-data-export'
import ChartjsNode from 'chartjs-node'
import { CronJob } from 'cron'
import cloudinary from 'cloudinary'
import moment from 'moment'
import _ from 'lodash'

const mainFunnelId = 2019370
const room = 'traffic'

const panel = new MixpanelExport({
    api_key: process.env.HUBOT_MIXPANEL_API_KEY,
    api_secret: process.env.HUBOT_MIXPANEL_API_SECRET
})

const panelFunnelsMonthConv = (funnelId) => {
    return new Promise((resolve, reject) => {

        let today = moment().subtract(1, 'day').format('YYYY-MM-DD')
        let lastMonth = moment().subtract(15, 'day').format('YYYY-MM-DD')

        panel.funnels({
            funnel_id: funnelId,
            from_date: lastMonth,
            to_date: today
        }, (data) => {
            let labels = data.meta.dates
            let productsCount = _.map(labels, (item) => {
                return data.data[item].steps[0].count
            })

            let firstConvs = _.map(labels, (item) => {
                return data.data[item].steps[1].overall_conv_ratio * 100
            })
            let secondConvs = _.map(labels, (item) => {
                return data.data[item].steps[2].overall_conv_ratio * 100
            })

            labels = _.map(labels, (item) => item.replace(/-/g, ''))

            resolve({
                labels,
                firstConvs,
                secondConvs,
                productsCount
            })
        })
    })
}

const dataForDraw = (data) => {
    return {
        labels: data.labels,
        datasets: [{
            type: 'line',
            label: 'Form Conversion (%)',
            data: data.firstConvs,
            backgroundColor: "rgba(75,192,192,0.0)",
            borderColor: "rgba(75,192,192,1)",
            lineTension: 0,
            yAxisID: 'conversion'
        }, {
            type: 'line',
            label: 'Done Conversion (%)',
            data: data.secondConvs,
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
    }
}

const drawFunnels = (data) => {

    return new Promise((resolve, reject) => {
        let chartNode = new ChartjsNode(600, 300);

        let options = {
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
        }

        chartNode.drawChart({
            type: 'bar',
            data,
            options
        }).then(() => {
            chartNode.getImageBuffer('image/png').then(buffer => {
                chartNode.destroy()
                resolve(buffer)
            })
        })
    })
}

const saveToCloudinary = (buffer) => {

    return new Promise((resolve, reject) => {
        let uri = 'data:image/png;base64,' + buffer.toString('base64')
        cloudinary.uploader.upload(uri, (result) => {
            console.log(result)
            resolve(result.secure_url)
        });
    })
}

module.exports = (robot) => {
    new CronJob('00 30 07 * * *', () => {
        panelFunnelsMonthConv(mainFunnelId).then((data) => {
            data = dataForDraw(data)
            return drawFunnels(data)
        }).then((buffer) => {
            return saveToCloudinary(buffer)
        }).then((url) => {
            robot.send({ room }, url)
        })
    }).start()
}
