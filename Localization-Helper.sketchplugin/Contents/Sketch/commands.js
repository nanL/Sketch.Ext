var sketch = require('sketch/dom')
var UI = require('sketch/ui')
var Settings = require('sketch/settings')
var md5 = require('./md5')
var KEY = 'baiduCredentials'

function toolbar() {
  var key = 'im.nan.Sketch.LocalizationHelper.toolbar'
  var windows = NSThread.mainThread().threadDictionary()
  var existing = windows.objectForKey(key)
  if (existing) { existing.orderFrontRegardless(); return }

  var panel = NSPanel.alloc().initWithContentRect_styleMask_backing_defer(
    NSMakeRect(0, 0, 100, 136),
    NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskUtilityWindow | NSWindowStyleMaskNonactivatingPanel,
    NSBackingStoreBuffered, false)
  var fiber = require('sketch/async').createFiber()
  fiber.onCleanup(function() {
    windows.removeObjectForKey(key)
    panel.orderOut(null)
    panel.close()
  })
  try {
    panel.setTitle('Localization Helper')
    panel.setFloatingPanel(true)
    panel.setHidesOnDeactivate(true)
    panel.setBecomesKeyOnlyIfNeeded(true)
    panel.setReleasedWhenClosed(false)
    panel.setMovableByWindowBackground(true)
    var actions = [
      { title: 'to 简体', handler: toSimplified },
      { title: 'to 繁体', handler: toTraditional },
      { title: 'to 英文', handler: toEnglish }
    ]
    actions.forEach(function(action, index) {
      var button = NSButton.alloc().initWithFrame(NSMakeRect(12, 92 - index * 40, 76, 32))
      button.setTitle(action.title)
      button.setBezelStyle(NSBezelStyleRounded)
      button.setButtonType(NSButtonTypeMomentaryPushIn)
      button.setToolTip('将当前选中的文本图层转换为' + action.title.slice(3))
      button.setCOSJSTargetFunction(function() { action.handler() })
      panel.contentView().addSubview(button)
    })
    panel.standardWindowButton(NSWindowCloseButton).setCOSJSTargetFunction(function() { fiber.cleanup() })
    windows.setObject_forKey(panel, key)
    panel.center()
    panel.orderFrontRegardless()
  } catch (error) {
    fiber.cleanup()
    UI.alert('工具栏打开失败', error.message)
  }
}

function settings() {
  var saved = Settings.settingForKey(KEY) || {}
  var alert = NSAlert.alloc().init()
  alert.setMessageText('百度翻译设置')
  alert.setInformativeText('AppID 和 Secret 仅保存在本机插件设置中。选中文本将发送至百度翻译。')
  alert.addButtonWithTitle('保存')
  alert.addButtonWithTitle('取消')
  var view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, 320, 100))
  var fields = []
  var fieldNames = ['AppID', 'Secret']
  fieldNames.forEach(function(name, index) {
    var y = 65 - index * 50
    var label = NSTextField.labelWithString(name)
    label.setFrame(NSMakeRect(0, y, 65, 24))
    view.addSubview(label)
    var field = (index ? NSSecureTextField : NSTextField).alloc().initWithFrame(NSMakeRect(70, y, 250, 24))
    field.setStringValue(saved[index ? 'secret' : 'appid'] || '')
    view.addSubview(field)
    fields.push(field)
  })
  alert.setAccessoryView(view)
  if (alert.runModal() !== NSAlertFirstButtonReturn) return
  var appid = String(fields[0].stringValue()).trim()
  var secret = String(fields[1].stringValue()).trim()
  if (!appid || !secret) { UI.alert('设置未保存', '请填写 AppID 和 Secret。'); return }
  Settings.setSettingForKey(KEY, { appid: appid, secret: secret })
  UI.message('百度翻译设置已保存')
}

function request(text, from, to, credentials, callback) {
  var salt = String(Date.now()) + String(Math.random()).slice(2)
  var params = { q: text, from: from, to: to, appid: credentials.appid, salt: salt,
    sign: md5(credentials.appid + text + salt + credentials.secret) }
  var body = Object.keys(params).map(function(key) {
    return key + '=' + encodeURIComponent(params[key])
  }).join('&')
  // Poll a subprocess instead of passing JS functions as Objective-C blocks.
  var directory = String(NSTemporaryDirectory()) + 'localization-helper-' + String(NSUUID.UUID().UUIDString())
  var files = NSFileManager.defaultManager()
  if (!files.createDirectoryAtPath_withIntermediateDirectories_attributes_error(directory, true, null, null)) {
    throw new Error('无法创建翻译临时目录。')
  }
  var path = directory + '/response.json'
  var task = NSTask.alloc().init()
  var input = NSPipe.pipe()
  var output
  var timer
  var finished = false
  var disposed = false
  function cleanup() {
    if (disposed) return
    disposed = true
    if (timer) clearTimeout(timer)
    if (task.isRunning()) task.terminate()
    if (output) output.closeFile()
    files.removeItemAtPath_error(directory, null)
  }
  function finish(error, result) {
    if (finished) return
    finished = true
    cleanup()
    callback(error, result)
  }
  try {
    files.createFileAtPath_contents_attributes(path, null, null)
    output = NSFileHandle.fileHandleForWritingAtPath(path)
    task.setLaunchPath('/usr/bin/curl')
    task.setArguments(['--silent', '--fail', '--max-time', '30', '--request', 'POST',
      '--header', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
      '--data-binary', '@-', 'https://fanyi-api.baidu.com/api/trans/vip/translate'])
    task.setStandardInput(input)
    task.setStandardOutput(output)
    task.setStandardError(NSFileHandle.fileHandleWithNullDevice())
    task.launch()
    input.fileHandleForWriting().writeData(NSString.stringWithString(body).dataUsingEncoding(NSUTF8StringEncoding))
    input.fileHandleForWriting().closeFile()
    function poll() {
      if (task.isRunning()) { timer = setTimeout(poll, 100); return }
      var result
      try {
        if (Number(task.terminationStatus()) !== 0) throw new Error('网络请求失败或超时，请检查网络后重试。')
        result = JSON.parse(String(NSString.stringWithContentsOfFile_encoding_error(path, NSUTF8StringEncoding, null)))
        if (result.error_code) throw new Error('百度翻译错误 ' + result.error_code + '，请检查凭证、服务开通状态或调用额度。')
        if (!Array.isArray(result.trans_result) || !result.trans_result.length || result.trans_result.some(function(item) { return typeof item.dst !== 'string' })) {
          throw new Error('百度返回了无效的翻译结果。')
        }
      } catch (error) { finish(error); return }
      finish(null, result.trans_result.map(function(item) { return item.dst }).join('\n'))
    }
    timer = setTimeout(poll, 100)
  } catch (error) {
    finished = true
    cleanup()
    throw error
  }
  return function() { finished = true; cleanup() }
}

function collectTextLayers(selectedLayers) {
  var layers = []
  var seen = []
  function visit(layer) {
    if (seen.indexOf(layer.id) !== -1) return
    seen.push(layer.id)
    if (layer.type === 'Text' && layer.text.trim()) layers.push(layer)
    else if (layer.type === 'Group') layer.layers.forEach(visit)
  }
  selectedLayers.forEach(visit)
  return layers
}

function translate(to) {
  var document = sketch.getSelectedDocument()
  var layers = document ? collectTextLayers(document.selectedLayers.layers) : []
  if (!layers.length) { UI.message('请选择非空文本图层或包含文本的编组'); return }
  var credentials = Settings.settingForKey(KEY)
  if (!credentials || !credentials.appid || !credentials.secret) { settings(); return }
  var jobs = layers.map(function(layer) { return { layer: layer, original: layer.text } })
  var separator = '␞'
  var text = jobs.map(function(job) { return job.original }).join(separator)
  var fiber = require('sketch/async').createFiber()
  var cancelRequest
  fiber.onCleanup(function() { if (cancelRequest) cancelRequest() })
  function fail(error) { UI.alert('翻译失败', error.message); fiber.cleanup() }
  UI.message('正在翻译 ' + jobs.length + ' 个文本图层')
  try {
    cancelRequest = request(text, 'auto', to, credentials, function(error, result) {
      cancelRequest = null
      if (error) { fail(error); return }
      try {
        var results = result.split(separator)
        if (results.length !== jobs.length) {
          throw new Error('译文分段数量与选中文本图层数量不一致，未回填。\n\n原文：\n' + text + '\n\n译文：\n' + result)
        }
        if (jobs.some(function(job) { return !document.getLayerWithID(job.layer.id) || job.layer.text !== job.original })) {
          throw new Error('翻译期间原文已修改或图层已删除，请重新选择后重试。')
        }
        jobs.forEach(function(job, index) { job.layer.text = results[index] })
        UI.message('已转换 ' + jobs.length + ' 个文本图层')
      } catch (failure) { fail(failure); return }
      fiber.cleanup()
    })
  } catch (error) { fail(error) }
}

var toSimplified = function() { translate('zh') }
var toTraditional = function() { translate('cht') }
var toEnglish = function() { translate('en') }
