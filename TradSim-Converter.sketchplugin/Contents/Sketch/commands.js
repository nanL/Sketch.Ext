var sketch = require('sketch/dom')
var Settings = require('sketch/settings')

var dictionaryCache = {}
var sortedPhraseCache = {}
var CONVERSION_MODE_KEY = 'conversionMode'
var PHRASE_MODE = 'phrase'
var CHAR_MODE = 'char'

function readTextFile(path) {
  var contents = NSString.stringWithContentsOfFile_encoding_error(path, NSUTF8StringEncoding, null)

  if (!contents) {
    throw new Error('Cannot read dictionary: ' + path)
  }

  return String(contents)
}

function loadDictionary(context, name) {
  if (!dictionaryCache[name]) {
    var dictionaryUrl = context.plugin.urlForResourceNamed('dict/' + name + '.json')

    if (!dictionaryUrl) {
      throw new Error('Cannot locate dictionary: ' + name)
    }

    var path = String(dictionaryUrl.path())
    dictionaryCache[name] = JSON.parse(readTextFile(path))
  }

  return dictionaryCache[name]
}

function getSortedPhraseEntries(context, name) {
  if (!sortedPhraseCache[name]) {
    var dictionary = loadDictionary(context, name)

    sortedPhraseCache[name] = Object.keys(dictionary)
      .sort(function(a, b) {
        return b.length - a.length
      })
      .map(function(key) {
        return [key, dictionary[key]]
      })
  }

  return sortedPhraseCache[name]
}

function replaceAll(text, source, target) {
  return text.split(source).join(target)
}

function applyPhraseDictionary(context, text, name) {
  return getSortedPhraseEntries(context, name).reduce(function(currentText, entry) {
    if (currentText.indexOf(entry[0]) === -1) {
      return currentText
    }

    return replaceAll(currentText, entry[0], entry[1])
  }, text)
}

function applyCharDictionary(context, text, name) {
  var dictionary = loadDictionary(context, name)
  var converted = ''

  for (var i = 0; i < text.length; i += 1) {
    var character = text.charAt(i)
    converted += dictionary[character] || character
  }

  return converted
}

function getConversionMode() {
  var mode = Settings.settingForKey(CONVERSION_MODE_KEY)

  return mode === CHAR_MODE ? CHAR_MODE : PHRASE_MODE
}

function getConversionModeLabel(mode) {
  return mode === CHAR_MODE ? '按字转换' : '按词转换'
}

function setConversionMode(context, mode) {
  Settings.setSettingForKey(CONVERSION_MODE_KEY, mode)
  context.document.showMessage('当前转换模式：' + getConversionModeLabel(mode))
}

function toggleConversionMode(context) {
  var nextMode = getConversionMode() === CHAR_MODE ? PHRASE_MODE : CHAR_MODE
  setConversionMode(context, nextMode)
}

function convertText(context, text, type, mode) {
  var charName = type + '-char'

  if (mode === CHAR_MODE) {
    return applyCharDictionary(context, text, charName)
  }

  var phraseName = type + '-phrase'
  var phraseConverted = applyPhraseDictionary(context, text, phraseName)

  return applyCharDictionary(context, phraseConverted, charName)
}

function collectTextLayers(layers, textLayers) {
  layers.forEach(function(layer) {
    if (layer.type === 'Text') {
      textLayers.push(layer)
      return
    }

    if (layer.layers) {
      collectTextLayers(layer.layers, textLayers)
    }
  })

  return textLayers
}

function getTextLayersToConvert(context) {
  var document = sketch.fromNative(context.document)
  var selection = document.selectedLayers

  if (!selection || selection.isEmpty) {
    return {
      layers: collectTextLayers(document.selectedPage.layers, []),
      scope: 'page',
    }
  }

  return {
    layers: selection.layers.filter(function(layer) {
      return layer.type === 'Text'
    }),
    scope: 'selection',
  }
}

function convertSelectedTextLayers(context, type) {
  var target = getTextLayersToConvert(context)
  var textLayers = target.layers
  var mode = getConversionMode()

  if (textLayers.length === 0) {
    if (target.scope === 'page') {
      context.document.showMessage('No text layers found on the current page.')
    } else {
      context.document.showMessage('Please select one or more text layers.')
    }

    return
  }

  textLayers.forEach(function(textLayer) {
    textLayer.text = convertText(context, textLayer.text, type, mode)
  })

  context.document.showMessage('Converted ' + textLayers.length + ' text layer(s) with ' + getConversionModeLabel(mode) + '.')
}

function simplifiedToTraditional(context) {
  convertSelectedTextLayers(context, 's2t')
}

function traditionalToSimplified(context) {
  convertSelectedTextLayers(context, 't2s')
}

module.exports = {
  simplified_to_traditional: simplifiedToTraditional,
  toggle_conversion_mode: toggleConversionMode,
  traditional_to_simplified: traditionalToSimplified,
  _convertText: convertText,
}
