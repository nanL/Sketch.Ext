var helpers = require('./lib-modern')

function onRun(context) {
  try {
    helpers.getTargetRects(context).forEach(function(rect) {
      helpers.drawGrid(rect.parent, 'Golden Grid', rect, 0.382)
    })
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
