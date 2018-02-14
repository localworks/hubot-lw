CronJob = require('cron').CronJob

module.exports = (robot) ->
  members = [
    'atsushi',
    'honma',
    'kondo',
    'koshika',
    'kuramoto',
    'maesato',
    'meg',
    'mikami',
    'miyoshi',
    'munakata',
    'murokaco',
    'rencou',
    'shimizu',
    'sonoda',
    'takemoto',
    'tominaga',
    'yukihr',
    'orikasa',
    'sakashita',
    'shugyo',
    'watanabe'
  ]

  robot.hear /.*/i, (msg) ->
    if match = msg.message.text.match(/^([a-z0-9_-]+)?\s*((\+|-){2,})$/)
      member = if match[1] in members
                 match[1]
               else
                 null

      amount = if match[2].indexOf('+') == 0
                 parseInt(match[2].length/2)
               else if match[2].indexOf('-') == 0
                 -parseInt(match[2].length/2)


      old_score = robot.brain.get member
      robot.brain.set member, old_score + amount

      if member
        new_score = robot.brain.get member
        msg.send "#{member} #{new_score}pt"
      else
        msg.send '名前ミスってるぞ。笑'

  robot.hear /^score report$/i, (msg) ->
    rankers = orderByScore()

    for ranker in rankers
      msg.send "#{ranker.name} -> #{if ranker.score then ranker.score else 0}pt"

  reportRanking = () ->
    rankers = orderByScore()
    heigh_rankers = rankers[0..4]

    for ranker, index in heigh_rankers
      msg.send room: '#happy', "#{index + 1}位 #{ranker.name} -> #{if ranker.score then ranker.score else 0}pt"

    lowest_ranker = rankers[rankers.length - 1]

    if lowest_ranker.score < 0
      msg.send room: '#happy', "#{lowest_ranker.name} 来週がんばれ"

    resetScore()

  orderByScore = () ->
    score_lists = []

    for member in members
      score_lists.push({ name: member, score: robot.brain.get member })

    score_lists.sort (a, b) ->
      (if a['score'] < b['score'] then 1 else -1)

  resetScore = () ->
    for member in members
      robot.brain.set member, 0

  new CronJob '00 30 10 * * 4', ->
    reportRanking()
