(() => {
  var hr = Object.create, rr = Object.defineProperty, pr = Object.getPrototypeOf,
      dr = Object.prototype.hasOwnProperty, gr = Object.getOwnPropertyNames,
      Dr = Object.getOwnPropertyDescriptor;
  var vr = M => rr(M, '__esModule', {value: !0});
  var sr = (M, re) => () => (re || (re = {exports: {}}, M(re.exports, re)), re.exports);
  var Er =
          (M, re, we) => {
            if (re && typeof re == 'object' || typeof re == 'function')
              for (let R of gr(re))
                !dr.call(M, R) && R !== 'default' &&
                    rr(M, R, {get: () => re[R], enumerable: !(we = Dr(re, R)) || we.enumerable});
            return M
          },
      lr = M => M && M.__esModule ?
      M :
      Er(vr(rr(M != null ? hr(pr(M)) : {}, 'default', {value: M, enumerable: !0})), M);
  var cr = sr(
      (nr, ur) => {(function(M, re) {
        typeof nr == 'object' && typeof ur != 'undefined' ?
            ur.exports = re() :
            typeof define == 'function' && define.amd ?
            define(re) :
            (M = typeof globalThis != 'undefined' ? globalThis : M || self, M.marked = re())
      })(nr, function() {
        'use strict';
        function M(h, i) {
          for (var c = 0; c < i.length; c++) {
            var e = i[c];
            e.enumerable = e.enumerable || !1, e.configurable = !0,
            'value' in e && (e.writable = !0), Object.defineProperty(h, e.key, e)
          }
        }
        function re(h, i, c) {
          return i && M(h.prototype, i), c && M(h, c), h
        }
        function we(h, i) {
          if (!!h) {
            if (typeof h == 'string') return R(h, i);
            var c = Object.prototype.toString.call(h).slice(8, -1);
            if (c === 'Object' && h.constructor && (c = h.constructor.name),
                c === 'Map' || c === 'Set')
              return Array.from(h);
            if (c === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(c))
              return R(h, i)
          }
        }
        function R(h, i) {
          (i == null || i > h.length) && (i = h.length);
          for (var c = 0, e = new Array(i); c < i; c++) e[c] = h[c];
          return e
        }
        function Se(h, i) {
          var c;
          if (typeof Symbol == 'undefined' || h[Symbol.iterator] == null) {
            if (Array.isArray(h) || (c = we(h)) || i && h && typeof h.length == 'number') {
              c && (h = c);
              var e = 0;
              return function() {
                return e >= h.length ? {done: !0} : {done: !1, value: h[e++]}
              }
            }
            throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
          }
          return c = h[Symbol.iterator](), c.next.bind(c)
        }
        function qe(h) {
          var i = {exports: {}};
          return h(i, i.exports), i.exports
        }
        var je = qe(function(h) {
          function i() {
            return {
              baseUrl: null, breaks: !1, gfm: !0, headerIds: !0, headerPrefix: '', highlight: null,
                  langPrefix: 'language-', mangle: !0, pedantic: !1, renderer: null, sanitize: !1,
                  sanitizer: null, silent: !1, smartLists: !1, smartypants: !1, tokenizer: null,
                  walkTokens: null, xhtml: !1
            }
          }
          function c(e) {
            h.exports.defaults = e
          }
          h.exports = { defaults: i(), getDefaults: i, changeDefaults: c }
        }),
            Qe = /[&<>"']/, lt = /[&<>"']/g, ut = /[<>"']|&(?!#?\w+;)/, Re = /[<>"']|&(?!#?\w+;)/g,
            $e = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'},
            Xe = function(i) {
              return $e[i]
            };
        function y(h, i) {
          if (i) {
            if (Qe.test(h)) return h.replace(lt, Xe)
          } else if (ut.test(h))
            return h.replace(Re, Xe);
          return h
        }
        var m = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
        function v(h) {
          return h.replace(m, function(i, c) {
            return c = c.toLowerCase(),
                   c === 'colon' ?
                       ':' :
                       c.charAt(0) === '#' ? c.charAt(1) === 'x' ?
                                             String.fromCharCode(parseInt(c.substring(2), 16)) :
                                             String.fromCharCode(+c.substring(1)) :
                                             ''
          })
        }
        var k = /(^|[^\[])\^/g;
        function w(h, i) {
          h = h.source || h, i = i || '';
          var c = {
            replace: function(t, n) {
              return n = n.source || n, n = n.replace(k, '$1'), h = h.replace(t, n), c
            },
            getRegex: function() {
              return new RegExp(h, i)
            }
          };
          return c
        }
        var L = /[^\w:]/g, he = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
        function j(h, i, c) {
          if (h) {
            var e;
            try {
              e = decodeURIComponent(v(c)).replace(L, '').toLowerCase()
            } catch (t) {
              return null
            }
            if (e.indexOf('javascript:') === 0 || e.indexOf('vbscript:') === 0 ||
                e.indexOf('data:') === 0)
              return null
          }
          i && !he.test(c) && (c = it(i, c));
          try {
            c = encodeURI(c).replace(/%25/g, '%')
          } catch (t) {
            return null
          }
          return c
        }
        var _e = {}, xe = /^[^:]+:\/*[^/]*$/, et = /^([^:]+:)[\s\S]*$/,
            wt = /^([^:]+:\/*[^/]*)[\s\S]*$/;
        function it(h, i) {
          _e[' ' + h] || (xe.test(h) ? _e[' ' + h] = h + '/' : _e[' ' + h] = ot(h, '/', !0)),
              h = _e[' ' + h];
          var c = h.indexOf(':') === -1;
          return i.substring(0, 2) === '//' ?
              c ? i : h.replace(et, '$1') + i :
              i.charAt(0) === '/' ? c ? i : h.replace(wt, '$1') + i : h + i
        }
        var ct = {exec: function() {}};
        function Ot(h) {
          for (var i = 1, c, e; i < arguments.length; i++) {
            c = arguments[i];
            for (e in c) Object.prototype.hasOwnProperty.call(c, e) && (h[e] = c[e])
          }
          return h
        }
        function gt(h, i) {
          var c = h.replace(/\|/g, function(n, u, o) {
            for (var P = !1, _ = u; --_ >= 0 && o[_] === '\\';) P = !P;
            return P ? '|' : ' |'
          }), e = c.split(/ \|/), t = 0;
          if (e.length > i)
            e.splice(i);
          else
            for (; e.length < i;) e.push('');
          for (; t < e.length; t++) e[t] = e[t].trim().replace(/\\\|/g, '|');
          return e
        }
        function ot(h, i, c) {
          var e = h.length;
          if (e === 0) return '';
          for (var t = 0; t < e;) {
            var n = h.charAt(e - t - 1);
            if (n === i && !c)
              t++;
            else if (n !== i && c)
              t++;
            else
              break
          }
          return h.substr(0, e - t)
        }
        function Te(h, i) {
          if (h.indexOf(i[1]) === -1) return -1;
          for (var c = h.length, e = 0, t = 0; t < c; t++)
            if (h[t] === '\\')
              t++;
            else if (h[t] === i[0])
              e++;
            else if (h[t] === i[1] && (e--, e < 0))
              return t;
          return -1
        }
        function Ve(h) {
          h && h.sanitize && !h.silent &&
              console.warn(
                  'marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options')
        }
        function Be(h, i) {
          if (i < 1) return '';
          for (var c = ''; i > 1;) i&1 && (c += h), i >>= 1, h += h;
          return c + h
        }
        var Ae = {
          escape: y,
          unescape: v,
          edit: w,
          cleanUrl: j,
          resolveUrl: it,
          noopTest: ct,
          merge: Ot,
          splitCells: gt,
          rtrim: ot,
          findClosingBracket: Te,
          checkSanitizeDeprecation: Ve,
          repeatString: Be
        },
            Me = je.defaults, Ye = Ae.rtrim, Ie = Ae.splitCells, Ze = Ae.escape,
            He = Ae.findClosingBracket;
        function ft(h, i, c) {
          var e = i.href, t = i.title ? Ze(i.title) : null, n = h[1].replace(/\\([\[\]])/g, '$1');
          return h[0].charAt(0) !== '!' ? {type: 'link', raw: c, href: e, title: t, text: n} :
                                          {type: 'image', raw: c, href: e, title: t, text: Ze(n)}
        }
        function ht(h, i) {
          var c = h.match(/^(\s+)(?:```)/);
          if (c === null) return i;
          var e = c[1];
          return i
              .split(`
`)
              .map(function(t) {
                var n = t.match(/^\s+/);
                if (n === null) return t;
                var u = n[0];
                return u.length >= e.length ? t.slice(e.length) : t
              })
              .join(`
`)
        }
        var Dt = function() {
          function h(c) {
            this.options = c || Me
          }
          var i = h.prototype;
          return i.space = function(e) {
            var t = this.rules.block.newline.exec(e);
            if (t)
              return t[0].length > 1 ? {type: 'space', raw: t[0]} : {
                raw: `
`
              }
          }, i.code = function(e) {
            var t = this.rules.block.code.exec(e);
            if (t) {
              var n = t[0].replace(/^ {1,4}/gm, '');
              return {
                type: 'code', raw: t[0], codeBlockStyle: 'indented',
                    text: this.options.pedantic ? n : Ye(n, `
`)
              }
            }
          }, i.fences = function(e) {
            var t = this.rules.block.fences.exec(e);
            if (t) {
              var n = t[0], u = ht(n, t[3] || '');
              return {
                type: 'code', raw: n, lang: t[2] ? t[2].trim() : t[2], text: u
              }
            }
          }, i.heading = function(e) {
            var t = this.rules.block.heading.exec(e);
            if (t) {
              var n = t[2].trim();
              if (/#$/.test(n)) {
                var u = Ye(n, '#');
                (this.options.pedantic || !u || / $/.test(u)) && (n = u.trim())
              }
              return {
                type: 'heading', raw: t[0], depth: t[1].length, text: n
              }
            }
          }, i.nptable = function(e) {
            var t = this.rules.block.nptable.exec(e);
            if (t) {
              var n = {
                type: 'table',
                header: Ie(t[1].replace(/^ *| *\| *$/g, '')),
                align: t[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                cells: t[3] ? t[3].replace(/\n$/, '').split(`
`) :
                              [],
                raw: t[0]
              };
              if (n.header.length === n.align.length) {
                var u = n.align.length, o;
                for (o = 0; o < u; o++)
                  / ^ * -+: * $ /.test(n.align[o]) ?
                      n.align[o] = 'right' :
                      /^ *:-+: *$/.test(n.align[o]) ?
                      n.align[o] = 'center' :
                      /^ *:-+ *$/.test(n.align[o]) ? n.align[o] = 'left' : n.align[o] = null;
                for (u = n.cells.length, o = 0; o < u; o++)
                  n.cells[o] = Ie(n.cells[o], n.header.length);
                return n
              }
            }
          }, i.hr = function(e) {
            var t = this.rules.block.hr.exec(e);
            if (t) return {
                type: 'hr', raw: t[0]
              }
          }, i.blockquote = function(e) {
            var t = this.rules.block.blockquote.exec(e);
            if (t) {
              var n = t[0].replace(/^ *> ?/gm, '');
              return {
                type: 'blockquote', raw: t[0], text: n
              }
            }
          }, i.list = function(e) {
            var t = this.rules.block.list.exec(e);
            if (t) {
              var n = t[0], u = t[2], o = u.length > 1, P = {
                type: 'list',
                raw: n,
                ordered: o,
                start: o ? +u.slice(0, -1) : '',
                loose: !1,
                items: []
              },
                  _ = t[0].match(this.rules.block.item), O = !1, H, oe, Oe, me, te, tt, _t, pt,
                  We = _.length;
              Oe = this.rules.block.listItemStart.exec(_[0]);
              for (var se = 0; se < We; se++) {
                if (H = _[se], n = H, se !== We - 1) {
                  if (me = this.rules.block.listItemStart.exec(_[se + 1]),
                      this.options.pedantic ? me[1].length > Oe[1].length :
                                              me[1].length > Oe[0].length || me[1].length > 3) {
                    _.splice(se, 2, _[se] + `
` + _[se + 1]),
                        se--, We--;
                    continue
                  } else
                    (!this.options.pedantic || this.options.smartLists ?
                         me[2][me[2].length - 1] !== u[u.length - 1] :
                         o === (me[2].length === 1)) &&
                        (te = _.slice(se + 1).join(`
`),
                         P.raw = P.raw.substring(0, P.raw.length - te.length), se = We - 1);
                  Oe = me
                }
                oe = H.length, H = H.replace(/^ *([*+-]|\d+[.)]) ?/, ''),
                ~H.indexOf(`
 `) &&
                    (oe -= H.length,
                     H = this.options.pedantic ?
                         H.replace(/^ {1,4}/gm, '') :
                         H.replace(new RegExp('^ {1,' + oe + '}', 'gm'), '')),
                tt = O || /\n\n(?!\s*$)/.test(H),
                se !== We - 1 &&
                    (O = H.charAt(H.length - 1) === `
`,
                     tt || (tt = O)),
                tt && (P.loose = !0),
                this.options.gfm &&
                    (_t = /^\[[ xX]\] /.test(H), pt = void 0,
                     _t && (pt = H[1] !== ' ', H = H.replace(/^\[[ xX]\] +/, ''))),
                P.items.push({type: 'list_item', raw: n, task: _t, checked: pt, loose: tt, text: H})
              }
              return P
            }
          }, i.html = function(e) {
            var t = this.rules.block.html.exec(e);
            if (t) return {
                type: this.options.sanitize ? 'paragraph' : 'html', raw: t[0],
                    pre: !this.options.sanitizer &&
                    (t[1] === 'pre' || t[1] === 'script' || t[1] === 'style'),
                    text: this.options.sanitize ?
                    this.options.sanitizer ? this.options.sanitizer(t[0]) : Ze(t[0]) :
                    t[0]
              }
          }, i.def = function(e) {
            var t = this.rules.block.def.exec(e);
            if (t) {
              t[3] && (t[3] = t[3].substring(1, t[3].length - 1));
              var n = t[1].toLowerCase().replace(/\s+/g, ' ');
              return {
                tag: n, raw: t[0], href: t[2], title: t[3]
              }
            }
          }, i.table = function(e) {
            var t = this.rules.block.table.exec(e);
            if (t) {
              var n = {
                type: 'table',
                header: Ie(t[1].replace(/^ *| *\| *$/g, '')),
                align: t[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                cells: t[3] ? t[3].replace(/\n$/, '').split(`
`) :
                              []
              };
              if (n.header.length === n.align.length) {
                n.raw = t[0];
                var u = n.align.length, o;
                for (o = 0; o < u; o++)
                  / ^ * -+: * $ /.test(n.align[o]) ?
                      n.align[o] = 'right' :
                      /^ *:-+: *$/.test(n.align[o]) ?
                      n.align[o] = 'center' :
                      /^ *:-+ *$/.test(n.align[o]) ? n.align[o] = 'left' : n.align[o] = null;
                for (u = n.cells.length, o = 0; o < u; o++)
                  n.cells[o] = Ie(n.cells[o].replace(/^ *\| *| *\| *$/g, ''), n.header.length);
                return n
              }
            }
          }, i.lheading = function(e) {
            var t = this.rules.block.lheading.exec(e);
            if (t) return {
                type: 'heading', raw: t[0], depth: t[2].charAt(0) === '=' ? 1 : 2, text: t[1]
              }
          }, i.paragraph = function(e) {
            var t = this.rules.block.paragraph.exec(e);
            if (t) return {
                type: 'paragraph', raw: t[0],
                    text: t[1].charAt(t[1].length - 1) === `
` ?
                    t[1].slice(0, -1) :
                    t[1]
              }
          }, i.text = function(e) {
            var t = this.rules.block.text.exec(e);
            if (t) return {
                type: 'text', raw: t[0], text: t[0]
              }
          }, i.escape = function(e) {
            var t = this.rules.inline.escape.exec(e);
            if (t) return {
                type: 'escape', raw: t[0], text: Ze(t[1])
              }
          }, i.tag = function(e, t, n) {
            var u = this.rules.inline.tag.exec(e);
            if (u)
              return !t && /^<a /i.test(u[0]) ? t = !0 : t && /^<\/a>/i.test(u[0]) && (t = !1),
                                                !n && /^<(pre|code|kbd|script)(\s|>)/i.test(u[0]) ?
                         n = !0 :
                         n && /^<\/(pre|code|kbd|script)(\s|>)/i.test(u[0]) && (n = !1),
              {
                type: this.options.sanitize ? 'text' : 'html', raw: u[0], inLink: t, inRawBlock: n,
                    text: this.options.sanitize ?
                    this.options.sanitizer ? this.options.sanitizer(u[0]) : Ze(u[0]) :
                    u[0]
              }
          }, i.link = function(e) {
            var t = this.rules.inline.link.exec(e);
            if (t) {
              var n = t[2].trim();
              if (!this.options.pedantic && /^</.test(n)) {
                if (!/>$/.test(n)) return;
                var u = Ye(n.slice(0, -1), '\\');
                if ((n.length - u.length) % 2 == 0) return
              } else {
                var o = He(t[2], '()');
                if (o > -1) {
                  var P = t[0].indexOf('!') === 0 ? 5 : 4, _ = P + t[1].length + o;
                  t[2] = t[2].substring(0, o), t[0] = t[0].substring(0, _).trim(), t[3] = ''
                }
              }
              var O = t[2], H = '';
              if (this.options.pedantic) {
                var oe = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(O);
                oe && (O = oe[1], H = oe[3])
              } else
                H = t[3] ? t[3].slice(1, -1) : '';
              return O = O.trim(),
                     /^</.test(O) &&
                         (this.options.pedantic && !/>$/.test(n) ? O = O.slice(1) :
                                                                   O = O.slice(1, -1)),
                     ft(t, {
                       href: O && O.replace(this.rules.inline._escapes, '$1'),
                       title: H && H.replace(this.rules.inline._escapes, '$1')
                     },
                        t[0])
            }
          }, i.reflink = function(e, t) {
            var n;
            if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
              var u = (n[2] || n[1]).replace(/\s+/g, ' ');
              if (u = t[u.toLowerCase()], !u || !u.href) {
                var o = n[0].charAt(0);
                return {
                  type: 'text', raw: o, text: o
                }
              }
              return ft(n, u, n[0])
            }
          }, i.emStrong = function(e, t, n) {
            n === void 0 && (n = '');
            var u = this.rules.inline.emStrong.lDelim.exec(e);
            if (!!u &&
                !(
                    u[3] &&
                    n
                        .match(/(?:[0-9A-Za-z\xAA\xB2\xB3\xB5\xB9\xBA\xBC-\xBE\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u0660-\u0669\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09E6-\u09F1\u09F4-\u09F9\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AE6-\u0AEF\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71-\u0B77\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BF2\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C66-\u0C6F\u0C78-\u0C7E\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CE6-\u0CEF\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D58-\u0D61\u0D66-\u0D78\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DE6-\u0DEF\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F33\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1369-\u137C\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2070\u2071\u2074-\u2079\u207F-\u2089\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2150-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2CFD\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u3192-\u3195\u31A0-\u31BF\u31F0-\u31FF\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA830-\uA835\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uA9E0-\uA9E4\uA9E6-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDE80-\uDE9C\uDEA0-\uDED0\uDEE1-\uDEFB\uDF00-\uDF23\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC58-\uDC76\uDC79-\uDC9E\uDCA7-\uDCAF\uDCE0-\uDCF2\uDCF4\uDCF5\uDCFB-\uDD1B\uDD20-\uDD39\uDD80-\uDDB7\uDDBC-\uDDCF\uDDD2-\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE40-\uDE48\uDE60-\uDE7E\uDE80-\uDE9F\uDEC0-\uDEC7\uDEC9-\uDEE4\uDEEB-\uDEEF\uDF00-\uDF35\uDF40-\uDF55\uDF58-\uDF72\uDF78-\uDF91\uDFA9-\uDFAF]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDCFA-\uDD23\uDD30-\uDD39\uDE60-\uDE7E\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF27\uDF30-\uDF45\uDF51-\uDF54\uDFB0-\uDFCB\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC52-\uDC6F\uDC83-\uDCAF\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD03-\uDD26\uDD36-\uDD3F\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDD0-\uDDDA\uDDDC\uDDE1-\uDDF4\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDEF0-\uDEF9\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC50-\uDC59\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE50-\uDE59\uDE80-\uDEAA\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF30-\uDF3B]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCF2\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDD50-\uDD59\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC50-\uDC6C\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF2\uDFB0\uDFC0-\uDFD4]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF50-\uDF59\uDF5B-\uDF61\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE96\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD40-\uDD49\uDD4E\uDEC0-\uDEEB\uDEF0-\uDEF9]|\uD83A[\uDC00-\uDCC4\uDCC7-\uDCCF\uDD00-\uDD43\uDD4B\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83C[\uDD00-\uDD0C]|\uD83E[\uDFF0-\uDFF9]|\uD869[\uDC00-\uDEDD\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A])/))) {
              var o = u[1] || u[2] || '';
              if (!o || o && (n === '' || this.rules.inline.punctuation.exec(n))) {
                var P = u[0].length - 1, _, O, H = P, oe = 0,
                    Oe = u[0][0] === '*' ? this.rules.inline.emStrong.rDelimAst :
                                           this.rules.inline.emStrong.rDelimUnd;
                for (Oe.lastIndex = 0, t = t.slice(-1 * e.length + P); (u = Oe.exec(t)) != null;)
                  if (_ = u[1] || u[2] || u[3] || u[4] || u[5] || u[6], !!_) {
                    if (O = _.length, u[3] || u[4]) {
                      H += O;
                      continue
                    } else if ((u[5] || u[6]) && P % 3 && !((P + O) % 3)) {
                      oe += O;
                      continue
                    }
                    if (H -= O, !(H > 0)) {
                      if (H + oe - O <= 0 && !t.slice(Oe.lastIndex).match(Oe) &&
                              (O = Math.min(O, O + H + oe)),
                          Math.min(P, O) % 2)
                        return {
                          type: 'em',
                          raw: e.slice(0, P + u.index + O + 1),
                          text: e.slice(1, P + u.index + O)
                        };
                      if (Math.min(P, O) % 2 == 0) return {
                          type: 'strong', raw: e.slice(0, P + u.index + O + 1),
                              text: e.slice(2, P + u.index + O - 1)
                        }
                    }
                  }
              }
            }
          }, i.codespan = function(e) {
            var t = this.rules.inline.code.exec(e);
            if (t) {
              var n = t[2].replace(/\n/g, ' '), u = /[^ ]/.test(n),
                  o = /^ /.test(n) && / $/.test(n);
              return u && o && (n = n.substring(1, n.length - 1)), n = Ze(n, !0), {
                type: 'codespan', raw: t[0], text: n
              }
            }
          }, i.br = function(e) {
            var t = this.rules.inline.br.exec(e);
            if (t) return {
                type: 'br', raw: t[0]
              }
          }, i.del = function(e) {
            var t = this.rules.inline.del.exec(e);
            if (t) return {
                type: 'del', raw: t[0], text: t[2]
              }
          }, i.autolink = function(e, t) {
            var n = this.rules.inline.autolink.exec(e);
            if (n) {
              var u, o;
              return n[2] === '@' ?
                         (u = Ze(this.options.mangle ? t(n[1]) : n[1]), o = 'mailto:' + u) :
                         (u = Ze(n[1]), o = u),
              {
                type: 'link', raw: n[0], text: u, href: o, tokens: [{type: 'text', raw: u, text: u}]
              }
            }
          }, i.url = function(e, t) {
            var n;
            if (n = this.rules.inline.url.exec(e)) {
              var u, o;
              if (n[2] === '@')
                u = Ze(this.options.mangle ? t(n[0]) : n[0]), o = 'mailto:' + u;
              else {
                var P;
                do
                  P = n[0], n[0] = this.rules.inline._backpedal.exec(n[0])[0];
                while (P !== n[0]);
                u = Ze(n[0]), n[1] === 'www.' ? o = 'http://' + u : o = u
              }
              return {
                type: 'link', raw: n[0], text: u, href: o, tokens: [{type: 'text', raw: u, text: u}]
              }
            }
          }, i.inlineText = function(e, t, n) {
            var u = this.rules.inline.text.exec(e);
            if (u) {
              var o;
              return t ? o = this.options.sanitize ?
                         this.options.sanitizer ? this.options.sanitizer(u[0]) : Ze(u[0]) :
                         u[0] :
                         o = Ze(this.options.smartypants ? n(u[0]) : u[0]),
              {
                type: 'text', raw: u[0], text: o
              }
            }
          }, h
        }(), at = Ae.noopTest, ne = Ae.edit, Ke = Ae.merge, q = {
          newline: /^(?: *(?:\n|$))+/,
          code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
          fences:
              /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
          hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
          heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
          blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
          list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?! {0,3}bull )\n*|\s*$)/,
          html:
              '^ {0,3}(?:<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$))',
          def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
          nptable: at,
          table: at,
          lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
          _paragraph:
              /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html| +\n)[^\n]+)*)/,
          text: /^[^\n]+/
        };
        q._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/,
        q._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/,
        q.def = ne(q.def).replace('label', q._label).replace('title', q._title).getRegex(),
        q.bullet = /(?:[*+-]|\d{1,9}[.)])/, q.item = /^( *)(bull) ?[^\n]*(?:\n(?! *bull ?)[^\n]*)*/,
        q.item = ne(q.item, 'gm').replace(/bull/g, q.bullet).getRegex(),
        q.listItemStart = ne(/^( *)(bull)/).replace('bull', q.bullet).getRegex(),
        q.list =
            ne(q.list)
                .replace(/bull/g, q.bullet)
                .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
                .replace('def', '\\n+(?=' + q.def.source + ')')
                .getRegex(),
        q._tag =
            'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul',
        q._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/,
        q.html = ne(q.html, 'i')
                     .replace('comment', q._comment)
                     .replace('tag', q._tag)
                     .replace(
                         'attribute',
                         / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
                     .getRegex(),
        q.paragraph = ne(q._paragraph)
                          .replace('hr', q.hr)
                          .replace('heading', ' {0,3}#{1,6} ')
                          .replace('|lheading', '')
                          .replace('blockquote', ' {0,3}>')
                          .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
                          .replace('list', ' {0,3}(?:[*+-]|1[.)]) ')
                          .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
                          .replace('tag', q._tag)
                          .getRegex(),
        q.blockquote = ne(q.blockquote).replace('paragraph', q.paragraph).getRegex(),
        q.normal = Ke({}, q),
        q.gfm = Ke({}, q.normal, {
          nptable:
              '^ *([^|\\n ].*\\|.*)\\n {0,3}([-:]+ *\\|[-| :]*)(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)',
          table:
              '^ *\\|(.+)\\n {0,3}\\|?( *[-:]+[-| :]*)(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)'
        }),
        q.gfm.nptable = ne(q.gfm.nptable)
                            .replace('hr', q.hr)
                            .replace('heading', ' {0,3}#{1,6} ')
                            .replace('blockquote', ' {0,3}>')
                            .replace('code', ' {4}[^\\n]')
                            .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
                            .replace('list', ' {0,3}(?:[*+-]|1[.)]) ')
                            .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
                            .replace('tag', q._tag)
                            .getRegex(),
        q.gfm.table = ne(q.gfm.table)
                          .replace('hr', q.hr)
                          .replace('heading', ' {0,3}#{1,6} ')
                          .replace('blockquote', ' {0,3}>')
                          .replace('code', ' {4}[^\\n]')
                          .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
                          .replace('list', ' {0,3}(?:[*+-]|1[.)]) ')
                          .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
                          .replace('tag', q._tag)
                          .getRegex(),
        q.pedantic = Ke({}, q.normal, {
          html:
              ne(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`)
                  .replace('comment', q._comment)
                  .replace(
                      /tag/g,
                      '(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
                  .getRegex(),
          def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
          heading: /^(#{1,6})(.*)(?:\n+|$)/,
          fences: at,
          paragraph: ne(q.normal._paragraph)
                         .replace('hr', q.hr)
                         .replace('heading', ` *#{1,6} *[^
]`)
                         .replace('lheading', q.lheading)
                         .replace('blockquote', ' {0,3}>')
                         .replace('|fences', '')
                         .replace('|list', '')
                         .replace('|html', '')
                         .getRegex()
        });
        var B = {
          escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
          autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
          url: at,
          tag:
              '^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>',
          link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
          reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
          nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
          reflinkSearch: 'reflink|nolink(?!\\()',
          emStrong: {
            lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
            rDelimAst:
                /\_\_[^_]*?\*[^_]*?\_\_|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,
            rDelimUnd:
                /\*\*[^*]*?\_[^*]*?\*\*|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/
          },
          code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
          br: /^( {2,}|\\)\n(?!\s*$)/,
          del: at,
          text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
          punctuation: /^([\spunctuation])/
        };
        B._punctuation = '!"#$%&\'()+\\-.,/:;<=>?@\\[\\]`^{|}~',
        B.punctuation = ne(B.punctuation).replace(/punctuation/g, B._punctuation).getRegex(),
        B.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g, B.escapedEmSt = /\\\*|\\_/g,
        B._comment = ne(q._comment).replace('(?:-->|$)', '-->').getRegex(),
        B.emStrong.lDelim = ne(B.emStrong.lDelim).replace(/punct/g, B._punctuation).getRegex(),
        B.emStrong.rDelimAst =
            ne(B.emStrong.rDelimAst, 'g').replace(/punct/g, B._punctuation).getRegex(),
        B.emStrong.rDelimUnd =
            ne(B.emStrong.rDelimUnd, 'g').replace(/punct/g, B._punctuation).getRegex(),
        B._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g,
        B._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/,
        B._email =
            /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
        B.autolink =
            ne(B.autolink).replace('scheme', B._scheme).replace('email', B._email).getRegex(),
        B._attribute =
            /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/,
        B.tag =
            ne(B.tag).replace('comment', B._comment).replace('attribute', B._attribute).getRegex(),
        B._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,
        B._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/,
        B._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/,
        B.link = ne(B.link)
                     .replace('label', B._label)
                     .replace('href', B._href)
                     .replace('title', B._title)
                     .getRegex(),
        B.reflink = ne(B.reflink).replace('label', B._label).getRegex(),
        B.reflinkSearch = ne(B.reflinkSearch, 'g')
                              .replace('reflink', B.reflink)
                              .replace('nolink', B.nolink)
                              .getRegex(),
        B.normal = Ke({}, B),
        B.pedantic = Ke({}, B.normal, {
          strong: {
            start: /^__|\*\*/,
            middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
            endAst: /\*\*(?!\*)/g,
            endUnd: /__(?!_)/g
          },
          em: {
            start: /^_|\*/,
            middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
            endAst: /\*(?!\*)/g,
            endUnd: /_(?!_)/g
          },
          link: ne(/^!?\[(label)\]\((.*?)\)/).replace('label', B._label).getRegex(),
          reflink: ne(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace('label', B._label).getRegex()
        }),
        B.gfm = Ke({}, B.normal, {
          escape: ne(B.escape).replace('])', '~|])').getRegex(),
          _extended_email:
              /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
          url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
          _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
          del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
          text:
              /^([`~]+|[^`~])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/
        }),
        B.gfm.url = ne(B.gfm.url, 'i').replace('email', B.gfm._extended_email).getRegex(),
        B.breaks = Ke({}, B.gfm, {
          br: ne(B.br).replace('{2,}', '*').getRegex(),
          text: ne(B.gfm.text).replace('\\b_', '\\b_| {2,}\\n').replace(/\{2,\}/g, '*').getRegex()
        });
        var Rt = {block: q, inline: B}, Nt = je.defaults, vt = Rt.block, Et = Rt.inline,
            Mt = Ae.repeatString;
        function Lt(h) {
          return h.replace(/---/g, '\u2014')
              .replace(/--/g, '\u2013')
              .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
              .replace(/'/g, '\u2019')
              .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201C')
              .replace(/"/g, '\u201D')
              .replace(/\.{3}/g, '\u2026')
        }
        function jt(h) {
          var i = '', c, e, t = h.length;
          for (c = 0; c < t; c++)
            e = h.charCodeAt(c), Math.random() > .5 && (e = 'x' + e.toString(16)),
            i += '&#' + e + ';';
          return i
        }
        var Tt =
                function() {
          function h(c) {
            this.tokens = [], this.tokens.links = Object.create(null), this.options = c || Nt,
            this.options.tokenizer = this.options.tokenizer || new Dt,
            this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options;
            var e = {block: vt.normal, inline: Et.normal};
            this.options.pedantic ? (e.block = vt.pedantic, e.inline = Et.pedantic) :
                                    this.options.gfm &&
                    (e.block = vt.gfm,
                     this.options.breaks ? e.inline = Et.breaks : e.inline = Et.gfm),
                this.tokenizer.rules = e
          }
          h.lex = function(e, t) {
            var n = new h(t);
            return n.lex(e)
          }, h.lexInline = function(e, t) {
            var n = new h(t);
            return n.inlineTokens(e)
          };
          var i = h.prototype;
          return i.lex =
                     function(e) {
            return e = e.replace(/\r\n|\r/g, `
`).replace(/\t/g, '    '),
                   this.blockTokens(e, this.tokens, !0), this.inline(this.tokens), this.tokens
          },
                 i.blockTokens =
                     function(e, t, n) {
                   t === void 0 && (t = []), n === void 0 && (n = !0),
                       this.options.pedantic && (e = e.replace(/^ +$/gm, ''));
                   for (var u, o, P, _; e;) {
                     if (u = this.tokenizer.space(e)) {
                       e = e.substring(u.raw.length), u.type && t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.code(e)) {
                       e = e.substring(u.raw.length), _ = t[t.length - 1],
                       _ && _.type === 'paragraph' ? (_.raw += `
` + u.raw,
                                                      _.text += `
` + u.text) :
                                                     t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.fences(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.heading(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.nptable(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.hr(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.blockquote(e)) {
                       e = e.substring(u.raw.length), u.tokens = this.blockTokens(u.text, [], n),
                       t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.list(e)) {
                       for (e = e.substring(u.raw.length), P = u.items.length, o = 0; o < P; o++)
                         u.items[o].tokens = this.blockTokens(u.items[o].text, [], !1);
                       t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.html(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (n && (u = this.tokenizer.def(e))) {
                       e = e.substring(u.raw.length),
                       this.tokens.links[u.tag] ||
                           (this.tokens.links[u.tag] = {href: u.href, title: u.title});
                       continue
                     }
                     if (u = this.tokenizer.table(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.lheading(e)) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (n && (u = this.tokenizer.paragraph(e))) {
                       e = e.substring(u.raw.length), t.push(u);
                       continue
                     }
                     if (u = this.tokenizer.text(e)) {
                       e = e.substring(u.raw.length), _ = t[t.length - 1],
                       _ && _.type === 'text' ? (_.raw += `
` + u.raw,
                                                 _.text += `
` + u.text) :
                                                t.push(u);
                       continue
                     }
                     if (e) {
                       var O = 'Infinite loop on byte: ' + e.charCodeAt(0);
                       if (this.options.silent) {
                         console.error(O);
                         break
                       } else
                         throw new Error(O)
                     }
                   }
                   return t
                 },
                 i.inline =
                     function(e) {
                   var t, n, u, o, P, _, O = e.length;
                   for (t = 0; t < O; t++) switch (_ = e[t], _.type) {
                       case 'paragraph':
                       case 'text':
                       case 'heading': {
                         _.tokens = [], this.inlineTokens(_.text, _.tokens);
                         break
                       }
                       case 'table': {
                         for (_.tokens = {header: [], cells: []}, o = _.header.length, n = 0; n < o;
                              n++)
                           _.tokens.header[n] = [],
                           this.inlineTokens(_.header[n], _.tokens.header[n]);
                         for (o = _.cells.length, n = 0; n < o; n++)
                           for (P = _.cells[n], _.tokens.cells[n] = [], u = 0; u < P.length; u++)
                             _.tokens.cells[n][u] = [],
                             this.inlineTokens(P[u], _.tokens.cells[n][u]);
                         break
                       }
                       case 'blockquote': {
                         this.inline(_.tokens);
                         break
                       }
                       case 'list': {
                         for (o = _.items.length, n = 0; n < o; n++) this.inline(_.items[n].tokens);
                         break
                       }
                     }
                   return e
                 },
                 i.inlineTokens =
                     function(e, t, n, u) {
                   t === void 0 && (t = []), n === void 0 && (n = !1), u === void 0 && (u = !1);
                   var o, P, _ = e, O, H, oe;
                   if (this.tokens.links) {
                     var Oe = Object.keys(this.tokens.links);
                     if (Oe.length > 0)
                       for (; (O = this.tokenizer.rules.inline.reflinkSearch.exec(_)) != null;)
                         Oe.includes(O[0].slice(O[0].lastIndexOf('[') + 1, -1)) &&
                             (_ = _.slice(0, O.index) + '[' + Mt('a', O[0].length - 2) + ']' +
                                  _.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))
                   }
                   for (; (O = this.tokenizer.rules.inline.blockSkip.exec(_)) != null;)
                     _ = _.slice(0, O.index) + '[' + Mt('a', O[0].length - 2) + ']' +
                         _.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
                   for (; (O = this.tokenizer.rules.inline.escapedEmSt.exec(_)) != null;)
                     _ = _.slice(0, O.index) + '++' +
                         _.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
                   for (; e;) {
                     if (H || (oe = ''), H = !1, o = this.tokenizer.escape(e)) {
                       e = e.substring(o.raw.length), t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.tag(e, n, u)) {
                       e = e.substring(o.raw.length), n = o.inLink, u = o.inRawBlock;
                       var me = t[t.length - 1];
                       me && o.type === 'text' && me.type === 'text' ?
                           (me.raw += o.raw, me.text += o.text) :
                           t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.link(e)) {
                       e = e.substring(o.raw.length),
                       o.type === 'link' && (o.tokens = this.inlineTokens(o.text, [], !0, u)),
                       t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.reflink(e, this.tokens.links)) {
                       e = e.substring(o.raw.length);
                       var te = t[t.length - 1];
                       o.type === 'link' ?
                           (o.tokens = this.inlineTokens(o.text, [], !0, u), t.push(o)) :
                           te && o.type === 'text' && te.type === 'text' ?
                           (te.raw += o.raw, te.text += o.text) :
                           t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.emStrong(e, _, oe)) {
                       e = e.substring(o.raw.length),
                       o.tokens = this.inlineTokens(o.text, [], n, u), t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.codespan(e)) {
                       e = e.substring(o.raw.length), t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.br(e)) {
                       e = e.substring(o.raw.length), t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.del(e)) {
                       e = e.substring(o.raw.length),
                       o.tokens = this.inlineTokens(o.text, [], n, u), t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.autolink(e, jt)) {
                       e = e.substring(o.raw.length), t.push(o);
                       continue
                     }
                     if (!n && (o = this.tokenizer.url(e, jt))) {
                       e = e.substring(o.raw.length), t.push(o);
                       continue
                     }
                     if (o = this.tokenizer.inlineText(e, u, Lt)) {
                       e = e.substring(o.raw.length),
                       o.raw.slice(-1) !== '_' && (oe = o.raw.slice(-1)), H = !0,
                       P = t[t.length - 1],
                       P && P.type === 'text' ? (P.raw += o.raw, P.text += o.text) : t.push(o);
                       continue
                     }
                     if (e) {
                       var tt = 'Infinite loop on byte: ' + e.charCodeAt(0);
                       if (this.options.silent) {
                         console.error(tt);
                         break
                       } else
                         throw new Error(tt)
                     }
                   }
                   return t
                 },
                 re(h, null, [{
                      key: 'rules',
                      get: function() {
                        return {
                          block: vt, inline: Et
                        }
                      }
                    }]),
                 h
        }(),
            Jt = je.defaults, Ht = Ae.cleanUrl, mt = Ae.escape,
            It =
                function() {
              function h(c) {
                this.options = c || Jt
              }
              var i = h.prototype;
              return i.code = function(e, t, n) {
                var u = (t || '').match(/\S*/)[0];
                if (this.options.highlight) {
                  var o = this.options.highlight(e, u);
                  o != null && o !== e && (n = !0, e = o)
                }
                return e = e.replace(/\n$/, '') + `
`,
                       u ? '<pre><code class="' + this.options.langPrefix + mt(u, !0) + '">' +
                               (n ? e : mt(e, !0)) + `</code></pre>
` :
                           '<pre><code>' + (n ? e : mt(e, !0)) + `</code></pre>
`
              }, i.blockquote = function(e) {
                return `<blockquote>
` + e + `</blockquote>
`
              }, i.html = function(e) {
                return e
              }, i.heading = function(e, t, n, u) {
                return this.options.headerIds ? '<h' + t + ' id="' + this.options.headerPrefix +
                        u.slug(n) + '">' + e + '</h' + t + `>
` :
                                                '<h' + t + '>' + e + '</h' + t + `>
`
              }, i.hr = function() {
                return this.options.xhtml ? `<hr/>
` :
                                            `<hr>
`
              }, i.list = function(e, t, n) {
                var u = t ? 'ol' : 'ul', o = t && n !== 1 ? ' start="' + n + '"' : '';
                return '<' + u + o + `>
` + e + '</' + u + `>
`
              }, i.listitem = function(e) {
                return '<li>' + e + `</li>
`
              }, i.checkbox = function(e) {
                return '<input ' + (e ? 'checked="" ' : '') + 'disabled="" type="checkbox"' +
                    (this.options.xhtml ? ' /' : '') + '> '
              }, i.paragraph = function(e) {
                return '<p>' + e + `</p>
`
              }, i.table = function(e, t) {
                return t && (t = '<tbody>' + t + '</tbody>'), `<table>
<thead>
` + e + `</thead>
` + t + `</table>
`
              }, i.tablerow = function(e) {
                return `<tr>
` + e + `</tr>
`
              }, i.tablecell = function(e, t) {
                var n = t.header ? 'th' : 'td',
                    u = t.align ? '<' + n + ' align="' + t.align + '">' : '<' + n + '>';
                return u + e + '</' + n + `>
`
              }, i.strong = function(e) {
                return '<strong>' + e + '</strong>'
              }, i.em = function(e) {
                return '<em>' + e + '</em>'
              }, i.codespan = function(e) {
                return '<code>' + e + '</code>'
              }, i.br = function() {
                return this.options.xhtml ? '<br/>' : '<br>'
              }, i.del = function(e) {
                return '<del>' + e + '</del>'
              }, i.link = function(e, t, n) {
                if (e = Ht(this.options.sanitize, this.options.baseUrl, e), e === null) return n;
                var u = '<a href="' + mt(e) + '"';
                return t && (u += ' title="' + t + '"'), u += '>' + n + '</a>', u
              }, i.image = function(e, t, n) {
                if (e = Ht(this.options.sanitize, this.options.baseUrl, e), e === null) return n;
                var u = '<img src="' + e + '" alt="' + n + '"';
                return t && (u += ' title="' + t + '"'), u += this.options.xhtml ? '/>' : '>', u
              }, i.text = function(e) {
                return e
              }, h
            }(),
            Ut =
                function() {
              function h() {}
              var i = h.prototype;
              return i.strong = function(e) {
                return e
              }, i.em = function(e) {
                return e
              }, i.codespan = function(e) {
                return e
              }, i.del = function(e) {
                return e
              }, i.html = function(e) {
                return e
              }, i.text = function(e) {
                return e
              }, i.link = function(e, t, n) {
                return '' + n
              }, i.image = function(e, t, n) {
                return '' + n
              }, i.br = function() {
                return ''
              }, h
            }(),
            Gt =
                function() {
              function h() {
                this.seen = {}
              }
              var i = h.prototype;
              return i.serialize = function(e) {
                return e.toLowerCase()
                    .trim()
                    .replace(/<[!\/a-z].*?>/ig, '')
                    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
                    .replace(/\s/g, '-')
              }, i.getNextSafeSlug = function(e, t) {
                var n = e, u = 0;
                if (this.seen.hasOwnProperty(n)) {
                  u = this.seen[e];
                  do
                    u++, n = e + '-' + u;
                  while (this.seen.hasOwnProperty(n)) }
                return t || (this.seen[e] = u, this.seen[n] = 0), n
              }, i.slug = function(e, t) {
                t === void 0 && (t = {});
                var n = this.serialize(e);
                return this.getNextSafeSlug(n, t.dryrun)
              }, h
            }(),
            Qt = je.defaults, er = Ae.unescape,
            St =
                function() {
              function h(c) {
                this.options = c || Qt, this.options.renderer = this.options.renderer || new It,
                this.renderer = this.options.renderer, this.renderer.options = this.options,
                this.textRenderer = new Ut, this.slugger = new Gt
              }
              h.parse = function(e, t) {
                var n = new h(t);
                return n.parse(e)
              }, h.parseInline = function(e, t) {
                var n = new h(t);
                return n.parseInline(e)
              };
              var i = h.prototype;
              return i.parse = function(e, t) {
                t === void 0 && (t = !0);
                var n = '', u, o, P, _, O, H, oe, Oe, me, te, tt, _t, pt, We, se, zt, Wt, Bt,
                    r = e.length;
                for (u = 0; u < r; u++) switch (te = e[u], te.type) {
                    case 'space':
                      continue;
                    case 'hr': {
                      n += this.renderer.hr();
                      continue
                    }
                    case 'heading': {
                      n += this.renderer.heading(
                          this.parseInline(te.tokens), te.depth,
                          er(this.parseInline(te.tokens, this.textRenderer)), this.slugger);
                      continue
                    }
                    case 'code': {
                      n += this.renderer.code(te.text, te.lang, te.escaped);
                      continue
                    }
                    case 'table': {
                      for (Oe = '', oe = '', _ = te.header.length, o = 0; o < _; o++)
                        oe += this.renderer.tablecell(
                            this.parseInline(te.tokens.header[o]),
                            {header: !0, align: te.align[o]});
                      for (Oe += this.renderer.tablerow(oe), me = '', _ = te.cells.length, o = 0;
                           o < _; o++) {
                        for (H = te.tokens.cells[o], oe = '', O = H.length, P = 0; P < O; P++)
                          oe += this.renderer.tablecell(
                              this.parseInline(H[P]), {header: !1, align: te.align[P]});
                        me += this.renderer.tablerow(oe)
                      }
                      n += this.renderer.table(Oe, me);
                      continue
                    }
                    case 'blockquote': {
                      me = this.parse(te.tokens), n += this.renderer.blockquote(me);
                      continue
                    }
                    case 'list': {
                      for (tt = te.ordered, _t = te.start, pt = te.loose, _ = te.items.length,
                          me = '', o = 0;
                           o < _; o++)
                        se = te.items[o], zt = se.checked, Wt = se.task, We = '',
                        se.task &&
                            (Bt = this.renderer.checkbox(zt),
                             pt ? se.tokens.length > 0 && se.tokens[0].type === 'text' ?
                                  (se.tokens[0].text = Bt + ' ' + se.tokens[0].text,
                                   se.tokens[0].tokens && se.tokens[0].tokens.length > 0 &&
                                       se.tokens[0].tokens[0].type === 'text' &&
                                       (se.tokens[0].tokens[0].text =
                                            Bt + ' ' + se.tokens[0].tokens[0].text)) :
                                  se.tokens.unshift({type: 'text', text: Bt}) :
                                  We += Bt),
                        We += this.parse(se.tokens, pt), me += this.renderer.listitem(We, Wt, zt);
                      n += this.renderer.list(me, tt, _t);
                      continue
                    }
                    case 'html': {
                      n += this.renderer.html(te.text);
                      continue
                    }
                    case 'paragraph': {
                      n += this.renderer.paragraph(this.parseInline(te.tokens));
                      continue
                    }
                    case 'text': {
                      for (me = te.tokens ? this.parseInline(te.tokens) : te.text;
                           u + 1 < r && e[u + 1].type === 'text';)
                        te = e[++u], me += `
` + (te.tokens ? this.parseInline(te.tokens) : te.text);
                      n += t ? this.renderer.paragraph(me) : me;
                      continue
                    }
                    default: {
                      var a = 'Token with "' + te.type + '" type was not found.';
                      if (this.options.silent) {
                        console.error(a);
                        return
                      } else
                        throw new Error(a)
                    }
                  }
                return n
              }, i.parseInline = function(e, t) {
                t = t || this.renderer;
                var n = '', u, o, P = e.length;
                for (u = 0; u < P; u++) switch (o = e[u], o.type) {
                    case 'escape': {
                      n += t.text(o.text);
                      break
                    }
                    case 'html': {
                      n += t.html(o.text);
                      break
                    }
                    case 'link': {
                      n += t.link(o.href, o.title, this.parseInline(o.tokens, t));
                      break
                    }
                    case 'image': {
                      n += t.image(o.href, o.title, o.text);
                      break
                    }
                    case 'strong': {
                      n += t.strong(this.parseInline(o.tokens, t));
                      break
                    }
                    case 'em': {
                      n += t.em(this.parseInline(o.tokens, t));
                      break
                    }
                    case 'codespan': {
                      n += t.codespan(o.text);
                      break
                    }
                    case 'br': {
                      n += t.br();
                      break
                    }
                    case 'del': {
                      n += t.del(this.parseInline(o.tokens, t));
                      break
                    }
                    case 'text': {
                      n += t.text(o.text);
                      break
                    }
                    default: {
                      var _ = 'Token with "' + o.type + '" type was not found.';
                      if (this.options.silent) {
                        console.error(_);
                        return
                      } else
                        throw new Error(_)
                    }
                  }
                return n
              }, h
            }(),
            xt = Ae.merge, Zt = Ae.checkSanitizeDeprecation, qt = Ae.escape, Vt = je.getDefaults,
            yt = je.changeDefaults, tr = je.defaults;
        function ie(h, i, c) {
          if (typeof h == 'undefined' || h === null)
            throw new Error('marked(): input parameter is undefined or null');
          if (typeof h != 'string')
            throw new Error(
                'marked(): input parameter is of type ' + Object.prototype.toString.call(h) +
                ', string expected');
          if (typeof i == 'function' && (c = i, i = null), i = xt({}, ie.defaults, i || {}), Zt(i),
              c) {
            var e = i.highlight, t;
            try {
              t = Tt.lex(h, i)
            } catch (P) {
              return c(P)
            }
            var n = function(_) {
              var O;
              if (!_) try {
                  O = St.parse(t, i)
                } catch (H) {
                  _ = H
                }
              return i.highlight = e, _ ? c(_) : c(null, O)
            };
            if (!e || e.length < 3 || (delete i.highlight, !t.length)) return n();
            var u = 0;
            ie.walkTokens(t, function(P) {
              P.type === 'code' && (u++, setTimeout(function() {
                                      e(P.text, P.lang, function(_, O) {
                                        if (_) return n(_);
                                        O != null && O !== P.text && (P.text = O, P.escaped = !0),
                                            u--, u === 0 && n()
                                      })
                                    }, 0))
            }), u === 0 && n();
            return
          }
          try {
            var o = Tt.lex(h, i);
            return i.walkTokens && ie.walkTokens(o, i.walkTokens), St.parse(o, i)
          } catch (P) {
            if (P.message += `
Please report this to https://github.com/markedjs/marked.`,
                i.silent)
              return '<p>An error occurred:</p><pre>' + qt(P.message + '', !0) + '</pre>';
            throw P
          }
        }
        ie.options = ie.setOptions =
            function(h) {
          return xt(ie.defaults, h), yt(ie.defaults), ie
        },
        ie.getDefaults = Vt, ie.defaults = tr,
        ie.use =
            function(h) {
          var i = xt({}, h);
          if (h.renderer &&
                  function() {
                    var e = ie.defaults.renderer || new It, t = function(o) {
                      var P = e[o];
                      e[o] = function() {
                        for (var _ = arguments.length, O = new Array(_), H = 0; H < _; H++)
                          O[H] = arguments[H];
                        var oe = h.renderer[o].apply(e, O);
                        return oe === !1 && (oe = P.apply(e, O)), oe
                      }
                    };
                    for (var n in h.renderer) t(n);
                    i.renderer = e
                  }(),
              h.tokenizer &&
                  function() {
                    var e = ie.defaults.tokenizer || new Dt, t = function(o) {
                      var P = e[o];
                      e[o] = function() {
                        for (var _ = arguments.length, O = new Array(_), H = 0; H < _; H++)
                          O[H] = arguments[H];
                        var oe = h.tokenizer[o].apply(e, O);
                        return oe === !1 && (oe = P.apply(e, O)), oe
                      }
                    };
                    for (var n in h.tokenizer) t(n);
                    i.tokenizer = e
                  }(),
              h.walkTokens) {
            var c = ie.defaults.walkTokens;
            i.walkTokens = function(e) {
              h.walkTokens(e), c && c(e)
            }
          }
          ie.setOptions(i)
        },
        ie.walkTokens =
            function(h, i) {
          for (var c = Se(h), e; !(e = c()).done;) {
            var t = e.value;
            switch (i(t), t.type) {
              case 'table': {
                for (var n = Se(t.tokens.header), u; !(u = n()).done;) {
                  var o = u.value;
                  ie.walkTokens(o, i)
                }
                for (var P = Se(t.tokens.cells), _; !(_ = P()).done;)
                  for (var O = _.value, H = Se(O), oe; !(oe = H()).done;) {
                    var Oe = oe.value;
                    ie.walkTokens(Oe, i)
                  }
                break
              }
              case 'list': {
                ie.walkTokens(t.items, i);
                break
              }
              default:
                t.tokens && ie.walkTokens(t.tokens, i)
            }
          }
        },
        ie.parseInline =
            function(h, i) {
          if (typeof h == 'undefined' || h === null)
            throw new Error('marked.parseInline(): input parameter is undefined or null');
          if (typeof h != 'string')
            throw new Error(
                'marked.parseInline(): input parameter is of type ' +
                Object.prototype.toString.call(h) + ', string expected');
          i = xt({}, ie.defaults, i || {}), Zt(i);
          try {
            var c = Tt.lexInline(h, i);
            return i.walkTokens && ie.walkTokens(c, i.walkTokens), St.parseInline(c, i)
          } catch (e) {
            if (e.message += `
Please report this to https://github.com/markedjs/marked.`,
                i.silent)
              return '<p>An error occurred:</p><pre>' + qt(e.message + '', !0) + '</pre>';
            throw e
          }
        },
        ie.Parser = St, ie.parser = St.parse, ie.Renderer = It, ie.TextRenderer = Ut, ie.Lexer = Tt,
        ie.lexer = Tt.lex, ie.Tokenizer = Dt, ie.Slugger = Gt, ie.parse = ie;
        var bt = ie;
        return bt
      })});
  var fr = sr((br, Kt) => {
    var mr = typeof window != 'undefined' ?
        window :
        typeof WorkerGlobalScope != 'undefined' && self instanceof WorkerGlobalScope ? self : {};
    var ee = function(M) {
      var re = /\blang(?:uage)?-([\w-]+)\b/i, we = 0, R = {
        manual: M.Prism && M.Prism.manual,
        disableWorkerMessageHandler: M.Prism && M.Prism.disableWorkerMessageHandler,
        util: {
          encode: function y(m) {
            return m instanceof Se ?
                new Se(m.type, y(m.content), m.alias) :
                Array.isArray(m) ?
                m.map(y) :
                m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ')
          },
          type: function(y) {
            return Object.prototype.toString.call(y).slice(8, -1)
          },
          objId: function(y) {
            return y.__id || Object.defineProperty(y, '__id', {value: ++we}), y.__id
          },
          clone: function y(m, v) {
            v = v || {};
            var k, w;
            switch (R.util.type(m)) {
              case 'Object':
                if (w = R.util.objId(m), v[w]) return v[w];
                k = {}, v[w] = k;
                for (var L in m) m.hasOwnProperty(L) && (k[L] = y(m[L], v));
                return k;
              case 'Array':
                return w = R.util.objId(m),
                       v[w] ? v[w] :
                              (k = [], v[w] = k, m.forEach(function(he, j) {
                                k[j] = y(he, v)
                              }),
                               k);
              default:
                return m
            }
          },
          getLanguage: function(y) {
            for (; y && !re.test(y.className);) y = y.parentElement;
            return y ? (y.className.match(re) || [, 'none'])[1].toLowerCase() : 'none'
          },
          currentScript: function() {
            if (typeof document == 'undefined') return null;
            if ('currentScript' in document && 1 < 2) return document.currentScript;
            try {
              throw new Error
            } catch (k) {
              var y = (/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(k.stack) || [])[1];
              if (y) {
                var m = document.getElementsByTagName('script');
                for (var v in m)
                  if (m[v].src == y) return m[v]
              }
              return null
            }
          },
          isActive: function(y, m, v) {
            for (var k = 'no-' + m; y;) {
              var w = y.classList;
              if (w.contains(m)) return !0;
              if (w.contains(k)) return !1;
              y = y.parentElement
            }
            return !!v
          }
        },
        languages: {
          extend: function(y, m) {
            var v = R.util.clone(R.languages[y]);
            for (var k in m) v[k] = m[k];
            return v
          },
          insertBefore: function(y, m, v, k) {
            k = k || R.languages;
            var w = k[y], L = {};
            for (var he in w)
              if (w.hasOwnProperty(he)) {
                if (he == m)
                  for (var j in v) v.hasOwnProperty(j) && (L[j] = v[j]);
                v.hasOwnProperty(he) || (L[he] = w[he])
              }
            var _e = k[y];
            return k[y] = L, R.languages.DFS(R.languages, function(xe, et) {
              et === _e && xe != y && (this[xe] = L)
            }), L
          },
          DFS: function y(m, v, k, w) {
            w = w || {};
            var L = R.util.objId;
            for (var he in m)
              if (m.hasOwnProperty(he)) {
                v.call(m, he, m[he], k || he);
                var j = m[he], _e = R.util.type(j);
                _e === 'Object' && !w[L(j)] ?
                    (w[L(j)] = !0, y(j, v, null, w)) :
                    _e === 'Array' && !w[L(j)] && (w[L(j)] = !0, y(j, v, he, w))
              }
          }
        },
        plugins: {},
        highlightAll: function(y, m) {
          R.highlightAllUnder(document, y, m)
        },
        highlightAllUnder: function(y, m, v) {
          var k = {
            callback: v,
            container: y,
            selector:
                'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          };
          R.hooks.run('before-highlightall', k),
              k.elements = Array.prototype.slice.apply(k.container.querySelectorAll(k.selector)),
              R.hooks.run('before-all-elements-highlight', k);
          for (var w = 0, L; L = k.elements[w++];) R.highlightElement(L, m === !0, k.callback)
        },
        highlightElement: function(y, m, v) {
          var k = R.util.getLanguage(y), w = R.languages[k];
          y.className = y.className.replace(re, '').replace(/\s+/g, ' ') + ' language-' + k;
          var L = y.parentElement;
          L && L.nodeName.toLowerCase() === 'pre' &&
              (L.className = L.className.replace(re, '').replace(/\s+/g, ' ') + ' language-' + k);
          var he = y.textContent, j = {element: y, language: k, grammar: w, code: he};
          function _e(et) {
            j.highlightedCode = et, R.hooks.run('before-insert', j),
            j.element.innerHTML = j.highlightedCode, R.hooks.run('after-highlight', j),
            R.hooks.run('complete', j), v && v.call(j.element)
          }
          if (R.hooks.run('before-sanity-check', j), !j.code) {
            R.hooks.run('complete', j), v && v.call(j.element);
            return
          }
          if (R.hooks.run('before-highlight', j), !j.grammar) {
            _e(R.util.encode(j.code));
            return
          }
          if (m && M.Worker) {
            var xe = new Worker(R.filename);
            xe.onmessage =
                function(et) {
              _e(et.data)
            },
            xe.postMessage(JSON.stringify({language: j.language, code: j.code, immediateClose: !0}))
          } else
            _e(R.highlight(j.code, j.grammar, j.language))
        },
        highlight: function(y, m, v) {
          var k = {code: y, grammar: m, language: v};
          return R.hooks.run('before-tokenize', k),
                 k.tokens = R.tokenize(k.code, k.grammar), R.hooks.run('after-tokenize', k),
                 Se.stringify(R.util.encode(k.tokens), k.language)
        },
        tokenize: function(y, m) {
          var v = m.rest;
          if (v) {
            for (var k in v) m[k] = v[k];
            delete m.rest
          }
          var w = new je;
          return Qe(w, w.head, y), qe(y, w, m, w.head, 0), ut(w)
        },
        hooks: {
          all: {},
          add: function(y, m) {
            var v = R.hooks.all;
            v[y] = v[y] || [], v[y].push(m)
          },
          run: function(y, m) {
            var v = R.hooks.all[y];
            if (!(!v || !v.length))
              for (var k = 0, w; w = v[k++];) w(m)
          }
        },
        Token: Se
      };
      M.Prism = R;
      function Se(y, m, v, k) {
        this.type = y, this.content = m, this.alias = v, this.length = (k || '').length | 0
      }
      Se.stringify = function y(m, v) {
        if (typeof m == 'string') return m;
        if (Array.isArray(m)) {
          var k = '';
          return m.forEach(function(_e) {
            k += y(_e, v)
          }),
                 k
        }
        var w = {
          type: m.type,
          content: y(m.content, v),
          tag: 'span',
          classes: ['token', m.type],
          attributes: {},
          language: v
        },
            L = m.alias;
        L && (Array.isArray(L) ? Array.prototype.push.apply(w.classes, L) : w.classes.push(L)),
            R.hooks.run('wrap', w);
        var he = '';
        for (var j in w.attributes)
          he += ' ' + j + '="' + (w.attributes[j] || '').replace(/"/g, '&quot;') + '"';
        return '<' + w.tag + ' class="' + w.classes.join(' ') + '"' + he + '>' + w.content + '</' +
            w.tag + '>'
      };
      function qe(y, m, v, k, w, L) {
        for (var he in v)
          if (!(!v.hasOwnProperty(he) || !v[he])) {
            var j = v[he];
            j = Array.isArray(j) ? j : [j];
            for (var _e = 0; _e < j.length; ++_e) {
              if (L && L.cause == he + ',' + _e) return;
              var xe = j[_e], et = xe.inside, wt = !!xe.lookbehind, it = !!xe.greedy, ct = 0,
                  Ot = xe.alias;
              if (it && !xe.pattern.global) {
                var gt = xe.pattern.toString().match(/[imsuy]*$/)[0];
                xe.pattern = RegExp(xe.pattern.source, gt + 'g')
              }
              for (var ot = xe.pattern || xe, Te = k.next, Ve = w;
                   Te !== m.tail && !(L && Ve >= L.reach); Ve += Te.value.length, Te = Te.next) {
                var Be = Te.value;
                if (m.length > y.length) return;
                if (!(Be instanceof Se)) {
                  var Ae = 1;
                  if (it && Te != m.tail.prev) {
                    ot.lastIndex = Ve;
                    var Me = ot.exec(y);
                    if (!Me) break;
                    var Ze = Me.index + (wt && Me[1] ? Me[1].length : 0),
                        ft = Me.index + Me[0].length, Ye = Ve;
                    for (Ye += Te.value.length; Ze >= Ye;) Te = Te.next, Ye += Te.value.length;
                    if (Ye -= Te.value.length, Ve = Ye, Te.value instanceof Se) continue;
                    for (var Ie = Te; Ie !== m.tail && (Ye < ft || typeof Ie.value == 'string');
                         Ie = Ie.next)
                      Ae++, Ye += Ie.value.length;
                    Ae--, Be = y.slice(Ve, Ye), Me.index -= Ve
                  } else {
                    ot.lastIndex = 0;
                    var Me = ot.exec(Be)
                  }
                  if (!!Me) {
                    wt && (ct = Me[1] ? Me[1].length : 0);
                    var Ze = Me.index + ct, He = Me[0].slice(ct), ft = Ze + He.length,
                        ht = Be.slice(0, Ze), Dt = Be.slice(ft), at = Ve + Be.length;
                    L && at > L.reach && (L.reach = at);
                    var ne = Te.prev;
                    ht && (ne = Qe(m, ne, ht), Ve += ht.length), lt(m, ne, Ae);
                    var Ke = new Se(he, et ? R.tokenize(He, et) : He, Ot, He);
                    Te = Qe(m, ne, Ke), Dt && Qe(m, Te, Dt),
                    Ae > 1 && qe(y, m, v, Te.prev, Ve, {cause: he + ',' + _e, reach: at})
                  }
                }
              }
            }
          }
      }
      function je() {
        var y = {value: null, prev: null, next: null}, m = {value: null, prev: y, next: null};
        y.next = m, this.head = y, this.tail = m, this.length = 0
      }
      function Qe(y, m, v) {
        var k = m.next, w = {value: v, prev: m, next: k};
        return m.next = w, k.prev = w, y.length++, w
      }
      function lt(y, m, v) {
        for (var k = m.next, w = 0; w < v && k !== y.tail; w++) k = k.next;
        m.next = k, k.prev = m, y.length -= w
      }
      function ut(y) {
        for (var m = [], v = y.head.next; v !== y.tail;) m.push(v.value), v = v.next;
        return m
      }
      if (!M.document)
        return M.addEventListener &&
                   (R.disableWorkerMessageHandler ||
                    M.addEventListener(
                        'message',
                        function(y) {
                          var m = JSON.parse(y.data), v = m.language, k = m.code,
                              w = m.immediateClose;
                          M.postMessage(R.highlight(k, R.languages[v], v)), w && M.close()
                        },
                        !1)),
               R;
      var Re = R.util.currentScript();
      Re && (R.filename = Re.src, Re.hasAttribute('data-manual') && (R.manual = !0));
      function $e() {
        R.manual || R.highlightAll()
      }
      if (!R.manual) {
        var Xe = document.readyState;
        Xe === 'loading' || Xe === 'interactive' && Re && Re.defer ?
            document.addEventListener('DOMContentLoaded', $e) :
            window.requestAnimationFrame ? window.requestAnimationFrame($e) :
                                           window.setTimeout($e, 16)
      }
      return R
    }(mr);
    typeof Kt != 'undefined' && Kt.exports && (Kt.exports = ee);
    typeof global != 'undefined' && (global.Prism = ee);
    ee.languages.markup = {
      comment: /<!--[\s\S]*?-->/,
      prolog: /<\?[\s\S]+?\?>/,
      doctype: {
        pattern:
            /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
        greedy: !0,
        inside: {
          'internal-subset':
              {pattern: /(\[)[\s\S]+(?=\]>$)/, lookbehind: !0, greedy: !0, inside: null},
          string: {pattern: /"[^"]*"|'[^']*'/, greedy: !0},
          punctuation: /^<!|>$|[[\]]/,
          'doctype-tag': /^DOCTYPE/,
          name: /[^\s<>'"]+/
        }
      },
      cdata: /<!\[CDATA\[[\s\S]*?]]>/i,
      tag: {
        pattern:
            /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
        greedy: !0,
        inside: {
          tag: {
            pattern: /^<\/?[^\s>\/]+/,
            inside: {punctuation: /^<\/?/, namespace: /^[^\s>\/:]+:/}
          },
          'attr-value': {
            pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
            inside: {punctuation: [{pattern: /^=/, alias: 'attr-equals'}, /"|'/]}
          },
          punctuation: /\/?>/,
          'attr-name': {pattern: /[^\s>\/]+/, inside: {namespace: /^[^\s>\/:]+:/}}
        }
      },
      entity: [{pattern: /&[\da-z]{1,8};/i, alias: 'named-entity'}, /&#x?[\da-f]{1,8};/i]
    };
    ee.languages.markup.tag.inside['attr-value'].inside.entity = ee.languages.markup.entity;
    ee.languages.markup.doctype.inside['internal-subset'].inside = ee.languages.markup;
    ee.hooks.add('wrap', function(M) {
      M.type === 'entity' && (M.attributes.title = M.content.replace(/&amp;/, '&'))
    });
    Object.defineProperty(ee.languages.markup.tag, 'addInlined', {
      value: function(re, we) {
        var R = {};
        R['language-' + we] = {
          pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
          lookbehind: !0,
          inside: ee.languages[we]
        },
                        R.cdata = /^<!\[CDATA\[|\]\]>$/i;
        var Se = {'included-cdata': {pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i, inside: R}};
        Se['language-' + we] = {pattern: /[\s\S]+/, inside: ee.languages[we]};
        var qe = {};
        qe[re] = {
          pattern: RegExp(
              /(<__[\s\S]*?>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/
                  .source.replace(
                      /__/g,
                      function() {
                        return re
                      }),
              'i'),
          lookbehind: !0,
          greedy: !0,
          inside: Se
        },
        ee.languages.insertBefore('markup', 'cdata', qe)
      }
    });
    ee.languages.html = ee.languages.markup;
    ee.languages.mathml = ee.languages.markup;
    ee.languages.svg = ee.languages.markup;
    ee.languages.xml = ee.languages.extend('markup', {});
    ee.languages.ssml = ee.languages.xml;
    ee.languages.atom = ee.languages.xml;
    ee.languages.rss = ee.languages.xml;
    (function(M) {
      var re = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;
      M.languages.css = {
        comment: /\/\*[\s\S]*?\*\//,
        atrule: {
          pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
          inside: {
            rule: /^@[\w-]+/,
            'selector-function-argument': {
              pattern:
                  /(\bselector\s*\((?!\s*\))\s*)(?:[^()]|\((?:[^()]|\([^()]*\))*\))+?(?=\s*\))/,
              lookbehind: !0,
              alias: 'selector'
            },
            keyword: {pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/, lookbehind: !0}
          }
        },
        url: {
          pattern: RegExp(
              '\\burl\\((?:' + re.source + '|' +
                  /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)',
              'i'),
          greedy: !0,
          inside: {
            function: /^url/i,
            punctuation: /^\(|\)$/,
            string: {pattern: RegExp('^' + re.source + '$'), alias: 'url'}
          }
        },
        selector: RegExp(`[^{}\\s](?:[^{};"']|` + re.source + ')*?(?=\\s*\\{)'),
        string: {pattern: re, greedy: !0},
        property: /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
        important: /!important\b/i,
        function: /[-a-z0-9]+(?=\()/i,
        punctuation: /[(){};:,]/
      },
      M.languages.css.atrule.inside.rest = M.languages.css;
      var we = M.languages.markup;
      we &&
          (we.tag.addInlined('style', 'css'),
           M.languages.insertBefore(
               'inside', 'attr-value', {
                 'style-attr': {
                   pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
                   inside: {
                     'attr-name': {pattern: /^\s*style/i, inside: we.tag.inside},
                     punctuation: /^\s*=\s*['"]|['"]\s*$/,
                     'attr-value': {pattern: /.+/i, inside: M.languages.css}
                   },
                   alias: 'language-css'
                 }
               },
               we.tag))
    })(ee);
    ee.languages.clike = {
      comment: [
        {pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/, lookbehind: !0},
        {pattern: /(^|[^\\:])\/\/.*/, lookbehind: !0, greedy: !0}
      ],
      string: {pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/, greedy: !0},
      'class-name': {
        pattern:
            /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
        lookbehind: !0,
        inside: {punctuation: /[.\\]/}
      },
      keyword:
          /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
      boolean: /\b(?:true|false)\b/,
      function: /\w+(?=\()/,
      number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
      operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
      punctuation: /[{}[\];(),.:]/
    };
    ee.languages.javascript = ee.languages.extend('clike', {
      'class-name': [
        ee.languages.clike['class-name'], {
          pattern:
              /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
          lookbehind: !0
        }
      ],
      keyword: [
        {pattern: /((?:^|})\s*)(?:catch|finally)\b/, lookbehind: !0}, {
          pattern:
              /(^|[^.]|\.\.\.\s*)\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|(?:get|set)(?=\s*[\[$\w\xA0-\uFFFF])|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
          lookbehind: !0
        }
      ],
      number:
          /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
      function: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
      operator:
          /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
    });
    ee.languages.javascript['class-name'][0].pattern =
        /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;
    ee.languages.insertBefore('javascript', 'keyword', {
      regex: {
        pattern:
            /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
        lookbehind: !0,
        greedy: !0
      },
      'function-variable': {
        pattern:
            /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
        alias: 'function'
      },
      parameter: [
        {
          pattern:
              /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
          lookbehind: !0,
          inside: ee.languages.javascript
        },
        {pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i, inside: ee.languages.javascript},
        {
          pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
          lookbehind: !0,
          inside: ee.languages.javascript
        },
        {
          pattern:
              /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
          lookbehind: !0,
          inside: ee.languages.javascript
        }
      ],
      constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    });
    ee.languages.insertBefore('javascript', 'string', {
      'template-string': {
        pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
        greedy: !0,
        inside: {
          'template-punctuation': {pattern: /^`|`$/, alias: 'string'},
          interpolation: {
            pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
            lookbehind: !0,
            inside: {
              'interpolation-punctuation': {pattern: /^\${|}$/, alias: 'punctuation'},
              rest: ee.languages.javascript
            }
          },
          string: /[\s\S]+/
        }
      }
    });
    ee.languages.markup && ee.languages.markup.tag.addInlined('script', 'javascript');
    ee.languages.js = ee.languages.javascript;
    (function() {
      if (typeof self == 'undefined' || !self.Prism || !self.document) return;
      var M = window.Prism, re = 'Loading\u2026',
          we =
              function(y, m) {
            return '\u2716 Error ' + y + ' while fetching file: ' + m
          },
          R = '\u2716 Error: File does not exist or is empty', Se = {
            js: 'javascript',
            py: 'python',
            rb: 'ruby',
            ps1: 'powershell',
            psm1: 'powershell',
            sh: 'bash',
            bat: 'batch',
            h: 'c',
            tex: 'latex'
          },
          qe = 'data-src-status', je = 'loading', Qe = 'loaded', lt = 'failed',
          ut = 'pre[data-src]:not([' + qe + '="' + Qe + '"]):not([' + qe + '="' + je + '"])',
          Re = /\blang(?:uage)?-([\w-]+)\b/i;
      function $e(y, m) {
        var v = y.className;
        v = v.replace(Re, ' ') + ' language-' + m, y.className = v.replace(/\s+/g, ' ').trim()
      }
      M.hooks.add('before-highlightall', function(y) {
        y.selector += ', ' + ut
      }), M.hooks.add('before-sanity-check', function(y) {
        var m = y.element;
        if (m.matches(ut)) {
          y.code = '', m.setAttribute(qe, je);
          var v = m.appendChild(document.createElement('CODE'));
          v.textContent = re;
          var k = m.getAttribute('data-src'), w = y.language;
          if (w === 'none') {
            var L = (/\.(\w+)$/.exec(k) || [, 'none'])[1];
            w = Se[L] || L
          }
          $e(v, w), $e(m, w);
          var he = M.plugins.autoloader;
          he && he.loadLanguages(w);
          var j = new XMLHttpRequest;
          j.open('GET', k, !0), j.onreadystatechange = function() {
            j.readyState == 4 &&
                (j.status < 400 && j.responseText ?
                     (m.setAttribute(qe, Qe), v.textContent = j.responseText,
                      M.highlightElement(v)) :
                     (m.setAttribute(qe, lt),
                      j.status >= 400 ? v.textContent = we(j.status, j.statusText) :
                                        v.textContent = R))
          }, j.send(null)
        }
      }), M.plugins.fileHighlight = {
        highlight: function(m) {
          for (var v = (m || document).querySelectorAll(ut), k = 0, w; w = v[k++];)
            M.highlightElement(w)
        }
      };
      var Xe = !1;
      M.fileHighlight = function() {
        Xe ||
            (console.warn(
                 'Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead.'),
             Xe = !0),
            M.plugins.fileHighlight.highlight.apply(this, arguments)
      }
    })()
  });
  (function(M) {
    typeof define == 'function' && define.amd ? define(M) : M()
  })(function() {
    'use strict';
    var M = function(r) {
      var a = r.performance;
      function s(C) {
        a && a.mark && a.mark(C)
      }
      function l(C, p) {
        a && a.measure && a.measure(C, p)
      }
      s('Zone');
      var d = r.__Zone_symbol_prefix || '__zone_symbol__';
      function E(C) {
        return d + C
      }
      var A = r[E('forceDuplicateZoneCheck')] === !0;
      if (r.Zone) {
        if (A || typeof r.Zone.__symbol__ != 'function') throw new Error('Zone already loaded.');
        return r.Zone
      }
      var S = function() {
        function C(p, f) {
          this._parent = p, this._name = f ? f.name || 'unnamed' : '<root>',
          this._properties = f && f.properties || {},
          this._zoneDelegate = new T(this, this._parent && this._parent._zoneDelegate, f)
        }
        return C.assertZonePatched =
                   function() {
          if (r.Promise !== Ee.ZoneAwarePromise)
            throw new Error(
                'Zone.js has detected that ZoneAwarePromise `(window|global).Promise` has been overwritten.\nMost likely cause is that a Promise polyfill has been loaded after Zone.js (Polyfilling Promise api is not necessary when zone.js is loaded. If you must load one, do so before loading zone.js.)')
        },
               Object.defineProperty(C, 'root', {
                 get: function() {
                   for (var p = C.current; p.parent;) p = p.parent;
                   return p
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               Object.defineProperty(C, 'current', {
                 get: function() {
                   return ce.zone
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               Object.defineProperty(C, 'currentTask', {
                 get: function() {
                   return rt
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               C.__load_patch =
                   function(p, f) {
                 if (Ee.hasOwnProperty(p)) {
                   if (A) throw Error('Already loaded patch: ' + p)
                 } else if (!r['__Zone_disable_' + p]) {
                   var g = 'Zone:' + p;
                   s(g), Ee[p] = f(r, C, K), l(g, g)
                 }
               },
               Object.defineProperty(C.prototype, 'parent', {
                 get: function() {
                   return this._parent
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               Object.defineProperty(C.prototype, 'name', {
                 get: function() {
                   return this._name
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               C.prototype.get = function(p) {
                 var f = this.getZoneWith(p);
                 if (f) return f._properties[p]
               }, C.prototype.getZoneWith = function(p) {
                 for (var f = this; f;) {
                   if (f._properties.hasOwnProperty(p)) return f;
                   f = f._parent
                 }
                 return null
               }, C.prototype.fork = function(p) {
                 if (!p) throw new Error('ZoneSpec required!');
                 return this._zoneDelegate.fork(this, p)
               }, C.prototype.wrap = function(p, f) {
                 if (typeof p != 'function') throw new Error('Expecting function got: ' + p);
                 var g = this._zoneDelegate.intercept(this, p, f), Y = this;
                 return function() {
                   return Y.runGuarded(g, this, arguments, f)
                 }
               }, C.prototype.run = function(p, f, g, Y) {
                 ce = {parent: ce, zone: this};
                 try {
                   return this._zoneDelegate.invoke(this, p, f, g, Y)
                 } finally {
                   ce = ce.parent
                 }
               }, C.prototype.runGuarded = function(p, f, g, Y) {
                 f === void 0 && (f = null), ce = {parent: ce, zone: this};
                 try {
                   try {
                     return this._zoneDelegate.invoke(this, p, f, g, Y)
                   } catch (fe) {
                     if (this._zoneDelegate.handleError(this, fe)) throw fe
                   }
                 } finally {
                   ce = ce.parent
                 }
               }, C.prototype.runTask = function(p, f, g) {
                 if (p.zone != this)
                   throw new Error(
                       'A task can only be run in the zone of creation! (Creation: ' +
                       (p.zone || De).name + '; Execution: ' + this.name + ')');
                 if (!(p.state === pe && (p.type === J || p.type === Pe))) {
                   var Y = p.state != V;
                   Y && p._transitionTo(V, be), p.runCount++;
                   var fe = rt;
                   rt = p, ce = {parent: ce, zone: this};
                   try {
                     p.type == Pe && p.data && !p.data.isPeriodic && (p.cancelFn = void 0);
                     try {
                       return this._zoneDelegate.invokeTask(this, p, f, g)
                     } catch (nt) {
                       if (this._zoneDelegate.handleError(this, nt)) throw nt
                     }
                   } finally {
                     p.state !== pe && p.state !== le &&
                         (p.type == J || p.data && p.data.isPeriodic ?
                              Y && p._transitionTo(be, V) :
                              (p.runCount = 0, this._updateTaskCount(p, -1),
                               Y && p._transitionTo(pe, V, pe))),
                         ce = ce.parent, rt = fe
                   }
                 }
               }, C.prototype.scheduleTask = function(p) {
                 if (p.zone && p.zone !== this)
                   for (var f = this; f;) {
                     if (f === p.zone)
                       throw Error(
                           'can not reschedule task to ' + this.name +
                           ' which is descendants of the original zone ' + p.zone.name);
                     f = f.parent
                   }
                 p._transitionTo(ye, pe);
                 var g = [];
                 p._zoneDelegates = g, p._zone = this;
                 try {
                   p = this._zoneDelegate.scheduleTask(this, p)
                 } catch (Y) {
                   throw p._transitionTo(le, ye, pe), this._zoneDelegate.handleError(this, Y), Y
                 }
                 return p._zoneDelegates === g && this._updateTaskCount(p, 1),
                        p.state == ye && p._transitionTo(be, ye), p
               }, C.prototype.scheduleMicroTask = function(p, f, g, Y) {
                 return this.scheduleTask(new x(Ue, p, f, g, Y, void 0))
               }, C.prototype.scheduleMacroTask = function(p, f, g, Y, fe) {
                 return this.scheduleTask(new x(Pe, p, f, g, Y, fe))
               }, C.prototype.scheduleEventTask = function(p, f, g, Y, fe) {
                 return this.scheduleTask(new x(J, p, f, g, Y, fe))
               }, C.prototype.cancelTask = function(p) {
                 if (p.zone != this)
                   throw new Error(
                       'A task can only be cancelled in the zone of creation! (Creation: ' +
                       (p.zone || De).name + '; Execution: ' + this.name + ')');
                 p._transitionTo(Le, be, V);
                 try {
                   this._zoneDelegate.cancelTask(this, p)
                 } catch (f) {
                   throw p._transitionTo(le, Le), this._zoneDelegate.handleError(this, f), f
                 }
                 return this._updateTaskCount(p, -1), p._transitionTo(pe, Le), p.runCount = 0, p
               }, C.prototype._updateTaskCount = function(p, f) {
                 var g = p._zoneDelegates;
                 f == -1 && (p._zoneDelegates = null);
                 for (var Y = 0; Y < g.length; Y++) g[Y]._updateTaskCount(p.type, f)
               }, C
      }();
      S.__symbol__ = E;
      var $ = {
        name: '',
        onHasTask: function(C, p, f, g) {
          return C.hasTask(f, g)
        },
        onScheduleTask: function(C, p, f, g) {
          return C.scheduleTask(f, g)
        },
        onInvokeTask: function(C, p, f, g, Y, fe) {
          return C.invokeTask(f, g, Y, fe)
        },
        onCancelTask: function(C, p, f, g) {
          return C.cancelTask(f, g)
        }
      },
          T = function() {
            function C(p, f, g) {
              this._taskCounts = {microTask: 0, macroTask: 0, eventTask: 0}, this.zone = p,
              this._parentDelegate = f, this._forkZS = g && (g && g.onFork ? g : f._forkZS),
              this._forkDlgt = g && (g.onFork ? f : f._forkDlgt),
              this._forkCurrZone = g && (g.onFork ? this.zone : f._forkCurrZone),
              this._interceptZS = g && (g.onIntercept ? g : f._interceptZS),
              this._interceptDlgt = g && (g.onIntercept ? f : f._interceptDlgt),
              this._interceptCurrZone = g && (g.onIntercept ? this.zone : f._interceptCurrZone),
              this._invokeZS = g && (g.onInvoke ? g : f._invokeZS),
              this._invokeDlgt = g && (g.onInvoke ? f : f._invokeDlgt),
              this._invokeCurrZone = g && (g.onInvoke ? this.zone : f._invokeCurrZone),
              this._handleErrorZS = g && (g.onHandleError ? g : f._handleErrorZS),
              this._handleErrorDlgt = g && (g.onHandleError ? f : f._handleErrorDlgt),
              this._handleErrorCurrZone =
                  g && (g.onHandleError ? this.zone : f._handleErrorCurrZone),
              this._scheduleTaskZS = g && (g.onScheduleTask ? g : f._scheduleTaskZS),
              this._scheduleTaskDlgt = g && (g.onScheduleTask ? f : f._scheduleTaskDlgt),
              this._scheduleTaskCurrZone =
                  g && (g.onScheduleTask ? this.zone : f._scheduleTaskCurrZone),
              this._invokeTaskZS = g && (g.onInvokeTask ? g : f._invokeTaskZS),
              this._invokeTaskDlgt = g && (g.onInvokeTask ? f : f._invokeTaskDlgt),
              this._invokeTaskCurrZone = g && (g.onInvokeTask ? this.zone : f._invokeTaskCurrZone),
              this._cancelTaskZS = g && (g.onCancelTask ? g : f._cancelTaskZS),
              this._cancelTaskDlgt = g && (g.onCancelTask ? f : f._cancelTaskDlgt),
              this._cancelTaskCurrZone = g && (g.onCancelTask ? this.zone : f._cancelTaskCurrZone),
              this._hasTaskZS = null, this._hasTaskDlgt = null, this._hasTaskDlgtOwner = null,
              this._hasTaskCurrZone = null;
              var Y = g && g.onHasTask, fe = f && f._hasTaskZS;
              (Y || fe) &&
                  (this._hasTaskZS = Y ? g : $, this._hasTaskDlgt = f,
                   this._hasTaskDlgtOwner = this, this._hasTaskCurrZone = p,
                   g.onScheduleTask ||
                       (this._scheduleTaskZS = $, this._scheduleTaskDlgt = f,
                        this._scheduleTaskCurrZone = this.zone),
                   g.onInvokeTask ||
                       (this._invokeTaskZS = $, this._invokeTaskDlgt = f,
                        this._invokeTaskCurrZone = this.zone),
                   g.onCancelTask ||
                       (this._cancelTaskZS = $, this._cancelTaskDlgt = f,
                        this._cancelTaskCurrZone = this.zone))
            }
            return C.prototype.fork = function(p, f) {
              return this._forkZS ? this._forkZS.onFork(this._forkDlgt, this.zone, p, f) :
                                    new S(p, f)
            }, C.prototype.intercept = function(p, f, g) {
              return this._interceptZS ?
                  this._interceptZS.onIntercept(
                      this._interceptDlgt, this._interceptCurrZone, p, f, g) :
                  f
            }, C.prototype.invoke = function(p, f, g, Y, fe) {
              return this._invokeZS ?
                  this._invokeZS.onInvoke(this._invokeDlgt, this._invokeCurrZone, p, f, g, Y, fe) :
                  f.apply(g, Y)
            }, C.prototype.handleError = function(p, f) {
              return this._handleErrorZS ?
                  this._handleErrorZS.onHandleError(
                      this._handleErrorDlgt, this._handleErrorCurrZone, p, f) :
                  !0
            }, C.prototype.scheduleTask = function(p, f) {
              var g = f;
              if (this._scheduleTaskZS)
                this._hasTaskZS && g._zoneDelegates.push(this._hasTaskDlgtOwner),
                    g = this._scheduleTaskZS.onScheduleTask(
                        this._scheduleTaskDlgt, this._scheduleTaskCurrZone, p, f),
                    g || (g = f);
              else if (f.scheduleFn)
                f.scheduleFn(f);
              else if (f.type == Ue)
                z(f);
              else
                throw new Error('Task is missing scheduleFn.');
              return g
            }, C.prototype.invokeTask = function(p, f, g, Y) {
              return this._invokeTaskZS ?
                  this._invokeTaskZS.onInvokeTask(
                      this._invokeTaskDlgt, this._invokeTaskCurrZone, p, f, g, Y) :
                  f.callback.apply(g, Y)
            }, C.prototype.cancelTask = function(p, f) {
              var g;
              if (this._cancelTaskZS)
                g = this._cancelTaskZS.onCancelTask(
                    this._cancelTaskDlgt, this._cancelTaskCurrZone, p, f);
              else {
                if (!f.cancelFn) throw Error('Task is not cancelable');
                g = f.cancelFn(f)
              }
              return g
            }, C.prototype.hasTask = function(p, f) {
              try {
                this._hasTaskZS &&
                    this._hasTaskZS.onHasTask(this._hasTaskDlgt, this._hasTaskCurrZone, p, f)
              } catch (g) {
                this.handleError(p, g)
              }
            }, C.prototype._updateTaskCount = function(p, f) {
              var g = this._taskCounts, Y = g[p], fe = g[p] = Y + f;
              if (fe < 0) throw new Error('More tasks executed then were scheduled.');
              if (Y == 0 || fe == 0) {
                var nt = {
                  microTask: g.microTask > 0,
                  macroTask: g.macroTask > 0,
                  eventTask: g.eventTask > 0,
                  change: p
                };
                this.hasTask(this.zone, nt)
              }
            }, C
          }(), x = function() {
            function C(p, f, g, Y, fe, nt) {
              if (this._zone = null, this.runCount = 0, this._zoneDelegates = null,
                  this._state = 'notScheduled', this.type = p, this.source = f, this.data = Y,
                  this.scheduleFn = fe, this.cancelFn = nt, !g)
                throw new Error('callback is not defined');
              this.callback = g;
              var dt = this;
              p === J&& Y&& Y.useG ? this.invoke = C.invokeTask : this.invoke = function() {
                return C.invokeTask.call(r, dt, this, arguments)
              }
            }
            return C.invokeTask =
                       function(p, f, g) {
              p || (p = this), Je++;
              try {
                return p.runCount++, p.zone.runTask(p, f, g)
              } finally {
                Je == 1 && Z(), Je--
              }
            },
                   Object.defineProperty(C.prototype, 'zone', {
                     get: function() {
                       return this._zone
                     },
                     enumerable: !0,
                     configurable: !0
                   }),
                   Object.defineProperty(C.prototype, 'state', {
                     get: function() {
                       return this._state
                     },
                     enumerable: !0,
                     configurable: !0
                   }),
                   C.prototype.cancelScheduleRequest = function() {
                     this._transitionTo(pe, ye)
                   }, C.prototype._transitionTo = function(p, f, g) {
                     if (this._state === f || this._state === g)
                       this._state = p, p == pe && (this._zoneDelegates = null);
                     else
                       throw new Error(
                           this.type + ' \'' + this.source + '\': can not transition to \'' + p +
                           '\', expecting state \'' + f + '\'' + (g ? ' or \'' + g + '\'' : '') +
                           ', was \'' + this._state + '\'.')
                   }, C.prototype.toString = function() {
                     return this.data && typeof this.data.handleId != 'undefined' ?
                         this.data.handleId.toString() :
                         Object.prototype.toString.call(this)
                   }, C.prototype.toJSON = function() {
                     return {
                       type: this.type, state: this.state, source: this.source,
                           zone: this.zone.name, runCount: this.runCount
                     }
                   }, C
          }(), I = E('setTimeout'), G = E('Promise'), W = E('then'), X = [], Ne = !1, Fe;
      function z(C) {
        if (Je === 0 && X.length === 0)
          if (Fe || r[G] && (Fe = r[G].resolve(0)), Fe) {
            var p = Fe[W];
            p || (p = Fe.then), p.call(Fe, Z)
          } else
            r[I](Z, 0);
        C && X.push(C)
      }
      function Z() {
        if (!Ne) {
          for (Ne = !0; X.length;) {
            var C = X;
            X = [];
            for (var p = 0; p < C.length; p++) {
              var f = C[p];
              try {
                f.zone.runTask(f, null, null)
              } catch (g) {
                K.onUnhandledError(g)
              }
            }
          }
          K.microtaskDrainDone(), Ne = !1
        }
      }
      var De = {name: 'NO ZONE'}, pe = 'notScheduled', ye = 'scheduling', be = 'scheduled',
          V = 'running', Le = 'canceling', le = 'unknown', Ue = 'microTask', Pe = 'macroTask',
          J = 'eventTask', Ee = {}, K = {
            symbol: E,
            currentZoneFrame: function() {
              return ce
            },
            onUnhandledError: de,
            microtaskDrainDone: de,
            scheduleMicroTask: z,
            showUncaughtError: function() {
              return !S[E('ignoreConsoleErrorUncaughtError')]
            },
            patchEventTarget: function() {
              return []
            },
            patchOnProperties: de,
            patchMethod: function() {
              return de
            },
            bindArguments: function() {
              return []
            },
            patchThen: function() {
              return de
            },
            patchMacroTask: function() {
              return de
            },
            setNativePromise: function(C) {
              C && typeof C.resolve == 'function' && (Fe = C.resolve(0))
            },
            patchEventPrototype: function() {
              return de
            },
            isIEOrEdge: function() {
              return !1
            },
            getGlobalObjects: function() {},
            ObjectDefineProperty: function() {
              return de
            },
            ObjectGetOwnPropertyDescriptor: function() {},
            ObjectCreate: function() {},
            ArraySlice: function() {
              return []
            },
            patchClass: function() {
              return de
            },
            wrapWithCurrentZone: function() {
              return de
            },
            filterProperties: function() {
              return []
            },
            attachOriginToPatched: function() {
              return de
            },
            _redefineProperty: function() {
              return de
            },
            patchCallbacks: function() {
              return de
            }
          },
          ce = {parent: null, zone: new S(null, null)}, rt = null, Je = 0;
      function de() {}
      return l('Zone', 'Zone'), r.Zone = S
    }(typeof window != 'undefined' && window || typeof self != 'undefined' && self || global);
    Zone.__load_patch('ZoneAwarePromise', function(r, a, s) {
      var l = Object.getOwnPropertyDescriptor, d = Object.defineProperty;
      function E(D) {
        if (D && D.toString === Object.prototype.toString) {
          var F = D.constructor && D.constructor.name;
          return (F || '') + ': ' + JSON.stringify(D)
        }
        return D ? D.toString() : Object.prototype.toString.call(D)
      }
      var A = s.symbol, S = [], $ = r[A('DISABLE_WRAPPING_UNCAUGHT_PROMISE_REJECTION')] === !0,
          T = A('Promise'), x = A('then'), I = '__creationTrace__';
      s.onUnhandledError = function(D) {
        if (s.showUncaughtError()) {
          var F = D && D.rejection;
          F ? console.error(
                  'Unhandled Promise rejection:', F instanceof Error ? F.message : F,
                  '; Zone:', D.zone.name, '; Task:', D.task && D.task.source, '; Value:', F,
                  F instanceof Error ? F.stack : void 0) :
              console.error(D)
        }
      }, s.microtaskDrainDone = function() {
        for (var D = function() {
               var F = S.shift();
               try {
                 F.zone.runGuarded(function() {
                   throw F
                 })
               } catch (b) {
                 W(b)
               }
             }; S.length;)
          D()
      };
      var G = A('unhandledPromiseRejectionHandler');
      function W(D) {
        s.onUnhandledError(D);
        try {
          var F = a[G];
          typeof F == 'function' && F.call(this, D)
        } catch (b) {
        }
      }
      function X(D) {
        return D && D.then
      }
      function Ne(D) {
        return D
      }
      function Fe(D) {
        return f.reject(D)
      }
      var z = A('state'), Z = A('value'), De = A('finally'), pe = A('parentPromiseValue'),
          ye = A('parentPromiseState'), be = 'Promise.then', V = null, Le = !0, le = !1, Ue = 0;
      function Pe(D, F) {
        return function(b) {
          try {
            ce(D, F, b)
          } catch (U) {
            ce(D, !1, U)
          }
        }
      }
      var J = function() {
        var D = !1;
        return function(b) {
          return function() {
            D || (D = !0, b.apply(null, arguments))
          }
        }
      }, Ee = 'Promise resolved with itself', K = A('currentTaskTrace');
      function ce(D, F, b) {
        var U = J();
        if (D === b) throw new TypeError(Ee);
        if (D[z] === V) {
          var ae = null;
          try {
            (typeof b == 'object' || typeof b == 'function') && (ae = b && b.then)
          } catch (Ce) {
            return U(function() {
                     ce(D, !1, Ce)
                   })(),
                   D
          }
          if (F !== le && b instanceof f && b.hasOwnProperty(z) && b.hasOwnProperty(Z) &&
              b[z] !== V)
            Je(b), ce(D, b[z], b[Z]);
          else if (F !== le && typeof ae == 'function')
            try {
              ae.call(b, U(Pe(D, F)), U(Pe(D, !1)))
            } catch (Ce) {
              U(function(){ce(D,!1,Ce)})()
            }
          else {
            D[z] = F;
            var ue = D[Z];
            if (D[Z] = b, D[De] === De && F === Le && (D[z] = D[ye], D[Z] = D[pe]),
                F === le && b instanceof Error) {
              var Q = a.currentTask && a.currentTask.data && a.currentTask.data[I];
              Q && d(b, K, {configurable: !0, enumerable: !1, writable: !0, value: Q})
            }
            for (var ge = 0; ge < ue.length;) de(D, ue[ge++], ue[ge++], ue[ge++], ue[ge++]);
            if (ue.length == 0 && F == le) {
              D[z] = Ue;
              var ve = b;
              if (!$) try {
                  throw new Error(
                      'Uncaught (in promise): ' + E(b) +
                      (b && b.stack ? `
` + b.stack :
                                      ''))
                } catch (Ce) {
                  ve = Ce
                }
              ve.rejection = b, ve.promise = D, ve.zone = a.current, ve.task = a.currentTask,
              S.push(ve), s.scheduleMicroTask()
            }
          }
        }
        return D
      }
      var rt = A('rejectionHandledHandler');
      function Je(D) {
        if (D[z] === Ue) {
          try {
            var F = a[rt];
            F && typeof F == 'function' && F.call(this, {rejection: D[Z], promise: D})
          } catch (U) {
          }
          D[z] = le;
          for (var b = 0; b < S.length; b++) D === S[b].promise && S.splice(b, 1)
        }
      }
      function de(D, F, b, U, ae) {
        Je(D);
        var ue = D[z], Q = ue ? typeof U == 'function' ? U : Ne : typeof ae == 'function' ? ae : Fe;
        F.scheduleMicroTask(be, function() {
          try {
            var ge = D[Z], ve = !!b && De === b[De];
            ve && (b[pe] = ge, b[ye] = ue);
            var Ce = F.run(Q, void 0, ve && Q !== Fe && Q !== Ne ? [] : [ge]);
            ce(b, !0, Ce)
          } catch (ke) {
            ce(b, !1, ke)
          }
        }, b)
      }
      var C = 'function ZoneAwarePromise() { [native code] }', p = function() {}, f = function() {
        function D(F) {
          var b = this;
          if (!(b instanceof D)) throw new Error('Must be an instanceof Promise.');
          b[z] = V, b[Z] = [];
          try {
            F && F(Pe(b, Le), Pe(b, le))
          } catch (U) {
            ce(b, !1, U)
          }
        }
        return D.toString =
                   function() {
          return C
        },
               D.resolve =
                   function(F) {
                 return ce(new this(null), Le, F)
               },
               D.reject =
                   function(F) {
                 return ce(new this(null), le, F)
               },
               D.race =
                   function(F) {
                 var b, U, ae = new this(function(ke, ze) {
                             b = ke, U = ze
                           });
                 function ue(ke) {
                   b(ke)
                 }
                 function Q(ke) {
                   U(ke)
                 }
                 for (var ge = 0, ve = F; ge < ve.length; ge++) {
                   var Ce = ve[ge];
                   X(Ce) || (Ce = this.resolve(Ce)), Ce.then(ue, Q)
                 }
                 return ae
               },
               D.all =
                   function(F) {
                 return D.allWithCallback(F)
               },
               D.allSettled =
                   function(F) {
                 var b = this && this.prototype instanceof D ? this : D;
                 return b.allWithCallback(F, {
                   thenCallback: function(U) {
                     return {
                       status: 'fulfilled', value: U
                     }
                   },
                   errorCallback: function(U) {
                     return {
                       status: 'rejected', reason: U
                     }
                   }
                 })
               },
               D.allWithCallback =
                   function(F, b) {
                 for (var U, ae,
                      ue = new this(function(Ft, Ct) {
                        U = Ft, ae = Ct
                      }),
                      Q = 2, ge = 0, ve = [],
                      Ce =
                          function(Ft) {
                            X(Ft) || (Ft = ke.resolve(Ft));
                            var Ct = ge;
                            try {
                              Ft.then(
                                  function(st) {
                                    ve[Ct] = b ? b.thenCallback(st) : st, Q--, Q === 0 && U(ve)
                                  },
                                  function(st) {
                                    b ? (ve[Ct] = b.errorCallback(st), Q--, Q === 0 && U(ve)) :
                                        ae(st)
                                  })
                            } catch (st) {
                              ae(st)
                            }
                            Q++, ge++
                          },
                      ke = this, ze = 0, Ge = F;
                      ze < Ge.length; ze++) {
                   var At = Ge[ze];
                   Ce(At)
                 }
                 return Q -= 2, Q === 0 && U(ve), ue
               },
               Object.defineProperty(D.prototype, Symbol.toStringTag, {
                 get: function() {
                   return 'Promise'
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               Object.defineProperty(D.prototype, Symbol.species, {
                 get: function() {
                   return D
                 },
                 enumerable: !0,
                 configurable: !0
               }),
               D.prototype.then = function(F, b) {
                 var U = this.constructor[Symbol.species];
                 (!U || typeof U != 'function') && (U = this.constructor || D);
                 var ae = new U(p), ue = a.current;
                 return this[z] == V ? this[Z].push(ue, ae, F, b) : de(this, ue, ae, F, b), ae
               }, D.prototype.catch = function(F) {
                 return this.then(null, F)
               }, D.prototype.finally = function(F) {
                 var b = this.constructor[Symbol.species];
                 (!b || typeof b != 'function') && (b = D);
                 var U = new b(p);
                 U[De] = De;
                 var ae = a.current;
                 return this[z] == V ? this[Z].push(ae, U, F, F) : de(this, ae, U, F, F), U
               }, D
      }();
      f.resolve = f.resolve, f.reject = f.reject, f.race = f.race, f.all = f.all;
      var g = r[T] = r.Promise, Y = a.__symbol__('ZoneAwarePromise'), fe = l(r, 'Promise');
      (!fe || fe.configurable) &&
          (fe && delete fe.writable, fe && delete fe.value,
           fe || (fe = {configurable: !0, enumerable: !0}),
           fe.get =
               function() {
                 return r[Y] ? r[Y] : r[T]
               },
           fe.set =
               function(D) {
                 D === f ? r[Y] = D : (r[T] = D, D.prototype[x] || dt(D), s.setNativePromise(D))
               },
           d(r, 'Promise', fe)),
          r.Promise = f;
      var nt = A('thenPatched');
      function dt(D) {
        var F = D.prototype, b = l(F, 'then');
        if (!(b && (b.writable === !1 || !b.configurable))) {
          var U = F.then;
          F[x] = U, D.prototype.then = function(ae, ue) {
            var Q = this, ge = new f(function(ve, Ce) {
                            U.call(Q, ve, Ce)
                          });
            return ge.then(ae, ue)
          }, D[nt] = !0
        }
      }
      s.patchThen = dt;
      function Xt(D) {
        return function() {
          var F = D.apply(this, arguments);
          if (F instanceof f) return F;
          var b = F.constructor;
          return b[nt] || dt(b), F
        }
      }
      if (g) {
        dt(g);
        var N = r.fetch;
        typeof N == 'function' && (r[s.symbol('fetch')] = N, r.fetch = Xt(N))
      }
      return Promise[a.__symbol__('uncaughtPromiseErrors')] = S, f
    });
    var re = Object.getOwnPropertyDescriptor, we = Object.defineProperty, R = Object.getPrototypeOf,
        Se = Object.create, qe = Array.prototype.slice, je = 'addEventListener',
        Qe = 'removeEventListener', lt = Zone.__symbol__(je), ut = Zone.__symbol__(Qe), Re = 'true',
        $e = 'false', Xe = Zone.__symbol__('');
    function y(r, a) {
      return Zone.current.wrap(r, a)
    }
    function m(r, a, s, l, d) {
      return Zone.current.scheduleMacroTask(r, a, s, l, d)
    }
    var v = Zone.__symbol__, k = typeof window != 'undefined', w = k ? window : void 0,
        L = k && w || typeof self == 'object' && self || global, he = 'removeAttribute', j = [null];
    function _e(r, a) {
      for (var s = r.length - 1; s >= 0; s--)
        typeof r[s] == 'function' && (r[s] = y(r[s], a + '_' + s));
      return r
    }
    function xe(r, a) {
      for (var s = r.constructor.name, l = function(E) {
             var A = a[E], S = r[A];
             if (S) {
               var $ = re(r, A);
               if (!et($)) return 'continue';
               r[A] = function(T) {
                 var x = function() {
                   return T.apply(this, _e(arguments, s + '.' + A))
                 };
                 return He(x, T), x
               }(S)
             }
           }, d = 0; d < a.length; d++)
        l(d)
    }
    function et(r) {
      return r ?
          r.writable === !1 ? !1 : !(typeof r.get == 'function' && typeof r.set == 'undefined') :
          !0
    }
    var wt = typeof WorkerGlobalScope != 'undefined' && self instanceof WorkerGlobalScope,
        it = !('nw' in L) && typeof L.process != 'undefined' &&
        {}.toString.call(L.process) === '[object process]',
        ct = !it && !wt && !!(k && w.HTMLElement),
        Ot = typeof L.process != 'undefined' &&
        {}.toString.call(L.process) === '[object process]' && !wt && !!(k && w.HTMLElement),
        gt = {}, ot = function(r) {
          if (r = r || L.event, !!r) {
            var a = gt[r.type];
            a || (a = gt[r.type] = v('ON_PROPERTY' + r.type));
            var s = this || r.target || L, l = s[a], d;
            if (ct && s === w && r.type === 'error') {
              var E = r;
              d = l && l.call(this, E.message, E.filename, E.lineno, E.colno, E.error),
              d === !0 && r.preventDefault()
            } else
              d = l && l.apply(this, arguments), d != null && !d && r.preventDefault();
            return d
          }
        };
    function Te(r, a, s) {
      var l = re(r, a);
      if (!l && s) {
        var d = re(s, a);
        d && (l = {enumerable: !0, configurable: !0})
      }
      if (!(!l || !l.configurable)) {
        var E = v('on' + a + 'patched');
        if (!(r.hasOwnProperty(E) && r[E])) {
          delete l.writable, delete l.value;
          var A = l.get, S = l.set, $ = a.substr(2), T = gt[$];
          T || (T = gt[$] = v('ON_PROPERTY' + $)), l.set = function(x) {
            var I = this;
            if (!I && r === L && (I = L), !!I) {
              var G = I[T];
              G && I.removeEventListener($, ot), S && S.apply(I, j),
                  typeof x == 'function' ? (I[T] = x, I.addEventListener($, ot, !1)) : I[T] = null
            }
          }, l.get = function() {
            var x = this;
            if (!x && r === L && (x = L), !x) return null;
            var I = x[T];
            if (I) return I;
            if (A) {
              var G = A && A.call(this);
              if (G)
                return l.set.call(this, G), typeof x[he] == 'function' && x.removeAttribute(a), G
            }
            return null
          }, we(r, a, l), r[E] = !0
        }
      }
    }
    function Ve(r, a, s) {
      if (a)
        for (var l = 0; l < a.length; l++) Te(r, 'on' + a[l], s);
      else {
        var d = [];
        for (var E in r) E.substr(0, 2) == 'on' && d.push(E);
        for (var A = 0; A < d.length; A++) Te(r, d[A], s)
      }
    }
    var Be = v('originalInstance');
    function Ae(r) {
      var a = L[r];
      if (!!a) {
        L[v(r)] = a, L[r] = function() {
          var d = _e(arguments, r);
          switch (d.length) {
            case 0:
              this[Be] = new a;
              break;
            case 1:
              this[Be] = new a(d[0]);
              break;
            case 2:
              this[Be] = new a(d[0], d[1]);
              break;
            case 3:
              this[Be] = new a(d[0], d[1], d[2]);
              break;
            case 4:
              this[Be] = new a(d[0], d[1], d[2], d[3]);
              break;
            default:
              throw new Error('Arg list too long.')
          }
        }, He(L[r], a);
        var s = new a(function() {}), l;
        for (l in s)
          r === 'XMLHttpRequest' && l === 'responseBlob' || function(d) {
            typeof s[d] == 'function' ? L[r].prototype[d] = function() {
              return this[Be][d].apply(this[Be], arguments)
            } : we(L[r].prototype, d, {
              set: function(E) {
                typeof E == 'function' ? (this[Be][d] = y(E, r + '.' + d), He(this[Be][d], E)) :
                                         this[Be][d] = E
              },
              get: function() {
                return this[Be][d]
              }
            })
          }(l);
        for (l in a) l !== 'prototype' && a.hasOwnProperty(l) && (L[r][l] = a[l])
      }
    }
    function Me(r, a) {
      if (typeof Object.getOwnPropertySymbols == 'function') {
        var s = Object.getOwnPropertySymbols(r);
        s.forEach(function(l) {
          var d = Object.getOwnPropertyDescriptor(r, l);
          Object.defineProperty(a, l, {
            get: function() {
              return r[l]
            },
            set: function(E) {
              d && (!d.writable || typeof d.set != 'function') || (r[l] = E)
            },
            enumerable: d ? d.enumerable : !0,
            configurable: d ? d.configurable : !0
          })
        })
      }
    }
    var Ye = !1;
    function Ie(r, a, s) {
      for (var l = r; l && !l.hasOwnProperty(a);) l = R(l);
      !l && r[a] && (l = r);
      var d = v(a), E = null;
      if (l && !(E = l[d])) {
        E = l[d] = l[a];
        var A = l && re(l, a);
        if (et(A)) {
          var S = s(E, d, a);
          l[a] = function() {
            return S(this, arguments)
          }, He(l[a], E), Ye && Me(E, l[a])
        }
      }
      return E
    }
    function Ze(r, a, s) {
      var l = null;
      function d(E) {
        var A = E.data;
        return A.args[A.cbIdx] = function() {
          E.invoke.apply(this, arguments)
        }, l.apply(A.target, A.args), E
      }
      l = Ie(r, a, function(E) {
        return function(A, S) {
          var $ = s(A, S);
          return $.cbIdx >= 0 && typeof S[$.cbIdx] == 'function' ? m($.name, S[$.cbIdx], $, d) :
                                                                   E.apply(A, S)
        }
      })
    }
    function He(r, a) {
      r[v('OriginalDelegate')] = a
    }
    var ft = !1, ht = !1;
    function Dt() {
      try {
        var r = w.navigator.userAgent;
        if (r.indexOf('MSIE ') !== -1 || r.indexOf('Trident/') !== -1) return !0
      } catch (a) {
      }
      return !1
    }
    function at() {
      if (ft) return ht;
      ft = !0;
      try {
        var r = w.navigator.userAgent;
        (r.indexOf('MSIE ') !== -1 || r.indexOf('Trident/') !== -1 || r.indexOf('Edge/') !== -1) &&
            (ht = !0)
      } catch (a) {
      }
      return ht
    }
    Zone.__load_patch('toString', function(r) {
      var a = Function.prototype.toString, s = v('OriginalDelegate'), l = v('Promise'),
          d = v('Error'), E = function() {
            if (typeof this == 'function') {
              var T = this[s];
              if (T) return typeof T == 'function' ? a.call(T) : Object.prototype.toString.call(T);
              if (this === Promise) {
                var x = r[l];
                if (x) return a.call(x)
              }
              if (this === Error) {
                var I = r[d];
                if (I) return a.call(I)
              }
            }
            return a.call(this)
          };
      E[s] = a, Function.prototype.toString = E;
      var A = Object.prototype.toString, S = '[object Promise]';
      Object.prototype.toString = function() {
        return this instanceof Promise ? S : A.call(this)
      }
    });
    var ne = !1;
    if (typeof window != 'undefined') try {
        var Ke = Object.defineProperty({}, 'passive', {
          get: function() {
            ne = !0
          }
        });
        window.addEventListener('test', Ke, Ke), window.removeEventListener('test', Ke, Ke)
      } catch (r) {
        ne = !1
      }
    var q = {useG: !0}, B = {}, Rt = {}, Nt = new RegExp('^' + Xe + '(\\w+)(true|false)$'),
        vt = v('propagationStopped');
    function Et(r, a) {
      var s = (a ? a(r) : r) + $e, l = (a ? a(r) : r) + Re, d = Xe + s, E = Xe + l;
      B[r] = {}, B[r][$e] = d, B[r][Re] = E
    }
    function Mt(r, a, s) {
      var l = s && s.add || je, d = s && s.rm || Qe, E = s && s.listeners || 'eventListeners',
          A = s && s.rmAll || 'removeAllListeners', S = v(l), $ = '.' + l + ':',
          T = 'prependListener', x = '.' + T + ':', I = function(z, Z, De) {
            if (!z.isRemoved) {
              var pe = z.callback;
              typeof pe == 'object' && pe.handleEvent && (z.callback = function(V) {
                return pe.handleEvent(V)
              }, z.originalDelegate = pe), z.invoke(z, Z, [De]);
              var ye = z.options;
              if (ye && typeof ye == 'object' && ye.once) {
                var be = z.originalDelegate ? z.originalDelegate : z.callback;
                Z[d].call(Z, De.type, be, ye)
              }
            }
          }, G = function(z) {
            if (z = z || r.event, !!z) {
              var Z = this || z.target || r, De = Z[B[z.type][$e]];
              if (De)
                if (De.length === 1)
                  I(De[0], Z, z);
                else
                  for (var pe = De.slice(), ye = 0; ye < pe.length && !(z && z[vt] === !0); ye++)
                    I(pe[ye], Z, z)
            }
          }, W = function(z) {
            if (z = z || r.event, !!z) {
              var Z = this || z.target || r, De = Z[B[z.type][Re]];
              if (De)
                if (De.length === 1)
                  I(De[0], Z, z);
                else
                  for (var pe = De.slice(), ye = 0; ye < pe.length && !(z && z[vt] === !0); ye++)
                    I(pe[ye], Z, z)
            }
          };
      function X(z, Z) {
        if (!z) return !1;
        var De = !0;
        Z && Z.useG !== void 0 && (De = Z.useG);
        var pe = Z && Z.vh, ye = !0;
        Z && Z.chkDup !== void 0 && (ye = Z.chkDup);
        var be = !1;
        Z && Z.rt !== void 0 && (be = Z.rt);
        for (var V = z; V && !V.hasOwnProperty(l);) V = R(V);
        if (!V && z[l] && (V = z), !V || V[S]) return !1;
        var Le = Z && Z.eventNameToString, le = {}, Ue = V[S] = V[l], Pe = V[v(d)] = V[d],
            J = V[v(E)] = V[E], Ee = V[v(A)] = V[A], K;
        Z && Z.prepend && (K = V[v(Z.prepend)] = V[Z.prepend]);
        function ce(N, D) {
          return !ne && typeof N == 'object' && N ?
              !!N.capture :
              !ne || !D ?
              N :
              typeof N == 'boolean' ? {capture: N, passive: !0} :
                                      N ? typeof N == 'object' && N.passive !== !1 ?
                                          Object.assign(Object.assign({}, N), {passive: !0}) :
                                          N :
                                          {passive: !0}
        }
        var rt =
                function(N) {
          if (!le.isExisting)
            return Ue.call(le.target, le.eventName, le.capture ? W : G, le.options)
        },
            Je =
                function(N) {
              if (!N.isRemoved) {
                var D = B[N.eventName], F = void 0;
                D && (F = D[N.capture ? Re : $e]);
                var b = F && N.target[F];
                if (b)
                  for (var U = 0; U < b.length; U++) {
                    var ae = b[U];
                    if (ae === N) {
                      b.splice(U, 1), N.isRemoved = !0,
                                      b.length === 0 && (N.allRemoved = !0, N.target[F] = null);
                      break
                    }
                  }
              }
              if (!!N.allRemoved)
                return Pe.call(N.target, N.eventName, N.capture ? W : G, N.options)
            },
            de =
                function(N) {
              return Ue.call(le.target, le.eventName, N.invoke, le.options)
            },
            C =
                function(N) {
              return K.call(le.target, le.eventName, N.invoke, le.options)
            },
            p =
                function(N) {
              return Pe.call(N.target, N.eventName, N.invoke, N.options)
            },
            f = De ? rt : de, g = De ? Je : p,
            Y =
                function(N, D) {
              var F = typeof D;
              return F === 'function' && N.callback === D ||
                  F === 'object' && N.originalDelegate === D
            },
            fe = Z && Z.diff ? Z.diff : Y, nt = Zone[v('BLACK_LISTED_EVENTS')],
            dt = r[v('PASSIVE_EVENTS')], Xt = function(N, D, F, b, U, ae) {
              return U === void 0 && (U = !1), ae === void 0 && (ae = !1), function() {
                var ue = this || r, Q = arguments[0];
                Z && Z.transferEventName && (Q = Z.transferEventName(Q));
                var ge = arguments[1];
                if (!ge) return N.apply(this, arguments);
                if (it && Q === 'uncaughtException') return N.apply(this, arguments);
                var ve = !1;
                if (typeof ge != 'function') {
                  if (!ge.handleEvent) return N.apply(this, arguments);
                  ve = !0
                }
                if (!(pe && !pe(N, ge, ue, arguments))) {
                  var Ce = ne && !!dt && dt.indexOf(Q) !== -1, ke = ce(arguments[2], Ce);
                  if (nt) {
                    for (var ze = 0; ze < nt.length; ze++)
                      if (Q === nt[ze]) return Ce ? N.call(ue, Q, ge, ke) : N.apply(this, arguments)
                  }
                  var Ge = ke ? typeof ke == 'boolean' ? !0 : ke.capture : !1,
                      At = ke && typeof ke == 'object' ? ke.once : !1, Ft = Zone.current, Ct = B[Q];
                  Ct || (Et(Q, Le), Ct = B[Q]);
                  var st = Ct[Ge ? Re : $e], Pt = ue[st], ar = !1;
                  if (Pt) {
                    if (ar = !0, ye) {
                      for (var ze = 0; ze < Pt.length; ze++)
                        if (fe(Pt[ze], ge)) return
                    }
                  } else
                    Pt = ue[st] = [];
                  var Yt, ir = ue.constructor.name, or = Rt[ir];
                  or && (Yt = or[Q]), Yt || (Yt = ir + D + (Le ? Le(Q) : Q)),
                      le.options = ke, At && (le.options.once = !1), le.target = ue,
                      le.capture = Ge, le.eventName = Q, le.isExisting = ar;
                  var $t = De ? q : void 0;
                  $t && ($t.taskData = le);
                  var kt = Ft.scheduleEventTask(Yt, ge, $t, F, b);
                  if (le.target = null, $t && ($t.taskData = null), At && (ke.once = !0),
                      !ne && typeof kt.options == 'boolean' || (kt.options = ke), kt.target = ue,
                      kt.capture = Ge, kt.eventName = Q, ve && (kt.originalDelegate = ge),
                      ae ? Pt.unshift(kt) : Pt.push(kt), U)
                    return ue
                }
              }
            };
        return V[l] = Xt(Ue, $, f, g, be), K && (V[T] = Xt(K, x, C, g, be, !0)), V[d] = function() {
          var N = this || r, D = arguments[0];
          Z && Z.transferEventName && (D = Z.transferEventName(D));
          var F = arguments[2], b = F ? typeof F == 'boolean' ? !0 : F.capture : !1,
              U = arguments[1];
          if (!U) return Pe.apply(this, arguments);
          if (!(pe && !pe(Pe, U, N, arguments))) {
            var ae = B[D], ue;
            ae && (ue = ae[b ? Re : $e]);
            var Q = ue && N[ue];
            if (Q)
              for (var ge = 0; ge < Q.length; ge++) {
                var ve = Q[ge];
                if (fe(ve, U)) {
                  if (Q.splice(ge, 1), ve.isRemoved = !0,
                      Q.length === 0 && (ve.allRemoved = !0, N[ue] = null, typeof D == 'string')) {
                    var Ce = Xe + 'ON_PROPERTY' + D;
                    N[Ce] = null
                  }
                  return ve.zone.cancelTask(ve), be ? N : void 0
                }
              }
            return Pe.apply(this, arguments)
          }
        }, V[E] = function() {
          var N = this || r, D = arguments[0];
          Z && Z.transferEventName && (D = Z.transferEventName(D));
          for (var F = [], b = Lt(N, Le ? Le(D) : D), U = 0; U < b.length; U++) {
            var ae = b[U], ue = ae.originalDelegate ? ae.originalDelegate : ae.callback;
            F.push(ue)
          }
          return F
        }, V[A] = function() {
          var N = this || r, D = arguments[0];
          if (D) {
            Z && Z.transferEventName && (D = Z.transferEventName(D));
            var Q = B[D];
            if (Q) {
              var ge = Q[$e], ve = Q[Re], Ce = N[ge], ke = N[ve];
              if (Ce)
                for (var ze = Ce.slice(), b = 0; b < ze.length; b++) {
                  var Ge = ze[b], At = Ge.originalDelegate ? Ge.originalDelegate : Ge.callback;
                  this[d].call(this, D, At, Ge.options)
                }
              if (ke)
                for (var ze = ke.slice(), b = 0; b < ze.length; b++) {
                  var Ge = ze[b], At = Ge.originalDelegate ? Ge.originalDelegate : Ge.callback;
                  this[d].call(this, D, At, Ge.options)
                }
            }
          } else {
            for (var F = Object.keys(N), b = 0; b < F.length; b++) {
              var U = F[b], ae = Nt.exec(U), ue = ae && ae[1];
              ue && ue !== 'removeListener' && this[A].call(this, ue)
            }
            this[A].call(this, 'removeListener')
          }
          if (be) return this
        }, He(V[l], Ue), He(V[d], Pe), Ee && He(V[A], Ee), J && He(V[E], J), !0
      }
      for (var Ne = [], Fe = 0; Fe < a.length; Fe++) Ne[Fe] = X(a[Fe], s);
      return Ne
    }
    function Lt(r, a) {
      if (!a) {
        var s = [];
        for (var l in r) {
          var d = Nt.exec(l), E = d && d[1];
          if (E && (!a || E === a)) {
            var A = r[l];
            if (A)
              for (var S = 0; S < A.length; S++) s.push(A[S])
          }
        }
        return s
      }
      var $ = B[a];
      $ || (Et(a), $ = B[a]);
      var T = r[$[$e]], x = r[$[Re]];
      return T ? x ? T.concat(x) : T.slice() : x ? x.slice() : []
    }
    function jt(r, a) {
      var s = r.Event;
      s && s.prototype && a.patchMethod(s.prototype, 'stopImmediatePropagation', function(l) {
        return function(d, E) {
          d[vt] = !0, l && l.apply(d, E)
        }
      })
    }
    function Tt(r, a, s, l, d) {
      var E = Zone.__symbol__(l);
      if (!a[E]) {
        var A = a[E] = a[l];
        a[l] = function(S, $, T) {
          return $ && $.prototype && d.forEach(function(x) {
            var I = s + '.' + l + '::' + x, G = $.prototype;
            if (G.hasOwnProperty(x)) {
              var W = r.ObjectGetOwnPropertyDescriptor(G, x);
              W && W.value ? (W.value = r.wrapWithCurrentZone(W.value, I),
                              r._redefineProperty($.prototype, x, W)) :
                             G[x] && (G[x] = r.wrapWithCurrentZone(G[x], I))
            } else
              G[x] && (G[x] = r.wrapWithCurrentZone(G[x], I))
          }),
                 A.call(a, S, $, T)
        }, r.attachOriginToPatched(a[l], A)
      }
    }
    var Jt =
            [
              'abort',
              'animationcancel',
              'animationend',
              'animationiteration',
              'auxclick',
              'beforeinput',
              'blur',
              'cancel',
              'canplay',
              'canplaythrough',
              'change',
              'compositionstart',
              'compositionupdate',
              'compositionend',
              'cuechange',
              'click',
              'close',
              'contextmenu',
              'curechange',
              'dblclick',
              'drag',
              'dragend',
              'dragenter',
              'dragexit',
              'dragleave',
              'dragover',
              'drop',
              'durationchange',
              'emptied',
              'ended',
              'error',
              'focus',
              'focusin',
              'focusout',
              'gotpointercapture',
              'input',
              'invalid',
              'keydown',
              'keypress',
              'keyup',
              'load',
              'loadstart',
              'loadeddata',
              'loadedmetadata',
              'lostpointercapture',
              'mousedown',
              'mouseenter',
              'mouseleave',
              'mousemove',
              'mouseout',
              'mouseover',
              'mouseup',
              'mousewheel',
              'orientationchange',
              'pause',
              'play',
              'playing',
              'pointercancel',
              'pointerdown',
              'pointerenter',
              'pointerleave',
              'pointerlockchange',
              'mozpointerlockchange',
              'webkitpointerlockerchange',
              'pointerlockerror',
              'mozpointerlockerror',
              'webkitpointerlockerror',
              'pointermove',
              'pointout',
              'pointerover',
              'pointerup',
              'progress',
              'ratechange',
              'reset',
              'resize',
              'scroll',
              'seeked',
              'seeking',
              'select',
              'selectionchange',
              'selectstart',
              'show',
              'sort',
              'stalled',
              'submit',
              'suspend',
              'timeupdate',
              'volumechange',
              'touchcancel',
              'touchmove',
              'touchstart',
              'touchend',
              'transitioncancel',
              'transitionend',
              'waiting',
              'wheel'
            ],
        Ht =
            [
              'afterscriptexecute', 'beforescriptexecute', 'DOMContentLoaded', 'freeze',
              'fullscreenchange', 'mozfullscreenchange', 'webkitfullscreenchange',
              'msfullscreenchange', 'fullscreenerror', 'mozfullscreenerror',
              'webkitfullscreenerror', 'msfullscreenerror', 'readystatechange', 'visibilitychange',
              'resume'
            ],
        mt =
            [
              'absolutedeviceorientation',
              'afterinput',
              'afterprint',
              'appinstalled',
              'beforeinstallprompt',
              'beforeprint',
              'beforeunload',
              'devicelight',
              'devicemotion',
              'deviceorientation',
              'deviceorientationabsolute',
              'deviceproximity',
              'hashchange',
              'languagechange',
              'message',
              'mozbeforepaint',
              'offline',
              'online',
              'paint',
              'pageshow',
              'pagehide',
              'popstate',
              'rejectionhandled',
              'storage',
              'unhandledrejection',
              'unload',
              'userproximity',
              'vrdisplayconnected',
              'vrdisplaydisconnected',
              'vrdisplaypresentchange'
            ],
        It =
            [
              'beforecopy', 'beforecut', 'beforepaste', 'copy', 'cut', 'paste', 'dragstart',
              'loadend', 'animationstart', 'search', 'transitionrun', 'transitionstart',
              'webkitanimationend', 'webkitanimationiteration', 'webkitanimationstart',
              'webkittransitionend'
            ],
        Ut = ['encrypted', 'waitingforkey', 'msneedkey', 'mozinterruptbegin', 'mozinterruptend'],
        Gt =
            [
              'activate',
              'afterupdate',
              'ariarequest',
              'beforeactivate',
              'beforedeactivate',
              'beforeeditfocus',
              'beforeupdate',
              'cellchange',
              'controlselect',
              'dataavailable',
              'datasetchanged',
              'datasetcomplete',
              'errorupdate',
              'filterchange',
              'layoutcomplete',
              'losecapture',
              'move',
              'moveend',
              'movestart',
              'propertychange',
              'resizeend',
              'resizestart',
              'rowenter',
              'rowexit',
              'rowsdelete',
              'rowsinserted',
              'command',
              'compassneedscalibration',
              'deactivate',
              'help',
              'mscontentzoom',
              'msmanipulationstatechanged',
              'msgesturechange',
              'msgesturedoubletap',
              'msgestureend',
              'msgesturehold',
              'msgesturestart',
              'msgesturetap',
              'msgotpointercapture',
              'msinertiastart',
              'mslostpointercapture',
              'mspointercancel',
              'mspointerdown',
              'mspointerenter',
              'mspointerhover',
              'mspointerleave',
              'mspointermove',
              'mspointerout',
              'mspointerover',
              'mspointerup',
              'pointerout',
              'mssitemodejumplistitemremoved',
              'msthumbnailclick',
              'stop',
              'storagecommit'
            ],
        Qt = ['webglcontextrestored', 'webglcontextlost', 'webglcontextcreationerror'],
        er = ['autocomplete', 'autocompleteerror'], St = ['toggle'], xt = ['load'],
        Zt = ['blur', 'error', 'focus', 'load', 'resize', 'scroll', 'messageerror'],
        qt = ['bounce', 'finish', 'start'],
        Vt =
            [
              'loadstart', 'progress', 'abort', 'error', 'load', 'progress', 'timeout', 'loadend',
              'readystatechange'
            ],
        yt =
            [
              'upgradeneeded', 'complete', 'abort', 'success', 'error', 'blocked', 'versionchange',
              'close'
            ],
        tr = ['close', 'error', 'open', 'message'], ie = ['error', 'message'],
        bt = Jt.concat(Qt, er, St, Ht, mt, It, Gt);
    function h(r, a, s) {
      if (!s || s.length === 0) return a;
      var l = s.filter(function(E) {
        return E.target === r
      });
      if (!l || l.length === 0) return a;
      var d = l[0].ignoreProperties;
      return a.filter(function(E) {
        return d.indexOf(E) === -1
      })
    }
    function i(r, a, s, l) {
      if (!!r) {
        var d = h(r, a, s);
        Ve(r, d, l)
      }
    }
    function c(r, a) {
      if (!(it && !Ot) && !Zone[r.symbol('patchEvents')]) {
        var s = typeof WebSocket != 'undefined', l = a.__Zone_ignore_on_properties;
        if (ct) {
          var d = window, E = Dt ? [{target: d, ignoreProperties: ['error']}] : [];
          i(d, bt.concat(['messageerror']), l && l.concat(E), R(d)), i(Document.prototype, bt, l),
              typeof d.SVGElement != 'undefined' && i(d.SVGElement.prototype, bt, l),
              i(Element.prototype, bt, l), i(HTMLElement.prototype, bt, l),
              i(HTMLMediaElement.prototype, Ut, l),
              i(HTMLFrameSetElement.prototype, mt.concat(Zt), l),
              i(HTMLBodyElement.prototype, mt.concat(Zt), l), i(HTMLFrameElement.prototype, xt, l),
              i(HTMLIFrameElement.prototype, xt, l);
          var A = d.HTMLMarqueeElement;
          A && i(A.prototype, qt, l);
          var S = d.Worker;
          S && i(S.prototype, ie, l)
        }
        var $ = a.XMLHttpRequest;
        $ && i($.prototype, Vt, l);
        var T = a.XMLHttpRequestEventTarget;
        T && i(T && T.prototype, Vt, l),
            typeof IDBIndex != 'undefined' &&
            (i(IDBIndex.prototype, yt, l), i(IDBRequest.prototype, yt, l),
             i(IDBOpenDBRequest.prototype, yt, l), i(IDBDatabase.prototype, yt, l),
             i(IDBTransaction.prototype, yt, l), i(IDBCursor.prototype, yt, l)),
            s && i(WebSocket.prototype, tr, l)
      }
    }
    Zone.__load_patch('util', function(r, a, s) {
      s.patchOnProperties = Ve, s.patchMethod = Ie, s.bindArguments = _e, s.patchMacroTask = Ze;
      var l = a.__symbol__('BLACK_LISTED_EVENTS'), d = a.__symbol__('UNPATCHED_EVENTS');
      r[d] && (r[l] = r[d]), r[l] && (a[l] = a[d] = r[l]),
          s.patchEventPrototype = jt, s.patchEventTarget = Mt, s.isIEOrEdge = at,
          s.ObjectDefineProperty = we, s.ObjectGetOwnPropertyDescriptor = re, s.ObjectCreate = Se,
          s.ArraySlice = qe, s.patchClass = Ae, s.wrapWithCurrentZone = y, s.filterProperties = h,
          s.attachOriginToPatched = He, s._redefineProperty = Object.defineProperty,
          s.patchCallbacks = Tt, s.getGlobalObjects = function() {
            return {
              globalSources: Rt, zoneSymbolEventNames: B, eventNames: bt, isBrowser: ct, isMix: Ot,
                  isNode: it, TRUE_STR: Re, FALSE_STR: $e, ZONE_SYMBOL_PREFIX: Xe,
                  ADD_EVENT_LISTENER_STR: je, REMOVE_EVENT_LISTENER_STR: Qe
            }
          }
    });
    var e, t, n, u, o;
    function P() {
      e = Zone.__symbol__, t = Object[e('defineProperty')] = Object.defineProperty,
      n = Object[e('getOwnPropertyDescriptor')] = Object.getOwnPropertyDescriptor,
      u = Object.create, o = e('unconfigurables'), Object.defineProperty = function(r, a, s) {
        if (O(r, a))
          throw new TypeError('Cannot assign to read only property \'' + a + '\' of ' + r);
        var l = s.configurable;
        return a !== 'prototype' && (s = H(r, a, s)), oe(r, a, s, l)
      }, Object.defineProperties = function(r, a) {
        return Object.keys(a).forEach(function(s) {
          Object.defineProperty(r, s, a[s])
        }),
               r
      }, Object.create = function(r, a) {
        return typeof a == 'object' && !Object.isFrozen(a) && Object.keys(a).forEach(function(s) {
          a[s] = H(r, s, a[s])
        }),
               u(r, a)
      }, Object.getOwnPropertyDescriptor = function(r, a) {
        var s = n(r, a);
        return s && O(r, a) && (s.configurable = !1), s
      }
    }
    function _(r, a, s) {
      var l = s.configurable;
      return s = H(r, a, s), oe(r, a, s, l)
    }
    function O(r, a) {
      return r && r[o] && r[o][a]
    }
    function H(r, a, s) {
      return Object.isFrozen(s) || (s.configurable = !0),
             s.configurable ||
                 (!r[o] && !Object.isFrozen(r) && t(r, o, {writable: !0, value: {}}),
                  r[o] && (r[o][a] = !0)),
             s
    }
    function oe(r, a, s, l) {
      try {
        return t(r, a, s)
      } catch (E) {
        if (s.configurable) {
          typeof l == 'undefined' ? delete s.configurable : s.configurable = l;
          try {
            return t(r, a, s)
          } catch (A) {
            var d = null;
            try {
              d = JSON.stringify(s)
            } catch (S) {
              d = s.toString()
            }
            console.log(
                'Attempting to configure \'' + a + '\' with descriptor \'' + d + '\' on object \'' +
                r + '\' and got error, giving up: ' + A)
          }
        } else
          throw E
      }
    }
    function Oe(r, a) {
      var s = a.getGlobalObjects(), l = s.eventNames, d = s.globalSources,
          E = s.zoneSymbolEventNames, A = s.TRUE_STR, S = s.FALSE_STR, $ = s.ZONE_SYMBOL_PREFIX,
          T = 'Anchor,Area,Audio,BR,Base,BaseFont,Body,Button,Canvas,Content,DList,Directory,Div,Embed,FieldSet,Font,Form,Frame,FrameSet,HR,Head,Heading,Html,IFrame,Image,Input,Keygen,LI,Label,Legend,Link,Map,Marquee,Media,Menu,Meta,Meter,Mod,OList,Object,OptGroup,Option,Output,Paragraph,Pre,Progress,Quote,Script,Select,Source,Span,Style,TableCaption,TableCell,TableCol,Table,TableRow,TableSection,TextArea,Title,Track,UList,Unknown,Video',
          x = 'ApplicationCache,EventSource,FileReader,InputMethodContext,MediaController,MessagePort,Node,Performance,SVGElementInstance,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebKitNamedFlow,Window,Worker,WorkerGlobalScope,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload,IDBRequest,IDBOpenDBRequest,IDBDatabase,IDBTransaction,IDBCursor,DBIndex,WebSocket'
                  .split(','),
          I = 'EventTarget', G = [], W = r.wtf, X = T.split(',');
      W ? G = X.map(function(de) {
                 return 'HTML' + de + 'Element'
               }).concat(x) :
          r[I] ? G.push(I) : G = x;
      for (var Ne = r.__Zone_disable_IE_check || !1, Fe = r.__Zone_enable_cross_context_check || !1,
               z = a.isIEOrEdge(), Z = '.addEventListener:', De = '[object FunctionWrapper]',
               pe = 'function __BROWSERTOOLS_CONSOLE_SAFEFUNC() { [native code] }', ye = {
                 MSPointerCancel: 'pointercancel',
                 MSPointerDown: 'pointerdown',
                 MSPointerEnter: 'pointerenter',
                 MSPointerHover: 'pointerhover',
                 MSPointerLeave: 'pointerleave',
                 MSPointerMove: 'pointermove',
                 MSPointerOut: 'pointerout',
                 MSPointerOver: 'pointerover',
                 MSPointerUp: 'pointerup'
               },
               be = 0;
           be < l.length; be++) {
        var V = l[be], Le = V + S, le = V + A, Ue = $ + Le, Pe = $ + le;
        E[V] = {}, E[V][S] = Ue, E[V][A] = Pe
      }
      for (var be = 0; be < X.length; be++)
        for (var J = X[be], Ee = d[J] = {}, K = 0; K < l.length; K++) {
          var V = l[K];
          Ee[V] = J + Z + V
        }
      for (var ce = function(de, C, p, f) {
             if (!Ne && z)
               if (Fe) try {
                   var g = C.toString();
                   if (g === De || g == pe) return de.apply(p, f), !1
                 } catch (Y) {
                   return de.apply(p, f), !1
                 }
               else {
                 var g = C.toString();
                 if (g === De || g == pe) return de.apply(p, f), !1
               }
             else if (Fe)
               try {
                 C.toString()
               } catch (Y) {
                 return de.apply(p, f), !1
               }
             return !0
           }, rt = [], be = 0; be < G.length; be++) {
        var Je = r[G[be]];
        rt.push(Je && Je.prototype)
      }
      return a.patchEventTarget(r, rt, {
        vh: ce,
        transferEventName: function(de) {
          var C = ye[de];
          return C || de
        }
      }),
             Zone[a.symbol('patchEventTarget')] = !!r[I], !0
    }
    function me(r, a) {
      var s = r.getGlobalObjects(), l = s.ADD_EVENT_LISTENER_STR, d = s.REMOVE_EVENT_LISTENER_STR,
          E = a.WebSocket;
      a.EventTarget || r.patchEventTarget(a, [E.prototype]), a.WebSocket = function($, T) {
        var x = arguments.length > 1 ? new E($, T) : new E($), I, G,
            W = r.ObjectGetOwnPropertyDescriptor(x, 'onmessage');
        return W && W.configurable === !1 ?
                   (I = r.ObjectCreate(x), G = x, [l, d, 'send', 'close'].forEach(function(X) {
                     I[X] = function() {
                       var Ne = r.ArraySlice.call(arguments);
                       if (X === l || X === d) {
                         var Fe = Ne.length > 0 ? Ne[0] : void 0;
                         if (Fe) {
                           var z = Zone.__symbol__('ON_PROPERTY' + Fe);
                           x[z] = I[z]
                         }
                       }
                       return x[X].apply(x, Ne)
                     }
                   })) :
                   I = x,
                   r.patchOnProperties(I, ['close', 'error', 'message', 'open'], G), I
      };
      var A = a.WebSocket;
      for (var S in E) A[S] = E[S]
    }
    function te(r, a) {
      var s = r.getGlobalObjects(), l = s.isNode, d = s.isMix;
      if (!(l && !d) && !tt(r, a)) {
        var E = typeof WebSocket != 'undefined';
        _t(r), r.patchClass('XMLHttpRequest'), E && me(r, a), Zone[r.symbol('patchEvents')] = !0
      }
    }
    function tt(r, a) {
      var s = r.getGlobalObjects(), l = s.isBrowser, d = s.isMix;
      if ((l || d) && !r.ObjectGetOwnPropertyDescriptor(HTMLElement.prototype, 'onclick') &&
          typeof Element != 'undefined') {
        var E = r.ObjectGetOwnPropertyDescriptor(Element.prototype, 'onclick');
        if (E && !E.configurable) return !1;
        if (E) {
          r.ObjectDefineProperty(Element.prototype, 'onclick', {
            enumerable: !0,
            configurable: !0,
            get: function() {
              return !0
            }
          });
          var A = document.createElement('div'), S = !!A.onclick;
          return r.ObjectDefineProperty(Element.prototype, 'onclick', E), S
        }
      }
      var $ = a.XMLHttpRequest;
      if (!$) return !1;
      var T = 'onreadystatechange', x = $.prototype, I = r.ObjectGetOwnPropertyDescriptor(x, T);
      if (I) {
        r.ObjectDefineProperty(x, T, {
          enumerable: !0,
          configurable: !0,
          get: function() {
            return !0
          }
        });
        var G = new $, S = !!G.onreadystatechange;
        return r.ObjectDefineProperty(x, T, I || {}), S
      } else {
        var W = r.symbol('fake');
        r.ObjectDefineProperty(x, T, {
          enumerable: !0,
          configurable: !0,
          get: function() {
            return this[W]
          },
          set: function(z) {
            this[W] = z
          }
        });
        var G = new $, X = function() {};
        G.onreadystatechange = X;
        var S = G[W] === X;
        return G.onreadystatechange = null, S
      }
    }
    function _t(r) {
      for (var a = r.getGlobalObjects().eventNames, s = r.symbol('unbound'), l = function(E) {
             var A = a[E], S = 'on' + A;
             self.addEventListener(A, function($) {
               var T = $.target, x, I;
               for (T ? I = T.constructor.name + '.' + S : I = 'unknown.' + S; T;)
                 T[S] && !T[S][s] && (x = r.wrapWithCurrentZone(T[S], I), x[s] = T[S], T[S] = x),
                     T = T.parentElement
             }, !0)
           }, d = 0; d < a.length; d++)
        l(d)
    }
    function pt(r, a) {
      var s = a.getGlobalObjects(), l = s.isBrowser, d = s.isMix;
      if (!(!l && !d || !('registerElement' in r.document))) {
        var E =
            ['createdCallback', 'attachedCallback', 'detachedCallback', 'attributeChangedCallback'];
        a.patchCallbacks(a, document, 'Document', 'registerElement', E)
      }
    }
    (function(r) {
      var a = r.__Zone_symbol_prefix || '__zone_symbol__';
      function s(l) {
        return a + l
      }
      r[s('legacyPatch')] = function() {
        var l = r.Zone;
        l.__load_patch('defineProperty', function(d, E, A) {
          A._redefineProperty = _, P()
        }), l.__load_patch('registerElement', function(d, E, A) {
          pt(d, A)
        }), l.__load_patch('EventTargetLegacy', function(d, E, A) {
          Oe(d, A), te(A, d)
        })
      }
    })(typeof window != 'undefined' ?
           window :
           typeof global != 'undefined' ? global : typeof self != 'undefined' ? self : {});
    var We = v('zoneTask');
    function se(r, a, s, l) {
      var d = null, E = null;
      a += l, s += l;
      var A = {};
      function S(T) {
        var x = T.data;
        function I() {
          try {
            T.invoke.apply(this, arguments)
          } finally {
            T.data && T.data.isPeriodic ||
                (typeof x.handleId == 'number' ? delete A[x.handleId] :
                                                 x.handleId && (x.handleId[We] = null))
          }
        }
        return x.args[0] = I, x.handleId = d.apply(r, x.args), T
      }
      function $(T) {
        return E(T.data.handleId)
      }
      d = Ie(r, a, function(T) {
        return function(x, I) {
          if (typeof I[0] == 'function') {
            var G = {
              isPeriodic: l === 'Interval',
              delay: l === 'Timeout' || l === 'Interval' ? I[1] || 0 : void 0,
              args: I
            },
                W = m(a, I[0], G, S, $);
            if (!W) return W;
            var X = W.data.handleId;
            return typeof X == 'number' ? A[X] = W : X && (X[We] = W),
                                          X && X.ref && X.unref && typeof X.ref == 'function' &&
                       typeof X.unref == 'function' &&
                       (W.ref = X.ref.bind(X), W.unref = X.unref.bind(X)),
                                          typeof X == 'number' || X ? X : W
          } else
            return T.apply(r, I)
        }
      }), E = Ie(r, s, function(T) {
            return function(x, I) {
              var G = I[0], W;
              typeof G == 'number' ? W = A[G] : (W = G && G[We], W || (W = G)),
                                     W && typeof W.type == 'string' ? W.state !== 'notScheduled' &&
                      (W.cancelFn && W.data.isPeriodic || W.runCount === 0) &&
                      (typeof G == 'number' ? delete A[G] : G && (G[We] = null),
                       W.zone.cancelTask(W)) :
                                                                      T.apply(r, I)
            }
          })
    }
    function zt(r, a) {
      var s = a.getGlobalObjects(), l = s.isBrowser, d = s.isMix;
      if (!(!l && !d || !r.customElements || !('customElements' in r))) {
        var E = [
          'connectedCallback', 'disconnectedCallback', 'adoptedCallback', 'attributeChangedCallback'
        ];
        a.patchCallbacks(a, r.customElements, 'customElements', 'define', E)
      }
    }
    function Wt(r, a) {
      if (!Zone[a.symbol('patchEventTarget')]) {
        for (var s = a.getGlobalObjects(), l = s.eventNames, d = s.zoneSymbolEventNames,
                 E = s.TRUE_STR, A = s.FALSE_STR, S = s.ZONE_SYMBOL_PREFIX, $ = 0;
             $ < l.length; $++) {
          var T = l[$], x = T + A, I = T + E, G = S + x, W = S + I;
          d[T] = {}, d[T][A] = G, d[T][E] = W
        }
        var X = r.EventTarget;
        if (!(!X || !X.prototype)) return a.patchEventTarget(r, [X && X.prototype]), !0
      }
    }
    function Bt(r, a) {
      a.patchEventPrototype(r, a)
    }
    Zone.__load_patch('legacy', function(r) {
      var a = r[Zone.__symbol__('legacyPatch')];
      a && a()
    }), Zone.__load_patch('timers', function(r) {
      var a = 'set', s = 'clear';
      se(r, a, s, 'Timeout'), se(r, a, s, 'Interval'), se(r, a, s, 'Immediate')
    }), Zone.__load_patch('requestAnimationFrame', function(r) {
      se(r, 'request', 'cancel', 'AnimationFrame'),
          se(r, 'mozRequest', 'mozCancel', 'AnimationFrame'),
          se(r, 'webkitRequest', 'webkitCancel', 'AnimationFrame')
    }), Zone.__load_patch('blocking', function(r, a) {
      for (var s = ['alert', 'prompt', 'confirm'], l = 0; l < s.length; l++) {
        var d = s[l];
        Ie(r, d, function(E, A, S) {
          return function($, T) {
            return a.current.run(E, r, T, S)
          }
        })
      }
    }), Zone.__load_patch('EventTarget', function(r, a, s) {
      Bt(r, s), Wt(r, s);
      var l = r.XMLHttpRequestEventTarget;
      l && l.prototype && s.patchEventTarget(r, [l.prototype]), Ae('MutationObserver'),
          Ae('WebKitMutationObserver'), Ae('IntersectionObserver'), Ae('FileReader')
    }), Zone.__load_patch('on_property', function(r, a, s) {
      c(s, r)
    }), Zone.__load_patch('customElements', function(r, a, s) {
      zt(r, s)
    }), Zone.__load_patch('XHR', function(r, a) {
      $(r);
      var s = v('xhrTask'), l = v('xhrSync'), d = v('xhrListener'), E = v('xhrScheduled'),
          A = v('xhrURL'), S = v('xhrErrorBeforeScheduled');
      function $(T) {
        var x = T.XMLHttpRequest;
        if (!x) return;
        var I = x.prototype;
        function G(J) {
          return J[s]
        }
        var W = I[lt], X = I[ut];
        if (!W) {
          var Ne = T.XMLHttpRequestEventTarget;
          if (Ne) {
            var Fe = Ne.prototype;
            W = Fe[lt], X = Fe[ut]
          }
        }
        var z = 'readystatechange', Z = 'scheduled';
        function De(J) {
          var Ee = J.data, K = Ee.target;
          K[E] = !1, K[S] = !1;
          var ce = K[d];
          W || (W = K[lt], X = K[ut]), ce && X.call(K, z, ce);
          var rt = K[d] = function() {
            if (K.readyState === K.DONE)
              if (!Ee.aborted && K[E] && J.state === Z) {
                var de = K[a.__symbol__('loadfalse')];
                if (de && de.length > 0) {
                  var C = J.invoke;
                  J.invoke = function() {
                    for (var p = K[a.__symbol__('loadfalse')], f = 0; f < p.length; f++)
                      p[f] === J && p.splice(f, 1);
                    !Ee.aborted && J.state === Z && C.call(J)
                  }, de.push(J)
                } else
                  J.invoke()
              } else
                !Ee.aborted && K[E] === !1 && (K[S] = !0)
          };
          W.call(K, z, rt);
          var Je = K[s];
          return Je || (K[s] = J), Ue.apply(K, Ee.args), K[E] = !0, J
        }
        function pe() {}
        function ye(J) {
          var Ee = J.data;
          return Ee.aborted = !0, Pe.apply(Ee.target, Ee.args)
        }
        var be =
                Ie(I, 'open',
                   function() {
                     return function(J, Ee) {
                       return J[l] = Ee[2] == !1, J[A] = Ee[1], be.apply(J, Ee)
                     }
                   }),
            V = 'XMLHttpRequest.send', Le = v('fetchTaskAborting'), le = v('fetchTaskScheduling'),
            Ue = Ie(I, 'send', function() {
              return function(J, Ee) {
                if (a.current[le] === !0 || J[l]) return Ue.apply(J, Ee);
                var K = {target: J, url: J[A], isPeriodic: !1, args: Ee, aborted: !1},
                    ce = m(V, pe, K, De, ye);
                J && J[S] === !0 && !K.aborted && ce.state === Z && ce.invoke()
              }
            }), Pe = Ie(I, 'abort', function() {
                  return function(J, Ee) {
                    var K = G(J);
                    if (K && typeof K.type == 'string') {
                      if (K.cancelFn == null || K.data && K.data.aborted) return;
                      K.zone.cancelTask(K)
                    } else if (a.current[Le] === !0)
                      return Pe.apply(J, Ee)
                  }
                })
      }
    }), Zone.__load_patch('geolocation', function(r) {
      r.navigator && r.navigator.geolocation &&
          xe(r.navigator.geolocation, ['getCurrentPosition', 'watchPosition'])
    }), Zone.__load_patch('PromiseRejectionEvent', function(r, a) {
      function s(l) {
        return function(d) {
          var E = Lt(r, l);
          E.forEach(function(A) {
            var S = r.PromiseRejectionEvent;
            if (S) {
              var $ = new S(l, {promise: d.promise, reason: d.rejection});
              A.invoke($)
            }
          })
        }
      }
      r.PromiseRejectionEvent &&
          (a[v('unhandledPromiseRejectionHandler')] = s('unhandledrejection'),
           a[v('rejectionHandledHandler')] = s('rejectionhandled'))
    })
  });
  var Ar = lr(cr()), Fr = lr(fr());
  Prism.languages.python = {
    comment: {pattern: /(^|[^\\])#.*/, lookbehind: !0},
    'string-interpolation': {
      pattern: /(?:f|rf|fr)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
      greedy: !0,
      inside: {
        interpolation: {
          pattern: /((?:^|[^{])(?:{{)*){(?!{)(?:[^{}]|{(?!{)(?:[^{}]|{(?!{)(?:[^{}])+})+})+}/,
          lookbehind: !0,
          inside: {
            'format-spec': {pattern: /(:)[^:(){}]+(?=}$)/, lookbehind: !0},
            'conversion-option': {pattern: /![sra](?=[:}]$)/, alias: 'punctuation'},
            rest: null
          }
        },
        string: /[\s\S]+/
      }
    },
    'triple-quoted-string':
        {pattern: /(?:[rub]|rb|br)?("""|''')[\s\S]*?\1/i, greedy: !0, alias: 'string'},
    string: {pattern: /(?:[rub]|rb|br)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i, greedy: !0},
    function: {pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g, lookbehind: !0},
    'class-name': {pattern: /(\bclass\s+)\w+/i, lookbehind: !0},
    decorator: {
      pattern: /(^\s*)@\w+(?:\.\w+)*/im,
      lookbehind: !0,
      alias: ['annotation', 'punctuation'],
      inside: {punctuation: /\./}
    },
    keyword:
        /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
    builtin:
        /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
    boolean: /\b(?:True|False|None)\b/,
    number:
        /(?:\b(?=\d)|\B(?=\.))(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
    operator: /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
    punctuation: /[{}[\];(),.:]/
  },
  Prism.languages.python['string-interpolation'].inside.interpolation.inside.rest =
      Prism.languages.python,
  Prism.languages.py = Prism.languages.python;
})();
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
/**
* @license Angular v9.1.0-next.4+61.sha-e552591.with-local-changes
* (c) 2010-2020 Google LLC. https://angular.io/
* License: MIT
*/
//# sourceMappingURL=runtime.js.map
