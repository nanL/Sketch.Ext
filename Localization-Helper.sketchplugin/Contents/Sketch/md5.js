// MD5 over UTF-8, used by Baidu's request signature protocol.
module.exports = function md5(text) {
  var bytes = unescape(encodeURIComponent(text))
  var words = []
  var length = bytes.length
  var size = (((length + 8) >>> 6) + 1) * 16
  var i
  for (i = 0; i < size; i++) words[i] = 0
  for (i = 0; i < length; i++) words[i >>> 2] |= bytes.charCodeAt(i) << ((i % 4) * 8)
  words[length >>> 2] |= 0x80 << ((length % 4) * 8)
  words[size - 2] = (length * 8) | 0
  words[size - 1] = Math.floor(length / 0x20000000)
  var state = [0x67452301, -0x10325477, -0x67452302, 0x10325476]
  var shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  for (var offset = 0; offset < size; offset += 16) {
    var a = state[0], b = state[1], c = state[2], d = state[3]
    for (i = 0; i < 64; i++) {
      var round = i >>> 4
      var f, index
      if (round === 0) { f = (b & c) | (~b & d); index = i }
      else if (round === 1) { f = (d & b) | (~d & c); index = (5 * i + 1) % 16 }
      else if (round === 2) { f = b ^ c ^ d; index = (3 * i + 5) % 16 }
      else { f = c ^ (b | ~d); index = (7 * i) % 16 }
      var sum = (a + f + words[offset + index] + Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000)) | 0
      var shift = shifts[round * 4 + i % 4]
      var next = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0
      a = d; d = c; c = b; b = next
    }
    state[0] = (state[0] + a) | 0
    state[1] = (state[1] + b) | 0
    state[2] = (state[2] + c) | 0
    state[3] = (state[3] + d) | 0
  }
  return state.map(function(word) {
    var hex = ''
    for (var j = 0; j < 4; j++) hex += ('0' + ((word >>> (j * 8)) & 255).toString(16)).slice(-2)
    return hex
  }).join('')
}
