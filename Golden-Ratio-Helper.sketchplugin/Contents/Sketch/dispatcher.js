var helpers = require('./drawingline')
var commands = require('./commands')

function getCommandIdentifier(context) {
  if (context && context.command) {
    if (typeof context.command.identifier === 'function') {
      return String(context.command.identifier())
    }

    if (context.command.identifier) {
      return String(context.command.identifier)
    }
  }

  return null
}

function onRun(context) {
  var identifier = getCommandIdentifier(context)
  var command = identifier ? commands[identifier] : null

  try {
    if (!command) {
      throw new Error('Unsupported command: ' + (identifier || 'unknown'))
    }

    command(context)
  } catch (error) {
    helpers.showError(error)
    throw error
  }
}
