function update(source) {
  var webhookUrl = 'https://hubot-lw.herokuapp.com/google-sites/webhook'

  var options = {
    method: 'POST',
    payload: {
      payload: JSON.stringify(source)
    }
  }

  UrlFetchApp.fetch(webhookUrl, options)
}

function getAncestorTitle(page) {
  var parent = (page.getParent()) ? page.getParent() : ""
  while (parent && parent.getParent()) {
    parent = parent.getParent()
  }
  parent = (parent) ? parent.getTitle() : parent

  return parent
}

function myFunction() {
  var site = SitesApp.getSiteByUrl('https://sites.google.com/a/localworks.jp/admin-manual');
  var matches = site.getAllDescendants()

  for(var i in matches) {
    Logger.log(matches[i].getName());
    Logger.log(matches[i].getTextContent());

    var title = matches[i].getTitle()
    var ancestor = getAncestorTitle(matches[i])
    var title = (ancestor) ? ancestor + " > " + title : title

    Utilities.sleep(1500);

    update({
      id: matches[i].getName(),
      title: title,
      url: matches[i].getUrl(),
      article: matches[i].getTextContent().replace(/\n\n+/g, '\n')
    })
  }
}
