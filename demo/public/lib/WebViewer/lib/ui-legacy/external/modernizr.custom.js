/*! modernizr 3.5.0 (Custom Build) | MIT *
 * https://modernizr.com/download/?-csstransitions-filereader-fullscreen-indexeddb-websqldatabase-domprefixes-setclasses-shiv-testallprops-testprop !*/
! function(e, t, n) {
    function r(e, t) {
        return typeof e === t }

    function o() {
        var e, t, n, o, i, a, s;
        for (var l in S)
            if (S.hasOwnProperty(l)) {
                if (e = [], t = S[l], t.name && (e.push(t.name.toLowerCase()), t.options && t.options.aliases && t.options.aliases.length))
                    for (n = 0; n < t.options.aliases.length; n++) e.push(t.options.aliases[n].toLowerCase());
                for (o = r(t.fn, "function") ? t.fn() : t.fn, i = 0; i < e.length; i++) a = e[i], s = a.split("."), 1 === s.length ? Modernizr[s[0]] = o : (!Modernizr[s[0]] || Modernizr[s[0]] instanceof Boolean || (Modernizr[s[0]] = new Boolean(Modernizr[s[0]])), Modernizr[s[0]][s[1]] = o), x.push((o ? "" : "no-") + s.join("-")) } }

    function i(e) {
        var t = E.className,
            n = Modernizr._config.classPrefix || "";
        if (w && (t = t.baseVal), Modernizr._config.enableJSClass) {
            var r = new RegExp("(^|\\s)" + n + "no-js(\\s|$)");
            t = t.replace(r, "$1" + n + "js$2") }
        Modernizr._config.enableClasses && (t += " " + n + e.join(" " + n), w ? E.className.baseVal = t : E.className = t) }

    function a(e, t) {
        return !!~("" + e).indexOf(t) }

    function s() {
        return "function" != typeof t.createElement ? t.createElement(arguments[0]) : w ? t.createElementNS.call(t, "http://www.w3.org/2000/svg", arguments[0]) : t.createElement.apply(t, arguments) }

    function l(e) {
        return e.replace(/([a-z])-([a-z])/g, function(e, t, n) {
            return t + n.toUpperCase() }).replace(/^-/, "") }

    function u(e, t) {
        if ("object" == typeof e)
            for (var n in e) P(e, n) && u(n, e[n]);
        else { e = e.toLowerCase();
            var r = e.split("."),
                o = Modernizr[r[0]];
            if (2 == r.length && (o = o[r[1]]), "undefined" != typeof o) return Modernizr;
            t = "function" == typeof t ? t() : t, 1 == r.length ? Modernizr[r[0]] = t : (!Modernizr[r[0]] || Modernizr[r[0]] instanceof Boolean || (Modernizr[r[0]] = new Boolean(Modernizr[r[0]])), Modernizr[r[0]][r[1]] = t), i([(t && 0 != t ? "" : "no-") + r.join("-")]), Modernizr._trigger(e, t) }
        return Modernizr }

    function c(e, t) {
        return function() {
            return e.apply(t, arguments) } }

    function f(e, t, n) {
        var o;
        for (var i in e)
            if (e[i] in t) return n === !1 ? e[i] : (o = t[e[i]], r(o, "function") ? c(o, n || t) : o);
        return !1 }

    function d(e) {
        return e.replace(/([A-Z])/g, function(e, t) {
            return "-" + t.toLowerCase() }).replace(/^ms-/, "-ms-") }

    function p(t, n, r) {
        var o;
        if ("getComputedStyle" in e) { o = getComputedStyle.call(e, t, n);
            var i = e.console;
            if (null !== o) r && (o = o.getPropertyValue(r));
            else if (i) {
                var a = i.error ? "error" : "log";
                i[a].call(i, "getComputedStyle returning null, its possible modernizr test results are inaccurate") } } else o = !n && t.currentStyle && t.currentStyle[r];
        return o }

    function m() {
        var e = t.body;
        return e || (e = s(w ? "svg" : "body"), e.fake = !0), e }

    function h(e, n, r, o) {
        var i, a, l, u, c = "modernizr",
            f = s("div"),
            d = m();
        if (parseInt(r, 10))
            for (; r--;) l = s("div"), l.id = o ? o[r] : c + (r + 1), f.appendChild(l);
        return i = s("style"), i.type = "text/css", i.id = "s" + c, (d.fake ? d : f).appendChild(i), d.appendChild(f), i.styleSheet ? i.styleSheet.cssText = e : i.appendChild(t.createTextNode(e)), f.id = c, d.fake && (d.style.background = "", d.style.overflow = "hidden", u = E.style.overflow, E.style.overflow = "hidden", E.appendChild(d)), a = n(f, e), d.fake ? (d.parentNode.removeChild(d), E.style.overflow = u, E.offsetHeight) : f.parentNode.removeChild(f), !!a }

    function g(t, r) {
        var o = t.length;
        if ("CSS" in e && "supports" in e.CSS) {
            for (; o--;)
                if (e.CSS.supports(d(t[o]), r)) return !0;
            return !1 }
        if ("CSSSupportsRule" in e) {
            for (var i = []; o--;) i.push("(" + d(t[o]) + ":" + r + ")");
            return i = i.join(" or "), h("@supports (" + i + ") { #modernizr { position: absolute; } }", function(e) {
                return "absolute" == p(e, null, "position") }) }
        return n }

    function v(e, t, o, i) {
        function u() { f && (delete k.style, delete k.modElem) }
        if (i = r(i, "undefined") ? !1 : i, !r(o, "undefined")) {
            var c = g(e, o);
            if (!r(c, "undefined")) return c }
        for (var f, d, p, m, h, v = ["modernizr", "tspan", "samp"]; !k.style && v.length;) f = !0, k.modElem = s(v.shift()), k.style = k.modElem.style;
        for (p = e.length, d = 0; p > d; d++)
            if (m = e[d], h = k.style[m], a(m, "-") && (m = l(m)), k.style[m] !== n) {
                if (i || r(o, "undefined")) return u(), "pfx" == t ? m : !0;
                try { k.style[m] = o } catch (y) {}
                if (k.style[m] != h) return u(), "pfx" == t ? m : !0 }
        return u(), !1 }

    function y(e, t, n, o, i) {
        var a = e.charAt(0).toUpperCase() + e.slice(1),
            s = (e + " " + N.join(a + " ") + a).split(" ");
        return r(t, "string") || r(t, "undefined") ? v(s, t, o, i) : (s = (e + " " + F.join(a + " ") + a).split(" "), f(s, t, n)) }

    function C(e, t, r) {
        return y(e, n, n, t, r) }

    function b(e, t) {
        var n = e.deleteDatabase(t);
        n.onsuccess = function() { u("indexeddb.deletedatabase", !0) }, n.onerror = function() { u("indexeddb.deletedatabase", !1) } }
    var x = [],
        S = [],
        _ = { _version: "3.5.0", _config: { classPrefix: "", enableClasses: !0, enableJSClass: !0, usePrefixes: !0 }, _q: [], on: function(e, t) {
                var n = this;
                setTimeout(function() { t(n[e]) }, 0) }, addTest: function(e, t, n) { S.push({ name: e, fn: t, options: n }) }, addAsyncTest: function(e) { S.push({ name: null, fn: e }) } },
        Modernizr = function() {};
    Modernizr.prototype = _, Modernizr = new Modernizr, Modernizr.addTest("websqldatabase", "openDatabase" in e);
    var E = t.documentElement,
        w = "svg" === E.nodeName.toLowerCase();
    w || ! function(e, t) {
        function n(e, t) {
            var n = e.createElement("p"),
                r = e.getElementsByTagName("head")[0] || e.documentElement;
            return n.innerHTML = "x<style>" + t + "</style>", r.insertBefore(n.lastChild, r.firstChild) }

        function r() {
            var e = C.elements;
            return "string" == typeof e ? e.split(" ") : e }

        function o(e, t) {
            var n = C.elements; "string" != typeof n && (n = n.join(" ")), "string" != typeof e && (e = e.join(" ")), C.elements = n + " " + e, u(t) }

        function i(e) {
            var t = y[e[g]];
            return t || (t = {}, v++, e[g] = v, y[v] = t), t }

        function a(e, n, r) {
            if (n || (n = t), f) return n.createElement(e);
            r || (r = i(n));
            var o;
            return o = r.cache[e] ? r.cache[e].cloneNode() : h.test(e) ? (r.cache[e] = r.createElem(e)).cloneNode() : r.createElem(e), !o.canHaveChildren || m.test(e) || o.tagUrn ? o : r.frag.appendChild(o) }

        function s(e, n) {
            if (e || (e = t), f) return e.createDocumentFragment();
            n = n || i(e);
            for (var o = n.frag.cloneNode(), a = 0, s = r(), l = s.length; l > a; a++) o.createElement(s[a]);
            return o }

        function l(e, t) { t.cache || (t.cache = {}, t.createElem = e.createElement, t.createFrag = e.createDocumentFragment, t.frag = t.createFrag()), e.createElement = function(n) {
                return C.shivMethods ? a(n, e, t) : t.createElem(n) }, e.createDocumentFragment = Function("h,f", "return function(){var n=f.cloneNode(),c=n.createElement;h.shivMethods&&(" + r().join().replace(/[\w\-:]+/g, function(e) {
                return t.createElem(e), t.frag.createElement(e), 'c("' + e + '")' }) + ");return n}")(C, t.frag) }

        function u(e) { e || (e = t);
            var r = i(e);
            return !C.shivCSS || c || r.hasCSS || (r.hasCSS = !!n(e, "article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}mark{background:#FF0;color:#000}template{display:none}")), f || l(e, r), e }
        var c, f, d = "3.7.3",
            p = e.html5 || {},
            m = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i,
            h = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i,
            g = "_html5shiv",
            v = 0,
            y = {};! function() {
            try {
                var e = t.createElement("a");
                e.innerHTML = "<xyz></xyz>", c = "hidden" in e, f = 1 == e.childNodes.length || function() { t.createElement("a");
                    var e = t.createDocumentFragment();
                    return "undefined" == typeof e.cloneNode || "undefined" == typeof e.createDocumentFragment || "undefined" == typeof e.createElement }() } catch (n) { c = !0, f = !0 } }();
        var C = { elements: p.elements || "abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video", version: d, shivCSS: p.shivCSS !== !1, supportsUnknownElements: f, shivMethods: p.shivMethods !== !1, type: "default", shivDocument: u, createElement: a, createDocumentFragment: s, addElements: o };
        e.html5 = C, u(t), "object" == typeof module && module.exports && (module.exports = C) }("undefined" != typeof e ? e : this, t);
    var T = "Moz O ms Webkit",
        F = _._config.usePrefixes ? T.toLowerCase().split(" ") : [];
    _._domPrefixes = F;
    var N = _._config.usePrefixes ? T.split(" ") : [];
    _._cssomPrefixes = N;
    var j = function(t) {
        var r, o = prefixes.length,
            i = e.CSSRule;
        if ("undefined" == typeof i) return n;
        if (!t) return !1;
        if (t = t.replace(/^@/, ""), r = t.replace(/-/g, "_").toUpperCase() + "_RULE", r in i) return "@" + t;
        for (var a = 0; o > a; a++) {
            var s = prefixes[a],
                l = s.toUpperCase() + "_" + r;
            if (l in i) return "@-" + s.toLowerCase() + "-" + t }
        return !1 };
    _.atRule = j;
    var P;! function() {
        var e = {}.hasOwnProperty;
        P = r(e, "undefined") || r(e.call, "undefined") ? function(e, t) {
            return t in e && r(e.constructor.prototype[t], "undefined") } : function(t, n) {
            return e.call(t, n) } }(), _._l = {}, _.on = function(e, t) { this._l[e] || (this._l[e] = []), this._l[e].push(t), Modernizr.hasOwnProperty(e) && setTimeout(function() { Modernizr._trigger(e, Modernizr[e]) }, 0) }, _._trigger = function(e, t) {
        if (this._l[e]) {
            var n = this._l[e];
            setTimeout(function() {
                var e, r;
                for (e = 0; e < n.length; e++)(r = n[e])(t) }, 0), delete this._l[e] } }, Modernizr._q.push(function() { _.addTest = u });
    var z = { elem: s("modernizr") };
    Modernizr._q.push(function() { delete z.elem });
    var k = { style: z.elem.style };
    Modernizr._q.unshift(function() { delete k.style });
    _.testProp = function(e, t, r) {
        return v([e], n, t, r) };
    _.testAllProps = y, _.testAllProps = C, Modernizr.addTest("csstransitions", C("transition", "all", !0));
    var L = _.prefixed = function(e, t, n) {
        return 0 === e.indexOf("@") ? j(e) : (-1 != e.indexOf("-") && (e = l(e)), t ? y(e, t, n) : y(e, "pfx")) };
    Modernizr.addTest("fullscreen", !(!L("exitFullscreen", t, !1) && !L("cancelFullScreen", t, !1))), Modernizr.addAsyncTest(function() {
        var t;
        try { t = L("indexedDB", e) } catch (n) {}
        if (t) {
            try {
            var r = "modernizr-" + Math.random(),
                o = t.open(r);
                o.onerror = function() { o.error && "InvalidStateError" === o.error.name ? u("indexeddb", !1) : (u("indexeddb", !0), b(t, r)) }, o.onsuccess = function() { u("indexeddb", !0), b(t, r) }
            } catch(n) {}} else u("indexeddb", !1) })
    Modernizr.addTest("filereader", !!(e.File && e.FileList && e.FileReader)), o(), i(x), delete _.addTest, delete _.addAsyncTest;
    for (var D = 0; D < Modernizr._q.length; D++) Modernizr._q[D]();
    e.Modernizr = Modernizr }(window, document);
