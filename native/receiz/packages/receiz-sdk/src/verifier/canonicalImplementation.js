import { recognizeReceizGroth16Structure } from "./groth16.js";
import { ReceizProtocolLimitError, assertReceizRuntimeMaterializationAvailable, createReceizArchiveVerificationGuard, detectReceizRecursiveArchiveFormat, receizProtocolOperationalDenial } from "../verificationLimits.ts";
const RECEIZ_V113_CANONICAL_ARCHIVE_GUARD_REVISION = "receiz.canonical-archive-guard.v113.2";
void RECEIZ_V113_CANONICAL_ARCHIVE_GUARD_REVISION;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b2) => (typeof require !== "undefined" ? require : a)[b2]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/dist/jszip.min.js
var require_jszip_min = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/dist/jszip.min.js"(exports, module) {
    "use strict";
    !(function(e) {
      if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();
      else if ("function" == typeof define && define.amd) define([], e);
      else {
        ("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this).JSZip = e();
      }
    })(function() {
      return (function s(a, o, h) {
        function u(r, e2) {
          if (!o[r]) {
            if (!a[r]) {
              var t = "function" == typeof __require && __require;
              if (!e2 && t) return t(r, true);
              if (l) return l(r, true);
              var n = new Error("Cannot find module '" + r + "'");
              throw n.code = "MODULE_NOT_FOUND", n;
            }
            var i = o[r] = { exports: {} };
            a[r][0].call(i.exports, function(e3) {
              var t2 = a[r][1][e3];
              return u(t2 || e3);
            }, i, i.exports, s, a, o, h);
          }
          return o[r].exports;
        }
        for (var l = "function" == typeof __require && __require, e = 0; e < h.length; e++) u(h[e]);
        return u;
      })({ 1: [function(e, t, r) {
        "use strict";
        var d = e("./utils"), c = e("./support"), p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        r.encode = function(e2) {
          for (var t2, r2, n, i, s, a, o, h = [], u = 0, l = e2.length, f = l, c2 = "string" !== d.getTypeOf(e2); u < e2.length; ) f = l - u, n = c2 ? (t2 = e2[u++], r2 = u < l ? e2[u++] : 0, u < l ? e2[u++] : 0) : (t2 = e2.charCodeAt(u++), r2 = u < l ? e2.charCodeAt(u++) : 0, u < l ? e2.charCodeAt(u++) : 0), i = t2 >> 2, s = (3 & t2) << 4 | r2 >> 4, a = 1 < f ? (15 & r2) << 2 | n >> 6 : 64, o = 2 < f ? 63 & n : 64, h.push(p.charAt(i) + p.charAt(s) + p.charAt(a) + p.charAt(o));
          return h.join("");
        }, r.decode = function(e2) {
          var t2, r2, n, i, s, a, o = 0, h = 0, u = "data:";
          if (e2.substr(0, u.length) === u) throw new Error("Invalid base64 input, it looks like a data url.");
          var l, f = 3 * (e2 = e2.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
          if (e2.charAt(e2.length - 1) === p.charAt(64) && f--, e2.charAt(e2.length - 2) === p.charAt(64) && f--, f % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
          for (l = c.uint8array ? new Uint8Array(0 | f) : new Array(0 | f); o < e2.length; ) t2 = p.indexOf(e2.charAt(o++)) << 2 | (i = p.indexOf(e2.charAt(o++))) >> 4, r2 = (15 & i) << 4 | (s = p.indexOf(e2.charAt(o++))) >> 2, n = (3 & s) << 6 | (a = p.indexOf(e2.charAt(o++))), l[h++] = t2, 64 !== s && (l[h++] = r2), 64 !== a && (l[h++] = n);
          return l;
        };
      }, { "./support": 30, "./utils": 32 }], 2: [function(e, t, r) {
        "use strict";
        var n = e("./external"), i = e("./stream/DataWorker"), s = e("./stream/Crc32Probe"), a = e("./stream/DataLengthProbe");
        function o(e2, t2, r2, n2, i2) {
          this.compressedSize = e2, this.uncompressedSize = t2, this.crc32 = r2, this.compression = n2, this.compressedContent = i2;
        }
        o.prototype = { getContentWorker: function() {
          var e2 = new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")), t2 = this;
          return e2.on("end", function() {
            if (this.streamInfo.data_length !== t2.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
          }), e2;
        }, getCompressedWorker: function() {
          return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
        } }, o.createWorkerFrom = function(e2, t2, r2) {
          return e2.pipe(new s()).pipe(new a("uncompressedSize")).pipe(t2.compressWorker(r2)).pipe(new a("compressedSize")).withStreamInfo("compression", t2);
        }, t.exports = o;
      }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(e, t, r) {
        "use strict";
        var n = e("./stream/GenericWorker");
        r.STORE = { magic: "\0\0", compressWorker: function() {
          return new n("STORE compression");
        }, uncompressWorker: function() {
          return new n("STORE decompression");
        } }, r.DEFLATE = e("./flate");
      }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(e, t, r) {
        "use strict";
        var n = e("./utils");
        var o = (function() {
          for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
            e2 = r2;
            for (var n2 = 0; n2 < 8; n2++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
            t2[r2] = e2;
          }
          return t2;
        })();
        t.exports = function(e2, t2) {
          return void 0 !== e2 && e2.length ? "string" !== n.getTypeOf(e2) ? (function(e3, t3, r2, n2) {
            var i = o, s = n2 + r2;
            e3 ^= -1;
            for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3[a])];
            return -1 ^ e3;
          })(0 | t2, e2, e2.length, 0) : (function(e3, t3, r2, n2) {
            var i = o, s = n2 + r2;
            e3 ^= -1;
            for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3.charCodeAt(a))];
            return -1 ^ e3;
          })(0 | t2, e2, e2.length, 0) : 0;
        };
      }, { "./utils": 32 }], 5: [function(e, t, r) {
        "use strict";
        r.base64 = false, r.binary = false, r.dir = false, r.createFolders = true, r.date = null, r.compression = null, r.compressionOptions = null, r.comment = null, r.unixPermissions = null, r.dosPermissions = null;
      }, {}], 6: [function(e, t, r) {
        "use strict";
        var n = null;
        n = "undefined" != typeof Promise ? Promise : e("lie"), t.exports = { Promise: n };
      }, { lie: 37 }], 7: [function(e, t, r) {
        "use strict";
        var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Uint32Array, i = e("pako"), s = e("./utils"), a = e("./stream/GenericWorker"), o = n ? "uint8array" : "array";
        function h(e2, t2) {
          a.call(this, "FlateWorker/" + e2), this._pako = null, this._pakoAction = e2, this._pakoOptions = t2, this.meta = {};
        }
        r.magic = "\b\0", s.inherits(h, a), h.prototype.processChunk = function(e2) {
          this.meta = e2.meta, null === this._pako && this._createPako(), this._pako.push(s.transformTo(o, e2.data), false);
        }, h.prototype.flush = function() {
          a.prototype.flush.call(this), null === this._pako && this._createPako(), this._pako.push([], true);
        }, h.prototype.cleanUp = function() {
          a.prototype.cleanUp.call(this), this._pako = null;
        }, h.prototype._createPako = function() {
          this._pako = new i[this._pakoAction]({ raw: true, level: this._pakoOptions.level || -1 });
          var t2 = this;
          this._pako.onData = function(e2) {
            t2.push({ data: e2, meta: t2.meta });
          };
        }, r.compressWorker = function(e2) {
          return new h("Deflate", e2);
        }, r.uncompressWorker = function() {
          return new h("Inflate", {});
        };
      }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, t, r) {
        "use strict";
        function A(e2, t2) {
          var r2, n2 = "";
          for (r2 = 0; r2 < t2; r2++) n2 += String.fromCharCode(255 & e2), e2 >>>= 8;
          return n2;
        }
        function n(e2, t2, r2, n2, i2, s2) {
          var a, o, h = e2.file, u = e2.compression, l = s2 !== O.utf8encode, f = I.transformTo("string", s2(h.name)), c = I.transformTo("string", O.utf8encode(h.name)), d = h.comment, p = I.transformTo("string", s2(d)), m = I.transformTo("string", O.utf8encode(d)), _ = c.length !== h.name.length, g = m.length !== d.length, b2 = "", v = "", y = "", w = h.dir, k = h.date, x = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
          t2 && !r2 || (x.crc32 = e2.crc32, x.compressedSize = e2.compressedSize, x.uncompressedSize = e2.uncompressedSize);
          var S = 0;
          t2 && (S |= 8), l || !_ && !g || (S |= 2048);
          var z = 0, C = 0;
          w && (z |= 16), "UNIX" === i2 ? (C = 798, z |= (function(e3, t3) {
            var r3 = e3;
            return e3 || (r3 = t3 ? 16893 : 33204), (65535 & r3) << 16;
          })(h.unixPermissions, w)) : (C = 20, z |= (function(e3) {
            return 63 & (e3 || 0);
          })(h.dosPermissions)), a = k.getUTCHours(), a <<= 6, a |= k.getUTCMinutes(), a <<= 5, a |= k.getUTCSeconds() / 2, o = k.getUTCFullYear() - 1980, o <<= 4, o |= k.getUTCMonth() + 1, o <<= 5, o |= k.getUTCDate(), _ && (v = A(1, 1) + A(B(f), 4) + c, b2 += "up" + A(v.length, 2) + v), g && (y = A(1, 1) + A(B(p), 4) + m, b2 += "uc" + A(y.length, 2) + y);
          var E = "";
          return E += "\n\0", E += A(S, 2), E += u.magic, E += A(a, 2), E += A(o, 2), E += A(x.crc32, 4), E += A(x.compressedSize, 4), E += A(x.uncompressedSize, 4), E += A(f.length, 2), E += A(b2.length, 2), { fileRecord: R.LOCAL_FILE_HEADER + E + f + b2, dirRecord: R.CENTRAL_FILE_HEADER + A(C, 2) + E + A(p.length, 2) + "\0\0\0\0" + A(z, 4) + A(n2, 4) + f + b2 + p };
        }
        var I = e("../utils"), i = e("../stream/GenericWorker"), O = e("../utf8"), B = e("../crc32"), R = e("../signature");
        function s(e2, t2, r2, n2) {
          i.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t2, this.zipPlatform = r2, this.encodeFileName = n2, this.streamFiles = e2, this.accumulate = false, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
        }
        I.inherits(s, i), s.prototype.push = function(e2) {
          var t2 = e2.meta.percent || 0, r2 = this.entriesCount, n2 = this._sources.length;
          this.accumulate ? this.contentBuffer.push(e2) : (this.bytesWritten += e2.data.length, i.prototype.push.call(this, { data: e2.data, meta: { currentFile: this.currentFile, percent: r2 ? (t2 + 100 * (r2 - n2 - 1)) / r2 : 100 } }));
        }, s.prototype.openedSource = function(e2) {
          this.currentSourceOffset = this.bytesWritten, this.currentFile = e2.file.name;
          var t2 = this.streamFiles && !e2.file.dir;
          if (t2) {
            var r2 = n(e2, t2, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({ data: r2.fileRecord, meta: { percent: 0 } });
          } else this.accumulate = true;
        }, s.prototype.closedSource = function(e2) {
          this.accumulate = false;
          var t2 = this.streamFiles && !e2.file.dir, r2 = n(e2, t2, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
          if (this.dirRecords.push(r2.dirRecord), t2) this.push({ data: (function(e3) {
            return R.DATA_DESCRIPTOR + A(e3.crc32, 4) + A(e3.compressedSize, 4) + A(e3.uncompressedSize, 4);
          })(e2), meta: { percent: 100 } });
          else for (this.push({ data: r2.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
          this.currentFile = null;
        }, s.prototype.flush = function() {
          for (var e2 = this.bytesWritten, t2 = 0; t2 < this.dirRecords.length; t2++) this.push({ data: this.dirRecords[t2], meta: { percent: 100 } });
          var r2 = this.bytesWritten - e2, n2 = (function(e3, t3, r3, n3, i2) {
            var s2 = I.transformTo("string", i2(n3));
            return R.CENTRAL_DIRECTORY_END + "\0\0\0\0" + A(e3, 2) + A(e3, 2) + A(t3, 4) + A(r3, 4) + A(s2.length, 2) + s2;
          })(this.dirRecords.length, r2, e2, this.zipComment, this.encodeFileName);
          this.push({ data: n2, meta: { percent: 100 } });
        }, s.prototype.prepareNextSource = function() {
          this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
        }, s.prototype.registerPrevious = function(e2) {
          this._sources.push(e2);
          var t2 = this;
          return e2.on("data", function(e3) {
            t2.processChunk(e3);
          }), e2.on("end", function() {
            t2.closedSource(t2.previous.streamInfo), t2._sources.length ? t2.prepareNextSource() : t2.end();
          }), e2.on("error", function(e3) {
            t2.error(e3);
          }), this;
        }, s.prototype.resume = function() {
          return !!i.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), true) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), true));
        }, s.prototype.error = function(e2) {
          var t2 = this._sources;
          if (!i.prototype.error.call(this, e2)) return false;
          for (var r2 = 0; r2 < t2.length; r2++) try {
            t2[r2].error(e2);
          } catch (e3) {
          }
          return true;
        }, s.prototype.lock = function() {
          i.prototype.lock.call(this);
          for (var e2 = this._sources, t2 = 0; t2 < e2.length; t2++) e2[t2].lock();
        }, t.exports = s;
      }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, t, r) {
        "use strict";
        var u = e("../compressions"), n = e("./ZipFileWorker");
        r.generateWorker = function(e2, a, t2) {
          var o = new n(a.streamFiles, t2, a.platform, a.encodeFileName), h = 0;
          try {
            e2.forEach(function(e3, t3) {
              h++;
              var r2 = (function(e4, t4) {
                var r3 = e4 || t4, n3 = u[r3];
                if (!n3) throw new Error(r3 + " is not a valid compression method !");
                return n3;
              })(t3.options.compression, a.compression), n2 = t3.options.compressionOptions || a.compressionOptions || {}, i = t3.dir, s = t3.date;
              t3._compressWorker(r2, n2).withStreamInfo("file", { name: e3, dir: i, date: s, comment: t3.comment || "", unixPermissions: t3.unixPermissions, dosPermissions: t3.dosPermissions }).pipe(o);
            }), o.entriesCount = h;
          } catch (e3) {
            o.error(e3);
          }
          return o;
        };
      }, { "../compressions": 3, "./ZipFileWorker": 8 }], 10: [function(e, t, r) {
        "use strict";
        function n() {
          if (!(this instanceof n)) return new n();
          if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
          this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
            var e2 = new n();
            for (var t2 in this) "function" != typeof this[t2] && (e2[t2] = this[t2]);
            return e2;
          };
        }
        (n.prototype = e("./object")).loadAsync = e("./load"), n.support = e("./support"), n.defaults = e("./defaults"), n.version = "3.10.1", n.loadAsync = function(e2, t2) {
          return new n().loadAsync(e2, t2);
        }, n.external = e("./external"), t.exports = n;
      }, { "./defaults": 5, "./external": 6, "./load": 11, "./object": 15, "./support": 30 }], 11: [function(e, t, r) {
        "use strict";
        var u = e("./utils"), i = e("./external"), n = e("./utf8"), s = e("./zipEntries"), a = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
        function f(n2) {
          return new i.Promise(function(e2, t2) {
            var r2 = n2.decompressed.getContentWorker().pipe(new a());
            r2.on("error", function(e3) {
              t2(e3);
            }).on("end", function() {
              r2.streamInfo.crc32 !== n2.decompressed.crc32 ? t2(new Error("Corrupted zip : CRC32 mismatch")) : e2();
            }).resume();
          });
        }
        t.exports = function(e2, o) {
          var h = this;
          return o = u.extend(o || {}, { base64: false, checkCRC32: false, optimizedBinaryString: false, createFolders: false, decodeFileName: n.utf8decode }), l.isNode && l.isStream(e2) ? i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : u.prepareContent("the loaded zip file", e2, true, o.optimizedBinaryString, o.base64).then(function(e3) {
            var t2 = new s(o);
            return t2.load(e3), t2;
          }).then(function(e3) {
            var t2 = [i.Promise.resolve(e3)], r2 = e3.files;
            if (o.checkCRC32) for (var n2 = 0; n2 < r2.length; n2++) t2.push(f(r2[n2]));
            return i.Promise.all(t2);
          }).then(function(e3) {
            for (var t2 = e3.shift(), r2 = t2.files, n2 = 0; n2 < r2.length; n2++) {
              var i2 = r2[n2], s2 = i2.fileNameStr, a2 = u.resolve(i2.fileNameStr);
              h.file(a2, i2.decompressed, { binary: true, optimizedBinaryString: true, date: i2.date, dir: i2.dir, comment: i2.fileCommentStr.length ? i2.fileCommentStr : null, unixPermissions: i2.unixPermissions, dosPermissions: i2.dosPermissions, createFolders: o.createFolders }), i2.dir || (h.file(a2).unsafeOriginalName = s2);
            }
            return t2.zipComment.length && (h.comment = t2.zipComment), h;
          });
        };
      }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("../stream/GenericWorker");
        function s(e2, t2) {
          i.call(this, "Nodejs stream input adapter for " + e2), this._upstreamEnded = false, this._bindStream(t2);
        }
        n.inherits(s, i), s.prototype._bindStream = function(e2) {
          var t2 = this;
          (this._stream = e2).pause(), e2.on("data", function(e3) {
            t2.push({ data: e3, meta: { percent: 0 } });
          }).on("error", function(e3) {
            t2.isPaused ? this.generatedError = e3 : t2.error(e3);
          }).on("end", function() {
            t2.isPaused ? t2._upstreamEnded = true : t2.end();
          });
        }, s.prototype.pause = function() {
          return !!i.prototype.pause.call(this) && (this._stream.pause(), true);
        }, s.prototype.resume = function() {
          return !!i.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), true);
        }, t.exports = s;
      }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(e, t, r) {
        "use strict";
        var i = e("readable-stream").Readable;
        function n(e2, t2, r2) {
          i.call(this, t2), this._helper = e2;
          var n2 = this;
          e2.on("data", function(e3, t3) {
            n2.push(e3) || n2._helper.pause(), r2 && r2(t3);
          }).on("error", function(e3) {
            n2.emit("error", e3);
          }).on("end", function() {
            n2.push(null);
          });
        }
        e("../utils").inherits(n, i), n.prototype._read = function() {
          this._helper.resume();
        }, t.exports = n;
      }, { "../utils": 32, "readable-stream": 16 }], 14: [function(e, t, r) {
        "use strict";
        t.exports = { isNode: "undefined" != typeof Buffer, newBufferFrom: function(e2, t2) {
          if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(e2, t2);
          if ("number" == typeof e2) throw new Error('The "data" argument must not be a number');
          return new Buffer(e2, t2);
        }, allocBuffer: function(e2) {
          if (Buffer.alloc) return Buffer.alloc(e2);
          var t2 = new Buffer(e2);
          return t2.fill(0), t2;
        }, isBuffer: function(e2) {
          return Buffer.isBuffer(e2);
        }, isStream: function(e2) {
          return e2 && "function" == typeof e2.on && "function" == typeof e2.pause && "function" == typeof e2.resume;
        } };
      }, {}], 15: [function(e, t, r) {
        "use strict";
        function s(e2, t2, r2) {
          var n2, i2 = u.getTypeOf(t2), s2 = u.extend(r2 || {}, f);
          s2.date = s2.date || /* @__PURE__ */ new Date(), null !== s2.compression && (s2.compression = s2.compression.toUpperCase()), "string" == typeof s2.unixPermissions && (s2.unixPermissions = parseInt(s2.unixPermissions, 8)), s2.unixPermissions && 16384 & s2.unixPermissions && (s2.dir = true), s2.dosPermissions && 16 & s2.dosPermissions && (s2.dir = true), s2.dir && (e2 = g(e2)), s2.createFolders && (n2 = _(e2)) && b2.call(this, n2, true);
          var a2 = "string" === i2 && false === s2.binary && false === s2.base64;
          r2 && void 0 !== r2.binary || (s2.binary = !a2), (t2 instanceof c && 0 === t2.uncompressedSize || s2.dir || !t2 || 0 === t2.length) && (s2.base64 = false, s2.binary = true, t2 = "", s2.compression = "STORE", i2 = "string");
          var o2 = null;
          o2 = t2 instanceof c || t2 instanceof l ? t2 : p.isNode && p.isStream(t2) ? new m(e2, t2) : u.prepareContent(e2, t2, s2.binary, s2.optimizedBinaryString, s2.base64);
          var h2 = new d(e2, o2, s2);
          this.files[e2] = h2;
        }
        var i = e("./utf8"), u = e("./utils"), l = e("./stream/GenericWorker"), a = e("./stream/StreamHelper"), f = e("./defaults"), c = e("./compressedObject"), d = e("./zipObject"), o = e("./generate"), p = e("./nodejsUtils"), m = e("./nodejs/NodejsStreamInputAdapter"), _ = function(e2) {
          "/" === e2.slice(-1) && (e2 = e2.substring(0, e2.length - 1));
          var t2 = e2.lastIndexOf("/");
          return 0 < t2 ? e2.substring(0, t2) : "";
        }, g = function(e2) {
          return "/" !== e2.slice(-1) && (e2 += "/"), e2;
        }, b2 = function(e2, t2) {
          return t2 = void 0 !== t2 ? t2 : f.createFolders, e2 = g(e2), this.files[e2] || s.call(this, e2, null, { dir: true, createFolders: t2 }), this.files[e2];
        };
        function h(e2) {
          return "[object RegExp]" === Object.prototype.toString.call(e2);
        }
        var n = { load: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, forEach: function(e2) {
          var t2, r2, n2;
          for (t2 in this.files) n2 = this.files[t2], (r2 = t2.slice(this.root.length, t2.length)) && t2.slice(0, this.root.length) === this.root && e2(r2, n2);
        }, filter: function(r2) {
          var n2 = [];
          return this.forEach(function(e2, t2) {
            r2(e2, t2) && n2.push(t2);
          }), n2;
        }, file: function(e2, t2, r2) {
          if (1 !== arguments.length) return e2 = this.root + e2, s.call(this, e2, t2, r2), this;
          if (h(e2)) {
            var n2 = e2;
            return this.filter(function(e3, t3) {
              return !t3.dir && n2.test(e3);
            });
          }
          var i2 = this.files[this.root + e2];
          return i2 && !i2.dir ? i2 : null;
        }, folder: function(r2) {
          if (!r2) return this;
          if (h(r2)) return this.filter(function(e3, t3) {
            return t3.dir && r2.test(e3);
          });
          var e2 = this.root + r2, t2 = b2.call(this, e2), n2 = this.clone();
          return n2.root = t2.name, n2;
        }, remove: function(r2) {
          r2 = this.root + r2;
          var e2 = this.files[r2];
          if (e2 || ("/" !== r2.slice(-1) && (r2 += "/"), e2 = this.files[r2]), e2 && !e2.dir) delete this.files[r2];
          else for (var t2 = this.filter(function(e3, t3) {
            return t3.name.slice(0, r2.length) === r2;
          }), n2 = 0; n2 < t2.length; n2++) delete this.files[t2[n2].name];
          return this;
        }, generate: function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, generateInternalStream: function(e2) {
          var t2, r2 = {};
          try {
            if ((r2 = u.extend(e2 || {}, { streamFiles: false, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: i.utf8encode })).type = r2.type.toLowerCase(), r2.compression = r2.compression.toUpperCase(), "binarystring" === r2.type && (r2.type = "string"), !r2.type) throw new Error("No output type specified.");
            u.checkSupport(r2.type), "darwin" !== r2.platform && "freebsd" !== r2.platform && "linux" !== r2.platform && "sunos" !== r2.platform || (r2.platform = "UNIX"), "win32" === r2.platform && (r2.platform = "DOS");
            var n2 = r2.comment || this.comment || "";
            t2 = o.generateWorker(this, r2, n2);
          } catch (e3) {
            (t2 = new l("error")).error(e3);
          }
          return new a(t2, r2.type || "string", r2.mimeType);
        }, generateAsync: function(e2, t2) {
          return this.generateInternalStream(e2).accumulate(t2);
        }, generateNodeStream: function(e2, t2) {
          return (e2 = e2 || {}).type || (e2.type = "nodebuffer"), this.generateInternalStream(e2).toNodejsStream(t2);
        } };
        t.exports = n;
      }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(e, t, r) {
        "use strict";
        t.exports = e("stream");
      }, { stream: void 0 }], 17: [function(e, t, r) {
        "use strict";
        var n = e("./DataReader");
        function i(e2) {
          n.call(this, e2);
          for (var t2 = 0; t2 < this.data.length; t2++) e2[t2] = 255 & e2[t2];
        }
        e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
          return this.data[this.zero + e2];
        }, i.prototype.lastIndexOfSignature = function(e2) {
          for (var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.length - 4; 0 <= s; --s) if (this.data[s] === t2 && this.data[s + 1] === r2 && this.data[s + 2] === n2 && this.data[s + 3] === i2) return s - this.zero;
          return -1;
        }, i.prototype.readAndCheckSignature = function(e2) {
          var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.readData(4);
          return t2 === s[0] && r2 === s[1] && n2 === s[2] && i2 === s[3];
        }, i.prototype.readData = function(e2) {
          if (this.checkOffset(e2), 0 === e2) return [];
          var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./DataReader": 18 }], 18: [function(e, t, r) {
        "use strict";
        var n = e("../utils");
        function i(e2) {
          this.data = e2, this.length = e2.length, this.index = 0, this.zero = 0;
        }
        i.prototype = { checkOffset: function(e2) {
          this.checkIndex(this.index + e2);
        }, checkIndex: function(e2) {
          if (this.length < this.zero + e2 || e2 < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + e2 + "). Corrupted zip ?");
        }, setIndex: function(e2) {
          this.checkIndex(e2), this.index = e2;
        }, skip: function(e2) {
          this.setIndex(this.index + e2);
        }, byteAt: function() {
        }, readInt: function(e2) {
          var t2, r2 = 0;
          for (this.checkOffset(e2), t2 = this.index + e2 - 1; t2 >= this.index; t2--) r2 = (r2 << 8) + this.byteAt(t2);
          return this.index += e2, r2;
        }, readString: function(e2) {
          return n.transformTo("string", this.readData(e2));
        }, readData: function() {
        }, lastIndexOfSignature: function() {
        }, readAndCheckSignature: function() {
        }, readDate: function() {
          var e2 = this.readInt(4);
          return new Date(Date.UTC(1980 + (e2 >> 25 & 127), (e2 >> 21 & 15) - 1, e2 >> 16 & 31, e2 >> 11 & 31, e2 >> 5 & 63, (31 & e2) << 1));
        } }, t.exports = i;
      }, { "../utils": 32 }], 19: [function(e, t, r) {
        "use strict";
        var n = e("./Uint8ArrayReader");
        function i(e2) {
          n.call(this, e2);
        }
        e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
          this.checkOffset(e2);
          var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./Uint8ArrayReader": 21 }], 20: [function(e, t, r) {
        "use strict";
        var n = e("./DataReader");
        function i(e2) {
          n.call(this, e2);
        }
        e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
          return this.data.charCodeAt(this.zero + e2);
        }, i.prototype.lastIndexOfSignature = function(e2) {
          return this.data.lastIndexOf(e2) - this.zero;
        }, i.prototype.readAndCheckSignature = function(e2) {
          return e2 === this.readData(4);
        }, i.prototype.readData = function(e2) {
          this.checkOffset(e2);
          var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./DataReader": 18 }], 21: [function(e, t, r) {
        "use strict";
        var n = e("./ArrayReader");
        function i(e2) {
          n.call(this, e2);
        }
        e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
          if (this.checkOffset(e2), 0 === e2) return new Uint8Array(0);
          var t2 = this.data.subarray(this.zero + this.index, this.zero + this.index + e2);
          return this.index += e2, t2;
        }, t.exports = i;
      }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("../support"), s = e("./ArrayReader"), a = e("./StringReader"), o = e("./NodeBufferReader"), h = e("./Uint8ArrayReader");
        t.exports = function(e2) {
          var t2 = n.getTypeOf(e2);
          return n.checkSupport(t2), "string" !== t2 || i.uint8array ? "nodebuffer" === t2 ? new o(e2) : i.uint8array ? new h(n.transformTo("uint8array", e2)) : new s(n.transformTo("array", e2)) : new a(e2);
        };
      }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(e, t, r) {
        "use strict";
        r.LOCAL_FILE_HEADER = "PK", r.CENTRAL_FILE_HEADER = "PK", r.CENTRAL_DIRECTORY_END = "PK", r.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", r.ZIP64_CENTRAL_DIRECTORY_END = "PK", r.DATA_DESCRIPTOR = "PK\x07\b";
      }, {}], 24: [function(e, t, r) {
        "use strict";
        var n = e("./GenericWorker"), i = e("../utils");
        function s(e2) {
          n.call(this, "ConvertWorker to " + e2), this.destType = e2;
        }
        i.inherits(s, n), s.prototype.processChunk = function(e2) {
          this.push({ data: i.transformTo(this.destType, e2.data), meta: e2.meta });
        }, t.exports = s;
      }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(e, t, r) {
        "use strict";
        var n = e("./GenericWorker"), i = e("../crc32");
        function s() {
          n.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
        }
        e("../utils").inherits(s, n), s.prototype.processChunk = function(e2) {
          this.streamInfo.crc32 = i(e2.data, this.streamInfo.crc32 || 0), this.push(e2);
        }, t.exports = s;
      }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("./GenericWorker");
        function s(e2) {
          i.call(this, "DataLengthProbe for " + e2), this.propName = e2, this.withStreamInfo(e2, 0);
        }
        n.inherits(s, i), s.prototype.processChunk = function(e2) {
          if (e2) {
            var t2 = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = t2 + e2.data.length;
          }
          i.prototype.processChunk.call(this, e2);
        }, t.exports = s;
      }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, t, r) {
        "use strict";
        var n = e("../utils"), i = e("./GenericWorker");
        function s(e2) {
          i.call(this, "DataWorker");
          var t2 = this;
          this.dataIsReady = false, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = false, e2.then(function(e3) {
            t2.dataIsReady = true, t2.data = e3, t2.max = e3 && e3.length || 0, t2.type = n.getTypeOf(e3), t2.isPaused || t2._tickAndRepeat();
          }, function(e3) {
            t2.error(e3);
          });
        }
        n.inherits(s, i), s.prototype.cleanUp = function() {
          i.prototype.cleanUp.call(this), this.data = null;
        }, s.prototype.resume = function() {
          return !!i.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = true, n.delay(this._tickAndRepeat, [], this)), true);
        }, s.prototype._tickAndRepeat = function() {
          this._tickScheduled = false, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (n.delay(this._tickAndRepeat, [], this), this._tickScheduled = true));
        }, s.prototype._tick = function() {
          if (this.isPaused || this.isFinished) return false;
          var e2 = null, t2 = Math.min(this.max, this.index + 16384);
          if (this.index >= this.max) return this.end();
          switch (this.type) {
            case "string":
              e2 = this.data.substring(this.index, t2);
              break;
            case "uint8array":
              e2 = this.data.subarray(this.index, t2);
              break;
            case "array":
            case "nodebuffer":
              e2 = this.data.slice(this.index, t2);
          }
          return this.index = t2, this.push({ data: e2, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
        }, t.exports = s;
      }, { "../utils": 32, "./GenericWorker": 28 }], 28: [function(e, t, r) {
        "use strict";
        function n(e2) {
          this.name = e2 || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = true, this.isFinished = false, this.isLocked = false, this._listeners = { data: [], end: [], error: [] }, this.previous = null;
        }
        n.prototype = { push: function(e2) {
          this.emit("data", e2);
        }, end: function() {
          if (this.isFinished) return false;
          this.flush();
          try {
            this.emit("end"), this.cleanUp(), this.isFinished = true;
          } catch (e2) {
            this.emit("error", e2);
          }
          return true;
        }, error: function(e2) {
          return !this.isFinished && (this.isPaused ? this.generatedError = e2 : (this.isFinished = true, this.emit("error", e2), this.previous && this.previous.error(e2), this.cleanUp()), true);
        }, on: function(e2, t2) {
          return this._listeners[e2].push(t2), this;
        }, cleanUp: function() {
          this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
        }, emit: function(e2, t2) {
          if (this._listeners[e2]) for (var r2 = 0; r2 < this._listeners[e2].length; r2++) this._listeners[e2][r2].call(this, t2);
        }, pipe: function(e2) {
          return e2.registerPrevious(this);
        }, registerPrevious: function(e2) {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.streamInfo = e2.streamInfo, this.mergeStreamInfo(), this.previous = e2;
          var t2 = this;
          return e2.on("data", function(e3) {
            t2.processChunk(e3);
          }), e2.on("end", function() {
            t2.end();
          }), e2.on("error", function(e3) {
            t2.error(e3);
          }), this;
        }, pause: function() {
          return !this.isPaused && !this.isFinished && (this.isPaused = true, this.previous && this.previous.pause(), true);
        }, resume: function() {
          if (!this.isPaused || this.isFinished) return false;
          var e2 = this.isPaused = false;
          return this.generatedError && (this.error(this.generatedError), e2 = true), this.previous && this.previous.resume(), !e2;
        }, flush: function() {
        }, processChunk: function(e2) {
          this.push(e2);
        }, withStreamInfo: function(e2, t2) {
          return this.extraStreamInfo[e2] = t2, this.mergeStreamInfo(), this;
        }, mergeStreamInfo: function() {
          for (var e2 in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e2) && (this.streamInfo[e2] = this.extraStreamInfo[e2]);
        }, lock: function() {
          if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
          this.isLocked = true, this.previous && this.previous.lock();
        }, toString: function() {
          var e2 = "Worker " + this.name;
          return this.previous ? this.previous + " -> " + e2 : e2;
        } }, t.exports = n;
      }, {}], 29: [function(e, t, r) {
        "use strict";
        var h = e("../utils"), i = e("./ConvertWorker"), s = e("./GenericWorker"), u = e("../base64"), n = e("../support"), a = e("../external"), o = null;
        if (n.nodestream) try {
          o = e("../nodejs/NodejsStreamOutputAdapter");
        } catch (e2) {
        }
        function l(e2, o2) {
          return new a.Promise(function(t2, r2) {
            var n2 = [], i2 = e2._internalType, s2 = e2._outputType, a2 = e2._mimeType;
            e2.on("data", function(e3, t3) {
              n2.push(e3), o2 && o2(t3);
            }).on("error", function(e3) {
              n2 = [], r2(e3);
            }).on("end", function() {
              try {
                var e3 = (function(e4, t3, r3) {
                  switch (e4) {
                    case "blob":
                      return h.newBlob(h.transformTo("arraybuffer", t3), r3);
                    case "base64":
                      return u.encode(t3);
                    default:
                      return h.transformTo(e4, t3);
                  }
                })(s2, (function(e4, t3) {
                  var r3, n3 = 0, i3 = null, s3 = 0;
                  for (r3 = 0; r3 < t3.length; r3++) s3 += t3[r3].length;
                  switch (e4) {
                    case "string":
                      return t3.join("");
                    case "array":
                      return Array.prototype.concat.apply([], t3);
                    case "uint8array":
                      for (i3 = new Uint8Array(s3), r3 = 0; r3 < t3.length; r3++) i3.set(t3[r3], n3), n3 += t3[r3].length;
                      return i3;
                    case "nodebuffer":
                      return Buffer.concat(t3);
                    default:
                      throw new Error("concat : unsupported type '" + e4 + "'");
                  }
                })(i2, n2), a2);
                t2(e3);
              } catch (e4) {
                r2(e4);
              }
              n2 = [];
            }).resume();
          });
        }
        function f(e2, t2, r2) {
          var n2 = t2;
          switch (t2) {
            case "blob":
            case "arraybuffer":
              n2 = "uint8array";
              break;
            case "base64":
              n2 = "string";
          }
          try {
            this._internalType = n2, this._outputType = t2, this._mimeType = r2, h.checkSupport(n2), this._worker = e2.pipe(new i(n2)), e2.lock();
          } catch (e3) {
            this._worker = new s("error"), this._worker.error(e3);
          }
        }
        f.prototype = { accumulate: function(e2) {
          return l(this, e2);
        }, on: function(e2, t2) {
          var r2 = this;
          return "data" === e2 ? this._worker.on(e2, function(e3) {
            t2.call(r2, e3.data, e3.meta);
          }) : this._worker.on(e2, function() {
            h.delay(t2, arguments, r2);
          }), this;
        }, resume: function() {
          return h.delay(this._worker.resume, [], this._worker), this;
        }, pause: function() {
          return this._worker.pause(), this;
        }, toNodejsStream: function(e2) {
          if (h.checkSupport("nodestream"), "nodebuffer" !== this._outputType) throw new Error(this._outputType + " is not supported by this method");
          return new o(this, { objectMode: "nodebuffer" !== this._outputType }, e2);
        } }, t.exports = f;
      }, { "../base64": 1, "../external": 6, "../nodejs/NodejsStreamOutputAdapter": 13, "../support": 30, "../utils": 32, "./ConvertWorker": 24, "./GenericWorker": 28 }], 30: [function(e, t, r) {
        "use strict";
        if (r.base64 = true, r.array = true, r.string = true, r.arraybuffer = "undefined" != typeof ArrayBuffer && "undefined" != typeof Uint8Array, r.nodebuffer = "undefined" != typeof Buffer, r.uint8array = "undefined" != typeof Uint8Array, "undefined" == typeof ArrayBuffer) r.blob = false;
        else {
          var n = new ArrayBuffer(0);
          try {
            r.blob = 0 === new Blob([n], { type: "application/zip" }).size;
          } catch (e2) {
            try {
              var i = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              i.append(n), r.blob = 0 === i.getBlob("application/zip").size;
            } catch (e3) {
              r.blob = false;
            }
          }
        }
        try {
          r.nodestream = !!e("readable-stream").Readable;
        } catch (e2) {
          r.nodestream = false;
        }
      }, { "readable-stream": 16 }], 31: [function(e, t, s) {
        "use strict";
        for (var o = e("./utils"), h = e("./support"), r = e("./nodejsUtils"), n = e("./stream/GenericWorker"), u = new Array(256), i = 0; i < 256; i++) u[i] = 252 <= i ? 6 : 248 <= i ? 5 : 240 <= i ? 4 : 224 <= i ? 3 : 192 <= i ? 2 : 1;
        u[254] = u[254] = 1;
        function a() {
          n.call(this, "utf-8 decode"), this.leftOver = null;
        }
        function l() {
          n.call(this, "utf-8 encode");
        }
        s.utf8encode = function(e2) {
          return h.nodebuffer ? r.newBufferFrom(e2, "utf-8") : (function(e3) {
            var t2, r2, n2, i2, s2, a2 = e3.length, o2 = 0;
            for (i2 = 0; i2 < a2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o2 += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
            for (t2 = h.uint8array ? new Uint8Array(o2) : new Array(o2), i2 = s2 = 0; s2 < o2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
            return t2;
          })(e2);
        }, s.utf8decode = function(e2) {
          return h.nodebuffer ? o.transformTo("nodebuffer", e2).toString("utf-8") : (function(e3) {
            var t2, r2, n2, i2, s2 = e3.length, a2 = new Array(2 * s2);
            for (t2 = r2 = 0; t2 < s2; ) if ((n2 = e3[t2++]) < 128) a2[r2++] = n2;
            else if (4 < (i2 = u[n2])) a2[r2++] = 65533, t2 += i2 - 1;
            else {
              for (n2 &= 2 === i2 ? 31 : 3 === i2 ? 15 : 7; 1 < i2 && t2 < s2; ) n2 = n2 << 6 | 63 & e3[t2++], i2--;
              1 < i2 ? a2[r2++] = 65533 : n2 < 65536 ? a2[r2++] = n2 : (n2 -= 65536, a2[r2++] = 55296 | n2 >> 10 & 1023, a2[r2++] = 56320 | 1023 & n2);
            }
            return a2.length !== r2 && (a2.subarray ? a2 = a2.subarray(0, r2) : a2.length = r2), o.applyFromCharCode(a2);
          })(e2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2));
        }, o.inherits(a, n), a.prototype.processChunk = function(e2) {
          var t2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2.data);
          if (this.leftOver && this.leftOver.length) {
            if (h.uint8array) {
              var r2 = t2;
              (t2 = new Uint8Array(r2.length + this.leftOver.length)).set(this.leftOver, 0), t2.set(r2, this.leftOver.length);
            } else t2 = this.leftOver.concat(t2);
            this.leftOver = null;
          }
          var n2 = (function(e3, t3) {
            var r3;
            for ((t3 = t3 || e3.length) > e3.length && (t3 = e3.length), r3 = t3 - 1; 0 <= r3 && 128 == (192 & e3[r3]); ) r3--;
            return r3 < 0 ? t3 : 0 === r3 ? t3 : r3 + u[e3[r3]] > t3 ? r3 : t3;
          })(t2), i2 = t2;
          n2 !== t2.length && (h.uint8array ? (i2 = t2.subarray(0, n2), this.leftOver = t2.subarray(n2, t2.length)) : (i2 = t2.slice(0, n2), this.leftOver = t2.slice(n2, t2.length))), this.push({ data: s.utf8decode(i2), meta: e2.meta });
        }, a.prototype.flush = function() {
          this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
        }, s.Utf8DecodeWorker = a, o.inherits(l, n), l.prototype.processChunk = function(e2) {
          this.push({ data: s.utf8encode(e2.data), meta: e2.meta });
        }, s.Utf8EncodeWorker = l;
      }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, t, a) {
        "use strict";
        var o = e("./support"), h = e("./base64"), r = e("./nodejsUtils"), u = e("./external");
        function n(e2) {
          return e2;
        }
        function l(e2, t2) {
          for (var r2 = 0; r2 < e2.length; ++r2) t2[r2] = 255 & e2.charCodeAt(r2);
          return t2;
        }
        e("setimmediate"), a.newBlob = function(t2, r2) {
          a.checkSupport("blob");
          try {
            return new Blob([t2], { type: r2 });
          } catch (e2) {
            try {
              var n2 = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
              return n2.append(t2), n2.getBlob(r2);
            } catch (e3) {
              throw new Error("Bug : can't construct the Blob.");
            }
          }
        };
        var i = { stringifyByChunk: function(e2, t2, r2) {
          var n2 = [], i2 = 0, s2 = e2.length;
          if (s2 <= r2) return String.fromCharCode.apply(null, e2);
          for (; i2 < s2; ) "array" === t2 || "nodebuffer" === t2 ? n2.push(String.fromCharCode.apply(null, e2.slice(i2, Math.min(i2 + r2, s2)))) : n2.push(String.fromCharCode.apply(null, e2.subarray(i2, Math.min(i2 + r2, s2)))), i2 += r2;
          return n2.join("");
        }, stringifyByChar: function(e2) {
          for (var t2 = "", r2 = 0; r2 < e2.length; r2++) t2 += String.fromCharCode(e2[r2]);
          return t2;
        }, applyCanBeUsed: { uint8array: (function() {
          try {
            return o.uint8array && 1 === String.fromCharCode.apply(null, new Uint8Array(1)).length;
          } catch (e2) {
            return false;
          }
        })(), nodebuffer: (function() {
          try {
            return o.nodebuffer && 1 === String.fromCharCode.apply(null, r.allocBuffer(1)).length;
          } catch (e2) {
            return false;
          }
        })() } };
        function s(e2) {
          var t2 = 65536, r2 = a.getTypeOf(e2), n2 = true;
          if ("uint8array" === r2 ? n2 = i.applyCanBeUsed.uint8array : "nodebuffer" === r2 && (n2 = i.applyCanBeUsed.nodebuffer), n2) for (; 1 < t2; ) try {
            return i.stringifyByChunk(e2, r2, t2);
          } catch (e3) {
            t2 = Math.floor(t2 / 2);
          }
          return i.stringifyByChar(e2);
        }
        function f(e2, t2) {
          for (var r2 = 0; r2 < e2.length; r2++) t2[r2] = e2[r2];
          return t2;
        }
        a.applyFromCharCode = s;
        var c = {};
        c.string = { string: n, array: function(e2) {
          return l(e2, new Array(e2.length));
        }, arraybuffer: function(e2) {
          return c.string.uint8array(e2).buffer;
        }, uint8array: function(e2) {
          return l(e2, new Uint8Array(e2.length));
        }, nodebuffer: function(e2) {
          return l(e2, r.allocBuffer(e2.length));
        } }, c.array = { string: s, array: n, arraybuffer: function(e2) {
          return new Uint8Array(e2).buffer;
        }, uint8array: function(e2) {
          return new Uint8Array(e2);
        }, nodebuffer: function(e2) {
          return r.newBufferFrom(e2);
        } }, c.arraybuffer = { string: function(e2) {
          return s(new Uint8Array(e2));
        }, array: function(e2) {
          return f(new Uint8Array(e2), new Array(e2.byteLength));
        }, arraybuffer: n, uint8array: function(e2) {
          return new Uint8Array(e2);
        }, nodebuffer: function(e2) {
          return r.newBufferFrom(new Uint8Array(e2));
        } }, c.uint8array = { string: s, array: function(e2) {
          return f(e2, new Array(e2.length));
        }, arraybuffer: function(e2) {
          return e2.buffer;
        }, uint8array: n, nodebuffer: function(e2) {
          return r.newBufferFrom(e2);
        } }, c.nodebuffer = { string: s, array: function(e2) {
          return f(e2, new Array(e2.length));
        }, arraybuffer: function(e2) {
          return c.nodebuffer.uint8array(e2).buffer;
        }, uint8array: function(e2) {
          return f(e2, new Uint8Array(e2.length));
        }, nodebuffer: n }, a.transformTo = function(e2, t2) {
          if (t2 = t2 || "", !e2) return t2;
          a.checkSupport(e2);
          var r2 = a.getTypeOf(t2);
          return c[r2][e2](t2);
        }, a.resolve = function(e2) {
          for (var t2 = e2.split("/"), r2 = [], n2 = 0; n2 < t2.length; n2++) {
            var i2 = t2[n2];
            "." === i2 || "" === i2 && 0 !== n2 && n2 !== t2.length - 1 || (".." === i2 ? r2.pop() : r2.push(i2));
          }
          return r2.join("/");
        }, a.getTypeOf = function(e2) {
          return "string" == typeof e2 ? "string" : "[object Array]" === Object.prototype.toString.call(e2) ? "array" : o.nodebuffer && r.isBuffer(e2) ? "nodebuffer" : o.uint8array && e2 instanceof Uint8Array ? "uint8array" : o.arraybuffer && e2 instanceof ArrayBuffer ? "arraybuffer" : void 0;
        }, a.checkSupport = function(e2) {
          if (!o[e2.toLowerCase()]) throw new Error(e2 + " is not supported by this platform");
        }, a.MAX_VALUE_16BITS = 65535, a.MAX_VALUE_32BITS = -1, a.pretty = function(e2) {
          var t2, r2, n2 = "";
          for (r2 = 0; r2 < (e2 || "").length; r2++) n2 += "\\x" + ((t2 = e2.charCodeAt(r2)) < 16 ? "0" : "") + t2.toString(16).toUpperCase();
          return n2;
        }, a.delay = function(e2, t2, r2) {
          setImmediate(function() {
            e2.apply(r2 || null, t2 || []);
          });
        }, a.inherits = function(e2, t2) {
          function r2() {
          }
          r2.prototype = t2.prototype, e2.prototype = new r2();
        }, a.extend = function() {
          var e2, t2, r2 = {};
          for (e2 = 0; e2 < arguments.length; e2++) for (t2 in arguments[e2]) Object.prototype.hasOwnProperty.call(arguments[e2], t2) && void 0 === r2[t2] && (r2[t2] = arguments[e2][t2]);
          return r2;
        }, a.prepareContent = function(r2, e2, n2, i2, s2) {
          return u.Promise.resolve(e2).then(function(n3) {
            return o.blob && (n3 instanceof Blob || -1 !== ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(n3))) && "undefined" != typeof FileReader ? new u.Promise(function(t2, r3) {
              var e3 = new FileReader();
              e3.onload = function(e4) {
                t2(e4.target.result);
              }, e3.onerror = function(e4) {
                r3(e4.target.error);
              }, e3.readAsArrayBuffer(n3);
            }) : n3;
          }).then(function(e3) {
            var t2 = a.getTypeOf(e3);
            return t2 ? ("arraybuffer" === t2 ? e3 = a.transformTo("uint8array", e3) : "string" === t2 && (s2 ? e3 = h.decode(e3) : n2 && true !== i2 && (e3 = (function(e4) {
              return l(e4, o.uint8array ? new Uint8Array(e4.length) : new Array(e4.length));
            })(e3))), e3) : u.Promise.reject(new Error("Can't read the data of '" + r2 + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
          });
        };
      }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, t, r) {
        "use strict";
        var n = e("./reader/readerFor"), i = e("./utils"), s = e("./signature"), a = e("./zipEntry"), o = e("./support");
        function h(e2) {
          this.files = [], this.loadOptions = e2;
        }
        h.prototype = { checkSignature: function(e2) {
          if (!this.reader.readAndCheckSignature(e2)) {
            this.reader.index -= 4;
            var t2 = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature (" + i.pretty(t2) + ", expected " + i.pretty(e2) + ")");
          }
        }, isSignature: function(e2, t2) {
          var r2 = this.reader.index;
          this.reader.setIndex(e2);
          var n2 = this.reader.readString(4) === t2;
          return this.reader.setIndex(r2), n2;
        }, readBlockEndOfCentral: function() {
          this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
          var e2 = this.reader.readData(this.zipCommentLength), t2 = o.uint8array ? "uint8array" : "array", r2 = i.transformTo(t2, e2);
          this.zipComment = this.loadOptions.decodeFileName(r2);
        }, readBlockZip64EndOfCentral: function() {
          this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
          for (var e2, t2, r2, n2 = this.zip64EndOfCentralSize - 44; 0 < n2; ) e2 = this.reader.readInt(2), t2 = this.reader.readInt(4), r2 = this.reader.readData(t2), this.zip64ExtensibleData[e2] = { id: e2, length: t2, value: r2 };
        }, readBlockZip64EndOfCentralLocator: function() {
          if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
        }, readLocalFiles: function() {
          var e2, t2;
          for (e2 = 0; e2 < this.files.length; e2++) t2 = this.files[e2], this.reader.setIndex(t2.localHeaderOffset), this.checkSignature(s.LOCAL_FILE_HEADER), t2.readLocalPart(this.reader), t2.handleUTF8(), t2.processAttributes();
        }, readCentralDir: function() {
          var e2;
          for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER); ) (e2 = new a({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(e2);
          if (this.centralDirRecords !== this.files.length && 0 !== this.centralDirRecords && 0 === this.files.length) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
        }, readEndOfCentral: function() {
          var e2 = this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);
          if (e2 < 0) throw !this.isSignature(0, s.LOCAL_FILE_HEADER) ? new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html") : new Error("Corrupted zip: can't find end of central directory");
          this.reader.setIndex(e2);
          var t2 = e2;
          if (this.checkSignature(s.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === i.MAX_VALUE_16BITS || this.diskWithCentralDirStart === i.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === i.MAX_VALUE_16BITS || this.centralDirRecords === i.MAX_VALUE_16BITS || this.centralDirSize === i.MAX_VALUE_32BITS || this.centralDirOffset === i.MAX_VALUE_32BITS) {
            if (this.zip64 = true, (e2 = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            if (this.reader.setIndex(e2), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, s.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
          }
          var r2 = this.centralDirOffset + this.centralDirSize;
          this.zip64 && (r2 += 20, r2 += 12 + this.zip64EndOfCentralSize);
          var n2 = t2 - r2;
          if (0 < n2) this.isSignature(t2, s.CENTRAL_FILE_HEADER) || (this.reader.zero = n2);
          else if (n2 < 0) throw new Error("Corrupted zip: missing " + Math.abs(n2) + " bytes.");
        }, prepareReader: function(e2) {
          this.reader = n(e2);
        }, load: function(e2) {
          this.prepareReader(e2), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
        } }, t.exports = h;
      }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, t, r) {
        "use strict";
        var n = e("./reader/readerFor"), s = e("./utils"), i = e("./compressedObject"), a = e("./crc32"), o = e("./utf8"), h = e("./compressions"), u = e("./support");
        function l(e2, t2) {
          this.options = e2, this.loadOptions = t2;
        }
        l.prototype = { isEncrypted: function() {
          return 1 == (1 & this.bitFlag);
        }, useUTF8: function() {
          return 2048 == (2048 & this.bitFlag);
        }, readLocalPart: function(e2) {
          var t2, r2;
          if (e2.skip(22), this.fileNameLength = e2.readInt(2), r2 = e2.readInt(2), this.fileName = e2.readData(this.fileNameLength), e2.skip(r2), -1 === this.compressedSize || -1 === this.uncompressedSize) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
          if (null === (t2 = (function(e3) {
            for (var t3 in h) if (Object.prototype.hasOwnProperty.call(h, t3) && h[t3].magic === e3) return h[t3];
            return null;
          })(this.compressionMethod))) throw new Error("Corrupted zip : compression " + s.pretty(this.compressionMethod) + " unknown (inner file : " + s.transformTo("string", this.fileName) + ")");
          this.decompressed = new i(this.compressedSize, this.uncompressedSize, this.crc32, t2, e2.readData(this.compressedSize));
        }, readCentralPart: function(e2) {
          this.versionMadeBy = e2.readInt(2), e2.skip(2), this.bitFlag = e2.readInt(2), this.compressionMethod = e2.readString(2), this.date = e2.readDate(), this.crc32 = e2.readInt(4), this.compressedSize = e2.readInt(4), this.uncompressedSize = e2.readInt(4);
          var t2 = e2.readInt(2);
          if (this.extraFieldsLength = e2.readInt(2), this.fileCommentLength = e2.readInt(2), this.diskNumberStart = e2.readInt(2), this.internalFileAttributes = e2.readInt(2), this.externalFileAttributes = e2.readInt(4), this.localHeaderOffset = e2.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
          e2.skip(t2), this.readExtraFields(e2), this.parseZIP64ExtraField(e2), this.fileComment = e2.readData(this.fileCommentLength);
        }, processAttributes: function() {
          this.unixPermissions = null, this.dosPermissions = null;
          var e2 = this.versionMadeBy >> 8;
          this.dir = !!(16 & this.externalFileAttributes), 0 == e2 && (this.dosPermissions = 63 & this.externalFileAttributes), 3 == e2 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || "/" !== this.fileNameStr.slice(-1) || (this.dir = true);
        }, parseZIP64ExtraField: function() {
          if (this.extraFields[1]) {
            var e2 = n(this.extraFields[1].value);
            this.uncompressedSize === s.MAX_VALUE_32BITS && (this.uncompressedSize = e2.readInt(8)), this.compressedSize === s.MAX_VALUE_32BITS && (this.compressedSize = e2.readInt(8)), this.localHeaderOffset === s.MAX_VALUE_32BITS && (this.localHeaderOffset = e2.readInt(8)), this.diskNumberStart === s.MAX_VALUE_32BITS && (this.diskNumberStart = e2.readInt(4));
          }
        }, readExtraFields: function(e2) {
          var t2, r2, n2, i2 = e2.index + this.extraFieldsLength;
          for (this.extraFields || (this.extraFields = {}); e2.index + 4 < i2; ) t2 = e2.readInt(2), r2 = e2.readInt(2), n2 = e2.readData(r2), this.extraFields[t2] = { id: t2, length: r2, value: n2 };
          e2.setIndex(i2);
        }, handleUTF8: function() {
          var e2 = u.uint8array ? "uint8array" : "array";
          if (this.useUTF8()) this.fileNameStr = o.utf8decode(this.fileName), this.fileCommentStr = o.utf8decode(this.fileComment);
          else {
            var t2 = this.findExtraFieldUnicodePath();
            if (null !== t2) this.fileNameStr = t2;
            else {
              var r2 = s.transformTo(e2, this.fileName);
              this.fileNameStr = this.loadOptions.decodeFileName(r2);
            }
            var n2 = this.findExtraFieldUnicodeComment();
            if (null !== n2) this.fileCommentStr = n2;
            else {
              var i2 = s.transformTo(e2, this.fileComment);
              this.fileCommentStr = this.loadOptions.decodeFileName(i2);
            }
          }
        }, findExtraFieldUnicodePath: function() {
          var e2 = this.extraFields[28789];
          if (e2) {
            var t2 = n(e2.value);
            return 1 !== t2.readInt(1) ? null : a(this.fileName) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
          }
          return null;
        }, findExtraFieldUnicodeComment: function() {
          var e2 = this.extraFields[25461];
          if (e2) {
            var t2 = n(e2.value);
            return 1 !== t2.readInt(1) ? null : a(this.fileComment) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
          }
          return null;
        } }, t.exports = l;
      }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, t, r) {
        "use strict";
        function n(e2, t2, r2) {
          this.name = e2, this.dir = r2.dir, this.date = r2.date, this.comment = r2.comment, this.unixPermissions = r2.unixPermissions, this.dosPermissions = r2.dosPermissions, this._data = t2, this._dataBinary = r2.binary, this.options = { compression: r2.compression, compressionOptions: r2.compressionOptions };
        }
        var s = e("./stream/StreamHelper"), i = e("./stream/DataWorker"), a = e("./utf8"), o = e("./compressedObject"), h = e("./stream/GenericWorker");
        n.prototype = { internalStream: function(e2) {
          var t2 = null, r2 = "string";
          try {
            if (!e2) throw new Error("No output type specified.");
            var n2 = "string" === (r2 = e2.toLowerCase()) || "text" === r2;
            "binarystring" !== r2 && "text" !== r2 || (r2 = "string"), t2 = this._decompressWorker();
            var i2 = !this._dataBinary;
            i2 && !n2 && (t2 = t2.pipe(new a.Utf8EncodeWorker())), !i2 && n2 && (t2 = t2.pipe(new a.Utf8DecodeWorker()));
          } catch (e3) {
            (t2 = new h("error")).error(e3);
          }
          return new s(t2, r2, "");
        }, async: function(e2, t2) {
          return this.internalStream(e2).accumulate(t2);
        }, nodeStream: function(e2, t2) {
          return this.internalStream(e2 || "nodebuffer").toNodejsStream(t2);
        }, _compressWorker: function(e2, t2) {
          if (this._data instanceof o && this._data.compression.magic === e2.magic) return this._data.getCompressedWorker();
          var r2 = this._decompressWorker();
          return this._dataBinary || (r2 = r2.pipe(new a.Utf8EncodeWorker())), o.createWorkerFrom(r2, e2, t2);
        }, _decompressWorker: function() {
          return this._data instanceof o ? this._data.getContentWorker() : this._data instanceof h ? this._data : new i(this._data);
        } };
        for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], l = function() {
          throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        }, f = 0; f < u.length; f++) n.prototype[u[f]] = l;
        t.exports = n;
      }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, l, t) {
        (function(t2) {
          "use strict";
          var r, n, e2 = t2.MutationObserver || t2.WebKitMutationObserver;
          if (e2) {
            var i = 0, s = new e2(u), a = t2.document.createTextNode("");
            s.observe(a, { characterData: true }), r = function() {
              a.data = i = ++i % 2;
            };
          } else if (t2.setImmediate || void 0 === t2.MessageChannel) r = "document" in t2 && "onreadystatechange" in t2.document.createElement("script") ? function() {
            var e3 = t2.document.createElement("script");
            e3.onreadystatechange = function() {
              u(), e3.onreadystatechange = null, e3.parentNode.removeChild(e3), e3 = null;
            }, t2.document.documentElement.appendChild(e3);
          } : function() {
            setTimeout(u, 0);
          };
          else {
            var o = new t2.MessageChannel();
            o.port1.onmessage = u, r = function() {
              o.port2.postMessage(0);
            };
          }
          var h = [];
          function u() {
            var e3, t3;
            n = true;
            for (var r2 = h.length; r2; ) {
              for (t3 = h, h = [], e3 = -1; ++e3 < r2; ) t3[e3]();
              r2 = h.length;
            }
            n = false;
          }
          l.exports = function(e3) {
            1 !== h.push(e3) || n || r();
          };
        }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
      }, {}], 37: [function(e, t, r) {
        "use strict";
        var i = e("immediate");
        function u() {
        }
        var l = {}, s = ["REJECTED"], a = ["FULFILLED"], n = ["PENDING"];
        function o(e2) {
          if ("function" != typeof e2) throw new TypeError("resolver must be a function");
          this.state = n, this.queue = [], this.outcome = void 0, e2 !== u && d(this, e2);
        }
        function h(e2, t2, r2) {
          this.promise = e2, "function" == typeof t2 && (this.onFulfilled = t2, this.callFulfilled = this.otherCallFulfilled), "function" == typeof r2 && (this.onRejected = r2, this.callRejected = this.otherCallRejected);
        }
        function f(t2, r2, n2) {
          i(function() {
            var e2;
            try {
              e2 = r2(n2);
            } catch (e3) {
              return l.reject(t2, e3);
            }
            e2 === t2 ? l.reject(t2, new TypeError("Cannot resolve promise with itself")) : l.resolve(t2, e2);
          });
        }
        function c(e2) {
          var t2 = e2 && e2.then;
          if (e2 && ("object" == typeof e2 || "function" == typeof e2) && "function" == typeof t2) return function() {
            t2.apply(e2, arguments);
          };
        }
        function d(t2, e2) {
          var r2 = false;
          function n2(e3) {
            r2 || (r2 = true, l.reject(t2, e3));
          }
          function i2(e3) {
            r2 || (r2 = true, l.resolve(t2, e3));
          }
          var s2 = p(function() {
            e2(i2, n2);
          });
          "error" === s2.status && n2(s2.value);
        }
        function p(e2, t2) {
          var r2 = {};
          try {
            r2.value = e2(t2), r2.status = "success";
          } catch (e3) {
            r2.status = "error", r2.value = e3;
          }
          return r2;
        }
        (t.exports = o).prototype.finally = function(t2) {
          if ("function" != typeof t2) return this;
          var r2 = this.constructor;
          return this.then(function(e2) {
            return r2.resolve(t2()).then(function() {
              return e2;
            });
          }, function(e2) {
            return r2.resolve(t2()).then(function() {
              throw e2;
            });
          });
        }, o.prototype.catch = function(e2) {
          return this.then(null, e2);
        }, o.prototype.then = function(e2, t2) {
          if ("function" != typeof e2 && this.state === a || "function" != typeof t2 && this.state === s) return this;
          var r2 = new this.constructor(u);
          this.state !== n ? f(r2, this.state === a ? e2 : t2, this.outcome) : this.queue.push(new h(r2, e2, t2));
          return r2;
        }, h.prototype.callFulfilled = function(e2) {
          l.resolve(this.promise, e2);
        }, h.prototype.otherCallFulfilled = function(e2) {
          f(this.promise, this.onFulfilled, e2);
        }, h.prototype.callRejected = function(e2) {
          l.reject(this.promise, e2);
        }, h.prototype.otherCallRejected = function(e2) {
          f(this.promise, this.onRejected, e2);
        }, l.resolve = function(e2, t2) {
          var r2 = p(c, t2);
          if ("error" === r2.status) return l.reject(e2, r2.value);
          var n2 = r2.value;
          if (n2) d(e2, n2);
          else {
            e2.state = a, e2.outcome = t2;
            for (var i2 = -1, s2 = e2.queue.length; ++i2 < s2; ) e2.queue[i2].callFulfilled(t2);
          }
          return e2;
        }, l.reject = function(e2, t2) {
          e2.state = s, e2.outcome = t2;
          for (var r2 = -1, n2 = e2.queue.length; ++r2 < n2; ) e2.queue[r2].callRejected(t2);
          return e2;
        }, o.resolve = function(e2) {
          if (e2 instanceof this) return e2;
          return l.resolve(new this(u), e2);
        }, o.reject = function(e2) {
          var t2 = new this(u);
          return l.reject(t2, e2);
        }, o.all = function(e2) {
          var r2 = this;
          if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
          var n2 = e2.length, i2 = false;
          if (!n2) return this.resolve([]);
          var s2 = new Array(n2), a2 = 0, t2 = -1, o2 = new this(u);
          for (; ++t2 < n2; ) h2(e2[t2], t2);
          return o2;
          function h2(e3, t3) {
            r2.resolve(e3).then(function(e4) {
              s2[t3] = e4, ++a2 !== n2 || i2 || (i2 = true, l.resolve(o2, s2));
            }, function(e4) {
              i2 || (i2 = true, l.reject(o2, e4));
            });
          }
        }, o.race = function(e2) {
          var t2 = this;
          if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
          var r2 = e2.length, n2 = false;
          if (!r2) return this.resolve([]);
          var i2 = -1, s2 = new this(u);
          for (; ++i2 < r2; ) a2 = e2[i2], t2.resolve(a2).then(function(e3) {
            n2 || (n2 = true, l.resolve(s2, e3));
          }, function(e3) {
            n2 || (n2 = true, l.reject(s2, e3));
          });
          var a2;
          return s2;
        };
      }, { immediate: 36 }], 38: [function(e, t, r) {
        "use strict";
        var n = {};
        (0, e("./lib/utils/common").assign)(n, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = n;
      }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, t, r) {
        "use strict";
        var a = e("./zlib/deflate"), o = e("./utils/common"), h = e("./utils/strings"), i = e("./zlib/messages"), s = e("./zlib/zstream"), u = Object.prototype.toString, l = 0, f = -1, c = 0, d = 8;
        function p(e2) {
          if (!(this instanceof p)) return new p(e2);
          this.options = o.assign({ level: f, method: d, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: c, to: "" }, e2 || {});
          var t2 = this.options;
          t2.raw && 0 < t2.windowBits ? t2.windowBits = -t2.windowBits : t2.gzip && 0 < t2.windowBits && t2.windowBits < 16 && (t2.windowBits += 16), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
          var r2 = a.deflateInit2(this.strm, t2.level, t2.method, t2.windowBits, t2.memLevel, t2.strategy);
          if (r2 !== l) throw new Error(i[r2]);
          if (t2.header && a.deflateSetHeader(this.strm, t2.header), t2.dictionary) {
            var n2;
            if (n2 = "string" == typeof t2.dictionary ? h.string2buf(t2.dictionary) : "[object ArrayBuffer]" === u.call(t2.dictionary) ? new Uint8Array(t2.dictionary) : t2.dictionary, (r2 = a.deflateSetDictionary(this.strm, n2)) !== l) throw new Error(i[r2]);
            this._dict_set = true;
          }
        }
        function n(e2, t2) {
          var r2 = new p(t2);
          if (r2.push(e2, true), r2.err) throw r2.msg || i[r2.err];
          return r2.result;
        }
        p.prototype.push = function(e2, t2) {
          var r2, n2, i2 = this.strm, s2 = this.options.chunkSize;
          if (this.ended) return false;
          n2 = t2 === ~~t2 ? t2 : true === t2 ? 4 : 0, "string" == typeof e2 ? i2.input = h.string2buf(e2) : "[object ArrayBuffer]" === u.call(e2) ? i2.input = new Uint8Array(e2) : i2.input = e2, i2.next_in = 0, i2.avail_in = i2.input.length;
          do {
            if (0 === i2.avail_out && (i2.output = new o.Buf8(s2), i2.next_out = 0, i2.avail_out = s2), 1 !== (r2 = a.deflate(i2, n2)) && r2 !== l) return this.onEnd(r2), !(this.ended = true);
            0 !== i2.avail_out && (0 !== i2.avail_in || 4 !== n2 && 2 !== n2) || ("string" === this.options.to ? this.onData(h.buf2binstring(o.shrinkBuf(i2.output, i2.next_out))) : this.onData(o.shrinkBuf(i2.output, i2.next_out)));
          } while ((0 < i2.avail_in || 0 === i2.avail_out) && 1 !== r2);
          return 4 === n2 ? (r2 = a.deflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === l) : 2 !== n2 || (this.onEnd(l), !(i2.avail_out = 0));
        }, p.prototype.onData = function(e2) {
          this.chunks.push(e2);
        }, p.prototype.onEnd = function(e2) {
          e2 === l && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
        }, r.Deflate = p, r.deflate = n, r.deflateRaw = function(e2, t2) {
          return (t2 = t2 || {}).raw = true, n(e2, t2);
        }, r.gzip = function(e2, t2) {
          return (t2 = t2 || {}).gzip = true, n(e2, t2);
        };
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, t, r) {
        "use strict";
        var c = e("./zlib/inflate"), d = e("./utils/common"), p = e("./utils/strings"), m = e("./zlib/constants"), n = e("./zlib/messages"), i = e("./zlib/zstream"), s = e("./zlib/gzheader"), _ = Object.prototype.toString;
        function a(e2) {
          if (!(this instanceof a)) return new a(e2);
          this.options = d.assign({ chunkSize: 16384, windowBits: 0, to: "" }, e2 || {});
          var t2 = this.options;
          t2.raw && 0 <= t2.windowBits && t2.windowBits < 16 && (t2.windowBits = -t2.windowBits, 0 === t2.windowBits && (t2.windowBits = -15)), !(0 <= t2.windowBits && t2.windowBits < 16) || e2 && e2.windowBits || (t2.windowBits += 32), 15 < t2.windowBits && t2.windowBits < 48 && 0 == (15 & t2.windowBits) && (t2.windowBits |= 15), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new i(), this.strm.avail_out = 0;
          var r2 = c.inflateInit2(this.strm, t2.windowBits);
          if (r2 !== m.Z_OK) throw new Error(n[r2]);
          this.header = new s(), c.inflateGetHeader(this.strm, this.header);
        }
        function o(e2, t2) {
          var r2 = new a(t2);
          if (r2.push(e2, true), r2.err) throw r2.msg || n[r2.err];
          return r2.result;
        }
        a.prototype.push = function(e2, t2) {
          var r2, n2, i2, s2, a2, o2, h = this.strm, u = this.options.chunkSize, l = this.options.dictionary, f = false;
          if (this.ended) return false;
          n2 = t2 === ~~t2 ? t2 : true === t2 ? m.Z_FINISH : m.Z_NO_FLUSH, "string" == typeof e2 ? h.input = p.binstring2buf(e2) : "[object ArrayBuffer]" === _.call(e2) ? h.input = new Uint8Array(e2) : h.input = e2, h.next_in = 0, h.avail_in = h.input.length;
          do {
            if (0 === h.avail_out && (h.output = new d.Buf8(u), h.next_out = 0, h.avail_out = u), (r2 = c.inflate(h, m.Z_NO_FLUSH)) === m.Z_NEED_DICT && l && (o2 = "string" == typeof l ? p.string2buf(l) : "[object ArrayBuffer]" === _.call(l) ? new Uint8Array(l) : l, r2 = c.inflateSetDictionary(this.strm, o2)), r2 === m.Z_BUF_ERROR && true === f && (r2 = m.Z_OK, f = false), r2 !== m.Z_STREAM_END && r2 !== m.Z_OK) return this.onEnd(r2), !(this.ended = true);
            h.next_out && (0 !== h.avail_out && r2 !== m.Z_STREAM_END && (0 !== h.avail_in || n2 !== m.Z_FINISH && n2 !== m.Z_SYNC_FLUSH) || ("string" === this.options.to ? (i2 = p.utf8border(h.output, h.next_out), s2 = h.next_out - i2, a2 = p.buf2string(h.output, i2), h.next_out = s2, h.avail_out = u - s2, s2 && d.arraySet(h.output, h.output, i2, s2, 0), this.onData(a2)) : this.onData(d.shrinkBuf(h.output, h.next_out)))), 0 === h.avail_in && 0 === h.avail_out && (f = true);
          } while ((0 < h.avail_in || 0 === h.avail_out) && r2 !== m.Z_STREAM_END);
          return r2 === m.Z_STREAM_END && (n2 = m.Z_FINISH), n2 === m.Z_FINISH ? (r2 = c.inflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === m.Z_OK) : n2 !== m.Z_SYNC_FLUSH || (this.onEnd(m.Z_OK), !(h.avail_out = 0));
        }, a.prototype.onData = function(e2) {
          this.chunks.push(e2);
        }, a.prototype.onEnd = function(e2) {
          e2 === m.Z_OK && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = d.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
        }, r.Inflate = a, r.inflate = o, r.inflateRaw = function(e2, t2) {
          return (t2 = t2 || {}).raw = true, o(e2, t2);
        }, r.ungzip = o;
      }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, t, r) {
        "use strict";
        var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
        r.assign = function(e2) {
          for (var t2 = Array.prototype.slice.call(arguments, 1); t2.length; ) {
            var r2 = t2.shift();
            if (r2) {
              if ("object" != typeof r2) throw new TypeError(r2 + "must be non-object");
              for (var n2 in r2) r2.hasOwnProperty(n2) && (e2[n2] = r2[n2]);
            }
          }
          return e2;
        }, r.shrinkBuf = function(e2, t2) {
          return e2.length === t2 ? e2 : e2.subarray ? e2.subarray(0, t2) : (e2.length = t2, e2);
        };
        var i = { arraySet: function(e2, t2, r2, n2, i2) {
          if (t2.subarray && e2.subarray) e2.set(t2.subarray(r2, r2 + n2), i2);
          else for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
        }, flattenChunks: function(e2) {
          var t2, r2, n2, i2, s2, a;
          for (t2 = n2 = 0, r2 = e2.length; t2 < r2; t2++) n2 += e2[t2].length;
          for (a = new Uint8Array(n2), t2 = i2 = 0, r2 = e2.length; t2 < r2; t2++) s2 = e2[t2], a.set(s2, i2), i2 += s2.length;
          return a;
        } }, s = { arraySet: function(e2, t2, r2, n2, i2) {
          for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
        }, flattenChunks: function(e2) {
          return [].concat.apply([], e2);
        } };
        r.setTyped = function(e2) {
          e2 ? (r.Buf8 = Uint8Array, r.Buf16 = Uint16Array, r.Buf32 = Int32Array, r.assign(r, i)) : (r.Buf8 = Array, r.Buf16 = Array, r.Buf32 = Array, r.assign(r, s));
        }, r.setTyped(n);
      }, {}], 42: [function(e, t, r) {
        "use strict";
        var h = e("./common"), i = true, s = true;
        try {
          String.fromCharCode.apply(null, [0]);
        } catch (e2) {
          i = false;
        }
        try {
          String.fromCharCode.apply(null, new Uint8Array(1));
        } catch (e2) {
          s = false;
        }
        for (var u = new h.Buf8(256), n = 0; n < 256; n++) u[n] = 252 <= n ? 6 : 248 <= n ? 5 : 240 <= n ? 4 : 224 <= n ? 3 : 192 <= n ? 2 : 1;
        function l(e2, t2) {
          if (t2 < 65537 && (e2.subarray && s || !e2.subarray && i)) return String.fromCharCode.apply(null, h.shrinkBuf(e2, t2));
          for (var r2 = "", n2 = 0; n2 < t2; n2++) r2 += String.fromCharCode(e2[n2]);
          return r2;
        }
        u[254] = u[254] = 1, r.string2buf = function(e2) {
          var t2, r2, n2, i2, s2, a = e2.length, o = 0;
          for (i2 = 0; i2 < a; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
          for (t2 = new h.Buf8(o), i2 = s2 = 0; s2 < o; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
          return t2;
        }, r.buf2binstring = function(e2) {
          return l(e2, e2.length);
        }, r.binstring2buf = function(e2) {
          for (var t2 = new h.Buf8(e2.length), r2 = 0, n2 = t2.length; r2 < n2; r2++) t2[r2] = e2.charCodeAt(r2);
          return t2;
        }, r.buf2string = function(e2, t2) {
          var r2, n2, i2, s2, a = t2 || e2.length, o = new Array(2 * a);
          for (r2 = n2 = 0; r2 < a; ) if ((i2 = e2[r2++]) < 128) o[n2++] = i2;
          else if (4 < (s2 = u[i2])) o[n2++] = 65533, r2 += s2 - 1;
          else {
            for (i2 &= 2 === s2 ? 31 : 3 === s2 ? 15 : 7; 1 < s2 && r2 < a; ) i2 = i2 << 6 | 63 & e2[r2++], s2--;
            1 < s2 ? o[n2++] = 65533 : i2 < 65536 ? o[n2++] = i2 : (i2 -= 65536, o[n2++] = 55296 | i2 >> 10 & 1023, o[n2++] = 56320 | 1023 & i2);
          }
          return l(o, n2);
        }, r.utf8border = function(e2, t2) {
          var r2;
          for ((t2 = t2 || e2.length) > e2.length && (t2 = e2.length), r2 = t2 - 1; 0 <= r2 && 128 == (192 & e2[r2]); ) r2--;
          return r2 < 0 ? t2 : 0 === r2 ? t2 : r2 + u[e2[r2]] > t2 ? r2 : t2;
        };
      }, { "./common": 41 }], 43: [function(e, t, r) {
        "use strict";
        t.exports = function(e2, t2, r2, n) {
          for (var i = 65535 & e2 | 0, s = e2 >>> 16 & 65535 | 0, a = 0; 0 !== r2; ) {
            for (r2 -= a = 2e3 < r2 ? 2e3 : r2; s = s + (i = i + t2[n++] | 0) | 0, --a; ) ;
            i %= 65521, s %= 65521;
          }
          return i | s << 16 | 0;
        };
      }, {}], 44: [function(e, t, r) {
        "use strict";
        t.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
      }, {}], 45: [function(e, t, r) {
        "use strict";
        var o = (function() {
          for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
            e2 = r2;
            for (var n = 0; n < 8; n++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
            t2[r2] = e2;
          }
          return t2;
        })();
        t.exports = function(e2, t2, r2, n) {
          var i = o, s = n + r2;
          e2 ^= -1;
          for (var a = n; a < s; a++) e2 = e2 >>> 8 ^ i[255 & (e2 ^ t2[a])];
          return -1 ^ e2;
        };
      }, {}], 46: [function(e, t, r) {
        "use strict";
        var h, c = e("../utils/common"), u = e("./trees"), d = e("./adler32"), p = e("./crc32"), n = e("./messages"), l = 0, f = 4, m = 0, _ = -2, g = -1, b2 = 4, i = 2, v = 8, y = 9, s = 286, a = 30, o = 19, w = 2 * s + 1, k = 15, x = 3, S = 258, z = S + x + 1, C = 42, E = 113, A = 1, I = 2, O = 3, B = 4;
        function R(e2, t2) {
          return e2.msg = n[t2], t2;
        }
        function T(e2) {
          return (e2 << 1) - (4 < e2 ? 9 : 0);
        }
        function D(e2) {
          for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
        }
        function F(e2) {
          var t2 = e2.state, r2 = t2.pending;
          r2 > e2.avail_out && (r2 = e2.avail_out), 0 !== r2 && (c.arraySet(e2.output, t2.pending_buf, t2.pending_out, r2, e2.next_out), e2.next_out += r2, t2.pending_out += r2, e2.total_out += r2, e2.avail_out -= r2, t2.pending -= r2, 0 === t2.pending && (t2.pending_out = 0));
        }
        function N(e2, t2) {
          u._tr_flush_block(e2, 0 <= e2.block_start ? e2.block_start : -1, e2.strstart - e2.block_start, t2), e2.block_start = e2.strstart, F(e2.strm);
        }
        function U(e2, t2) {
          e2.pending_buf[e2.pending++] = t2;
        }
        function P(e2, t2) {
          e2.pending_buf[e2.pending++] = t2 >>> 8 & 255, e2.pending_buf[e2.pending++] = 255 & t2;
        }
        function L(e2, t2) {
          var r2, n2, i2 = e2.max_chain_length, s2 = e2.strstart, a2 = e2.prev_length, o2 = e2.nice_match, h2 = e2.strstart > e2.w_size - z ? e2.strstart - (e2.w_size - z) : 0, u2 = e2.window, l2 = e2.w_mask, f2 = e2.prev, c2 = e2.strstart + S, d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
          e2.prev_length >= e2.good_match && (i2 >>= 2), o2 > e2.lookahead && (o2 = e2.lookahead);
          do {
            if (u2[(r2 = t2) + a2] === p2 && u2[r2 + a2 - 1] === d2 && u2[r2] === u2[s2] && u2[++r2] === u2[s2 + 1]) {
              s2 += 2, r2++;
              do {
              } while (u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && s2 < c2);
              if (n2 = S - (c2 - s2), s2 = c2 - S, a2 < n2) {
                if (e2.match_start = t2, o2 <= (a2 = n2)) break;
                d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
              }
            }
          } while ((t2 = f2[t2 & l2]) > h2 && 0 != --i2);
          return a2 <= e2.lookahead ? a2 : e2.lookahead;
        }
        function j(e2) {
          var t2, r2, n2, i2, s2, a2, o2, h2, u2, l2, f2 = e2.w_size;
          do {
            if (i2 = e2.window_size - e2.lookahead - e2.strstart, e2.strstart >= f2 + (f2 - z)) {
              for (c.arraySet(e2.window, e2.window, f2, f2, 0), e2.match_start -= f2, e2.strstart -= f2, e2.block_start -= f2, t2 = r2 = e2.hash_size; n2 = e2.head[--t2], e2.head[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
              for (t2 = r2 = f2; n2 = e2.prev[--t2], e2.prev[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
              i2 += f2;
            }
            if (0 === e2.strm.avail_in) break;
            if (a2 = e2.strm, o2 = e2.window, h2 = e2.strstart + e2.lookahead, u2 = i2, l2 = void 0, l2 = a2.avail_in, u2 < l2 && (l2 = u2), r2 = 0 === l2 ? 0 : (a2.avail_in -= l2, c.arraySet(o2, a2.input, a2.next_in, l2, h2), 1 === a2.state.wrap ? a2.adler = d(a2.adler, o2, l2, h2) : 2 === a2.state.wrap && (a2.adler = p(a2.adler, o2, l2, h2)), a2.next_in += l2, a2.total_in += l2, l2), e2.lookahead += r2, e2.lookahead + e2.insert >= x) for (s2 = e2.strstart - e2.insert, e2.ins_h = e2.window[s2], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + 1]) & e2.hash_mask; e2.insert && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + x - 1]) & e2.hash_mask, e2.prev[s2 & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = s2, s2++, e2.insert--, !(e2.lookahead + e2.insert < x)); ) ;
          } while (e2.lookahead < z && 0 !== e2.strm.avail_in);
        }
        function Z(e2, t2) {
          for (var r2, n2; ; ) {
            if (e2.lookahead < z) {
              if (j(e2), e2.lookahead < z && t2 === l) return A;
              if (0 === e2.lookahead) break;
            }
            if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 !== r2 && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2)), e2.match_length >= x) if (n2 = u._tr_tally(e2, e2.strstart - e2.match_start, e2.match_length - x), e2.lookahead -= e2.match_length, e2.match_length <= e2.max_lazy_match && e2.lookahead >= x) {
              for (e2.match_length--; e2.strstart++, e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart, 0 != --e2.match_length; ) ;
              e2.strstart++;
            } else e2.strstart += e2.match_length, e2.match_length = 0, e2.ins_h = e2.window[e2.strstart], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + 1]) & e2.hash_mask;
            else n2 = u._tr_tally(e2, 0, e2.window[e2.strstart]), e2.lookahead--, e2.strstart++;
            if (n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
          }
          return e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
        }
        function W(e2, t2) {
          for (var r2, n2, i2; ; ) {
            if (e2.lookahead < z) {
              if (j(e2), e2.lookahead < z && t2 === l) return A;
              if (0 === e2.lookahead) break;
            }
            if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), e2.prev_length = e2.match_length, e2.prev_match = e2.match_start, e2.match_length = x - 1, 0 !== r2 && e2.prev_length < e2.max_lazy_match && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2), e2.match_length <= 5 && (1 === e2.strategy || e2.match_length === x && 4096 < e2.strstart - e2.match_start) && (e2.match_length = x - 1)), e2.prev_length >= x && e2.match_length <= e2.prev_length) {
              for (i2 = e2.strstart + e2.lookahead - x, n2 = u._tr_tally(e2, e2.strstart - 1 - e2.prev_match, e2.prev_length - x), e2.lookahead -= e2.prev_length - 1, e2.prev_length -= 2; ++e2.strstart <= i2 && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 != --e2.prev_length; ) ;
              if (e2.match_available = 0, e2.match_length = x - 1, e2.strstart++, n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
            } else if (e2.match_available) {
              if ((n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1])) && N(e2, false), e2.strstart++, e2.lookahead--, 0 === e2.strm.avail_out) return A;
            } else e2.match_available = 1, e2.strstart++, e2.lookahead--;
          }
          return e2.match_available && (n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1]), e2.match_available = 0), e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
        }
        function M(e2, t2, r2, n2, i2) {
          this.good_length = e2, this.max_lazy = t2, this.nice_length = r2, this.max_chain = n2, this.func = i2;
        }
        function H() {
          this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = v, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new c.Buf16(2 * w), this.dyn_dtree = new c.Buf16(2 * (2 * a + 1)), this.bl_tree = new c.Buf16(2 * (2 * o + 1)), D(this.dyn_ltree), D(this.dyn_dtree), D(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new c.Buf16(k + 1), this.heap = new c.Buf16(2 * s + 1), D(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new c.Buf16(2 * s + 1), D(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
        }
        function G(e2) {
          var t2;
          return e2 && e2.state ? (e2.total_in = e2.total_out = 0, e2.data_type = i, (t2 = e2.state).pending = 0, t2.pending_out = 0, t2.wrap < 0 && (t2.wrap = -t2.wrap), t2.status = t2.wrap ? C : E, e2.adler = 2 === t2.wrap ? 0 : 1, t2.last_flush = l, u._tr_init(t2), m) : R(e2, _);
        }
        function K(e2) {
          var t2 = G(e2);
          return t2 === m && (function(e3) {
            e3.window_size = 2 * e3.w_size, D(e3.head), e3.max_lazy_match = h[e3.level].max_lazy, e3.good_match = h[e3.level].good_length, e3.nice_match = h[e3.level].nice_length, e3.max_chain_length = h[e3.level].max_chain, e3.strstart = 0, e3.block_start = 0, e3.lookahead = 0, e3.insert = 0, e3.match_length = e3.prev_length = x - 1, e3.match_available = 0, e3.ins_h = 0;
          })(e2.state), t2;
        }
        function Y(e2, t2, r2, n2, i2, s2) {
          if (!e2) return _;
          var a2 = 1;
          if (t2 === g && (t2 = 6), n2 < 0 ? (a2 = 0, n2 = -n2) : 15 < n2 && (a2 = 2, n2 -= 16), i2 < 1 || y < i2 || r2 !== v || n2 < 8 || 15 < n2 || t2 < 0 || 9 < t2 || s2 < 0 || b2 < s2) return R(e2, _);
          8 === n2 && (n2 = 9);
          var o2 = new H();
          return (e2.state = o2).strm = e2, o2.wrap = a2, o2.gzhead = null, o2.w_bits = n2, o2.w_size = 1 << o2.w_bits, o2.w_mask = o2.w_size - 1, o2.hash_bits = i2 + 7, o2.hash_size = 1 << o2.hash_bits, o2.hash_mask = o2.hash_size - 1, o2.hash_shift = ~~((o2.hash_bits + x - 1) / x), o2.window = new c.Buf8(2 * o2.w_size), o2.head = new c.Buf16(o2.hash_size), o2.prev = new c.Buf16(o2.w_size), o2.lit_bufsize = 1 << i2 + 6, o2.pending_buf_size = 4 * o2.lit_bufsize, o2.pending_buf = new c.Buf8(o2.pending_buf_size), o2.d_buf = 1 * o2.lit_bufsize, o2.l_buf = 3 * o2.lit_bufsize, o2.level = t2, o2.strategy = s2, o2.method = r2, K(e2);
        }
        h = [new M(0, 0, 0, 0, function(e2, t2) {
          var r2 = 65535;
          for (r2 > e2.pending_buf_size - 5 && (r2 = e2.pending_buf_size - 5); ; ) {
            if (e2.lookahead <= 1) {
              if (j(e2), 0 === e2.lookahead && t2 === l) return A;
              if (0 === e2.lookahead) break;
            }
            e2.strstart += e2.lookahead, e2.lookahead = 0;
            var n2 = e2.block_start + r2;
            if ((0 === e2.strstart || e2.strstart >= n2) && (e2.lookahead = e2.strstart - n2, e2.strstart = n2, N(e2, false), 0 === e2.strm.avail_out)) return A;
            if (e2.strstart - e2.block_start >= e2.w_size - z && (N(e2, false), 0 === e2.strm.avail_out)) return A;
          }
          return e2.insert = 0, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : (e2.strstart > e2.block_start && (N(e2, false), e2.strm.avail_out), A);
        }), new M(4, 4, 8, 4, Z), new M(4, 5, 16, 8, Z), new M(4, 6, 32, 32, Z), new M(4, 4, 16, 16, W), new M(8, 16, 32, 32, W), new M(8, 16, 128, 128, W), new M(8, 32, 128, 256, W), new M(32, 128, 258, 1024, W), new M(32, 258, 258, 4096, W)], r.deflateInit = function(e2, t2) {
          return Y(e2, t2, v, 15, 8, 0);
        }, r.deflateInit2 = Y, r.deflateReset = K, r.deflateResetKeep = G, r.deflateSetHeader = function(e2, t2) {
          return e2 && e2.state ? 2 !== e2.state.wrap ? _ : (e2.state.gzhead = t2, m) : _;
        }, r.deflate = function(e2, t2) {
          var r2, n2, i2, s2;
          if (!e2 || !e2.state || 5 < t2 || t2 < 0) return e2 ? R(e2, _) : _;
          if (n2 = e2.state, !e2.output || !e2.input && 0 !== e2.avail_in || 666 === n2.status && t2 !== f) return R(e2, 0 === e2.avail_out ? -5 : _);
          if (n2.strm = e2, r2 = n2.last_flush, n2.last_flush = t2, n2.status === C) if (2 === n2.wrap) e2.adler = 0, U(n2, 31), U(n2, 139), U(n2, 8), n2.gzhead ? (U(n2, (n2.gzhead.text ? 1 : 0) + (n2.gzhead.hcrc ? 2 : 0) + (n2.gzhead.extra ? 4 : 0) + (n2.gzhead.name ? 8 : 0) + (n2.gzhead.comment ? 16 : 0)), U(n2, 255 & n2.gzhead.time), U(n2, n2.gzhead.time >> 8 & 255), U(n2, n2.gzhead.time >> 16 & 255), U(n2, n2.gzhead.time >> 24 & 255), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 255 & n2.gzhead.os), n2.gzhead.extra && n2.gzhead.extra.length && (U(n2, 255 & n2.gzhead.extra.length), U(n2, n2.gzhead.extra.length >> 8 & 255)), n2.gzhead.hcrc && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending, 0)), n2.gzindex = 0, n2.status = 69) : (U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 3), n2.status = E);
          else {
            var a2 = v + (n2.w_bits - 8 << 4) << 8;
            a2 |= (2 <= n2.strategy || n2.level < 2 ? 0 : n2.level < 6 ? 1 : 6 === n2.level ? 2 : 3) << 6, 0 !== n2.strstart && (a2 |= 32), a2 += 31 - a2 % 31, n2.status = E, P(n2, a2), 0 !== n2.strstart && (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), e2.adler = 1;
          }
          if (69 === n2.status) if (n2.gzhead.extra) {
            for (i2 = n2.pending; n2.gzindex < (65535 & n2.gzhead.extra.length) && (n2.pending !== n2.pending_buf_size || (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending !== n2.pending_buf_size)); ) U(n2, 255 & n2.gzhead.extra[n2.gzindex]), n2.gzindex++;
            n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), n2.gzindex === n2.gzhead.extra.length && (n2.gzindex = 0, n2.status = 73);
          } else n2.status = 73;
          if (73 === n2.status) if (n2.gzhead.name) {
            i2 = n2.pending;
            do {
              if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                s2 = 1;
                break;
              }
              s2 = n2.gzindex < n2.gzhead.name.length ? 255 & n2.gzhead.name.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
            } while (0 !== s2);
            n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.gzindex = 0, n2.status = 91);
          } else n2.status = 91;
          if (91 === n2.status) if (n2.gzhead.comment) {
            i2 = n2.pending;
            do {
              if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                s2 = 1;
                break;
              }
              s2 = n2.gzindex < n2.gzhead.comment.length ? 255 & n2.gzhead.comment.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
            } while (0 !== s2);
            n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.status = 103);
          } else n2.status = 103;
          if (103 === n2.status && (n2.gzhead.hcrc ? (n2.pending + 2 > n2.pending_buf_size && F(e2), n2.pending + 2 <= n2.pending_buf_size && (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), e2.adler = 0, n2.status = E)) : n2.status = E), 0 !== n2.pending) {
            if (F(e2), 0 === e2.avail_out) return n2.last_flush = -1, m;
          } else if (0 === e2.avail_in && T(t2) <= T(r2) && t2 !== f) return R(e2, -5);
          if (666 === n2.status && 0 !== e2.avail_in) return R(e2, -5);
          if (0 !== e2.avail_in || 0 !== n2.lookahead || t2 !== l && 666 !== n2.status) {
            var o2 = 2 === n2.strategy ? (function(e3, t3) {
              for (var r3; ; ) {
                if (0 === e3.lookahead && (j(e3), 0 === e3.lookahead)) {
                  if (t3 === l) return A;
                  break;
                }
                if (e3.match_length = 0, r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++, r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
              }
              return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
            })(n2, t2) : 3 === n2.strategy ? (function(e3, t3) {
              for (var r3, n3, i3, s3, a3 = e3.window; ; ) {
                if (e3.lookahead <= S) {
                  if (j(e3), e3.lookahead <= S && t3 === l) return A;
                  if (0 === e3.lookahead) break;
                }
                if (e3.match_length = 0, e3.lookahead >= x && 0 < e3.strstart && (n3 = a3[i3 = e3.strstart - 1]) === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3]) {
                  s3 = e3.strstart + S;
                  do {
                  } while (n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && i3 < s3);
                  e3.match_length = S - (s3 - i3), e3.match_length > e3.lookahead && (e3.match_length = e3.lookahead);
                }
                if (e3.match_length >= x ? (r3 = u._tr_tally(e3, 1, e3.match_length - x), e3.lookahead -= e3.match_length, e3.strstart += e3.match_length, e3.match_length = 0) : (r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++), r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
              }
              return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
            })(n2, t2) : h[n2.level].func(n2, t2);
            if (o2 !== O && o2 !== B || (n2.status = 666), o2 === A || o2 === O) return 0 === e2.avail_out && (n2.last_flush = -1), m;
            if (o2 === I && (1 === t2 ? u._tr_align(n2) : 5 !== t2 && (u._tr_stored_block(n2, 0, 0, false), 3 === t2 && (D(n2.head), 0 === n2.lookahead && (n2.strstart = 0, n2.block_start = 0, n2.insert = 0))), F(e2), 0 === e2.avail_out)) return n2.last_flush = -1, m;
          }
          return t2 !== f ? m : n2.wrap <= 0 ? 1 : (2 === n2.wrap ? (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), U(n2, e2.adler >> 16 & 255), U(n2, e2.adler >> 24 & 255), U(n2, 255 & e2.total_in), U(n2, e2.total_in >> 8 & 255), U(n2, e2.total_in >> 16 & 255), U(n2, e2.total_in >> 24 & 255)) : (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), F(e2), 0 < n2.wrap && (n2.wrap = -n2.wrap), 0 !== n2.pending ? m : 1);
        }, r.deflateEnd = function(e2) {
          var t2;
          return e2 && e2.state ? (t2 = e2.state.status) !== C && 69 !== t2 && 73 !== t2 && 91 !== t2 && 103 !== t2 && t2 !== E && 666 !== t2 ? R(e2, _) : (e2.state = null, t2 === E ? R(e2, -3) : m) : _;
        }, r.deflateSetDictionary = function(e2, t2) {
          var r2, n2, i2, s2, a2, o2, h2, u2, l2 = t2.length;
          if (!e2 || !e2.state) return _;
          if (2 === (s2 = (r2 = e2.state).wrap) || 1 === s2 && r2.status !== C || r2.lookahead) return _;
          for (1 === s2 && (e2.adler = d(e2.adler, t2, l2, 0)), r2.wrap = 0, l2 >= r2.w_size && (0 === s2 && (D(r2.head), r2.strstart = 0, r2.block_start = 0, r2.insert = 0), u2 = new c.Buf8(r2.w_size), c.arraySet(u2, t2, l2 - r2.w_size, r2.w_size, 0), t2 = u2, l2 = r2.w_size), a2 = e2.avail_in, o2 = e2.next_in, h2 = e2.input, e2.avail_in = l2, e2.next_in = 0, e2.input = t2, j(r2); r2.lookahead >= x; ) {
            for (n2 = r2.strstart, i2 = r2.lookahead - (x - 1); r2.ins_h = (r2.ins_h << r2.hash_shift ^ r2.window[n2 + x - 1]) & r2.hash_mask, r2.prev[n2 & r2.w_mask] = r2.head[r2.ins_h], r2.head[r2.ins_h] = n2, n2++, --i2; ) ;
            r2.strstart = n2, r2.lookahead = x - 1, j(r2);
          }
          return r2.strstart += r2.lookahead, r2.block_start = r2.strstart, r2.insert = r2.lookahead, r2.lookahead = 0, r2.match_length = r2.prev_length = x - 1, r2.match_available = 0, e2.next_in = o2, e2.input = h2, e2.avail_in = a2, r2.wrap = s2, m;
        }, r.deflateInfo = "pako deflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, t, r) {
        "use strict";
        t.exports = function() {
          this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = false;
        };
      }, {}], 48: [function(e, t, r) {
        "use strict";
        t.exports = function(e2, t2) {
          var r2, n, i, s, a, o, h, u, l, f, c, d, p, m, _, g, b2, v, y, w, k, x, S, z, C;
          r2 = e2.state, n = e2.next_in, z = e2.input, i = n + (e2.avail_in - 5), s = e2.next_out, C = e2.output, a = s - (t2 - e2.avail_out), o = s + (e2.avail_out - 257), h = r2.dmax, u = r2.wsize, l = r2.whave, f = r2.wnext, c = r2.window, d = r2.hold, p = r2.bits, m = r2.lencode, _ = r2.distcode, g = (1 << r2.lenbits) - 1, b2 = (1 << r2.distbits) - 1;
          e: do {
            p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = m[d & g];
            t: for (; ; ) {
              if (d >>>= y = v >>> 24, p -= y, 0 === (y = v >>> 16 & 255)) C[s++] = 65535 & v;
              else {
                if (!(16 & y)) {
                  if (0 == (64 & y)) {
                    v = m[(65535 & v) + (d & (1 << y) - 1)];
                    continue t;
                  }
                  if (32 & y) {
                    r2.mode = 12;
                    break e;
                  }
                  e2.msg = "invalid literal/length code", r2.mode = 30;
                  break e;
                }
                w = 65535 & v, (y &= 15) && (p < y && (d += z[n++] << p, p += 8), w += d & (1 << y) - 1, d >>>= y, p -= y), p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = _[d & b2];
                r: for (; ; ) {
                  if (d >>>= y = v >>> 24, p -= y, !(16 & (y = v >>> 16 & 255))) {
                    if (0 == (64 & y)) {
                      v = _[(65535 & v) + (d & (1 << y) - 1)];
                      continue r;
                    }
                    e2.msg = "invalid distance code", r2.mode = 30;
                    break e;
                  }
                  if (k = 65535 & v, p < (y &= 15) && (d += z[n++] << p, (p += 8) < y && (d += z[n++] << p, p += 8)), h < (k += d & (1 << y) - 1)) {
                    e2.msg = "invalid distance too far back", r2.mode = 30;
                    break e;
                  }
                  if (d >>>= y, p -= y, (y = s - a) < k) {
                    if (l < (y = k - y) && r2.sane) {
                      e2.msg = "invalid distance too far back", r2.mode = 30;
                      break e;
                    }
                    if (S = c, (x = 0) === f) {
                      if (x += u - y, y < w) {
                        for (w -= y; C[s++] = c[x++], --y; ) ;
                        x = s - k, S = C;
                      }
                    } else if (f < y) {
                      if (x += u + f - y, (y -= f) < w) {
                        for (w -= y; C[s++] = c[x++], --y; ) ;
                        if (x = 0, f < w) {
                          for (w -= y = f; C[s++] = c[x++], --y; ) ;
                          x = s - k, S = C;
                        }
                      }
                    } else if (x += f - y, y < w) {
                      for (w -= y; C[s++] = c[x++], --y; ) ;
                      x = s - k, S = C;
                    }
                    for (; 2 < w; ) C[s++] = S[x++], C[s++] = S[x++], C[s++] = S[x++], w -= 3;
                    w && (C[s++] = S[x++], 1 < w && (C[s++] = S[x++]));
                  } else {
                    for (x = s - k; C[s++] = C[x++], C[s++] = C[x++], C[s++] = C[x++], 2 < (w -= 3); ) ;
                    w && (C[s++] = C[x++], 1 < w && (C[s++] = C[x++]));
                  }
                  break;
                }
              }
              break;
            }
          } while (n < i && s < o);
          n -= w = p >> 3, d &= (1 << (p -= w << 3)) - 1, e2.next_in = n, e2.next_out = s, e2.avail_in = n < i ? i - n + 5 : 5 - (n - i), e2.avail_out = s < o ? o - s + 257 : 257 - (s - o), r2.hold = d, r2.bits = p;
        };
      }, {}], 49: [function(e, t, r) {
        "use strict";
        var I = e("../utils/common"), O = e("./adler32"), B = e("./crc32"), R = e("./inffast"), T = e("./inftrees"), D = 1, F = 2, N = 0, U = -2, P = 1, n = 852, i = 592;
        function L(e2) {
          return (e2 >>> 24 & 255) + (e2 >>> 8 & 65280) + ((65280 & e2) << 8) + ((255 & e2) << 24);
        }
        function s() {
          this.mode = 0, this.last = false, this.wrap = 0, this.havedict = false, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new I.Buf16(320), this.work = new I.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
        }
        function a(e2) {
          var t2;
          return e2 && e2.state ? (t2 = e2.state, e2.total_in = e2.total_out = t2.total = 0, e2.msg = "", t2.wrap && (e2.adler = 1 & t2.wrap), t2.mode = P, t2.last = 0, t2.havedict = 0, t2.dmax = 32768, t2.head = null, t2.hold = 0, t2.bits = 0, t2.lencode = t2.lendyn = new I.Buf32(n), t2.distcode = t2.distdyn = new I.Buf32(i), t2.sane = 1, t2.back = -1, N) : U;
        }
        function o(e2) {
          var t2;
          return e2 && e2.state ? ((t2 = e2.state).wsize = 0, t2.whave = 0, t2.wnext = 0, a(e2)) : U;
        }
        function h(e2, t2) {
          var r2, n2;
          return e2 && e2.state ? (n2 = e2.state, t2 < 0 ? (r2 = 0, t2 = -t2) : (r2 = 1 + (t2 >> 4), t2 < 48 && (t2 &= 15)), t2 && (t2 < 8 || 15 < t2) ? U : (null !== n2.window && n2.wbits !== t2 && (n2.window = null), n2.wrap = r2, n2.wbits = t2, o(e2))) : U;
        }
        function u(e2, t2) {
          var r2, n2;
          return e2 ? (n2 = new s(), (e2.state = n2).window = null, (r2 = h(e2, t2)) !== N && (e2.state = null), r2) : U;
        }
        var l, f, c = true;
        function j(e2) {
          if (c) {
            var t2;
            for (l = new I.Buf32(512), f = new I.Buf32(32), t2 = 0; t2 < 144; ) e2.lens[t2++] = 8;
            for (; t2 < 256; ) e2.lens[t2++] = 9;
            for (; t2 < 280; ) e2.lens[t2++] = 7;
            for (; t2 < 288; ) e2.lens[t2++] = 8;
            for (T(D, e2.lens, 0, 288, l, 0, e2.work, { bits: 9 }), t2 = 0; t2 < 32; ) e2.lens[t2++] = 5;
            T(F, e2.lens, 0, 32, f, 0, e2.work, { bits: 5 }), c = false;
          }
          e2.lencode = l, e2.lenbits = 9, e2.distcode = f, e2.distbits = 5;
        }
        function Z(e2, t2, r2, n2) {
          var i2, s2 = e2.state;
          return null === s2.window && (s2.wsize = 1 << s2.wbits, s2.wnext = 0, s2.whave = 0, s2.window = new I.Buf8(s2.wsize)), n2 >= s2.wsize ? (I.arraySet(s2.window, t2, r2 - s2.wsize, s2.wsize, 0), s2.wnext = 0, s2.whave = s2.wsize) : (n2 < (i2 = s2.wsize - s2.wnext) && (i2 = n2), I.arraySet(s2.window, t2, r2 - n2, i2, s2.wnext), (n2 -= i2) ? (I.arraySet(s2.window, t2, r2 - n2, n2, 0), s2.wnext = n2, s2.whave = s2.wsize) : (s2.wnext += i2, s2.wnext === s2.wsize && (s2.wnext = 0), s2.whave < s2.wsize && (s2.whave += i2))), 0;
        }
        r.inflateReset = o, r.inflateReset2 = h, r.inflateResetKeep = a, r.inflateInit = function(e2) {
          return u(e2, 15);
        }, r.inflateInit2 = u, r.inflate = function(e2, t2) {
          var r2, n2, i2, s2, a2, o2, h2, u2, l2, f2, c2, d, p, m, _, g, b2, v, y, w, k, x, S, z, C = 0, E = new I.Buf8(4), A = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          if (!e2 || !e2.state || !e2.output || !e2.input && 0 !== e2.avail_in) return U;
          12 === (r2 = e2.state).mode && (r2.mode = 13), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, f2 = o2, c2 = h2, x = N;
          e: for (; ; ) switch (r2.mode) {
            case P:
              if (0 === r2.wrap) {
                r2.mode = 13;
                break;
              }
              for (; l2 < 16; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (2 & r2.wrap && 35615 === u2) {
                E[r2.check = 0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0), l2 = u2 = 0, r2.mode = 2;
                break;
              }
              if (r2.flags = 0, r2.head && (r2.head.done = false), !(1 & r2.wrap) || (((255 & u2) << 8) + (u2 >> 8)) % 31) {
                e2.msg = "incorrect header check", r2.mode = 30;
                break;
              }
              if (8 != (15 & u2)) {
                e2.msg = "unknown compression method", r2.mode = 30;
                break;
              }
              if (l2 -= 4, k = 8 + (15 & (u2 >>>= 4)), 0 === r2.wbits) r2.wbits = k;
              else if (k > r2.wbits) {
                e2.msg = "invalid window size", r2.mode = 30;
                break;
              }
              r2.dmax = 1 << k, e2.adler = r2.check = 1, r2.mode = 512 & u2 ? 10 : 12, l2 = u2 = 0;
              break;
            case 2:
              for (; l2 < 16; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (r2.flags = u2, 8 != (255 & r2.flags)) {
                e2.msg = "unknown compression method", r2.mode = 30;
                break;
              }
              if (57344 & r2.flags) {
                e2.msg = "unknown header flags set", r2.mode = 30;
                break;
              }
              r2.head && (r2.head.text = u2 >> 8 & 1), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 3;
            case 3:
              for (; l2 < 32; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              r2.head && (r2.head.time = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, E[2] = u2 >>> 16 & 255, E[3] = u2 >>> 24 & 255, r2.check = B(r2.check, E, 4, 0)), l2 = u2 = 0, r2.mode = 4;
            case 4:
              for (; l2 < 16; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              r2.head && (r2.head.xflags = 255 & u2, r2.head.os = u2 >> 8), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 5;
            case 5:
              if (1024 & r2.flags) {
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.length = u2, r2.head && (r2.head.extra_len = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0;
              } else r2.head && (r2.head.extra = null);
              r2.mode = 6;
            case 6:
              if (1024 & r2.flags && (o2 < (d = r2.length) && (d = o2), d && (r2.head && (k = r2.head.extra_len - r2.length, r2.head.extra || (r2.head.extra = new Array(r2.head.extra_len)), I.arraySet(r2.head.extra, n2, s2, d, k)), 512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, r2.length -= d), r2.length)) break e;
              r2.length = 0, r2.mode = 7;
            case 7:
              if (2048 & r2.flags) {
                if (0 === o2) break e;
                for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.name += String.fromCharCode(k)), k && d < o2; ) ;
                if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
              } else r2.head && (r2.head.name = null);
              r2.length = 0, r2.mode = 8;
            case 8:
              if (4096 & r2.flags) {
                if (0 === o2) break e;
                for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.comment += String.fromCharCode(k)), k && d < o2; ) ;
                if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
              } else r2.head && (r2.head.comment = null);
              r2.mode = 9;
            case 9:
              if (512 & r2.flags) {
                for (; l2 < 16; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (u2 !== (65535 & r2.check)) {
                  e2.msg = "header crc mismatch", r2.mode = 30;
                  break;
                }
                l2 = u2 = 0;
              }
              r2.head && (r2.head.hcrc = r2.flags >> 9 & 1, r2.head.done = true), e2.adler = r2.check = 0, r2.mode = 12;
              break;
            case 10:
              for (; l2 < 32; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              e2.adler = r2.check = L(u2), l2 = u2 = 0, r2.mode = 11;
            case 11:
              if (0 === r2.havedict) return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, 2;
              e2.adler = r2.check = 1, r2.mode = 12;
            case 12:
              if (5 === t2 || 6 === t2) break e;
            case 13:
              if (r2.last) {
                u2 >>>= 7 & l2, l2 -= 7 & l2, r2.mode = 27;
                break;
              }
              for (; l2 < 3; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              switch (r2.last = 1 & u2, l2 -= 1, 3 & (u2 >>>= 1)) {
                case 0:
                  r2.mode = 14;
                  break;
                case 1:
                  if (j(r2), r2.mode = 20, 6 !== t2) break;
                  u2 >>>= 2, l2 -= 2;
                  break e;
                case 2:
                  r2.mode = 17;
                  break;
                case 3:
                  e2.msg = "invalid block type", r2.mode = 30;
              }
              u2 >>>= 2, l2 -= 2;
              break;
            case 14:
              for (u2 >>>= 7 & l2, l2 -= 7 & l2; l2 < 32; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if ((65535 & u2) != (u2 >>> 16 ^ 65535)) {
                e2.msg = "invalid stored block lengths", r2.mode = 30;
                break;
              }
              if (r2.length = 65535 & u2, l2 = u2 = 0, r2.mode = 15, 6 === t2) break e;
            case 15:
              r2.mode = 16;
            case 16:
              if (d = r2.length) {
                if (o2 < d && (d = o2), h2 < d && (d = h2), 0 === d) break e;
                I.arraySet(i2, n2, s2, d, a2), o2 -= d, s2 += d, h2 -= d, a2 += d, r2.length -= d;
                break;
              }
              r2.mode = 12;
              break;
            case 17:
              for (; l2 < 14; ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (r2.nlen = 257 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ndist = 1 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ncode = 4 + (15 & u2), u2 >>>= 4, l2 -= 4, 286 < r2.nlen || 30 < r2.ndist) {
                e2.msg = "too many length or distance symbols", r2.mode = 30;
                break;
              }
              r2.have = 0, r2.mode = 18;
            case 18:
              for (; r2.have < r2.ncode; ) {
                for (; l2 < 3; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.lens[A[r2.have++]] = 7 & u2, u2 >>>= 3, l2 -= 3;
              }
              for (; r2.have < 19; ) r2.lens[A[r2.have++]] = 0;
              if (r2.lencode = r2.lendyn, r2.lenbits = 7, S = { bits: r2.lenbits }, x = T(0, r2.lens, 0, 19, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                e2.msg = "invalid code lengths set", r2.mode = 30;
                break;
              }
              r2.have = 0, r2.mode = 19;
            case 19:
              for (; r2.have < r2.nlen + r2.ndist; ) {
                for (; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b2 = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (b2 < 16) u2 >>>= _, l2 -= _, r2.lens[r2.have++] = b2;
                else {
                  if (16 === b2) {
                    for (z = _ + 2; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    if (u2 >>>= _, l2 -= _, 0 === r2.have) {
                      e2.msg = "invalid bit length repeat", r2.mode = 30;
                      break;
                    }
                    k = r2.lens[r2.have - 1], d = 3 + (3 & u2), u2 >>>= 2, l2 -= 2;
                  } else if (17 === b2) {
                    for (z = _ + 3; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    l2 -= _, k = 0, d = 3 + (7 & (u2 >>>= _)), u2 >>>= 3, l2 -= 3;
                  } else {
                    for (z = _ + 7; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    l2 -= _, k = 0, d = 11 + (127 & (u2 >>>= _)), u2 >>>= 7, l2 -= 7;
                  }
                  if (r2.have + d > r2.nlen + r2.ndist) {
                    e2.msg = "invalid bit length repeat", r2.mode = 30;
                    break;
                  }
                  for (; d--; ) r2.lens[r2.have++] = k;
                }
              }
              if (30 === r2.mode) break;
              if (0 === r2.lens[256]) {
                e2.msg = "invalid code -- missing end-of-block", r2.mode = 30;
                break;
              }
              if (r2.lenbits = 9, S = { bits: r2.lenbits }, x = T(D, r2.lens, 0, r2.nlen, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                e2.msg = "invalid literal/lengths set", r2.mode = 30;
                break;
              }
              if (r2.distbits = 6, r2.distcode = r2.distdyn, S = { bits: r2.distbits }, x = T(F, r2.lens, r2.nlen, r2.ndist, r2.distcode, 0, r2.work, S), r2.distbits = S.bits, x) {
                e2.msg = "invalid distances set", r2.mode = 30;
                break;
              }
              if (r2.mode = 20, 6 === t2) break e;
            case 20:
              r2.mode = 21;
            case 21:
              if (6 <= o2 && 258 <= h2) {
                e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, R(e2, c2), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, 12 === r2.mode && (r2.back = -1);
                break;
              }
              for (r2.back = 0; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b2 = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (g && 0 == (240 & g)) {
                for (v = _, y = g, w = b2; g = (C = r2.lencode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b2 = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                u2 >>>= v, l2 -= v, r2.back += v;
              }
              if (u2 >>>= _, l2 -= _, r2.back += _, r2.length = b2, 0 === g) {
                r2.mode = 26;
                break;
              }
              if (32 & g) {
                r2.back = -1, r2.mode = 12;
                break;
              }
              if (64 & g) {
                e2.msg = "invalid literal/length code", r2.mode = 30;
                break;
              }
              r2.extra = 15 & g, r2.mode = 22;
            case 22:
              if (r2.extra) {
                for (z = r2.extra; l2 < z; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.length += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
              }
              r2.was = r2.length, r2.mode = 23;
            case 23:
              for (; g = (C = r2.distcode[u2 & (1 << r2.distbits) - 1]) >>> 16 & 255, b2 = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                if (0 === o2) break e;
                o2--, u2 += n2[s2++] << l2, l2 += 8;
              }
              if (0 == (240 & g)) {
                for (v = _, y = g, w = b2; g = (C = r2.distcode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b2 = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                u2 >>>= v, l2 -= v, r2.back += v;
              }
              if (u2 >>>= _, l2 -= _, r2.back += _, 64 & g) {
                e2.msg = "invalid distance code", r2.mode = 30;
                break;
              }
              r2.offset = b2, r2.extra = 15 & g, r2.mode = 24;
            case 24:
              if (r2.extra) {
                for (z = r2.extra; l2 < z; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                r2.offset += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
              }
              if (r2.offset > r2.dmax) {
                e2.msg = "invalid distance too far back", r2.mode = 30;
                break;
              }
              r2.mode = 25;
            case 25:
              if (0 === h2) break e;
              if (d = c2 - h2, r2.offset > d) {
                if ((d = r2.offset - d) > r2.whave && r2.sane) {
                  e2.msg = "invalid distance too far back", r2.mode = 30;
                  break;
                }
                p = d > r2.wnext ? (d -= r2.wnext, r2.wsize - d) : r2.wnext - d, d > r2.length && (d = r2.length), m = r2.window;
              } else m = i2, p = a2 - r2.offset, d = r2.length;
              for (h2 < d && (d = h2), h2 -= d, r2.length -= d; i2[a2++] = m[p++], --d; ) ;
              0 === r2.length && (r2.mode = 21);
              break;
            case 26:
              if (0 === h2) break e;
              i2[a2++] = r2.length, h2--, r2.mode = 21;
              break;
            case 27:
              if (r2.wrap) {
                for (; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 |= n2[s2++] << l2, l2 += 8;
                }
                if (c2 -= h2, e2.total_out += c2, r2.total += c2, c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, a2 - c2) : O(r2.check, i2, c2, a2 - c2)), c2 = h2, (r2.flags ? u2 : L(u2)) !== r2.check) {
                  e2.msg = "incorrect data check", r2.mode = 30;
                  break;
                }
                l2 = u2 = 0;
              }
              r2.mode = 28;
            case 28:
              if (r2.wrap && r2.flags) {
                for (; l2 < 32; ) {
                  if (0 === o2) break e;
                  o2--, u2 += n2[s2++] << l2, l2 += 8;
                }
                if (u2 !== (4294967295 & r2.total)) {
                  e2.msg = "incorrect length check", r2.mode = 30;
                  break;
                }
                l2 = u2 = 0;
              }
              r2.mode = 29;
            case 29:
              x = 1;
              break e;
            case 30:
              x = -3;
              break e;
            case 31:
              return -4;
            case 32:
            default:
              return U;
          }
          return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, (r2.wsize || c2 !== e2.avail_out && r2.mode < 30 && (r2.mode < 27 || 4 !== t2)) && Z(e2, e2.output, e2.next_out, c2 - e2.avail_out) ? (r2.mode = 31, -4) : (f2 -= e2.avail_in, c2 -= e2.avail_out, e2.total_in += f2, e2.total_out += c2, r2.total += c2, r2.wrap && c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, e2.next_out - c2) : O(r2.check, i2, c2, e2.next_out - c2)), e2.data_type = r2.bits + (r2.last ? 64 : 0) + (12 === r2.mode ? 128 : 0) + (20 === r2.mode || 15 === r2.mode ? 256 : 0), (0 == f2 && 0 === c2 || 4 === t2) && x === N && (x = -5), x);
        }, r.inflateEnd = function(e2) {
          if (!e2 || !e2.state) return U;
          var t2 = e2.state;
          return t2.window && (t2.window = null), e2.state = null, N;
        }, r.inflateGetHeader = function(e2, t2) {
          var r2;
          return e2 && e2.state ? 0 == (2 & (r2 = e2.state).wrap) ? U : ((r2.head = t2).done = false, N) : U;
        }, r.inflateSetDictionary = function(e2, t2) {
          var r2, n2 = t2.length;
          return e2 && e2.state ? 0 !== (r2 = e2.state).wrap && 11 !== r2.mode ? U : 11 === r2.mode && O(1, t2, n2, 0) !== r2.check ? -3 : Z(e2, t2, n2, n2) ? (r2.mode = 31, -4) : (r2.havedict = 1, N) : U;
        }, r.inflateInfo = "pako inflate (from Nodeca project)";
      }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, t, r) {
        "use strict";
        var D = e("../utils/common"), F = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], N = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], U = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], P = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
        t.exports = function(e2, t2, r2, n, i, s, a, o) {
          var h, u, l, f, c, d, p, m, _, g = o.bits, b2 = 0, v = 0, y = 0, w = 0, k = 0, x = 0, S = 0, z = 0, C = 0, E = 0, A = null, I = 0, O = new D.Buf16(16), B = new D.Buf16(16), R = null, T = 0;
          for (b2 = 0; b2 <= 15; b2++) O[b2] = 0;
          for (v = 0; v < n; v++) O[t2[r2 + v]]++;
          for (k = g, w = 15; 1 <= w && 0 === O[w]; w--) ;
          if (w < k && (k = w), 0 === w) return i[s++] = 20971520, i[s++] = 20971520, o.bits = 1, 0;
          for (y = 1; y < w && 0 === O[y]; y++) ;
          for (k < y && (k = y), b2 = z = 1; b2 <= 15; b2++) if (z <<= 1, (z -= O[b2]) < 0) return -1;
          if (0 < z && (0 === e2 || 1 !== w)) return -1;
          for (B[1] = 0, b2 = 1; b2 < 15; b2++) B[b2 + 1] = B[b2] + O[b2];
          for (v = 0; v < n; v++) 0 !== t2[r2 + v] && (a[B[t2[r2 + v]]++] = v);
          if (d = 0 === e2 ? (A = R = a, 19) : 1 === e2 ? (A = F, I -= 257, R = N, T -= 257, 256) : (A = U, R = P, -1), b2 = y, c = s, S = v = E = 0, l = -1, f = (C = 1 << (x = k)) - 1, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
          for (; ; ) {
            for (p = b2 - S, _ = a[v] < d ? (m = 0, a[v]) : a[v] > d ? (m = R[T + a[v]], A[I + a[v]]) : (m = 96, 0), h = 1 << b2 - S, y = u = 1 << x; i[c + (E >> S) + (u -= h)] = p << 24 | m << 16 | _ | 0, 0 !== u; ) ;
            for (h = 1 << b2 - 1; E & h; ) h >>= 1;
            if (0 !== h ? (E &= h - 1, E += h) : E = 0, v++, 0 == --O[b2]) {
              if (b2 === w) break;
              b2 = t2[r2 + a[v]];
            }
            if (k < b2 && (E & f) !== l) {
              for (0 === S && (S = k), c += y, z = 1 << (x = b2 - S); x + S < w && !((z -= O[x + S]) <= 0); ) x++, z <<= 1;
              if (C += 1 << x, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
              i[l = E & f] = k << 24 | x << 16 | c - s | 0;
            }
          }
          return 0 !== E && (i[c + E] = b2 - S << 24 | 64 << 16 | 0), o.bits = k, 0;
        };
      }, { "../utils/common": 41 }], 51: [function(e, t, r) {
        "use strict";
        t.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
      }, {}], 52: [function(e, t, r) {
        "use strict";
        var i = e("../utils/common"), o = 0, h = 1;
        function n(e2) {
          for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
        }
        var s = 0, a = 29, u = 256, l = u + 1 + a, f = 30, c = 19, _ = 2 * l + 1, g = 15, d = 16, p = 7, m = 256, b2 = 16, v = 17, y = 18, w = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], k = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], S = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], z = new Array(2 * (l + 2));
        n(z);
        var C = new Array(2 * f);
        n(C);
        var E = new Array(512);
        n(E);
        var A = new Array(256);
        n(A);
        var I = new Array(a);
        n(I);
        var O, B, R, T = new Array(f);
        function D(e2, t2, r2, n2, i2) {
          this.static_tree = e2, this.extra_bits = t2, this.extra_base = r2, this.elems = n2, this.max_length = i2, this.has_stree = e2 && e2.length;
        }
        function F(e2, t2) {
          this.dyn_tree = e2, this.max_code = 0, this.stat_desc = t2;
        }
        function N(e2) {
          return e2 < 256 ? E[e2] : E[256 + (e2 >>> 7)];
        }
        function U(e2, t2) {
          e2.pending_buf[e2.pending++] = 255 & t2, e2.pending_buf[e2.pending++] = t2 >>> 8 & 255;
        }
        function P(e2, t2, r2) {
          e2.bi_valid > d - r2 ? (e2.bi_buf |= t2 << e2.bi_valid & 65535, U(e2, e2.bi_buf), e2.bi_buf = t2 >> d - e2.bi_valid, e2.bi_valid += r2 - d) : (e2.bi_buf |= t2 << e2.bi_valid & 65535, e2.bi_valid += r2);
        }
        function L(e2, t2, r2) {
          P(e2, r2[2 * t2], r2[2 * t2 + 1]);
        }
        function j(e2, t2) {
          for (var r2 = 0; r2 |= 1 & e2, e2 >>>= 1, r2 <<= 1, 0 < --t2; ) ;
          return r2 >>> 1;
        }
        function Z(e2, t2, r2) {
          var n2, i2, s2 = new Array(g + 1), a2 = 0;
          for (n2 = 1; n2 <= g; n2++) s2[n2] = a2 = a2 + r2[n2 - 1] << 1;
          for (i2 = 0; i2 <= t2; i2++) {
            var o2 = e2[2 * i2 + 1];
            0 !== o2 && (e2[2 * i2] = j(s2[o2]++, o2));
          }
        }
        function W(e2) {
          var t2;
          for (t2 = 0; t2 < l; t2++) e2.dyn_ltree[2 * t2] = 0;
          for (t2 = 0; t2 < f; t2++) e2.dyn_dtree[2 * t2] = 0;
          for (t2 = 0; t2 < c; t2++) e2.bl_tree[2 * t2] = 0;
          e2.dyn_ltree[2 * m] = 1, e2.opt_len = e2.static_len = 0, e2.last_lit = e2.matches = 0;
        }
        function M(e2) {
          8 < e2.bi_valid ? U(e2, e2.bi_buf) : 0 < e2.bi_valid && (e2.pending_buf[e2.pending++] = e2.bi_buf), e2.bi_buf = 0, e2.bi_valid = 0;
        }
        function H(e2, t2, r2, n2) {
          var i2 = 2 * t2, s2 = 2 * r2;
          return e2[i2] < e2[s2] || e2[i2] === e2[s2] && n2[t2] <= n2[r2];
        }
        function G(e2, t2, r2) {
          for (var n2 = e2.heap[r2], i2 = r2 << 1; i2 <= e2.heap_len && (i2 < e2.heap_len && H(t2, e2.heap[i2 + 1], e2.heap[i2], e2.depth) && i2++, !H(t2, n2, e2.heap[i2], e2.depth)); ) e2.heap[r2] = e2.heap[i2], r2 = i2, i2 <<= 1;
          e2.heap[r2] = n2;
        }
        function K(e2, t2, r2) {
          var n2, i2, s2, a2, o2 = 0;
          if (0 !== e2.last_lit) for (; n2 = e2.pending_buf[e2.d_buf + 2 * o2] << 8 | e2.pending_buf[e2.d_buf + 2 * o2 + 1], i2 = e2.pending_buf[e2.l_buf + o2], o2++, 0 === n2 ? L(e2, i2, t2) : (L(e2, (s2 = A[i2]) + u + 1, t2), 0 !== (a2 = w[s2]) && P(e2, i2 -= I[s2], a2), L(e2, s2 = N(--n2), r2), 0 !== (a2 = k[s2]) && P(e2, n2 -= T[s2], a2)), o2 < e2.last_lit; ) ;
          L(e2, m, t2);
        }
        function Y(e2, t2) {
          var r2, n2, i2, s2 = t2.dyn_tree, a2 = t2.stat_desc.static_tree, o2 = t2.stat_desc.has_stree, h2 = t2.stat_desc.elems, u2 = -1;
          for (e2.heap_len = 0, e2.heap_max = _, r2 = 0; r2 < h2; r2++) 0 !== s2[2 * r2] ? (e2.heap[++e2.heap_len] = u2 = r2, e2.depth[r2] = 0) : s2[2 * r2 + 1] = 0;
          for (; e2.heap_len < 2; ) s2[2 * (i2 = e2.heap[++e2.heap_len] = u2 < 2 ? ++u2 : 0)] = 1, e2.depth[i2] = 0, e2.opt_len--, o2 && (e2.static_len -= a2[2 * i2 + 1]);
          for (t2.max_code = u2, r2 = e2.heap_len >> 1; 1 <= r2; r2--) G(e2, s2, r2);
          for (i2 = h2; r2 = e2.heap[1], e2.heap[1] = e2.heap[e2.heap_len--], G(e2, s2, 1), n2 = e2.heap[1], e2.heap[--e2.heap_max] = r2, e2.heap[--e2.heap_max] = n2, s2[2 * i2] = s2[2 * r2] + s2[2 * n2], e2.depth[i2] = (e2.depth[r2] >= e2.depth[n2] ? e2.depth[r2] : e2.depth[n2]) + 1, s2[2 * r2 + 1] = s2[2 * n2 + 1] = i2, e2.heap[1] = i2++, G(e2, s2, 1), 2 <= e2.heap_len; ) ;
          e2.heap[--e2.heap_max] = e2.heap[1], (function(e3, t3) {
            var r3, n3, i3, s3, a3, o3, h3 = t3.dyn_tree, u3 = t3.max_code, l2 = t3.stat_desc.static_tree, f2 = t3.stat_desc.has_stree, c2 = t3.stat_desc.extra_bits, d2 = t3.stat_desc.extra_base, p2 = t3.stat_desc.max_length, m2 = 0;
            for (s3 = 0; s3 <= g; s3++) e3.bl_count[s3] = 0;
            for (h3[2 * e3.heap[e3.heap_max] + 1] = 0, r3 = e3.heap_max + 1; r3 < _; r3++) p2 < (s3 = h3[2 * h3[2 * (n3 = e3.heap[r3]) + 1] + 1] + 1) && (s3 = p2, m2++), h3[2 * n3 + 1] = s3, u3 < n3 || (e3.bl_count[s3]++, a3 = 0, d2 <= n3 && (a3 = c2[n3 - d2]), o3 = h3[2 * n3], e3.opt_len += o3 * (s3 + a3), f2 && (e3.static_len += o3 * (l2[2 * n3 + 1] + a3)));
            if (0 !== m2) {
              do {
                for (s3 = p2 - 1; 0 === e3.bl_count[s3]; ) s3--;
                e3.bl_count[s3]--, e3.bl_count[s3 + 1] += 2, e3.bl_count[p2]--, m2 -= 2;
              } while (0 < m2);
              for (s3 = p2; 0 !== s3; s3--) for (n3 = e3.bl_count[s3]; 0 !== n3; ) u3 < (i3 = e3.heap[--r3]) || (h3[2 * i3 + 1] !== s3 && (e3.opt_len += (s3 - h3[2 * i3 + 1]) * h3[2 * i3], h3[2 * i3 + 1] = s3), n3--);
            }
          })(e2, t2), Z(s2, u2, e2.bl_count);
        }
        function X(e2, t2, r2) {
          var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
          for (0 === a2 && (h2 = 138, u2 = 3), t2[2 * (r2 + 1) + 1] = 65535, n2 = 0; n2 <= r2; n2++) i2 = a2, a2 = t2[2 * (n2 + 1) + 1], ++o2 < h2 && i2 === a2 || (o2 < u2 ? e2.bl_tree[2 * i2] += o2 : 0 !== i2 ? (i2 !== s2 && e2.bl_tree[2 * i2]++, e2.bl_tree[2 * b2]++) : o2 <= 10 ? e2.bl_tree[2 * v]++ : e2.bl_tree[2 * y]++, s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4));
        }
        function V(e2, t2, r2) {
          var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
          for (0 === a2 && (h2 = 138, u2 = 3), n2 = 0; n2 <= r2; n2++) if (i2 = a2, a2 = t2[2 * (n2 + 1) + 1], !(++o2 < h2 && i2 === a2)) {
            if (o2 < u2) for (; L(e2, i2, e2.bl_tree), 0 != --o2; ) ;
            else 0 !== i2 ? (i2 !== s2 && (L(e2, i2, e2.bl_tree), o2--), L(e2, b2, e2.bl_tree), P(e2, o2 - 3, 2)) : o2 <= 10 ? (L(e2, v, e2.bl_tree), P(e2, o2 - 3, 3)) : (L(e2, y, e2.bl_tree), P(e2, o2 - 11, 7));
            s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4);
          }
        }
        n(T);
        var q = false;
        function J(e2, t2, r2, n2) {
          P(e2, (s << 1) + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
            M(e3), n3 && (U(e3, r3), U(e3, ~r3)), i.arraySet(e3.pending_buf, e3.window, t3, r3, e3.pending), e3.pending += r3;
          })(e2, t2, r2, true);
        }
        r._tr_init = function(e2) {
          q || ((function() {
            var e3, t2, r2, n2, i2, s2 = new Array(g + 1);
            for (n2 = r2 = 0; n2 < a - 1; n2++) for (I[n2] = r2, e3 = 0; e3 < 1 << w[n2]; e3++) A[r2++] = n2;
            for (A[r2 - 1] = n2, n2 = i2 = 0; n2 < 16; n2++) for (T[n2] = i2, e3 = 0; e3 < 1 << k[n2]; e3++) E[i2++] = n2;
            for (i2 >>= 7; n2 < f; n2++) for (T[n2] = i2 << 7, e3 = 0; e3 < 1 << k[n2] - 7; e3++) E[256 + i2++] = n2;
            for (t2 = 0; t2 <= g; t2++) s2[t2] = 0;
            for (e3 = 0; e3 <= 143; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
            for (; e3 <= 255; ) z[2 * e3 + 1] = 9, e3++, s2[9]++;
            for (; e3 <= 279; ) z[2 * e3 + 1] = 7, e3++, s2[7]++;
            for (; e3 <= 287; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
            for (Z(z, l + 1, s2), e3 = 0; e3 < f; e3++) C[2 * e3 + 1] = 5, C[2 * e3] = j(e3, 5);
            O = new D(z, w, u + 1, l, g), B = new D(C, k, 0, f, g), R = new D(new Array(0), x, 0, c, p);
          })(), q = true), e2.l_desc = new F(e2.dyn_ltree, O), e2.d_desc = new F(e2.dyn_dtree, B), e2.bl_desc = new F(e2.bl_tree, R), e2.bi_buf = 0, e2.bi_valid = 0, W(e2);
        }, r._tr_stored_block = J, r._tr_flush_block = function(e2, t2, r2, n2) {
          var i2, s2, a2 = 0;
          0 < e2.level ? (2 === e2.strm.data_type && (e2.strm.data_type = (function(e3) {
            var t3, r3 = 4093624447;
            for (t3 = 0; t3 <= 31; t3++, r3 >>>= 1) if (1 & r3 && 0 !== e3.dyn_ltree[2 * t3]) return o;
            if (0 !== e3.dyn_ltree[18] || 0 !== e3.dyn_ltree[20] || 0 !== e3.dyn_ltree[26]) return h;
            for (t3 = 32; t3 < u; t3++) if (0 !== e3.dyn_ltree[2 * t3]) return h;
            return o;
          })(e2)), Y(e2, e2.l_desc), Y(e2, e2.d_desc), a2 = (function(e3) {
            var t3;
            for (X(e3, e3.dyn_ltree, e3.l_desc.max_code), X(e3, e3.dyn_dtree, e3.d_desc.max_code), Y(e3, e3.bl_desc), t3 = c - 1; 3 <= t3 && 0 === e3.bl_tree[2 * S[t3] + 1]; t3--) ;
            return e3.opt_len += 3 * (t3 + 1) + 5 + 5 + 4, t3;
          })(e2), i2 = e2.opt_len + 3 + 7 >>> 3, (s2 = e2.static_len + 3 + 7 >>> 3) <= i2 && (i2 = s2)) : i2 = s2 = r2 + 5, r2 + 4 <= i2 && -1 !== t2 ? J(e2, t2, r2, n2) : 4 === e2.strategy || s2 === i2 ? (P(e2, 2 + (n2 ? 1 : 0), 3), K(e2, z, C)) : (P(e2, 4 + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
            var i3;
            for (P(e3, t3 - 257, 5), P(e3, r3 - 1, 5), P(e3, n3 - 4, 4), i3 = 0; i3 < n3; i3++) P(e3, e3.bl_tree[2 * S[i3] + 1], 3);
            V(e3, e3.dyn_ltree, t3 - 1), V(e3, e3.dyn_dtree, r3 - 1);
          })(e2, e2.l_desc.max_code + 1, e2.d_desc.max_code + 1, a2 + 1), K(e2, e2.dyn_ltree, e2.dyn_dtree)), W(e2), n2 && M(e2);
        }, r._tr_tally = function(e2, t2, r2) {
          return e2.pending_buf[e2.d_buf + 2 * e2.last_lit] = t2 >>> 8 & 255, e2.pending_buf[e2.d_buf + 2 * e2.last_lit + 1] = 255 & t2, e2.pending_buf[e2.l_buf + e2.last_lit] = 255 & r2, e2.last_lit++, 0 === t2 ? e2.dyn_ltree[2 * r2]++ : (e2.matches++, t2--, e2.dyn_ltree[2 * (A[r2] + u + 1)]++, e2.dyn_dtree[2 * N(t2)]++), e2.last_lit === e2.lit_bufsize - 1;
        }, r._tr_align = function(e2) {
          P(e2, 2, 3), L(e2, m, z), (function(e3) {
            16 === e3.bi_valid ? (U(e3, e3.bi_buf), e3.bi_buf = 0, e3.bi_valid = 0) : 8 <= e3.bi_valid && (e3.pending_buf[e3.pending++] = 255 & e3.bi_buf, e3.bi_buf >>= 8, e3.bi_valid -= 8);
          })(e2);
        };
      }, { "../utils/common": 41 }], 53: [function(e, t, r) {
        "use strict";
        t.exports = function() {
          this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
        };
      }, {}], 54: [function(e, t, r) {
        (function(e2) {
          !(function(r2, n) {
            "use strict";
            if (!r2.setImmediate) {
              var i, s, t2, a, o = 1, h = {}, u = false, l = r2.document, e3 = Object.getPrototypeOf && Object.getPrototypeOf(r2);
              e3 = e3 && e3.setTimeout ? e3 : r2, i = "[object process]" === {}.toString.call(r2.process) ? function(e4) {
                process.nextTick(function() {
                  c(e4);
                });
              } : (function() {
                if (r2.postMessage && !r2.importScripts) {
                  var e4 = true, t3 = r2.onmessage;
                  return r2.onmessage = function() {
                    e4 = false;
                  }, r2.postMessage("", "*"), r2.onmessage = t3, e4;
                }
              })() ? (a = "setImmediate$" + Math.random() + "$", r2.addEventListener ? r2.addEventListener("message", d, false) : r2.attachEvent("onmessage", d), function(e4) {
                r2.postMessage(a + e4, "*");
              }) : r2.MessageChannel ? ((t2 = new MessageChannel()).port1.onmessage = function(e4) {
                c(e4.data);
              }, function(e4) {
                t2.port2.postMessage(e4);
              }) : l && "onreadystatechange" in l.createElement("script") ? (s = l.documentElement, function(e4) {
                var t3 = l.createElement("script");
                t3.onreadystatechange = function() {
                  c(e4), t3.onreadystatechange = null, s.removeChild(t3), t3 = null;
                }, s.appendChild(t3);
              }) : function(e4) {
                setTimeout(c, 0, e4);
              }, e3.setImmediate = function(e4) {
                "function" != typeof e4 && (e4 = new Function("" + e4));
                for (var t3 = new Array(arguments.length - 1), r3 = 0; r3 < t3.length; r3++) t3[r3] = arguments[r3 + 1];
                var n2 = { callback: e4, args: t3 };
                return h[o] = n2, i(o), o++;
              }, e3.clearImmediate = f;
            }
            function f(e4) {
              delete h[e4];
            }
            function c(e4) {
              if (u) setTimeout(c, 0, e4);
              else {
                var t3 = h[e4];
                if (t3) {
                  u = true;
                  try {
                    !(function(e5) {
                      var t4 = e5.callback, r3 = e5.args;
                      switch (r3.length) {
                        case 0:
                          t4();
                          break;
                        case 1:
                          t4(r3[0]);
                          break;
                        case 2:
                          t4(r3[0], r3[1]);
                          break;
                        case 3:
                          t4(r3[0], r3[1], r3[2]);
                          break;
                        default:
                          t4.apply(n, r3);
                      }
                    })(t3);
                  } finally {
                    f(e4), u = false;
                  }
                }
              }
            }
            function d(e4) {
              e4.source === r2 && "string" == typeof e4.data && 0 === e4.data.indexOf(a) && c(+e4.data.slice(a.length));
            }
          })("undefined" == typeof self ? void 0 === e2 ? this : e2 : self);
        }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
      }, {}] }, {}, [10])(10);
    });
  }
});

// app/utils/jcs.ts
function isJsonPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function normalizeNumber(value) {
  if (!Number.isFinite(value)) return "null";
  return JSON.stringify(value);
}
function canonicalizeValue(value) {
  if (isJsonPrimitive(value)) {
    if (typeof value === "number") return normalizeNumber(value);
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    throw new TypeError("JCS does not support bigint values.");
  }
  if (typeof value === "function" || typeof value === "symbol" || value === void 0) {
    return "null";
  }
  if (value && typeof value === "object") {
    if (typeof value.toJSON === "function") {
      return canonicalizeValue(value.toJSON());
    }
    if (Array.isArray(value)) {
      const items = value.map(
        (item) => item === void 0 || typeof item === "function" || typeof item === "symbol" ? "null" : canonicalizeValue(item)
      );
      return `[${items.join(",")}]`;
    }
    const obj = value;
    const keys = Object.keys(obj).sort();
    const entries = [];
    for (const key of keys) {
      const v = obj[key];
      if (v === void 0 || typeof v === "function" || typeof v === "symbol") continue;
      entries.push(`${JSON.stringify(key)}:${canonicalizeValue(v)}`);
    }
    return `{${entries.join(",")}}`;
  }
  return "null";
}
function jcsCanonicalize(value) {
  return canonicalizeValue(value);
}

// app/utils/sha256.ts
var textEncoder = new TextEncoder();
function toBytes(input) {
  if (typeof input === "string") return textEncoder.encode(input);
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}
async function sha256Bytes(input) {
  const bytes = toBytes(input);
  const digestInput = new Uint8Array(bytes.byteLength);
  digestInput.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return new Uint8Array(digest);
}
async function sha256Hex(input) {
  const bytes = await sha256Bytes(input);
  return Array.from(bytes).map((b2) => b2.toString(16).padStart(2, "0")).join("");
}
function base64UrlEncode(bytes) {
  let binary = "";
  for (const b2 of bytes) binary += String.fromCharCode(b2);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlDecode(input) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - base64.length % 4);
  const binary = atob(`${base64}${pad}`);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// node_modules/.pnpm/fflate@0.8.2/node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b2 = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b2[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b2[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b2[i]; j < b2[i + 1]; ++j) {
      r[j] = j - b2[i] << 5 | i;
    }
  }
  return { b: b2, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m)
      m = a[i];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b2 = fleb[i];
          add = bits(dat, pos, (1 << b2) - 1) + fl[i];
          pos += b2;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b2 = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b2) - 1, pos += b2;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b2) {
    return a.f - b2.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b2) {
      return tr[b2.s] - tr[a.s] || a.f - b2.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}

// app/lib/sign.ts
async function hmacHex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b2) => b2.toString(16).padStart(2, "0")).join("");
}

// app/lib/security/receizSignatureV3.ts
var HEX64_RE = /^[0-9a-f]{64}$/;
var B64U_RE = /^[A-Za-z0-9_-]+$/;
var KID_RE = /^[a-z0-9._:-]{3,64}$/i;
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function asKid(value) {
  if (typeof value !== "string") return null;
  const kid = value.trim();
  if (!KID_RE.test(kid)) return null;
  return kid;
}
function asB64u(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || !B64U_RE.test(text)) return null;
  return text;
}
function normalizeSignature(value) {
  if (!isRecord(value)) return null;
  const version = value.version === 1 ? 1 : null;
  const alg = value.alg === "Ed25519" ? "Ed25519" : null;
  const kid = asKid(value.kid);
  const sig = asB64u(value.sig);
  const payloadHashSha256 = typeof value.payloadHashSha256 === "string" ? value.payloadHashSha256.trim().toLowerCase() : "";
  const signedAtMs = typeof value.signedAtMs === "number" && Number.isFinite(value.signedAtMs) ? Math.trunc(value.signedAtMs) : Number.NaN;
  if (!version || !alg || !kid || !sig || !HEX64_RE.test(payloadHashSha256) || !Number.isFinite(signedAtMs) || signedAtMs < 0) {
    return null;
  }
  return { version, alg, kid, sig, payloadHashSha256, signedAtMs };
}
function coerceReceizBundleSignatureV3(value) {
  return normalizeSignature(value);
}

// app/lib/security/receizSignatureV4.ts
var HEX64_RE2 = /^[0-9a-f]{64}$/;
var HEX32_RE = /^[0-9a-f]{32}$/;
var B64U_RE2 = /^[A-Za-z0-9_-]+$/;
var B64U_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var KID_RE2 = /^[a-z0-9._:-]{3,64}$/i;
function isRecord2(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function toArrayBuffer(bytes) {
  const buffer = bytes.buffer;
  if (buffer instanceof ArrayBuffer) {
    if (bytes.byteOffset === 0 && bytes.byteLength === buffer.byteLength) return buffer;
    return buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
function asKid2(value) {
  if (typeof value !== "string") return null;
  const kid = value.trim();
  if (!KID_RE2.test(kid)) return null;
  return kid;
}
function asB64u2(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || !B64U_RE2.test(text)) return null;
  const remainder = text.length % 4;
  if (remainder === 1) return null;
  const finalSextet = B64U_ALPHABET.indexOf(text.at(-1));
  if (remainder === 2 && (finalSextet & 15) !== 0 || remainder === 3 && (finalSextet & 3) !== 0) return null;
  return text;
}
function asPulseString(value) {
  if (typeof value === "string") {
    const text = value.trim();
    if (!/^\d+$/.test(text)) return null;
    try {
      return BigInt(text).toString();
    } catch {
      return null;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value).toString();
  }
  return null;
}
function buildReceizSignatureV4DeviceCertPayload(cert) {
  const canonical = {
    version: cert.version,
    certType: cert.certType,
    certId: cert.certId,
    issuerKid: cert.issuerKid,
    alg: cert.alg,
    subjectPublicKeyRawB64u: cert.subjectPublicKeyRawB64u,
    issuedAtMs: cert.issuedAtMs,
    expiresAtMs: cert.expiresAtMs
  };
  return jcsCanonicalize(canonical);
}
function buildReceizSignatureV4DeviceCertIdentityPayload(cert) {
  const canonical = {
    version: cert.version,
    certType: cert.certType,
    issuerKid: cert.issuerKid,
    alg: cert.alg,
    subjectPublicKeyRawB64u: cert.subjectPublicKeyRawB64u,
    issuedAtMs: cert.issuedAtMs,
    expiresAtMs: cert.expiresAtMs
  };
  return jcsCanonicalize(canonical);
}
async function deriveReceizSignatureV4DeviceCertId(cert) {
  const payload = buildReceizSignatureV4DeviceCertIdentityPayload(cert);
  const payloadBytes = new TextEncoder().encode(payload);
  return (await sha256Hex(payloadBytes)).slice(0, 32).toLowerCase();
}
function buildReceizSignatureV4SignedPayloadForBundle(bundle) {
  const canonical = {
    kind: bundle.kind,
    payloadVersion: bundle.payloadVersion,
    createdAtMs: bundle.createdAtMs,
    ts: bundle.ts,
    tsDisplay: bundle.tsDisplay ?? "",
    tzMinutesEast: typeof bundle.tzMinutesEast === "number" ? bundle.tzMinutesEast : null,
    code: bundle.code,
    slug: bundle.slug,
    verifyPath: bundle.verifyPath,
    verifyUrl: bundle.verifyUrl,
    kaiPulseEternal: bundle.kaiPulseEternal,
    kaiKlok: bundle.kaiKlok,
    signerKeyId: bundle.signerKeyId ?? "",
    anchorId: bundle.anchorId ?? "",
    receizClaimId: bundle.receizClaimId,
    sigilClaimSeed: bundle.sigilClaimSeed,
    zkPoseidonHash: bundle.zkPoseidonHash ?? "",
    groth16ProofDigest: bundle.groth16ProofDigest ?? "",
    artifactSha256Basis: bundle.artifactSha256Basis ?? "",
    ...bundle.artifactBasis ? { artifactBasis: bundle.artifactBasis } : {},
    ...bundle.nativeCapture ? { nativeCapture: bundle.nativeCapture } : {},
    ...bundle.nativeCaptureSource ? { nativeCaptureSource: bundle.nativeCaptureSource } : {},
    ...bundle.nativeCaptureClaim ? { nativeCaptureClaim: bundle.nativeCaptureClaim } : {},
    ...bundle.pbiAuthorshipHistory ? { pbiAuthorshipHistory: bundle.pbiAuthorshipHistory } : {},
    ...bundle.nativeRecordSeal ? { nativeRecordSeal: bundle.nativeRecordSeal } : {},
    wireproof: bundle.wireproof ?? null
  };
  return jcsCanonicalize(canonical);
}
function normalizeDeviceCert(value) {
  if (!isRecord2(value)) return null;
  const version = value.version === 1 ? 1 : null;
  const certType = value.certType === "receiz.device.v1" ? "receiz.device.v1" : null;
  const certIdRaw = typeof value.certId === "string" ? value.certId.trim().toLowerCase() : "";
  const certId = HEX32_RE.test(certIdRaw) ? certIdRaw : null;
  const issuerKid = asKid2(value.issuerKid);
  const alg = value.alg === "Ed25519" ? "Ed25519" : null;
  const subjectPublicKeyRawB64u = asB64u2(value.subjectPublicKeyRawB64u);
  const issuedAtMsRaw = Number(value.issuedAtMs);
  const expiresAtMsRaw = Number(value.expiresAtMs);
  const issuedAtMs = Number.isFinite(issuedAtMsRaw) ? Math.trunc(issuedAtMsRaw) : Number.NaN;
  const expiresAtMs = Number.isFinite(expiresAtMsRaw) ? Math.trunc(expiresAtMsRaw) : Number.NaN;
  const sig = asB64u2(value.sig);
  if (!version || !certType || !certId || !issuerKid || !alg || !subjectPublicKeyRawB64u || !Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= issuedAtMs || !sig) {
    return null;
  }
  return {
    version,
    certType,
    certId,
    issuerKid,
    alg,
    subjectPublicKeyRawB64u,
    issuedAtMs,
    expiresAtMs,
    sig
  };
}
function normalizeSignatureV4(value) {
  if (!isRecord2(value)) return null;
  const version = value.version === 1 ? 1 : null;
  const alg = value.alg === "Ed25519" ? "Ed25519" : null;
  const cert = normalizeDeviceCert(value.cert);
  const sig = asB64u2(value.sig);
  const payloadHashSha256 = typeof value.payloadHashSha256 === "string" ? value.payloadHashSha256.trim().toLowerCase() : "";
  const signedAtMsRaw = Number(value.signedAtMs);
  const signedAtMs = Number.isFinite(signedAtMsRaw) ? Math.trunc(signedAtMsRaw) : Number.NaN;
  if (!version || !alg || !cert || !sig || !HEX64_RE2.test(payloadHashSha256) || !Number.isFinite(signedAtMs) || signedAtMs < 0) {
    return null;
  }
  return { version, alg, cert, sig, payloadHashSha256, signedAtMs };
}
async function importEd25519PublicKeyRawB64u(publicKeyRawB64u) {
  try {
    const publicKeyRaw = base64UrlDecode(publicKeyRawB64u);
    return await crypto.subtle.importKey("raw", toArrayBuffer(publicKeyRaw), { name: "Ed25519" }, false, ["verify"]);
  } catch {
    return null;
  }
}
function coerceReceizBundleSignatureV4(value) {
  return normalizeSignatureV4(value);
}
async function verifyReceizBundleSignatureV4(args) {
  const rawSignature = args.bundle.signatureV4;
  const signature = normalizeSignatureV4(rawSignature);
  if (!signature) {
    return typeof rawSignature === "undefined" ? { state: "missing" } : { state: "invalid", error: "signatureV4 payload is malformed." };
  }
  const signedBundle = { ...args.bundle };
  delete signedBundle.signatureV3;
  delete signedBundle.signatureV4;
  const payload = buildReceizSignatureV4SignedPayloadForBundle(signedBundle);
  const payloadBytes = new TextEncoder().encode(payload);
  const payloadHashSha256 = (await sha256Hex(payloadBytes)).toLowerCase();
  if (payloadHashSha256 !== signature.payloadHashSha256) {
    return { state: "invalid", error: "signatureV4 payload hash mismatch." };
  }
  const rootPublicKeys = args.rootPublicKeys ?? /* @__PURE__ */ new Map();
  const rootKey = rootPublicKeys.get(signature.cert.issuerKid) ?? null;
  if (!rootKey) {
    return { state: "unavailable", error: "signatureV4 root key not configured." };
  }
  if (rootKey.alg !== signature.cert.alg) {
    return { state: "invalid", error: "signatureV4 root-key algorithm mismatch." };
  }
  const bundlePulse = asPulseString(args.bundle.kaiPulseEternal);
  if (bundlePulse === null) {
    return { state: "invalid", error: "signatureV4 bundle pulse is invalid." };
  }
  const keyPolicyPulse = BigInt(bundlePulse);
  if (rootKey.activeFromPulse && keyPolicyPulse < BigInt(rootKey.activeFromPulse)) {
    return { state: "invalid", error: "signatureV4 root key predates activation pulse." };
  }
  if (rootKey.status === "retired" && !rootKey.retiredAtPulse) {
    return { state: "unavailable", error: "signatureV4 root key retired without retirement pulse." };
  }
  if (rootKey.retiredAtPulse && keyPolicyPulse > BigInt(rootKey.retiredAtPulse)) {
    return { state: "unavailable", error: "signatureV4 root key retired for this bundle pulse." };
  }
  const certExpectedId = await deriveReceizSignatureV4DeviceCertId({
    version: signature.cert.version,
    certType: signature.cert.certType,
    issuerKid: signature.cert.issuerKid,
    alg: signature.cert.alg,
    subjectPublicKeyRawB64u: signature.cert.subjectPublicKeyRawB64u,
    issuedAtMs: signature.cert.issuedAtMs,
    expiresAtMs: signature.cert.expiresAtMs
  });
  if (certExpectedId !== signature.cert.certId) {
    return { state: "invalid", error: "signatureV4 device certificate ID mismatch." };
  }
  const certPayload = buildReceizSignatureV4DeviceCertPayload({
    version: signature.cert.version,
    certType: signature.cert.certType,
    certId: signature.cert.certId,
    issuerKid: signature.cert.issuerKid,
    alg: signature.cert.alg,
    subjectPublicKeyRawB64u: signature.cert.subjectPublicKeyRawB64u,
    issuedAtMs: signature.cert.issuedAtMs,
    expiresAtMs: signature.cert.expiresAtMs
  });
  const certPayloadBytes = new TextEncoder().encode(certPayload);
  const rootCryptoKey = await importEd25519PublicKeyRawB64u(rootKey.publicKeyRawB64u);
  if (!rootCryptoKey) {
    return { state: "invalid", error: "signatureV4 root key import failed." };
  }
  let certValid = false;
  try {
    certValid = await crypto.subtle.verify(
      "Ed25519",
      rootCryptoKey,
      toArrayBuffer(base64UrlDecode(signature.cert.sig)),
      toArrayBuffer(certPayloadBytes)
    );
  } catch {
    certValid = false;
  }
  if (!certValid) {
    return { state: "invalid", error: "signatureV4 device certificate verification failed." };
  }
  if (signature.signedAtMs < signature.cert.issuedAtMs) {
    return { state: "invalid", error: "signatureV4 signedAtMs predates certificate issuance." };
  }
  if (signature.signedAtMs > signature.cert.expiresAtMs) {
    return { state: "unavailable", error: "signatureV4 device certificate expired at signedAtMs." };
  }
  const subjectCryptoKey = await importEd25519PublicKeyRawB64u(signature.cert.subjectPublicKeyRawB64u);
  if (!subjectCryptoKey) {
    return { state: "invalid", error: "signatureV4 subject key import failed." };
  }
  let verified = false;
  try {
    verified = await crypto.subtle.verify(
      "Ed25519",
      subjectCryptoKey,
      toArrayBuffer(base64UrlDecode(signature.sig)),
      toArrayBuffer(payloadBytes)
    );
  } catch {
    verified = false;
  }
  if (!verified) {
    return { state: "invalid", error: "signatureV4 verification failed." };
  }
  return {
    state: "verified",
    issuerKid: signature.cert.issuerKid,
    certId: signature.cert.certId
  };
}

// app/utils/pngChunks.ts
var PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
var textDecoder = new TextDecoder("utf-8");
var textEncoder2 = new TextEncoder();
function assertPngSignature(bytes) {
  if (bytes.length < PNG_SIGNATURE.length) {
    throw new Error("Invalid PNG: missing signature");
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error("Invalid PNG: bad signature");
    }
  }
}
function readUint32BE(bytes, offset) {
  return ((bytes[offset] ?? 0) << 24 | (bytes[offset + 1] ?? 0) << 16 | (bytes[offset + 2] ?? 0) << 8 | (bytes[offset + 3] ?? 0)) >>> 0;
}
function writeUint32BE(target, offset, value) {
  target[offset] = value >>> 24 & 255;
  target[offset + 1] = value >>> 16 & 255;
  target[offset + 2] = value >>> 8 & 255;
  target[offset + 3] = value & 255;
}
function chunkType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0
  );
}
function indexOfNull(bytes, start) {
  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === 0) return i;
  }
  return -1;
}
function parseITXtData(data) {
  const keywordEnd = indexOfNull(data, 0);
  if (keywordEnd <= 0) return null;
  const keyword = textDecoder.decode(data.slice(0, keywordEnd));
  let cursor = keywordEnd + 1;
  if (cursor + 2 > data.length) return null;
  const compressionFlag = data[cursor] ?? 0;
  const compressionMethod = data[cursor + 1] ?? 0;
  cursor += 2;
  if (compressionFlag !== 0 || compressionMethod !== 0) return null;
  const langEnd = indexOfNull(data, cursor);
  if (langEnd < 0) return null;
  cursor = langEnd + 1;
  const translatedEnd = indexOfNull(data, cursor);
  if (translatedEnd < 0) return null;
  cursor = translatedEnd + 1;
  if (cursor > data.length) return null;
  const text = textDecoder.decode(data.slice(cursor));
  return { keyword, text };
}
function parseTextData(data) {
  const keywordEnd = indexOfNull(data, 0);
  if (keywordEnd <= 0) return null;
  const keyword = textDecoder.decode(data.slice(0, keywordEnd));
  const text = textDecoder.decode(data.slice(keywordEnd + 1));
  return { keyword, text };
}
function parseZTxtData(data) {
  const keywordEnd = indexOfNull(data, 0);
  if (keywordEnd <= 0) return null;
  const keyword = textDecoder.decode(data.slice(0, keywordEnd));
  const compressionMethod = data[keywordEnd + 1] ?? 255;
  if (compressionMethod !== 0) return null;
  let inflated;
  try {
    inflated = inflateSync(data.slice(keywordEnd + 2));
  } catch {
    return null;
  }
  const text = textDecoder.decode(inflated);
  return { keyword, text };
}
function buildITXtData(entry) {
  const keywordBytes = textEncoder2.encode(entry.keyword);
  if (keywordBytes.length === 0 || keywordBytes.length > 79) {
    throw new Error("Invalid iTXt keyword length");
  }
  for (const byte of keywordBytes) {
    if (byte === 0) throw new Error("Invalid iTXt keyword");
  }
  const textBytes = textEncoder2.encode(entry.text);
  const out = new Uint8Array(keywordBytes.length + 5 + textBytes.length);
  out.set(keywordBytes, 0);
  let cursor = keywordBytes.length;
  out[cursor] = 0;
  out[cursor + 1] = 0;
  out[cursor + 2] = 0;
  out[cursor + 3] = 0;
  out[cursor + 4] = 0;
  cursor += 5;
  out.set(textBytes, cursor);
  return out;
}
var crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}
function crc32(bytes) {
  const table = getCrcTable();
  let crc = 4294967295;
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    crc = table[(crc ^ byte) & 255] ^ crc >>> 8;
  }
  return (crc ^ 4294967295) >>> 0;
}
function buildITXtChunk(entry) {
  const typeBytes = new Uint8Array([105, 84, 88, 116]);
  const data = buildITXtData(entry);
  const length = data.length;
  const chunk = new Uint8Array(12 + length);
  writeUint32BE(chunk, 0, length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  const crc = crc32(crcInput);
  writeUint32BE(chunk, 8 + length, crc);
  return chunk;
}
function readPngTextChunks(pngBytes) {
  assertPngSignature(pngBytes);
  const chunks = [];
  let offset = 8;
  while (offset + 8 <= pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    const type = chunkType(pngBytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > pngBytes.length) break;
    const data = pngBytes.slice(dataStart, dataEnd);
    const parsed = type === "iTXt" ? parseITXtData(data) : type === "tEXt" ? parseTextData(data) : type === "zTXt" ? parseZTxtData(data) : null;
    if (parsed) chunks.push(parsed);
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  return chunks;
}
function readPngTextChunk(pngBytes, keyword) {
  const chunks = readPngTextChunks(pngBytes);
  for (const chunk of chunks) {
    if (chunk.keyword === keyword) return chunk.text;
  }
  return null;
}
function insertPngTextChunks(pngBytes, entries) {
  if (entries.length === 0) return pngBytes;
  assertPngSignature(pngBytes);
  let offset = 8;
  let iendOffset = -1;
  while (offset + 8 <= pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    const type = chunkType(pngBytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > pngBytes.length) break;
    if (type === "IEND") {
      iendOffset = offset;
      break;
    }
    offset = dataEnd + 4;
  }
  if (iendOffset < 0) {
    throw new Error("Invalid PNG: missing IEND");
  }
  const prefix = pngBytes.slice(0, iendOffset);
  const suffix = pngBytes.slice(iendOffset);
  const chunks = entries.map(buildITXtChunk);
  const totalLength = prefix.length + suffix.length + chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  out.set(prefix, cursor);
  cursor += prefix.length;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  out.set(suffix, cursor);
  return out;
}
function countPngTextChunksByKeyword(pngBytes, keyword) {
  return readPngTextChunks(pngBytes).filter((chunk) => chunk.keyword === keyword).length;
}
function stripPngTextChunksByKeyword(pngBytes, keyword) {
  assertPngSignature(pngBytes);
  const retainedChunks = [];
  retainedChunks.push(pngBytes.slice(0, PNG_SIGNATURE.length));
  let offset = PNG_SIGNATURE.length;
  let removedCount = 0;
  while (offset + 8 <= pngBytes.length) {
    const length = readUint32BE(pngBytes, offset);
    const type = chunkType(pngBytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > pngBytes.length) break;
    let shouldRemove = false;
    if (type === "iTXt" || type === "tEXt" || type === "zTXt") {
      const data = pngBytes.slice(dataStart, dataEnd);
      const parsed = type === "iTXt" ? parseITXtData(data) : type === "tEXt" ? parseTextData(data) : parseZTxtData(data);
      if (parsed?.keyword === keyword) shouldRemove = true;
    }
    if (shouldRemove) {
      removedCount += 1;
    } else {
      retainedChunks.push(pngBytes.slice(offset, chunkEnd));
    }
    offset = chunkEnd;
    if (type === "IEND") break;
  }
  const totalLength = retainedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  for (const chunk of retainedChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return { pngBytes: out, removedCount };
}

// app/lib/profile/username.ts
var PROFILE_USERNAME_MAX = 24;
var PROFILE_USERNAME_RE = /^[a-z0-9_]{3,24}$/;
function normalizeProfileUsername(raw) {
  const trimmed = (raw ?? "").trim().toLowerCase().replace(/^@+/, "");
  if (!trimmed) return "";
  return trimmed.replace(/[^a-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").slice(0, PROFILE_USERNAME_MAX);
}
function isValidProfileUsername(username) {
  return PROFILE_USERNAME_RE.test(username);
}
function parseProfileUsername(raw) {
  const normalized = normalizeProfileUsername(raw);
  if (!normalized) return null;
  return isValidProfileUsername(normalized) ? normalized : null;
}

// app/utils/receizOwnershipProvenanceBundle.ts
var RECEIZ_OWNERSHIP_PROVENANCE_CHUNK_KEY = "receiz.ownership_provenance";
var MAX_PROVENANCE_ENCODE_BYTES = 8 * 1024 * 1024;
var MAX_PROVENANCE_DECODE_BYTES = 16 * 1024 * 1024;

// app/utils/signerKeyId.ts
var SIGNER_KEY_ID_HMAC_MESSAGE = "receiz|signing-key-id|v1";
var SIGNER_KEY_ID_HEX_LENGTH = 12;
async function deriveSignerKeyId(signingKey) {
  if (!signingKey) return "";
  return (await hmacHex(SIGNER_KEY_ID_HMAC_MESSAGE, signingKey)).slice(0, SIGNER_KEY_ID_HEX_LENGTH);
}

// app/lib/sdk/artifactContinuity.ts
function canonicalReceizOwnerId(usernameRaw) {
  if (typeof usernameRaw !== "string") return null;
  const candidate = usernameRaw.trim().replace(/^@+/, "").toLowerCase();
  const username = parseProfileUsername(candidate);
  if (!username || username !== candidate) return null;
  return `${username}.receiz.id`;
}

// app/utils/receizProofBundle.ts
var RECEIZ_PROOF_BUNDLE_CHUNK_KEY = "receiz.proof_bundle";
var RECEIZ_PROOF_BUNDLE_CODEC = "c1";
var MAX_BUNDLE_ENCODE_BYTES = 24 * 1024;
var MAX_BUNDLE_DECODE_BYTES = 64 * 1024;
function asFiniteInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}
function asNonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function asHex64(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) return null;
  return normalized;
}
function asSignerKeyId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(normalized)) return null;
  return normalized;
}
function isReceizOwnerIdentity(value) {
  if (typeof value !== "string" || value !== value.trim().toLowerCase()) return false;
  if (/^[0-9a-f]{64}$/.test(value)) return true;
  return /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(value);
}
function coerceReceizNativeRecordSeal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value;
  if (obj.schema !== "receiz.native_record_seal.v1") return null;
  const ownerReceizId = typeof obj.ownerReceizId === "string" ? obj.ownerReceizId : "";
  if (!isReceizOwnerIdentity(ownerReceizId)) return null;
  const recordId = typeof obj.recordId === "string" && obj.recordId.trim() ? obj.recordId : null;
  if (!recordId || !obj.payload || typeof obj.payload !== "object" || Array.isArray(obj.payload)) return null;
  const payload = obj.payload;
  const filename = typeof payload.filename === "string" && payload.filename.trim() ? payload.filename : null;
  const mimeType = typeof payload.mimeType === "string" && payload.mimeType.trim() ? payload.mimeType : null;
  const sha256 = typeof payload.sha256 === "string" && /^[0-9a-f]{64}$/.test(payload.sha256) ? payload.sha256 : null;
  if (!filename || !mimeType || !sha256) return null;
  const ownershipContinuityRaw = obj.ownershipContinuity;
  const ownershipContinuity = typeof ownershipContinuityRaw === "undefined" ? void 0 : coerceReceizNativeOwnershipContinuity(ownershipContinuityRaw);
  if (typeof ownershipContinuityRaw !== "undefined" && !ownershipContinuity) return null;
  const proofPredecessorRaw = obj.proofPredecessor;
  const proofPredecessor = typeof proofPredecessorRaw === "undefined" ? void 0 : coerceReceizNativeProofPredecessor(proofPredecessorRaw);
  if (typeof proofPredecessorRaw !== "undefined" && !proofPredecessor) return null;
  return {
    schema: "receiz.native_record_seal.v1",
    ownerReceizId,
    recordId,
    payload: { filename, mimeType, sha256 },
    ...ownershipContinuity ? { ownershipContinuity } : {},
    ...proofPredecessor ? { proofPredecessor } : {}
  };
}
function coerceReceizNativeProofPredecessor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value;
  const headReference = asNonEmptyString(obj.headReference);
  const artifactSha256 = asHex64(obj.artifactSha256);
  if (!headReference || !artifactSha256) return null;
  return { headReference, artifactSha256 };
}
function coerceReceizNativeOwnershipContinuity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value;
  if (obj.schema !== "receiz.native_ownership_continuity.v1") return null;
  const artifactId = asHex64(obj.artifactId);
  const namespace = asNonEmptyString(obj.namespace);
  const genesisOwnerReceizId = asNonEmptyString(obj.genesisOwnerReceizId);
  const ownerReceizId = asNonEmptyString(obj.ownerReceizId);
  const headReference = asNonEmptyString(obj.headReference);
  const historyDigestSha256 = asHex64(obj.historyDigestSha256);
  const appendCount = asFiniteInt(obj.appendCount);
  const historyRaw = obj.history;
  const history = typeof historyRaw === "undefined" ? void 0 : Array.isArray(historyRaw) ? historyRaw.map(coerceReceizNativeOwnershipHistoryEntry) : null;
  const predecessorRaw = obj.predecessor;
  const predecessor = typeof predecessorRaw === "undefined" ? void 0 : coerceReceizNativeOwnershipPredecessor(predecessorRaw);
  if (!artifactId || !namespace || !isReceizOwnerIdentity(genesisOwnerReceizId) || !isReceizOwnerIdentity(ownerReceizId) || !headReference || !historyDigestSha256 || appendCount === null || appendCount < 0 || typeof historyRaw !== "undefined" && (!history || history.some((entry) => !entry)) || typeof predecessorRaw !== "undefined" && !predecessor || appendCount === 0 && predecessor) return null;
  return {
    schema: "receiz.native_ownership_continuity.v1",
    artifactId,
    namespace,
    genesisOwnerReceizId,
    ownerReceizId,
    headReference,
    historyDigestSha256,
    appendCount,
    ...history ? { history } : {},
    ...predecessor ? { predecessor } : {}
  };
}
function coerceReceizNativeOwnershipHistoryEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value;
  const index = asFiniteInt(obj.index);
  const headReference = asNonEmptyString(obj.headReference);
  const historyDigestSha256 = asHex64(obj.historyDigestSha256);
  if (obj.schema === "receiz.native_ownership_genesis.v1") {
    const ownerReceizId = asNonEmptyString(obj.ownerReceizId);
    if (index !== 0 || !ownerReceizId || !headReference || !historyDigestSha256) return null;
    return { schema: "receiz.native_ownership_genesis.v1", index: 0, ownerReceizId, headReference, historyDigestSha256 };
  }
  if (obj.schema !== "receiz.native_ownership_transfer.v1") return null;
  const fromOwnerReceizId = asNonEmptyString(obj.fromOwnerReceizId);
  const toOwnerReceizId = asNonEmptyString(obj.toOwnerReceizId);
  const priorHeadReference = asNonEmptyString(obj.priorHeadReference);
  const sourceArtifactSha256 = asHex64(obj.sourceArtifactSha256);
  if (index === null || index < 1 || !fromOwnerReceizId || !toOwnerReceizId || !priorHeadReference || !sourceArtifactSha256 || !headReference || !historyDigestSha256) return null;
  return { schema: "receiz.native_ownership_transfer.v1", index, fromOwnerReceizId, toOwnerReceizId, priorHeadReference, sourceArtifactSha256, headReference, historyDigestSha256 };
}
function coerceReceizNativeOwnershipPredecessor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value;
  const headReference = asNonEmptyString(obj.headReference);
  const artifactSha256 = asHex64(obj.artifactSha256);
  const ownerReceizId = asNonEmptyString(obj.ownerReceizId);
  const historyDigestSha256 = asHex64(obj.historyDigestSha256);
  const appendCount = asFiniteInt(obj.appendCount);
  if (!headReference || !artifactSha256 || !ownerReceizId || !isReceizOwnerIdentity(ownerReceizId) || !historyDigestSha256 || appendCount === null || appendCount < 0) return null;
  return {
    headReference,
    artifactSha256,
    ownerReceizId,
    historyDigestSha256,
    appendCount
  };
}
async function verifyReceizNativeOwnershipContinuity(args) {
  const continuity = coerceReceizNativeOwnershipContinuity(args.continuity);
  if (!continuity || continuity.artifactId !== args.payloadSha256 || continuity.namespace !== `receiz.native-proof:${args.payloadSha256}` || continuity.ownerReceizId !== args.ownerReceizId || continuity.headReference !== args.headReference || !await verifyReceizNativeOwnershipHistory(continuity)) return false;
  if (continuity.appendCount === 0) {
    if (continuity.predecessor) return false;
    const genesisDigest = await sha256Hex(jcsCanonicalize({
      schema: "receiz.ownership.genesis.v1",
      artifactId: continuity.artifactId,
      namespace: continuity.namespace,
      ownerReceizId: continuity.ownerReceizId
    }));
    return continuity.genesisOwnerReceizId === continuity.ownerReceizId && continuity.historyDigestSha256 === genesisDigest;
  }
  const predecessor = continuity.predecessor;
  if (!predecessor || continuity.appendCount !== predecessor.appendCount + 1) return false;
  const appendDigest = await sha256Hex(jcsCanonicalize({
    schema: "receiz.ownership.append.v1",
    priorHistoryDigestSha256: predecessor.historyDigestSha256,
    sourceArtifactSha256: predecessor.artifactSha256,
    priorHeadReference: predecessor.headReference,
    fromOwnerReceizId: predecessor.ownerReceizId,
    toOwnerReceizId: continuity.ownerReceizId
  }));
  return continuity.historyDigestSha256 === appendDigest;
}
async function verifyReceizNativeOwnershipHistory(continuityInput) {
  const continuity = coerceReceizNativeOwnershipContinuity(continuityInput);
  if (!continuity) return false;
  const history = continuity.history;
  if (!history) return true;
  if (history.length !== continuity.appendCount + 1) return false;
  const genesis = history[0];
  if (!genesis || genesis.schema !== "receiz.native_ownership_genesis.v1") return false;
  const genesisDigest = await sha256Hex(jcsCanonicalize({ schema: "receiz.ownership.genesis.v1", artifactId: continuity.artifactId, namespace: continuity.namespace, ownerReceizId: genesis.ownerReceizId }));
  if (genesis.index !== 0 || genesis.ownerReceizId !== continuity.genesisOwnerReceizId || genesis.historyDigestSha256 !== genesisDigest) return false;
  let ownerReceizId = genesis.ownerReceizId;
  let headReference = genesis.headReference;
  let historyDigestSha256 = genesis.historyDigestSha256;
  for (let index = 1; index < history.length; index += 1) {
    const entry = history[index];
    if (!entry || entry.schema !== "receiz.native_ownership_transfer.v1" || entry.index !== index || entry.fromOwnerReceizId !== ownerReceizId || entry.priorHeadReference !== headReference) return false;
    const expectedDigest = await sha256Hex(jcsCanonicalize({ schema: "receiz.ownership.append.v1", priorHistoryDigestSha256: historyDigestSha256, sourceArtifactSha256: entry.sourceArtifactSha256, priorHeadReference: entry.priorHeadReference, fromOwnerReceizId: entry.fromOwnerReceizId, toOwnerReceizId: entry.toOwnerReceizId }));
    if (entry.historyDigestSha256 !== expectedDigest) return false;
    ownerReceizId = entry.toOwnerReceizId;
    headReference = entry.headReference;
    historyDigestSha256 = entry.historyDigestSha256;
  }
  return ownerReceizId === continuity.ownerReceizId && headReference === continuity.headReference && historyDigestSha256 === continuity.historyDigestSha256;
}
function stripReceizProofAugmentationChunks(pngBytes) {
  const withoutProof = stripPngTextChunksByKeyword(pngBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY).pngBytes;
  return stripPngTextChunksByKeyword(withoutProof, RECEIZ_OWNERSHIP_PROVENANCE_CHUNK_KEY).pngBytes;
}
function asHex8(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(normalized)) return null;
  return normalized;
}
function buildClaimMessageBase(input) {
  const zkPoseidonHash = typeof input.zkPoseidonHash === "string" ? input.zkPoseidonHash.trim() : "";
  const groth16ProofDigest = typeof input.groth16ProofDigest === "string" ? input.groth16ProofDigest.trim().toLowerCase() : "";
  const parts = [
    "receiz-claim",
    input.ts,
    input.code,
    input.slug,
    input.kaiPulseEternal,
    input.artifactSha256Basis ?? "",
    zkPoseidonHash,
    groth16ProofDigest
  ];
  if (input.artifactBasisNormalization) {
    parts.push(input.artifactBasisNormalization);
  }
  if (input.signerKeyId) {
    parts.push(input.signerKeyId);
  }
  if (input.anchorId) {
    parts.push(input.anchorId);
  }
  if (input.wireproofAnchorId || input.wireproofClaimHashSha256) {
    parts.push(input.wireproofAnchorId ?? "", input.wireproofClaimHashSha256 ?? "");
  }
  return parts.join("|");
}
function encodeReceizProofBundle(bundle) {
  const canonical = jcsCanonicalize(bundle);
  const rawBytes = new TextEncoder().encode(canonical);
  if (rawBytes.byteLength > MAX_BUNDLE_ENCODE_BYTES) {
    throw new Error("Receiz proof bundle too large.");
  }
  const compressed = deflateSync(rawBytes, { level: 9 });
  return `${RECEIZ_PROOF_BUNDLE_CODEC}:${base64UrlEncode(compressed)}`;
}
function decodeReceizProofBundle(encoded) {
  const [codec, payload] = encoded.split(":", 2);
  if (codec !== RECEIZ_PROOF_BUNDLE_CODEC || !payload) {
    const legacyBytes = base64UrlDecode(encoded);
    const parsedLegacy = JSON.parse(new TextDecoder().decode(legacyBytes));
    const legacyBundle = coerceReceizProofBundle(parsedLegacy);
    if (!legacyBundle) throw new Error("Unsupported receiz proof bundle codec.");
    return legacyBundle;
  }
  const compressed = base64UrlDecode(payload);
  const inflated = inflateSync(compressed);
  if (inflated.byteLength > MAX_BUNDLE_DECODE_BYTES) {
    throw new Error("Receiz proof bundle payload too large.");
  }
  const parsed = JSON.parse(new TextDecoder().decode(inflated));
  const bundle = coerceReceizProofBundle(parsed);
  if (!bundle) throw new Error("Invalid receiz proof bundle payload.");
  return bundle;
}
function isPlainProofValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isPlainProofValue);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(isPlainProofValue);
}
function isPlainProofRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !isPlainProofValue(value)) return void 0;
  return value;
}
function coerceReceizProofBundle(value) {
  if (!value || typeof value !== "object") return null;
  const obj = value;
  const kind = asNonEmptyString(obj.kind);
  if (kind !== "receiz.proof_bundle") return null;
  const payloadVersion = asNonEmptyString(obj.payloadVersion);
  if (payloadVersion !== "v2" && payloadVersion !== "v1") return null;
  const createdAtMs = asFiniteInt(obj.createdAtMs);
  const ts = asNonEmptyString(obj.ts);
  const code = asNonEmptyString(obj.code);
  const slug = asNonEmptyString(obj.slug);
  const verifyPath = asNonEmptyString(obj.verifyPath);
  const verifyUrlRaw = obj.verifyUrl;
  const verifyUrl = typeof verifyUrlRaw === "string" ? verifyUrlRaw : "";
  const kaiPulseEternal = asNonEmptyString(obj.kaiPulseEternal);
  const kaiKlok = asNonEmptyString(obj.kaiKlok);
  const signerKeyId = asSignerKeyId(obj.signerKeyId);
  const anchorId = asHex8(obj.anchorId);
  const receizClaimId = asNonEmptyString(obj.receizClaimId);
  const sigilClaimSeed = asNonEmptyString(obj.sigilClaimSeed);
  const zkPoseidonHash = asNonEmptyString(obj.zkPoseidonHash);
  const groth16ProofDigest = asHex64(obj.groth16ProofDigest);
  const artifactSha256Basis = asHex64(obj.artifactSha256Basis);
  const artifactBasisRaw = obj.artifactBasis;
  const artifactBasisNormalization = artifactBasisRaw && typeof artifactBasisRaw === "object" && (
    artifactBasisRaw.normalization === "jpeg-adobe-xmp-app1-v1"
    || artifactBasisRaw.normalization === "jpeg-ios-photos-carrier-v2"
    || artifactBasisRaw.normalization === "jpeg-ios-photos-carrier-v3"
    || artifactBasisRaw.normalization === "jpeg-ios-photos-carrier-v4"
    || artifactBasisRaw.normalization === "jpeg-ios-photos-carrier-v5"
    || artifactBasisRaw.normalization === "jpeg-ios-photos-carrier-v6"
  ) ? artifactBasisRaw.normalization : void 0;
  const artifactBasis = artifactBasisRaw && typeof artifactBasisRaw === "object" && artifactBasisRaw.algorithm === "sha256" && artifactBasisNormalization ? {
    algorithm: "sha256",
    normalization: artifactBasisNormalization
  } : void 0;
  if (typeof artifactBasisRaw !== "undefined" && !artifactBasis) {
    return null;
  }
  const signatureV3Raw = obj.signatureV3;
  const signatureV3 = typeof signatureV3Raw === "undefined" ? void 0 : coerceReceizBundleSignatureV3(signatureV3Raw);
  if (typeof signatureV3Raw !== "undefined" && !signatureV3) {
    return null;
  }
  const signatureV4Raw = obj.signatureV4;
  const signatureV4 = typeof signatureV4Raw === "undefined" ? void 0 : coerceReceizBundleSignatureV4(signatureV4Raw);
  if (typeof signatureV4Raw !== "undefined" && !signatureV4) {
    return null;
  }
  const nativeRecordSealRaw = obj.nativeRecordSeal;
  const nativeRecordSeal = typeof nativeRecordSealRaw === "undefined" ? void 0 : coerceReceizNativeRecordSeal(nativeRecordSealRaw);
  if (typeof nativeRecordSealRaw !== "undefined" && !nativeRecordSeal) {
    return null;
  }
  const nativeCapture = isPlainProofRecord(obj.nativeCapture);
  const nativeCaptureSource = isPlainProofRecord(obj.nativeCaptureSource);
  const nativeCaptureClaim = isPlainProofRecord(obj.nativeCaptureClaim);
  const pbiAuthorshipHistory = Array.isArray(obj.pbiAuthorshipHistory) ? obj.pbiAuthorshipHistory.map(isPlainProofRecord) : void 0;
  if (typeof obj.nativeCapture !== "undefined" && !nativeCapture || typeof obj.nativeCaptureSource !== "undefined" && !nativeCaptureSource || typeof obj.nativeCaptureClaim !== "undefined" && !nativeCaptureClaim || typeof obj.pbiAuthorshipHistory !== "undefined" && (!pbiAuthorshipHistory || pbiAuthorshipHistory.some((entry) => !entry))) {
    return null;
  }
  const groth16ProofRaw = obj.groth16Proof;
  const groth16Proof = typeof groth16ProofRaw === "string" ? groth16ProofRaw : groth16ProofRaw && typeof groth16ProofRaw === "object" ? groth16ProofRaw : void 0;
  if (createdAtMs === null || !ts || !code || !slug || !verifyPath || !kaiPulseEternal || !kaiKlok || !receizClaimId || !sigilClaimSeed) {
    return null;
  }
  const tsDisplayRaw = obj.tsDisplay;
  const tzRaw = obj.tzMinutesEast;
  let wireproof;
  const wpRaw = obj.wireproof;
  if (wpRaw && typeof wpRaw === "object") {
    const wp = wpRaw;
    const schema = asNonEmptyString(wp.schema);
    const anchorId2 = asHex8(wp.anchorId);
    const claimHashSha256 = asHex64(wp.claimHashSha256);
    const verifierPathWp = asNonEmptyString(wp.verifierPath);
    if (schema === "wireproof.v1" && anchorId2 && claimHashSha256 && verifierPathWp) {
      wireproof = {
        schema: "wireproof.v1",
        anchorId: anchorId2,
        claimHashSha256,
        verifierPath: verifierPathWp
      };
    }
  }
  return {
    kind: "receiz.proof_bundle",
    payloadVersion,
    createdAtMs,
    ts,
    ...typeof tsDisplayRaw === "string" && tsDisplayRaw.length > 0 ? { tsDisplay: tsDisplayRaw } : {},
    ...typeof tzRaw === "number" && Number.isFinite(tzRaw) ? { tzMinutesEast: Math.trunc(tzRaw) } : {},
    code,
    slug,
    verifyPath,
    verifyUrl,
    kaiPulseEternal,
    kaiKlok,
    ...signerKeyId ? { signerKeyId } : {},
    ...anchorId ? { anchorId } : {},
    receizClaimId,
    sigilClaimSeed,
    ...zkPoseidonHash ? { zkPoseidonHash } : {},
    ...groth16Proof ? { groth16Proof } : {},
    ...groth16ProofDigest ? { groth16ProofDigest } : {},
    ...artifactSha256Basis ? { artifactSha256Basis } : {},
    ...artifactBasis ? { artifactBasis } : {},
    ...signatureV3 ? { signatureV3 } : {},
    ...signatureV4 ? { signatureV4 } : {},
    ...nativeRecordSeal ? { nativeRecordSeal } : {},
    ...nativeCapture ? { nativeCapture } : {},
    ...nativeCaptureSource ? { nativeCaptureSource } : {},
    ...nativeCaptureClaim ? { nativeCaptureClaim } : {},
    ...pbiAuthorshipHistory ? { pbiAuthorshipHistory } : {},
    ...wireproof ? { wireproof } : {}
  };
}
async function validateReceizBundleSignature(args) {
  const expectedSignerKeyId = await deriveSignerKeyId(args.signingKey);
  const bundleSignerKeyId = asSignerKeyId(args.bundle.signerKeyId);
  const bundleAnchorId = asHex8(args.bundle.anchorId);
  if (args.bundle.signerKeyId && !bundleSignerKeyId) {
    return false;
  }
  if (bundleSignerKeyId && bundleSignerKeyId !== expectedSignerKeyId) {
    return false;
  }
  if (args.bundle.anchorId && !bundleAnchorId) {
    return false;
  }
  if (bundleAnchorId && !bundleSignerKeyId) {
    return false;
  }
  if (bundleSignerKeyId) {
    const claimIdMessageBaseV2 = buildClaimMessageBase({
      ts: args.bundle.ts,
      code: args.bundle.code,
      slug: args.bundle.slug,
      kaiPulseEternal: args.bundle.kaiPulseEternal,
      signerKeyId: expectedSignerKeyId,
      anchorId: bundleAnchorId ?? void 0,
      artifactSha256Basis: args.bundle.artifactSha256Basis,
      artifactBasisNormalization: args.bundle.artifactBasis?.normalization,
      zkPoseidonHash: args.bundle.zkPoseidonHash,
      groth16ProofDigest: args.bundle.groth16ProofDigest,
      wireproofAnchorId: args.bundle.wireproof?.anchorId,
      wireproofClaimHashSha256: args.bundle.wireproof?.claimHashSha256
    });
    const expectedClaimIdV2 = (await hmacHex(`${claimIdMessageBaseV2}|claim-id`, args.signingKey)).slice(0, 32);
    const seedMessageBaseV2 = buildClaimMessageBase({
      ts: args.bundle.ts,
      code: args.bundle.code,
      slug: args.bundle.slug,
      kaiPulseEternal: args.bundle.kaiPulseEternal,
      signerKeyId: expectedSignerKeyId,
      anchorId: bundleAnchorId ?? void 0,
      artifactSha256Basis: args.bundle.artifactSha256Basis,
      artifactBasisNormalization: args.bundle.artifactBasis?.normalization,
      zkPoseidonHash: args.bundle.zkPoseidonHash,
      groth16ProofDigest: args.bundle.groth16ProofDigest,
      wireproofAnchorId: args.bundle.wireproof?.anchorId,
      wireproofClaimHashSha256: args.bundle.wireproof?.claimHashSha256
    });
    const expectedSeedV2 = (await hmacHex(`${seedMessageBaseV2}|seed`, args.signingKey)).slice(0, 64);
    return expectedClaimIdV2 === args.bundle.receizClaimId && expectedSeedV2 === args.bundle.sigilClaimSeed;
  }
  const claimIdMessageBaseV1 = buildClaimMessageBase({
    ts: args.bundle.ts,
    code: args.bundle.code,
    slug: args.bundle.slug,
    kaiPulseEternal: args.bundle.kaiPulseEternal,
    artifactSha256Basis: args.bundle.artifactSha256Basis,
    artifactBasisNormalization: args.bundle.artifactBasis?.normalization,
    zkPoseidonHash: args.bundle.zkPoseidonHash,
    groth16ProofDigest: args.bundle.groth16ProofDigest,
    wireproofAnchorId: args.bundle.wireproof?.anchorId,
    wireproofClaimHashSha256: args.bundle.wireproof?.claimHashSha256
  });
  const expectedClaimIdV1 = (await hmacHex(`${claimIdMessageBaseV1}|claim-id`, args.signingKey)).slice(0, 32);
  const seedMessageBaseV1 = buildClaimMessageBase({
    ts: args.bundle.ts,
    code: args.bundle.code,
    slug: args.bundle.slug,
    kaiPulseEternal: args.bundle.kaiPulseEternal,
    artifactSha256Basis: args.bundle.artifactSha256Basis,
    artifactBasisNormalization: args.bundle.artifactBasis?.normalization,
    zkPoseidonHash: args.bundle.zkPoseidonHash,
    groth16ProofDigest: args.bundle.groth16ProofDigest,
    wireproofAnchorId: args.bundle.wireproof?.anchorId,
    wireproofClaimHashSha256: args.bundle.wireproof?.claimHashSha256
  });
  const expectedSeedV1 = (await hmacHex(`${seedMessageBaseV1}|seed`, args.signingKey)).slice(0, 64);
  if (expectedClaimIdV1 === args.bundle.receizClaimId && expectedSeedV1 === args.bundle.sigilClaimSeed) {
    return true;
  }
  const seedMessageBaseV0 = buildClaimMessageBase({
    ts: args.bundle.ts,
    code: args.bundle.code,
    slug: args.bundle.slug,
    kaiPulseEternal: args.bundle.kaiPulseEternal,
    zkPoseidonHash: args.bundle.zkPoseidonHash,
    groth16ProofDigest: args.bundle.groth16ProofDigest,
    wireproofAnchorId: args.bundle.wireproof?.anchorId,
    wireproofClaimHashSha256: args.bundle.wireproof?.claimHashSha256
  });
  const expectedSeedV0 = (await hmacHex(`${seedMessageBaseV0}|seed`, args.signingKey)).slice(0, 64);
  if (expectedClaimIdV1 === args.bundle.receizClaimId && expectedSeedV0 === args.bundle.sigilClaimSeed) {
    return true;
  }
  return false;
}

// app/lib/documentSeal/bundleContainer.ts
var textEncoder3 = new TextEncoder();
var textDecoder2 = new TextDecoder();
function asNonEmptyString2(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function asInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}
function asHex642(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : null;
}
function coerceManifest(value) {
  if (!value || typeof value !== "object") return null;
  const obj = value;
  const filename = asNonEmptyString2(obj.filename);
  const mime = asNonEmptyString2(obj.mime);
  const basisSha256 = asHex642(obj.basisSha256);
  const createdAt = asInt(obj.createdAt);
  const version = obj.version === 1 ? 1 : null;
  if (!filename || !mime || !basisSha256 || createdAt === null || version !== 1) return null;
  return { filename, mime, basisSha256, createdAt, version };
}
function encodeReceizBundleEnvelope(args) {
  const envelope = {
    kind: "receiz.bundle.v1",
    manifest: args.manifest,
    originalBase64: base64UrlEncode(args.originalBytes),
    proofbundle: args.proofbundle
  };
  return textEncoder3.encode(jcsCanonicalize(envelope));
}
function decodeReceizBundleEnvelope(bytes) {
  let parsed;
  try {
    parsed = JSON.parse(textDecoder2.decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed;
  if (obj.kind !== "receiz.bundle.v1") return null;
  const manifest = coerceManifest(obj.manifest);
  if (!manifest) return null;
  if (typeof obj.originalBase64 !== "string") return null;
  const proofbundle = coerceReceizProofBundle(obj.proofbundle);
  if (!proofbundle) return null;
  let originalBytes;
  try {
    originalBytes = base64UrlDecode(obj.originalBase64);
  } catch {
    return null;
  }
  const envelope = {
    kind: "receiz.bundle.v1",
    manifest,
    originalBase64: obj.originalBase64,
    proofbundle
  };
  return { envelope, originalBytes };
}

// app/lib/documentSeal/fileFormat.ts
var PNG_SIGNATURE2 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
var PDF_SIGNATURE = new Uint8Array([37, 80, 68, 70, 45]);
var JPEG_SIGNATURE = new Uint8Array([255, 216, 255]);
var GIF87A_SIGNATURE = new Uint8Array([71, 73, 70, 56, 55, 97]);
var GIF89A_SIGNATURE = new Uint8Array([71, 73, 70, 56, 57, 97]);
var ZIP_SIGNATURE = new Uint8Array([80, 75, 3, 4]);
function startsWithBytes(bytes, signature) {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}
function isWebp(bytes) {
  if (bytes.length < 12) return false;
  return bytes[0] === 82 && // R
  bytes[1] === 73 && // I
  bytes[2] === 70 && // F
  bytes[3] === 70 && // F
  bytes[8] === 87 && // W
  bytes[9] === 69 && // E
  bytes[10] === 66 && // B
  bytes[11] === 80;
}
var HEIC_BRANDS = /* @__PURE__ */ new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
function heicAscii4(bytes, offset) {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}
function isCompleteHeic(bytes) {
  if (bytes.length < 16 || heicAscii4(bytes, 4) !== "ftyp") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  let sawFtyp = false;
  let sawMeta = false;
  let sawMdat = false;
  let hasHeicBrand = false;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return false;
    const size32 = view.getUint32(offset, false);
    const type = heicAscii4(bytes, offset + 4);
    let headerLength = 8;
    let size = size32;
    if (size32 === 0) return false;
    if (size32 === 1) {
      if (offset + 16 > bytes.length) return false;
      const size64 = view.getBigUint64(offset + 8, false);
      if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) return false;
      size = Number(size64);
      headerLength = 16;
    }
    if (size < headerLength || offset + size > bytes.length) return false;
    if (offset === 0) {
      if (type !== "ftyp" || headerLength !== 8 || size < 16 || (size - 16) % 4 !== 0) return false;
      sawFtyp = true;
      hasHeicBrand = HEIC_BRANDS.has(heicAscii4(bytes, offset + 8));
      for (let brandOffset = offset + 16; brandOffset < offset + size; brandOffset += 4) {
        if (HEIC_BRANDS.has(heicAscii4(bytes, brandOffset))) hasHeicBrand = true;
      }
    } else if (type === "ftyp") {
      return false;
    }
    if (type === "meta") sawMeta = true;
    if (type === "mdat") sawMdat = true;
    offset += size;
  }
  return sawFtyp && hasHeicBrand && sawMeta && sawMdat && offset === bytes.length;
}
function extensionFromName(filename) {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const leaf = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const dot = leaf.lastIndexOf(".");
  if (dot <= 0 || dot === leaf.length - 1) return null;
  return leaf.slice(dot + 1).toLowerCase();
}
function detectFromHints(hints) {
  const mime = (hints?.mime ?? "").trim().toLowerCase();
  if (mime === "image/svg+xml") return "svg";
  if (mime === "application/json" || mime.endsWith("+json")) return "json";
  const ext = extensionFromName(hints?.filename ?? "");
  if (ext === "svg") return "svg";
  if (ext === "json") return "json";
  return null;
}
function detectFromTextPrefix(bytes) {
  const sample = bytes.slice(0, Math.min(bytes.length, 4096));
  const raw = new TextDecoder().decode(sample);
  const trimmed = raw.replace(/^\uFEFF/, "").trimStart();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("<svg") || lower.startsWith("<?xml") && lower.includes("<svg")) {
    return "svg";
  }
  if (trimmed.length > 0) {
    const first = trimmed[0];
    if (first === "{" || first === "[") return "json";
  }
  return null;
}
function detectDocumentFormat(bytes, hints) {
  if (startsWithBytes(bytes, PNG_SIGNATURE2)) return "png";
  if (startsWithBytes(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWithBytes(bytes, JPEG_SIGNATURE)) return "jpeg";
  if (isCompleteHeic(bytes)) return "heic";
  if (startsWithBytes(bytes, GIF87A_SIGNATURE) || startsWithBytes(bytes, GIF89A_SIGNATURE)) return "gif";
  if (isWebp(bytes)) return "webp";
  if (startsWithBytes(bytes, ZIP_SIGNATURE)) return "zip";
  const hinted = detectFromHints(hints);
  if (hinted) return hinted;
  const textHint = detectFromTextPrefix(bytes);
  if (textHint) return textHint;
  return "unknown";
}
var RECEIZ_HEIC_PROOF_UUID = new Uint8Array([
  192, 97, 25, 189, 107, 152, 85, 31,
  173, 48, 109, 35, 237, 203, 121, 208
]);
var RECEIZ_HEIC_PROOF_MAGIC = new TextEncoder().encode("receiz.heic.proof.v1\0");
var heicDecoder = new TextDecoder("utf-8", { fatal: true });
function heicBytesEqualAt(bytes, expected, offset) {
  if (offset < 0 || offset + expected.length > bytes.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}
function heicConcat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function parseHeicTopLevelBoxes(bytes) {
  if (bytes.length < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxes = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return null;
    const size32 = view.getUint32(offset, false);
    const type = heicAscii4(bytes, offset + 4);
    let size = size32;
    let headerLength = 8;
    if (size32 === 0) return null;
    if (size32 === 1) {
      if (offset + 16 > bytes.length) return null;
      const size64 = view.getBigUint64(offset + 8, false);
      if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      size = Number(size64);
      headerLength = 16;
    }
    if (size < headerLength || offset + size > bytes.length) return null;
    boxes.push({ start: offset, end: offset + size, type, headerLength });
    offset += size;
  }
  return offset === bytes.length ? boxes : null;
}
function parseHeicProofBox(bytes, box) {
  if (box.type !== "uuid") return null;
  const uuidOffset = box.start + box.headerLength;
  if (!heicBytesEqualAt(bytes, RECEIZ_HEIC_PROOF_UUID, uuidOffset)) return null;
  const magicOffset = uuidOffset + RECEIZ_HEIC_PROOF_UUID.length;
  if (!heicBytesEqualAt(bytes, RECEIZ_HEIC_PROOF_MAGIC, magicOffset)) return { error: "heic_receiz_magic_invalid" };
  const lengthOffset = magicOffset + RECEIZ_HEIC_PROOF_MAGIC.length;
  if (lengthOffset + 4 > box.end) return { error: "heic_receiz_json_length_missing" };
  const jsonLength = new DataView(bytes.buffer, bytes.byteOffset + lengthOffset, 4).getUint32(0, false);
  const jsonOffset = lengthOffset + 4;
  if (jsonOffset + jsonLength !== box.end) return { error: "heic_receiz_json_length_invalid" };
  try {
    const jsonText = heicDecoder.decode(bytes.slice(jsonOffset, box.end));
    const bundle = JSON.parse(jsonText);
    if (jcsCanonicalize(bundle) !== jsonText) return { error: "heic_receiz_json_noncanonical" };
    return { bundle };
  } catch {
    return { error: "heic_receiz_json_invalid" };
  }
}
function parseReceizHeicProof(bytes) {
  const boxes = parseHeicTopLevelBoxes(bytes);
  if (!boxes || boxes.length === 0 || boxes[0]?.type !== "ftyp") {
    return { basisBytes: bytes.slice(), proofCount: 0, bundle: null, parseError: "heic_container_invalid" };
  }
  const basisParts = [];
  let proofCount = 0;
  let bundle = null;
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index];
    const parsed = parseHeicProofBox(bytes, box);
    if (parsed && "error" in parsed) {
      return { basisBytes: bytes.slice(), proofCount, bundle: null, parseError: parsed.error };
    }
    if (parsed) {
      proofCount += 1;
      if (proofCount !== 1) return { basisBytes: bytes.slice(), proofCount, bundle: null, parseError: "heic_receiz_proof_duplicate" };
      if (index !== boxes.length - 1) return { basisBytes: bytes.slice(), proofCount, bundle: null, parseError: "heic_receiz_proof_not_final" };
      bundle = parsed.bundle;
    } else {
      basisParts.push(bytes.slice(box.start, box.end));
    }
  }
  return { basisBytes: heicConcat(basisParts), proofCount, bundle, parseError: null };
}
function appendReceizHeicProof(args) {
  const parsed = parseReceizHeicProof(args.basisBytes);
  if (parsed.parseError) throw new Error(parsed.parseError);
  const jsonBytes = new TextEncoder().encode(jcsCanonicalize(args.bundle));
  const payloadLength = RECEIZ_HEIC_PROOF_UUID.length + RECEIZ_HEIC_PROOF_MAGIC.length + 4 + jsonBytes.length;
  const boxLength = 8 + payloadLength;
  if (boxLength > 4294967295) throw new Error("heic_receiz_proof_too_large");
  const proofBox = new Uint8Array(boxLength);
  const view = new DataView(proofBox.buffer);
  view.setUint32(0, boxLength, false);
  proofBox.set(new TextEncoder().encode("uuid"), 4);
  let offset = 8;
  proofBox.set(RECEIZ_HEIC_PROOF_UUID, offset);
  offset += RECEIZ_HEIC_PROOF_UUID.length;
  proofBox.set(RECEIZ_HEIC_PROOF_MAGIC, offset);
  offset += RECEIZ_HEIC_PROOF_MAGIC.length;
  view.setUint32(offset, jsonBytes.length, false);
  offset += 4;
  proofBox.set(jsonBytes, offset);
  return heicConcat([parsed.basisBytes, proofBox]);
}
var JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION = "jpeg-adobe-xmp-app1-v1";
var JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v2";
var JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v3";
var JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v4";
var JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v5";
var JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION = "jpeg-ios-photos-carrier-v6";
var JPEG_STANDARD_XMP_IDENTIFIER = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0");
var JPEG_EXTENDED_XMP_IDENTIFIER = new TextEncoder().encode("http://ns.adobe.com/xmp/extension/\0");
var JPEG_EXIF_IDENTIFIER = new TextEncoder().encode("Exif\0\0");
var JPEG_PHOTOSHOP_APP13_IDENTIFIER = new TextEncoder().encode("Photoshop 3.0\0");
function jpegStartsWithAt(bytes, prefix, offset) {
  if (offset < 0 || offset + prefix.byteLength > bytes.byteLength) return false;
  for (let index = 0; index < prefix.byteLength; index += 1) {
    if (bytes[offset + index] !== prefix[index]) return false;
  }
  return true;
}
function jpegConcatBasisParts(parts) {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
function isJpegStandaloneMarker(marker) {
  return marker === 1 || marker === 216 || marker === 217 || marker >= 208 && marker <= 215;
}
function isAdobeXmpApp1At(bytes, payloadOffset) {
  return jpegStartsWithAt(bytes, JPEG_STANDARD_XMP_IDENTIFIER, payloadOffset) || jpegStartsWithAt(bytes, JPEG_EXTENDED_XMP_IDENTIFIER, payloadOffset);
}
function jpegBasisBytesEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}
function canonicalizeJpegExifTrailingNullPadding(bytes, markerStart, markerCodeEnd, payloadOffset, segmentEnd) {
  let trailingNullCount = 0;
  for (let index = segmentEnd - 1; index >= payloadOffset && bytes[index] === 0; index -= 1) {
    trailingNullCount += 1;
  }
  if (trailingNullCount <= 2) return bytes.slice(markerStart, segmentEnd);
  const canonicalEnd = segmentEnd - (trailingNullCount - 2);
  const canonicalDeclaredLength = canonicalEnd - markerCodeEnd;
  return jpegConcatBasisParts([
    bytes.slice(markerStart, markerCodeEnd),
    new Uint8Array([canonicalDeclaredLength >>> 8 & 255, canonicalDeclaredLength & 255]),
    bytes.slice(payloadOffset, canonicalEnd)
  ]);
}
var JPEG_TIFF_TYPE_BYTE_LENGTH = /* @__PURE__ */ new Map([
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 4],
  [5, 8],
  [7, 1],
  [9, 4],
  [10, 8],
  [11, 4],
  [12, 8]
]);
var JPEG_TIFF_PRIMARY_IFD_POINTER_TAGS = /* @__PURE__ */ new Set([34665, 34853, 40965]);
var JPEG_PHOTOS_IFD1_TAGS = /* @__PURE__ */ new Set([259, 282, 283, 296, 513, 514]);
var JPEG_APPLE_IOS_MAKER_NOTE_IDENTIFIER = new TextEncoder().encode("Apple iOS\0\0");
var JPEG_APPLE_MAKER_NOTE_ASSET_UUID_TAG = 17;
var JPEG_APPLE_MAKER_NOTE_PHOTOS_ASSET_TOKEN_TAG = 22;
var JPEG_EXIF_BRIGHTNESS_VALUE_TAG = 37379;
var JPEG_GPS_ALTITUDE_TAG = 6;
var JPEG_EXIF_BRIGHTNESS_CANONICAL_SCALE = 1e7;
var JPEG_GPS_ALTITUDE_CANONICAL_SCALE = 1e5;
var JPEG_CANONICAL_APPLE_ASSET_UUID = new TextEncoder().encode("00000000-0000-0000-0000-000000000000\0");
var JPEG_APPLE_PHOTOS_ASSET_TOKEN_PREFIX = new Uint8Array([98, 112, 108, 105, 115, 116, 48, 48, 95, 16, 28]);
var JPEG_APPLE_PHOTOS_ASSET_TOKEN_SUFFIX = new Uint8Array([
  8,
  0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 39
]);
var JPEG_APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH = 28;
var JPEG_APPLE_PHOTOS_ASSET_TOKEN_BYTE_LENGTH = JPEG_APPLE_PHOTOS_ASSET_TOKEN_PREFIX.byteLength + JPEG_APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH + JPEG_APPLE_PHOTOS_ASSET_TOKEN_SUFFIX.byteLength;
var JPEG_CANONICAL_APPLE_PHOTOS_ASSET_TOKEN = jpegConcatBasisParts([
  JPEG_APPLE_PHOTOS_ASSET_TOKEN_PREFIX,
  new TextEncoder().encode("A".repeat(JPEG_APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH)),
  JPEG_APPLE_PHOTOS_ASSET_TOKEN_SUFFIX
]);
function canonicalizeJpegExifAppleMakerNoteAssetIdentifiers(bytes, markerStart, payloadOffset, segmentEnd, includePhotosAssetToken) {
  const tiffOffset = payloadOffset + JPEG_EXIF_IDENTIFIER.byteLength;
  const tiffLength = segmentEnd - tiffOffset;
  if (tiffLength < 8) return null;
  const byteOrder = String.fromCharCode(bytes[tiffOffset] ?? 0, bytes[tiffOffset + 1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, tiffLength);
  const uint16 = (offset) => Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiffLength ? view.getUint16(offset, littleEndian) : null;
  const uint32 = (offset) => Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiffLength ? view.getUint32(offset, littleEndian) : null;
  if (uint16(2) !== 42) return null;
  const findEntry = (ifdOffset, wantedTag) => {
    const count = uint16(ifdOffset);
    if (count === null) return null;
    const tableEnd = ifdOffset + 2 + count * 12 + 4;
    if (!Number.isSafeInteger(tableEnd) || tableEnd > tiffLength) return null;
    let found = null;
    for (let index = 0; index < count; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      if (tag !== wantedTag) continue;
      if (found) return null;
      found = { type, count: entryCount, value };
    }
    return found;
  };
  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const exifPointer = findEntry(ifd0Offset, 34665);
  if (!exifPointer || exifPointer.type !== 4 || exifPointer.count !== 1) return null;
  const makerNoteEntry = findEntry(exifPointer.value, 37500);
  if (!makerNoteEntry || makerNoteEntry.type !== 7 || makerNoteEntry.count < JPEG_APPLE_IOS_MAKER_NOTE_IDENTIFIER.byteLength + 16) {
    return null;
  }
  const makerNoteOffset = makerNoteEntry.value;
  const makerNoteEnd = makerNoteOffset + makerNoteEntry.count;
  if (!Number.isSafeInteger(makerNoteEnd) || makerNoteOffset < 0 || makerNoteEnd > tiffLength || !jpegStartsWithAt(bytes, JPEG_APPLE_IOS_MAKER_NOTE_IDENTIFIER, tiffOffset + makerNoteOffset)) {
    return null;
  }
  const makerNoteByteOrderOffset = makerNoteOffset + JPEG_APPLE_IOS_MAKER_NOTE_IDENTIFIER.byteLength + 1;
  if (bytes[tiffOffset + makerNoteOffset + JPEG_APPLE_IOS_MAKER_NOTE_IDENTIFIER.byteLength] !== 1 || bytes[tiffOffset + makerNoteByteOrderOffset] !== 77 || bytes[tiffOffset + makerNoteByteOrderOffset + 1] !== 77) {
    return null;
  }
  const makerView = new DataView(
    bytes.buffer,
    bytes.byteOffset + tiffOffset + makerNoteOffset,
    makerNoteEntry.count
  );
  const makerIfdOffset = makerNoteByteOrderOffset + 2 - makerNoteOffset;
  if (makerIfdOffset + 2 > makerNoteEntry.count) return null;
  const makerEntryCount = makerView.getUint16(makerIfdOffset, false);
  const makerTableEnd = makerIfdOffset + 2 + makerEntryCount * 12 + 4;
  if (!Number.isSafeInteger(makerTableEnd) || makerTableEnd > makerNoteEntry.count) return null;
  let assetUuidOffset = null;
  let photosAssetTokenOffset = null;
  for (let index = 0; index < makerEntryCount; index += 1) {
    const entryOffset = makerIfdOffset + 2 + index * 12;
    const tag = makerView.getUint16(entryOffset, false);
    const type = makerView.getUint16(entryOffset + 2, false);
    const count = makerView.getUint32(entryOffset + 4, false);
    const value = makerView.getUint32(entryOffset + 8, false);
    if (tag === JPEG_APPLE_MAKER_NOTE_ASSET_UUID_TAG) {
      if (assetUuidOffset !== null) return null;
      if (type !== 2 || count !== JPEG_CANONICAL_APPLE_ASSET_UUID.byteLength || value < makerTableEnd || value + count > makerNoteEntry.count) {
        return null;
      }
      assetUuidOffset = value;
      continue;
    }
    if (includePhotosAssetToken && tag === JPEG_APPLE_MAKER_NOTE_PHOTOS_ASSET_TOKEN_TAG) {
      if (photosAssetTokenOffset !== null) return null;
      if (type !== 7 || count !== JPEG_APPLE_PHOTOS_ASSET_TOKEN_BYTE_LENGTH || value < makerTableEnd || value + count > makerNoteEntry.count) {
        return null;
      }
      photosAssetTokenOffset = value;
    }
  }
  if (assetUuidOffset === null && photosAssetTokenOffset === null) return null;
  if (assetUuidOffset !== null) {
    const uuidBytes = bytes.slice(
      tiffOffset + makerNoteOffset + assetUuidOffset,
      tiffOffset + makerNoteOffset + assetUuidOffset + JPEG_CANONICAL_APPLE_ASSET_UUID.byteLength
    );
    const uuidText = new TextDecoder("ascii").decode(uuidBytes.slice(0, -1));
    if (uuidBytes[uuidBytes.byteLength - 1] !== 0 || !/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(uuidText)) {
      return null;
    }
  }
  if (photosAssetTokenOffset !== null) {
    const tokenBytes = bytes.slice(
      tiffOffset + makerNoteOffset + photosAssetTokenOffset,
      tiffOffset + makerNoteOffset + photosAssetTokenOffset + JPEG_APPLE_PHOTOS_ASSET_TOKEN_BYTE_LENGTH
    );
    const tokenTextStart = JPEG_APPLE_PHOTOS_ASSET_TOKEN_PREFIX.byteLength;
    const tokenTextEnd = tokenTextStart + JPEG_APPLE_PHOTOS_ASSET_TOKEN_TEXT_LENGTH;
    const tokenText = new TextDecoder("ascii").decode(tokenBytes.slice(tokenTextStart, tokenTextEnd));
    if (!jpegStartsWithAt(tokenBytes, JPEG_APPLE_PHOTOS_ASSET_TOKEN_PREFIX, 0) || !jpegBasisBytesEqual(tokenBytes.slice(tokenTextEnd), JPEG_APPLE_PHOTOS_ASSET_TOKEN_SUFFIX) || !/^[A-Za-z0-9+/]{28}$/.test(tokenText)) {
      return null;
    }
  }
  const canonical = bytes.slice(markerStart, segmentEnd);
  if (assetUuidOffset !== null) {
    const canonicalUuidOffset = tiffOffset + makerNoteOffset + assetUuidOffset - markerStart;
    canonical.set(JPEG_CANONICAL_APPLE_ASSET_UUID, canonicalUuidOffset);
  }
  if (photosAssetTokenOffset !== null) {
    const canonicalTokenOffset = tiffOffset + makerNoteOffset + photosAssetTokenOffset - markerStart;
    canonical.set(JPEG_CANONICAL_APPLE_PHOTOS_ASSET_TOKEN, canonicalTokenOffset);
  }
  return canonical;
}
function canonicalizeJpegExifIosPhotosReserializedRationals(bytes, markerStart, payloadOffset, segmentEnd) {
  const tiffOffset = payloadOffset + JPEG_EXIF_IDENTIFIER.byteLength;
  const tiffLength = segmentEnd - tiffOffset;
  if (tiffLength < 8) return null;
  const byteOrder = String.fromCharCode(bytes[tiffOffset] ?? 0, bytes[tiffOffset + 1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, tiffLength);
  const uint16 = (offset) => Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiffLength ? view.getUint16(offset, littleEndian) : null;
  const uint32 = (offset) => Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiffLength ? view.getUint32(offset, littleEndian) : null;
  if (uint16(2) !== 42) return null;
  const findEntry = (ifdOffset, wantedTag) => {
    const count = uint16(ifdOffset);
    if (count === null) return null;
    const tableEnd = ifdOffset + 2 + count * 12 + 4;
    if (!Number.isSafeInteger(tableEnd) || tableEnd > tiffLength) return null;
    let found;
    for (let index = 0; index < count; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      if (tag !== wantedTag) continue;
      if (found) return null;
      found = { type, count: entryCount, value, tableEnd };
    }
    return found;
  };
  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const exifPointer = findEntry(ifd0Offset, 34665);
  const gpsPointer = findEntry(ifd0Offset, 34853);
  if (exifPointer === null || gpsPointer === null) return null;
  if (exifPointer && (exifPointer.type !== 4 || exifPointer.count !== 1)) return null;
  if (gpsPointer && (gpsPointer.type !== 4 || gpsPointer.count !== 1)) return null;
  const brightness = exifPointer ? findEntry(exifPointer.value, JPEG_EXIF_BRIGHTNESS_VALUE_TAG) : void 0;
  const altitude = gpsPointer ? findEntry(gpsPointer.value, JPEG_GPS_ALTITUDE_TAG) : void 0;
  if (brightness === null || altitude === null) return null;
  if (!brightness && !altitude) return null;
  const canonical = bytes.slice(markerStart, segmentEnd);
  const canonicalView = new DataView(canonical.buffer, canonical.byteOffset, canonical.byteLength);
  if (brightness) {
    if (brightness.type !== 10 || brightness.count !== 1 || brightness.value < brightness.tableEnd || brightness.value + 8 > tiffLength) {
      return null;
    }
    const numerator = view.getInt32(brightness.value, littleEndian);
    const denominator = view.getInt32(brightness.value + 4, littleEndian);
    if (denominator <= 0) return null;
    const canonicalNumerator = Math.round(numerator / denominator * JPEG_EXIF_BRIGHTNESS_CANONICAL_SCALE);
    if (!Number.isSafeInteger(canonicalNumerator) || canonicalNumerator < -2147483648 || canonicalNumerator > 2147483647) {
      return null;
    }
    const valueOffset = tiffOffset + brightness.value - markerStart;
    canonicalView.setInt32(valueOffset, canonicalNumerator, littleEndian);
    canonicalView.setInt32(valueOffset + 4, JPEG_EXIF_BRIGHTNESS_CANONICAL_SCALE, littleEndian);
  }
  if (altitude) {
    if (altitude.type !== 5 || altitude.count !== 1 || altitude.value < altitude.tableEnd || altitude.value + 8 > tiffLength) {
      return null;
    }
    const numerator = view.getUint32(altitude.value, littleEndian);
    const denominator = view.getUint32(altitude.value + 4, littleEndian);
    if (denominator === 0) return null;
    const canonicalNumerator = Math.round(numerator / denominator * JPEG_GPS_ALTITUDE_CANONICAL_SCALE);
    if (!Number.isSafeInteger(canonicalNumerator) || canonicalNumerator < 0 || canonicalNumerator > 4294967295) {
      return null;
    }
    const valueOffset = tiffOffset + altitude.value - markerStart;
    canonicalView.setUint32(valueOffset, canonicalNumerator, littleEndian);
    canonicalView.setUint32(valueOffset + 4, JPEG_GPS_ALTITUDE_CANONICAL_SCALE, littleEndian);
  }
  return canonical;
}
function canonicalizeJpegExifPhotosIfd1(bytes, markerStart, markerCodeEnd, payloadOffset, segmentEnd) {
  const tiffOffset = payloadOffset + JPEG_EXIF_IDENTIFIER.byteLength;
  const tiffLength = segmentEnd - tiffOffset;
  if (tiffLength < 8) return null;
  const byteOrder = String.fromCharCode(bytes[tiffOffset] ?? 0, bytes[tiffOffset + 1] ?? 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffOffset, tiffLength);
  const uint16 = (offset) => Number.isSafeInteger(offset) && offset >= 0 && offset + 2 <= tiffLength ? view.getUint16(offset, littleEndian) : null;
  const uint32 = (offset) => Number.isSafeInteger(offset) && offset >= 0 && offset + 4 <= tiffLength ? view.getUint32(offset, littleEndian) : null;
  if (uint16(2) !== 42) return null;
  const parseIfd = (offset) => {
    const count = uint16(offset);
    if (count === null) return null;
    const tableEnd = offset + 2 + count * 12 + 4;
    if (!Number.isSafeInteger(tableEnd) || tableEnd > tiffLength) return null;
    const entries = [];
    let referencedEnd = tableEnd;
    for (let index = 0; index < count; index += 1) {
      const entryOffset = offset + 2 + index * 12;
      const tag = uint16(entryOffset);
      const type = uint16(entryOffset + 2);
      const entryCount = uint32(entryOffset + 4);
      const value = uint32(entryOffset + 8);
      if (tag === null || type === null || entryCount === null || value === null) return null;
      const unitLength = JPEG_TIFF_TYPE_BYTE_LENGTH.get(type);
      if (!unitLength) return null;
      const valueByteLength = unitLength * entryCount;
      if (!Number.isSafeInteger(valueByteLength)) return null;
      const valueOffset = valueByteLength > 4 ? value : null;
      if (valueOffset !== null) {
        const valueEnd = valueOffset + valueByteLength;
        if (!Number.isSafeInteger(valueEnd) || valueOffset < 0 || valueEnd > tiffLength) return null;
        referencedEnd = Math.max(referencedEnd, valueEnd);
      }
      entries.push({ tag, type, count: entryCount, value, valueByteLength, valueOffset });
    }
    const nextIfdOffset = uint32(tableEnd - 4);
    if (nextIfdOffset === null) return null;
    return { entries, nextIfdOffset, tableEnd, referencedEnd };
  };
  const ifd0Offset = uint32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const ifd0 = parseIfd(ifd0Offset);
  if (!ifd0 || ifd0.nextIfdOffset === 0) return null;
  let primaryReferencedEnd = ifd0.referencedEnd;
  const visited = /* @__PURE__ */ new Set([ifd0Offset]);
  const pending = ifd0.entries.filter((entry) => JPEG_TIFF_PRIMARY_IFD_POINTER_TAGS.has(entry.tag) && entry.type === 4 && entry.count === 1).map((entry) => entry.value);
  while (pending.length > 0) {
    const childOffset = pending.pop() ?? 0;
    if (childOffset === 0 || visited.has(childOffset)) return null;
    visited.add(childOffset);
    const child = parseIfd(childOffset);
    if (!child || child.nextIfdOffset !== 0) return null;
    primaryReferencedEnd = Math.max(primaryReferencedEnd, child.referencedEnd);
    for (const entry of child.entries) {
      if (JPEG_TIFF_PRIMARY_IFD_POINTER_TAGS.has(entry.tag) && entry.type === 4 && entry.count === 1) {
        pending.push(entry.value);
      }
    }
  }
  const ifd1Offset = ifd0.nextIfdOffset;
  const ifd1 = parseIfd(ifd1Offset);
  if (!ifd1 || ifd1.nextIfdOffset !== 0 || ifd1.entries.length !== JPEG_PHOTOS_IFD1_TAGS.size) return null;
  if (ifd1Offset < primaryReferencedEnd) return null;
  for (let offset = primaryReferencedEnd; offset < ifd1Offset; offset += 1) {
    if (bytes[tiffOffset + offset] !== 0) return null;
  }
  const byTag = new Map(ifd1.entries.map((entry) => [entry.tag, entry]));
  if (byTag.size !== JPEG_PHOTOS_IFD1_TAGS.size) return null;
  for (const tag of JPEG_PHOTOS_IFD1_TAGS) {
    if (!byTag.has(tag)) return null;
  }
  const compression = byTag.get(259);
  const xResolution = byTag.get(282);
  const yResolution = byTag.get(283);
  const resolutionUnit = byTag.get(296);
  const previewOffsetEntry = byTag.get(513);
  const previewLengthEntry = byTag.get(514);
  if (!compression || compression.type !== 3 || compression.count !== 1 || compression.value >>> 16 !== (littleEndian ? 0 : 6) || (littleEndian ? compression.value & 65535 : compression.value >>> 16) !== 6 || !xResolution || xResolution.type !== 5 || xResolution.count !== 1 || xResolution.valueOffset === null || !yResolution || yResolution.type !== 5 || yResolution.count !== 1 || yResolution.valueOffset === null || !resolutionUnit || resolutionUnit.type !== 3 || resolutionUnit.count !== 1 || !previewOffsetEntry || previewOffsetEntry.type !== 4 || previewOffsetEntry.count !== 1 || !previewLengthEntry || previewLengthEntry.type !== 4 || previewLengthEntry.count !== 1) {
    return null;
  }
  const previewOffset = previewOffsetEntry.value;
  const previewLength = previewLengthEntry.value;
  const previewEnd = previewOffset + previewLength;
  if (xResolution.valueOffset !== ifd1.tableEnd || yResolution.valueOffset !== xResolution.valueOffset + 8 || previewOffset !== yResolution.valueOffset + 8 || !Number.isSafeInteger(previewEnd) || previewLength < 4 || previewEnd > tiffLength || bytes[tiffOffset + previewOffset] !== 255 || bytes[tiffOffset + previewOffset + 1] !== 216 || bytes[tiffOffset + previewEnd - 2] !== 255 || bytes[tiffOffset + previewEnd - 1] !== 217) {
    return null;
  }
  for (let offset = previewEnd; offset < tiffLength; offset += 1) {
    if (bytes[tiffOffset + offset] !== 0) return null;
  }
  let canonicalPrefix = bytes.slice(markerStart, tiffOffset + ifd1Offset);
  const nextIfdPointerOffset = tiffOffset + ifd0.tableEnd - 4 - markerStart;
  canonicalPrefix.fill(0, nextIfdPointerOffset, nextIfdPointerOffset + 4);
  let trailingNullCount = 0;
  for (let offset = canonicalPrefix.byteLength - 1; offset >= payloadOffset - markerStart && canonicalPrefix[offset] === 0; offset -= 1) {
    trailingNullCount += 1;
  }
  if (trailingNullCount > 2) {
    canonicalPrefix = canonicalPrefix.slice(0, canonicalPrefix.byteLength - (trailingNullCount - 2));
  }
  const canonical = canonicalPrefix;
  const canonicalDeclaredLength = canonical.byteLength - (markerCodeEnd - markerStart);
  canonical[markerCodeEnd - markerStart] = canonicalDeclaredLength >>> 8 & 255;
  canonical[markerCodeEnd - markerStart + 1] = canonicalDeclaredLength & 255;
  return canonical;
}
function normalizeJpegCarrierBasis(bytes, normalization) {
  if (bytes.byteLength < 4 || bytes[0] !== 255 || bytes[1] !== 216) {
    throw new Error("jpeg_soi_missing");
  }
  const keptParts = [bytes.slice(0, 2)];
  const photoshopApp13Segments = [];
  let offset = 2;
  let inScan = false;
  let sawSos = false;
  let sawEoi = false;
  const isIosPhotosCarrier = normalization === JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION;
  while (offset < bytes.byteLength) {
    if (inScan) {
      const scanStart = offset;
      while (offset < bytes.byteLength) {
        if (bytes[offset] !== 255) {
          offset += 1;
          continue;
        }
        if (offset + 1 >= bytes.byteLength) throw new Error("jpeg_scan_truncated");
        const next = bytes[offset + 1];
        if (next === 0 || next === 255 || next >= 208 && next <= 215) {
          offset += 2;
          continue;
        }
        break;
      }
      keptParts.push(bytes.slice(scanStart, offset));
      inScan = false;
      continue;
    }
    const markerStart = offset;
    if (bytes[offset] !== 255) throw new Error("jpeg_marker_missing");
    while (offset < bytes.byteLength && bytes[offset] === 255) offset += 1;
    if (offset >= bytes.byteLength) throw new Error("jpeg_marker_truncated");
    const marker = bytes[offset];
    offset += 1;
    const markerCodeEnd = offset;
    if (marker === 0) throw new Error("jpeg_marker_invalid");
    if (isJpegStandaloneMarker(marker)) {
      keptParts.push(bytes.slice(markerStart, offset));
      if (marker === 217) {
        sawEoi = true;
        if (offset < bytes.byteLength) keptParts.push(bytes.slice(offset));
        offset = bytes.byteLength;
      }
      continue;
    }
    if (offset + 2 > bytes.byteLength) throw new Error("jpeg_segment_length_missing");
    const declaredLength = bytes[offset] << 8 | bytes[offset + 1];
    if (declaredLength < 2) throw new Error("jpeg_segment_length_invalid");
    const segmentEnd = offset + declaredLength;
    if (segmentEnd > bytes.byteLength) throw new Error("jpeg_segment_truncated");
    const payloadOffset = offset + 2;
    if (marker === 225 && isAdobeXmpApp1At(bytes, payloadOffset)) {
      // Adobe XMP is a non-authoritative carrier append in both versions.
    } else if (
      isIosPhotosCarrier
      && marker === 225
      && jpegStartsWithAt(bytes, JPEG_EXIF_IDENTIFIER, payloadOffset)
    ) {
      const makerNoteCanonical = normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION ? canonicalizeJpegExifAppleMakerNoteAssetIdentifiers(bytes, markerStart, payloadOffset, segmentEnd, normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION) : null;
      const makerNoteSource = makerNoteCanonical ? (() => {
        const copy = bytes.slice();
        copy.set(makerNoteCanonical, markerStart);
        return copy;
      })() : bytes;
      const reserializedRationalsCanonical = normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION ? canonicalizeJpegExifIosPhotosReserializedRationals(makerNoteSource, markerStart, payloadOffset, segmentEnd) : null;
      const ifd1Source = reserializedRationalsCanonical ? (() => {
        const copy = makerNoteSource.slice();
        copy.set(reserializedRationalsCanonical, markerStart);
        return copy;
      })() : makerNoteSource;
      const v3Ifd1Canonical = normalization === JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION || normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION ? canonicalizeJpegExifPhotosIfd1(ifd1Source, markerStart, markerCodeEnd, payloadOffset, segmentEnd) : null;
      keptParts.push(v3Ifd1Canonical ?? reserializedRationalsCanonical ?? makerNoteCanonical ?? canonicalizeJpegExifTrailingNullPadding(
          bytes,
          markerStart,
          markerCodeEnd,
          payloadOffset,
          segmentEnd
        ));
    } else if (
      isIosPhotosCarrier
      && marker === 237
      && jpegStartsWithAt(bytes, JPEG_PHOTOSHOP_APP13_IDENTIFIER, payloadOffset)
    ) {
      const segmentBytes = bytes.slice(markerStart, segmentEnd);
      if (!photoshopApp13Segments.some((prior) => jpegBasisBytesEqual(prior, segmentBytes))) {
        photoshopApp13Segments.push(segmentBytes);
        keptParts.push(segmentBytes);
      }
    } else {
      keptParts.push(bytes.slice(markerStart, segmentEnd));
    }
    offset = segmentEnd;
    if (marker === 218) {
      sawSos = true;
      inScan = true;
    }
  }
  if (!sawSos) throw new Error("jpeg_sos_missing");
  if (!sawEoi) throw new Error("jpeg_eoi_missing");
  return jpegConcatBasisParts(keptParts);
}
function normalizeJpegAdobeXmpApp1Basis(bytes) {
  return normalizeJpegCarrierBasis(bytes, JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION);
}
function normalizeJpegIosPhotosCarrierV2Basis(bytes) {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION);
}
function normalizeJpegIosPhotosCarrierV3Basis(bytes) {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION);
}
function normalizeJpegIosPhotosCarrierV4Basis(bytes) {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION);
}
function normalizeJpegIosPhotosCarrierV5Basis(bytes) {
  return normalizeJpegCarrierBasis(bytes, JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION);
}
function transformReceizIosPwaCameraRollV6(bytes) {
  const starts = (source, prefix, offset) => {
    if (offset < 0 || offset + prefix.byteLength > source.byteLength) return false;
    for (let index = 0; index < prefix.byteLength; index += 1) {
      if (source[offset + index] !== prefix[index]) return false;
    }
    return true;
  };
  const join = (parts) => {
    const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.byteLength;
    }
    return out;
  };
  const exifId = new TextEncoder().encode("Exif\0\0");
  const photoshopId = new TextEncoder().encode("Photoshop 3.0\0");
  const parts = [bytes.slice(0, 2)];
  let offset = 2;
  let app2Index = -1;
  let photoshopIndex = -1;
  let exifIndex = -1;
  while (offset + 3 < bytes.byteLength) {
    if (bytes[offset] !== 255) return null;
    const marker = bytes[offset + 1];
    if (marker === 218 || marker === 217) break;
    const standalone = marker === 1 || (marker >= 208 && marker <= 217);
    if (standalone) {
      parts.push(bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const end = offset + 2 + length;
    if (length < 2 || end > bytes.byteLength) return null;
    parts.push(bytes.slice(offset, end));
    const index = parts.length - 1;
    if (marker === 226) {
      if (app2Index !== -1) return null;
      app2Index = index;
    }
    if (marker === 237 && starts(bytes, photoshopId, offset + 4)) {
      if (photoshopIndex !== -1) return null;
      photoshopIndex = index;
    }
    if (marker === 225 && starts(bytes, exifId, offset + 4)) {
      if (exifIndex !== -1) return null;
      exifIndex = index;
    }
    offset = end;
  }
  if (
    photoshopIndex < 0
    || (app2Index >= 0 && photoshopIndex <= app2Index)
    || exifIndex < 0
    || offset + 1 >= bytes.byteLength
    || bytes[offset] !== 255
    || bytes[offset + 1] !== 218
  ) {
    return null;
  }

  const segment = parts[exifIndex];
  const tiffOffset = 10;
  const tiff = segment.slice(tiffOffset);
  const byteOrder = String.fromCharCode(tiff[0] || 0, tiff[1] || 0);
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const little = byteOrder === "II";
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const u16 = (at) => (
    Number.isSafeInteger(at) && at >= 0 && at + 2 <= tiff.byteLength
      ? view.getUint16(at, little)
      : null
  );
  const u32 = (at) => (
    Number.isSafeInteger(at) && at >= 0 && at + 4 <= tiff.byteLength
      ? view.getUint32(at, little)
      : null
  );
  if (u16(2) !== 42) return null;
  const typeLengths = new Map([
    [1, 1], [2, 1], [3, 2], [4, 4], [5, 8], [7, 1],
    [9, 4], [10, 8], [11, 4], [12, 8],
  ]);
  const parseIfd = (at) => {
    const count = u16(at);
    if (count === null) return null;
    const nextPointerOffset = at + 2 + count * 12;
    if (nextPointerOffset + 4 > tiff.byteLength) return null;
    const entries = [];
    for (let index = 0; index < count; index += 1) {
      const entryOffset = at + 2 + index * 12;
      const tag = u16(entryOffset);
      const type = u16(entryOffset + 2);
      const entryCount = u32(entryOffset + 4);
      const value = u32(entryOffset + 8);
      const unitLength = typeLengths.get(type);
      if (
        tag === null
        || type === null
        || entryCount === null
        || value === null
        || !unitLength
      ) {
        return null;
      }
      const valueByteLength = unitLength * entryCount;
      if (!Number.isSafeInteger(valueByteLength)) return null;
      const valueOffset = valueByteLength > 4 ? value : null;
      if (
        valueOffset !== null
        && (valueOffset < nextPointerOffset + 4 || valueOffset + valueByteLength > tiff.byteLength)
      ) {
        return null;
      }
      entries.push({ tag, type, count: entryCount, value, valueByteLength, valueOffset, entryOffset });
    }
    const nextIfdOffset = u32(nextPointerOffset);
    return nextIfdOffset === null
      ? null
      : { offset: at, entries, nextPointerOffset, nextIfdOffset };
  };
  const unique = (ifd, tag) => {
    const matches = ifd.entries.filter((entry) => entry.tag === tag);
    return matches.length === 1 ? matches[0] : null;
  };
  const ifd0Offset = u32(4);
  if (ifd0Offset === null || ifd0Offset < 8) return null;
  const ifd0 = parseIfd(ifd0Offset);
  if (!ifd0 || ifd0.nextIfdOffset === 0) return null;
  const exifPointer = unique(ifd0, 34665);
  const ycbcr = unique(ifd0, 531);
  if (
    !exifPointer
    || exifPointer.type !== 4
    || exifPointer.count !== 1
    || !ycbcr
    || ycbcr.type !== 3
    || ycbcr.count !== 1
    || view.getUint16(ycbcr.entryOffset + 8, little) !== 1
  ) {
    return null;
  }
  const exif = parseIfd(exifPointer.value);
  if (!exif || exif.nextIfdOffset !== 0) return null;
  const expected = new Map([
    [36864, [7, 4, [48, 50, 50, 49]]],
    [37121, [7, 4, [1, 2, 3, 0]]],
    [40960, [7, 4, [48, 49, 48, 48]]],
    [41990, [3, 1, [0, 0]]],
  ]);
  const removed = [ycbcr.entryOffset];
  for (const [tag, rule] of expected) {
    const entry = unique(exif, tag);
    if (!entry || entry.type !== rule[0] || entry.count !== rule[1]) return null;
    const inline = Array.from(tiff.slice(entry.entryOffset + 8, entry.entryOffset + 8 + rule[2].length));
    if (inline.some((value, index) => value !== rule[2][index])) return null;
    removed.push(entry.entryOffset);
  }
  removed.sort((left, right) => left - right);
  const removedSet = new Set(removed);
  const translate = (oldOffset) => (
    oldOffset - removed.filter((deleted) => deleted < oldOffset).length * 12
  );
  const primaryEnd = ifd0.nextIfdOffset;
  let cursor = 0;
  const tiffParts = [];
  for (const deleted of removed) {
    if (deleted < cursor || deleted + 12 > primaryEnd) return null;
    tiffParts.push(tiff.slice(cursor, deleted));
    cursor = deleted + 12;
  }
  tiffParts.push(tiff.slice(cursor, primaryEnd));
  let canonicalTiff = join(tiffParts);
  const canonicalView = new DataView(
    canonicalTiff.buffer,
    canonicalTiff.byteOffset,
    canonicalTiff.byteLength,
  );
  canonicalView.setUint32(4, translate(ifd0Offset), little);
  for (const ifd of [ifd0, exif]) {
    const kept = ifd.entries.filter((entry) => !removedSet.has(entry.entryOffset));
    canonicalView.setUint16(translate(ifd.offset), kept.length, little);
    for (const entry of kept) {
      if ((entry.tag === 34665 && entry.type === 4 && entry.count === 1) || entry.valueOffset !== null) {
        canonicalView.setUint32(translate(entry.entryOffset) + 8, translate(entry.value), little);
      }
    }
    canonicalView.setUint32(translate(ifd.nextPointerOffset), 0, little);
  }
  let trailingNulls = 0;
  for (let index = canonicalTiff.byteLength - 1; index >= 0 && canonicalTiff[index] === 0; index -= 1) {
    trailingNulls += 1;
  }
  if (trailingNulls > 2) {
    canonicalTiff = canonicalTiff.slice(0, canonicalTiff.byteLength - (trailingNulls - 2));
  }
  const canonicalExif = join([
    segment.slice(0, 2),
    new Uint8Array([0, 0]),
    segment.slice(4, tiffOffset),
    canonicalTiff,
  ]);
  const declaredLength = canonicalExif.byteLength - 2;
  canonicalExif[2] = (declaredLength >>> 8) & 255;
  canonicalExif[3] = declaredLength & 255;
  parts[exifIndex] = canonicalExif;
  if (app2Index >= 0) {
    const photoshop = parts.splice(photoshopIndex, 1)[0];
    parts.splice(app2Index, 0, photoshop);
  }
  return join([...parts, bytes.slice(offset)]);
}
function normalizeJpegIosPhotosCarrierV6Basis(bytes) {
  const cameraRollProjection = transformReceizIosPwaCameraRollV6(bytes);
  return normalizeJpegCarrierBasis(
    cameraRollProjection || bytes,
    JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION,
  );
}
async function artifactIdentityBasisBytes(bundle, basisBytes) {
  const declaration = bundle.artifactBasis;
  if (typeof declaration === "undefined") return basisBytes;
  if (declaration.algorithm !== "sha256") {
    throw new Error("Artifact basis normalization is unsupported.");
  }
  if (detectDocumentFormat(basisBytes, {}) !== "jpeg") {
    throw new Error("JPEG artifact basis normalization requires a JPEG proof object.");
  }
  if (declaration.normalization === JPEG_ADOBE_XMP_APP1_BASIS_NORMALIZATION) {
    return normalizeJpegAdobeXmpApp1Basis(basisBytes);
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V2_BASIS_NORMALIZATION) {
    return normalizeJpegIosPhotosCarrierV2Basis(basisBytes);
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V3_BASIS_NORMALIZATION) {
    return normalizeJpegIosPhotosCarrierV3Basis(basisBytes);
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V4_BASIS_NORMALIZATION) {
    return normalizeJpegIosPhotosCarrierV4Basis(basisBytes);
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V5_BASIS_NORMALIZATION) {
    return normalizeJpegIosPhotosCarrierV5Basis(basisBytes);
  }
  if (declaration.normalization === JPEG_IOS_PHOTOS_CARRIER_V6_BASIS_NORMALIZATION) {
    return normalizeJpegIosPhotosCarrierV6Basis(basisBytes);
  }
  throw new Error("Artifact basis normalization is unsupported.");
}

// app/lib/security/documentLimits.ts
var MEBIBYTE = 1024 * 1024;
var MAX_ENV_LIMIT = 2 * 1024 * 1024 * 1024;
var DEFAULT_UPLOAD_LIMIT_BYTES = 500 * MEBIBYTE;
function envInt(name, fallback, min = 1) {
  const environment = typeof process !== "undefined" && process?.env ? process.env : {};
  const raw = environment[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(Math.trunc(parsed), MAX_ENV_LIMIT);
}
var DOCUMENT_SEAL_MAX_UPLOAD_BYTES = envInt("RECEIZ_DOCUMENT_SEAL_MAX_UPLOAD_BYTES", DEFAULT_UPLOAD_LIMIT_BYTES);
var DOCUMENT_VERIFY_MAX_UPLOAD_BYTES = envInt("RECEIZ_DOCUMENT_VERIFY_MAX_UPLOAD_BYTES", DEFAULT_UPLOAD_LIMIT_BYTES);
var DOCUMENT_MULTIPART_OVERHEAD_BYTES = envInt("RECEIZ_DOCUMENT_MULTIPART_OVERHEAD_BYTES", 2 * MEBIBYTE);
var DOCUMENT_VERIFY_OPTIONAL_LINK_MAX_CHARS = envInt("RECEIZ_DOCUMENT_VERIFY_OPTIONAL_LINK_MAX_CHARS", 2048);
var DOCUMENT_VERIFY_ZIP_MAX_ENTRIES = envInt("RECEIZ_DOCUMENT_VERIFY_ZIP_MAX_ENTRIES", 5e3);
var DOCUMENT_VERIFY_ZIP_MAX_ENTRY_UNCOMPRESSED_BYTES = envInt(
  "RECEIZ_DOCUMENT_VERIFY_ZIP_MAX_ENTRY_UNCOMPRESSED_BYTES",
  1024 * MEBIBYTE
);
var DOCUMENT_VERIFY_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = envInt(
  "RECEIZ_DOCUMENT_VERIFY_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES",
  2 * 1024 * MEBIBYTE
);
var DOCUMENT_VERIFY_SERVER_ZIP_GUARD_LIMITS = {
  maxEntries: DOCUMENT_VERIFY_ZIP_MAX_ENTRIES,
  maxEntryUncompressedBytes: DOCUMENT_VERIFY_ZIP_MAX_ENTRY_UNCOMPRESSED_BYTES,
  maxTotalUncompressedBytes: DOCUMENT_VERIFY_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES
};

// app/lib/security/cspNonce.ts
var CSP_NONCE_META_NAME = "receiz-csp-nonce";
function readCspNonceFromDocument(doc = typeof document === "undefined" ? null : document) {
  if (!doc) return null;
  const meta = doc.head.querySelector(`meta[name="${CSP_NONCE_META_NAME}"]`);
  const nonce = meta?.content?.trim() ?? "";
  return nonce || null;
}
function applyCspNonce(element, doc) {
  const nonce = readCspNonceFromDocument(doc);
  if (nonce) {
    element.nonce = nonce;
  }
  return element;
}

// app/lib/documentSeal/folderPackageManifest.ts
var HEX64_RE3 = /^[0-9a-f]{64}$/;
function asNonEmptyString3(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function asInt2(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}
function asHex643(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return HEX64_RE3.test(normalized) ? normalized : null;
}
function normalizePath(rawPath) {
  const trimmed = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = trimmed.split("/").map((part) => part.trim()).filter((part) => part.length > 0 && part !== "." && part !== "..");
  return parts.join("/");
}
function coerceEntry(value) {
  if (!value || typeof value !== "object") return null;
  const row = value;
  const sourcePathRaw = asNonEmptyString3(row.sourcePath);
  const sealedPathRaw = asNonEmptyString3(row.sealedPath);
  const sealedFilename = asNonEmptyString3(row.sealedFilename);
  const sealedKind = asNonEmptyString3(row.sealedKind);
  const sealedContentType = asNonEmptyString3(row.sealedContentType);
  const sealedSize = asInt2(row.sealedSize);
  const sealedSha256 = asHex643(row.sealedSha256);
  const basisSha256 = asHex643(row.basisSha256);
  const verifyPath = asNonEmptyString3(row.verifyPath);
  const code = asNonEmptyString3(row.code);
  const pulse = asNonEmptyString3(row.pulse);
  const ts = asNonEmptyString3(row.ts);
  if (!sourcePathRaw || !sealedPathRaw || !sealedFilename || !sealedKind || !sealedContentType || sealedSize === null || sealedSize < 0 || !sealedSha256 || !basisSha256 || !verifyPath || !code || !pulse || !ts) {
    return null;
  }
  const sourcePath = normalizePath(sourcePathRaw);
  const sealedPath = normalizePath(sealedPathRaw);
  if (!sourcePath || !sealedPath) return null;
  return {
    sourcePath,
    sealedPath,
    sealedFilename,
    sealedKind,
    sealedContentType,
    sealedSize,
    sealedSha256,
    basisSha256,
    verifyPath,
    code,
    pulse,
    ts,
    ...typeof row.note === "string" && row.note.trim().length > 0 ? { note: row.note.trim() } : {}
  };
}
function normalizeReceizFolderPackagePath(rawPath) {
  return normalizePath(rawPath);
}
function coerceReceizFolderPackageManifest(value) {
  if (!value || typeof value !== "object") return null;
  const row = value;
  if (row.kind !== "receiz.folder.manifest.v1") return null;
  if (row.version !== 1) return null;
  const createdAt = asNonEmptyString3(row.createdAt);
  const itemCount = asInt2(row.itemCount);
  if (!createdAt || itemCount === null || itemCount < 0) return null;
  if (!Array.isArray(row.entries)) return null;
  const entries = [];
  const seenSealedPaths = /* @__PURE__ */ new Set();
  for (const rawEntry of row.entries) {
    const entry = coerceEntry(rawEntry);
    if (!entry) return null;
    if (seenSealedPaths.has(entry.sealedPath)) return null;
    seenSealedPaths.add(entry.sealedPath);
    entries.push(entry);
  }
  if (entries.length !== itemCount) return null;
  return {
    kind: "receiz.folder.manifest.v1",
    version: 1,
    createdAt,
    itemCount,
    entries
  };
}

// app/lib/documentSeal/packageRootManifest.ts
var HEX64_RE4 = /^[0-9a-f]{64}$/;
function asNonEmptyString4(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function asInt3(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}
function asHex644(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return HEX64_RE4.test(normalized) ? normalized : null;
}
function coerceEntry2(value) {
  if (!value || typeof value !== "object") return null;
  const row = value;
  const pathRaw = asNonEmptyString4(row.path);
  const size = asInt3(row.size);
  const sha256 = asHex644(row.sha256);
  if (!pathRaw || size === null || size < 0 || !sha256) return null;
  const path = normalizeReceizFolderPackagePath(pathRaw);
  if (!path) return null;
  return {
    path,
    size,
    sha256
  };
}
function coerceReceizPackageRootManifest(value) {
  if (!value || typeof value !== "object") return null;
  const row = value;
  if (row.kind !== "receiz.package.root.manifest.v1") return null;
  if (row.version !== 1) return null;
  const createdAt = asNonEmptyString4(row.createdAt);
  const folderManifestPathRaw = asNonEmptyString4(row.folderManifestPath);
  const itemCount = asInt3(row.itemCount);
  if (!createdAt || !folderManifestPathRaw || itemCount === null || itemCount < 0) return null;
  const folderManifestPath = normalizeReceizFolderPackagePath(folderManifestPathRaw);
  if (!folderManifestPath) return null;
  if (!Array.isArray(row.entries)) return null;
  const entries = [];
  const seenPaths = /* @__PURE__ */ new Set();
  for (const rawEntry of row.entries) {
    const entry = coerceEntry2(rawEntry);
    if (!entry) return null;
    if (seenPaths.has(entry.path)) return null;
    seenPaths.add(entry.path);
    entries.push(entry);
  }
  if (entries.length !== itemCount) return null;
  return {
    kind: "receiz.package.root.manifest.v1",
    version: 1,
    createdAt,
    folderManifestPath,
    itemCount,
    entries
  };
}

// app/lib/documentSeal/pdfProof.ts
var textEncoder4 = new TextEncoder();
var latin1Decoder = new TextDecoder("latin1");
var PDF_RECEIZ_UPDATE_MARKER = "%RECEIZ_SEAL_UPDATE_v1%";
function isFiniteInt(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function decodeLatin1(bytes) {
  return latin1Decoder.decode(bytes);
}
function encodeAscii(text) {
  return textEncoder4.encode(text);
}
function lastRegexMatch(text, regex) {
  let out = null;
  regex.lastIndex = 0;
  let current = regex.exec(text);
  while (current) {
    out = current;
    current = regex.exec(text);
  }
  return out;
}
function parseLastRef(text, key) {
  const re = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R`, "g");
  const match = lastRegexMatch(text, re);
  if (!match) return null;
  const obj = Number.parseInt(match[1] ?? "", 10);
  const gen = Number.parseInt(match[2] ?? "", 10);
  if (!isFiniteInt(obj) || !isFiniteInt(gen)) return null;
  return { obj, gen };
}
function parseLastSize(text) {
  const match = lastRegexMatch(text, /\/Size\s+(\d+)/g);
  if (!match) return null;
  const size = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(size) && size > 0 ? size : null;
}
function parseLastStartXref(text) {
  const match = lastRegexMatch(text, /startxref\s+(\d+)/g);
  if (!match) return null;
  const start = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(start) && start >= 0 ? start : null;
}
function parseMaxObjectNumber(text) {
  const objectRegex = /(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b/gm;
  let max2 = 0;
  let match = objectRegex.exec(text);
  while (match) {
    const value = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(value) && value > max2) max2 = value;
    match = objectRegex.exec(text);
  }
  return max2;
}
function escapePdfLiteralString(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function decodePdfLiteralString(value) {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i] ?? "";
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = value[i + 1] ?? "";
    i += 1;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "	";
    else if (next === "b") out += "\b";
    else if (next === "f") out += "\f";
    else out += next;
  }
  return out;
}
function readProofBundleLiteral(body) {
  const literalMatch = /\/ProofBundle\s*\(([\s\S]*?)\)\s*(?:\/|>>)/.exec(body);
  if (literalMatch?.[1]) return decodePdfLiteralString(literalMatch[1]);
  const hexMatch = /\/ProofBundle\s*<([0-9A-Fa-f\s]+)>/.exec(body);
  if (!hexMatch?.[1]) return null;
  const normalized = hexMatch[1].replace(/\s+/g, "");
  if (normalized.length === 0 || normalized.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(normalized)) {
    return null;
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}
function isPdfBytes(bytes) {
  return bytes.length >= 5 && bytes[0] === 37 && // %
  bytes[1] === 80 && // P
  bytes[2] === 68 && // D
  bytes[3] === 70 && // F
  bytes[4] === 45;
}
function stripReceizSealUpdatesFromPdf(pdfBytes) {
  let current = pdfBytes;
  let removedCount = 0;
  while (true) {
    const text = decodeLatin1(current);
    const markerIndex = text.lastIndexOf(PDF_RECEIZ_UPDATE_MARKER);
    if (markerIndex < 0) break;
    let cutIndex = markerIndex;
    if (cutIndex > 0 && text[cutIndex - 1] === "\n") cutIndex -= 1;
    if (cutIndex > 0 && text[cutIndex - 1] === "\r") cutIndex -= 1;
    current = current.slice(0, cutIndex);
    removedCount += 1;
  }
  return { pdfBytes: current, removedCount };
}
function extractReceizProofBundlesFromPdf(pdfBytes) {
  const text = decodeLatin1(pdfBytes);
  const objectRegex = /(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/gm;
  const encodedBundles = [];
  let match = objectRegex.exec(text);
  while (match) {
    const body = match[3] ?? "";
    if (/\/Type\s*\/ReceizProof\b/.test(body)) {
      const encoded = readProofBundleLiteral(body);
      if (encoded) encodedBundles.push(encoded);
    }
    match = objectRegex.exec(text);
  }
  return encodedBundles;
}
function padXrefOffset(offset) {
  return String(Math.max(0, offset)).padStart(10, "0");
}
function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}
function embedReceizProofBundleIntoPdf(args) {
  if (!isPdfBytes(args.pdfBytes)) {
    throw new Error("Not a PDF.");
  }
  const text = decodeLatin1(args.pdfBytes);
  const rootRef = parseLastRef(text, "Root");
  const lastStartXref = parseLastStartXref(text);
  if (!rootRef || lastStartXref === null) {
    throw new Error("Unsupported PDF structure: missing root or startxref.");
  }
  const existingInfoRef = parseLastRef(text, "Info");
  const size = parseLastSize(text);
  const maxObjectNumber = parseMaxObjectNumber(text);
  const nextObjectNumber = Math.max(size ?? 0, maxObjectNumber + 1, 1);
  const proofObjectNumber = nextObjectNumber;
  const infoObjectNumber = nextObjectNumber + 1;
  const trailerSize = Math.max(size ?? 0, infoObjectNumber + 1);
  const escapedBundle = escapePdfLiteralString(args.encodedBundle);
  const prefix = encodeAscii(`
${PDF_RECEIZ_UPDATE_MARKER}
`);
  const proofObject = encodeAscii(
    `${proofObjectNumber} 0 obj
<< /Type /ReceizProof /Version 1 /ProofBundle (${escapedBundle}) >>
endobj
`
  );
  const infoObject = encodeAscii(
    `${infoObjectNumber} 0 obj
<< /ReceizProof ${proofObjectNumber} 0 R${existingInfoRef ? ` /PrevInfo ${existingInfoRef.obj} ${existingInfoRef.gen} R` : ""} >>
endobj
`
  );
  const baseLength = args.pdfBytes.length;
  const proofOffset = baseLength + prefix.length;
  const infoOffset = proofOffset + proofObject.length;
  const xrefOffset = infoOffset + infoObject.length;
  const xrefSection = encodeAscii(
    `xref
${proofObjectNumber} 2
${padXrefOffset(proofOffset)} 00000 n${" "}
${padXrefOffset(infoOffset)} 00000 n${" "}
`
  );
  const trailerSection = encodeAscii(
    `trailer
<< /Size ${trailerSize} /Root ${rootRef.obj} ${rootRef.gen} R /Info ${infoObjectNumber} 0 R /Prev ${lastStartXref} >>
startxref
${xrefOffset}
%%EOF
`
  );
  return concatBytes([args.pdfBytes, prefix, proofObject, infoObject, xrefSection, trailerSection]);
}

// app/lib/documentSeal/svgProof.ts
var textEncoder5 = new TextEncoder();
var textDecoder3 = new TextDecoder();
var RECEIZ_SVG_ATTR = "data-receiz-proof-bundle";
var RECEIZ_SVG_ID = "receiz-proof-bundle";
var SVG_CLOSE_TAG_RE = /<\/svg\s*>/i;
function proofTagRegex() {
  return new RegExp(
    `<metadata\\b[^>]*\\b${RECEIZ_SVG_ATTR}\\s*=\\s*(["'])([^"']+)\\1[^>]*>(?:[\\s\\S]*?<\\/metadata\\s*>)?`,
    "gi"
  );
}
function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
function isSupportedBundleCodec(value) {
  return value.startsWith("c1:") || value.startsWith("j0:");
}
function normalizeEncodedBundleValue(raw) {
  const compact = raw.replace(/\s+/g, "");
  const candidates = [raw.trim(), compact];
  for (const candidate of candidates) {
    if (isSupportedBundleCodec(candidate)) return candidate;
    const decoded = decodeURIComponentSafe(candidate);
    if (decoded && isSupportedBundleCodec(decoded)) return decoded;
  }
  return null;
}
function stripReceizSvgProofTags(svgBytes) {
  const svgText = textDecoder3.decode(svgBytes);
  const encodedBundles = [];
  let removedCount = 0;
  const regex = proofTagRegex();
  let strippedText = "";
  let cursor = 0;
  let match;
  while (match = regex.exec(svgText)) {
    const full = match[0] ?? "";
    const encoded = match[2] ?? "";
    const matchIndex = match.index;
    let removeStart = matchIndex;
    if (removeStart > 0 && svgText.charCodeAt(removeStart - 1) === 10) {
      removeStart -= 1;
    }
    strippedText += svgText.slice(cursor, removeStart);
    cursor = matchIndex + full.length;
    removedCount += 1;
    encodedBundles.push(String(encoded));
  }
  strippedText += svgText.slice(cursor);
  return {
    basisText: strippedText,
    basisBytes: textEncoder5.encode(strippedText),
    removedCount,
    encodedBundles
  };
}
function parseReceizSvgProof(svgBytes) {
  const stripped = stripReceizSvgProofTags(svgBytes);
  if (stripped.removedCount === 0) {
    return { proofCount: 0, basisBytes: stripped.basisBytes, encodedBundle: null, parseError: "missing_svg_proof" };
  }
  if (stripped.removedCount > 1) {
    return {
      proofCount: stripped.removedCount,
      basisBytes: stripped.basisBytes,
      encodedBundle: null,
      parseError: "duplicate_svg_proof"
    };
  }
  const encodedBundle = normalizeEncodedBundleValue(stripped.encodedBundles[0] ?? "");
  if (!encodedBundle) {
    return { proofCount: 1, basisBytes: stripped.basisBytes, encodedBundle: null, parseError: "invalid_svg_proof" };
  }
  return {
    proofCount: 1,
    basisBytes: stripped.basisBytes,
    encodedBundle,
    parseError: null
  };
}
function embedReceizProofBundleIntoSvg(args) {
  const stripped = stripReceizSvgProofTags(args.svgBytes);
  const closeMatch = SVG_CLOSE_TAG_RE.exec(stripped.basisText);
  if (!closeMatch || closeMatch.index < 0) {
    throw new Error("SVG is missing a closing </svg> tag.");
  }
  const insertAt = closeMatch.index;
  const proofTag = `
<metadata id="${RECEIZ_SVG_ID}" ${RECEIZ_SVG_ATTR}="${args.encodedBundle}"/>`;
  const nextText = `${stripped.basisText.slice(0, insertAt)}${proofTag}${stripped.basisText.slice(insertAt)}`;
  return {
    svgBytes: textEncoder5.encode(nextText),
    removedCount: stripped.removedCount
  };
}

// app/lib/documentSeal/jsonProof.ts
var textEncoder6 = new TextEncoder();
var textDecoder4 = new TextDecoder();
var JSON_WS_PREFIX = "\r\n	 		 \r\n";
var JSON_WS_SUFFIX = "\r\n 		 	\r\n";
var JSON_WS_PREFIX_LF = JSON_WS_PREFIX.replace(/\r\n/g, "\n");
var JSON_WS_SUFFIX_LF = JSON_WS_SUFFIX.replace(/\r\n/g, "\n");
var JSON_WS_CHANNELS = (() => {
  const out = [{ prefix: JSON_WS_PREFIX, suffix: JSON_WS_SUFFIX }];
  if (JSON_WS_PREFIX_LF !== JSON_WS_PREFIX || JSON_WS_SUFFIX_LF !== JSON_WS_SUFFIX) {
    out.push({ prefix: JSON_WS_PREFIX_LF, suffix: JSON_WS_SUFFIX_LF });
  }
  return out;
})();
function encodeWhitespaceBits(bytes) {
  let out = "";
  for (const value of bytes) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      out += (value >> bit & 1) === 1 ? "	" : " ";
    }
  }
  return out;
}
function decodeWhitespaceBits(bits2) {
  if (bits2.length % 8 !== 0) return null;
  const out = new Uint8Array(bits2.length / 8);
  for (let i = 0; i < bits2.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      const ch = bits2[i + j];
      if (ch !== " " && ch !== "	") return null;
      value = value << 1 | (ch === "	" ? 1 : 0);
    }
    out[i / 8] = value;
  }
  return out;
}
function decodeURIComponentSafe2(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
function isSupportedBundleCodec2(value) {
  return value.startsWith("c1:") || value.startsWith("j0:");
}
function normalizeEncodedBundleToken(raw) {
  const compact = raw.replace(/\s+/g, "");
  const candidates = [raw.trim(), compact];
  for (const candidate of candidates) {
    if (isSupportedBundleCodec2(candidate)) return candidate;
    const decoded = decodeURIComponentSafe2(candidate);
    if (decoded && isSupportedBundleCodec2(decoded)) return decoded;
  }
  return null;
}
function packBundlePayload(encodedBundle) {
  const payloadText = textEncoder6.encode(encodedBundle);
  const out = new Uint8Array(4 + payloadText.length);
  out[0] = payloadText.length >>> 24 & 255;
  out[1] = payloadText.length >>> 16 & 255;
  out[2] = payloadText.length >>> 8 & 255;
  out[3] = payloadText.length & 255;
  out.set(payloadText, 4);
  return out;
}
function unpackBundlePayload(bytes) {
  if (bytes.length < 4) return null;
  const size = ((bytes[0] ?? 0) << 24 >>> 0) + ((bytes[1] ?? 0) << 16) + ((bytes[2] ?? 0) << 8) + (bytes[3] ?? 0);
  if (size !== bytes.length - 4) return null;
  return normalizeEncodedBundleToken(textDecoder4.decode(bytes.slice(4)));
}
function findTrailingJsonProof(current, channel) {
  const suffixStart = current.length - channel.suffix.length;
  let prefixStart = current.lastIndexOf(channel.prefix, suffixStart - 1);
  let sawPrefix = false;
  let sawInvalidBits = false;
  let sawInvalidPayload = false;
  while (prefixStart >= 0) {
    sawPrefix = true;
    const bits2 = current.slice(prefixStart + channel.prefix.length, suffixStart);
    const payloadBytes = decodeWhitespaceBits(bits2);
    if (!payloadBytes) {
      sawInvalidBits = true;
      prefixStart = current.lastIndexOf(channel.prefix, prefixStart - 1);
      continue;
    }
    const encodedBundle = unpackBundlePayload(payloadBytes);
    if (!encodedBundle) {
      sawInvalidPayload = true;
      prefixStart = current.lastIndexOf(channel.prefix, prefixStart - 1);
      continue;
    }
    return {
      ok: true,
      prefixStart,
      encodedBundle
    };
  }
  if (!sawPrefix) {
    return { ok: false, parseError: "missing_json_whitespace_proof_prefix" };
  }
  if (sawInvalidPayload) {
    return { ok: false, parseError: "invalid_json_whitespace_payload" };
  }
  if (sawInvalidBits) {
    return { ok: false, parseError: "invalid_json_whitespace_bits" };
  }
  return { ok: false, parseError: "invalid_json_proof" };
}
function detectTrailingJsonChannel(current) {
  for (const channel of JSON_WS_CHANNELS) {
    if (current.endsWith(channel.suffix)) return channel;
  }
  return null;
}
function stripReceizJsonProof(jsonBytes) {
  let current = textDecoder4.decode(jsonBytes);
  const encodedBundles = [];
  let removedCount = 0;
  let parseError = null;
  while (true) {
    const channel = detectTrailingJsonChannel(current);
    if (!channel) break;
    const trailingProof = findTrailingJsonProof(current, channel);
    if (!trailingProof.ok) {
      if (trailingProof.parseError === "missing_json_whitespace_proof_prefix") {
        break;
      }
      parseError = trailingProof.parseError;
      break;
    }
    encodedBundles.push(trailingProof.encodedBundle);
    removedCount += 1;
    current = current.slice(0, trailingProof.prefixStart);
  }
  return {
    basisText: current,
    basisBytes: textEncoder6.encode(current),
    removedCount,
    encodedBundles,
    parseError
  };
}
function parseReceizJsonProof(jsonBytes) {
  const stripped = stripReceizJsonProof(jsonBytes);
  if (stripped.parseError) {
    return {
      proofCount: stripped.removedCount,
      basisBytes: stripped.basisBytes,
      encodedBundle: null,
      parseError: stripped.parseError
    };
  }
  if (stripped.removedCount === 0) {
    return { proofCount: 0, basisBytes: stripped.basisBytes, encodedBundle: null, parseError: "missing_json_proof" };
  }
  if (stripped.removedCount > 1) {
    return {
      proofCount: stripped.removedCount,
      basisBytes: stripped.basisBytes,
      encodedBundle: null,
      parseError: "duplicate_json_proof"
    };
  }
  const encodedBundle = stripped.encodedBundles[0] ?? null;
  return {
    proofCount: 1,
    basisBytes: stripped.basisBytes,
    encodedBundle,
    parseError: encodedBundle ? null : "invalid_json_proof"
  };
}
function embedReceizProofBundleIntoJson(args) {
  const stripped = stripReceizJsonProof(args.jsonBytes);
  if (stripped.parseError) {
    throw new Error(`Existing JSON proof marker is malformed (${stripped.parseError}).`);
  }
  const payload = packBundlePayload(args.encodedBundle);
  const whitespacePayload = encodeWhitespaceBits(payload);
  const out = `${stripped.basisText}${JSON_WS_PREFIX}${whitespacePayload}${JSON_WS_SUFFIX}`;
  return {
    jsonBytes: textEncoder6.encode(out),
    removedCount: stripped.removedCount
  };
}

// app/lib/documentSeal/trailerProof.ts
var textEncoder7 = new TextEncoder();
var textDecoder5 = new TextDecoder();
var RECEIZ_TRAILER_PREFIX = "\n\n--RECEIZ-TRAILER-v1--\n";
var RECEIZ_TRAILER_SUFFIX = "\n--END-RECEIZ-TRAILER--\n";
var TRAILER_PREFIX_BYTES = textEncoder7.encode(RECEIZ_TRAILER_PREFIX);
var TRAILER_SUFFIX_BYTES = textEncoder7.encode(RECEIZ_TRAILER_SUFFIX);
function lastIndexOfBytes(haystack, needle) {
  if (needle.length === 0 || haystack.length < needle.length) return -1;
  for (let i = haystack.length - needle.length; i >= 0; i -= 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}
function indexOfBytes(haystack, needle, from = 0) {
  if (needle.length === 0 || haystack.length < needle.length) return -1;
  for (let i = Math.max(0, from); i <= haystack.length - needle.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}
function countReceizTrailers(bytes) {
  let count = 0;
  let cursor = 0;
  while (cursor <= bytes.length - TRAILER_PREFIX_BYTES.length) {
    const index = indexOfBytes(bytes, TRAILER_PREFIX_BYTES, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + TRAILER_PREFIX_BYTES.length;
  }
  return count;
}
function parseReceizTrailer(bytes) {
  const trailerCount = countReceizTrailers(bytes);
  if (trailerCount === 0) {
    return { trailerCount: 0, basisBytes: bytes, bundle: null, parseError: "missing_trailer" };
  }
  const start = lastIndexOfBytes(bytes, TRAILER_PREFIX_BYTES);
  if (start < 0) {
    return { trailerCount, basisBytes: bytes, bundle: null, parseError: "missing_trailer_start" };
  }
  const suffixStart = indexOfBytes(bytes, TRAILER_SUFFIX_BYTES, start + TRAILER_PREFIX_BYTES.length);
  if (suffixStart < 0) {
    return { trailerCount, basisBytes: bytes, bundle: null, parseError: "missing_trailer_end" };
  }
  const trailerEnd = suffixStart + TRAILER_SUFFIX_BYTES.length;
  if (trailerEnd !== bytes.length) {
    return { trailerCount, basisBytes: bytes, bundle: null, parseError: "trailer_not_at_end" };
  }
  const jsonBytes = bytes.slice(start + TRAILER_PREFIX_BYTES.length, suffixStart);
  const basisBytes = bytes.slice(0, start);
  let parsed;
  try {
    parsed = JSON.parse(textDecoder5.decode(jsonBytes));
  } catch {
    return { trailerCount, basisBytes, bundle: null, parseError: "invalid_trailer_json" };
  }
  return { trailerCount, basisBytes, bundle: parsed, parseError: null };
}
function appendReceizTrailer(args) {
  const json = jcsCanonicalize(args.bundle);
  const trailer = textEncoder7.encode(`${RECEIZ_TRAILER_PREFIX}${json}${RECEIZ_TRAILER_SUFFIX}`);
  const out = new Uint8Array(args.basisBytes.length + trailer.length);
  out.set(args.basisBytes, 0);
  out.set(trailer, args.basisBytes.length);
  return out;
}

// app/lib/documentSeal/verifyLink.ts
function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizedAnchorId(value) {
  const normalized = asTrimmedString(value).toLowerCase();
  return /^[0-9a-f]{8}$/.test(normalized) ? normalized : "";
}
function normalizedMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  const normalized = asTrimmedString(value);
  return /^\d+$/.test(normalized) ? normalized : "";
}
function pathHasAnchorParams(path) {
  try {
    const params = new URL(path, "https://receiz.local").searchParams;
    return !!params.get("a") && !!params.get("ms");
  } catch {
    return false;
  }
}
function buildAnchoredReceizVerifyPath(args) {
  const verifyPath = asTrimmedString(args.verifyPath);
  if (!verifyPath) return "";
  if (pathHasAnchorParams(verifyPath)) return verifyPath;
  const anchorId = normalizedAnchorId(args.anchorId);
  const ms = normalizedMs(args.createdAtMs);
  if (!anchorId || !ms) return verifyPath;
  try {
    const url = new URL(verifyPath, "https://receiz.local");
    url.searchParams.set("a", anchorId);
    url.searchParams.set("ms", ms);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return verifyPath;
  }
}
function anchoredReceizVerifyPathFromBundle(bundle) {
  if (!bundle) return "";
  return buildAnchoredReceizVerifyPath({
    verifyPath: bundle.verifyPath,
    anchorId: bundle.anchorId,
    createdAtMs: bundle.createdAtMs
  });
}

// app/utils/kai_pulse.ts
var GENESIS_TS = 1715323541888;
var PULSES_STEP = 11;
var STEPS_BEAT = 44;
var BEATS_DAY = 36;
var PULSES_BEAT = PULSES_STEP * STEPS_BEAT;
var N_DAY_MICRO = 17491270421n;
var PULSES_PER_STEP_MICRO = 11000000n;
var PULSES_PER_BEAT_MICRO = 484000000n;
var BASE_DAY_MICRO = 17424000000n;
var DAYS_PER_WEEK = 6;
var WEEKS_PER_MONTH = 7;
var DAYS_PER_MONTH = DAYS_PER_WEEK * WEEKS_PER_MONTH;
var MONTHS_PER_YEAR = 8;
var DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
var PULSE_MS = Math.round((3 + Math.sqrt(5)) * 1e3);
var T_MS_NUM = BigInt("5236067977499789696409173668731276235440618359611525724270897245");
var T_MS_DEN = 10n ** 60n;
var INV_Tx1000_NUM = BigInt("190983005625052575897706582817180941139845410097118568932275689");
var INV_Tx1000_DEN = 10n ** 60n;
var WEEKDAYS = [
  "Solhara",
  "Aquaris",
  "Flamora",
  "Verdari",
  "Sonari",
  "Kaelith"
];
var DAY_TO_CHAKRA = {
  Solhara: "Root",
  Aquaris: "Sacral",
  Flamora: "Solar Plexus",
  Verdari: "Heart",
  Sonari: "Throat",
  Kaelith: "Crown"
};
var b = (n) => BigInt(n);
var abs = (x) => x < 0n ? -x : x;
var modE = (a, m) => {
  const r = a % m;
  return r >= 0n ? r : r + m;
};
var pulsesInGridDay = (p\u03BC) => {
  const pulsesInDay = modE(p\u03BC, N_DAY_MICRO);
  return pulsesInDay * BASE_DAY_MICRO / N_DAY_MICRO;
};
var floorDivE = (a, d) => {
  const q = a / d;
  const r = a % d;
  return r === 0n || a >= 0n ? q : q - 1n;
};
var toSafeNumber = (x) => {
  const MAX = BigInt(Number.MAX_SAFE_INTEGER);
  const MIN = BigInt(Number.MIN_SAFE_INTEGER);
  if (x > MAX) return Number.MAX_SAFE_INTEGER;
  if (x < MIN) return Number.MIN_SAFE_INTEGER;
  return Number(x);
};
var mulDivRoundHalfEven = (x, num, den) => {
  if (den <= 0n) throw new Error("Denominator must be positive.");
  const sgn = (x < 0n ? -1n : 1n) * (num < 0n ? -1n : 1n);
  const A = abs(x) * abs(num);
  const q = A / den;
  const r = A % den;
  const twice = r * 2n;
  let n = q;
  if (twice > den) n = q + 1n;
  else if (twice === den && (q & 1n) === 1n) n = q + 1n;
  return sgn * n;
};
var DEFAULT_SIGNED_SNAPSHOT = {
  pulse: 0,
  microPulses: 0n,
  capturedMs: GENESIS_TS
};
var resolvePerfClock = () => {
  const perf = globalThis.performance;
  const now = perf && typeof perf.now === "function" ? () => perf.now() : () => Date.now();
  const timeOrigin = perf && typeof perf.timeOrigin === "number" ? perf.timeOrigin : Date.now();
  return { now, timeOrigin };
};
var parsePulseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim().length) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
var readOverridePulse = () => {
  const g = globalThis;
  const rc = g.__KLOCKRC__ ?? g.__klockrc ?? g.klockrc;
  const candidates = [
    g.override_pulse,
    g.overridePulse,
    rc?.override_pulse,
    rc?.pulse
  ];
  for (const value of candidates) {
    const parsed = parsePulseNumber(value);
    if (parsed !== null) return parsed;
  }
  const envCandidate = typeof process !== "undefined" && process?.env ? process.env.NEXT_PUBLIC_KAI_OVERRIDE_PULSE ?? process.env.KAI_OVERRIDE_PULSE ?? process.env.NEXT_PUBLIC_OVERRIDE_PULSE ?? process.env.OVERRIDE_PULSE : void 0;
  return parsePulseNumber(envCandidate);
};
var readSignedSnapshot = () => {
  const g = globalThis;
  const snap = g.__KAI_SIGNED_PULSE_SNAPSHOT__;
  if (snap && (typeof snap.pulse === "number" || typeof snap.microPulses === "bigint")) {
    return snap;
  }
  return DEFAULT_SIGNED_SNAPSHOT;
};
var KaiTimeSource = class {
  constructor(options = {}) {
    this.clock = options.clock ?? resolvePerfClock();
    const overridePulse = options.ignoreOverride ? null : options.overridePulse !== void 0 ? parsePulseNumber(options.overridePulse) : readOverridePulse();
    const snapshot = options.ignoreOverride ? null : options.snapshot ?? readSignedSnapshot();
    const snapshotMicro = snapshot?.microPulses ?? (typeof snapshot?.pulse === "number" ? BigInt(Math.trunc(snapshot.pulse)) * 1000000n : null);
    const epochMs = BigInt(
      Math.round(this.clock.timeOrigin + this.clock.now())
    );
    const bridgedMicro = microPulsesSinceGenesis(epochMs);
    this.seedMicroPulses = overridePulse !== null ? BigInt(Math.trunc(overridePulse)) * 1000000n : snapshotMicro ?? bridgedMicro;
    this.perfAtSeed = this.clock.now();
  }
  /** Current μpulses using monotonic performance deltas. */
  nowMicroPulses() {
    const deltaUs = BigInt(
      Math.round((this.clock.now() - this.perfAtSeed) * 1e3)
    );
    const deltaMicro = mulDivRoundHalfEven(
      deltaUs,
      INV_Tx1000_NUM,
      INV_Tx1000_DEN * 1000n
    );
    return this.seedMicroPulses + deltaMicro;
  }
  /** Current pulse index (floor) based on the internal μpulse counter. */
  nowPulse() {
    return toSafeNumber(floorDivE(this.nowMicroPulses(), 1000000n));
  }
};
var kaiTimeSource = new KaiTimeSource();
var MS_PER_DAY_BI = 86400000n;
var MS_PER_HOUR_BI = 3600000n;
var MS_PER_MIN_BI = 60000n;
var MS_PER_SEC_BI = 1000n;
var SIGNED_ISO = /^([+-]?\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})$/;
var div = floorDivE;
function daysFromCivilBI(year, month, day) {
  const y = month <= 2n ? year - 1n : year;
  const m = month <= 2n ? month + 12n : month;
  const era = div(y >= 0n ? y : y - 399n, 400n);
  const yoe = y - era * 400n;
  const doy = div(153n * (m - 3n) + 2n, 5n) + day - 1n;
  const doe = yoe * 365n + div(yoe, 4n) - div(yoe, 100n) + doy;
  return era * 146097n + doe - 719468n;
}
function parseSignedIsoToEpochMs(iso) {
  const m = SIGNED_ISO.exec(iso);
  if (!m) {
    const d = new Date(iso);
    const t = d.getTime();
    if (Number.isFinite(t)) return BigInt(t);
    throw new Error("Invalid ISO datetime.");
  }
  const [, yStr, MM, DD, hh, mm, ss = "00", frac = "0", tz] = m;
  const year = BigInt(yStr);
  const month = BigInt(MM);
  const day = BigInt(DD);
  const hour = BigInt(hh);
  const minute = BigInt(mm);
  const second = BigInt(ss);
  let ms = 0n;
  if (frac && frac !== "0") {
    const fracPadded = (frac + "000000000").slice(0, 9);
    const nanos = BigInt(fracPadded);
    ms = (nanos + 500000n) / 1000000n;
  }
  const todMs = hour * MS_PER_HOUR_BI + minute * MS_PER_MIN_BI + second * MS_PER_SEC_BI + ms;
  let offsetMin = 0n;
  if (tz !== "Z") {
    const sign = tz[0] === "-" ? -1n : 1n;
    const [tzh, tzm] = tz.slice(1).split(":");
    offsetMin = sign * (BigInt(tzh) * 60n + BigInt(tzm));
  }
  const days = daysFromCivilBI(year, month, day);
  const epochMsLocal = days * MS_PER_DAY_BI + todMs;
  const epochMsUTC = epochMsLocal - offsetMin * MS_PER_MIN_BI;
  return epochMsUTC;
}
function microPulsesSinceGenesis(utc) {
  let msEpoch;
  if (typeof utc === "bigint") {
    msEpoch = utc;
  } else if (typeof utc === "string") {
    msEpoch = parseSignedIsoToEpochMs(utc);
  } else {
    const t = utc.getTime();
    if (!Number.isFinite(t)) throw new Error(`Invalid Date: ${String(utc)}`);
    msEpoch = BigInt(t);
  }
  const deltaMs = msEpoch - BigInt(GENESIS_TS);
  return mulDivRoundHalfEven(deltaMs, INV_Tx1000_NUM, INV_Tx1000_DEN);
}
function epochMsFromPulse(pulse) {
  const p = typeof pulse === "bigint" ? pulse : BigInt(Math.trunc(pulse));
  const deltaMs = mulDivRoundHalfEven(p, T_MS_NUM, T_MS_DEN);
  return BigInt(GENESIS_TS) + deltaMs;
}
function latticeFromMicroPulses(p\u03BC) {
  const pulsesInGrid = pulsesInGridDay(p\u03BC);
  const beatBI = pulsesInGrid / PULSES_PER_BEAT_MICRO;
  const pulsesInBeat = pulsesInGrid - beatBI * PULSES_PER_BEAT_MICRO;
  const stepBI = pulsesInBeat / PULSES_PER_STEP_MICRO;
  const pulsesInStep = pulsesInBeat - stepBI * PULSES_PER_STEP_MICRO;
  const percentIntoStep = Number(pulsesInStep) / Number(PULSES_PER_STEP_MICRO);
  return { beat: Number(beatBI), stepIndex: Number(stepBI), percentIntoStep };
}
var GREENWICH_LAT = 51.4769;
var GREENWICH_LON = 0;
var DEG2RAD = Math.PI / 180;
var RAD2DAY = 1 / (2 * Math.PI);
var JULIAN_UNIX_EPOCH = 24405875e-1;
var sunriseCache = /* @__PURE__ */ new Map();
function toJulianDay(msUTC) {
  return msUTC / 864e5 + JULIAN_UNIX_EPOCH;
}
function fromJulianDay(J) {
  return (J - JULIAN_UNIX_EPOCH) * 864e5;
}
function normalizeAngleDeg(a) {
  const x = a % 360;
  return x < 0 ? x + 360 : x;
}
function clamp(x, min, max2) {
  return x < min ? min : x > max2 ? max2 : x;
}
function getUTCYMD(msUTC) {
  const d = new Date(Number(msUTC));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
function julianNoonApprox(J, lonDeg) {
  const Lw = -lonDeg * DEG2RAD;
  const n = Math.round(J - 24515450009e-4 - Lw * RAD2DAY);
  return 24515450009e-4 + Lw * RAD2DAY + n;
}
function sunriseJulianForDate(y, m, d, latDeg = GREENWICH_LAT, lonDeg = GREENWICH_LON) {
  const J0 = toJulianDay(Date.UTC(y, m - 1, d));
  const Jnoon = julianNoonApprox(J0, lonDeg);
  const Mdeg = 357.5291 + 0.98560028 * (Jnoon - 2451545);
  const Mrad = Mdeg * DEG2RAD;
  const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 3e-4 * Math.sin(3 * Mrad);
  const lambda = normalizeAngleDeg(Mdeg + C + 180 + 102.9372) * DEG2RAD;
  const Jtransit = Jnoon + 53e-4 * Math.sin(Mrad) - 69e-4 * Math.sin(2 * lambda);
  const epsilon = 23.4397 * DEG2RAD;
  const delta = Math.asin(Math.sin(lambda) * Math.sin(epsilon));
  const phi = latDeg * DEG2RAD;
  const h0 = -0.833 * DEG2RAD;
  const cos_omega0 = (Math.sin(h0) - Math.sin(phi) * Math.sin(delta)) / (Math.cos(phi) * Math.cos(delta));
  const omega0 = Math.acos(clamp(cos_omega0, -1, 1));
  const Jrise = Jtransit - omega0 * RAD2DAY;
  return Jrise;
}
function sunriseUtcMsForEpochMs(msUTC) {
  const { y, m, d } = getUTCYMD(msUTC);
  const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const cached = sunriseCache.get(key);
  if (cached !== void 0) return cached;
  const Jrise = sunriseJulianForDate(y, m, d);
  const ms = BigInt(Math.round(fromJulianDay(Jrise)));
  sunriseCache.set(key, ms);
  return ms;
}
var ARC_NAMES = [
  "Ignition Ark",
  "Integration Ark",
  "Harmonization Ark",
  "Reflection Ark",
  "Purification Ark",
  "Dream Ark"
];
var ARC_SEAL_NAMES = {
  "Ignition Ark": "Ignite Ark",
  "Integration Ark": "Integration Ark",
  "Harmonization Ark": "Harmonization Ark",
  "Reflection Ark": "Reflection Ark",
  "Purification Ark": "Purify Ark",
  "Dream Ark": "Dream Ark"
};
var ARC_DESC = {
  "Ignition Ark": "Resurrection, will, awakening",
  "Integration Ark": "Emotional grounding, emergence",
  "Harmonization Ark": "Radiance, balance, coherent action",
  "Reflection Ark": "Union, compassion, spoken resonance",
  "Purification Ark": "Truth, remembrance, etheric light",
  "Dream Ark": "Divine memory, lucid integration, dreaming awake"
};
var MONTHS = [
  { name: "Aethon", desc: "Resurrection fire: Root awakening" },
  { name: "Virelai", desc: "Waters of becoming: Emotional emergence" },
  { name: "Solari", desc: "Solar ignition: Radiant embodiment" },
  { name: "Amarin", desc: "Heart bloom: Sacred balance" },
  { name: "Kaelus", desc: "Voice of stars: Resonant expression" },
  { name: "Umbriel", desc: "Divine remembrance: Krown alignment" },
  { name: "Noktura", desc: "Light spiral: Selestial flow" },
  { name: "Liora", desc: "Eternal mirror: Infinite now" }
];
var WEEK_SPIRALS = [
  { name: "Awakening Flame", desc: "Root fire of ignition, will, resurrektion" },
  { name: "Flowing Heart", desc: "Emotional waters, intimasy, surrender" },
  { name: "Radiant Will", desc: "Solar klarity, aligned konfidence, embodiment" },
  { name: "Harmonic Voice", desc: "Spoken truth, vibration, koherense in sound" },
  { name: "Inner Mirror", desc: "Reflektion, purifikation, self-seeing" },
  { name: "Dreamfire Memory", desc: "Lusid vision, divine memory, encoded light" },
  { name: "Krowned Light", desc: "Integration, sovereignty, harmonik ascension" }
];
var STEPS_PER_BEAT = STEPS_BEAT;
var BEATS_PER_DAY = BEATS_DAY;
function arcFromBeat(beat) {
  const idx = Math.max(0, Math.min(5, Math.floor(beat / 6)));
  const name = ARC_NAMES[idx];
  return { idx, name, desc: ARC_DESC[name] };
}
function percent(numer, denom) {
  if (denom === 0n) return 0;
  const v = Number(numer) / Number(denom);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function pct(n, digits = 2) {
  return (n * 100).toFixed(digits);
}
function leftPad2(n) {
  return n < 10 ? `0${n}` : String(n);
}
function safeInt(bi) {
  return Number(
    bi > 9007199254740991n ? 9007199254740991n : bi < -9007199254740991n ? -9007199254740991n : bi
  );
}
function phiSpiralLevelFromPulse(pulse) {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const p = Math.max(1, pulse);
  return Math.floor(Math.log(p) / Math.log(PHI));
}
function utcMidnightDaysSinceEpoch(msUTC) {
  return floorDivE(msUTC, MS_PER_DAY_BI);
}
function civilFromDaysBI(z) {
  z += 719468n;
  const era = div(z, 146097n);
  const doe = z - era * 146097n;
  const yoe = div(doe - div(doe, 1460n) + div(doe, 36524n) - div(doe, 146096n), 365n);
  const y = yoe + era * 400n;
  const doy = doe - (365n * yoe + div(yoe, 4n) - div(yoe, 100n));
  const mp = div(5n * doy + 2n, 153n);
  const d = doy - div(153n * mp + 2n, 5n) + 1n;
  const m = mp < 10n ? mp + 3n : mp - 9n;
  const year = m <= 2n ? y + 1n : y;
  const month = m <= 2n ? m + 12n - 12n : m;
  return { year, month, day: d };
}
var SOLAR_GENESIS_Y = 2024n;
var SOLAR_GENESIS_M = 5n;
var SOLAR_GENESIS_D = 11n;
var SOLAR_GENESIS_DAYIDX = daysFromCivilBI(SOLAR_GENESIS_Y, SOLAR_GENESIS_M, SOLAR_GENESIS_D);
function solarCivilDateForInstant(msUTC) {
  const { y, m, d } = getUTCYMD(msUTC);
  const todaySunrise = sunriseUtcMsForEpochMs(msUTC);
  if (msUTC < todaySunrise) {
    const dayIdx = utcMidnightDaysSinceEpoch(msUTC) - 1n;
    const prev = civilFromDaysBI(dayIdx);
    const prevMs = BigInt(Date.UTC(Number(prev.year), Number(prev.month) - 1, Number(prev.day)));
    const prevSunrise = sunriseUtcMsForEpochMs(prevMs);
    return { y: prev.year, m: prev.month, d: prev.day, sunriseMs: prevSunrise };
  }
  return { y: BigInt(y), m: BigInt(m), d: BigInt(d), sunriseMs: todaySunrise };
}
function solarIndices(msUTC) {
  const base = solarCivilDateForInstant(msUTC);
  const dayIdx = daysFromCivilBI(base.y, base.m, base.d) - SOLAR_GENESIS_DAYIDX;
  const weekIdx = floorDivE(dayIdx, BigInt(DAYS_PER_WEEK));
  const monthIdx = floorDivE(dayIdx, BigInt(DAYS_PER_MONTH));
  const dayOfWeek = toSafeNumber(modE(dayIdx, BigInt(DAYS_PER_WEEK)));
  const dayOfMonth = toSafeNumber(modE(dayIdx, BigInt(DAYS_PER_MONTH))) + 1;
  const monthIndex = toSafeNumber(modE(monthIdx, BigInt(MONTHS_PER_YEAR)));
  const weekInMonth = toSafeNumber(modE(weekIdx, BigInt(WEEKS_PER_MONTH)));
  return {
    solarDayIdx: dayIdx,
    solarWeekIdx: weekIdx,
    solarMonthIdx: monthIdx,
    dayOfWeek,
    dayOfMonth,
    monthIndex,
    weekInMonth,
    weekdayName: WEEKDAYS[dayOfWeek],
    weekName: WEEK_SPIRALS[weekInMonth].name,
    weekDesc: WEEK_SPIRALS[weekInMonth].desc,
    monthName: MONTHS[monthIndex].name,
    monthDesc: MONTHS[monthIndex].desc,
    sunriseMs: base.sunriseMs
  };
}
function eternalIndices(p\u03BC) {
  const dayIdx = floorDivE(p\u03BC, N_DAY_MICRO);
  const inDay = modE(p\u03BC, N_DAY_MICRO);
  const pulsesToday = floorDivE(inDay, 1000000n);
  const weekIdx = floorDivE(dayIdx, BigInt(DAYS_PER_WEEK));
  const monthIdx = floorDivE(dayIdx, BigInt(DAYS_PER_MONTH));
  const yearIdx = floorDivE(dayIdx, BigInt(DAYS_PER_YEAR));
  const weekdayIndex = toSafeNumber(modE(dayIdx, BigInt(DAYS_PER_WEEK)));
  const dayOfMonth = toSafeNumber(modE(dayIdx, BigInt(DAYS_PER_MONTH))) + 1;
  const weekInMonth = toSafeNumber(modE(weekIdx, BigInt(WEEKS_PER_MONTH)));
  const monthIndex = toSafeNumber(modE(monthIdx, BigInt(MONTHS_PER_YEAR)));
  return {
    dayIdx,
    weekdayIndex,
    weekdayName: WEEKDAYS[weekdayIndex],
    pulsesToday,
    weekInMonth,
    weekIdx,
    monthIndex,
    monthName: MONTHS[monthIndex].name,
    monthDesc: MONTHS[monthIndex].desc,
    yearIndex: toSafeNumber(yearIdx),
    dayOfMonth,
    weekName: WEEK_SPIRALS[weekInMonth].name,
    weekDesc: WEEK_SPIRALS[weekInMonth].desc
  };
}
function formatKairosSeal(beat, stepIndex, weekday, arcNameCanonical, dayOfMonth, monthIndex, pulsesToday, phiLevel, yearIndex) {
  const bStr = `${beat}`;
  const sStr = leftPad2(stepIndex);
  const beatPct = (beat + stepIndex / STEPS_PER_BEAT) / BEATS_PER_DAY;
  const beatPctStr = pct(beatPct);
  const arcSeal = ARC_SEAL_NAMES[arcNameCanonical];
  return `Eternal Seal: Kairos:${bStr}:${sStr}, ${weekday}, ${arcSeal} \u2022 D${dayOfMonth}/M${monthIndex + 1} \u2022 Beat:${beat}/${BEATS_PER_DAY}(${beatPctStr}%) Step:${stepIndex}/${STEPS_PER_BEAT} Kai(Today):${pulsesToday} \u2022 Y${yearIndex + 1} PS${phiLevel}`;
}
function formatSolarKairos(beat, stepIndex, solarWeekday, solarDOM, solarMonthIndex, arcNameCanonical) {
  const bStr = `${beat}`;
  const sStr = leftPad2(stepIndex);
  const arcSeal = ARC_SEAL_NAMES[arcNameCanonical];
  return `Solar Kairos (UTC-aligned): ${bStr}:${sStr} ${solarWeekday} D${solarDOM}/M${solarMonthIndex + 1}, ${arcSeal}  Beat:${beat}/${BEATS_PER_DAY} Step:${stepIndex}/${STEPS_PER_BEAT}`;
}
function formatKairosSealPercentStep(beat, stepIndex, percentIntoStep) {
  const sPct = pct(percentIntoStep);
  return `Kairos:${beat}:${leftPad2(stepIndex)} \u2022 Step ${stepIndex + 1}/${STEPS_PER_BEAT} (${sPct}%)`;
}
function epochMsFromUTCInput(utc) {
  if (typeof utc === "bigint") return utc;
  if (typeof utc === "string") return parseSignedIsoToEpochMs(utc);
  const t = utc.getTime();
  if (!Number.isFinite(t)) throw new Error(`Invalid Date: ${String(utc)}`);
  return BigInt(t);
}
function buildKaiKlockResponseCore(utc) {
  const msUTC = typeof utc === "undefined" ? BigInt(Date.now()) : epochMsFromUTCInput(utc);
  const p\u03BC = microPulsesSinceGenesis(msUTC);
  const pulse = toSafeNumber(floorDivE(p\u03BC, 1000000n));
  const { beat, stepIndex } = latticeFromMicroPulses(p\u03BC);
  const dayIndexBI = floorDivE(p\u03BC, N_DAY_MICRO);
  const weekdayIdx = toSafeNumber(modE(dayIndexBI, b(WEEKDAYS.length)));
  const eternalWeekday = WEEKDAYS[weekdayIdx];
  const eternal = eternalIndices(p\u03BC);
  const solar = solarIndices(msUTC);
  const { name: arcName, idx: arcIdx, desc: arcDesc } = arcFromBeat(beat);
  const pulsesInDay = modE(p\u03BC, N_DAY_MICRO);
  const pulsesInGrid = pulsesInGridDay(p\u03BC);
  const beatBI = pulsesInGrid / PULSES_PER_BEAT_MICRO;
  const pulsesInBeat = pulsesInGrid - beatBI * PULSES_PER_BEAT_MICRO;
  const pulsesInStep = pulsesInBeat - BigInt(stepIndex) * PULSES_PER_STEP_MICRO;
  const beatPercent = percent(pulsesInBeat, PULSES_PER_BEAT_MICRO);
  const stepPercent = percent(pulsesInStep, PULSES_PER_STEP_MICRO);
  const kaiPulseEternal = pulse;
  const kaiPulseToday = safeInt(floorDivE(modE(p\u03BC, N_DAY_MICRO), 1000000n));
  const eternalKaiPulseToday = kaiPulseToday;
  const daysIntoYear = toSafeNumber(modE(eternal.dayIdx, BigInt(DAYS_PER_YEAR)));
  const yearDaysRemaining = DAYS_PER_YEAR - 1 - daysIntoYear;
  const yearPct = (daysIntoYear + Number(pulsesInDay) / Number(N_DAY_MICRO)) / DAYS_PER_YEAR;
  const monthDaysElapsed = eternal.dayOfMonth - 1;
  const monthDaysRemaining = DAYS_PER_MONTH - eternal.dayOfMonth;
  const monthPct = (monthDaysElapsed + Number(pulsesInDay) / Number(N_DAY_MICRO)) / DAYS_PER_MONTH;
  const phiSpiralLevel = phiSpiralLevelFromPulse(kaiPulseEternal);
  // Use the eternal weekday when formatting the canonical seal.
  const kairosSeal = formatKairosSeal(
    beat,
    stepIndex,
    eternalWeekday,
    arcName,
    eternal.dayOfMonth,
    eternal.monthIndex,
    kaiPulseToday,
    phiSpiralLevel,
    eternal.yearIndex
  );
  const solarSeal = formatSolarKairos(
    beat,
    stepIndex,
    solar.weekdayName,
    solar.dayOfMonth,
    solar.monthIndex,
    arcName
  );
  const kairosSealPercentStep = formatKairosSealPercentStep(beat, stepIndex, stepPercent);
  const kairosSealPercentStepSolar = formatKairosSealPercentStep(beat, stepIndex, stepPercent);
  const eternalSeal = `${kairosSeal} \u2022 ${solarSeal} \u2022 Eternal Pulse:${kaiPulseEternal}`;
  const kaiMomentSummary = `\u2624KAI:${kaiPulseEternal} \u2022 B:${beat}/${BEATS_PER_DAY} S:${stepIndex}/${STEPS_PER_BEAT} (${pct(stepPercent)}%) \u2022 ${eternalWeekday}, ${ARC_SEAL_NAMES[arcName]} \u2022 D${eternal.dayOfMonth}/M${eternal.monthIndex + 1} \u2022 Y${eternal.yearIndex + 1}`;
  const harmonicTimestampDescription = `Harmonic Kairos: Beat ${beat}/${BEATS_PER_DAY}, Step ${stepIndex}/${STEPS_PER_BEAT} in the ${ARC_NAMES[arcIdx]} (${ARC_DESC[ARC_NAMES[arcIdx]]}). Weekday: ${eternalWeekday}. Eternal Month ${eternal.monthIndex + 1} (${eternal.monthName}), Day ${eternal.dayOfMonth}. Eternal pulses today: ${kaiPulseToday}.`;
  const cycleArcLen = PULSES_PER_BEAT_MICRO * 6n;
  const cycleArcPos = modE(pulsesInGrid, cycleArcLen);
  const arcPercent = percent(cycleArcPos, cycleArcLen);
  const cycleBeatLen = PULSES_PER_BEAT_MICRO;
  const cycleBeatPos = pulsesInBeat;
  const beatPctToNext = percent(cycleBeatPos, cycleBeatLen);
  const cycleStepLen = PULSES_PER_STEP_MICRO;
  const cycleStepPos = pulsesInStep;
  const stepPctLocal = percent(cycleStepPos, cycleStepLen);
  const cycleDayLen = N_DAY_MICRO;
  const cycleDayPos = pulsesInDay;
  const dayPercent = percent(cycleDayPos, cycleDayLen);
  const T_PULSE_MS = Number(mulDivRoundHalfEven(1000000n, T_MS_NUM, T_MS_DEN)) / 1e6;
  const T_PULSE_S = T_PULSE_MS / 1e3;
  const subdivisions = {
    kai_pulse: {
      duration: T_PULSE_S,
      count: 1,
      frequencyHz: 1 / T_PULSE_S,
      wavelengthSound_m: 343 * T_PULSE_S,
      wavelengthLight_m: 299792458 * T_PULSE_S,
      resonantName: "Full harmonic breath"
    },
    chakra_step: {
      duration: T_PULSE_S * 11,
      count: 11,
      frequencyHz: 1 / (T_PULSE_S * 11),
      wavelengthSound_m: 343 * T_PULSE_S * 11,
      wavelengthLight_m: 299792458 * T_PULSE_S * 11,
      resonantName: "Chakra Step"
    },
    chakra_beat: {
      duration: T_PULSE_S * Number(PULSES_BEAT),
      count: Number(PULSES_BEAT),
      frequencyHz: 1 / (T_PULSE_S * Number(PULSES_BEAT)),
      wavelengthSound_m: 343 * T_PULSE_S * Number(PULSES_BEAT),
      wavelengthLight_m: 299792458 * T_PULSE_S * Number(PULSES_BEAT),
      resonantName: "Chakra Beat"
    },
    harmonic_day: {
      duration: T_PULSE_S * 17491.270421,
      count: 17491.270421,
      frequencyHz: 1 / (T_PULSE_S * 17491.270421),
      wavelengthSound_m: 343 * T_PULSE_S * 17491.270421,
      wavelengthLight_m: 299792458 * T_PULSE_S * 17491.270421,
      resonantName: "Harmonic Day"
    }
  };
  const res = {
    // — compact seals (and variants) —
    kairos_seal: kairosSeal,
    kairos_seal_percent_step: kairosSealPercentStep,
    kairos_seal_percent_step_solar: kairosSealPercentStepSolar,
    kairos_seal_solar: solarSeal,
    // — canonical strings —
    eternalSeal,
    seal: eternalSeal,
    // — narration & summaries —
    harmonicNarrative: harmonicTimestampDescription,
    kaiMomentSummary,
    compressed_summary: `${beat}:${leftPad2(stepIndex)} \u2022 D${eternal.dayOfMonth}/M${eternal.monthIndex + 1} \u2022 ${eternalWeekday} \u2022 ${ARC_NAMES[arcIdx]}`,
    // — eternal (harmonic) calendar —
    eternalMonth: MONTHS[eternal.monthIndex].name,
    eternalMonthIndex: eternal.monthIndex,
    eternalMonthDescription: MONTHS[eternal.monthIndex].desc,
    eternalChakraArc: ARC_NAMES[arcIdx],
    eternalWeekDescription: eternal.weekDesc,
    eternalYearName: `Y${eternal.yearIndex + 1}`,
    eternalKaiPulseToday,
    kaiPulseEternal,
    eternalMonthProgress: {
      daysElapsed: monthDaysElapsed,
      daysRemaining: monthDaysRemaining,
      percent: monthPct
    },
    kaiPulseToday,
    // — solar (UTC-aligned, sunrise) view —
    solarChakraArc: ARC_NAMES[arcIdx],
    solarDayOfMonth: solar.dayOfMonth,
    solarMonthIndex: solar.monthIndex,
    solarHarmonicDay: solar.weekdayName,
    solar_week_index: solar.weekInMonth,
    solar_week_name: solar.weekName,
    solar_week_description: solar.weekDesc,
    solar_month_name: solar.monthName,
    solar_month_description: solar.monthDesc,
    solar_day_name: solar.weekdayName,
    solar_day_description: DAY_TO_CHAKRA[solar.weekdayName] + " focus",
    solar_day_start_iso: new Date(Number(solar.sunriseMs)).toISOString(),
    // optional debug/export
    // — harmonic day / arc context (eternal) —
    harmonicDay: eternalWeekday,
    harmonicDayDescription: DAY_TO_CHAKRA[eternalWeekday] + " focus",
    chakraArc: ARC_NAMES[arcIdx],
    chakraArcDescription: arcDesc,
    weekIndex: eternal.weekInMonth,
    weekName: eternal.weekName,
    dayOfMonth: eternal.dayOfMonth,
    harmonicWeekProgress: {
      weekDay: eternalWeekday,
      weekDayIndex: eternal.weekdayIndex,
      pulsesIntoWeek: safeInt(
        modE(p\u03BC, N_DAY_MICRO * BigInt(DAYS_PER_WEEK)) / 1000000n
      ),
      percent: Number(modE(p\u03BC, N_DAY_MICRO * BigInt(DAYS_PER_WEEK))) / Number(N_DAY_MICRO * BigInt(DAYS_PER_WEEK))
    },
    // — beat / step (eternal + copy to solar strings) —
    chakraBeat: {
      beatIndex: beat,
      pulsesIntoBeat: Number(pulsesInBeat) / 1e6,
      // display only
      beatPulseCount: Number(PULSES_PER_BEAT_MICRO) / 1e6,
      totalBeats: BEATS_PER_DAY
    },
    eternalChakraBeat: {
      beatIndex: beat,
      pulsesIntoBeat: Number(pulsesInBeat) / 1e6,
      beatPulseCount: Number(PULSES_PER_BEAT_MICRO) / 1e6,
      totalBeats: BEATS_PER_DAY,
      percentToNext: beatPctToNext
    },
    chakraStep: {
      stepIndex,
      percentIntoStep: stepPercent,
      stepsPerBeat: STEPS_PER_BEAT
    },
    chakraStepString: `${beat}:${leftPad2(stepIndex)}`,
    solarChakraStep: {
      stepIndex,
      percentIntoStep: stepPercent,
      stepsPerBeat: STEPS_PER_BEAT
    },
    solarChakraStepString: `${beat}:${leftPad2(stepIndex)}`,
    // — phi spiral & kai-turah —
    phiSpiralLevel,
    kaiTurahPhrase: "Rah veh yah dah",
    // — epochs (sampled structure aligned to spec narrative) —
    phiSpiralEpochs: [
      { unit: "Eternal Year", pulses: 58770669e-1, approx_days: 373.1 },
      { unit: "\u03A6 Epoch", pulses: 9510213, approx_days: 956.1 },
      { unit: "\u03A6\xB2 Resonance Epoch", pulses: 15386991, approx_days: 1542 }
    ],
    // — nested harmonic levels —
    harmonicLevels: {
      arcBeat: {
        pulseInCycle: Number(cycleArcPos) / 1e6,
        // display only
        cycleLength: Number(cycleArcLen) / 1e6,
        percent: arcPercent
      },
      microCycle: {
        pulseInCycle: Number(cycleStepPos) / 1e6,
        cycleLength: Number(cycleStepLen) / 1e6,
        percent: stepPctLocal
      },
      chakraLoop: {
        pulseInCycle: Number(cycleBeatPos) / 1e6,
        cycleLength: Number(cycleBeatLen) / 1e6,
        percent: beatPercent
      },
      harmonicDay: {
        pulseInCycle: Number(cycleDayPos) / 1e6,
        cycleLength: Number(cycleDayLen) / 1e6,
        percent: dayPercent
      }
    },
    harmonicYearProgress: {
      daysElapsed: daysIntoYear,
      daysRemaining: yearDaysRemaining,
      percent: yearPct
    },
    // — canonical timestamp & narratives —
    harmonicTimestampDescription,
    // — subdivisions —
    subdivisions
  };
  return res;
}
function buildKaiKlockResponseFromPulseSync(pulse) {
  const epochMs = epochMsFromPulse(pulse);
  return buildKaiKlockResponseCore(epochMs);
}

// app/lib/documentSeal/proofBearingVLink.ts
var COMPACT_RECEIZ_V_LINK_PREFIX = "rpb1:";
var COMPACT_RECEIZ_V_LINK_V2_PREFIX = "rpb2:";
var BINARY_COMPACT_RECEIZ_V_LINK_VERSION = 4;
var MAX_COMPACT_RECEIZ_V_LINK_BYTES = 32 * 1024;
var MAX_COMPACT_RECEIZ_V_LINK_JSON_BYTES = 96 * 1024;
var RECEIZ_PUBLIC_ORIGIN = "https://receiz.com";
var DEFAULT_RECEIZ_SIGNATURE_V4_ISSUER_KID = "receiz.v4.prod.2026-03-02";
var FLAG_PAYLOAD_VERSION_V1 = 1 << 0;
var FLAG_TS_STORED = 1 << 1;
var FLAG_TS_DISPLAY_DERIVED = 1 << 2;
var FLAG_TS_DISPLAY_STORED = 1 << 3;
var FLAG_VERIFY_URL_BASE = 1 << 4;
var FLAG_VERIFY_URL_ANCHORED = 1 << 5;
var FLAG_VERIFY_URL_STORED = 1 << 6;
var FLAG_KAI_KLOK_STORED = 1 << 7;
var FLAG_TZ_MINUTES_PRESENT = 1 << 8;
var FLAG_SIGNER_KEY_ID_PRESENT = 1 << 9;
var FLAG_ANCHOR_ID_PRESENT = 1 << 10;
var FLAG_ZK_POSEIDON_HASH_PRESENT = 1 << 11;
var FLAG_GROTH16_DIGEST_PRESENT = 1 << 12;
var FLAG_ARTIFACT_BASIS_PRESENT = 1 << 13;
var FLAG_WIREPROOF_PRESENT = 1 << 14;
var FLAG_WIREPROOF_PATH_STORED = 1 << 15;
var FLAG_SIGNATURE_V4_PRESENT = 1 << 16;
var FLAG_SIGNATURE_V4_ISSUER_KID_STORED = 1 << 17;
var textEncoder8 = new TextEncoder();
var textDecoder6 = new TextDecoder();
function proofBundleForReceizVLink(bundle) {
  const slim = { ...bundle };
  delete slim.groth16Proof;
  delete slim.signatureV3;
  return slim;
}
function finiteInteger(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}
function routeVerifyPath(route) {
  return `/v/${route.slug}/${route.code.trim().toUpperCase()}/${route.pulse.trim()}`;
}
function routeFromBundle(bundle) {
  return {
    slug: bundle.slug,
    code: bundle.code,
    pulse: bundle.kaiPulseEternal
  };
}
function tsFromSlug(slug) {
  const match = slug.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
function ts24ToTs12(ts24) {
  const match = ts24.trim().match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, datePart, hourRaw, minute] = match;
  const hour = Number.parseInt(hourRaw, 10);
  if (!Number.isFinite(hour)) return null;
  const ampm = hour >= 12 ? "PM" : "AM";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${datePart} ${h12}:${minute} ${ampm}`;
}
function kaiKlokFromPulse(pulse) {
  try {
    return buildKaiKlockResponseFromPulseSync(BigInt(pulse.trim())).compressed_summary;
  } catch {
    return null;
  }
}
function hexToBytes(hex, expectedBytes) {
  const normalized = hex.trim().toLowerCase();
  if (!new RegExp(`^[0-9a-f]{${expectedBytes * 2}}$`).test(normalized)) return null;
  const out = new Uint8Array(expectedBytes);
  for (let i = 0; i < expectedBytes; i += 1) {
    out[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function b64uToFixedBytes(value, expectedBytes) {
  try {
    const bytes = base64UrlDecode(value);
    return bytes.byteLength === expectedBytes ? bytes : null;
  } catch {
    return null;
  }
}
function canWriteU48(value) {
  return value !== null && Number.isSafeInteger(value) && value >= 0 && value <= 281474976710655;
}
var ByteWriter = class {
  constructor() {
    this.chunks = [];
  }
  writeU8(value) {
    this.chunks.push(value & 255);
  }
  writeU16(value) {
    this.chunks.push(value >>> 8 & 255, value & 255);
  }
  writeI16(value) {
    const wrapped = value < 0 ? 65536 + value : value;
    this.writeU16(wrapped);
  }
  writeU32(value) {
    this.chunks.push(value >>> 24 & 255, value >>> 16 & 255, value >>> 8 & 255, value & 255);
  }
  writeU48(value) {
    let remaining = value;
    const bytes = new Uint8Array(6);
    for (let i = 5; i >= 0; i -= 1) {
      bytes[i] = remaining & 255;
      remaining = Math.floor(remaining / 256);
    }
    this.writeBytes(bytes);
  }
  writeVarUint(value) {
    let remaining = value >>> 0;
    while (remaining >= 128) {
      this.writeU8(remaining & 127 | 128);
      remaining >>>= 7;
    }
    this.writeU8(remaining);
  }
  writeBytes(bytes) {
    for (const byte of bytes) this.chunks.push(byte);
  }
  writeText(value) {
    const bytes = textEncoder8.encode(value);
    this.writeVarUint(bytes.byteLength);
    this.writeBytes(bytes);
  }
  toUint8Array() {
    return Uint8Array.from(this.chunks);
  }
};
function compactSignatureV4(signature) {
  if (!signature) return null;
  return [
    signature.signedAtMs,
    signature.payloadHashSha256,
    signature.sig,
    [
      signature.cert.certId,
      signature.cert.issuerKid,
      signature.cert.subjectPublicKeyRawB64u,
      signature.cert.issuedAtMs,
      signature.cert.expiresAtMs,
      signature.cert.sig
    ]
  ];
}
function compactWireproof(bundle) {
  if (!bundle.wireproof) return null;
  return [bundle.wireproof.anchorId, bundle.wireproof.claimHashSha256, bundle.wireproof.verifierPath];
}
function compactProofBundleFields(bundle) {
  const slim = proofBundleForReceizVLink(bundle);
  const compact = [
    slim.nativeRecordSeal ? "rpb2" : "rpb1",
    slim.payloadVersion,
    slim.createdAtMs,
    slim.ts,
    slim.tsDisplay ?? "",
    typeof slim.tzMinutesEast === "number" ? slim.tzMinutesEast : null,
    slim.verifyUrl,
    slim.kaiKlok,
    slim.signerKeyId ?? "",
    slim.anchorId ?? "",
    slim.receizClaimId,
    slim.sigilClaimSeed,
    slim.zkPoseidonHash ?? "",
    slim.groth16ProofDigest ?? "",
    slim.artifactSha256Basis ?? "",
    compactWireproof(slim),
    compactSignatureV4(slim.signatureV4),
    slim.artifactBasis?.normalization ?? ""
  ];
  if (slim.nativeCapture || slim.nativeCaptureSource || slim.nativeCaptureClaim) {
    compact.push(slim.nativeCapture ?? null, slim.nativeCaptureSource ?? null, slim.nativeCaptureClaim ?? null);
  }
  if (slim.pbiAuthorshipHistory) {
    while (compact.length < 21) compact.push(null);
    compact.push(slim.pbiAuthorshipHistory);
  }
  if (slim.nativeRecordSeal) {
    while (compact.length < 22) compact.push(null);
    compact.push(slim.nativeRecordSeal);
  }
  return compact;
}
function writeHex(writer, value, expectedBytes) {
  const bytes = hexToBytes(value, expectedBytes);
  if (!bytes) return false;
  writer.writeBytes(bytes);
  return true;
}
function writeB64uBytes(writer, value, expectedBytes) {
  const bytes = b64uToFixedBytes(value, expectedBytes);
  if (!bytes) return false;
  writer.writeBytes(bytes);
  return true;
}
function binaryVerifyUrlMode(bundle, route) {
  const basePath = routeVerifyPath(route);
  const baseUrl = `${RECEIZ_PUBLIC_ORIGIN}${basePath}`;
  if (bundle.verifyUrl === baseUrl) return FLAG_VERIFY_URL_BASE;
  if (bundle.anchorId && bundle.verifyUrl === `${baseUrl}?a=${bundle.anchorId}&ms=${bundle.createdAtMs}`) {
    return FLAG_VERIFY_URL_ANCHORED;
  }
  return FLAG_VERIFY_URL_STORED;
}
function buildBinaryCompactReceizProofToken(bundle) {
  const slim = proofBundleForReceizVLink(bundle);
  if (slim.artifactBasis || slim.nativeCapture || slim.nativeCaptureSource || slim.nativeCaptureClaim || slim.pbiAuthorshipHistory || slim.nativeRecordSeal) return null;
  const route = routeFromBundle(slim);
  const routeTs = tsFromSlug(route.slug);
  const derivedTsDisplay = ts24ToTs12(slim.ts);
  const derivedKaiKlok = kaiKlokFromPulse(route.pulse);
  const createdAtMs = finiteInteger(slim.createdAtMs);
  const signature = slim.signatureV4;
  if (!canWriteU48(createdAtMs)) return null;
  if (!hexToBytes(slim.receizClaimId, 16)) return null;
  if (!hexToBytes(slim.sigilClaimSeed, 32)) return null;
  let flags = 0;
  if (slim.payloadVersion === "v1") flags |= FLAG_PAYLOAD_VERSION_V1;
  if (slim.ts !== routeTs) flags |= FLAG_TS_STORED;
  if (typeof slim.tsDisplay === "string" && slim.tsDisplay.length > 0) {
    flags |= slim.tsDisplay === derivedTsDisplay ? FLAG_TS_DISPLAY_DERIVED : FLAG_TS_DISPLAY_STORED;
  }
  if (typeof slim.tzMinutesEast === "number" && Number.isFinite(slim.tzMinutesEast)) {
    const tz = Math.trunc(slim.tzMinutesEast);
    if (tz < -32768 || tz > 32767) return null;
    flags |= FLAG_TZ_MINUTES_PRESENT;
  }
  flags |= binaryVerifyUrlMode(slim, route);
  if (slim.kaiKlok !== derivedKaiKlok) flags |= FLAG_KAI_KLOK_STORED;
  if (slim.signerKeyId) {
    if (!hexToBytes(slim.signerKeyId, 6)) return null;
    flags |= FLAG_SIGNER_KEY_ID_PRESENT;
  }
  if (slim.anchorId) {
    if (!hexToBytes(slim.anchorId, 4)) return null;
    flags |= FLAG_ANCHOR_ID_PRESENT;
  }
  if (slim.zkPoseidonHash) {
    if (!hexToBytes(slim.zkPoseidonHash, 32)) return null;
    flags |= FLAG_ZK_POSEIDON_HASH_PRESENT;
  }
  if (slim.groth16ProofDigest) {
    if (!hexToBytes(slim.groth16ProofDigest, 32)) return null;
    flags |= FLAG_GROTH16_DIGEST_PRESENT;
  }
  if (slim.artifactSha256Basis) {
    if (!hexToBytes(slim.artifactSha256Basis, 32)) return null;
    flags |= FLAG_ARTIFACT_BASIS_PRESENT;
  }
  if (slim.wireproof) {
    if (!hexToBytes(slim.wireproof.anchorId, 4) || !hexToBytes(slim.wireproof.claimHashSha256, 32)) return null;
    flags |= FLAG_WIREPROOF_PRESENT;
    if (slim.wireproof.verifierPath !== `${routeVerifyPath(route)}?a=${slim.wireproof.anchorId}&ms=${slim.createdAtMs}`) {
      flags |= FLAG_WIREPROOF_PATH_STORED;
    }
  }
  if (signature) {
    if (signature.version !== 1 || signature.alg !== "Ed25519" || signature.cert.version !== 1 || signature.cert.certType !== "receiz.device.v1" || signature.cert.alg !== "Ed25519" || !canWriteU48(finiteInteger(signature.signedAtMs)) || !canWriteU48(finiteInteger(signature.cert.issuedAtMs)) || !canWriteU48(finiteInteger(signature.cert.expiresAtMs)) || !hexToBytes(signature.payloadHashSha256, 32) || !b64uToFixedBytes(signature.sig, 64) || !hexToBytes(signature.cert.certId, 16) || !b64uToFixedBytes(signature.cert.subjectPublicKeyRawB64u, 32) || !b64uToFixedBytes(signature.cert.sig, 64)) {
      return null;
    }
    flags |= FLAG_SIGNATURE_V4_PRESENT;
    if (signature.cert.issuerKid !== DEFAULT_RECEIZ_SIGNATURE_V4_ISSUER_KID) {
      flags |= FLAG_SIGNATURE_V4_ISSUER_KID_STORED;
    }
  }
  const writer = new ByteWriter();
  writer.writeU8(BINARY_COMPACT_RECEIZ_V_LINK_VERSION);
  writer.writeVarUint(flags);
  writer.writeU48(createdAtMs);
  if (flags & FLAG_TS_STORED) writer.writeText(slim.ts);
  if (flags & FLAG_TS_DISPLAY_STORED) writer.writeText(slim.tsDisplay ?? "");
  if (flags & FLAG_TZ_MINUTES_PRESENT) writer.writeI16(Math.trunc(slim.tzMinutesEast ?? 0));
  if (flags & FLAG_VERIFY_URL_STORED) writer.writeText(slim.verifyUrl);
  if (flags & FLAG_KAI_KLOK_STORED) writer.writeText(slim.kaiKlok);
  if (flags & FLAG_SIGNER_KEY_ID_PRESENT && !writeHex(writer, slim.signerKeyId ?? "", 6)) return null;
  if (flags & FLAG_ANCHOR_ID_PRESENT && !writeHex(writer, slim.anchorId ?? "", 4)) return null;
  if (!writeHex(writer, slim.receizClaimId, 16)) return null;
  if (!writeHex(writer, slim.sigilClaimSeed, 32)) return null;
  if (flags & FLAG_ZK_POSEIDON_HASH_PRESENT && !writeHex(writer, slim.zkPoseidonHash ?? "", 32)) return null;
  if (flags & FLAG_GROTH16_DIGEST_PRESENT && !writeHex(writer, slim.groth16ProofDigest ?? "", 32)) return null;
  if (flags & FLAG_ARTIFACT_BASIS_PRESENT && !writeHex(writer, slim.artifactSha256Basis ?? "", 32)) return null;
  if (slim.wireproof) {
    if (!writeHex(writer, slim.wireproof.anchorId, 4)) return null;
    if (!writeHex(writer, slim.wireproof.claimHashSha256, 32)) return null;
    if (flags & FLAG_WIREPROOF_PATH_STORED) writer.writeText(slim.wireproof.verifierPath);
  }
  if (signature) {
    writer.writeU48(Math.trunc(signature.signedAtMs));
    if (!writeB64uBytes(writer, signature.sig, 64)) return null;
    if (flags & FLAG_SIGNATURE_V4_ISSUER_KID_STORED) writer.writeText(signature.cert.issuerKid);
    if (!writeB64uBytes(writer, signature.cert.subjectPublicKeyRawB64u, 32)) return null;
    writer.writeU48(Math.trunc(signature.cert.issuedAtMs));
    writer.writeU48(Math.trunc(signature.cert.expiresAtMs));
    if (!writeB64uBytes(writer, signature.cert.sig, 64)) return null;
  }
  const bytes = writer.toUint8Array();
  if (bytes.byteLength > MAX_COMPACT_RECEIZ_V_LINK_BYTES) return null;
  return base64UrlEncode(bytes);
}
function buildCompactReceizProofToken(bundle) {
  const binary = buildBinaryCompactReceizProofToken(bundle);
  const raw = textEncoder8.encode(JSON.stringify(compactProofBundleFields(bundle)));
  if (raw.byteLength > MAX_COMPACT_RECEIZ_V_LINK_JSON_BYTES) {
    throw new Error("Compact Receiz proof token too large.");
  }
  const compressed = deflateSync(raw, { level: 9 });
  if (compressed.byteLength > MAX_COMPACT_RECEIZ_V_LINK_BYTES) {
    throw new Error("Compact Receiz proof token too large.");
  }
  const legacy = `${bundle.nativeRecordSeal ? COMPACT_RECEIZ_V_LINK_V2_PREFIX : COMPACT_RECEIZ_V_LINK_PREFIX}${base64UrlEncode(compressed)}`;
  return binary && binary.length < legacy.length ? binary : legacy;
}
function buildProofBearingReceizVPath(args) {
  const token = buildCompactReceizProofToken(args.proofBundle);
  const url = new URL(args.verifyPath, "https://receiz.local");
  url.searchParams.delete("p");
  url.searchParams.delete("a");
  url.searchParams.delete("ms");
  url.searchParams.set("c", token);
  return `${url.pathname}${url.search}${url.hash}`;
}
function buildProofBearingReceizVPathFromBundle(bundle) {
  return buildProofBearingReceizVPath({
    verifyPath: anchoredReceizVerifyPathFromBundle(bundle) || bundle.verifyPath,
    proofBundle: bundle
  });
}

// app/utils/dataUrl.ts
var BASE64_BODY_RE = /^[A-Za-z0-9+/=\s]+$/;
function isBase64DataUrl(value) {
  const raw = value.trim();
  if (!raw.toLowerCase().startsWith("data:")) return false;
  const commaIndex = raw.indexOf(",");
  if (commaIndex <= 4 || commaIndex >= raw.length - 1) return false;
  const header = raw.slice(5, commaIndex);
  const tokens = header.split(";").map((token) => token.trim().toLowerCase());
  if (!tokens.some((token) => token === "base64")) return false;
  const payload = raw.slice(commaIndex + 1).replace(/\s+/g, "");
  return payload.length > 0 && BASE64_BODY_RE.test(payload);
}

// app/lib/profile/originalStorage.ts
var PROFILE_ORIGINALS_PUBLIC_BUCKET = "receiz-profile-originals";
var PROFILE_ORIGINALS_PRIVATE_BUCKET = "receiz-profile-originals-private";
var SAFE_STORAGE_OBJECT_PATH_RE = /^[A-Za-z0-9/_\-.]+$/;
var OWNER_STORAGE_PATHNAME = "/api/profile/originals/storage";
function parseProfileOriginalStorageBucket(value) {
  const bucket = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!bucket) return null;
  if (bucket === PROFILE_ORIGINALS_PUBLIC_BUCKET) return PROFILE_ORIGINALS_PUBLIC_BUCKET;
  if (bucket === PROFILE_ORIGINALS_PRIVATE_BUCKET) return PROFILE_ORIGINALS_PRIVATE_BUCKET;
  return null;
}
function normalizeProfileOriginalStoragePath(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const normalized = raw.replace(/^\/+/, "");
  if (!normalized || normalized.length > 1024) return null;
  if (!SAFE_STORAGE_OBJECT_PATH_RE.test(normalized)) return null;
  if (normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
  return normalized;
}
function coerceProfileOriginalStorageRef(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value;
  const bucket = parseProfileOriginalStorageBucket(row.bucket);
  const path = normalizeProfileOriginalStoragePath(row.path);
  if (!bucket || !path) return null;
  return { bucket, path };
}
function coerceProfileOriginalStorageVariantMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 16) return null;
  const out = {};
  for (const [rawWidth, rawRef] of entries) {
    const width = Number.parseInt(rawWidth, 10);
    if (!Number.isFinite(width) || !Number.isSafeInteger(width) || width < 64 || width > 4096) {
      return null;
    }
    const ref = coerceProfileOriginalStorageRef(rawRef);
    if (!ref) return null;
    out[String(width)] = ref;
  }
  return Object.keys(out).length > 0 ? out : null;
}
function parseUrlLike(value) {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return raw.startsWith("/") ? new URL(raw, "https://receiz.local") : new URL(raw);
  } catch {
    return null;
  }
}
function parseProfileOriginalOwnerStorageUrl(value) {
  const parsed = parseUrlLike(value);
  if (!parsed || parsed.pathname !== OWNER_STORAGE_PATHNAME) return null;
  const bucket = parseProfileOriginalStorageBucket(parsed.searchParams.get("bucket"));
  const path = normalizeProfileOriginalStoragePath(parsed.searchParams.get("path"));
  if (!bucket || !path) return null;
  return { bucket, path };
}
function coerceProfileOriginalStorageRefFromAny(value) {
  if (typeof value === "string") {
    return parseProfileOriginalOwnerStorageUrl(value) ?? parseLegacyProfileOriginalPublicUrl(value);
  }
  return coerceProfileOriginalStorageRef(value);
}
function coerceProfileOriginalStorageVariantMapFromAny(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 16) return null;
  const out = {};
  for (const [rawWidth, rawValue] of entries) {
    const width = Number.parseInt(rawWidth, 10);
    if (!Number.isFinite(width) || !Number.isSafeInteger(width) || width < 64 || width > 4096) {
      return null;
    }
    const ref = coerceProfileOriginalStorageRefFromAny(rawValue);
    if (!ref) return null;
    out[String(width)] = ref;
  }
  return Object.keys(out).length > 0 ? out : null;
}
function parsePublicStorageHostCandidates() {
  const hosts = /* @__PURE__ */ new Set();
  const environment = typeof process !== "undefined" && process?.env ? process.env : {};
  const candidates = [environment.SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    const raw = (candidate || "").trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      hosts.add(parsed.host.toLowerCase());
      if (parsed.host.includes(".supabase.")) {
        hosts.add(parsed.host.replace(".supabase.", ".storage.supabase.").toLowerCase());
      }
    } catch {
    }
  }
  return hosts;
}
var PUBLIC_STORAGE_HOSTS = parsePublicStorageHostCandidates();
var PUBLIC_STORAGE_PATH_RE = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
function publicStorageBaseUrl() {
  const environment = typeof process !== "undefined" && process?.env ? process.env : {};
  const candidates = [environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_URL];
  for (const candidate of candidates) {
    const raw = (candidate || "").trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      return parsed.origin.replace(/\/+$/, "");
    } catch {
    }
  }
  return null;
}
var PUBLIC_STORAGE_BASE_URL = publicStorageBaseUrl();
function parseLegacyProfileOriginalPublicUrl(value) {
  const raw = value.trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!PUBLIC_STORAGE_HOSTS.has(parsed.host.toLowerCase())) return null;
  const match = parsed.pathname.match(PUBLIC_STORAGE_PATH_RE);
  if (!match) return null;
  const bucket = parseProfileOriginalStorageBucket(match[1] ?? "");
  if (!bucket) return null;
  try {
    const path = normalizeProfileOriginalStoragePath(decodeURIComponent(match[2] ?? ""));
    if (!path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

// app/lib/profile/longForm.ts
var PROFILE_LONG_FORM_TITLE_MAX_CHARS = 160;
var PROFILE_LONG_FORM_TEXT_MAX_CHARS = 1e5;
var HEX64_RE5 = /^[0-9a-f]{64}$/;
function normalizeProfileLongFormTitle(value) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}
function normalizeProfileLongFormText(value) {
  return (value ?? "").replace(/\r\n?/g, "\n").trim();
}
function countProfileLongFormWords(value) {
  const normalized = normalizeProfileLongFormText(value);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}
function coerceProfileOriginalLongForm(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const text = normalizeProfileLongFormText(typeof record.text === "string" ? record.text : "");
  if (!text || text.length > PROFILE_LONG_FORM_TEXT_MAX_CHARS) return null;
  const title = normalizeProfileLongFormTitle(typeof record.title === "string" ? record.title : null);
  if (title && title.length > PROFILE_LONG_FORM_TITLE_MAX_CHARS) return null;
  const sha256Hex3 = typeof record.sha256Hex === "string" ? record.sha256Hex.trim().toLowerCase() : "";
  if (!HEX64_RE5.test(sha256Hex3)) return null;
  const rawWordCount = record.wordCount;
  const wordCount = typeof rawWordCount === "number" && Number.isFinite(rawWordCount) && rawWordCount >= 0 ? Math.trunc(rawWordCount) : countProfileLongFormWords(text);
  return {
    title,
    text,
    sha256Hex: sha256Hex3,
    wordCount
  };
}

// app/utils/receizAnchorBundle.ts
var RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY = "receiz_anchor_bundle";
var CONTEXT_PRESETS = /* @__PURE__ */ new Set(["Deposit", "Milestone", "Handoff", "Condition", "Agreement", "Delivery", "Custom"]);
var MAX_DOWNLOAD_LIMIT = 1e6;
var MAX_DOWNLOAD_PRICE_CENTS = 1e6;
var AUDIO_RELEASE_TYPES = /* @__PURE__ */ new Set(["single", "ep", "album", "mixtape", "live"]);
var PROOF_ATTACHMENT_ROLES = /* @__PURE__ */ new Set(["source", "appendix", "dataset", "contract", "receipt", "research", "other"]);
var SIGNAL_RUN_SUBJECT_ART_MAX_DATA_URL_CHARS = 6 * 1024 * 1024;
function isHex64(value) {
  return /^[0-9a-f]{64}$/.test(value);
}
function isHttpUrl(value) {
  const raw = value.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
function isSafeRelativeUrl(value) {
  const raw = value.trim();
  return raw.startsWith("/") && !raw.startsWith("//");
}
function isAllowedMediaUrl(value) {
  const raw = value.trim();
  if (!raw) return false;
  if (coerceProfileOriginalStorageRefFromAny(raw)) return true;
  if (isHttpUrl(raw) || isSafeRelativeUrl(raw)) return true;
  return false;
}
function coerceReceizAnchorSignalRunSubjectArt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const art = value;
  const imageDataUrl = typeof art.imageDataUrl === "string" ? art.imageDataUrl.trim() : "";
  if (art.schema !== "receiz.signal_run.card.generated_art.v1" || typeof art.collectibleId !== "string" || !art.collectibleId.trim() || typeof art.claimHash !== "string" || !isHex64(art.claimHash.trim().toLowerCase()) || typeof art.renderId !== "string" || !art.renderId.trim() || typeof art.subjectName !== "string" || !art.subjectName.trim() || art.subjectKind !== "character" && art.subjectKind !== "utility" && art.subjectKind !== "relic" && art.subjectKind !== "field" || typeof art.provider !== "string" || !art.provider.trim() || typeof art.model !== "string" || !art.model.trim() || art.mime !== "image/png" || typeof art.sha256Hex !== "string" || !isHex64(art.sha256Hex.trim().toLowerCase()) || typeof art.promptHash !== "string" || !isHex64(art.promptHash.trim().toLowerCase()) || imageDataUrl.length > SIGNAL_RUN_SUBJECT_ART_MAX_DATA_URL_CHARS || !imageDataUrl.toLowerCase().startsWith("data:image/png;") || !isBase64DataUrl(imageDataUrl) || typeof art.createdAtMs !== "number" || !Number.isFinite(art.createdAtMs) || art.createdAtMs < 1) {
    return null;
  }
  return {
    schema: "receiz.signal_run.card.generated_art.v1",
    collectibleId: art.collectibleId.trim(),
    claimHash: art.claimHash.trim().toLowerCase(),
    renderId: art.renderId.trim(),
    subjectName: art.subjectName.trim(),
    subjectKind: art.subjectKind,
    provider: art.provider.trim(),
    model: art.model.trim(),
    mime: "image/png",
    sha256Hex: art.sha256Hex.trim().toLowerCase(),
    promptHash: art.promptHash.trim().toLowerCase(),
    imageDataUrl,
    createdAtMs: art.createdAtMs
  };
}
function validReceizAnchorProofAttachments(value) {
  if (value === void 0) return true;
  if (!Array.isArray(value) || value.length > 200) return false;
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const attachment = raw;
    const id = typeof attachment.id === "string" ? attachment.id.trim() : "";
    const role = typeof attachment.role === "string" ? attachment.role.trim() : "";
    const name = typeof attachment.name === "string" ? attachment.name.trim() : "";
    const mime = typeof attachment.mime === "string" ? attachment.mime.trim() : "";
    const sha256Hex3 = typeof attachment.sha256Hex === "string" ? attachment.sha256Hex.trim().toLowerCase() : "";
    const size = typeof attachment.size === "number" ? attachment.size : Number.NaN;
    const url = typeof attachment.url === "string" ? attachment.url.trim() : "";
    const storageBucket = attachment.storageBucket;
    const storagePath = attachment.storagePath;
    const hasStorageRef = storageBucket !== void 0 || storagePath !== void 0;
    const storageRef = coerceProfileOriginalStorageRef({ bucket: storageBucket, path: storagePath });
    const createdAt = typeof attachment.createdAt === "string" ? attachment.createdAt.trim() : "";
    const downloadName = typeof attachment.downloadName === "string" ? attachment.downloadName.trim() : "";
    const description = typeof attachment.description === "string" ? attachment.description.trim() : "";
    if (!id || id.length > 120 || !PROOF_ATTACHMENT_ROLES.has(role) || !name || name.length > 160 || !mime || mime.length > 120 || !Number.isFinite(size) || size < 0 || !isHex64(sha256Hex3) || !url && !storageRef || url && !isAllowedMediaUrl(url) || hasStorageRef && !storageRef || !createdAt || !Number.isFinite(Date.parse(createdAt)) || downloadName.length > 160 || description.length > 140) {
      return false;
    }
  }
  return true;
}
function coerceReceizAnchorBundle(value) {
    if (!value || typeof value !== "object")
        return null;
    const v = value;
    if (v.version !== 1 || !v.parent || typeof v.parent !== "object")
        return null;
    if (typeof v.parent.code !== "string" || typeof v.parent.pulse !== "string" || typeof v.parent.viewUrl !== "string") {
        return null;
    }
    if (typeof v.anchorId !== "string" || !/^[0-9a-f]{8}$/.test(v.anchorId))
        return null;
    if (typeof v.anchoredAt !== "string")
        return null;
    if (v.contextPreset !== undefined && (typeof v.contextPreset !== "string" || !CONTEXT_PRESETS.has(v.contextPreset)))
        return null;
    if (v.claim) {
        if (typeof v.claim.text !== "string" || typeof v.claim.sha256Hex !== "string" || !isHex64(v.claim.sha256Hex)) {
            return null;
        }
        const sealedRecordProofBundleRaw = v.claim.sealedRecordProofBundle;
        const sealedRecordProofBundle = sealedRecordProofBundleRaw === undefined ? undefined : coerceReceizProofBundle(sealedRecordProofBundleRaw);
        if (sealedRecordProofBundleRaw !== undefined && !sealedRecordProofBundle) {
            return null;
        }
        const longForm = coerceProfileOriginalLongForm(v.claim.longForm);
        if (v.claim.longForm !== undefined && !longForm) {
            return null;
        }
        if (!validReceizAnchorProofAttachments(v.claim.proofAttachments)) {
            return null;
        }
        if (Array.isArray(v.claim.attachments)) {
            for (const att of v.claim.attachments) {
                if (!att || typeof att !== "object")
                    return null;
                const attachment = att;
                if (typeof attachment.name !== "string" || typeof attachment.mime !== "string")
                    return null;
                if (attachment.path !== undefined && typeof attachment.path !== "string")
                    return null;
                if (typeof attachment.size !== "number" || !Number.isFinite(attachment.size))
                    return null;
                if (typeof attachment.dataUrl !== "string" || !isBase64DataUrl(attachment.dataUrl))
                    return null;
            }
        }
    }
    if (v.file) {
        const dataUrl = v.file.dataUrl;
        const url = v.file.url;
        const storageRef = coerceProfileOriginalStorageRef({
            bucket: v.file.storageBucket,
            path: v.file.storagePath,
        });
        const allowOriginalDownload = v.file.allowOriginalDownload;
        const allowDerivativeDownload = v.file.allowDerivativeDownload;
        const allowMomentRecordDownload = v.file.allowMomentRecordDownload;
        const allowCopyDownload = v.file.allowCopyDownload;
        const gateAudioPlayback = v.file.gateAudioPlayback;
        const originalDownloadLimit = v.file.originalDownloadLimit;
        const derivativeDownloadLimit = v.file.derivativeDownloadLimit;
        const originalDownloadPriceCents = v.file.originalDownloadPriceCents;
        const derivativeDownloadPriceCents = v.file.derivativeDownloadPriceCents;
        const receizMs = v.file.receizMs;
        const receizTzMinutesEast = v.file.receizTzMinutesEast;
        const sealedName = v.file.sealedName;
        const sealedSize = v.file.sealedSize;
        const sealedMime = v.file.sealedMime;
        const sealedSha256Hex = v.file.sealedSha256Hex;
        const sealedUrl = v.file.sealedUrl;
        const sealedStorageRef = coerceProfileOriginalStorageRef({
            bucket: v.file.sealedStorageBucket,
            path: v.file.sealedStoragePath,
        });
        const sealedVerifyPath = v.file.sealedVerifyPath;
        const sealedCode = v.file.sealedCode;
        const sealedPulse = v.file.sealedPulse;
        const sealedTs = v.file.sealedTs;
        const sealedKind = v.file.sealedKind;
        const materialProofUrl = v.file.materialProofUrl;
        const materialPayloadSha256Hex = v.file.materialPayloadSha256Hex;
        const sealedProofBundleRaw = v.file.sealedProofBundle;
        const sealedProofBundle = sealedProofBundleRaw === undefined ? undefined : coerceReceizProofBundle(sealedProofBundleRaw);
        const sealedRecordProofBundleRaw = v.file.sealedRecordProofBundle;
        const sealedRecordProofBundle = sealedRecordProofBundleRaw === undefined ? undefined : coerceReceizProofBundle(sealedRecordProofBundleRaw);
        const sealedSubjectArtRaw = v.file.sealedSubjectArt;
        const sealedSubjectArt = sealedSubjectArtRaw === undefined ? undefined : coerceReceizAnchorSignalRunSubjectArt(sealedSubjectArtRaw);
        const playbackUrl = v.file.playbackUrl;
        const playbackStorageRef = coerceProfileOriginalStorageRef({
            bucket: v.file.playbackStorageBucket,
            path: v.file.playbackStoragePath,
        });
        const playbackMime = v.file.playbackMime;
        const playbackKind = v.file.playbackKind;
        const playbackReadyAt = v.file.playbackReadyAt;
        const audioCoverDataUrl = v.file.audioCoverDataUrl;
        const audioCoverUrl = v.file.audioCoverUrl;
        const audioCoverStorageRef = coerceProfileOriginalStorageRef({
            bucket: v.file.audioCoverStorageBucket,
            path: v.file.audioCoverStoragePath,
        });
        const audioCoverName = v.file.audioCoverName;
        const audioCoverMime = v.file.audioCoverMime;
        const audioCoverSize = v.file.audioCoverSize;
        const audioCoverSha256Hex = v.file.audioCoverSha256Hex;
        const audioCoverImageVariantStorage = v.file.audioCoverImageVariantStorage;
        const epubCoverDataUrl = v.file.epubCoverDataUrl;
        const epubCoverUrl = v.file.epubCoverUrl;
        const epubCoverStorageRef = coerceProfileOriginalStorageRef({
            bucket: v.file.epubCoverStorageBucket,
            path: v.file.epubCoverStoragePath,
        });
        const epubCoverName = v.file.epubCoverName;
        const epubCoverMime = v.file.epubCoverMime;
        const epubCoverSize = v.file.epubCoverSize;
        const epubCoverSha256Hex = v.file.epubCoverSha256Hex;
        const epubCoverImageVariantStorage = v.file.epubCoverImageVariantStorage;
        const imageVariantStorage = v.file.imageVariantStorage;
        const videoPosterUrl = v.file.videoPosterUrl;
        const videoPosterStorageRef = coerceProfileOriginalStorageRef({
            bucket: v.file.videoPosterStorageBucket,
            path: v.file.videoPosterStoragePath,
        });
        const videoPosterImageVariants = v.file.videoPosterImageVariants;
        const videoPosterImageVariantStorage = v.file.videoPosterImageVariantStorage;
        const epubTitle = v.file.epubTitle;
        const epubSubtitle = v.file.epubSubtitle;
        const epubPrimaryAuthor = v.file.epubPrimaryAuthor;
        const epubContributors = v.file.epubContributors;
        const epubPublisher = v.file.epubPublisher;
        const epubImprint = v.file.epubImprint;
        const epubGenre = v.file.epubGenre;
        const epubLanguage = v.file.epubLanguage;
        const epubIsbn = v.file.epubIsbn;
        const epubEdition = v.file.epubEdition;
        const epubSeries = v.file.epubSeries;
        const audioReleaseTitle = v.file.audioReleaseTitle;
        const audioPrimaryArtist = v.file.audioPrimaryArtist;
        const audioReleaseType = v.file.audioReleaseType;
        const audioGenre = v.file.audioGenre;
        const audioSubgenre = v.file.audioSubgenre;
        const audioExplicit = v.file.audioExplicit;
        const audioIsrc = v.file.audioIsrc;
        const audioWriters = v.file.audioWriters;
        const audioProducer = v.file.audioProducer;
        const audioLabel = v.file.audioLabel;
        const audioReleaseDate = v.file.audioReleaseDate;
        const audioTerritories = v.file.audioTerritories;
        const proofAttachments = v.file.proofAttachments;
        const validDataUrl = dataUrl === undefined || (typeof dataUrl === "string" && isBase64DataUrl(dataUrl));
        const validUrl = url === undefined || (typeof url === "string" && isAllowedMediaUrl(url));
        const validStorageRef = v.file.storageBucket === undefined &&
            v.file.storagePath === undefined
            ? true
            : storageRef !== null;
        const validAllowOriginalDownload = allowOriginalDownload === undefined || typeof allowOriginalDownload === "boolean";
        const validAllowDerivativeDownload = allowDerivativeDownload === undefined || typeof allowDerivativeDownload === "boolean";
        const validAllowMomentRecordDownload = allowMomentRecordDownload === undefined || typeof allowMomentRecordDownload === "boolean";
        const validAllowCopyDownload = allowCopyDownload === undefined || typeof allowCopyDownload === "boolean";
        const validGateAudioPlayback = gateAudioPlayback === undefined || typeof gateAudioPlayback === "boolean";
        const validOriginalDownloadLimit = originalDownloadLimit === undefined ||
            (typeof originalDownloadLimit === "number" &&
                Number.isFinite(originalDownloadLimit) &&
                Number.isInteger(originalDownloadLimit) &&
                originalDownloadLimit >= 1 &&
                originalDownloadLimit <= MAX_DOWNLOAD_LIMIT);
        const validDerivativeDownloadLimit = derivativeDownloadLimit === undefined ||
            (typeof derivativeDownloadLimit === "number" &&
                Number.isFinite(derivativeDownloadLimit) &&
                Number.isInteger(derivativeDownloadLimit) &&
                derivativeDownloadLimit >= 1 &&
                derivativeDownloadLimit <= MAX_DOWNLOAD_LIMIT);
        const validOriginalDownloadPriceCents = originalDownloadPriceCents === undefined ||
            (typeof originalDownloadPriceCents === "number" &&
                Number.isFinite(originalDownloadPriceCents) &&
                Number.isInteger(originalDownloadPriceCents) &&
                originalDownloadPriceCents >= 1 &&
                originalDownloadPriceCents <= MAX_DOWNLOAD_PRICE_CENTS);
        const validDerivativeDownloadPriceCents = derivativeDownloadPriceCents === undefined ||
            (typeof derivativeDownloadPriceCents === "number" &&
                Number.isFinite(derivativeDownloadPriceCents) &&
                Number.isInteger(derivativeDownloadPriceCents) &&
                derivativeDownloadPriceCents >= 1 &&
                derivativeDownloadPriceCents <= MAX_DOWNLOAD_PRICE_CENTS);
        const validReceizMs = receizMs === undefined || (typeof receizMs === "string" && /^\d{1,20}$/.test(receizMs));
        const validReceizTzMinutesEast = receizTzMinutesEast === undefined ||
            (typeof receizTzMinutesEast === "number" &&
                Number.isFinite(receizTzMinutesEast) &&
                receizTzMinutesEast >= -840 &&
                receizTzMinutesEast <= 840);
        const validSealedName = sealedName === undefined || typeof sealedName === "string";
        const validSealedSize = sealedSize === undefined || (typeof sealedSize === "number" && Number.isFinite(sealedSize) && sealedSize >= 0);
        const validSealedMime = sealedMime === undefined || typeof sealedMime === "string";
        const validSealedSha256Hex = sealedSha256Hex === undefined || (typeof sealedSha256Hex === "string" && isHex64(sealedSha256Hex));
        const validSealedUrl = sealedUrl === undefined || (typeof sealedUrl === "string" && isAllowedMediaUrl(sealedUrl));
        const validSealedStorageRef = v.file.sealedStorageBucket === undefined &&
            v.file.sealedStoragePath === undefined
            ? true
            : sealedStorageRef !== null;
        const validSealedVerifyPath = sealedVerifyPath === undefined || typeof sealedVerifyPath === "string";
        const validSealedCode = sealedCode === undefined || typeof sealedCode === "string";
        const validSealedPulse = sealedPulse === undefined || typeof sealedPulse === "string";
        const validSealedTs = sealedTs === undefined || typeof sealedTs === "string";
        const validSealedKind = sealedKind === undefined || typeof sealedKind === "string";
        const validMaterialProofUrl = materialProofUrl === undefined || (typeof materialProofUrl === "string" && isAllowedMediaUrl(materialProofUrl));
        const validMaterialPayloadSha256Hex = materialPayloadSha256Hex === undefined || (typeof materialPayloadSha256Hex === "string" && isHex64(materialPayloadSha256Hex));
        const validSealedProofBundle = sealedProofBundleRaw === undefined || !!sealedProofBundle;
        const validSealedRecordProofBundle = sealedRecordProofBundleRaw === undefined || !!sealedRecordProofBundle;
        const validSealedSubjectArt = sealedSubjectArtRaw === undefined || !!sealedSubjectArt;
        const validPlaybackUrl = playbackUrl === undefined || (typeof playbackUrl === "string" && isAllowedMediaUrl(playbackUrl));
        const validPlaybackStorageRef = v.file.playbackStorageBucket === undefined &&
            v.file.playbackStoragePath === undefined
            ? true
            : playbackStorageRef !== null;
        const validPlaybackMime = playbackMime === undefined || typeof playbackMime === "string";
        const validPlaybackKind = playbackKind === undefined || playbackKind === "hls" || playbackKind === "mp4";
        const validPlaybackReadyAt = playbackReadyAt === undefined || typeof playbackReadyAt === "string";
        const validAudioCoverDataUrl = audioCoverDataUrl === undefined || (typeof audioCoverDataUrl === "string" && isBase64DataUrl(audioCoverDataUrl));
        const validAudioCoverUrl = audioCoverUrl === undefined || (typeof audioCoverUrl === "string" && isAllowedMediaUrl(audioCoverUrl));
        const validAudioCoverStorageRef = v.file.audioCoverStorageBucket === undefined &&
            v.file.audioCoverStoragePath === undefined
            ? true
            : audioCoverStorageRef !== null;
        const validAudioCoverName = audioCoverName === undefined || typeof audioCoverName === "string";
        const validAudioCoverMime = audioCoverMime === undefined || typeof audioCoverMime === "string";
        const validAudioCoverSize = audioCoverSize === undefined ||
            (typeof audioCoverSize === "number" && Number.isFinite(audioCoverSize) && audioCoverSize >= 0);
        const validAudioCoverSha256Hex = audioCoverSha256Hex === undefined || (typeof audioCoverSha256Hex === "string" && isHex64(audioCoverSha256Hex));
        const validAudioCoverImageVariantStorage = audioCoverImageVariantStorage === undefined || coerceProfileOriginalStorageVariantMap(audioCoverImageVariantStorage) !== null;
        const validEpubCoverDataUrl = epubCoverDataUrl === undefined || (typeof epubCoverDataUrl === "string" && isBase64DataUrl(epubCoverDataUrl));
        const validEpubCoverUrl = epubCoverUrl === undefined || (typeof epubCoverUrl === "string" && isAllowedMediaUrl(epubCoverUrl));
        const validEpubCoverStorageRef = v.file.epubCoverStorageBucket === undefined &&
            v.file.epubCoverStoragePath === undefined
            ? true
            : epubCoverStorageRef !== null;
        const validEpubCoverName = epubCoverName === undefined || typeof epubCoverName === "string";
        const validEpubCoverMime = epubCoverMime === undefined || typeof epubCoverMime === "string";
        const validEpubCoverSize = epubCoverSize === undefined ||
            (typeof epubCoverSize === "number" && Number.isFinite(epubCoverSize) && epubCoverSize >= 0);
        const validEpubCoverSha256Hex = epubCoverSha256Hex === undefined || (typeof epubCoverSha256Hex === "string" && isHex64(epubCoverSha256Hex));
        const validEpubCoverImageVariantStorage = epubCoverImageVariantStorage === undefined || coerceProfileOriginalStorageVariantMap(epubCoverImageVariantStorage) !== null;
        const validImageVariantStorage = imageVariantStorage === undefined || coerceProfileOriginalStorageVariantMapFromAny(imageVariantStorage) !== null;
        const validVideoPosterUrl = videoPosterUrl === undefined || (typeof videoPosterUrl === "string" && isAllowedMediaUrl(videoPosterUrl));
        const validVideoPosterStorageRef = v.file.videoPosterStorageBucket === undefined &&
            v.file.videoPosterStoragePath === undefined
            ? true
            : videoPosterStorageRef !== null;
        const validVideoPosterImageVariants = videoPosterImageVariants === undefined ||
            (typeof videoPosterImageVariants === "object" &&
                !Array.isArray(videoPosterImageVariants) &&
                Object.values(videoPosterImageVariants).every((candidate) => typeof candidate === "string" && isAllowedMediaUrl(candidate)));
        const validVideoPosterImageVariantStorage = videoPosterImageVariantStorage === undefined ||
            coerceProfileOriginalStorageVariantMapFromAny(videoPosterImageVariantStorage) !== null;
        const validEpubTitle = epubTitle === undefined || typeof epubTitle === "string";
        const validEpubSubtitle = epubSubtitle === undefined || typeof epubSubtitle === "string";
        const validEpubPrimaryAuthor = epubPrimaryAuthor === undefined || typeof epubPrimaryAuthor === "string";
        const validEpubContributors = epubContributors === undefined || typeof epubContributors === "string";
        const validEpubPublisher = epubPublisher === undefined || typeof epubPublisher === "string";
        const validEpubImprint = epubImprint === undefined || typeof epubImprint === "string";
        const validEpubGenre = epubGenre === undefined || typeof epubGenre === "string";
        const validEpubLanguage = epubLanguage === undefined || typeof epubLanguage === "string";
        const validEpubIsbn = epubIsbn === undefined || typeof epubIsbn === "string";
        const validEpubEdition = epubEdition === undefined || typeof epubEdition === "string";
        const validEpubSeries = epubSeries === undefined || typeof epubSeries === "string";
        const validAudioReleaseTitle = audioReleaseTitle === undefined || typeof audioReleaseTitle === "string";
        const validAudioPrimaryArtist = audioPrimaryArtist === undefined || typeof audioPrimaryArtist === "string";
        const validAudioReleaseType = audioReleaseType === undefined ||
            (typeof audioReleaseType === "string" && AUDIO_RELEASE_TYPES.has(audioReleaseType));
        const validAudioGenre = audioGenre === undefined || typeof audioGenre === "string";
        const validAudioSubgenre = audioSubgenre === undefined || typeof audioSubgenre === "string";
        const validAudioExplicit = audioExplicit === undefined || typeof audioExplicit === "boolean";
        const validAudioIsrc = audioIsrc === undefined || typeof audioIsrc === "string";
        const validAudioWriters = audioWriters === undefined || typeof audioWriters === "string";
        const validAudioProducer = audioProducer === undefined || typeof audioProducer === "string";
        const validAudioLabel = audioLabel === undefined || typeof audioLabel === "string";
        const validAudioReleaseDate = audioReleaseDate === undefined || (typeof audioReleaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(audioReleaseDate));
        const validAudioTerritories = audioTerritories === undefined || typeof audioTerritories === "string";
        const validProofAttachments = validReceizAnchorProofAttachments(proofAttachments);
        if (typeof v.file.name !== "string" ||
            typeof v.file.mime !== "string" ||
            typeof v.file.size !== "number" ||
            !Number.isFinite(v.file.size) ||
            typeof v.file.sha256Hex !== "string" ||
            !isHex64(v.file.sha256Hex) ||
            (dataUrl === undefined &&
                url === undefined &&
                storageRef === null &&
                sealedUrl === undefined &&
                sealedStorageRef === null &&
                sealedProofBundle === undefined &&
                sealedRecordProofBundle === undefined &&
                materialProofUrl === undefined) ||
            !validDataUrl ||
            !validUrl ||
            !validStorageRef ||
            !validAllowOriginalDownload ||
            !validAllowDerivativeDownload ||
            !validAllowMomentRecordDownload ||
            !validAllowCopyDownload ||
            !validGateAudioPlayback ||
            !validOriginalDownloadLimit ||
            !validDerivativeDownloadLimit ||
            !validOriginalDownloadPriceCents ||
            !validDerivativeDownloadPriceCents ||
            !validReceizMs ||
            !validReceizTzMinutesEast ||
            !validSealedName ||
            !validSealedSize ||
            !validSealedMime ||
            !validSealedSha256Hex ||
            !validSealedUrl ||
            !validSealedStorageRef ||
            !validSealedVerifyPath ||
            !validSealedCode ||
            !validSealedPulse ||
            !validSealedTs ||
            !validSealedKind ||
            !validMaterialProofUrl ||
            !validMaterialPayloadSha256Hex ||
            !validSealedProofBundle ||
            !validSealedRecordProofBundle ||
            !validSealedSubjectArt ||
            !validPlaybackUrl ||
            !validPlaybackStorageRef ||
            !validPlaybackMime ||
            !validPlaybackKind ||
            !validPlaybackReadyAt ||
            !validAudioCoverDataUrl ||
            !validAudioCoverUrl ||
            !validAudioCoverStorageRef ||
            !validAudioCoverName ||
            !validAudioCoverMime ||
            !validAudioCoverSize ||
            !validAudioCoverSha256Hex ||
            !validAudioCoverImageVariantStorage ||
            !validEpubCoverDataUrl ||
            !validEpubCoverUrl ||
            !validEpubCoverStorageRef ||
            !validEpubCoverName ||
            !validEpubCoverMime ||
            !validEpubCoverSize ||
            !validEpubCoverSha256Hex ||
            !validEpubCoverImageVariantStorage ||
            !validImageVariantStorage ||
            !validVideoPosterUrl ||
            !validVideoPosterStorageRef ||
            !validVideoPosterImageVariants ||
            !validVideoPosterImageVariantStorage ||
            !validEpubTitle ||
            !validEpubSubtitle ||
            !validEpubPrimaryAuthor ||
            !validEpubContributors ||
            !validEpubPublisher ||
            !validEpubImprint ||
            !validEpubGenre ||
            !validEpubLanguage ||
            !validEpubIsbn ||
            !validEpubEdition ||
            !validEpubSeries ||
            !validAudioReleaseTitle ||
            !validAudioPrimaryArtist ||
            !validAudioReleaseType ||
            !validAudioGenre ||
            !validAudioSubgenre ||
            !validAudioExplicit ||
            !validAudioIsrc ||
            !validAudioWriters ||
            !validAudioProducer ||
            !validAudioLabel ||
            !validAudioReleaseDate ||
            !validAudioTerritories ||
            !validProofAttachments) {
            return null;
        }
    }
    return {
        version: 1,
        parent: { code: v.parent.code, pulse: v.parent.pulse, viewUrl: v.parent.viewUrl },
        anchorId: v.anchorId,
        anchoredAt: v.anchoredAt,
        ...(v.contextPreset ? { contextPreset: v.contextPreset } : {}),
        ...(v.claim ? { claim: v.claim } : {}),
        ...(v.file ? { file: v.file } : {}),
    };
}
function decodeReceizAnchorBundle(raw) {
  try {
    return coerceReceizAnchorBundle(JSON.parse(raw));
  } catch {
    return null;
  }
}

// packages/receiz-sdk/src/errors.ts
var PRIVATE_KEY_RE = /-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/gi;
var AUTHORIZATION_RE = /\bauthorization\s*:\s*(?:bearer\s+)?[^\s,;]+/gi;
var BEARER_RE = /\bbearer\s+[^\s,;]+/gi;
var SECRET_FIELD_RE = /\b(access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?secret|webhook[_-]?secret|receiz[_-]?key)\s*[:=]\s*[^\s,;]+/gi;
var JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
function sanitizeReceizErrorMessage(message) {
  return message.replace(PRIVATE_KEY_RE, "[REDACTED]").replace(AUTHORIZATION_RE, "Authorization: [REDACTED]").replace(BEARER_RE, "Bearer [REDACTED]").replace(SECRET_FIELD_RE, "$1=[REDACTED]").replace(JWT_RE, "[REDACTED]");
}
function inferredRail(code) {
  if (code.includes("continuity")) return "continuity";
  if (code.includes("identity") || code.includes("scope") || code.includes("unauthorized")) return "identity";
  if (code.includes("ownership")) return "ownership";
  if (code.includes("settlement")) return "settlement";
  if (code.includes("webhook")) return "webhook";
  if (code.includes("compiler") || code.includes("contract") || code.includes("project")) return "compiler";
  if (code.includes("proof") || code.includes("artifact")) return "proof";
  return "sdk";
}
function inferredRepair(code) {
  if (code === "missing_scope") return "Request the missing delegated scope through Receiz Connect.";
  if (code.includes("continuity")) return "Recreate the proof object through authenticated Receiz Record and Seal continuity.";
  if (code.startsWith("http_5")) return "Retry the same idempotent SDK operation after the Receiz service recovers.";
  if (code.startsWith("http_4")) return "Correct the request or delegated authorization before retrying.";
  if (code.includes("validation")) return "Correct the invalid fields and submit the same Receiz operation again.";
  return "Inspect the affected Receiz rail and retry only after correcting the reported condition.";
}
function descriptorFor(code, message, context = {}) {
  const rail = context.rail ?? inferredRail(code);
  const retryable = context.retryable ?? /^http_5\d\d$/.test(code);
  return {
    schema: "receiz.sdk.error.v1",
    code,
    message: sanitizeReceizErrorMessage(message),
    rail,
    retryable,
    ...context.missingScope ? { missingScope: context.missingScope } : {},
    documentationUrl: context.documentationUrl ?? "https://receiz.com/developers",
    suggestedRepair: context.suggestedRepair ?? inferredRepair(code),
    authorityBoundary: context.authorityBoundary ?? "sdk-mechanics-beneath-receiz-proof-object-truth"
  };
}
var ReceizError = class extends Error {
  constructor(code, message, context = {}) {
    const descriptor = descriptorFor(code, message, context);
    super(descriptor.message);
    this.name = "ReceizError";
    this.code = code;
    this.descriptor = descriptor;
  }
};

// packages/receiz-sdk/src/portableAsset.ts
var ReceizPortableAssetError = class extends ReceizError {
  constructor(code) {
    super(code, code, { rail: "continuity", retryable: false });
    this.name = "ReceizPortableAssetError";
  }
};
var ASSET_TYPES = /* @__PURE__ */ new Set([
  "proof_object",
  "sports_card",
  "signal_card",
  "wallet_note",
  "reserve_funding",
  "market_certificate",
  "profile_original",
  "document"
]);
var HEX64_RE6 = /^[0-9a-f]{64}$/;
var B64URL_RE = /^[A-Za-z0-9_-]*$/;
var OWNER_RECEIZ_ID_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
var OWNERSHIP_APPEND_TYPE = "receiz.ownership.bearer-claim.v108";
function isRecord3(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
  if (isRecord3(value)) {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== void 0).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new ReceizPortableAssetError("continuity_round_trip_failed");
}
function nonempty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function base64UrlDecode2(value) {
  if (!B64URL_RE.test(value)) throw new ReceizPortableAssetError("continuity_payload_missing");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new ReceizPortableAssetError("continuity_payload_missing");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
async function sha256Hex2(bytes) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function parseOwnership(value) {
  if (!isRecord3(value)) throw new ReceizPortableAssetError("continuity_ownership_missing");
  const ownerReceizId = nonempty(value.ownerReceizId);
  const custody = nonempty(value.custody);
  const proofRef = nonempty(value.proofRef);
  if (!ownerReceizId || !custody || !proofRef) throw new ReceizPortableAssetError("continuity_ownership_missing");
  return { ownerReceizId, custody, proofRef };
}
function parseProvenance(value) {
  if (!isRecord3(value)) throw new ReceizPortableAssetError("continuity_provenance_missing");
  const root = nonempty(value.root);
  if (!root || !Array.isArray(value.appends)) throw new ReceizPortableAssetError("continuity_provenance_missing");
  if (value.appends.some((append) => !isRecord3(append))) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }
  return {
    root,
    appends: value.appends.map((append) => ({ ...append }))
  };
}
function parseSettlement(value) {
  if (!isRecord3(value) || !nonempty(value.state)) {
    throw new ReceizPortableAssetError("continuity_settlement_missing");
  }
  return { ...value };
}
async function parseReceizPortableAssetDocument(value) {
  if (!isRecord3(value) || value.schema !== "receiz.portable_asset.v1") {
    throw new ReceizPortableAssetError("continuity_schema_unsupported");
  }
  if (typeof value.assetType !== "string" || !ASSET_TYPES.has(value.assetType)) {
    throw new ReceizPortableAssetError("continuity_schema_unsupported");
  }
  if (!isRecord3(value.payload)) throw new ReceizPortableAssetError("continuity_payload_missing");
  const mimeType = nonempty(value.payload.mimeType);
  const bytesBase64Url = typeof value.payload.bytesBase64Url === "string" ? value.payload.bytesBase64Url : null;
  const claimedSha256 = typeof value.payload.sha256 === "string" ? value.payload.sha256.trim().toLowerCase() : "";
  if (!mimeType || bytesBase64Url === null || !HEX64_RE6.test(claimedSha256)) {
    throw new ReceizPortableAssetError("continuity_payload_missing");
  }
  const payloadBytes = base64UrlDecode2(bytesBase64Url);
  if (await sha256Hex2(payloadBytes) !== claimedSha256) {
    throw new ReceizPortableAssetError("continuity_media_unbound");
  }
  return {
    schema: "receiz.portable_asset.v1",
    assetType: value.assetType,
    payload: { mimeType, bytesBase64Url, sha256: claimedSha256 },
    ownership: parseOwnership(value.ownership),
    provenance: parseProvenance(value.provenance),
    settlement: parseSettlement(value.settlement)
  };
}
function canonicalOwnerReceizId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return OWNER_RECEIZ_ID_RE.test(normalized) ? normalized : null;
}
async function ownershipHistoryDigest(value) {
  return sha256Hex2(new TextEncoder().encode(canonicalize(value)));
}
async function deriveReceizPortableOwnershipContinuity(document2) {
  const parsed = await parseReceizPortableAssetDocument(document2);
  const currentOwnerReceizId = canonicalOwnerReceizId(parsed.ownership.ownerReceizId);
  if (!currentOwnerReceizId) throw new ReceizPortableAssetError("continuity_identity_mismatch");
  const provenanceAppends = parsed.provenance.appends;
  const headBearingAppends = provenanceAppends.filter(
    (append) => nonempty(append.priorHeadReference) !== null
  );
  const latestHeadBearingAppend = headBearingAppends.at(-1);
  if (parsed.ownership.proofRef === "genesis" && headBearingAppends.length !== 0 || parsed.ownership.proofRef !== "genesis" && (!latestHeadBearingAppend || nonempty(latestHeadBearingAppend.priorHeadReference) !== parsed.ownership.proofRef)) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }
  const ownershipAppends = parsed.provenance.appends.filter(
    (append) => append.type === OWNERSHIP_APPEND_TYPE
  );
  const firstAppend = ownershipAppends[0];
  const genesisOwnerReceizId = firstAppend ? canonicalOwnerReceizId(firstAppend.fromOwnerReceizId) : currentOwnerReceizId;
  if (!genesisOwnerReceizId) throw new ReceizPortableAssetError("continuity_identity_mismatch");
  let expectedOwnerReceizId = genesisOwnerReceizId;
  let historyDigestSha256 = await ownershipHistoryDigest({
    schema: "receiz.ownership.genesis.v1",
    artifactId: parsed.payload.sha256,
    namespace: parsed.provenance.root,
    ownerReceizId: genesisOwnerReceizId
  });
  const seenPriorHeads = /* @__PURE__ */ new Set();
  const seenSourceArtifacts = /* @__PURE__ */ new Set();
  for (const append of ownershipAppends) {
    const fromOwnerReceizId = canonicalOwnerReceizId(append.fromOwnerReceizId);
    const toOwnerReceizId = canonicalOwnerReceizId(append.toOwnerReceizId);
    const priorHeadReference = nonempty(append.priorHeadReference);
    const sourceArtifactSha256 = typeof append.sourceArtifactSha256 === "string" ? append.sourceArtifactSha256.trim().toLowerCase() : "";
    const priorHistoryDigestSha256 = typeof append.priorHistoryDigestSha256 === "string" ? append.priorHistoryDigestSha256.trim().toLowerCase() : "";
    if (!fromOwnerReceizId || fromOwnerReceizId !== expectedOwnerReceizId || !toOwnerReceizId || !priorHeadReference || priorHeadReference === "genesis" || seenPriorHeads.has(priorHeadReference) || !HEX64_RE6.test(sourceArtifactSha256) || seenSourceArtifacts.has(sourceArtifactSha256) || priorHistoryDigestSha256 !== historyDigestSha256) {
      throw new ReceizPortableAssetError("continuity_append_mismatch");
    }
    historyDigestSha256 = await ownershipHistoryDigest({
      schema: "receiz.ownership.append.v1",
      priorHistoryDigestSha256,
      sourceArtifactSha256,
      priorHeadReference,
      fromOwnerReceizId,
      toOwnerReceizId
    });
    seenPriorHeads.add(priorHeadReference);
    seenSourceArtifacts.add(sourceArtifactSha256);
    expectedOwnerReceizId = toOwnerReceizId;
  }
  if (expectedOwnerReceizId !== currentOwnerReceizId) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }
  return Object.freeze({
    artifactId: parsed.payload.sha256,
    namespace: parsed.provenance.root,
    genesisOwnerReceizId,
    ownerReceizId: currentOwnerReceizId,
    historyDigestSha256,
    appendCount: ownershipAppends.length
  });
}

// zk/document_seal_verification_key.json
var document_seal_verification_key_default = {
  protocol: "groth16",
  curve: "bn128",
  nPublic: 2,
  vk_alpha_1: [
    "17123947097407990379025645011288213778460369895991245703402655578436069645446",
    "20509500679838607371109422927997099635358726228405831138188095760401158572026",
    "1"
  ],
  vk_beta_2: [
    [
      "3255880209934265239225608658538866619254909493046933133436528783160944338354",
      "17773209291801897751434474618417318898636701047860139897450302908631507855324"
    ],
    [
      "13766662292552086768362891211844647921585336375594763320044682629270311834447",
      "310240390936261512736270225006016674384829029816067442805496585599674628301"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_gamma_2: [
    [
      "10857046999023057135944570762232829481370756359578518086990519993285655852781",
      "11559732032986387107991004021392285783925812861821192530917403151452391805634"
    ],
    [
      "8495653923123431417604973247489272438418190587263600148770280649306958101930",
      "4082367875863433681332203403145435568316851327593401208105741076214120093531"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_delta_2: [
    [
      "9762766890822526098063786949548832675110566394137799490504676282636109316668",
      "7270107436776555682991221640575646484317599716683814072866544084432471893566"
    ],
    [
      "6182626746173415756026607479884155407320286612686998481708729251701760595988",
      "15230296179161856470514055092464171175164109258407428525505278409408908971073"
    ],
    [
      "1",
      "0"
    ]
  ],
  vk_alphabeta_12: [
    [
      [
        "400527482793528847265198866298224860378528822573752165296439033180573347066",
        "6201573211474845808267450859874265887329107457157747304789632684115794066499"
      ],
      [
        "7348049041549774293978947879154297054780644477882721913086936578455287227363",
        "8951041218167795543413293004196535799840307692179619827571589180415080111607"
      ],
      [
        "9323459383449362925767553456766095388037437748464808732433800182528566084095",
        "18232605928865636911608957997792784736680683584850120572629634268022958860815"
      ]
    ],
    [
      [
        "9435930399351602365244248101126079533182935067304493383359911507290114576335",
        "19218789354454752309533887735514393664424194914993074874287103852979183691710"
      ],
      [
        "14427947871574157021836846278889070286804535113700790840946158956515782627862",
        "9991047686116560590453450237385530244706244784549362990618042963811982116506"
      ],
      [
        "4061456464136088817397297270604754818647843733727040043606625483670349328098",
        "10779301097995182363675788306815599102204792255478038718011337722598649037067"
      ]
    ]
  ],
  IC: [
    [
      "13066516418247228680578889126443188816810920980838175479235149324530135947695",
      "16930846813749179827853803053218817131972669982377431816720830801304251806439",
      "1"
    ],
    [
      "20238339462277342361085584044749364856430155140027597617394025689321904986773",
      "9726251957132844579963007270484726921814528477627453683092453219376691607332",
      "1"
    ],
    [
      "9016807651198117747149972912557782098438743588791274892681153733652545685057",
      "1864345691766463292821114755028340919219755344099707195127102115619145723062",
      "1"
    ]
  ]
};

// packages/receiz-sdk/src/verifier/canonicalSource.ts
async function classifyReceizAssetContinuity(originalBytes, bundle) {
  const nativeRecordSeal = bundle?.nativeRecordSeal ?? null;
  const nativeContinuity = nativeRecordSeal?.ownershipContinuity ?? null;
  if (nativeRecordSeal && nativeContinuity && nativeContinuity.namespace.startsWith("receiz.native-proof:")) {
    const currentBasis = bundle?.artifactSha256Basis ?? "";
    if (nativeRecordSeal.payload.sha256 !== currentBasis) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    const verified = await verifyReceizNativeOwnershipContinuity({
      continuity: nativeContinuity,
      ownerReceizId: nativeRecordSeal.ownerReceizId,
      headReference: bundle?.receizClaimId ?? "",
      payloadSha256: currentBasis
    });
    if (!verified) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    return {
      state: "verified",
      carrier: "native_record_seal",
      issuerKid: bundle?.signatureV4?.cert.issuerKid ?? null,
      artifactId: nativeContinuity.artifactId,
      headReference: nativeContinuity.headReference,
      ownerReceizId: nativeContinuity.ownerReceizId,
      namespace: nativeContinuity.namespace,
      priorHeadReference: nativeContinuity.predecessor?.headReference ?? "genesis",
      genesisOwnerReceizId: nativeContinuity.genesisOwnerReceizId,
      historyDigestSha256: nativeContinuity.historyDigestSha256,
      appendCount: nativeContinuity.appendCount,
      history: nativeContinuity.history ?? [],
      historyComplete: Boolean(nativeContinuity.history),
      ...nativeRecordSeal.proofPredecessor ? { proofPredecessor: nativeRecordSeal.proofPredecessor } : {}
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(originalBytes));
  } catch {
    return { state: "not_applicable" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { state: "not_applicable" };
  const schema = parsed.schema;
  if (schema === "receiz.asset_manifest.v1") return { state: "historical_missing" };
  if (schema !== "receiz.portable_asset.v1") return { state: "not_applicable" };
  try {
    const document2 = await parseReceizPortableAssetDocument(parsed);
    const continuity = await deriveReceizPortableOwnershipContinuity(document2);
    const signedContinuity = nativeRecordSeal?.ownershipContinuity ?? null;
    if (nativeRecordSeal && nativeRecordSeal.ownerReceizId !== continuity.ownerReceizId) {
      return { state: "invalid", error: "continuity_identity_mismatch" };
    }
    if (continuity.appendCount > 0 && !signedContinuity) {
      return { state: "invalid", error: "continuity_ownership_attestation_missing" };
    }
    if (signedContinuity && (signedContinuity.artifactId !== continuity.artifactId || signedContinuity.namespace !== continuity.namespace || signedContinuity.genesisOwnerReceizId !== continuity.genesisOwnerReceizId || signedContinuity.ownerReceizId !== continuity.ownerReceizId || signedContinuity.headReference !== bundle?.receizClaimId || signedContinuity.historyDigestSha256 !== continuity.historyDigestSha256 || signedContinuity.appendCount !== continuity.appendCount)) {
      return { state: "invalid", error: "continuity_ownership_attestation_mismatch" };
    }
    return {
      state: "verified",
      carrier: "portable_asset",
      issuerKid: bundle?.signatureV4?.cert.issuerKid ?? null,
      artifactId: document2.payload.sha256,
      headReference: bundle?.receizClaimId ?? document2.payload.sha256,
      ownerReceizId: continuity.ownerReceizId,
      namespace: document2.provenance.root,
      priorHeadReference: document2.ownership.proofRef,
      genesisOwnerReceizId: continuity.genesisOwnerReceizId,
      historyDigestSha256: continuity.historyDigestSha256,
      appendCount: continuity.appendCount,
      history: projectPortableOwnershipHistory(document2, bundle?.receizClaimId ?? document2.payload.sha256, continuity.genesisOwnerReceizId, continuity.historyDigestSha256),
      historyComplete: true,
      document: document2
    };
  } catch (error) {
    return {
      state: "invalid",
      error: error instanceof ReceizPortableAssetError ? error.code : "continuity_round_trip_failed"
    };
  }
}
function projectPortableOwnershipHistory(document2, currentHeadReference, genesisOwnerReceizId, currentHistoryDigestSha256) {
  const ownershipAppends = document2.provenance.appends.filter((append) => append.type === "receiz.ownership.bearer-claim.v108");
  const first = ownershipAppends[0];
  const genesisHead = typeof first?.priorHeadReference === "string" ? first.priorHeadReference : "genesis";
  const genesisDigest = typeof first?.priorHistoryDigestSha256 === "string" ? first.priorHistoryDigestSha256 : currentHistoryDigestSha256;
  const history = [{ schema: "receiz.native_ownership_genesis.v1", index: 0, ownerReceizId: genesisOwnerReceizId, headReference: genesisHead, historyDigestSha256: genesisDigest }];
  ownershipAppends.forEach((append, index) => {
    const next = ownershipAppends[index + 1];
    history.push({ schema: "receiz.native_ownership_transfer.v1", index: index + 1, fromOwnerReceizId: String(append.fromOwnerReceizId), toOwnerReceizId: String(append.toOwnerReceizId), priorHeadReference: String(append.priorHeadReference), sourceArtifactSha256: String(append.sourceArtifactSha256), headReference: typeof next?.priorHeadReference === "string" ? next.priorHeadReference : currentHeadReference, historyDigestSha256: index === ownershipAppends.length - 1 ? currentHistoryDigestSha256 : String(next?.priorHistoryDigestSha256) });
  });
  return history;
}
var REAL_G16_CODEC = "g16";
var TRUSTED_SIGNATURE_MISSING_ERROR = "Trusted signature is required for trusted verification (signatureV4).";
var SIGNATURE_V4_UNAVAILABLE_ERROR = "signatureV4 root keys are unavailable in this verifier; trusted verification cannot continue.";
var SNARKJS_PUBLIC_SCRIPT_URL = "/snarkjs.min.js";
var groth16VerifyFnPromise = null;
var snarkjsScriptLoadPromise = null;
var groth16VerificationTail = Promise.resolve();
var verifiedDeterministicGroth16Closures = /* @__PURE__ */ new Map();
async function verifyGroth16WithExactWorkerCustody(verifyFn, verificationKey, publicSignals, proof) {
  const predecessor = groth16VerificationTail;
  let release;
  groth16VerificationTail = new Promise((resolve) => {
    release = resolve;
  });
  await predecessor;
  const runtime = globalThis;
  const priorBn128 = runtime.curve_bn128;
  const priorBls12381 = runtime.curve_bls12381;
  try {
    return await verifyFn(verificationKey, publicSignals, proof);
  } finally {
    try {
      const createdCurves = [
        runtime.curve_bn128 !== priorBn128 ? runtime.curve_bn128 : null,
        runtime.curve_bls12381 !== priorBls12381 ? runtime.curve_bls12381 : null
      ];
      for (const curve of createdCurves) {
        if (curve?.tm?.singleThread !== true) {
          await curve?.terminate?.();
        }
      }
    } finally {
      runtime.curve_bn128 = priorBn128;
      runtime.curve_bls12381 = priorBls12381;
      release();
    }
  }
}
function slugFromTs(ts) {
  return ts.replace(/-/g, "").replace(/:/g, "").replace(/ /g, "_");
}
function isHex(input, length) {
  return new RegExp(`^[0-9a-fA-F]{${length}}$`).test(input);
}
function asNonEmptyString5(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function deriveAnchorBundleFromProofBundle(bundle) {
  const anchorIdRaw = typeof bundle.anchorId === "string" ? bundle.anchorId.trim().toLowerCase() : "";
  if (!isHex(anchorIdRaw, 8)) return null;
  const code = asNonEmptyString5(bundle.code);
  const pulse = asNonEmptyString5(bundle.kaiPulseEternal);
  const verifyPath = asNonEmptyString5(bundle.verifyPath);
  if (!code || !pulse || !verifyPath) return null;
  const viewUrl = buildProofBearingReceizVPathFromBundle(bundle);
  return {
    version: 1,
    parent: {
      code,
      pulse,
      viewUrl
    },
    anchorId: anchorIdRaw,
    anchoredAt: new Date(bundle.createdAtMs).toISOString()
  };
}
function proofBearingAnchorProjection(anchor, derivedAnchor) {
  if (!anchor) return derivedAnchor;
  const proofBearingViewUrl = derivedAnchor?.parent.viewUrl;
  if (!proofBearingViewUrl) return anchor;
  return {
    ...anchor,
    parent: {
      ...anchor.parent,
      viewUrl: proofBearingViewUrl
    }
  };
}
function parseVerifyInputToPath(raw) {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = text.startsWith("/") ? new URL(text, "https://receiz.com") : new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
async function verifyDeterministicGroth16(bundle) {
  const zkPoseidonHash = typeof bundle.zkPoseidonHash === "string" ? bundle.zkPoseidonHash.trim() : "";
  const groth16Proof = bundle.groth16Proof;
  const groth16ProofDigestRaw = typeof bundle.groth16ProofDigest === "string" ? bundle.groth16ProofDigest.trim() : "";
  const groth16ProofDigest = groth16ProofDigestRaw.toLowerCase();
  if (!zkPoseidonHash || !groth16Proof || !groth16ProofDigestRaw) {
    return "Groth16 proof metadata is missing.";
  }
  if (!isHex(zkPoseidonHash, 64)) {
    return "zkPoseidonHash is not a 64-hex string.";
  }
  if (!isHex(groth16ProofDigestRaw, 64)) {
    return "groth16ProofDigest is not a 64-hex string.";
  }
  if (typeof groth16Proof !== "string" || groth16Proof.length === 0) {
    return "groth16Proof has invalid format.";
  }
  const [codec, payload] = groth16Proof.split(":", 2);
  if (codec !== REAL_G16_CODEC || !payload) {
    return "Only real g16: Groth16 proofs are accepted.";
  }
  let decoded;
  try {
    const raw = new TextDecoder().decode(base64UrlDecode(payload));
    decoded = JSON.parse(raw);
  } catch {
    return "Real Groth16 bundle could not be decoded.";
  }
  if (!decoded || typeof decoded !== "object") {
    return "Real Groth16 bundle payload is invalid.";
  }
  const row = decoded;
  if (row.v !== "receiz.g16.real.v1") {
    return "Unsupported real Groth16 bundle version.";
  }
  if (!Array.isArray(row.publicSignals) || row.publicSignals.length < 2) {
    return "Real Groth16 public signals are missing.";
  }
  const publicSignals = row.publicSignals.map((entry) => String(entry));
  const expectedDec = BigInt(`0x${zkPoseidonHash}`).toString();
  if (publicSignals[0] !== expectedDec || publicSignals[1] !== expectedDec) {
    return "Real Groth16 public signal mismatch for zkPoseidonHash.";
  }
  const digest = (await sha256Hex(groth16Proof)).toLowerCase();
  if (digest !== groth16ProofDigest) {
    return "Real Groth16 proof digest mismatch.";
  }
  const closureKey = [
    "receiz.document-seal.groth16-verifier.v1",
    groth16ProofDigest,
    zkPoseidonHash.toLowerCase()
  ].join(":");
  let verification = verifiedDeterministicGroth16Closures.get(closureKey);
  if (!verification) {
    verification = (async () => {
      const verifyFn = await loadGroth16VerifyFn();
      return Boolean(verifyFn) && verifyGroth16WithExactWorkerCustody(
        verifyFn,
        document_seal_verification_key_default,
        publicSignals,
        row.proof
      );
    })();
    verifiedDeterministicGroth16Closures.set(closureKey, verification);
  }
  try {
    const ok = await verification;
    if (!ok) {
      if (verifiedDeterministicGroth16Closures.get(closureKey) === verification) verifiedDeterministicGroth16Closures.delete(closureKey);
      return "Groth16 proof verification failed.";
    }
    return null;
  } catch (error) {
    if (verifiedDeterministicGroth16Closures.get(closureKey) === verification) verifiedDeterministicGroth16Closures.delete(closureKey);
    throw error;
  }
}
async function loadGroth16VerifyFn() {
  const browserFn = await browserGroth16VerifyFn();
  if (browserFn) return browserFn;
  if (!groth16VerifyFnPromise) {
    groth16VerifyFnPromise = import("snarkjs").then((mod) => {
      const row = mod;
      const maybe = row.groth16 ?? row.default?.groth16;
      if (!maybe || typeof maybe.verify !== "function") return null;
      return maybe.verify;
    }).catch(() => null);
  }
  const loaded = await groth16VerifyFnPromise;
  if (!loaded) {
    groth16VerifyFnPromise = null;
  }
  return loaded;
}
function browserGroth16VerifyFromWindow() {
  if (typeof window === "undefined") return null;
  const runtime = window.snarkjs?.groth16;
  if (!runtime || typeof runtime.verify !== "function") return null;
  return runtime.verify.bind(runtime);
}
async function browserGroth16VerifyFn() {
  const fromWindow = browserGroth16VerifyFromWindow();
  if (fromWindow) return fromWindow;
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!snarkjsScriptLoadPromise) {
    snarkjsScriptLoadPromise = new Promise((resolve, reject) => {
      const script = applyCspNonce(document.createElement("script"));
      script.src = SNARKJS_PUBLIC_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("snarkjs_script_load_failed"));
      document.head.appendChild(script);
    }).catch(() => void 0);
  }
  await snarkjsScriptLoadPromise;
  return browserGroth16VerifyFromWindow();
}
function buildInvalidResult(kind, errors, warnings) {
  return {
    ok: false,
    kind,
    errors,
    warnings,
    bundle: null,
    anchor: null,
    package: null
  };
}
function buildOperationalDenialResult(kind, code) {
  return {
    ok: false,
    kind,
    errors: [],
    warnings: [],
    bundle: null,
    anchor: null,
    package: null,
    denial: receizProtocolOperationalDenial(code)
  };
}
function zipEntryUncompressedSize(entry) {
  if (!entry || typeof entry !== "object") return null;
  const data = entry._data;
  if (!data) return null;
  const raw = data.uncompressedSize;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}
async function validateBundleAgainstBasis(args) {
  const errors = [];
  const warnings = [];
  const bundle = args.bundle;
  const derivedAnchor = deriveAnchorBundleFromProofBundle(bundle);
  const anchor = args.anchor ?? derivedAnchor;
  const code = asNonEmptyString5(bundle.code) ?? "";
  const pulse = asNonEmptyString5(bundle.kaiPulseEternal) ?? "";
  const slug = asNonEmptyString5(bundle.slug) ?? "";
  const ts = asNonEmptyString5(bundle.ts) ?? "";
  const verifyPath = asNonEmptyString5(bundle.verifyPath) ?? "";
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    errors.push("Bundle code must be 8 uppercase alphanumeric characters.");
  }
  if (!/^\d+$/.test(pulse)) {
    errors.push("Bundle pulse must contain only digits.");
  }
  if (ts && slug) {
    const expectedSlug = slugFromTs(ts);
    if (slug !== expectedSlug) {
      errors.push(`Slug mismatch. expected ${expectedSlug}, got ${slug}.`);
    }
  }
  if (slug && code && pulse) {
    const expectedPath = `/v/${slug}/${code}/${pulse}`;
    if (verifyPath !== expectedPath) {
      errors.push(`verifyPath mismatch. expected ${expectedPath}, got ${verifyPath}.`);
    }
  }
  if (bundle.verifyUrl) {
    try {
      const parsed = new URL(bundle.verifyUrl);
      const fromUrl = `${parsed.pathname}${parsed.search}`;
      const acceptedVerifyUrlPaths = /* @__PURE__ */ new Set();
      if (verifyPath) acceptedVerifyUrlPaths.add(verifyPath);
      const anchoredVerifyPath = buildAnchoredReceizVerifyPath({
        verifyPath,
        anchorId: bundle.anchorId,
        createdAtMs: bundle.createdAtMs
      });
      if (anchoredVerifyPath) acceptedVerifyUrlPaths.add(anchoredVerifyPath);
      try {
        const proofBearingVerifyPath = buildProofBearingReceizVPathFromBundle(bundle);
        if (proofBearingVerifyPath) acceptedVerifyUrlPaths.add(proofBearingVerifyPath);
      } catch {
      }
      if (anchor?.parent.viewUrl) acceptedVerifyUrlPaths.add(anchor.parent.viewUrl);
      if (bundle.wireproof?.verifierPath) acceptedVerifyUrlPaths.add(bundle.wireproof.verifierPath);
      if (verifyPath && !acceptedVerifyUrlPaths.has(fromUrl)) {
        warnings.push("verifyUrl path does not exactly match verifyPath.");
      }
    } catch {
      warnings.push("verifyUrl is not a valid URL.");
    }
  } else {
    warnings.push("verifyUrl is empty (path-only bundles are still valid offline).");
  }
  const artifactSha256Basis = typeof bundle.artifactSha256Basis === "string" ? bundle.artifactSha256Basis.trim().toLowerCase() : "";
  if (!artifactSha256Basis) {
    errors.push("Not an original sealed artifact (missing artifact binding). Ask for the original sealed artifact.");
  } else if (!isHex(artifactSha256Basis, 64)) {
    errors.push("Artifact binding field has invalid format.");
  } else {
    try {
      let computedBasis;
      if (args.basisSha256) {
        if (bundle.artifactBasis) {
          throw new Error("Precomputed artifact basis cannot bypass declared normalization.");
        }
        computedBasis = args.basisSha256.trim().toLowerCase();
        if (!isHex(computedBasis, 64)) {
          throw new Error("Precomputed artifact basis hash has invalid format.");
        }
      } else if (args.basisBytes) {
        const identityBasis = await artifactIdentityBasisBytes(bundle, args.basisBytes);
        computedBasis = (await sha256Hex(identityBasis)).toLowerCase();
      } else {
        throw new Error("Artifact basis bytes or hash are required.");
      }
      if (computedBasis !== artifactSha256Basis) {
        errors.push("Artifact binding mismatch");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Artifact basis normalization failed.");
    }
  }
  if (args.signingKey) {
    const signatureValid = await validateReceizBundleSignature({ bundle, signingKey: args.signingKey });
    if (!signatureValid) {
      errors.push("Bundle signature mismatch.");
    }
  }
  const rawSignatureV4 = bundle.signatureV4;
  const hasSignatureV4 = typeof rawSignatureV4 !== "undefined";
  const signatureV4 = await verifyReceizBundleSignatureV4({
    bundle,
    rootPublicKeys: args.signatureV4RootPublicKeys ?? null
  });
  const invalidSignatureErrors = [];
  if (hasSignatureV4 && signatureV4.state === "invalid") {
    invalidSignatureErrors.push(signatureV4.error ?? "signatureV4 verification failed.");
  }
  if (invalidSignatureErrors.length > 0) {
    for (const message of invalidSignatureErrors) {
      errors.push(message);
    }
  } else {
    if (signatureV4.state !== "verified") {
      if (hasSignatureV4 && signatureV4.state === "unavailable") {
        errors.push(signatureV4.error ?? SIGNATURE_V4_UNAVAILABLE_ERROR);
      } else {
        errors.push(TRUSTED_SIGNATURE_MISSING_ERROR);
      }
    }
  }
  if (anchor) {
    if (derivedAnchor && anchor.anchorId !== derivedAnchor.anchorId) {
      errors.push("Anchor ID mismatch between anchor bundle and proof bundle.");
    }
    if (anchor.parent.code !== code) {
      errors.push("Anchor parent.code does not match proof bundle code.");
    }
    if (anchor.parent.pulse !== pulse) {
      errors.push("Anchor parent.pulse does not match proof bundle pulse.");
    }
  } else {
    errors.push("Anchor data is required for trusted verification.");
  }
  const groth16Error = await verifyDeterministicGroth16(bundle);
  if (groth16Error) {
    errors.push(groth16Error);
  }
  const optionalLink = args.optionalLink?.trim() ?? "";
  if (optionalLink.length > 0) {
    const linkPath = parseVerifyInputToPath(optionalLink);
    if (!linkPath) {
      errors.push("Optional link could not be parsed.");
    } else {
      const acceptedPaths = /* @__PURE__ */ new Set();
      if (verifyPath) acceptedPaths.add(verifyPath);
      const optionalAnchoredVerifyPath = buildAnchoredReceizVerifyPath({
        verifyPath,
        anchorId: bundle.anchorId,
        createdAtMs: bundle.createdAtMs
      });
      if (optionalAnchoredVerifyPath) acceptedPaths.add(optionalAnchoredVerifyPath);
      try {
        const optionalProofBearingVerifyPath = buildProofBearingReceizVPathFromBundle(bundle);
        if (optionalProofBearingVerifyPath) acceptedPaths.add(optionalProofBearingVerifyPath);
      } catch {
      }
      if (derivedAnchor?.parent.viewUrl) acceptedPaths.add(derivedAnchor.parent.viewUrl);
      if (anchor?.parent.viewUrl) acceptedPaths.add(anchor.parent.viewUrl);
      if (bundle.wireproof?.verifierPath) acceptedPaths.add(bundle.wireproof.verifierPath);
      if (!acceptedPaths.has(linkPath)) {
        errors.push("Optional link does not match embedded canonical path.");
      }
    }
  }
  return { errors, warnings };
}
async function verifyReceizTrailerBundleDigest(args) {
  const bundle = coerceReceizProofBundle(args.bundle);
  if (!bundle) {
    return buildInvalidResult("trailer", ["Trailer proof bundle schema is invalid."], []);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisSha256: args.basisSha256,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  const result = {
    ok: checked.errors.length === 0,
    kind: "trailer",
    errors: checked.errors,
    warnings: checked.warnings,
    bundle,
    anchor,
    package: null,
    assetContinuity: await classifyReceizAssetContinuity(new Uint8Array(), bundle)
  };
  return {
    ...result,
    integrity: { ok: result.ok, errors: result.errors }
  };
}
function parseFolderManifestBytes(bytes) {
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return coerceReceizFolderPackageManifest(parsed);
}
function parsePackageRootManifestBytes(bytes) {
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return coerceReceizPackageRootManifest(parsed);
}
async function portableContinuityPayloadBytes(bytes) {
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  try {
    const document2 = await parseReceizPortableAssetDocument(parsed);
    return base64UrlDecode(document2.payload.bytesBase64Url);
  } catch {
    return null;
  }
}
function normalizePackagePath(path) {
  return normalizeReceizFolderPackagePath(path || "");
}
function findPackageFileByPath(fileMap, sealedPath) {
  const direct = fileMap.get(sealedPath);
  if (direct) return direct;
  let match = null;
  const suffix = `/${sealedPath}`;
  for (const file of fileMap.values()) {
    if (file.path.endsWith(suffix)) {
      if (match) return null;
      match = file;
    }
  }
  return match;
}
function pickFolderManifestCandidate(candidates) {
  const withScore = candidates.map((candidate) => {
    let score = 0;
    if (candidate.artifactPath.startsWith("_receiz/")) score += 200;
    if (candidate.artifactPath.includes("/_receiz/")) score += 100;
    if (candidate.artifactPath.includes("manifest")) score += 20;
    score += candidate.manifest.itemCount;
    return { candidate, score };
  });
  withScore.sort((a, b2) => b2.score - a.score || a.candidate.artifactPath.localeCompare(b2.candidate.artifactPath));
  return withScore[0].candidate;
}
function pickPackageRootManifestCandidate(candidates) {
  const withScore = candidates.map((candidate) => {
    let score = 0;
    if (candidate.artifactPath === "manifest.receizbundle") score += 300;
    if (!candidate.artifactPath.includes("/")) score += 120;
    if (candidate.artifactPath.includes("manifest")) score += 20;
    score += candidate.manifest.itemCount;
    return { candidate, score };
  });
  withScore.sort((a, b2) => b2.score - a.score || a.candidate.artifactPath.localeCompare(b2.candidate.artifactPath));
  return withScore[0].candidate;
}
function findFolderManifestCandidateByPath(candidates, path) {
  const normalized = normalizePackagePath(path);
  if (!normalized) return null;
  const direct = candidates.filter((candidate) => normalizePackagePath(candidate.artifactPath) === normalized);
  if (direct.length === 1) return direct[0] ?? null;
  if (direct.length > 1) return null;
  const suffix = `/${normalized}`;
  const suffixMatches = candidates.filter((candidate) => normalizePackagePath(candidate.artifactPath).endsWith(suffix));
  if (suffixMatches.length === 1) return suffixMatches[0] ?? null;
  return null;
}
async function tryVerifyFolderPackageFromFiles(args) {
  const fileMap = /* @__PURE__ */ new Map();
  for (const file of args.files) {
    const normalizedPath = normalizePackagePath(file.path);
    if (!normalizedPath) continue;
    fileMap.set(normalizedPath, { ...file, path: normalizedPath });
  }
  if (fileMap.size === 0) return null;
  const manifestCandidates = [];
  const rootManifestCandidates = [];
  for (const file of fileMap.values()) {
    const parsed = decodeReceizBundleEnvelope(file.bytes);
    if (!parsed) continue;
    const continuityPayload = await portableContinuityPayloadBytes(parsed.originalBytes);
    const manifestBytes = continuityPayload ?? parsed.originalBytes;
    const folderManifest = parseFolderManifestBytes(manifestBytes);
    if (folderManifest) {
      manifestCandidates.push({
        artifactPath: file.path,
        artifactBytes: file.bytes,
        manifest: folderManifest
      });
    }
    const rootManifest = parsePackageRootManifestBytes(manifestBytes);
    if (rootManifest) {
      rootManifestCandidates.push({
        artifactPath: file.path,
        artifactBytes: file.bytes,
        manifest: rootManifest
      });
    }
  }
  if (manifestCandidates.length === 0) return null;
  const errors = [];
  const warnings = [];
  let rootManifestCandidate = null;
  let rootManifestVerification = null;
  if (rootManifestCandidates.length > 0) {
    if (rootManifestCandidates.length > 1) {
      warnings.push("Multiple root package manifests found; using the highest-confidence manifest artifact.");
    }
    rootManifestCandidate = pickPackageRootManifestCandidate(rootManifestCandidates);
    const rootManifestResult = await verifyBundleArtifact({
      bytes: rootManifestCandidate.artifactBytes,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
    rootManifestVerification = rootManifestResult;
    if (!rootManifestResult.ok) {
      for (const err2 of rootManifestResult.errors) {
        errors.push(`Root manifest artifact: ${err2}`);
      }
    }
    for (const warning of rootManifestResult.warnings) {
      warnings.push(`Root manifest artifact: ${warning}`);
    }
    const declaredRootPaths = new Set(rootManifestCandidate.manifest.entries.map((entry) => normalizePackagePath(entry.path)));
    const matchedRootPaths = /* @__PURE__ */ new Set();
    for (const entry of rootManifestCandidate.manifest.entries) {
      const declaredPath = normalizePackagePath(entry.path);
      const file = findPackageFileByPath(fileMap, declaredPath);
      if (!file) {
        errors.push(`Root manifest missing file: ${declaredPath}`);
        continue;
      }
      matchedRootPaths.add(file.path);
      if (file.bytes.byteLength !== entry.size) {
        errors.push(`Root manifest size mismatch for ${declaredPath}. expected ${entry.size}, got ${file.bytes.byteLength}.`);
      }
      const digest = (await sha256Hex(file.bytes)).toLowerCase();
      if (digest !== entry.sha256.toLowerCase()) {
        errors.push(`Root manifest hash mismatch for ${declaredPath}.`);
      }
    }
    for (const file of fileMap.values()) {
      if (normalizePackagePath(file.path) === normalizePackagePath(rootManifestCandidate.artifactPath)) continue;
      if (!declaredRootPaths.has(file.path) && !matchedRootPaths.has(file.path)) {
        warnings.push(`Extra file not listed in root manifest: ${file.path}`);
      }
    }
  } else {
    warnings.push("Root package manifest proof bundle is missing (expected manifest.receizbundle).");
  }
  let candidate;
  if (rootManifestCandidate) {
    const declaredFolderManifestPath = normalizePackagePath(rootManifestCandidate.manifest.folderManifestPath);
    const declaredMatch = findFolderManifestCandidateByPath(manifestCandidates, declaredFolderManifestPath);
    if (!declaredFolderManifestPath) {
      errors.push("Root manifest folderManifestPath is empty.");
      candidate = pickFolderManifestCandidate(manifestCandidates);
    } else if (!declaredMatch) {
      errors.push(`Root manifest folderManifestPath does not match a sealed folder manifest artifact: ${declaredFolderManifestPath}`);
      candidate = pickFolderManifestCandidate(manifestCandidates);
    } else {
      candidate = declaredMatch;
    }
  } else {
    if (manifestCandidates.length > 1) {
      warnings.push("Multiple package manifests found; using the highest-confidence manifest artifact.");
    }
    candidate = pickFolderManifestCandidate(manifestCandidates);
  }
  const manifestResult = await verifyBundleArtifact({
    bytes: candidate.artifactBytes,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  if (!manifestResult.ok) {
    for (const err2 of manifestResult.errors) errors.push(`Manifest artifact: ${err2}`);
  }
  for (const warning of manifestResult.warnings) warnings.push(`Manifest artifact: ${warning}`);
  const itemResults = [];
  let verifiedCount = 0;
  let failedCount = 0;
  let missingCount = 0;
  const matchedPaths = /* @__PURE__ */ new Set();
  for (const manifestEntry of candidate.manifest.entries) {
    const sealedPath = normalizePackagePath(manifestEntry.sealedPath);
    const sourcePath = normalizePackagePath(manifestEntry.sourcePath);
    const sealedFile = findPackageFileByPath(fileMap, sealedPath);
    const itemErrors = [];
    const itemWarnings = [];
    if (!sealedFile) {
      missingCount += 1;
      itemErrors.push(`Missing sealed artifact: ${sealedPath}`);
      errors.push(`Missing sealed artifact listed in manifest: ${sealedPath}`);
      itemResults.push({
        sourcePath,
        sealedPath,
        ok: false,
        kind: "missing",
        errors: itemErrors,
        warnings: itemWarnings,
        code: manifestEntry.code,
        pulse: manifestEntry.pulse,
        ts: manifestEntry.ts
      });
      continue;
    }
    matchedPaths.add(sealedFile.path);
    const sealedSha256 = (await sha256Hex(sealedFile.bytes)).toLowerCase();
    if (sealedSha256 !== manifestEntry.sealedSha256.toLowerCase()) {
      itemErrors.push("Sealed artifact hash mismatch against package manifest.");
    }
    if (sealedFile.bytes.byteLength !== manifestEntry.sealedSize) {
      itemErrors.push(
        `Sealed artifact size mismatch. expected ${manifestEntry.sealedSize}, got ${sealedFile.bytes.byteLength}.`
      );
    }
    const sealedVerify = await verifyNativeReceizProofContinuity({
      fileBytes: sealedFile.bytes,
      filename: manifestEntry.sealedFilename,
      mime: sealedFile.mime ?? manifestEntry.sealedContentType,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
    if (sealedVerify.kind === "folder_package") {
      itemErrors.push("Nested folder packages are not valid sealed artifacts.");
    } else if (!sealedVerify.ok) {
      for (const err2 of sealedVerify.errors) itemErrors.push(err2);
    }
    for (const warning of sealedVerify.warnings) itemWarnings.push(warning);
    const bundle = sealedVerify.bundle;
    if (!bundle) {
      itemErrors.push("Missing proof bundle in sealed artifact.");
    } else {
      if ((bundle.code || "").toUpperCase() !== manifestEntry.code.toUpperCase()) {
        itemErrors.push(`Bundle code mismatch for ${sealedPath}.`);
      }
      if ((bundle.kaiPulseEternal || "") !== manifestEntry.pulse) {
        itemErrors.push(`Bundle pulse mismatch for ${sealedPath}.`);
      }
      if ((bundle.ts || "") !== manifestEntry.ts) {
        itemErrors.push(`Bundle timestamp mismatch for ${sealedPath}.`);
      }
      if ((bundle.verifyPath || "") !== manifestEntry.verifyPath) {
        itemErrors.push(`Bundle verifyPath mismatch for ${sealedPath}.`);
      }
      if ((bundle.artifactSha256Basis || "").toLowerCase() !== manifestEntry.basisSha256.toLowerCase()) {
        itemErrors.push(`Bundle artifact basis mismatch for ${sealedPath}.`);
      }
    }
    const itemOk = itemErrors.length === 0;
    if (itemOk) {
      verifiedCount += 1;
    } else {
      failedCount += 1;
      for (const err2 of itemErrors) errors.push(`${sealedPath}: ${err2}`);
    }
    itemResults.push({
      sourcePath,
      sealedPath,
      ok: itemOk,
      kind: sealedVerify.kind,
      errors: itemErrors,
      warnings: itemWarnings,
      code: manifestEntry.code,
      pulse: manifestEntry.pulse,
      ts: manifestEntry.ts
    });
  }
  const declaredPaths = new Set(candidate.manifest.entries.map((entry) => normalizePackagePath(entry.sealedPath)));
  for (const file of fileMap.values()) {
    if (!file.path.startsWith("sealed/")) continue;
    if (!declaredPaths.has(file.path) && !matchedPaths.has(file.path)) {
      warnings.push(`Extra sealed artifact not listed in manifest: ${file.path}`);
    }
  }
  const packageSummary = {
    manifest: candidate.manifest,
    manifestArtifactPath: candidate.artifactPath,
    manifestArtifactVerified: manifestResult.ok,
    itemCount: candidate.manifest.itemCount,
    verifiedCount,
    failedCount,
    missingCount,
    itemResults
  };
  if (errors.length === 0 && args.onVerifiedAuthority) {
    const selected = rootManifestCandidate ?? candidate;
    args.onVerifiedAuthority({
      artifactPath: selected.artifactPath,
      artifactBytes: selected.artifactBytes,
      basisBytes: decodeReceizBundleEnvelope(selected.artifactBytes).originalBytes
    });
  }
  return {
    ok: errors.length === 0,
    kind: "folder_package",
    errors,
    warnings,
    bundle: rootManifestVerification?.bundle ?? manifestResult.bundle,
    anchor: null,
    package: packageSummary,
    assetContinuity: rootManifestVerification?.assetContinuity ?? manifestResult.assetContinuity
  };
}
// Per-call host resource allowance; never read from proof or transport data.
function packageMaterializationGuard(capacity) {
  const exact = capacity?.maxExactArtifactBytes;
  const archive = capacity?.maxDecompressedArchiveBytes;
  const invalid = capacity && (!Number.isSafeInteger(exact) || exact < 1 || !Number.isSafeInteger(archive) || archive < 1);
  return (resource, observed) => {
    if (invalid) throw new ReceizProtocolLimitError("VERIFICATION_RESOURCE_UNAVAILABLE", "verification-runtime");
    if (!capacity) return assertReceizRuntimeMaterializationAvailable(resource, observed);
    const maximum = resource === "exactArtifactBytes" ? exact : archive;
    if (!Number.isSafeInteger(observed) || observed < 0 || observed > maximum) {
      throw new ReceizProtocolLimitError("VERIFICATION_RESOURCE_UNAVAILABLE", resource, observed, maximum);
    }
  };
}
async function extractGuardedZipEntries(args) {
  const assertMaterialization = packageMaterializationGuard(args.packageExecutionCapacity);
  try { assertMaterialization("exactArtifactBytes", args.bytes.byteLength); } catch (error) {
    if (error instanceof ReceizProtocolLimitError) return buildOperationalDenialResult("folder_package", error.code);
    throw error;
  }
  const { default: JSZip } = await Promise.resolve().then(() => __toESM(require_jszip_min(), 1));
  let zip;
  try {
    zip = await JSZip.loadAsync(args.bytes);
  } catch {
    return null;
  }
  const files = [];
  const paths = Object.keys(zip.files);
  const zipGuards = args.zipGuardLimits ?? DOCUMENT_VERIFY_SERVER_ZIP_GUARD_LIMITS;
  if (paths.length > zipGuards.maxEntries) {
    return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
  }
  const protocolGuard = createReceizArchiveVerificationGuard();
  let materializedArchiveBytes = 0;
  let totalUncompressedBytes = 0;
  for (const path of paths) {
    const zipEntry = zip.files[path];
    if (!zipEntry) continue;
    const unsafeOriginalName = typeof zipEntry.unsafeOriginalName === "string" ? zipEntry.unsafeOriginalName : path;
    const unixPermissions = zipEntry.unixPermissions;
    const unixMode = typeof unixPermissions === "string" ? Number.parseInt(unixPermissions, 8) : typeof unixPermissions === "number" ? unixPermissions : 0;
    const entryKind = zipEntry.dir ? "directory" : (unixMode & 61440) === 40960 ? "symlink" : "file";
    const declaredUncompressedSize = zipEntryUncompressedSize(zipEntry);
    try {
      protocolGuard.beginEntry({
        path: unsafeOriginalName,
        compressedBytes: Number(zipEntry._data?.compressedSize ?? 0),
        ...declaredUncompressedSize === null ? {} : { declaredDecompressedBytes: declaredUncompressedSize },
        kind: entryKind,
        manifest: /(?:^|\/)manifest(?:\.[^/]*)?$/iu.test(unsafeOriginalName)
      });
      if (declaredUncompressedSize !== null) {
        assertMaterialization("decompressedArchiveBytes", materializedArchiveBytes + declaredUncompressedSize);
      }
    } catch (error) {
      if (error instanceof ReceizProtocolLimitError) return buildOperationalDenialResult("folder_package", error.code);
      throw error;
    }
    if (zipEntry.dir) {
      protocolGuard.endEntry();
      continue;
    }
    if (declaredUncompressedSize !== null && declaredUncompressedSize > zipGuards.maxEntryUncompressedBytes) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
    }
    if (declaredUncompressedSize !== null) {
      totalUncompressedBytes += declaredUncompressedSize;
      if (totalUncompressedBytes > zipGuards.maxTotalUncompressedBytes) {
        return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
      }
    }
    let bytes;
    try {
      const chunks = [];
      let extractedBytes = 0;
      bytes = await new Promise((resolve, reject) => {
        const stream = zipEntry.internalStream("uint8array");
        stream.on("data", (chunk) => {
          try {
            assertMaterialization("decompressedArchiveBytes", materializedArchiveBytes + chunk.byteLength);
            protocolGuard.observeDecompressedChunk(chunk.byteLength);
            chunks.push(chunk.slice());
            extractedBytes += chunk.byteLength;
            materializedArchiveBytes += chunk.byteLength;
          } catch (error) {
            stream.pause();
            reject(error);
          }
        });
        stream.on("error", reject);
        stream.on("end", () => {
          const extracted = new Uint8Array(extractedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            extracted.set(chunk, offset);
            offset += chunk.byteLength;
          }
          resolve(extracted);
        });
        stream.resume();
      });
      protocolGuard.endEntry();
    } catch (error) {
      if (error instanceof ReceizProtocolLimitError) return buildOperationalDenialResult("folder_package", error.code);
      throw error;
    }
    if (detectReceizRecursiveArchiveFormat(bytes)) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_RECURSION_FORBIDDEN");
    }
    if (bytes.byteLength > zipGuards.maxEntryUncompressedBytes) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
    }
    if (declaredUncompressedSize === null) {
      totalUncompressedBytes += bytes.byteLength;
    } else {
      totalUncompressedBytes += Math.max(0, bytes.byteLength - declaredUncompressedSize);
    }
    if (totalUncompressedBytes > zipGuards.maxTotalUncompressedBytes) {
      return buildOperationalDenialResult("folder_package", "ARCHIVE_LIMIT_EXCEEDED");
    }
    files.push({
      path: normalizePackagePath(path),
      bytes,
      mime: void 0
    });
  }
  return files;
}
async function tryVerifyFolderPackageZipArtifact(args) {
  const extracted = await extractGuardedZipEntries(args);
  if (!Array.isArray(extracted)) return extracted;
  return tryVerifyFolderPackageFromFiles({ ...args, files: extracted });
}
/** @returns {Promise<unknown>} */
async function inspectReceizZipBytes(args) {
  args = { ...args, packageExecutionCapacity: args.packageExecutionCapacity && Object.freeze({ ...args.packageExecutionCapacity }) };
  try {
    packageMaterializationGuard(args.packageExecutionCapacity)("exactArtifactBytes", args.fileBytes.byteLength);
    const extracted = await extractGuardedZipEntries({ ...args, bytes: new Uint8Array(args.fileBytes) });
    if (Array.isArray(extracted)) return { inspected: true, entries: extracted };
    return { inspected: false, error: extracted?.denial?.code ?? "ARCHIVE_PRIVACY_INSPECTION_UNAVAILABLE" };
  } catch (error) {
    return { inspected: false, error: error instanceof ReceizProtocolLimitError ? error.code : "ARCHIVE_PRIVACY_INSPECTION_UNAVAILABLE" };
  }
}
/** @returns {Promise<unknown>} */
async function readVerifiedReceizFolderPackageBytes(args) {
  args = { ...args, packageExecutionCapacity: args.packageExecutionCapacity && Object.freeze({ ...args.packageExecutionCapacity }) };
  let artifactBytes;
  let extracted;
  try {
    packageMaterializationGuard(args.packageExecutionCapacity)("exactArtifactBytes", args.fileBytes.byteLength);
    artifactBytes = new Uint8Array(args.fileBytes);
    const trailer = parseReceizTrailer(artifactBytes);
    if (trailer.trailerCount > 0 && !trailer.parseError) {
      return { ok: false, error: "enclosing_document_reader_required", verification: await verifyReceizDocumentBytes({ ...args, fileBytes: artifactBytes }) };
    }
    extracted = await extractGuardedZipEntries({ ...args, bytes: artifactBytes });
  } catch (error) {
    const verification2 = buildOperationalDenialResult("folder_package", error instanceof ReceizProtocolLimitError ? error.code : "VERIFICATION_RESOURCE_UNAVAILABLE");
    return { ok: false, error: verification2.denial.code, verification: verification2 };
  }
  if (!Array.isArray(extracted)) {
    const verification2 = extracted ?? buildInvalidResult("unknown", ["No sealed package manifest found."], []);
    return { ok: false, error: verification2.denial?.code ?? "folder_package_verification_failed", verification: verification2 };
  }
  let authority;
  const result = await tryVerifyFolderPackageFromFiles({ ...args, files: extracted, onVerifiedAuthority: (value) => {
    authority = value;
  } });
  const verification = result ? { ...result, integrity: { ok: result.ok, errors: result.errors } } : buildInvalidResult("unknown", ["No sealed package manifest found."], []);
  if (!verification.ok || !authority) return { ok: false, error: "folder_package_verification_failed", verification };
  return { ok: true, access: "read-only", sourceKind: "folder-package", artifactBytes, entries: extracted, authority, verification };
}

async function verifyPngArtifact(args) {
  const errors = [];
  const warnings = [];
  let proofChunkCount = 0;
  let proofEncoded = null;
  let anchorRaw = null;
  try {
    proofChunkCount = countPngTextChunksByKeyword(args.pngBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
    proofEncoded = readPngTextChunk(args.pngBytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
    anchorRaw = readPngTextChunk(args.pngBytes, RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY);
  } catch {
    return buildInvalidResult("png", ["Invalid PNG. Upload the original sealed artifact."], warnings);
  }
  if (proofChunkCount !== 1) {
    errors.push(
      proofChunkCount > 1 ? "Duplicate proof bundles detected (proof bundle chunk count > 1)." : "Missing proof bundle chunk (likely not the original sealed artifact)."
    );
  }
  if (!proofEncoded) {
    if (proofChunkCount === 1) {
      errors.push("Proof bundle chunk could not be read.");
    }
    return buildInvalidResult("png", errors, warnings);
  }
  let bundle;
  try {
    bundle = decodeReceizProofBundle(proofEncoded);
  } catch (err2) {
    const message = err2 instanceof Error ? err2.message : String(err2);
    return buildInvalidResult("png", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }
  const chunkAnchor = anchorRaw ? decodeReceizAnchorBundle(anchorRaw) : null;
  if (anchorRaw && !chunkAnchor) {
    errors.push("Anchor bundle chunk exists but is invalid JSON/shape.");
  }
  const derivedAnchor = deriveAnchorBundleFromProofBundle(bundle);
  const anchor = proofBearingAnchorProjection(chunkAnchor, derivedAnchor);
  const basisBytes = stripReceizProofAugmentationChunks(args.pngBytes);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "png",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null
  };
}
async function verifyPdfArtifact(args) {
  const errors = [];
  const warnings = [];
  const proofBundles = extractReceizProofBundlesFromPdf(args.pdfBytes);
  if (proofBundles.length !== 1) {
    errors.push(
      proofBundles.length > 1 ? "Duplicate proof bundles detected in PDF metadata." : "Missing embedded PDF proof bundle."
    );
    return buildInvalidResult("pdf", errors, warnings);
  }
  let bundle;
  try {
    bundle = decodeReceizProofBundle(proofBundles[0] ?? "");
  } catch (err2) {
    const message = err2 instanceof Error ? err2.message : String(err2);
    return buildInvalidResult("pdf", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const stripped = stripReceizSealUpdatesFromPdf(args.pdfBytes);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: stripped.pdfBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "pdf",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null
  };
}
async function verifyHeicArtifact(args) {
  const parsed = parseReceizHeicProof(args.heicBytes);
  if (parsed.parseError || parsed.proofCount !== 1 || !parsed.bundle) {
    return buildInvalidResult("heic-box", [
      parsed.proofCount > 1 ? "Duplicate HEIC proof bundles detected." : parsed.parseError ? "HEIC proof bundle is malformed." : "Missing embedded HEIC proof bundle."
    ], []);
  }
  const bundle = coerceReceizProofBundle(parsed.bundle);
  if (!bundle) {
    return buildInvalidResult("heic-box", ["HEIC proof bundle schema is invalid."], []);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  return {
    ok: checked.errors.length === 0,
    kind: "heic-box",
    errors: checked.errors,
    warnings: checked.warnings,
    bundle,
    anchor,
    package: null
  };
}
async function verifySvgArtifact(args) {
  const errors = [];
  const warnings = [];
  const parsed = parseReceizSvgProof(args.svgBytes);
  const trailerFallback = parsed.proofCount !== 1 || parsed.parseError || !parsed.encodedBundle ? parseReceizTrailer(args.svgBytes) : null;
  if (trailerFallback && trailerFallback.trailerCount > 0 && !trailerFallback.parseError) {
    const fallback = await verifyTrailerArtifact({
      bytes: args.svgBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
    return {
      ...fallback,
      warnings: ["Used trailer proof fallback for SVG artifact.", ...fallback.warnings]
    };
  }
  if (parsed.proofCount !== 1) {
    errors.push(
      parsed.proofCount > 1 ? "Duplicate proof bundles detected in SVG metadata." : "Missing embedded SVG proof bundle."
    );
    return buildInvalidResult("trailer", errors, warnings);
  }
  if (parsed.parseError || !parsed.encodedBundle) {
    errors.push("SVG proof bundle is malformed.");
    return buildInvalidResult("trailer", errors, warnings);
  }
  let bundle;
  try {
    bundle = decodeReceizProofBundle(parsed.encodedBundle);
  } catch (err2) {
    const message = err2 instanceof Error ? err2.message : String(err2);
    return buildInvalidResult("trailer", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "trailer",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null
  };
}
async function verifyJsonArtifact(args) {
  const errors = [];
  const warnings = [];
  const parsed = parseReceizJsonProof(args.jsonBytes);
  const trailerFallback = parsed.proofCount !== 1 || parsed.parseError || !parsed.encodedBundle ? parseReceizTrailer(args.jsonBytes) : null;
  if (trailerFallback && trailerFallback.trailerCount > 0 && !trailerFallback.parseError) {
    const fallback = await verifyTrailerArtifact({
      bytes: args.jsonBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
    return {
      ...fallback,
      warnings: ["Used trailer proof fallback for JSON artifact.", ...fallback.warnings]
    };
  }
  if (parsed.proofCount !== 1) {
    errors.push(
      parsed.proofCount > 1 ? "Duplicate proof bundles detected in JSON whitespace channel." : "Missing embedded JSON proof bundle."
    );
    return buildInvalidResult("trailer", errors, warnings);
  }
  if (parsed.parseError || !parsed.encodedBundle) {
    errors.push("JSON proof bundle is malformed.");
    return buildInvalidResult("trailer", errors, warnings);
  }
  let bundle;
  try {
    bundle = decodeReceizProofBundle(parsed.encodedBundle);
  } catch (err2) {
    const message = err2 instanceof Error ? err2.message : String(err2);
    return buildInvalidResult("trailer", [...errors, `Proof bundle decode failed: ${message}`], warnings);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "trailer",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null
  };
}
async function verifyTrailerArtifact(args) {
  const errors = [];
  const warnings = [];
  const parsed = parseReceizTrailer(args.bytes);
  if (parsed.trailerCount !== 1) {
    errors.push(
      parsed.trailerCount > 1 ? "Duplicate trailer proof bundles detected." : "Missing trailer proof bundle."
    );
    return buildInvalidResult("trailer", errors, warnings);
  }
  if (parsed.parseError || !parsed.bundle) {
    errors.push("Trailer proof bundle is malformed.");
    return buildInvalidResult("trailer", errors, warnings);
  }
  const bundle = coerceReceizProofBundle(parsed.bundle);
  if (!bundle) {
    errors.push("Trailer proof bundle schema is invalid.");
    return buildInvalidResult("trailer", errors, warnings);
  }
  const anchor = deriveAnchorBundleFromProofBundle(bundle);
  const checked = await validateBundleAgainstBasis({
    bundle,
    basisBytes: parsed.basisBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "trailer",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle,
    anchor,
    package: null
  };
}
async function verifyBundleArtifact(args) {
  const errors = [];
  const warnings = [];
  const parsed = decodeReceizBundleEnvelope(args.bytes);
  if (!parsed) {
    return buildInvalidResult("bundle", ["Invalid .receizbundle container."], warnings);
  }
  const manifestBasis = (await sha256Hex(parsed.originalBytes)).toLowerCase();
  if (manifestBasis !== parsed.envelope.manifest.basisSha256.toLowerCase()) {
    errors.push("Bundle manifest basis hash mismatch.");
  }
  if ((parsed.envelope.proofbundle.artifactSha256Basis ?? "").toLowerCase() !== manifestBasis) {
    errors.push("Proof bundle artifact binding does not match container original bytes.");
  }
  const anchor = deriveAnchorBundleFromProofBundle(parsed.envelope.proofbundle);
  const checked = await validateBundleAgainstBasis({
    bundle: parsed.envelope.proofbundle,
    basisBytes: parsed.originalBytes,
    anchor,
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  const assetContinuity = await classifyReceizAssetContinuity(parsed.originalBytes, parsed.envelope.proofbundle);
  return {
    ok: errors.length === 0 && checked.errors.length === 0,
    kind: "bundle",
    errors: [...errors, ...checked.errors],
    warnings: [...warnings, ...checked.warnings],
    bundle: parsed.envelope.proofbundle,
    anchor,
    package: null,
    assetContinuity
  };
}
async function verifyNativeReceizProofContinuity(args) {
  const bundleParsed = decodeReceizBundleEnvelope(args.fileBytes);
  if (bundleParsed) {
    return verifyBundleArtifact({
      bytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  const kind = detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime });
  if (kind === "png") {
    return verifyPngArtifact({
      pngBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  if (kind === "pdf") {
    return verifyPdfArtifact({
      pdfBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  if (kind === "heic") {
    return verifyHeicArtifact({
      heicBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  if (kind === "svg") {
    return verifySvgArtifact({
      svgBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  if (kind === "json") {
    return verifyJsonArtifact({
      jsonBytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  if (kind === "zip") {
    const zipTrailerParsed = parseReceizTrailer(args.fileBytes);
    if (zipTrailerParsed.trailerCount > 0 && !zipTrailerParsed.parseError) {
      return verifyTrailerArtifact({
        bytes: args.fileBytes,
        optionalLink: args.optionalLink,
        signingKey: args.signingKey,
        signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
      });
    }
    const packageResult = await tryVerifyFolderPackageZipArtifact({
      bytes: args.fileBytes,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys,
      zipGuardLimits: args.zipGuardLimits,
      packageExecutionCapacity: args.packageExecutionCapacity
    });
    if (packageResult) return packageResult;
    return buildInvalidResult(
      "unknown",
      ["Unsupported ZIP artifact. Upload a sealed ZIP/package artifact or upload individual sealed artifacts."],
      []
    );
  }
  const trailerParsed = parseReceizTrailer(args.fileBytes);
  if (trailerParsed.trailerCount > 0) {
    return verifyTrailerArtifact({
      bytes: args.fileBytes,
      optionalLink: args.optionalLink,
      signingKey: args.signingKey,
      signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
    });
  }
  return buildInvalidResult(
    "unknown",
    ["Unsupported artifact format. Upload a sealed file, .receizbundle, or sealed package ZIP."],
    []
  );
}
async function verifyReceizDocumentBytes(args) {
  args = { ...args, packageExecutionCapacity: args.packageExecutionCapacity && Object.freeze({ ...args.packageExecutionCapacity }) };
  const continuityResult = await verifyNativeReceizProofContinuity(args);
  let projectedResult = continuityResult;
  if (continuityResult.ok && continuityResult.bundle) {
    const extracted = extractVerifiedBasisBytes({
      fileBytes: args.fileBytes,
      filename: args.filename,
      mime: args.mime,
      verification: continuityResult
    });
    if (extracted) {
      projectedResult = {
        ...continuityResult,
        assetContinuity: await classifyReceizAssetContinuity(
          extracted.payloadBytes,
          continuityResult.bundle
        )
      };
    }
  }
  return {
    ...projectedResult,
    integrity: { ok: projectedResult.ok, errors: projectedResult.errors }
  };
}
function failedArtifactOpen(verification, error) {
  return { ok: false, verification, error };
}
function extractVerifiedBasisBytes(args) {
  if (args.verification.kind === "bundle") {
    const parsed2 = decodeReceizBundleEnvelope(args.fileBytes);
    if (!parsed2) return null;
    return {
      payloadBytes: parsed2.originalBytes,
      payloadFilename: parsed2.envelope.manifest.filename,
      payloadMimeType: parsed2.envelope.manifest.mime
    };
  }
  if (args.verification.kind === "png") {
    return {
      payloadBytes: stripReceizProofAugmentationChunks(args.fileBytes),
      payloadFilename: args.filename || "artifact.png",
      payloadMimeType: args.mime || "image/png"
    };
  }
  if (args.verification.kind === "pdf") {
    return {
      payloadBytes: stripReceizSealUpdatesFromPdf(args.fileBytes).pdfBytes,
      payloadFilename: args.filename || "artifact.pdf",
      payloadMimeType: args.mime || "application/pdf"
    };
  }
  if (args.verification.kind === "heic-box") {
    const parsed2 = parseReceizHeicProof(args.fileBytes);
    if (parsed2.proofCount !== 1 || parsed2.parseError || !parsed2.bundle) return null;
    return {
      payloadBytes: parsed2.basisBytes,
      payloadFilename: args.filename || "artifact.heic",
      payloadMimeType: "image/heic"
    };
  }
  if (args.verification.kind !== "trailer") return null;
  const format = detectDocumentFormat(args.fileBytes, { filename: args.filename, mime: args.mime });
  if (format === "svg") {
    const parsed2 = parseReceizSvgProof(args.fileBytes);
    if (parsed2.proofCount === 1 && !parsed2.parseError && parsed2.encodedBundle) {
      return {
        payloadBytes: parsed2.basisBytes,
        payloadFilename: args.filename || "artifact.svg",
        payloadMimeType: args.mime || "image/svg+xml"
      };
    }
  }
  if (format === "json") {
    const parsed2 = parseReceizJsonProof(args.fileBytes);
    if (parsed2.proofCount === 1 && !parsed2.parseError && parsed2.encodedBundle) {
      return {
        payloadBytes: parsed2.basisBytes,
        payloadFilename: args.filename || "artifact.json",
        payloadMimeType: args.mime || "application/json"
      };
    }
  }
  const parsed = parseReceizTrailer(args.fileBytes);
  if (parsed.trailerCount !== 1 || parsed.parseError || !parsed.bundle) return null;
  return {
    payloadBytes: parsed.basisBytes,
    payloadFilename: args.filename || "artifact",
    payloadMimeType: args.mime || "application/octet-stream"
  };
}
function bytesEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}
function rebuildCanonicalCurrentNativeArtifact(args) {
  const bundle = args.verification.bundle;
  if (!bundle) return null;
  if (args.verification.kind === "bundle") {
    return encodeReceizBundleEnvelope({
      manifest: {
        filename: args.nativeRecordSeal.payload.filename,
        mime: args.nativeRecordSeal.payload.mimeType,
        basisSha256: args.nativeRecordSeal.payload.sha256,
        createdAt: bundle.createdAtMs,
        version: 1
      },
      originalBytes: args.payloadBytes,
      proofbundle: bundle
    });
  }
  const encodedBundle = encodeReceizProofBundle(bundle);
  if (args.verification.kind === "png") {
    return insertPngTextChunks(args.payloadBytes, [
      { keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY, text: encodedBundle }
    ]);
  }
  if (args.verification.kind === "pdf") {
    return embedReceizProofBundleIntoPdf({ pdfBytes: args.payloadBytes, encodedBundle });
  }
  if (args.verification.kind === "heic-box") {
    return appendReceizHeicProof({ basisBytes: args.payloadBytes, bundle });
  }
  if (args.verification.kind !== "trailer") return null;
  const format = detectDocumentFormat(args.payloadBytes, {
    filename: args.nativeRecordSeal.payload.filename,
    mime: args.nativeRecordSeal.payload.mimeType
  });
  if (format === "svg") {
    return embedReceizProofBundleIntoSvg({ svgBytes: args.payloadBytes, encodedBundle }).svgBytes;
  }
  if (format === "json") {
    return embedReceizProofBundleIntoJson({ jsonBytes: args.payloadBytes, encodedBundle }).jsonBytes;
  }
  return appendReceizTrailer({ basisBytes: args.payloadBytes, bundle });
}
async function extractVerifiedReceizDocument(args) {
  const artifactBytes = new Uint8Array(args.fileBytes);
  let verification = await verifyReceizDocumentBytes({ ...args, fileBytes: artifactBytes });
  if (!verification.ok || !verification.integrity?.ok) {
    return failedArtifactOpen(verification, verification.errors[0] || "artifact_verification_failed");
  }
  if (!verification.bundle) {
    return failedArtifactOpen(verification, "verified_artifact_bundle_missing");
  }
  const extracted = extractVerifiedBasisBytes({
    fileBytes: artifactBytes,
    filename: args.filename,
    mime: args.mime,
    verification
  });
  if (!extracted) {
    return failedArtifactOpen(verification, "verified_artifact_basis_extraction_failed");
  }
  const identityBasisBytes = await artifactIdentityBasisBytes(verification.bundle, extracted.payloadBytes);
  const basisSha256 = (await sha256Hex(identityBasisBytes)).toLowerCase();
  if (basisSha256 !== (verification.bundle.artifactSha256Basis || "").toLowerCase()) {
    return failedArtifactOpen(verification, "verified_artifact_basis_hash_mismatch");
  }
  const nativeRecordSeal = verification.bundle.nativeRecordSeal ?? null;
  const assetContinuity = await classifyReceizAssetContinuity(extracted.payloadBytes, verification.bundle);
  verification = { ...verification, assetContinuity };
  let payloadFilename = extracted.payloadFilename;
  let payloadMimeType = extracted.payloadMimeType;
  if (nativeRecordSeal) {
    if (nativeRecordSeal.payload.sha256 !== basisSha256) {
      return failedArtifactOpen(verification, "native_record_payload_hash_mismatch");
    }
    const canonicalArtifact = rebuildCanonicalCurrentNativeArtifact({
      payloadBytes: extracted.payloadBytes,
      verification,
      nativeRecordSeal
    });
    if (!canonicalArtifact || !bytesEqual(canonicalArtifact, artifactBytes)) {
      return failedArtifactOpen(verification, "native_record_carrier_bytes_noncanonical");
    }
    payloadFilename = nativeRecordSeal.payload.filename;
    payloadMimeType = nativeRecordSeal.payload.mimeType;
  }
  return {
    ok: true,
    verification,
    artifactBytes,
    payloadBytes: extracted.payloadBytes,
    payloadFilename,
    payloadMimeType,
    nativeRecordSeal
  };
}
async function readVerifiedReceizDocumentBytes(args) {
  const extracted = await extractVerifiedReceizDocument(args);
  if (!extracted.ok) return extracted;
  return { ...extracted, access: "read-only" };
}
async function verifyAndExtractReceizDocumentBytes(args) {
  const extracted = await extractVerifiedReceizDocument(args);
  if (!extracted.ok) return extracted;
  const continuityVerified = extracted.verification.assetContinuity?.state === "verified";
  if (!extracted.nativeRecordSeal && !continuityVerified && args.purpose !== "verified-proof-predecessor-append") {
    return failedArtifactOpen(extracted.verification, "native_record_seal_required");
  }
  return {
    ...extracted,
    legacyCompatibility: extracted.nativeRecordSeal ? "current-native" : continuityVerified ? "verified-legacy-read" : "verified-proof-predecessor"
  };
}
async function verifyReceizFolderFiles(args) {
  const result = await tryVerifyFolderPackageFromFiles({
    files: args.files,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
  if (result) {
    return {
      ...result,
      integrity: { ok: result.ok, errors: result.errors }
    };
  }
  return buildInvalidResult(
    "unknown",
    ["No valid sealed package manifest found. Upload a sealed package ZIP or folder with its sealed manifest artifact."],
    []
  );
}
async function verifyReceizArtifactBytes(args) {
  return verifyReceizDocumentBytes({
    fileBytes: args.pngBytes,
    filename: "artifact.png",
    mime: "image/png",
    optionalLink: args.optionalLink,
    signingKey: args.signingKey,
    signatureV4RootPublicKeys: args.signatureV4RootPublicKeys
  });
}
export {
  inspectReceizZipBytes,
  readVerifiedReceizFolderPackageBytes,
  readVerifiedReceizDocumentBytes,
  classifyReceizAssetContinuity,
  verifyAndExtractReceizDocumentBytes,
  verifyReceizArtifactBytes,
  verifyReceizDocumentBytes,
  verifyReceizTrailerBundleDigest,
  verifyReceizFolderFiles
};
/*! Bundled license information:

jszip/dist/jszip.min.js:
  (*!

  JSZip v3.10.1 - A JavaScript class for generating and reading zip files
  <http://stuartk.com/jszip>

  (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
  Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

  JSZip uses the library pako released under the MIT license :
  https://github.com/nodeca/pako/blob/main/LICENSE
  *)
*/

/** Current execution readiness only, using the canonical hash and Groth16
 * loader required by every trusted complete proof. No proof verdict or roots. */
export async function currentReceizVerificationRuntimeAvailable() {
  try {
    await sha256Hex(new Uint8Array());
    return Boolean(await loadGroth16VerifyFn());
  } catch {
    return false;
  }
}

/** Mechanics only: this cannot admit or invalidate a proof. */
export function currentReceizTrailerCompleteExecutionReason(args) {
  if (args.bundle && typeof args.bundle === "object") {
    const raw = args.bundle;
    if (typeof raw.kaiLine === "string" && raw.kaiLine && !(typeof raw.kaiKlok === "string" && raw.kaiKlok.trim())) return "legacy-interpretation";
  }
  const bundle = coerceReceizProofBundle(args.bundle);
  if (!bundle) return null;
  if (bundle.artifactBasis) return "declared-normalization";
  if (bundle.nativeRecordSeal) {
    const format = detectDocumentFormat(args.payloadPrefix, {
      filename: bundle.nativeRecordSeal.payload.filename, mime: bundle.nativeRecordSeal.payload.mimeType,
    });
    if (format === "svg" || format === "json") return "structured-reconstruction";
  }
  return null;
}

/** Current stream execution composes the canonical digest verifier and native
 * trailer serialization. It grants no native/predecessor append custody. */
/** @returns {Promise<unknown>} */
export async function readReceizCurrentTrailerBundleDigest(args) {
    const invalid = (errors) => ({
        ...buildInvalidResult("trailer", errors, []), integrity: { ok: false, errors },
    });
    const bundle = coerceReceizProofBundle(args.bundle);
    if (!bundle)
        return invalid(["Trailer proof bundle schema is invalid."]);
    // Recognize malformed proof material before execution. Missing runtime and
    // thrown execution are not false cryptographic results.
    if (!recognizeReceizGroth16Structure(bundle.groth16Proof)) {
        return invalid(["Real Groth16 bundle payload is invalid."]);
    }
    const unavailable = (warning = "Current trailer verifier runtime is unavailable.") => ({
        ...invalid([]),
        warnings: [warning],
        denial: receizProtocolOperationalDenial("VERIFICATION_RESOURCE_UNAVAILABLE"),
    });
    // A raw streamed digest cannot perform the declared identity-basis
    // normalization. This execution boundary says nothing about source validity.
    if (bundle.artifactBasis)
        return unavailable("Current trailer read cannot compute declared artifact-basis normalization from a streamed raw digest.");
    if (!(await loadGroth16VerifyFn()))
        return unavailable();
    const verification = await verifyReceizTrailerBundleDigest(args);
    if (verification.errors.includes(SIGNATURE_V4_UNAVAILABLE_ERROR))
        return unavailable();
    if (!verification.ok || !verification.bundle)
        return verification;
    const native = verification.bundle.nativeRecordSeal;
    if (!native)
        return verification;
    const format = detectDocumentFormat(args.payloadPrefix, {
        filename: native.payload.filename,
        mime: native.payload.mimeType,
    });
    // These native carriers require complete structured reserialization. A
    // bounded prefix must not pretend it performed that canonical operation.
    if (format === "svg" || format === "json")
        return unavailable("Current native trailer read cannot reconstruct structured payload serialization from a bounded prefix.");
    const canonicalTrailer = appendReceizTrailer({ basisBytes: new Uint8Array(), bundle: verification.bundle });
    if (!bytesEqual(canonicalTrailer, args.trailerBytes)) {
        return invalid(["native_record_carrier_bytes_noncanonical"]);
    }
    return verification;
}
