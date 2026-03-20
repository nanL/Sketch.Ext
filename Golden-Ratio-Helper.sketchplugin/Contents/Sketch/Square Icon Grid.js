var helpers = require('./lib-modern')

function onRun(context) {
  try {
    helpers.getSquareIconGridRects(context).forEach(function(rect) {
      helpers.drawSquareIconGrid(rect.parent, rect)
    })
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
