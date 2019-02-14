var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator['throw'](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : new P(function(resolve) {
                                              resolve(result.value);
                                            }).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = (this && this.__generator) || function(thisArg, body) {
  var _ = {
    label: 0,
    sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    },
    trys: [],
    ops: []
  },
      f, y, t, g;
  return g = {next: verb(0), 'throw': verb(1), 'return': verb(2)},
         typeof Symbol === 'function' && (g[Symbol.iterator] = function() {
           return this;
         }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError('Generator is already executing.');
    while (_) try {
        if (f = 1,
            y &&
                (t = op[0] & 2 ?
                     y['return'] :
                     op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
                !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return {value: op[1], done: false};
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) &&
                (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5) throw op[1];
    return {value: op[0] ? op[1] : void 0, done: true};
  }
};
(function(factory) {
if (typeof module === 'object' && typeof module.exports === 'object') {
  var v = factory(require, exports);
  if (v !== undefined) module.exports = v;
} else if (typeof define === 'function' && define.amd) {
  define('isbinaryfile/src/index', ['require', 'exports', 'fs', 'util'], factory);
}
})(function(require, exports) {
'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
var fs = require('fs');
var util_1 = require('util');
var statAsync = util_1.promisify(fs.stat);
var openAsync = util_1.promisify(fs.open);
var closeAsync = util_1.promisify(fs.close);
var MAX_BYTES = 512;
function isBinaryFile(file, size) {
  return __awaiter(this, void 0, void 0, function() {
    var stat, fileDescriptor_1, allocBuffer_1;
    return __generator(this, function(_a) {
      switch (_a.label) {
        case 0:
          if (!isString(file)) return [3 /*break*/, 3];
          return [4 /*yield*/, statAsync(file)];
        case 1:
          stat = _a.sent();
          isStatFile(stat);
          return [4 /*yield*/, openAsync(file, 'r')];
        case 2:
          fileDescriptor_1 = _a.sent();
          allocBuffer_1 = Buffer.alloc(MAX_BYTES);
          // Read the file with no encoding for raw buffer access.
          // NB: something is severely wrong with promisify, had to construct my own Promise
          return [
            2 /*return*/, new Promise(function(fulfill, reject) {
              fs.read(
                  fileDescriptor_1, allocBuffer_1, 0, MAX_BYTES, 0, function(err, bytesRead, _) {
                    closeAsync(fileDescriptor_1);
                    if (err) {
                      reject(err);
                    } else {
                      fulfill(isBinaryCheck(allocBuffer_1, bytesRead));
                    }
                  });
            })
          ];
        case 3:
          if (size === undefined) {
            size = file.length;
          }
          return [2 /*return*/, isBinaryCheck(file, size)];
      }
    });
  });
}
exports.isBinaryFile = isBinaryFile;
function isBinaryFileSync(file, size) {
  if (isString(file)) {
    var stat = fs.statSync(file);
    isStatFile(stat);
    var fileDescriptor = fs.openSync(file, 'r');
    var allocBuffer = Buffer.alloc(MAX_BYTES);
    var bytesRead = fs.readSync(fileDescriptor, allocBuffer, 0, MAX_BYTES, 0);
    fs.closeSync(fileDescriptor);
    return isBinaryCheck(allocBuffer, bytesRead);
  } else {
    if (size === undefined) {
      size = file.length;
    }
    return isBinaryCheck(file, size);
  }
}
exports.isBinaryFileSync = isBinaryFileSync;
function isBinaryCheck(fileBuffer, bytesRead) {
  // empty file. no clue what it is.
  if (bytesRead === 0) {
    return false;
  }
  var suspiciousBytes = 0;
  var totalBytes = Math.min(bytesRead, MAX_BYTES);
  // UTF-8 BOM
  if (bytesRead >= 3 && fileBuffer[0] === 0xef && fileBuffer[1] === 0xbb &&
      fileBuffer[2] === 0xbf) {
    return false;
  }
  // UTF-32 BOM
  if (bytesRead >= 4 && fileBuffer[0] === 0x00 && fileBuffer[1] === 0x00 &&
      fileBuffer[2] === 0xfe && fileBuffer[3] === 0xff) {
    return false;
  }
  // UTF-32 LE BOM
  if (bytesRead >= 4 && fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe &&
      fileBuffer[2] === 0x00 && fileBuffer[3] === 0x00) {
    return false;
  }
  // GB BOM
  if (bytesRead >= 4 && fileBuffer[0] === 0x84 && fileBuffer[1] === 0x31 &&
      fileBuffer[2] === 0x95 && fileBuffer[3] === 0x33) {
    return false;
  }
  if (totalBytes >= 5 && fileBuffer.slice(0, 5).toString() === '%PDF-') {
    /* PDF. This is binary. */
    return true;
  }
  // UTF-16 BE BOM
  if (bytesRead >= 2 && fileBuffer[0] === 0xfe && fileBuffer[1] === 0xff) {
    return false;
  }
  // UTF-16 LE BOM
  if (bytesRead >= 2 && fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe) {
    return false;
  }
  for (var i = 0; i < totalBytes; i++) {
    if (fileBuffer[i] === 0) {
      // NULL byte--it's binary!
      return true;
    } else if (
        (fileBuffer[i] < 7 || fileBuffer[i] > 14) && (fileBuffer[i] < 32 || fileBuffer[i] > 127)) {
      // UTF-8 detection
      if (fileBuffer[i] > 193 && fileBuffer[i] < 224 && i + 1 < totalBytes) {
        i++;
        if (fileBuffer[i] > 127 && fileBuffer[i] < 192) {
          continue;
        }
      } else if (fileBuffer[i] > 223 && fileBuffer[i] < 240 && i + 2 < totalBytes) {
        i++;
        if (fileBuffer[i] > 127 && fileBuffer[i] < 192 && fileBuffer[i + 1] > 127 &&
            fileBuffer[i + 1] < 192) {
          i++;
          continue;
        }
      }
      suspiciousBytes++;
      // Read at least 32 fileBuffer before making a decision
      if (i > 32 && (suspiciousBytes * 100) / totalBytes > 10) {
        return true;
      }
    }
  }
  if ((suspiciousBytes * 100) / totalBytes > 10) {
    return true;
  }
  return false;
}
function isString(x) {
  return typeof x === 'string';
}
function isStatFile(stat) {
  if (!stat.isFile()) {
    throw new Error('Path provided was not a file!');
  }
}
});
//#
//sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL2dqdG9yaWtpYW4vaXNCaW5hcnlGaWxlL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUEsdUJBQXlCO0lBQ3pCLDZCQUErQjtJQUUvQixJQUFNLFNBQVMsR0FBRyxnQkFBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxJQUFNLFNBQVMsR0FBRyxnQkFBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxJQUFNLFVBQVUsR0FBRyxnQkFBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV2QyxJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUE7SUFFckIsU0FBc0IsWUFBWSxDQUFDLElBQXFCLEVBQUUsSUFBYTs7Ozs7OzZCQUNqRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQWQsd0JBQWM7d0JBQ0gscUJBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFBOzt3QkFBNUIsSUFBSSxHQUFHLFNBQXFCO3dCQUVsQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBRU0scUJBQU0sU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBQTs7d0JBQTNDLG1CQUFpQixTQUEwQjt3QkFFM0MsZ0JBQWMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFFNUMsd0RBQXdEO3dCQUN4RCxrRkFBa0Y7d0JBQ2xGLHNCQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07Z0NBQ2pDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWMsRUFBRSxhQUFXLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsVUFBQyxHQUFHLEVBQUUs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O0lBRUQsU0FBUyxRQUFRLENBQUMsQ0FBTTtRQUN0QixPQUFPLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQztJQUMvQixDQUFDO0lBRUQsU0FBUyxVQUFVLENBQUMsSUFBYztRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQUU7SUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcblxuY29uc3Qgc3RhdEFzeW5jID0gcHJvbWlzaWZ5KGZzLnN0YXQpO1xuY29uc3Qgb3BlbkFzeW5jID0gcHJvbWlzaWZ5KGZzLm9wZW4pO1xuY29uc3QgY2xvc2VBc3luYyA9IHByb21pc2lmeShmcy5jbG9zZSk7XG5cbmNvbnN0IE1BWF9CWVRFUyA9IDUxMlxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNCaW5hcnlGaWxlKGZpbGU6IHN0cmluZyB8IEJ1ZmZlciwgc2l6ZT86IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBpZiAoaXNTdHJpbmcoZmlsZSkpIHtcbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgc3RhdEFzeW5jKGZpbGUpO1xuXG4gICAgaXNTdGF0RmlsZShzdGF0KTtcblxuICAgIGNvbnN0IGZpbGVEZXNjcmlwdG9yID0gYXdhaXQgb3BlbkFzeW5jKGZpbGUsICdyJyk7XG5cbiAgICBjb25zdCBhbGxvY0J1ZmZlciA9IEJ1ZmZlci5hbGxvYyhNQVhfQllURVMpO1xuXG4gICAgLy8gUmVhZCB0aGUgZmlsZSB3aXRoIG5vIGVuY29kaW5nIGZvciByYXcgYnVmZmVyIGFjY2Vzcy5cbiAgICAvLyBOQjogc29tZXRoaW5nIGlzIHNldmVyZWx5IHdyb25nIHdpdGggcHJvbWlzaWZ5LCBoYWQgdG8gY29uc3RydWN0IG15IG93biBQcm9taXNlXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdWxmaWxsLCByZWplY3QpID0+IHtcbiAgICAgIGZzLnJlYWQoZmlsZURlc2NyaXB0b3IsIGFsbG9jQnVmZmVyLCAwLCBNQVhfQllURVMsIDAsIChlcnIsIGJ5dGVzUmVhZCwgXykgPT4ge1xuICAgICAgICBjbG9zZUFzeW5jKGZpbGVEZXNjcmlwdG9yKTtcbiAgICAgICAgaWYgKGVycikgeyByZWplY3QoZXJyKSB9XG4gICAgICAgIGVsc2UgeyBmdWxmaWxsKGlzQmluYXJ5Q2hlY2soYWxsb2NCdWZmZXIsIGJ5dGVzUmVhZCkpOyB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICBlbHNlIHtcbiAgICBpZiAoc2l6ZSA9PT0gdW5kZWZpbmVkKSB7IHNpemUgPSBmaWxlLmxlbmd0aDsgfVxuICAgIHJldHVybiBpc0JpbmFyeUNoZWNrKGZpbGUsIHNpemUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0JpbmFyeUZpbGVTeW5jKGZpbGU6IHN0cmluZyB8IEJ1ZmZlciwgc2l6ZT86IG51bWJlcik6IGJvb2xlYW4ge1xuICBpZiAoaXNTdHJpbmcoZmlsZSkpIHtcbiAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZSk7XG5cbiAgICBpc1N0YXRGaWxlKHN0YXQpO1xuXG4gICAgY29uc3QgZmlsZURlc2NyaXB0b3IgPSBmcy5vcGVuU3luYyhmaWxlLCAncicpO1xuXG4gICAgY29uc3QgYWxsb2NCdWZmZXIgPSBCdWZmZXIuYWxsb2MoTUFYX0JZVEVTKTtcblxuICAgIGNvbnN0IGJ5dGVzUmVhZCA9IGZzLnJlYWRTeW5jKGZpbGVEZXNjcmlwdG9yLCBhbGxvY0J1ZmZlciwgMCwgTUFYX0JZVEVTLCAwKTtcbiAgICBmcy5jbG9zZVN5bmMoZmlsZURlc2NyaXB0b3IpO1xuXG4gICAgcmV0dXJuIGlzQmluYXJ5Q2hlY2soYWxsb2NCdWZmZXIsIGJ5dGVzUmVhZCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHNpemUgPT09IHVuZGVmaW5lZCkgeyBzaXplID0gZmlsZS5sZW5ndGg7IH1cbiAgICByZXR1cm4gaXNCaW5hcnlDaGVjayhmaWxlLCBzaXplKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0JpbmFyeUNoZWNrKGZpbGVCdWZmZXI6IEJ1ZmZlciwgYnl0ZXNSZWFkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgLy8gZW1wdHkgZmlsZS4gbm8gY2x1ZSB3aGF0IGl0IGlzLlxuICBpZiAoYnl0ZXNSZWFkID09PSAwKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIGxldCBzdXNwaWNpb3VzQnl0ZXMgPSAwO1xuICBjb25zdCB0b3RhbEJ5dGVzID0gTWF0aC5taW4oYnl0ZXNSZWFkLCBNQVhfQllURVMpO1xuXG4gIC8vIFVURi04IEJPTVxuICBpZiAoYnl0ZXNSZWFkID49IDMgJiYgZmlsZUJ1ZmZlclswXSA9PT0gMHhlZiAmJiBmaWxlQnVmZmVyWzFdID09PSAweGJiICYmIGZpbGVCdWZmZXJbMl0gPT09IDB4YmYpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBVVEYtMzIgQk9NXG4gIGlmIChieXRlc1JlYWQgPj0gNCAmJiBmaWxlQnVmZmVyWzBdID09PSAweDAwICYmIGZpbGVCdWZmZXJbMV0gPT09IDB4MDAgJiYgZmlsZUJ1ZmZlclsyXSA9PT0gMHhmZSAmJiBmaWxlQnVmZmVyWzNdID09PSAweGZmKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVVRGLTMyIExFIEJPTVxuICBpZiAoYnl0ZXNSZWFkID49IDQgJiYgZmlsZUJ1ZmZlclswXSA9PT0gMHhmZiAmJiBmaWxlQnVmZmVyWzFdID09PSAweGZlICYmIGZpbGVCdWZmZXJbMl0gPT09IDB4MDAgJiYgZmlsZUJ1ZmZlclszXSA9PT0gMHgwMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEdCIEJPTVxuICBpZiAoYnl0ZXNSZWFkID49IDQgJiYgZmlsZUJ1ZmZlclswXSA9PT0gMHg4NCAmJiBmaWxlQnVmZmVyWzFdID09PSAweDMxICYmIGZpbGVCdWZmZXJbMl0gPT09IDB4OTUgJiYgZmlsZUJ1ZmZlclszXSA9PT0gMHgzMykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0b3RhbEJ5dGVzID49IDUgJiYgZmlsZUJ1ZmZlci5zbGljZSgwLCA1KS50b1N0cmluZygpID09PSAnJVBERi0nKSB7XG4gICAgLyogUERGLiBUaGlzIGlzIGJpbmFyeS4gKi9cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFVURi0xNiBCRSBCT01cbiAgaWYgKGJ5dGVzUmVhZCA+PSAyICYmIGZpbGVCdWZmZXJbMF0gPT09IDB4ZmUgJiYgZmlsZUJ1ZmZlclsxXSA9PT0gMHhmZikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFVURi0xNiBMRSBCT01cbiAgaWYgKGJ5dGVzUmVhZCA+PSAyICYmIGZpbGVCdWZmZXJbMF0gPT09IDB4ZmYgJiYgZmlsZUJ1ZmZlclsxXSA9PT0gMHhmZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWxCeXRlczsgaSsrKSB7XG4gICAgaWYgKGZpbGVCdWZmZXJbaV0gPT09IDApIHtcbiAgICAgIC8vIE5VTEwgYnl0ZS0taXQncyBiaW5hcnkhXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoKGZpbGVCdWZmZXJbaV0gPCA3IHx8IGZpbGVCdWZmZXJbaV0gPiAxNCkgJiYgKGZpbGVCdWZmZXJbaV0gPCAzMiB8fCBmaWxlQnVmZmVyW2ldID4gMTI3KSkge1xuICAgICAgLy8gVVRGLTggZGV0ZWN0aW9uXG4gICAgICBpZiAoZmlsZUJ1ZmZlcltpXSA+IDE5MyAmJiBmaWxlQnVmZmVyW2ldIDwgMjI0ICYmIGkgKyAxIDwgdG90YWxCeXRlcykge1xuICAgICAgICBpKys7XG4gICAgICAgIGlmIChmaWxlQnVmZmVyW2ldID4gMTI3ICYmIGZpbGVCdWZmZXJbaV0gPCAxOTIpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZmlsZUJ1ZmZlcltpXSA+IDIyMyAmJiBmaWxlQnVmZmVyW2ldIDwgMjQwICYmIGkgKyAyIDwgdG90YWxCeXRlcykge1xuICAgICAgICBpKys7XG4gICAgICAgIGlmIChmaWxlQnVmZmVyW2ldID4gMTI3ICYmIGZpbGVCdWZmZXJbaV0gPCAxOTIgJiYgZmlsZUJ1ZmZlcltpICsgMV0gPiAxMjcgJiYgZmlsZUJ1ZmZlcltpICsgMV0gPCAxOTIpIHtcbiAgICAgICAgICBpKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3VzcGljaW91c0J5dGVzKys7XG4gICAgICAvLyBSZWFkIGF0IGxlYXN0IDMyIGZpbGVCdWZmZXIgYmVmb3JlIG1ha2luZyBhIGRlY2lzaW9uXG4gICAgICBpZiAoaSA+IDMyICYmIChzdXNwaWNpb3VzQnl0ZXMgKiAxMDApIC8gdG90YWxCeXRlcyA+IDEwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICgoc3VzcGljaW91c0J5dGVzICogMTAwKSAvIHRvdGFsQnl0ZXMgPiAxMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBpc1N0cmluZyh4OiBhbnkpOiB4IGlzIHN0cmluZyB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIjtcbn1cblxuZnVuY3Rpb24gaXNTdGF0RmlsZShzdGF0OiBmcy5TdGF0cyk6IHZvaWQge1xuICBpZiAoIXN0YXQuaXNGaWxlKCkpIHsgdGhyb3cgbmV3IEVycm9yKGBQYXRoIHByb3ZpZGVkIHdhcyBub3QgYSBmaWxlIWApOyB9XG59XG4iXX0=