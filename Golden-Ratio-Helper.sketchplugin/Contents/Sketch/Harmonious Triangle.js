var helpers = require('./lib-modern')

function onRun(context) {
  try {
    helpers.getTargetRects(context).forEach(function(rect) {
      helpers.drawHarmoniousTriangle(rect.parent, rect)
    })
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
