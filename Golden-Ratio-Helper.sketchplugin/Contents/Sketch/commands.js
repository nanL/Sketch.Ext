var sketch = require('sketch/dom')
var helpers = require('./drawingline')

var GOLDEN_RATIO = 1.618
var SECTION_CIRCLE_DEPTH = 8

function forTargetRects(context, runner) {
  helpers.getTargetRects(context).forEach(function(rect) {
    runner(rect)
  })
}

function forSquareIconGridRects(context, runner) {
  helpers.getSquareIconGridRects(context).forEach(function(rect) {
    runner(rect)
  })
}

function forTargetCircleSpecs(context, runner) {
  helpers.getTargetCircleSpecs(context).forEach(function(spec) {
    runner(spec)
  })
}

function runRoleOfThirds(context) {
  forTargetRects(context, function(rect) {
    helpers.drawGrid(rect.parent, 'Role Of Thirds', rect, 1 / 3)
  })
}

function runGoldenGrid(context) {
  forTargetRects(context, function(rect) {
    helpers.drawGrid(rect.parent, 'Golden Grid', rect, 0.382)
  })
}

function runSquareIconGrid(context) {
  forSquareIconGridRects(context, function(rect) {
    helpers.drawSquareIconGrid(rect.parent, rect)
  })
}

function runGoldenRectangle(context) {
  forTargetRects(context, function(rect) {
    helpers.makeGoldenRectangle(rect.parent, rect)
  })
}

function runGoldenRatioCircle(context) {
  forTargetCircleSpecs(context, function(spec) {
    helpers.drawGoldenRatioCircle(spec.parent, spec)
  })
}

function runGoldenLineHeight(context) {
  var nativeDocument = context.document
  var document = sketch.fromNative(nativeDocument)
  var selection = document.selectedLayers

  if (!selection || selection.isEmpty) {
    nativeDocument.showMessage('Please select a text layer.')
    return
  }

  var textLayers = selection.layers.filter(function(layer) {
    return layer.type === 'Text'
  })

  if (textLayers.length === 0) {
    nativeDocument.showMessage('Please select a text layer.')
    return
  }

  textLayers.forEach(function(textLayer) {
    var nativeTextLayer = textLayer.sketchObject
    var fontSize = nativeTextLayer.fontSize()
    var textWidth = textLayer.frame.width
    var lineHeight = fontSize * (
      GOLDEN_RATIO - (1 / (2 * GOLDEN_RATIO)) * (1 - textWidth / ((fontSize * GOLDEN_RATIO) * (fontSize * GOLDEN_RATIO)))
    )
    var goldenLineHeight = Math.round(lineHeight)

    nativeTextLayer.setLineHeight(goldenLineHeight)
  })
}

function runGoldenSpiral(context) {
  forTargetRects(context, function(rect) {
    helpers.drawGoldenSpiral(rect.parent, rect)
  })
}

function runGoldenSpiralSection(context) {
  forTargetRects(context, function(rect) {
    helpers.drawGoldenSpiralSection(rect.parent, rect)
  })
}

function runGoldenSpiralSectionCircle(context) {
  forTargetRects(context, function(rect) {
    helpers.drawGoldenSpiralSectionCircle(rect.parent, rect, SECTION_CIRCLE_DEPTH)
  })
}

function runGoldenTriangle(context) {
  forTargetRects(context, function(rect) {
    helpers.drawGoldenTriangle(rect.parent, rect)
  })
}

function runHarmoniousTriangle(context) {
  forTargetRects(context, function(rect) {
    helpers.drawHarmoniousTriangle(rect.parent, rect)
  })
}

function runAbout() {
  NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString('https://github.com/nanL/Sketch.Ext'))
}

module.exports = {
  about: runAbout,
  golden_grid: runGoldenGrid,
  golden_line_height: runGoldenLineHeight,
  golden_ratio_circle: runGoldenRatioCircle,
  golden_rectangle: runGoldenRectangle,
  golden_spiral: runGoldenSpiral,
  golden_spiral_section: runGoldenSpiralSection,
  golden_spiral_section_circle: runGoldenSpiralSectionCircle,
  golden_triangle: runGoldenTriangle,
  harmonious_triangle: runHarmoniousTriangle,
  role_of_thirds: runRoleOfThirds,
  square_icon_grid: runSquareIconGrid,
}
