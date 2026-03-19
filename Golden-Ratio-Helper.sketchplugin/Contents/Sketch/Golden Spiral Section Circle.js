var helpers = require('./lib-modern')
var SECTION_CIRCLE_DEPTH = 8

function onRun(context) {
  try {
    helpers.getTargetRects(context).forEach(function(rect) {
      helpers.drawGoldenSpiralSectionCircle(rect.parent, rect, SECTION_CIRCLE_DEPTH)
    })
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
