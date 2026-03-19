var sketch = require('sketch/dom')

function onRun(context) {
  var nativeDocument = context.document
  var document = sketch.fromNative(nativeDocument)
  var selection = document.selectedLayers
  var ratio = 1.618

  try {
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
        ratio - (1 / (2 * ratio)) * (1 - textWidth / ((fontSize * ratio) * (fontSize * ratio)))
      )
      var goldenLineHeight = Math.round(lineHeight)

      nativeTextLayer.setLineHeight(goldenLineHeight)
    })
  } catch (error) {
    nativeDocument.showMessage('Failed to apply golden line height.')
    throw error
  }
}
