var helpers = require('./lib-modern')

function onRun(context) {
  try {
    helpers.getTargetRects(context).forEach(function(rect) {
      helpers.drawGrid(rect.parent, 'Role Of Thirds', rect, 1 / 3)
    })
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
