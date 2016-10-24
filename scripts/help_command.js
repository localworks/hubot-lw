"use strict";

module.exports = function (robot) {
    robot.respond(/help/i, function (res) {
        var msg = "hubot deploy : \u30C7\u30D7\u30ED\u30A4\u30B3\u30DE\u30F3\u30C9\nhubot commits : \u30B3\u30DF\u30C3\u30C8\u5C65\u6B74\nhubot search : \u793E\u5185\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u691C\u7D22\uFF08help\u306F\"hubot search help\"\uFF09";

        res.send(msg);
    });
};