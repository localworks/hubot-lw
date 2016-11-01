const Helper = require('hubot-test-helper')
const co = require('co')
const expect = require('chai').expect
const Promise = require("bluebird");

helper = new Helper('../scripts/search_engine.js')


describe('データベースのテスト', () => {
    let insertUrl = 'http://qiita.com/TeraBytes/private/e221ac3091ba4a6d0a9e'
    let insertTitle = '[まとめ]hubotの活用事例やnpmパッケージ'

    before((done) => {
        this.room = helper.createRoom()

        co(function* () {
            yield this.room.user.say('user', `@hubot search register ${insertUrl}`)
            yield new Promise.delay(2000)
            yield this.room.user.say('user', `@hubot search register ${insertUrl}`)
            yield new Promise.delay(2000)
            yield this.room.user.say('user', `@hubot search query ${insertTitle}`)
            yield new Promise.delay(2000)
            yield this.room.user.say('user', `@hubot search delete ${insertUrl}`)
            yield new Promise.delay(2000)
            yield this.room.user.say('user', `@hubot search delete ${insertUrl}`)
            yield new Promise.delay(2000)
            yield this.room.user.say('user', `@hubot search query ${insertTitle}`)
            yield new Promise.delay(2000)
        }.bind(this)).then((value) => {
            console.log(value);
            done()
        }, (err) => {
            console.error(err.stack);
        });
    })

    afterEach(() => {
        this.room.destroy()
    })

    context('qiita記事の追加・更新・削除', () => {

        it('should register', () => {
            expect(this.room.messages[1]).to.eql(['hubot', `登録しました ${insertUrl}`])
        })

        it('should update', () => {
            expect(this.room.messages[3]).to.eql(['hubot', `更新しました ${insertUrl}`])
        })

        it('should search', () => {
            expect(this.room.messages[5][0]).to.equal('hubot')
            expect(this.room.messages[5][1]).to.have.string(insertTitle)
        })

        it('should delete', () => {
            expect(this.room.messages[7]).to.eql(['hubot', '削除しました'])
            expect(this.room.messages[9]).to.eql(['hubot', '削除するURLは見つかりませんでした'])
            expect(this.room.messages[11][1]).to.not.have.string(insertTitle)
        })
    })
})
