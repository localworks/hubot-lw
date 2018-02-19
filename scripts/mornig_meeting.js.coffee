CronJob = require('cron').CronJob

module.exports = (robot) ->
  members = [
    'atsushi',
    'honma',
    'kondo',
    'koshika',
    'kuramoto',
    'mikami',
    'miyoshi',
    'munakata',
    'rencou',
    'sonoda',
    'takemoto',
    'tominaga',
    'orikasa',
    'sakashita',
    'shugyo'
  ]

  pointFacilitator = () ->
    random_num = Math.floor(Math.random() * members.length)
    # msg.send room: 'bbs', "@#{members[random_num]} 朝会頼んだ！！" 話してから決める

  new CronJob '00 00 11 * * 1,2,3,5', ->
    pointFacilitator()
