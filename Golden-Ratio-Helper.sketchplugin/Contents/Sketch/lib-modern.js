var sketch = require('sketch/dom')
var UI = require('sketch/ui')

var DEFAULT_RATIO = 1.618
var DEFAULT_BORDER_COLOR = '#979797ff'
var DEFAULT_FILL_COLOR = '#00000000'
var SPIRAL_RATIO = 0.293
var DEFAULT_CIRCLE_DIAMETER = 600

function getDocument(context) {
  return sketch.fromNative(context.document)
}

function getEmptySelectionRect() {
  return {
    parent: null,
    x: 0,
    y: 0,
    width: 600,
    height: 600 / DEFAULT_RATIO,
  }
}

function getLayerRect(layer) {
  var isFrameLike = layer.type === 'Artboard' || layer.type === 'Frame' || layer.type === 'Graphic'
  return {
    parent: isFrameLike ? layer : layer.parent,
    x: isFrameLike ? 0 : layer.frame.x,
    y: isFrameLike ? 0 : layer.frame.y,
    width: layer.frame.width,
    height: layer.frame.height,
  }
}

function getTargetRects(context) {
  var document = getDocument(context)
  var selection = document.selectedLayers

  if (!selection || selection.isEmpty) {
    var rect = getEmptySelectionRect()
    rect.parent = document.selectedPage
    return [rect]
  }

  return selection.layers.map(getLayerRect)
}

function getTargetCircleSpecs(context) {
  var document = getDocument(context)
  var selection = document.selectedLayers

  if (!selection || selection.isEmpty) {
    return [{
      parent: document.selectedPage,
      anchorX: DEFAULT_CIRCLE_DIAMETER / 2,
      anchorY: 0,
      baseDiameter: DEFAULT_CIRCLE_DIAMETER,
      includeBase: true,
      includeLarger: false,
      smallCount: 6,
    }]
  }

  return selection.layers.map(function(layer) {
    var rect = getLayerRect(layer)
    var baseDiameter = Math.min(rect.width, rect.height)
    var anchorX = rect.x + rect.width / 2
    var anchorY = rect.y + (rect.height - baseDiameter) / 2

    return {
      parent: rect.parent,
      anchorX: anchorX,
      anchorY: anchorY,
      baseDiameter: baseDiameter,
      includeBase: true,
      includeLarger: true,
      smallCount: 5,
    }
  })
}

function getGuideStyle() {
  return {
    fills: [
      {
        fillType: sketch.Style.FillType.Color,
        color: DEFAULT_FILL_COLOR,
      },
    ],
    borders: [
      {
        fillType: sketch.Style.FillType.Color,
        color: DEFAULT_BORDER_COLOR,
        position: sketch.Style.BorderPosition.Center,
        thickness: 1,
      },
    ],
  }
}

function createGuideGroup(parent, name, rect) {
  return new sketch.Group({
    parent: parent,
    name: name,
    frame: new sketch.Rectangle(rect.x, rect.y, rect.width, rect.height),
  })
}

function finalizeGuideGroup(group) {
  if (group && typeof group.adjustToFit === 'function') {
    group.adjustToFit()
  }
  return group
}

function makeShapePath(parent, name, svgPath) {
  var layer = sketch.ShapePath.fromSVGPath(svgPath)
  layer.parent = parent
  layer.name = name
  layer.style = getGuideStyle()
  return layer
}

function makePolyline(parent, name, segments, closed) {
  var path = segments.map(function(segment, index) {
    var prefix = index === 0 ? 'M' : 'L'
    return prefix + segment.x + ' ' + segment.y
  }).join(' ')

  if (closed) {
    path += ' Z'
  }

  return makeShapePath(parent, name, path)
}

function makeMixedPath(parent, name, commands) {
  var path = commands.map(function(command) {
    return command.type + command.values.join(' ')
  }).join(' ')

  return makeShapePath(parent, name, path)
}

function makeRectangle(parent, name, rect) {
  return new sketch.ShapePath({
    parent: parent,
    name: name,
    frame: new sketch.Rectangle(rect.x, rect.y, rect.width, rect.height),
    shapeType: sketch.ShapePath.ShapeType.Rectangle,
    style: getGuideStyle(),
  })
}

function makeOval(parent, name, rect) {
  return new sketch.ShapePath({
    parent: parent,
    name: name,
    frame: new sketch.Rectangle(rect.x, rect.y, rect.width, rect.height),
    shapeType: sketch.ShapePath.ShapeType.Oval,
    style: getGuideStyle(),
  })
}

function makeGoldenRectangle(parent, rect) {
  return makeRectangle(parent, 'Golden Rectangle', {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.width / DEFAULT_RATIO,
  })
}

function getGoldenSpiralSectionLayout(rect, splitCount) {
  var container = {
    x: 0,
    y: 0,
    width: rect.width,
    height: rect.width / DEFAULT_RATIO,
  }
  var current = {
    x: container.x,
    y: container.y,
    width: container.width,
    height: container.height,
  }
  var sections = []
  var splits = []
  var side
  var mode

  for (var i = 0; i < splitCount; i += 1) {
    side = Math.min(current.width, current.height)
    mode = i % 4

    if (mode === 0) {
      sections.push({ x: current.x, y: current.y, width: side, height: side })
      current = {
        x: current.x + side,
        y: current.y,
        width: current.width - side,
        height: current.height,
      }
      if (current.width > 0) {
        splits.push([
          { x: current.x, y: current.y },
          { x: current.x, y: current.y + current.height },
        ])
      }
    } else if (mode === 1) {
      sections.push({ x: current.x, y: current.y, width: side, height: side })
      current = {
        x: current.x,
        y: current.y + side,
        width: current.width,
        height: current.height - side,
      }
      if (current.height > 0) {
        splits.push([
          { x: current.x, y: current.y },
          { x: current.x + current.width, y: current.y },
        ])
      }
    } else if (mode === 2) {
      sections.push({
        x: current.x + current.width - side,
        y: current.y,
        width: side,
        height: side,
      })
      current = {
        x: current.x,
        y: current.y,
        width: current.width - side,
        height: current.height,
      }
      if (current.width > 0) {
        splits.push([
          { x: current.x + current.width, y: current.y },
          { x: current.x + current.width, y: current.y + current.height },
        ])
      }
    } else {
      sections.push({
        x: current.x,
        y: current.y + current.height - side,
        width: side,
        height: side,
      })
      current = {
        x: current.x,
        y: current.y,
        width: current.width,
        height: current.height - side,
      }
      if (current.height > 0) {
        splits.push([
          { x: current.x, y: current.y + current.height },
          { x: current.x + current.width, y: current.y + current.height },
        ])
      }
    }
  }

  if (current.width > 0 && current.height > 0) {
    sections.push(current)
  }

  return {
    bounds: container,
    sections: sections,
    splits: splits,
  }
}

function drawGrid(parent, name, rect, ratio) {
  var group = createGuideGroup(parent, name, rect)
  var width = rect.width
  var height = rect.height
  var vSection = width * ratio
  var hSection = height * ratio

  makePolyline(group, name, [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ], true)

  makePolyline(group, name, [
    { x: vSection, y: 0 },
    { x: vSection, y: height },
  ])

  makePolyline(group, name, [
    { x: width - vSection, y: 0 },
    { x: width - vSection, y: height },
  ])

  makePolyline(group, name, [
    { x: 0, y: hSection },
    { x: width, y: hSection },
  ])

  makePolyline(group, name, [
    { x: 0, y: height - hSection },
    { x: width, y: height - hSection },
  ])

  return finalizeGuideGroup(group)
}

function drawGoldenTriangle(parent, rect) {
  var name = 'Golden Triangle'
  var group = createGuideGroup(parent, name, rect)
  var width = rect.width
  var height = rect.height
  var selection = width * 0.382

  makePolyline(group, name, [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ], true)

  makePolyline(group, name, [
    { x: 0, y: 0 },
    { x: width, y: height },
  ])

  makePolyline(group, name, [
    { x: 0, y: height },
    { x: selection, y: 0 },
  ])

  makePolyline(group, name, [
    { x: width, y: 0 },
    { x: width - selection, y: height },
  ])

  return finalizeGuideGroup(group)
}

function drawHarmoniousTriangle(parent, rect) {
  var name = 'Harmonious Triangle'
  var group = createGuideGroup(parent, name, rect)
  var width = rect.width
  var height = rect.height
  var angle

  makePolyline(group, name, [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ], true)

  makePolyline(group, name, [
    { x: 0, y: 0 },
    { x: width, y: height },
  ])

  if (height < width) {
    angle = Math.atan2(height, width)
    makePolyline(group, name, [
      { x: 0, y: height },
      { x: height * Math.tan(angle), y: 0 },
    ])
    makePolyline(group, name, [
      { x: width, y: 0 },
      { x: width - height * Math.tan(angle), y: height },
    ])
  } else {
    angle = Math.atan2(width, height)
    makePolyline(group, name, [
      { x: 0, y: height },
      { x: width, y: height - width * Math.tan(angle) },
    ])
    makePolyline(group, name, [
      { x: width, y: 0 },
      { x: 0, y: width * Math.tan(angle) },
    ])
  }

  return finalizeGuideGroup(group)
}

function drawGoldenSpiralSection(parent, rect) {
  var name = 'Golden Spiral Section'
  var group = createGuideGroup(parent, name, rect)
  var layout = getGoldenSpiralSectionLayout(rect, 4)

  makeRectangle(group, name, layout.bounds)
  layout.splits.forEach(function(split) {
    makePolyline(group, name, split)
  })

  return finalizeGuideGroup(group)
}

function drawGoldenSpiralSectionCircle(parent, rect, depth) {
  var name = 'Golden Spiral Section Circle'
  var group = createGuideGroup(parent, name, rect)
  var layout = getGoldenSpiralSectionLayout(rect, depth)

  makeRectangle(group, name, layout.bounds)
  layout.splits.forEach(function(split) {
    makePolyline(group, name, split)
  })
  layout.sections.forEach(function(section) {
    var diameter = Math.min(section.width, section.height)
    makeOval(group, name, {
      x: section.x + (section.width - diameter) / 2,
      y: section.y + (section.height - diameter) / 2,
      width: diameter,
      height: diameter,
    })
  })

  return finalizeGuideGroup(group)
}

function getGoldenRatioCircles(spec) {
  var circles = []
  var diameter = spec.baseDiameter

  if (spec.includeLarger) {
    circles.push({
      name: 'Larger',
      diameter: diameter * DEFAULT_RATIO,
    })
  }

  if (spec.includeBase) {
    circles.push({
      name: 'Base',
      diameter: diameter,
    })
  }

  for (var i = 0; i < spec.smallCount; i += 1) {
    diameter = diameter / DEFAULT_RATIO
    circles.push({
      name: 'Smaller ' + (i + 1),
      diameter: diameter,
    })
  }

  return circles
}

function drawGoldenRatioCircle(parent, spec) {
  var name = 'Golden Ratio Circle'
  var circles = getGoldenRatioCircles(spec)
  var largestDiameter = circles.reduce(function(maximum, circle) {
    return Math.max(maximum, circle.diameter)
  }, 0)
  var group = createGuideGroup(parent, name, {
    x: spec.anchorX - largestDiameter / 2,
    y: spec.anchorY,
    width: largestDiameter,
    height: largestDiameter,
  })

  circles.forEach(function(circle) {
    makeOval(group, circle.name, {
      x: largestDiameter / 2 - circle.diameter / 2,
      y: 0,
      width: circle.diameter,
      height: circle.diameter,
    })
  })

  return finalizeGuideGroup(group)
}

function appendSpiralCurve(commands, start, middle, middleCtrl, end, endCtrl) {
  commands.push({
    type: 'M',
    values: [start.x, start.y],
  })

  commands.push({
    type: 'C',
    values: [start.x, start.y, middleCtrl.x, middleCtrl.y, middle.x, middle.y],
  })
  commands.push({
    type: 'C',
    values: [middle.x, middle.y, endCtrl.x, endCtrl.y, end.x, end.y],
  })
}

function drawGoldenSpiral(parent, rect) {
  var name = 'Golden Sprial'
  var group = createGuideGroup(parent, name, rect)
  var width = rect.width
  var height = width / DEFAULT_RATIO
  var x = 0
  var y = height
  var commands = []
  var segm
  var start
  var middle
  var middleCtrl
  var end
  var endCtrl

  segm = height * SPIRAL_RATIO
  start = { x: x, y: y }
  middle = { x: x + segm, y: y - height + segm }
  middleCtrl = { x: x, y: y - height + segm * 2 }
  end = { x: x + height, y: y - height }
  endCtrl = { x: x + segm * 2, y: y - height }
  appendSpiralCurve(commands, start, middle, middleCtrl, end, endCtrl)

  x = x + height
  y = y - height
  width = width - height
  segm = width * SPIRAL_RATIO
  start = { x: x, y: y }
  middle = { x: x + width - segm, y: y + segm }
  middleCtrl = { x: x + width - 2 * segm, y: y }
  end = { x: x + width, y: y + width }
  endCtrl = { x: x + width, y: y + 2 * segm }
  appendSpiralCurve(commands, start, middle, middleCtrl, end, endCtrl)

  y = y + width
  x = x + width
  height = height - width
  segm = height * SPIRAL_RATIO
  start = { x: x, y: y }
  middle = { x: x - segm, y: y + height - segm }
  middleCtrl = { x: x, y: y + height - 2 * segm }
  end = { x: x - height, y: y + height }
  endCtrl = { x: x - 2 * segm, y: y + height }
  appendSpiralCurve(commands, start, middle, middleCtrl, end, endCtrl)

  y = y + height
  x = x - height
  width = width - height
  segm = width * SPIRAL_RATIO
  start = { x: x, y: y }
  middle = { x: x - width + segm, y: y - segm }
  middleCtrl = { x: x - width + 2 * segm, y: y }
  end = { x: x - width, y: y - width }
  endCtrl = { x: x - width, y: y - 2 * segm }
  appendSpiralCurve(commands, start, middle, middleCtrl, end, endCtrl)

  makeMixedPath(group, name, commands)
  return finalizeGuideGroup(group)
}

function showError(error) {
  var message = error && error.message ? error.message : String(error)
  UI.message('Golden Ratio Helper: ' + message)
}

module.exports = {
  createGuideGroup: createGuideGroup,
  drawGoldenSpiral: drawGoldenSpiral,
  drawGoldenRatioCircle: drawGoldenRatioCircle,
  drawGoldenSpiralSection: drawGoldenSpiralSection,
  drawGoldenSpiralSectionCircle: drawGoldenSpiralSectionCircle,
  drawGoldenTriangle: drawGoldenTriangle,
  drawGrid: drawGrid,
  drawHarmoniousTriangle: drawHarmoniousTriangle,
  finalizeGuideGroup: finalizeGuideGroup,
  getTargetRects: getTargetRects,
  getTargetCircleSpecs: getTargetCircleSpecs,
  makeGoldenRectangle: makeGoldenRectangle,
  makeMixedPath: makeMixedPath,
  makeOval: makeOval,
  makePolyline: makePolyline,
  makeRectangle: makeRectangle,
  showError: showError,
}
