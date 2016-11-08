module.exports = (robot) => {
    robot.respond(/help$/i, (res) => {
        let msg = `deploy : デプロイコマンド
commits : コミット履歴
search : 社内ドキュメント検索（helpは"search help"）
recommend : 社内ドキュメント推薦`

        res.send(msg)
    })
}
