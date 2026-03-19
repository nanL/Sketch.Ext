var helpers = require('./lib-modern')

function onRun(context) {
  try {
    helpers.getTargetCircleSpecs(context).forEach(function(spec) {
      helpers.drawGoldenRatioCircle(spec.parent, spec)
    })
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
