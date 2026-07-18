// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t3, e4, o5) {
    if (this._$cssResult$ = true, o5 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t3, this.t = e4;
  }
  get styleSheet() {
    let t3 = this.o;
    const s4 = this.t;
    if (e && void 0 === t3) {
      const e4 = void 0 !== s4 && 1 === s4.length;
      e4 && (t3 = o.get(s4)), void 0 === t3 && ((this.o = t3 = new CSSStyleSheet()).replaceSync(this.cssText), e4 && o.set(s4, t3));
    }
    return t3;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t3) => new n("string" == typeof t3 ? t3 : t3 + "", void 0, s);
var i = (t3, ...e4) => {
  const o5 = 1 === t3.length ? t3[0] : e4.reduce((e5, s4, o6) => e5 + ((t4) => {
    if (true === t4._$cssResult$) return t4.cssText;
    if ("number" == typeof t4) return t4;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t4 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t3[o6 + 1], t3[0]);
  return new n(o5, t3, s);
};
var S = (s4, o5) => {
  if (e) s4.adoptedStyleSheets = o5.map((t3) => t3 instanceof CSSStyleSheet ? t3 : t3.styleSheet);
  else for (const e4 of o5) {
    const o6 = document.createElement("style"), n4 = t.litNonce;
    void 0 !== n4 && o6.setAttribute("nonce", n4), o6.textContent = e4.cssText, s4.appendChild(o6);
  }
};
var c = e ? (t3) => t3 : (t3) => t3 instanceof CSSStyleSheet ? ((t4) => {
  let e4 = "";
  for (const s4 of t4.cssRules) e4 += s4.cssText;
  return r(e4);
})(t3) : t3;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t3, s4) => t3;
var u = { toAttribute(t3, s4) {
  switch (s4) {
    case Boolean:
      t3 = t3 ? l : null;
      break;
    case Object:
    case Array:
      t3 = null == t3 ? t3 : JSON.stringify(t3);
  }
  return t3;
}, fromAttribute(t3, s4) {
  let i5 = t3;
  switch (s4) {
    case Boolean:
      i5 = null !== t3;
      break;
    case Number:
      i5 = null === t3 ? null : Number(t3);
      break;
    case Object:
    case Array:
      try {
        i5 = JSON.parse(t3);
      } catch (t4) {
        i5 = null;
      }
  }
  return i5;
} };
var f = (t3, s4) => !i2(t3, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t3) {
    this._$Ei(), (this.l ??= []).push(t3);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t3, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t3) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t3, s4), !s4.noAccessor) {
      const i5 = Symbol(), h3 = this.getPropertyDescriptor(t3, i5, s4);
      void 0 !== h3 && e2(this.prototype, t3, h3);
    }
  }
  static getPropertyDescriptor(t3, s4, i5) {
    const { get: e4, set: r4 } = h(this.prototype, t3) ?? { get() {
      return this[s4];
    }, set(t4) {
      this[s4] = t4;
    } };
    return { get: e4, set(s5) {
      const h3 = e4?.call(this);
      r4?.call(this, s5), this.requestUpdate(t3, h3, i5);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t3) {
    return this.elementProperties.get(t3) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t3 = n2(this);
    t3.finalize(), void 0 !== t3.l && (this.l = [...t3.l]), this.elementProperties = new Map(t3.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t4 = this.properties, s4 = [...r2(t4), ...o2(t4)];
      for (const i5 of s4) this.createProperty(i5, t4[i5]);
    }
    const t3 = this[Symbol.metadata];
    if (null !== t3) {
      const s4 = litPropertyMetadata.get(t3);
      if (void 0 !== s4) for (const [t4, i5] of s4) this.elementProperties.set(t4, i5);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t4, s4] of this.elementProperties) {
      const i5 = this._$Eu(t4, s4);
      void 0 !== i5 && this._$Eh.set(i5, t4);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i5 = [];
    if (Array.isArray(s4)) {
      const e4 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e4) i5.unshift(c(s5));
    } else void 0 !== s4 && i5.push(c(s4));
    return i5;
  }
  static _$Eu(t3, s4) {
    const i5 = s4.attribute;
    return false === i5 ? void 0 : "string" == typeof i5 ? i5 : "string" == typeof t3 ? t3.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t3) => this.enableUpdating = t3), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t3) => t3(this));
  }
  addController(t3) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t3), void 0 !== this.renderRoot && this.isConnected && t3.hostConnected?.();
  }
  removeController(t3) {
    this._$EO?.delete(t3);
  }
  _$E_() {
    const t3 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i5 of s4.keys()) this.hasOwnProperty(i5) && (t3.set(i5, this[i5]), delete this[i5]);
    t3.size > 0 && (this._$Ep = t3);
  }
  createRenderRoot() {
    const t3 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t3, this.constructor.elementStyles), t3;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t3) => t3.hostConnected?.());
  }
  enableUpdating(t3) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t3) => t3.hostDisconnected?.());
  }
  attributeChangedCallback(t3, s4, i5) {
    this._$AK(t3, i5);
  }
  _$ET(t3, s4) {
    const i5 = this.constructor.elementProperties.get(t3), e4 = this.constructor._$Eu(t3, i5);
    if (void 0 !== e4 && true === i5.reflect) {
      const h3 = (void 0 !== i5.converter?.toAttribute ? i5.converter : u).toAttribute(s4, i5.type);
      this._$Em = t3, null == h3 ? this.removeAttribute(e4) : this.setAttribute(e4, h3), this._$Em = null;
    }
  }
  _$AK(t3, s4) {
    const i5 = this.constructor, e4 = i5._$Eh.get(t3);
    if (void 0 !== e4 && this._$Em !== e4) {
      const t4 = i5.getPropertyOptions(e4), h3 = "function" == typeof t4.converter ? { fromAttribute: t4.converter } : void 0 !== t4.converter?.fromAttribute ? t4.converter : u;
      this._$Em = e4;
      const r4 = h3.fromAttribute(s4, t4.type);
      this[e4] = r4 ?? this._$Ej?.get(e4) ?? r4, this._$Em = null;
    }
  }
  requestUpdate(t3, s4, i5, e4 = false, h3) {
    if (void 0 !== t3) {
      const r4 = this.constructor;
      if (false === e4 && (h3 = this[t3]), i5 ??= r4.getPropertyOptions(t3), !((i5.hasChanged ?? f)(h3, s4) || i5.useDefault && i5.reflect && h3 === this._$Ej?.get(t3) && !this.hasAttribute(r4._$Eu(t3, i5)))) return;
      this.C(t3, s4, i5);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t3, s4, { useDefault: i5, reflect: e4, wrapped: h3 }, r4) {
    i5 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t3) && (this._$Ej.set(t3, r4 ?? s4 ?? this[t3]), true !== h3 || void 0 !== r4) || (this._$AL.has(t3) || (this.hasUpdated || i5 || (s4 = void 0), this._$AL.set(t3, s4)), true === e4 && this._$Em !== t3 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t3));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t4) {
      Promise.reject(t4);
    }
    const t3 = this.scheduleUpdate();
    return null != t3 && await t3, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t5, s5] of this._$Ep) this[t5] = s5;
        this._$Ep = void 0;
      }
      const t4 = this.constructor.elementProperties;
      if (t4.size > 0) for (const [s5, i5] of t4) {
        const { wrapped: t5 } = i5, e4 = this[s5];
        true !== t5 || this._$AL.has(s5) || void 0 === e4 || this.C(s5, void 0, i5, e4);
      }
    }
    let t3 = false;
    const s4 = this._$AL;
    try {
      t3 = this.shouldUpdate(s4), t3 ? (this.willUpdate(s4), this._$EO?.forEach((t4) => t4.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t3 = false, this._$EM(), s5;
    }
    t3 && this._$AE(s4);
  }
  willUpdate(t3) {
  }
  _$AE(t3) {
    this._$EO?.forEach((t4) => t4.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t3)), this.updated(t3);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t3) {
    return true;
  }
  update(t3) {
    this._$Eq &&= this._$Eq.forEach((t4) => this._$ET(t4, this[t4])), this._$EM();
  }
  updated(t3) {
  }
  firstUpdated(t3) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t3) => t3;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t3) => t3 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t3) => null === t3 || "object" != typeof t3 && "function" != typeof t3;
var u2 = Array.isArray;
var d2 = (t3) => u2(t3) || "function" == typeof t3?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t3) => (i5, ...s4) => ({ _$litType$: t3, strings: i5, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t3, i5) {
  if (!u2(t3) || !t3.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i5) : i5;
}
var N = (t3, i5) => {
  const s4 = t3.length - 1, e4 = [];
  let n4, l3 = 2 === i5 ? "<svg>" : 3 === i5 ? "<math>" : "", c4 = v;
  for (let i6 = 0; i6 < s4; i6++) {
    const s5 = t3[i6];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n4 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n4 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n4 = void 0);
    const x2 = c4 === p2 && t3[i6 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e4.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i6 : x2);
  }
  return [V(t3, l3 + (t3[s4] || "<?>") + (2 === i5 ? "</svg>" : 3 === i5 ? "</math>" : "")), e4];
};
var S2 = class _S {
  constructor({ strings: t3, _$litType$: i5 }, e4) {
    let r4;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t3.length - 1, d3 = this.parts, [f3, v2] = N(t3, i5);
    if (this.el = _S.createElement(f3, e4), P.currentNode = this.el.content, 2 === i5 || 3 === i5) {
      const t4 = this.el.content.firstChild;
      t4.replaceWith(...t4.childNodes);
    }
    for (; null !== (r4 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r4.nodeType) {
        if (r4.hasAttributes()) for (const t4 of r4.getAttributeNames()) if (t4.endsWith(h2)) {
          const i6 = v2[a3++], s4 = r4.getAttribute(t4).split(o3), e5 = /([.?@])?(.*)/.exec(i6);
          d3.push({ type: 1, index: l3, name: e5[2], strings: s4, ctor: "." === e5[1] ? I : "?" === e5[1] ? L : "@" === e5[1] ? z : H }), r4.removeAttribute(t4);
        } else t4.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r4.removeAttribute(t4));
        if (y2.test(r4.tagName)) {
          const t4 = r4.textContent.split(o3), i6 = t4.length - 1;
          if (i6 > 0) {
            r4.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i6; s4++) r4.append(t4[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r4.append(t4[i6], c3());
          }
        }
      } else if (8 === r4.nodeType) if (r4.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t4 = -1;
        for (; -1 !== (t4 = r4.data.indexOf(o3, t4 + 1)); ) d3.push({ type: 7, index: l3 }), t4 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t3, i5) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t3, s4;
  }
};
function M(t3, i5, s4 = t3, e4) {
  if (i5 === E) return i5;
  let h3 = void 0 !== e4 ? s4._$Co?.[e4] : s4._$Cl;
  const o5 = a2(i5) ? void 0 : i5._$litDirective$;
  return h3?.constructor !== o5 && (h3?._$AO?.(false), void 0 === o5 ? h3 = void 0 : (h3 = new o5(t3), h3._$AT(t3, s4, e4)), void 0 !== e4 ? (s4._$Co ??= [])[e4] = h3 : s4._$Cl = h3), void 0 !== h3 && (i5 = M(t3, h3._$AS(t3, i5.values), h3, e4)), i5;
}
var R = class {
  constructor(t3, i5) {
    this._$AV = [], this._$AN = void 0, this._$AD = t3, this._$AM = i5;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t3) {
    const { el: { content: i5 }, parts: s4 } = this._$AD, e4 = (t3?.creationScope ?? l2).importNode(i5, true);
    P.currentNode = e4;
    let h3 = P.nextNode(), o5 = 0, n4 = 0, r4 = s4[0];
    for (; void 0 !== r4; ) {
      if (o5 === r4.index) {
        let i6;
        2 === r4.type ? i6 = new k(h3, h3.nextSibling, this, t3) : 1 === r4.type ? i6 = new r4.ctor(h3, r4.name, r4.strings, this, t3) : 6 === r4.type && (i6 = new Z(h3, this, t3)), this._$AV.push(i6), r4 = s4[++n4];
      }
      o5 !== r4?.index && (h3 = P.nextNode(), o5++);
    }
    return P.currentNode = l2, e4;
  }
  p(t3) {
    let i5 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t3, s4, i5), i5 += s4.strings.length - 2) : s4._$AI(t3[i5])), i5++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t3, i5, s4, e4) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t3, this._$AB = i5, this._$AM = s4, this.options = e4, this._$Cv = e4?.isConnected ?? true;
  }
  get parentNode() {
    let t3 = this._$AA.parentNode;
    const i5 = this._$AM;
    return void 0 !== i5 && 11 === t3?.nodeType && (t3 = i5.parentNode), t3;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t3, i5 = this) {
    t3 = M(this, t3, i5), a2(t3) ? t3 === A || null == t3 || "" === t3 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t3 !== this._$AH && t3 !== E && this._(t3) : void 0 !== t3._$litType$ ? this.$(t3) : void 0 !== t3.nodeType ? this.T(t3) : d2(t3) ? this.k(t3) : this._(t3);
  }
  O(t3) {
    return this._$AA.parentNode.insertBefore(t3, this._$AB);
  }
  T(t3) {
    this._$AH !== t3 && (this._$AR(), this._$AH = this.O(t3));
  }
  _(t3) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t3 : this.T(l2.createTextNode(t3)), this._$AH = t3;
  }
  $(t3) {
    const { values: i5, _$litType$: s4 } = t3, e4 = "number" == typeof s4 ? this._$AC(t3) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e4) this._$AH.p(i5);
    else {
      const t4 = new R(e4, this), s5 = t4.u(this.options);
      t4.p(i5), this.T(s5), this._$AH = t4;
    }
  }
  _$AC(t3) {
    let i5 = C.get(t3.strings);
    return void 0 === i5 && C.set(t3.strings, i5 = new S2(t3)), i5;
  }
  k(t3) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i5 = this._$AH;
    let s4, e4 = 0;
    for (const h3 of t3) e4 === i5.length ? i5.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i5[e4], s4._$AI(h3), e4++;
    e4 < i5.length && (this._$AR(s4 && s4._$AB.nextSibling, e4), i5.length = e4);
  }
  _$AR(t3 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t3 !== this._$AB; ) {
      const s5 = i3(t3).nextSibling;
      i3(t3).remove(), t3 = s5;
    }
  }
  setConnected(t3) {
    void 0 === this._$AM && (this._$Cv = t3, this._$AP?.(t3));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t3, i5, s4, e4, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t3, this.name = i5, this._$AM = e4, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t3, i5 = this, s4, e4) {
    const h3 = this.strings;
    let o5 = false;
    if (void 0 === h3) t3 = M(this, t3, i5, 0), o5 = !a2(t3) || t3 !== this._$AH && t3 !== E, o5 && (this._$AH = t3);
    else {
      const e5 = t3;
      let n4, r4;
      for (t3 = h3[0], n4 = 0; n4 < h3.length - 1; n4++) r4 = M(this, e5[s4 + n4], i5, n4), r4 === E && (r4 = this._$AH[n4]), o5 ||= !a2(r4) || r4 !== this._$AH[n4], r4 === A ? t3 = A : t3 !== A && (t3 += (r4 ?? "") + h3[n4 + 1]), this._$AH[n4] = r4;
    }
    o5 && !e4 && this.j(t3);
  }
  j(t3) {
    t3 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t3 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t3) {
    this.element[this.name] = t3 === A ? void 0 : t3;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t3) {
    this.element.toggleAttribute(this.name, !!t3 && t3 !== A);
  }
};
var z = class extends H {
  constructor(t3, i5, s4, e4, h3) {
    super(t3, i5, s4, e4, h3), this.type = 5;
  }
  _$AI(t3, i5 = this) {
    if ((t3 = M(this, t3, i5, 0) ?? A) === E) return;
    const s4 = this._$AH, e4 = t3 === A && s4 !== A || t3.capture !== s4.capture || t3.once !== s4.once || t3.passive !== s4.passive, h3 = t3 !== A && (s4 === A || e4);
    e4 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t3), this._$AH = t3;
  }
  handleEvent(t3) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t3) : this._$AH.handleEvent(t3);
  }
};
var Z = class {
  constructor(t3, i5, s4) {
    this.element = t3, this.type = 6, this._$AN = void 0, this._$AM = i5, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t3) {
    M(this, t3);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t3, i5, s4) => {
  const e4 = s4?.renderBefore ?? i5;
  let h3 = e4._$litPart$;
  if (void 0 === h3) {
    const t4 = s4?.renderBefore ?? null;
    e4._$litPart$ = h3 = new k(i5.insertBefore(c3(), t4), t4, void 0, s4 ?? {});
  }
  return h3._$AI(t3), h3;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t3 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t3.firstChild, t3;
  }
  update(t3) {
    const r4 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t3), this._$Do = D(r4, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// src/translations.js
var TRANSLATIONS = {
  en: {
    available_chores: "Available Chores",
    admin_console: "Admin Console",
    back: "Back",
    enter_admin_password: "Enter Admin Password",
    password: "Password",
    unlock: "Unlock",
    incorrect_password: "Incorrect password.",
    chores: "Chores",
    members: "Members",
    add_chore: "Add Chore",
    edit_chore: "Edit Chore",
    add_member: "Add Member",
    edit_member: "Edit Member",
    add_available_chore: "Add Available Chore",
    edit_available_chore: "Edit Available Chore",
    title: "Title",
    chore_name: "Chore name",
    emoji_override: "Emoji (optional override)",
    emoji_optional: "Emoji (optional)",
    points: "Points",
    dollar_value: "Dollar Value ($)",
    recurrence: "Recurrence",
    recur_none: "One-time / No reset",
    recur_daily: "Daily (resets every day)",
    recur_weekdays: "Weekdays (Mon\u2013Fri)",
    recur_weekly: "Weekly (pick days)",
    daily: "Daily",
    weekdays: "Weekdays",
    weekly: "Weekly",
    assign_to: "Assign To",
    add_members_first: "Add members first.",
    name: "Name",
    avatar: "Avatar (emoji or initials)",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm?",
    reset_earnings: "Reset Earnings to $0",
    reset_completion: "Reset completion",
    unclaim: "Unclaim",
    no_chores_assigned: "No chores assigned yet!",
    member_not_found: "Member not found.",
    all_done_banner: "\u{1F389} All done! Claim bonus chores from Available Chores \u2192",
    can_claim: "{names} can claim!",
    complete_all_to_claim: "Complete all assigned chores to claim pool chores.",
    no_pool_chores: "No chores available in the pool.",
    already_claimed: "Already Claimed",
    claimed_by: "Claimed by {name}",
    claim: "Claim",
    no_eligible: "No members have completed their chores yet",
    assign: "Assign",
    who_claiming: "Who is claiming this chore?",
    unknown: "unknown",
    no_chores_yet: "No chores yet.",
    no_members_yet: "No members yet.",
    no_pool_yet: "No pool chores yet.",
    unassigned: "Unassigned",
    available: "Available",
    of_done: "{done} of {total} done",
    pts: "pts",
    sync_failed: "Sync failed \u2014 changes saved on this device only.",
    card_not_found: "Card not found in dashboard config \u2014 changes saved on this device only.",
    pending_approval: "Pending Approval",
    no_pending: "Nothing waiting for approval. When a member marks a chore done, it will appear here.",
    waiting_approval: "Waiting for approval",
    who_reset: "Tap a member to reset just their completion:",
    reset_all: "Reset for all",
    approve: "Approve",
    reject: "Reject",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  },
  es: {
    available_chores: "Tareas Disponibles",
    admin_console: "Consola de Administraci\xF3n",
    back: "Atr\xE1s",
    enter_admin_password: "Introduce la contrase\xF1a de administrador",
    password: "Contrase\xF1a",
    unlock: "Desbloquear",
    incorrect_password: "Contrase\xF1a incorrecta.",
    chores: "Tareas",
    members: "Miembros",
    add_chore: "A\xF1adir Tarea",
    edit_chore: "Editar Tarea",
    add_member: "A\xF1adir Miembro",
    edit_member: "Editar Miembro",
    add_available_chore: "A\xF1adir Tarea Disponible",
    edit_available_chore: "Editar Tarea Disponible",
    title: "T\xEDtulo",
    chore_name: "Nombre de la tarea",
    emoji_override: "Emoji (opcional)",
    emoji_optional: "Emoji (opcional)",
    points: "Puntos",
    dollar_value: "Valor ($)",
    recurrence: "Repetici\xF3n",
    recur_none: "Una vez / Sin reinicio",
    recur_daily: "Diaria (se reinicia cada d\xEDa)",
    recur_weekdays: "Entre semana (Lun\u2013Vie)",
    recur_weekly: "Semanal (elegir d\xEDas)",
    daily: "Diaria",
    weekdays: "Entre semana",
    weekly: "Semanal",
    assign_to: "Asignar a",
    add_members_first: "A\xF1ade miembros primero.",
    name: "Nombre",
    avatar: "Avatar (emoji o iniciales)",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    confirm: "\xBFConfirmar?",
    reset_earnings: "Restablecer ganancias a $0",
    reset_completion: "Restablecer estado",
    unclaim: "Liberar",
    no_chores_assigned: "\xA1A\xFAn no hay tareas asignadas!",
    member_not_found: "Miembro no encontrado.",
    all_done_banner: "\u{1F389} \xA1Todo hecho! Reclama tareas extra en Tareas Disponibles \u2192",
    can_claim: "\xA1{names} pueden reclamar!",
    complete_all_to_claim: "Completa todas tus tareas para reclamar tareas extra.",
    no_pool_chores: "No hay tareas disponibles.",
    already_claimed: "Ya reclamadas",
    claimed_by: "Reclamada por {name}",
    claim: "Reclamar",
    no_eligible: "Ning\xFAn miembro ha completado sus tareas todav\xEDa",
    assign: "Asignar",
    who_claiming: "\xBFQui\xE9n reclama esta tarea?",
    unknown: "desconocido",
    no_chores_yet: "A\xFAn no hay tareas.",
    no_members_yet: "A\xFAn no hay miembros.",
    no_pool_yet: "A\xFAn no hay tareas extra.",
    unassigned: "Sin asignar",
    available: "Disponible",
    of_done: "{done} de {total} hechas",
    pts: "pts",
    sync_failed: "Error de sincronizaci\xF3n \u2014 cambios guardados solo en este dispositivo.",
    card_not_found: "Tarjeta no encontrada en el panel \u2014 cambios guardados solo en este dispositivo.",
    pending_approval: "Pendientes de aprobaci\xF3n",
    no_pending: "Nada pendiente de aprobaci\xF3n. Cuando un miembro marque una tarea, aparecer\xE1 aqu\xED.",
    waiting_approval: "Esperando aprobaci\xF3n",
    who_reset: "Toca un miembro para restablecer solo su estado:",
    reset_all: "Restablecer para todos",
    approve: "Aprobar",
    reject: "Rechazar",
    days: ["Dom", "Lun", "Mar", "Mi\xE9", "Jue", "Vie", "S\xE1b"]
  },
  de: {
    available_chores: "Verf\xFCgbare Aufgaben",
    admin_console: "Admin-Konsole",
    back: "Zur\xFCck",
    enter_admin_password: "Admin-Passwort eingeben",
    password: "Passwort",
    unlock: "Entsperren",
    incorrect_password: "Falsches Passwort.",
    chores: "Aufgaben",
    members: "Mitglieder",
    add_chore: "Aufgabe hinzuf\xFCgen",
    edit_chore: "Aufgabe bearbeiten",
    add_member: "Mitglied hinzuf\xFCgen",
    edit_member: "Mitglied bearbeiten",
    add_available_chore: "Verf\xFCgbare Aufgabe hinzuf\xFCgen",
    edit_available_chore: "Verf\xFCgbare Aufgabe bearbeiten",
    title: "Titel",
    chore_name: "Name der Aufgabe",
    emoji_override: "Emoji (optional)",
    emoji_optional: "Emoji (optional)",
    points: "Punkte",
    dollar_value: "Geldwert ($)",
    recurrence: "Wiederholung",
    recur_none: "Einmalig / Kein Zur\xFCcksetzen",
    recur_daily: "T\xE4glich (wird jeden Tag zur\xFCckgesetzt)",
    recur_weekdays: "Wochentags (Mo\u2013Fr)",
    recur_weekly: "W\xF6chentlich (Tage w\xE4hlen)",
    daily: "T\xE4glich",
    weekdays: "Wochentags",
    weekly: "W\xF6chentlich",
    assign_to: "Zuweisen an",
    add_members_first: "Zuerst Mitglieder hinzuf\xFCgen.",
    name: "Name",
    avatar: "Avatar (Emoji oder Initialen)",
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "L\xF6schen",
    confirm: "Best\xE4tigen?",
    reset_earnings: "Verdienst auf $0 zur\xFCcksetzen",
    reset_completion: "Status zur\xFCcksetzen",
    unclaim: "Freigeben",
    no_chores_assigned: "Noch keine Aufgaben zugewiesen!",
    member_not_found: "Mitglied nicht gefunden.",
    all_done_banner: "\u{1F389} Alles erledigt! Hol dir Bonus-Aufgaben bei Verf\xFCgbare Aufgaben \u2192",
    can_claim: "{names} k\xF6nnen Aufgaben \xFCbernehmen!",
    complete_all_to_claim: "Erledige alle Aufgaben, um Bonus-Aufgaben zu \xFCbernehmen.",
    no_pool_chores: "Keine Aufgaben verf\xFCgbar.",
    already_claimed: "Bereits \xFCbernommen",
    claimed_by: "\xDCbernommen von {name}",
    claim: "\xDCbernehmen",
    no_eligible: "Noch kein Mitglied hat alle Aufgaben erledigt",
    assign: "Zuweisen",
    who_claiming: "Wer \xFCbernimmt diese Aufgabe?",
    unknown: "unbekannt",
    no_chores_yet: "Noch keine Aufgaben.",
    no_members_yet: "Noch keine Mitglieder.",
    no_pool_yet: "Noch keine Bonus-Aufgaben.",
    unassigned: "Nicht zugewiesen",
    available: "Verf\xFCgbar",
    of_done: "{done} von {total} erledigt",
    pts: "Pkt.",
    sync_failed: "Synchronisierung fehlgeschlagen \u2014 \xC4nderungen nur auf diesem Ger\xE4t gespeichert.",
    card_not_found: "Karte nicht in der Dashboard-Konfiguration gefunden \u2014 \xC4nderungen nur auf diesem Ger\xE4t gespeichert.",
    pending_approval: "Ausstehende Freigaben",
    no_pending: "Nichts wartet auf Freigabe. Sobald ein Mitglied eine Aufgabe abhakt, erscheint sie hier.",
    waiting_approval: "Wartet auf Freigabe",
    who_reset: "Tippe auf ein Mitglied, um nur dessen Status zur\xFCckzusetzen:",
    reset_all: "F\xFCr alle zur\xFCcksetzen",
    approve: "Freigeben",
    reject: "Ablehnen",
    days: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  },
  fr: {
    available_chores: "T\xE2ches Disponibles",
    admin_console: "Console d\u2019administration",
    back: "Retour",
    enter_admin_password: "Entrez le mot de passe administrateur",
    password: "Mot de passe",
    unlock: "D\xE9verrouiller",
    incorrect_password: "Mot de passe incorrect.",
    chores: "T\xE2ches",
    members: "Membres",
    add_chore: "Ajouter une t\xE2che",
    edit_chore: "Modifier la t\xE2che",
    add_member: "Ajouter un membre",
    edit_member: "Modifier le membre",
    add_available_chore: "Ajouter une t\xE2che disponible",
    edit_available_chore: "Modifier la t\xE2che disponible",
    title: "Titre",
    chore_name: "Nom de la t\xE2che",
    emoji_override: "Emoji (facultatif)",
    emoji_optional: "Emoji (facultatif)",
    points: "Points",
    dollar_value: "Valeur ($)",
    recurrence: "R\xE9currence",
    recur_none: "Une fois / Pas de r\xE9initialisation",
    recur_daily: "Quotidienne (r\xE9initialis\xE9e chaque jour)",
    recur_weekdays: "Jours ouvr\xE9s (Lun\u2013Ven)",
    recur_weekly: "Hebdomadaire (choisir les jours)",
    daily: "Quotidienne",
    weekdays: "Jours ouvr\xE9s",
    weekly: "Hebdomadaire",
    assign_to: "Assigner \xE0",
    add_members_first: "Ajoutez d\u2019abord des membres.",
    name: "Nom",
    avatar: "Avatar (emoji ou initiales)",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    confirm: "Confirmer ?",
    reset_earnings: "Remettre les gains \xE0 0 $",
    reset_completion: "R\xE9initialiser l\u2019\xE9tat",
    unclaim: "Lib\xE9rer",
    no_chores_assigned: "Aucune t\xE2che assign\xE9e pour l\u2019instant !",
    member_not_found: "Membre introuvable.",
    all_done_banner: "\u{1F389} Tout est fait ! R\xE9clamez des t\xE2ches bonus dans T\xE2ches Disponibles \u2192",
    can_claim: "{names} peuvent r\xE9clamer !",
    complete_all_to_claim: "Terminez toutes vos t\xE2ches pour r\xE9clamer des t\xE2ches bonus.",
    no_pool_chores: "Aucune t\xE2che disponible.",
    already_claimed: "D\xE9j\xE0 r\xE9clam\xE9es",
    claimed_by: "R\xE9clam\xE9e par {name}",
    claim: "R\xE9clamer",
    no_eligible: "Aucun membre n\u2019a encore termin\xE9 ses t\xE2ches",
    assign: "Assigner",
    who_claiming: "Qui r\xE9clame cette t\xE2che ?",
    unknown: "inconnu",
    no_chores_yet: "Pas encore de t\xE2ches.",
    no_members_yet: "Pas encore de membres.",
    no_pool_yet: "Pas encore de t\xE2ches bonus.",
    unassigned: "Non assign\xE9e",
    available: "Disponible",
    of_done: "{done} sur {total} faites",
    pts: "pts",
    sync_failed: "\xC9chec de la synchronisation \u2014 modifications enregistr\xE9es uniquement sur cet appareil.",
    card_not_found: "Carte introuvable dans la configuration du tableau de bord \u2014 modifications enregistr\xE9es uniquement sur cet appareil.",
    pending_approval: "En attente d\u2019approbation",
    no_pending: "Rien en attente d\u2019approbation. Quand un membre marque une t\xE2che, elle appara\xEEtra ici.",
    waiting_approval: "En attente d\u2019approbation",
    who_reset: "Touchez un membre pour r\xE9initialiser uniquement son \xE9tat :",
    reset_all: "R\xE9initialiser pour tous",
    approve: "Approuver",
    reject: "Rejeter",
    days: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
  },
  nl: {
    available_chores: "Beschikbare Klusjes",
    admin_console: "Beheerconsole",
    back: "Terug",
    enter_admin_password: "Voer beheerderswachtwoord in",
    password: "Wachtwoord",
    unlock: "Ontgrendelen",
    incorrect_password: "Onjuist wachtwoord.",
    chores: "Klusjes",
    members: "Leden",
    add_chore: "Klusje toevoegen",
    edit_chore: "Klusje bewerken",
    add_member: "Lid toevoegen",
    edit_member: "Lid bewerken",
    add_available_chore: "Beschikbaar klusje toevoegen",
    edit_available_chore: "Beschikbaar klusje bewerken",
    title: "Titel",
    chore_name: "Naam van het klusje",
    emoji_override: "Emoji (optioneel)",
    emoji_optional: "Emoji (optioneel)",
    points: "Punten",
    dollar_value: "Waarde ($)",
    recurrence: "Herhaling",
    recur_none: "Eenmalig / Geen reset",
    recur_daily: "Dagelijks (reset elke dag)",
    recur_weekdays: "Doordeweeks (Ma\u2013Vr)",
    recur_weekly: "Wekelijks (kies dagen)",
    daily: "Dagelijks",
    weekdays: "Doordeweeks",
    weekly: "Wekelijks",
    assign_to: "Toewijzen aan",
    add_members_first: "Voeg eerst leden toe.",
    name: "Naam",
    avatar: "Avatar (emoji of initialen)",
    save: "Opslaan",
    cancel: "Annuleren",
    delete: "Verwijderen",
    confirm: "Bevestigen?",
    reset_earnings: "Verdiensten terugzetten naar $0",
    reset_completion: "Status resetten",
    unclaim: "Vrijgeven",
    no_chores_assigned: "Nog geen klusjes toegewezen!",
    member_not_found: "Lid niet gevonden.",
    all_done_banner: "\u{1F389} Alles klaar! Claim bonusklusjes bij Beschikbare Klusjes \u2192",
    can_claim: "{names} kunnen claimen!",
    complete_all_to_claim: "Maak al je klusjes af om bonusklusjes te claimen.",
    no_pool_chores: "Geen klusjes beschikbaar.",
    already_claimed: "Al geclaimd",
    claimed_by: "Geclaimd door {name}",
    claim: "Claimen",
    no_eligible: "Nog geen lid heeft alle klusjes af",
    assign: "Toewijzen",
    who_claiming: "Wie claimt dit klusje?",
    unknown: "onbekend",
    no_chores_yet: "Nog geen klusjes.",
    no_members_yet: "Nog geen leden.",
    no_pool_yet: "Nog geen bonusklusjes.",
    unassigned: "Niet toegewezen",
    available: "Beschikbaar",
    of_done: "{done} van {total} klaar",
    pts: "ptn",
    sync_failed: "Synchronisatie mislukt \u2014 wijzigingen alleen op dit apparaat opgeslagen.",
    card_not_found: "Kaart niet gevonden in dashboardconfiguratie \u2014 wijzigingen alleen op dit apparaat opgeslagen.",
    pending_approval: "Wacht op goedkeuring",
    no_pending: "Niets wacht op goedkeuring. Zodra een lid een klusje afvinkt, verschijnt het hier.",
    waiting_approval: "Wacht op goedkeuring",
    who_reset: "Tik op een lid om alleen diens status te resetten:",
    reset_all: "Voor iedereen resetten",
    approve: "Goedkeuren",
    reject: "Afwijzen",
    days: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"]
  }
};
function makeLocalizer(lang) {
  const base = String(lang || "en").toLowerCase();
  const dict = TRANSLATIONS[base] || TRANSLATIONS[base.split("-")[0]] || TRANSLATIONS.en;
  return (key, vars) => {
    let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    if (Array.isArray(str)) return str;
    if (vars) {
      for (const [k2, v2] of Object.entries(vars)) {
        str = str.replace(`{${k2}}`, v2);
      }
    }
    return str;
  };
}

// src/chore-tracker-card.js
var CARD_VERSION = "1.10.0";
console.info(
  `%c CHORE-TRACKER-CARD %c v${CARD_VERSION} `,
  "color: white; background: #003366; font-weight: 700;",
  "color: #003366; background: #4FC3F7; font-weight: 700;"
);
var CHORE_EMOJIS = {
  vacuum: "\u{1F9F9}",
  vacuuming: "\u{1F9F9}",
  sweep: "\u{1F9F9}",
  sweeping: "\u{1F9F9}",
  mop: "\u{1FAA3}",
  mopping: "\u{1FAA3}",
  dust: "\u{1F9F9}",
  dusting: "\u{1F9F9}",
  clean: "\u{1F9FD}",
  cleaning: "\u{1F9FD}",
  scrub: "\u{1F9FD}",
  scrubbing: "\u{1F9FD}",
  wipe: "\u{1F9FD}",
  wiping: "\u{1F9FD}",
  wash: "\u{1FAE7}",
  washing: "\u{1FAE7}",
  sanitize: "\u{1F9F4}",
  disinfect: "\u{1F9F4}",
  dishes: "\u{1F37D}\uFE0F",
  dish: "\u{1F37D}\uFE0F",
  dishwasher: "\u{1F37D}\uFE0F",
  cook: "\u{1F468}\u200D\u{1F373}",
  cooking: "\u{1F468}\u200D\u{1F373}",
  kitchen: "\u{1F373}",
  trash: "\u{1F5D1}\uFE0F",
  garbage: "\u{1F5D1}\uFE0F",
  recycling: "\u267B\uFE0F",
  recycle: "\u267B\uFE0F",
  groceries: "\u{1F6D2}",
  grocery: "\u{1F6D2}",
  counters: "\u{1F9FD}",
  counter: "\u{1F9FD}",
  laundry: "\u{1F455}",
  clothes: "\u{1F455}",
  fold: "\u{1F455}",
  folding: "\u{1F455}",
  ironing: "\u{1F454}",
  iron: "\u{1F454}",
  bathroom: "\u{1F6BD}",
  toilet: "\u{1F6BD}",
  shower: "\u{1F6BF}",
  bath: "\u{1F6C1}",
  sink: "\u{1F6B0}",
  lawn: "\u{1F33F}",
  mow: "\u{1F33F}",
  mowing: "\u{1F33F}",
  garden: "\u{1F331}",
  gardening: "\u{1F331}",
  plant: "\u{1F331}",
  water: "\u{1F4A7}",
  watering: "\u{1F4A7}",
  rake: "\u{1F342}",
  raking: "\u{1F342}",
  snow: "\u2744\uFE0F",
  pet: "\u{1F43E}",
  dog: "\u{1F415}",
  cat: "\u{1F408}",
  fish: "\u{1F41F}",
  feed: "\u{1F963}",
  feeding: "\u{1F963}",
  walk: "\u{1F9AE}",
  walking: "\u{1F9AE}",
  litter: "\u{1F431}",
  homework: "\u{1F4DA}",
  study: "\u{1F4D6}",
  studying: "\u{1F4D6}",
  read: "\u{1F4D6}",
  reading: "\u{1F4D6}",
  practice: "\u{1F3B5}",
  music: "\u{1F3B5}",
  organize: "\u{1F4E6}",
  organizing: "\u{1F4E6}",
  tidy: "\u{1F5C2}\uFE0F",
  tidying: "\u{1F5C2}\uFE0F",
  declutter: "\u{1F4E6}",
  sort: "\u{1F5C2}\uFE0F",
  sorting: "\u{1F5C2}\uFE0F",
  bedroom: "\u{1F6CF}\uFE0F",
  bed: "\u{1F6CF}\uFE0F",
  room: "\u{1F3E0}",
  mail: "\u{1F4EC}",
  car: "\u{1F697}",
  window: "\u{1FA9F}",
  windows: "\u{1FA9F}"
};
function getChoreEmoji(title) {
  const lower = String(title || "").toLowerCase();
  for (const [keyword, emoji] of Object.entries(CHORE_EMOJIS)) {
    if (lower.includes(keyword)) return emoji;
  }
  return "\u2705";
}
function todayStr() {
  const d3 = /* @__PURE__ */ new Date();
  const mm = String(d3.getMonth() + 1).padStart(2, "0");
  const dd = String(d3.getDate()).padStart(2, "0");
  return `${d3.getFullYear()}-${mm}-${dd}`;
}
function num(v2) {
  const n4 = typeof v2 === "number" ? v2 : parseFloat(v2);
  return Number.isFinite(n4) ? n4 : 0;
}
function round2(v2) {
  return Math.round(num(v2) * 100) / 100;
}
function isWeekday() {
  const d3 = (/* @__PURE__ */ new Date()).getDay();
  return d3 >= 1 && d3 <= 5;
}
var DEFAULT_CONFIG = {
  title: "Chore Tracker",
  admin_password: "1234"
};
var UI_STATE = /* @__PURE__ */ new Map();
var SCROLL_STATE = /* @__PURE__ */ new Map();
function findScrollContainer(el) {
  let node = el;
  while (node) {
    if (node instanceof Element && node.scrollHeight > node.clientHeight + 4) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return node;
    }
    node = node.parentElement || node.getRootNode()?.host || null;
  }
  return document.scrollingElement || document.documentElement;
}
var ChoreTrackerCard = class extends i4 {
  constructor() {
    super();
    this._state = {
      activeTab: null,
      // member id or 'pool'
      adminUnlocked: false,
      adminTab: "chores",
      // chores | members | pool
      editingChore: null,
      editingMember: null,
      claimingChore: null,
      // pool chore id being claimed — shows member picker
      resettingChore: null,
      // chore id being reset — shows per-member picker
      view: "main"
      // main | admin
    };
    this._initialRenderDone = false;
    this._syncError = null;
    this._confirmKey = null;
    this._loginError = "";
    this._editRecurrence = null;
  }
  set hass(hass) {
    this._hass = hass;
    this._subscribeToUpdates();
    if (!this._initialRenderDone && this._config) {
      this._initialRenderDone = true;
      this._loadData();
      this.requestUpdate();
    }
  }
  get hass() {
    return this._hass;
  }
  // Translator for the configured/user language, cached until it changes
  get _t() {
    const lang = this._config?.language || this._hass?.locale?.language || this._hass?.language || "en";
    if (lang !== this._tLang) {
      this._tLang = lang;
      this._localize = makeLocalizer(lang);
    }
    return this._localize;
  }
  _recurLabel(c4) {
    const t3 = this._t;
    if (c4.recurrence === "daily") return `\u{1F501} ${t3("daily")}`;
    if (c4.recurrence === "weekdays") return `\u{1F501} ${t3("weekdays")}`;
    if (c4.recurrence === "weekly") {
      const days = t3("days");
      return `\u{1F501} ${(c4.recurrenceDays || []).map((d3) => days[d3]).join(", ") || t3("weekly")}`;
    }
    return "";
  }
  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    const uiKeys = [this._config.storage_key, this._config.title || "default"].filter(Boolean);
    const existing = uiKeys.find((k2) => UI_STATE.has(k2));
    if (existing) this._state = UI_STATE.get(existing);
    uiKeys.forEach((k2) => UI_STATE.set(k2, this._state));
    this._loadData();
    this.requestUpdate();
  }
  _uiKey() {
    return this._config.storage_key || this._config.title || "default";
  }
  // Restore scroll after HA rebuilt the view because of our own save.
  // Re-applied a few times because the view renders progressively.
  firstUpdated() {
    const entry = SCROLL_STATE.get(this._uiKey());
    if (!entry || Date.now() - entry.t > 8e3) return;
    SCROLL_STATE.delete(this._uiKey());
    const restore = () => {
      const sc = findScrollContainer(this);
      sc.scrollTop = entry.top;
    };
    restore();
    setTimeout(restore, 120);
    setTimeout(restore, 400);
  }
  _storageKey() {
    return `chore_tracker_${(this._config.title || "default").replace(/\s+/g, "_")}`;
  }
  // Synchronous: reads from config.data (written by _saveData via lovelace/config/save).
  // Falls back to localStorage for pre-v1.2 migration.
  _loadData() {
    if (this._config.data && typeof this._config.data === "object") {
      const d3 = JSON.parse(JSON.stringify(this._config.data));
      this._data = {
        members: d3.members || [],
        chores: d3.chores || [],
        pool: d3.pool || []
      };
      console.info(`ChoreTracker v${CARD_VERSION}: loaded data from dashboard config (synced)`);
      this._checkRecurrenceResets();
      return;
    }
    try {
      const raw = localStorage.getItem(this._storageKey());
      if (raw) {
        this._data = JSON.parse(raw);
        console.info(`ChoreTracker v${CARD_VERSION}: migrating localStorage data to dashboard config\u2026`);
        this._checkRecurrenceResets();
        this._saveData();
        return;
      }
    } catch (_2) {
    }
    this._data = { members: [], chores: [], pool: [] };
  }
  // Public save entry point. Writes localStorage immediately, then debounces
  // the (expensive, whole-dashboard) lovelace write so rapid toggles collapse
  // into a single save — this also shrinks the window for two devices
  // overwriting each other.
  _saveData() {
    localStorage.setItem(this._storageKey(), JSON.stringify(this._data));
    if (!this._hass) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._flushSave();
    }, 2500);
  }
  // Serialize lovelace writes: never two in flight, and a save requested
  // while one is running re-runs after it finishes (with the latest data).
  async _flushSave() {
    if (this._saving) {
      this._savePending = true;
      return;
    }
    this._saving = true;
    try {
      await this._writeToLovelace();
    } finally {
      this._saving = false;
      if (this._savePending) {
        this._savePending = false;
        this._flushSave();
      }
    }
  }
  _callWS(msg) {
    if (typeof this._hass.callWS === "function") return this._hass.callWS(msg);
    if (this._hass.connection?.sendMessagePromise) return this._hass.connection.sendMessagePromise(msg);
    throw new Error("No WS API");
  }
  // Fetch the config of the dashboard this card lives on. Explicit config
  // wins, otherwise derive it from the page URL (first path segment).
  // The default dashboard ("lovelace") must be requested as url_path null.
  async _fetchDashboardConfig() {
    let urlPath = this._config.lovelace_url_path;
    if (!urlPath) {
      const seg = window.location.pathname.split("/")[1] || "";
      urlPath = seg;
    }
    if (!urlPath || urlPath === "lovelace") urlPath = null;
    try {
      const cfg = await this._callWS({ type: "lovelace/config", url_path: urlPath });
      return { cfg, urlPath };
    } catch (err) {
      const dashboards = await this._callWS({ type: "lovelace/dashboards/list" });
      for (const dash of [{ url_path: null }, ...dashboards || []]) {
        if (dash.mode && dash.mode !== "storage") continue;
        const p3 = dash.url_path === "lovelace" ? null : dash.url_path;
        if (p3 === urlPath) continue;
        try {
          const cfg = await this._callWS({ type: "lovelace/config", url_path: p3 });
          if (JSON.stringify(cfg).includes("custom:chore-tracker-card")) {
            return { cfg, urlPath: p3 };
          }
        } catch (_2) {
        }
      }
      throw err;
    }
  }
  // Find this card's node inside a dashboard config tree, using the same
  // identity rules as saving: storage_key first, then legacy title match.
  _findCardNode(cfg) {
    const myKey = this._config.storage_key || null;
    const matches = (node) => {
      if (node.type !== "custom:chore-tracker-card") return false;
      if (myKey) return node.storage_key === myKey;
      return !node.storage_key && (node.title || "") === (this._config.title || "Chore Tracker");
    };
    let result = null;
    const walk = (nodes) => {
      if (!Array.isArray(nodes) || result) return;
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        if (matches(node)) {
          result = node;
          return;
        }
        walk(node.cards);
        if (node.card) walk([node.card]);
      }
    };
    for (const view of cfg.views || []) {
      walk(view.cards);
      for (const section of view.sections || []) {
        walk(section.cards);
      }
    }
    return result;
  }
  // Writes data into the card's own lovelace dashboard config entry so it is
  // shared across ALL HA users and devices, not just the current browser.
  // The config is re-fetched immediately before every save so we patch the
  // freshest version of the dashboard.
  async _writeToLovelace() {
    if (!this._hass) return;
    try {
      const fetched = await this._fetchDashboardConfig();
      const cfg = JSON.parse(JSON.stringify(fetched.cfg));
      const node = this._findCardNode(cfg);
      if (node) {
        node.data = JSON.parse(JSON.stringify(this._data));
        if (!node.storage_key) {
          node.storage_key = this._config.storage_key || this._uid();
          this._config = { ...this._config, storage_key: node.storage_key };
        }
        const sc = findScrollContainer(this);
        SCROLL_STATE.set(this._uiKey(), { top: sc.scrollTop, t: Date.now() });
        await this._callWS({
          type: "lovelace/config/save",
          url_path: fetched.urlPath,
          config: cfg
        });
        this._lastLocalSave = Date.now();
        this._setSyncError(null);
        console.info(`ChoreTracker v${CARD_VERSION}: data saved to dashboard config (synced to all devices)`);
      } else {
        this._setSyncError("card_not_found");
        console.warn("ChoreTracker: could not find card in lovelace config \u2014 data saved to localStorage only");
      }
    } catch (e4) {
      this._setSyncError("sync_failed");
      console.warn("ChoreTracker: lovelace save failed \u2014", e4.message || e4);
    }
  }
  // Surface sync failures in the card instead of only the console. With lit's
  // diffed rendering this is safe to do mid-edit — unrelated DOM is untouched.
  _setSyncError(message) {
    this._syncError = message || null;
    this.requestUpdate();
  }
  // ─── LIVE REFRESH ───────────────────────────────────────────────────────
  // HA fires lovelace_updated whenever any client saves the dashboard.
  // Pull the fresh data so this device updates without a page reload —
  // but never while the user is in the middle of something.
  _subscribeToUpdates() {
    if (this._updatesSubscribed || !this._hass?.connection?.subscribeEvents) return;
    this._updatesSubscribed = true;
    this._hass.connection.subscribeEvents(() => {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = setTimeout(() => this._refreshFromServer(), 400);
    }, "lovelace_updated");
  }
  _isUserBusy() {
    if (this._state.view === "admin") return true;
    if (this._state.claimingChore) return true;
    const active = this.shadowRoot?.activeElement;
    return !!(active && (active.tagName === "INPUT" || active.tagName === "SELECT"));
  }
  async _refreshFromServer() {
    if (this._saving || this._saveTimer || Date.now() - (this._lastLocalSave || 0) < 2e3) return;
    if (this._isUserBusy()) return;
    try {
      const { cfg } = await this._fetchDashboardConfig();
      const node = this._findCardNode(cfg);
      if (!node || !node.data) return;
      const fresh = JSON.stringify(node.data);
      if (fresh === JSON.stringify(this._data)) return;
      this._data = JSON.parse(fresh);
      localStorage.setItem(this._storageKey(), fresh);
      this._checkRecurrenceResets();
      this.requestUpdate();
      console.info(`ChoreTracker v${CARD_VERSION}: refreshed data from another device`);
    } catch (_2) {
    }
  }
  _uid() {
    return Math.random().toString(36).slice(2, 10);
  }
  // Don't lose a debounced save if the card is removed (dashboard switch,
  // edit mode, etc.) before the timer fires.
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      this._flushSave();
    }
  }
  // Auto-reset chores based on recurrence schedule
  _checkRecurrenceResets() {
    const today = todayStr();
    let changed = false;
    (this._data.chores || []).forEach((chore) => {
      if (!chore.recurrence || chore.recurrence === "none") return;
      (chore.assignedTo || []).forEach((memberId) => {
        if (!chore.memberStates) chore.memberStates = {};
        if (!chore.memberStates[memberId]) chore.memberStates[memberId] = {};
        const state = chore.memberStates[memberId];
        const lastReset = state.lastResetDate || "";
        if (lastReset === today) return;
        let shouldReset = false;
        if (chore.recurrence === "daily") {
          shouldReset = true;
        } else if (chore.recurrence === "weekdays" && isWeekday()) {
          shouldReset = true;
        } else if (chore.recurrence === "weekly" && (chore.recurrenceDays || []).includes((/* @__PURE__ */ new Date()).getDay())) {
          shouldReset = true;
        }
        if (shouldReset) {
          chore.memberStates[memberId] = { completed: false, lastResetDate: today };
          changed = true;
        }
      });
    });
    if (changed) this._saveData();
  }
  _getMemberChores(memberId) {
    return (this._data.chores || []).filter((c4) => (c4.assignedTo || []).includes(memberId)).map((c4) => {
      const ms = (c4.memberStates || {})[memberId] || {};
      return {
        ...c4,
        completed: ms.completed || false,
        // Only meaningful while approval mode is on — ignore stale flags
        pending: this._config.require_approval && ms.pending && !ms.completed || false
      };
    });
  }
  _allChoresDone(memberId) {
    const chores = this._getMemberChores(memberId);
    return chores.length > 0 && chores.every((c4) => c4.completed);
  }
  _getPoolChores() {
    return (this._data.pool || []).filter((c4) => !c4.claimedBy);
  }
  _eligibleClaimers() {
    return (this._data.members || []).filter((m2) => this._allChoresDone(m2.id));
  }
  // ─── RENDER ──────────────────────────────────────────────────────────────
  render() {
    if (!this._config || !this._data) return A;
    if (!this._state.activeTab) {
      const first = (this._data.members || [])[0];
      this._state.activeTab = first ? first.id : "pool";
    }
    return b2`
      <ha-card>
        ${this._syncError ? b2`<div class="sync-banner">⚠️ ${this._t(this._syncError)}</div>` : A}
        ${this._state.view === "admin" ? this._renderAdmin() : this._renderMain()}
      </ha-card>
    `;
  }
  _setState(patch) {
    Object.assign(this._state, patch);
    this.requestUpdate();
  }
  _renderMain() {
    const members = this._data.members || [];
    const poolCount = this._getPoolChores().length;
    const activeTab = this._state.activeTab;
    return b2`
      <div class="header">
        <span class="header-title">${this._config.title || "Chore Tracker"}</span>
        <button class="icon-btn" title="Admin"
          @click=${() => this._setState({ view: "admin", editingChore: null, editingMember: null })}>⚙️</button>
      </div>
      <div class="tab-bar">
        ${members.map((m2) => {
      const chores = this._getMemberChores(m2.id);
      const done = chores.filter((c4) => c4.completed).length;
      const total = chores.length;
      const allDone = total > 0 && done === total;
      return b2`
            <button class="member-tab ${activeTab === m2.id ? "active" : ""}"
              @click=${() => this._setState({ activeTab: m2.id, claimingChore: null })}>
              <span class="tab-avatar ${allDone ? "done" : ""}">${m2.avatar || m2.name[0].toUpperCase()}</span>
              <span class="tab-name">${m2.name}</span>
              ${total > 0 ? b2`<span class="tab-badge ${allDone ? "badge-done" : ""}">${done}/${total}</span>` : A}
            </button>
          `;
    })}
        <button class="member-tab ${activeTab === "pool" ? "active" : ""}"
          @click=${() => this._setState({ activeTab: "pool", claimingChore: null })}>
          <span class="tab-avatar pool-icon">📋</span>
          <span class="tab-name">${this._t("available_chores")}</span>
          ${poolCount > 0 ? b2`<span class="tab-badge">${poolCount}</span>` : A}
        </button>
      </div>
      <div class="tab-content">
        ${activeTab === "pool" ? this._renderPool() : this._renderMemberPanel(activeTab)}
      </div>
      ${this._state.claimingChore ? this._renderClaimModal() : A}
    `;
  }
  _renderMemberPanel(memberId) {
    const m2 = (this._data.members || []).find((x2) => x2.id === memberId);
    if (!m2) return b2`<div class="empty">${this._t("member_not_found")}</div>`;
    const chores = this._getMemberChores(m2.id);
    const done = chores.filter((c4) => c4.completed).length;
    const total = chores.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const allDone = total > 0 && done === total;
    const poolAvailable = this._getPoolChores().length > 0;
    return b2`
      <div class="member-summary">
        <div class="summary-left">
          <div class="summary-avatar">${m2.avatar || m2.name[0].toUpperCase()}</div>
          <div>
            <div class="summary-name">${m2.name}</div>
            <div class="summary-stats">
              <span class="stat-chip">⭐ ${m2.points || 0} ${this._t("pts")}</span>
              <span class="stat-chip">💵 $${num(m2.dollars).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div class="summary-progress">
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="progress-label">${this._t("of_done", { done, total })}</div>
        </div>
      </div>
      <div class="chores-list">
        ${chores.length ? chores.map((c4) => b2`
          <div class="chore-item ${c4.completed ? "completed" : ""} ${c4.pending ? "pending" : ""}">
            <button class="chore-check ${c4.completed ? "checked" : ""} ${c4.pending ? "pending" : ""}"
              @click=${() => this._toggleChore(c4.id, m2.id)}>
              ${c4.completed ? "\u2714" : c4.pending ? "\u23F3" : ""}
            </button>
            <span class="chore-emoji">${c4.emoji || getChoreEmoji(c4.title)}</span>
            <div class="chore-body">
              <span class="chore-title">${c4.title}</span>
              ${c4.pending ? b2`<span class="chore-recur pending-label">⏳ ${this._t("waiting_approval")}</span>` : c4.recurrence && c4.recurrence !== "none" ? b2`<span class="chore-recur">${this._recurLabel(c4)}</span>` : A}
            </div>
            <div class="chore-rewards">
              ${c4.points ? b2`<span class="reward-badge points">⭐${c4.points}</span>` : A}
              ${c4.dollars ? b2`<span class="reward-badge dollars">💵$${num(c4.dollars).toFixed(2)}</span>` : A}
            </div>
          </div>
        `) : b2`<div class="empty">${this._t("no_chores_assigned")}</div>`}
      </div>
      ${allDone && poolAvailable ? b2`
        <div class="claim-banner" @click=${() => this._setState({ activeTab: "pool" })}>
          ${this._t("all_done_banner")}
        </div>
      ` : A}
    `;
  }
  _renderPool() {
    const pool = this._getPoolChores();
    const eligibles = this._eligibleClaimers();
    const claimed = (this._data.pool || []).filter((c4) => c4.claimedBy);
    return b2`
      <div class="pool-header">
        <div class="pool-info">
          ${eligibles.length > 0 ? b2`<span class="pool-eligible">✅ ${this._t("can_claim", { names: eligibles.map((m2) => m2.name).join(", ") })}</span>` : b2`<span class="pool-none">${this._t("complete_all_to_claim")}</span>`}
        </div>
      </div>
      <div class="chores-list">
        ${pool.length ? pool.map((c4) => b2`
          <div class="chore-item">
            <span class="chore-emoji">${c4.emoji || getChoreEmoji(c4.title)}</span>
            <div class="chore-body">
              <span class="chore-title">${c4.title}</span>
            </div>
            <div class="chore-rewards">
              ${c4.points ? b2`<span class="reward-badge points">⭐${c4.points}</span>` : A}
              ${c4.dollars ? b2`<span class="reward-badge dollars">💵$${num(c4.dollars).toFixed(2)}</span>` : A}
            </div>
            <button class="claim-btn ${eligibles.length === 0 ? "disabled" : ""}"
              ?disabled=${eligibles.length === 0}
              title=${eligibles.length === 0 ? this._t("no_eligible") : ""}
              @click=${() => this._setState({ claimingChore: c4.id })}>
              ${this._t("claim")}
            </button>
          </div>
        `) : b2`<div class="empty">${this._t("no_pool_chores")}</div>`}
      </div>
      ${claimed.length > 0 ? b2`
        <div class="section-label">${this._t("already_claimed")}</div>
        <div class="chores-list claimed-list">
          ${claimed.map((c4) => {
      const claimer = (this._data.members || []).find((m2) => m2.id === c4.claimedBy);
      return b2`
              <div class="chore-item claimed">
                <span class="chore-emoji">${c4.emoji || getChoreEmoji(c4.title)}</span>
                <div class="chore-body">
                  <span class="chore-title">${c4.title}</span>
                  <span class="chore-recur">${this._t("claimed_by", { name: claimer ? claimer.name : this._t("unknown") })}</span>
                </div>
              </div>
            `;
    })}
        </div>
      ` : A}
    `;
  }
  _renderClaimModal() {
    const choreId = this._state.claimingChore;
    const chore = (this._data.pool || []).find((c4) => c4.id === choreId);
    if (!chore) return A;
    const eligibles = this._eligibleClaimers();
    return b2`
      <div class="modal-overlay" @click=${() => this._setState({ claimingChore: null })}>
        <div class="modal" @click=${(e4) => e4.stopPropagation()}>
          <div class="modal-title">${this._t("assign")} "${chore.emoji || getChoreEmoji(chore.title)} ${chore.title}"</div>
          <div class="modal-subtitle">${this._t("who_claiming")}</div>
          <div class="modal-members">
            ${eligibles.map((m2) => b2`
              <button class="modal-member-btn" @click=${() => this._claimChore(choreId, m2.id)}>
                <span class="modal-avatar">${m2.avatar || m2.name[0].toUpperCase()}</span>
                <span>${m2.name}</span>
              </button>
            `)}
          </div>
          <button class="secondary-btn" @click=${() => this._setState({ claimingChore: null })}>${this._t("cancel")}</button>
        </div>
      </div>
    `;
  }
  // ─── ADMIN ────────────────────────────────────────────────────────────────
  _renderAdmin() {
    if (!this._state.adminUnlocked) return this._renderAdminLogin();
    const tab = this._state.adminTab;
    return b2`
      <div class="header">
        <button class="back-btn" @click=${() => this._setState({ view: "main", adminUnlocked: false, resettingChore: null })}>← ${this._t("back")}</button>
        <span class="header-title">${this._t("admin_console")}</span>
        <button class="icon-btn" title="Lock" @click=${() => this._setState({ view: "main", adminUnlocked: false, resettingChore: null })}>🔒</button>
      </div>
      <div class="tab-bar admin-tabs">
        ${["chores", "members", "pool"].map((t3) => b2`
          <button class="member-tab ${tab === t3 ? "active" : ""}"
            @click=${() => this._setState({ adminTab: t3, editingChore: null, editingMember: null, resettingChore: null })}>
            ${t3 === "chores" ? this._t("chores") : t3 === "members" ? this._t("members") : this._t("available_chores")}
          </button>
        `)}
      </div>
      <div class="tab-content">
        ${tab === "chores" ? this._renderAdminChores() : A}
        ${tab === "members" ? this._renderAdminMembers() : A}
        ${tab === "pool" ? this._renderAdminPool() : A}
      </div>
      ${this._state.resettingChore ? this._renderResetModal() : A}
    `;
  }
  // Per-member reset picker: shows each assigned member with their current
  // status; tapping resets just that member. "Reset for all" clears everyone.
  _renderResetModal() {
    const chore = (this._data.chores || []).find((c4) => c4.id === this._state.resettingChore);
    if (!chore) return A;
    const members = (chore.assignedTo || []).map((id) => (this._data.members || []).find((m2) => m2.id === id)).filter(Boolean);
    const statusIcon = (memberId) => {
      const st = (chore.memberStates || {})[memberId] || {};
      if (st.completed) return "\u2714";
      if (st.pending && this._config.require_approval) return "\u23F3";
      return "\u25A2";
    };
    return b2`
      <div class="modal-overlay" @click=${() => this._setState({ resettingChore: null })}>
        <div class="modal" @click=${(e4) => e4.stopPropagation()}>
          <div class="modal-title">🔄 ${this._t("reset_completion")}: ${chore.emoji || getChoreEmoji(chore.title)} ${chore.title}</div>
          <div class="modal-subtitle">${this._t("who_reset")}</div>
          <div class="modal-members">
            ${members.map((m2) => b2`
              <button class="modal-member-btn" @click=${() => this._resetChoreFor(chore.id, m2.id)}>
                <span class="modal-avatar">${m2.avatar || m2.name[0].toUpperCase()}</span>
                <span class="modal-member-name">${m2.name}</span>
                <span class="modal-status">${statusIcon(m2.id)}</span>
              </button>
            `)}
          </div>
          <div class="form-actions">
            <button class="danger-btn" @click=${() => {
      this._resetChore(chore.id);
      this._setState({ resettingChore: null });
    }}>
              ${this._t("reset_all")}
            </button>
            <button class="secondary-btn" @click=${() => this._setState({ resettingChore: null })}>${this._t("cancel")}</button>
          </div>
        </div>
      </div>
    `;
  }
  // Reset one member's completion of a chore (deducting earnings if it was
  // completed). The modal stays open so several members can be reset in a row.
  _resetChoreFor(choreId, memberId) {
    const chore = (this._data.chores || []).find((c4) => c4.id === choreId);
    if (!chore) return;
    const st = (chore.memberStates || {})[memberId];
    if (!st) return;
    if (st.completed) {
      const member = (this._data.members || []).find((m2) => m2.id === memberId);
      if (member) {
        member.points = Math.max(0, num(member.points) - num(chore.points));
        member.dollars = Math.max(0, round2(num(member.dollars) - num(chore.dollars)));
      }
    }
    delete chore.memberStates[memberId];
    this._saveData();
    this.requestUpdate();
  }
  _renderAdminLogin() {
    return b2`
      <div class="header">
        <button class="back-btn" @click=${() => this._setState({ view: "main" })}>← ${this._t("back")}</button>
        <span class="header-title">${this._t("admin_console")}</span>
      </div>
      <div class="admin-login">
        <div class="login-icon">🔐</div>
        <div class="login-title">${this._t("enter_admin_password")}</div>
        <input class="admin-input" id="admin-password" type="password" placeholder=${this._t("password")}
          @keydown=${(e4) => {
      if (e4.key === "Enter") this._adminLogin();
    }} />
        <div class="login-error">${this._loginError}</div>
        <button class="primary-btn" @click=${() => this._adminLogin()}>${this._t("unlock")}</button>
      </div>
    `;
  }
  // Two-tap confirmation for destructive actions: first tap arms the button
  // (turns red / shows "Confirm?"), second tap within 3s executes.
  _confirmThen(key, fn) {
    if (this._confirmKey === key) {
      this._confirmKey = null;
      clearTimeout(this._confirmTimer);
      fn();
      return;
    }
    this._confirmKey = key;
    clearTimeout(this._confirmTimer);
    this._confirmTimer = setTimeout(() => {
      this._confirmKey = null;
      this.requestUpdate();
    }, 3e3);
    this.requestUpdate();
  }
  _dangerBtn(key, label, fn) {
    const armed = this._confirmKey === key;
    return b2`
      <button class="danger-btn ${armed ? "armed" : ""}" @click=${() => this._confirmThen(key, fn)}>
        ${armed ? this._t("confirm") : label}
      </button>
    `;
  }
  _dangerIconBtn(key, icon, title, fn) {
    const armed = this._confirmKey === key;
    return b2`
      <button class="icon-btn dark ${armed ? "armed" : ""}" title=${title}
        @click=${() => this._confirmThen(key, fn)}>
        ${armed ? "\u2757" : icon}
      </button>
    `;
  }
  _renderAdminChores() {
    const members = this._data.members || [];
    const chores = this._data.chores || [];
    const editing = this._state.editingChore;
    if (editing !== null) {
      const isNew = editing === "new";
      const chore = isNew ? { title: "", emoji: "", points: 0, dollars: 0, assignedTo: [], recurrence: "none" } : chores.find((c4) => c4.id === editing) || {};
      const recurrence = this._editRecurrence ?? (chore.recurrence || "none");
      return b2`
        <div class="edit-form">
          <div class="form-title">${isNew ? this._t("add_chore") : this._t("edit_chore")}</div>
          <label>${this._t("title")}</label>
          <input class="form-input" id="ec-title" .value=${chore.title || ""} placeholder=${this._t("chore_name")} />
          <label>${this._t("emoji_override")}</label>
          <input class="form-input" id="ec-emoji" .value=${chore.emoji || ""} placeholder="e.g. 🧹" />
          <label>${this._t("points")}</label>
          <input class="form-input" id="ec-points" type="number" min="0" .value=${String(chore.points || 0)} />
          <label>${this._t("dollar_value")}</label>
          <input class="form-input" id="ec-dollars" type="number" min="0" step="0.01" .value=${String(chore.dollars || 0)} />
          <label>${this._t("recurrence")}</label>
          <select class="form-input" id="ec-recurrence" .value=${recurrence}
            @change=${(e4) => {
        this._editRecurrence = e4.target.value;
        this.requestUpdate();
      }}>
            <option value="none">${this._t("recur_none")}</option>
            <option value="daily">🔁 ${this._t("recur_daily")}</option>
            <option value="weekdays">🔁 ${this._t("recur_weekdays")}</option>
            <option value="weekly">🔁 ${this._t("recur_weekly")}</option>
          </select>
          ${recurrence === "weekly" ? b2`
            <div class="assign-list">
              ${this._t("days").map((day, i5) => b2`
                <label class="assign-item">
                  <input type="checkbox" id="ec-day-${i5}" .checked=${(chore.recurrenceDays || []).includes(i5)} />
                  ${day}
                </label>
              `)}
            </div>
          ` : A}
          <label>${this._t("assign_to")}</label>
          <div class="assign-list">
            ${members.length ? members.map((m2) => b2`
              <label class="assign-item">
                <input type="checkbox" id="assign-${m2.id}" .checked=${(chore.assignedTo || []).includes(m2.id)} />
                ${m2.avatar || m2.name[0].toUpperCase()} ${m2.name}
              </label>
            `) : b2`<span class="empty-inline">${this._t("add_members_first")}</span>`}
          </div>
          <div class="form-actions">
            <button class="primary-btn" @click=${() => this._saveChore(editing)}>${this._t("save")}</button>
            <button class="secondary-btn" @click=${() => this._cancelEdit()}>${this._t("cancel")}</button>
            ${!isNew ? this._dangerBtn(`del-chore:${editing}`, this._t("delete"), () => this._deleteChore(editing)) : A}
          </div>
        </div>
      `;
    }
    const pending = this._config.require_approval ? this._pendingApprovals() : [];
    return b2`
      <div class="admin-section">
        ${this._config.require_approval ? b2`
          <div class="section-label">⏳ ${this._t("pending_approval")} (${pending.length})</div>
          ${pending.length === 0 ? b2`<div class="empty-inline pending-empty">${this._t("no_pending")}</div>` : A}
          ${pending.map(({ chore, member }) => b2`
            <div class="admin-item pending-item">
              <span class="chore-emoji">${chore.emoji || getChoreEmoji(chore.title)}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${chore.title}</div>
                <div class="admin-item-meta">${member.avatar || ""} ${member.name} · ⭐${chore.points || 0} · 💵$${num(chore.dollars).toFixed(2)}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn approve" title=${this._t("approve")}
                  @click=${() => this._approveChore(chore.id, member.id)}>✔</button>
                <button class="icon-btn reject" title=${this._t("reject")}
                  @click=${() => this._rejectChore(chore.id, member.id)}>✖</button>
              </div>
            </div>
          `)}
        ` : A}
        <button class="primary-btn full-btn" @click=${() => this._startEditChore("new")}>+ ${this._t("add_chore")}</button>
        ${chores.map((c4) => {
      const assignedNames = (c4.assignedTo || []).map((id) => members.find((m2) => m2.id === id)?.name).filter(Boolean).join(", ");
      const recurLabel = c4.recurrence && c4.recurrence !== "none" ? ` \xB7 ${this._recurLabel(c4)}` : "";
      return b2`
            <div class="admin-item">
              <span class="chore-emoji">${c4.emoji || getChoreEmoji(c4.title)}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${c4.title}</div>
                <div class="admin-item-meta">${assignedNames || this._t("unassigned")} · ⭐${c4.points || 0} · 💵$${num(c4.dollars).toFixed(2)}${recurLabel}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn dark move-btn" ?disabled=${chores[0]?.id === c4.id}
                  @click=${() => this._moveItem(this._data.chores, c4.id, -1)}>▲</button>
                <button class="icon-btn dark move-btn" ?disabled=${chores[chores.length - 1]?.id === c4.id}
                  @click=${() => this._moveItem(this._data.chores, c4.id, 1)}>▼</button>
                <button class="icon-btn dark" @click=${() => this._startEditChore(c4.id)}>✏️</button>
                <button class="icon-btn dark" title=${this._t("reset_completion")}
                  @click=${() => this._setState({ resettingChore: c4.id })}>🔄</button>
              </div>
            </div>
          `;
    })}
        ${chores.length === 0 ? b2`<div class="empty">${this._t("no_chores_yet")}</div>` : A}
      </div>
    `;
  }
  // Move a chore up/down within its list — member panels render in array
  // order, so this reorders the chore everywhere.
  _moveItem(arr, id, delta) {
    const i5 = (arr || []).findIndex((c4) => c4.id === id);
    const j = i5 + delta;
    if (i5 < 0 || j < 0 || j >= arr.length) return;
    [arr[i5], arr[j]] = [arr[j], arr[i5]];
    this._saveData();
    this.requestUpdate();
  }
  _startEditChore(id) {
    this._editRecurrence = null;
    this._setState({ editingChore: id });
  }
  _cancelEdit() {
    this._editRecurrence = null;
    this._setState({ editingChore: null, editingMember: null });
  }
  _renderAdminMembers() {
    const members = this._data.members || [];
    const editing = this._state.editingMember;
    if (editing !== null) {
      const isNew = editing === "new";
      const member = isNew ? { name: "", avatar: "" } : members.find((m2) => m2.id === editing) || {};
      return b2`
        <div class="edit-form">
          <div class="form-title">${isNew ? this._t("add_member") : this._t("edit_member")}</div>
          <label>${this._t("name")}</label>
          <input class="form-input" id="em-name" .value=${member.name || ""} placeholder=${this._t("name")} />
          <label>${this._t("avatar")}</label>
          <input class="form-input" id="em-avatar" .value=${member.avatar || ""} placeholder="e.g. 👦 or JD" />
          ${!isNew ? b2`
            <div class="member-totals">
              <span>⭐ ${member.points || 0} ${this._t("pts")}</span>
              <span>💵 $${num(member.dollars).toFixed(2)}</span>
            </div>
            ${this._dangerBtn(`reset-earn:${editing}`, this._t("reset_earnings"), () => this._resetMemberEarnings(editing))}
          ` : A}
          <div class="form-actions">
            <button class="primary-btn" @click=${() => this._saveMember(editing)}>${this._t("save")}</button>
            <button class="secondary-btn" @click=${() => this._cancelEdit()}>${this._t("cancel")}</button>
            ${!isNew ? this._dangerBtn(`del-member:${editing}`, this._t("delete"), () => this._deleteMember(editing)) : A}
          </div>
        </div>
      `;
    }
    return b2`
      <div class="admin-section">
        <button class="primary-btn full-btn" @click=${() => this._setState({ editingMember: "new" })}>+ ${this._t("add_member")}</button>
        ${members.map((m2) => b2`
          <div class="admin-item">
            <span class="tab-avatar small-avatar">${m2.avatar || m2.name[0].toUpperCase()}</span>
            <div class="admin-item-info">
              <div class="admin-item-title">${m2.name}</div>
              <div class="admin-item-meta">⭐ ${m2.points || 0} ${this._t("pts")} · 💵 $${num(m2.dollars).toFixed(2)}</div>
            </div>
            <div class="admin-item-actions">
              <button class="icon-btn dark" @click=${() => this._setState({ editingMember: m2.id })}>✏️</button>
              ${this._dangerIconBtn(`reset-earn:${m2.id}`, "\u{1F4B0}", this._t("reset_earnings"), () => this._resetMemberEarnings(m2.id))}
            </div>
          </div>
        `)}
        ${members.length === 0 ? b2`<div class="empty">${this._t("no_members_yet")}</div>` : A}
      </div>
    `;
  }
  _renderAdminPool() {
    const pool = this._data.pool || [];
    const members = this._data.members || [];
    const editing = this._state.editingChore;
    if (editing !== null && (editing === "new-pool" || pool.find((c4) => c4.id === editing))) {
      const isNew = editing === "new-pool";
      const chore = isNew ? { title: "", emoji: "", points: 0, dollars: 0 } : pool.find((c4) => c4.id === editing) || {};
      return b2`
        <div class="edit-form">
          <div class="form-title">${isNew ? this._t("add_available_chore") : this._t("edit_available_chore")}</div>
          <label>${this._t("title")}</label>
          <input class="form-input" id="pc-title" .value=${chore.title || ""} placeholder=${this._t("chore_name")} />
          <label>${this._t("emoji_optional")}</label>
          <input class="form-input" id="pc-emoji" .value=${chore.emoji || ""} placeholder="e.g. 🧹" />
          <label>${this._t("points")}</label>
          <input class="form-input" id="pc-points" type="number" min="0" .value=${String(chore.points || 0)} />
          <label>${this._t("dollar_value")}</label>
          <input class="form-input" id="pc-dollars" type="number" min="0" step="0.01" .value=${String(chore.dollars || 0)} />
          <div class="form-actions">
            <button class="primary-btn" @click=${() => this._savePoolChore(editing)}>${this._t("save")}</button>
            <button class="secondary-btn" @click=${() => this._cancelEdit()}>${this._t("cancel")}</button>
            ${!isNew ? this._dangerBtn(`del-pool:${editing}`, this._t("delete"), () => this._deletePoolChore(editing)) : A}
          </div>
        </div>
      `;
    }
    return b2`
      <div class="admin-section">
        <button class="primary-btn full-btn" @click=${() => this._setState({ editingChore: "new-pool" })}>+ ${this._t("add_available_chore")}</button>
        ${pool.map((c4) => {
      const claimer = c4.claimedBy ? members.find((m2) => m2.id === c4.claimedBy) : null;
      return b2`
            <div class="admin-item">
              <span class="chore-emoji">${c4.emoji || getChoreEmoji(c4.title)}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${c4.title}</div>
                <div class="admin-item-meta">${claimer ? this._t("claimed_by", { name: claimer.name }) : this._t("available")} · ⭐${c4.points || 0} · 💵$${num(c4.dollars).toFixed(2)}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn dark move-btn" ?disabled=${pool[0]?.id === c4.id}
                  @click=${() => this._moveItem(this._data.pool, c4.id, -1)}>▲</button>
                <button class="icon-btn dark move-btn" ?disabled=${pool[pool.length - 1]?.id === c4.id}
                  @click=${() => this._moveItem(this._data.pool, c4.id, 1)}>▼</button>
                <button class="icon-btn dark" @click=${() => this._setState({ editingChore: c4.id })}>✏️</button>
                ${c4.claimedBy ? b2`<button class="icon-btn dark" title=${this._t("unclaim")} @click=${() => this._unclaimPoolChore(c4.id)}>↩️</button>` : A}
                ${this._dangerIconBtn(`del-pool:${c4.id}`, "\u{1F5D1}\uFE0F", this._t("delete"), () => this._deletePoolChore(c4.id))}
              </div>
            </div>
          `;
    })}
        ${pool.length === 0 ? b2`<div class="empty">${this._t("no_pool_yet")}</div>` : A}
      </div>
    `;
  }
  // ─── DATA MUTATIONS ──────────────────────────────────────────────────────
  _adminLogin() {
    const input = this.shadowRoot.getElementById("admin-password");
    if (input && input.value === String(this._config.admin_password || "1234")) {
      this._loginError = "";
      this._setState({ adminUnlocked: true });
    } else {
      this._loginError = this._t("incorrect_password");
      this.requestUpdate();
    }
  }
  _toggleChore(choreId, memberId) {
    const chore = (this._data.chores || []).find((c4) => c4.id === choreId);
    if (!chore) return;
    if (!chore.memberStates) chore.memberStates = {};
    if (!chore.memberStates[memberId]) chore.memberStates[memberId] = {};
    const state = chore.memberStates[memberId];
    const member = (this._data.members || []).find((m2) => m2.id === memberId);
    if (this._config.require_approval) {
      if (state.completed) return;
      if (state.pending) {
        state.pending = false;
      } else {
        state.pending = true;
        this._fireHAEvent("chore_tracker_chore_pending", {
          member: member ? member.name : "",
          chore: chore.title
        });
      }
      this._saveData();
      this.requestUpdate();
      return;
    }
    const wasCompleted = state.completed;
    state.completed = !wasCompleted;
    state.pending = false;
    if (member) {
      const pts = num(chore.points);
      const dlr = num(chore.dollars);
      if (!wasCompleted) {
        member.points = num(member.points) + pts;
        member.dollars = round2(num(member.dollars) + dlr);
      } else {
        member.points = Math.max(0, num(member.points) - pts);
        member.dollars = Math.max(0, round2(num(member.dollars) - dlr));
      }
    }
    if (member && !wasCompleted) {
      this._fireHAEvent("chore_tracker_chore_completed", {
        member: member.name,
        chore: chore.title,
        points: num(chore.points),
        dollars: num(chore.dollars)
      });
      if (this._allChoresDone(memberId)) {
        this._fireHAEvent("chore_tracker_all_done", {
          member: member.name,
          total_points: num(member.points),
          total_dollars: num(member.dollars)
        });
      }
    }
    this._saveData();
    this.requestUpdate();
  }
  // All (chore, member) pairs waiting for admin approval
  _pendingApprovals() {
    const out = [];
    (this._data.chores || []).forEach((chore) => {
      Object.entries(chore.memberStates || {}).forEach(([memberId, st]) => {
        if (st.pending && !st.completed) {
          const member = (this._data.members || []).find((m2) => m2.id === memberId);
          if (member) out.push({ chore, member });
        }
      });
    });
    return out;
  }
  _approveChore(choreId, memberId) {
    const chore = (this._data.chores || []).find((c4) => c4.id === choreId);
    const member = (this._data.members || []).find((m2) => m2.id === memberId);
    if (!chore || !member) return;
    const state = (chore.memberStates || {})[memberId];
    if (!state || !state.pending || state.completed) return;
    state.pending = false;
    state.completed = true;
    member.points = num(member.points) + num(chore.points);
    member.dollars = round2(num(member.dollars) + num(chore.dollars));
    this._fireHAEvent("chore_tracker_chore_completed", {
      member: member.name,
      chore: chore.title,
      points: num(chore.points),
      dollars: num(chore.dollars)
    });
    if (this._allChoresDone(memberId)) {
      this._fireHAEvent("chore_tracker_all_done", {
        member: member.name,
        total_points: num(member.points),
        total_dollars: num(member.dollars)
      });
    }
    this._saveData();
    this.requestUpdate();
  }
  _rejectChore(choreId, memberId) {
    const chore = (this._data.chores || []).find((c4) => c4.id === choreId);
    if (!chore) return;
    const state = (chore.memberStates || {})[memberId];
    if (!state || !state.pending) return;
    state.pending = false;
    this._saveData();
    this.requestUpdate();
  }
  _fireHAEvent(eventType, data) {
    if (!this._hass?.callApi) return;
    this._hass.callApi("POST", `events/${eventType}`, data).catch((e4) => console.warn(`ChoreTracker: could not fire ${eventType} event \u2014`, e4.message || e4));
  }
  _getInput(id) {
    return this.shadowRoot.getElementById(id);
  }
  _saveChore(editing) {
    const title = this._getInput("ec-title")?.value?.trim();
    if (!title) return;
    const emoji = this._getInput("ec-emoji")?.value?.trim() || "";
    const points = Math.max(0, Math.round(num(this._getInput("ec-points")?.value)));
    const dollars = Math.max(0, round2(this._getInput("ec-dollars")?.value));
    const recurrence = this._getInput("ec-recurrence")?.value || "none";
    const recurrenceDays = [];
    for (let i5 = 0; i5 < 7; i5++) {
      if (this._getInput(`ec-day-${i5}`)?.checked) recurrenceDays.push(i5);
    }
    const assignedTo = [];
    this.shadowRoot.querySelectorAll('[id^="assign-"]').forEach((cb) => {
      if (cb.checked) assignedTo.push(cb.id.replace("assign-", ""));
    });
    if (editing === "new") {
      this._data.chores.push({ id: this._uid(), title, emoji, points, dollars, recurrence, recurrenceDays, assignedTo, memberStates: {} });
    } else {
      const chore = (this._data.chores || []).find((c4) => c4.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars, recurrence, recurrenceDays, assignedTo });
    }
    this._saveData();
    this._cancelEdit();
  }
  _deleteChore(id) {
    this._data.chores = (this._data.chores || []).filter((c4) => c4.id !== id);
    this._saveData();
    this._cancelEdit();
  }
  _resetChore(id) {
    const chore = (this._data.chores || []).find((c4) => c4.id === id);
    if (!chore) return;
    (chore.assignedTo || []).forEach((memberId) => {
      const state = (chore.memberStates || {})[memberId] || {};
      if (state.completed) {
        const member = (this._data.members || []).find((m2) => m2.id === memberId);
        if (member) {
          member.points = Math.max(0, num(member.points) - num(chore.points));
          member.dollars = Math.max(0, round2(num(member.dollars) - num(chore.dollars)));
        }
      }
    });
    chore.memberStates = {};
    this._saveData();
    this.requestUpdate();
  }
  _saveMember(editing) {
    const name = this._getInput("em-name")?.value?.trim();
    if (!name) return;
    const avatar = this._getInput("em-avatar")?.value?.trim() || "";
    if (editing === "new") {
      this._data.members.push({ id: this._uid(), name, avatar, points: 0, dollars: 0 });
    } else {
      const m2 = (this._data.members || []).find((m3) => m3.id === editing);
      if (m2) Object.assign(m2, { name, avatar });
    }
    this._saveData();
    this._cancelEdit();
  }
  _deleteMember(id) {
    this._data.members = (this._data.members || []).filter((m2) => m2.id !== id);
    (this._data.chores || []).forEach((c4) => {
      c4.assignedTo = (c4.assignedTo || []).filter((mid) => mid !== id);
      if (c4.memberStates) delete c4.memberStates[id];
    });
    if (this._state.activeTab === id) {
      this._state.activeTab = (this._data.members[0] || {}).id || "pool";
    }
    this._saveData();
    this._cancelEdit();
  }
  _resetMemberEarnings(id) {
    const m2 = (this._data.members || []).find((m3) => m3.id === id);
    if (m2) {
      m2.points = 0;
      m2.dollars = 0;
    }
    this._saveData();
    this.requestUpdate();
  }
  _savePoolChore(editing) {
    const title = this._getInput("pc-title")?.value?.trim();
    if (!title) return;
    const emoji = this._getInput("pc-emoji")?.value?.trim() || "";
    const points = Math.max(0, Math.round(num(this._getInput("pc-points")?.value)));
    const dollars = Math.max(0, round2(this._getInput("pc-dollars")?.value));
    if (editing === "new-pool") {
      if (!this._data.pool) this._data.pool = [];
      this._data.pool.push({ id: this._uid(), title, emoji, points, dollars, claimedBy: null });
    } else {
      const chore = (this._data.pool || []).find((c4) => c4.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars });
    }
    this._saveData();
    this._cancelEdit();
  }
  _deletePoolChore(id) {
    this._data.pool = (this._data.pool || []).filter((c4) => c4.id !== id);
    this._data.chores = (this._data.chores || []).filter((c4) => c4._poolRef !== id);
    this._saveData();
    this._cancelEdit();
  }
  _unclaimPoolChore(id) {
    const chore = (this._data.pool || []).find((c4) => c4.id === id);
    if (chore) chore.claimedBy = null;
    this._data.chores = (this._data.chores || []).filter((c4) => c4._poolRef !== id);
    this._saveData();
    this.requestUpdate();
  }
  _claimChore(choreId, memberId) {
    const poolChore = (this._data.pool || []).find((c4) => c4.id === choreId);
    if (!poolChore || poolChore.claimedBy) return;
    if (!this._allChoresDone(memberId)) return;
    if (!this._data.chores) this._data.chores = [];
    this._data.chores.push({
      id: this._uid(),
      title: poolChore.title,
      emoji: poolChore.emoji,
      points: poolChore.points,
      dollars: poolChore.dollars,
      assignedTo: [memberId],
      memberStates: {},
      recurrence: "none",
      _poolRef: choreId
    });
    poolChore.claimedBy = memberId;
    this._saveData();
    this._setState({ claimingChore: null, activeTab: memberId });
  }
  // ─── STYLES ──────────────────────────────────────────────────────────────
  static styles = i`
    :host { display: block; height: 100%; font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif); }
    * { box-sizing: border-box; }
    ha-card {
      overflow: hidden;
      color: var(--primary-text-color, #333);
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    /* When the grid pins a fixed height, scroll the content instead of
       cutting it off; with rows: 'auto' this has no visible effect. */
    .tab-content { flex: 1 1 auto; overflow-y: auto; }
    .header, .tab-bar, .sync-banner { flex-shrink: 0; }
    .sync-banner {
      background: #B71C1C; color: #fff;
      padding: 7px 14px; font-size: 0.78rem; font-weight: 600;
      text-align: center;
    }
    .header {
      background: #003366;
      color: #fff;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 50px;
    }
    .header-title { flex: 1; font-size: 1.05rem; font-weight: 700; letter-spacing: 0.3px; }
    .back-btn {
      background: rgba(255,255,255,0.15); border: none; color: #fff; cursor: pointer;
      padding: 5px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;
    }
    .back-btn:hover { background: rgba(255,255,255,0.25); }
    .icon-btn {
      background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer;
      width: 34px; height: 34px; border-radius: 6px; font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.2); }
    .icon-btn.dark {
      background: var(--secondary-background-color, #eee);
      color: var(--primary-text-color, #333);
    }
    .icon-btn.dark:hover { background: var(--divider-color, #ddd); }
    .icon-btn.dark.armed { background: #c62828; color: #fff; }
    .move-btn { font-size: 0.7rem; width: 26px; }
    .move-btn:disabled { opacity: 0.3; cursor: default; }

    /* TAB BAR */
    .tab-bar {
      display: flex;
      overflow-x: auto;
      background: #003366;
      border-bottom: 2px solid #4FC3F7;
      scrollbar-width: none;
      gap: 2px;
      padding: 0 4px;
    }
    .tab-bar::-webkit-scrollbar { display: none; }
    .admin-tabs { background: var(--secondary-background-color, #f5f5f5); border-bottom-color: var(--divider-color, #ddd); }
    .member-tab {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      background: transparent; border: none; cursor: pointer;
      padding: 8px 12px; min-width: 70px;
      color: rgba(255,255,255,0.7); font-size: 0.72rem; font-weight: 600;
      border-bottom: 3px solid transparent; transition: all 0.2s; white-space: nowrap;
    }
    .admin-tabs .member-tab { color: var(--secondary-text-color, #666); }
    .member-tab.active { color: #fff; border-bottom-color: #4FC3F7; }
    .admin-tabs .member-tab.active { color: #0288D1; border-bottom-color: #0288D1; background: var(--card-background-color, #fff); }
    .member-tab:hover { color: #fff; background: rgba(255,255,255,0.08); }
    .admin-tabs .member-tab:hover { color: #0288D1; background: var(--hover-color, rgba(2,136,209,0.05)); }
    .tab-avatar {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #0077b6, #4FC3F7);
      color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
      transition: all 0.2s;
    }
    .tab-avatar.done { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .tab-avatar.pool-icon { background: linear-gradient(135deg, #4a148c, #9c27b0); font-size: 1rem; }
    .small-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #003366, #0288D1);
      color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700;
    }
    .tab-name { font-size: 0.7rem; }
    .tab-badge {
      background: #4FC3F7; color: #003366;
      border-radius: 10px; padding: 1px 6px;
      font-size: 0.65rem; font-weight: 700; min-width: 20px; text-align: center;
    }
    .tab-badge.badge-done { background: #66bb6a; color: #fff; }

    /* CONTENT */
    .tab-content { padding: 12px; }

    /* MEMBER PANEL */
    .member-summary {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 12px;
      background: linear-gradient(135deg, rgba(0,51,102,0.05), rgba(79,195,247,0.08));
      border-radius: 10px; margin-bottom: 12px;
      border: 1px solid rgba(79,195,247,0.2);
    }
    .summary-left { display: flex; align-items: center; gap: 12px; }
    .summary-avatar {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #003366, #0288D1);
      color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; font-weight: 700; flex-shrink: 0;
    }
    .summary-name { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
    .summary-stats { display: flex; gap: 6px; flex-wrap: wrap; }
    .stat-chip {
      font-size: 0.75rem; padding: 2px 8px; border-radius: 10px;
      background: rgba(0,51,102,0.1); color: var(--primary-text-color, #333);
      font-weight: 600;
    }
    .summary-progress { flex: 1; max-width: 140px; text-align: right; }
    .progress-bar-wrap {
      height: 7px; background: var(--divider-color, #e0e0e0);
      border-radius: 4px; overflow: hidden; margin-bottom: 4px;
    }
    .progress-bar {
      height: 100%; background: linear-gradient(90deg, #4FC3F7, #0288D1);
      border-radius: 4px; transition: width 0.4s ease;
    }
    .progress-label { font-size: 0.72rem; color: var(--secondary-text-color, #888); }

    /* CHORE LIST */
    .chores-list { display: flex; flex-direction: column; gap: 7px; }
    .chore-item {
      display: flex; align-items: center; gap: 9px;
      background: var(--secondary-background-color, #f9f9f9);
      border: 1px solid var(--divider-color, #e8e8e8);
      border-radius: 10px; padding: 9px 11px;
      transition: all 0.2s;
    }
    .chore-item.completed { opacity: 0.55; background: rgba(67,160,71,0.06); border-color: rgba(67,160,71,0.3); }
    .chore-item.claimed { opacity: 0.6; }
    .chore-check {
      width: 24px; height: 24px; border: 2px solid var(--divider-color, #bbb);
      border-radius: 5px; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; color: #fff; flex-shrink: 0; transition: all 0.2s;
    }
    .chore-check.checked { background: #43A047; border-color: #43A047; }
    .chore-check.pending { background: #FB8C00; border-color: #FB8C00; font-size: 0.7rem; }
    .chore-item.pending { border-color: rgba(251,140,0,0.5); background: rgba(251,140,0,0.06); }
    .pending-label { color: #FB8C00; }
    .pending-item { border-color: rgba(251,140,0,0.5); }
    .pending-empty {
      padding: 8px 11px; border: 1px dashed var(--divider-color, #ddd);
      border-radius: 10px; display: block;
    }
    .icon-btn.approve { background: #43A047; color: #fff; }
    .icon-btn.approve:hover { background: #2e7d32; }
    .icon-btn.reject { background: #c62828; color: #fff; }
    .icon-btn.reject:hover { background: #b71c1c; }
    .chore-emoji { font-size: 1.25rem; flex-shrink: 0; }
    .chore-body { flex: 1; min-width: 0; }
    .chore-title { font-size: 0.9rem; font-weight: 500; display: block; }
    .chore-recur { font-size: 0.72rem; color: #0288D1; }
    .chore-rewards { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
    .reward-badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 8px; font-weight: 600; }
    .reward-badge.points { background: rgba(255,193,7,0.15); color: #E65100; }
    .reward-badge.dollars { background: rgba(67,160,71,0.15); color: #2E7D32; }

    /* CLAIM BTN */
    .claim-btn {
      padding: 5px 11px; background: #0288D1; color: #fff; border: none;
      border-radius: 7px; cursor: pointer; font-size: 0.78rem; font-weight: 600;
      flex-shrink: 0; transition: background 0.2s;
    }
    .claim-btn:hover:not(.disabled) { background: #01579B; }
    .claim-btn.disabled { background: var(--disabled-color, #ccc); cursor: not-allowed; color: #888; }

    /* POOL */
    .pool-header { margin-bottom: 10px; }
    .pool-eligible { font-size: 0.82rem; color: #2e7d32; font-weight: 600; }
    .pool-none { font-size: 0.82rem; color: var(--secondary-text-color, #888); }
    .section-label {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: #0288D1; margin: 12px 0 6px;
    }
    .claimed-list { opacity: 0.7; }

    /* CLAIM MODAL */
    .modal-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 10; border-radius: inherit;
    }
    .modal {
      background: var(--ha-card-background, #fff);
      border-radius: 14px; padding: 20px; width: 90%; max-width: 320px;
      display: flex; flex-direction: column; gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }
    .modal-title { font-size: 1rem; font-weight: 700; color: #003366; }
    .modal-subtitle { font-size: 0.83rem; color: var(--secondary-text-color, #666); }
    .modal-members { display: flex; flex-direction: column; gap: 8px; }
    .modal-member-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--secondary-background-color, #f5f5f5);
      border: 1.5px solid var(--divider-color, #ddd);
      border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600;
      color: var(--primary-text-color, #333); transition: all 0.2s;
    }
    .modal-member-btn:hover { border-color: #0288D1; background: rgba(2,136,209,0.06); color: #003366; }
    .modal-member-name { flex: 1; text-align: left; }
    .modal-status { font-size: 1.05rem; }
    .modal-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #003366, #0288D1);
      color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700;
    }

    /* CLAIM BANNER */
    .claim-banner {
      margin-top: 12px; padding: 11px 14px;
      background: linear-gradient(135deg, #43A047, #1B5E20);
      color: #fff; border-radius: 10px; cursor: pointer;
      font-size: 0.88rem; font-weight: 600; text-align: center;
    }
    .claim-banner:hover { opacity: 0.9; }

    /* ADMIN */
    .admin-login {
      display: flex; flex-direction: column; align-items: center;
      gap: 14px; padding: 32px 24px;
    }
    .login-icon { font-size: 2.8rem; }
    .login-title { font-size: 1rem; font-weight: 700; }
    .admin-input {
      width: 100%; max-width: 240px; padding: 10px 14px;
      border: 1.5px solid var(--divider-color, #ccc); border-radius: 8px;
      font-size: 1rem; background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #333); text-align: center;
    }
    .admin-input:focus { border-color: #0288D1; outline: none; }
    .login-error { color: #c62828; font-size: 0.82rem; min-height: 16px; }
    .admin-section { display: flex; flex-direction: column; gap: 8px; }
    .admin-item {
      display: flex; align-items: center; gap: 10px;
      background: var(--secondary-background-color, #f9f9f9);
      border: 1px solid var(--divider-color, #e8e8e8);
      border-radius: 10px; padding: 9px 11px;
    }
    .admin-item-info { flex: 1; min-width: 0; }
    .admin-item-title { font-size: 0.88rem; font-weight: 600; }
    .admin-item-meta { font-size: 0.74rem; color: var(--secondary-text-color, #777); margin-top: 2px; }
    .admin-item-actions { display: flex; gap: 4px; }
    .edit-form { display: flex; flex-direction: column; gap: 7px; }
    .form-title { font-size: 1rem; font-weight: 700; color: #003366; margin-bottom: 4px; }
    .edit-form label { font-size: 0.78rem; font-weight: 600; color: var(--secondary-text-color, #666); margin-top: 3px; }
    .form-input {
      padding: 8px 11px; border: 1.5px solid var(--divider-color, #ccc);
      border-radius: 7px; font-size: 0.88rem;
      background: var(--card-background-color, #fff); color: var(--primary-text-color, #333);
      width: 100%;
    }
    .form-input:focus { border-color: #0288D1; outline: none; }
    select.form-input { cursor: pointer; }
    .assign-list { display: flex; flex-wrap: wrap; gap: 7px; padding: 4px 0; }
    .assign-item {
      display: flex; align-items: center; gap: 6px; font-size: 0.84rem;
      cursor: pointer; padding: 5px 10px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 7px; border: 1px solid var(--divider-color, #e0e0e0);
    }
    .empty-inline { font-size: 0.82rem; color: var(--secondary-text-color, #999); }
    .form-actions { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .member-totals {
      display: flex; gap: 16px; padding: 9px 12px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 7px; font-size: 0.85rem; font-weight: 600;
    }
    .primary-btn {
      padding: 8px 16px; background: #003366; color: #fff; border: none;
      border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
    }
    .primary-btn:hover { background: #01579B; }
    .full-btn { width: 100%; }
    .secondary-btn {
      padding: 8px 16px; background: var(--secondary-background-color, #f5f5f5);
      color: var(--primary-text-color, #333); border: 1.5px solid var(--divider-color, #ccc);
      border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
    }
    .secondary-btn:hover { background: var(--hover-color, #e5e5e5); }
    .danger-btn {
      padding: 8px 16px; background: #c62828; color: #fff; border: none;
      border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
    }
    .danger-btn:hover { background: #b71c1c; }
    .danger-btn.armed { background: #8b0000; outline: 2px solid #ff8a80; }
    .empty {
      text-align: center; color: var(--secondary-text-color, #999);
      padding: 20px; font-size: 0.88rem;
    }
  `;
  static getStubConfig() {
    return { title: "Family Chores", admin_password: "1234" };
  }
  static getConfigElement() {
    return document.createElement("chore-tracker-card-editor");
  }
  getCardSize() {
    return 5;
  }
  // Sizing contract for sections (grid) dashboards. rows: 'auto' lets the
  // card grow with its content — tabs, chore lists, and admin views all vary
  // in height — while still allowing manual resizing within sane bounds.
  getGridOptions() {
    return {
      columns: 12,
      min_columns: 6,
      rows: "auto",
      min_rows: 3
    };
  }
};
var ChoreTrackerCardEditor = class extends i4 {
  static styles = i`
    .editor { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; font-weight: 500; color: var(--primary-text-color); }
    input {
      padding: 10px 12px; border: 1px solid var(--divider-color, #ccc);
      border-radius: 6px; font-size: 0.95rem;
      background: var(--card-background-color, #fff); color: var(--primary-text-color, #333);
    }
    input:focus { border-color: #0288D1; outline: none; }
    .hint { font-size: 0.75rem; font-weight: 400; color: var(--secondary-text-color, #888); }
    .check-line { display: flex; align-items: center; gap: 8px; flex-direction: row; }
    .check-line input { width: auto; }
  `;
  set hass(hass) {
    this._hass = hass;
  }
  setConfig(config) {
    this._config = { ...config };
    this.requestUpdate();
  }
  render() {
    if (!this._config) return A;
    return b2`
      <div class="editor">
        <label>Title
          <input id="cfg-title" .value=${this._config.title || ""} placeholder="Family Chores"
            @input=${() => this._valueChanged()} />
        </label>
        <label>Admin password
          <input id="cfg-password" .value=${this._config.admin_password || ""} placeholder="1234"
            @input=${() => this._valueChanged()} />
          <span class="hint">Gate for the parent console. Not a security boundary — anyone who can edit the dashboard can see it.</span>
        </label>
        <label class="check-row">
          <span class="check-line">
            <input type="checkbox" id="cfg-approval" .checked=${!!this._config.require_approval}
              @change=${() => this._valueChanged()} />
            Require admin approval
          </span>
          <span class="hint">Members mark chores done, but points are only awarded after an admin approves them in the admin console.</span>
        </label>
        <label>Dashboard URL path (advanced)
          <input id="cfg-urlpath" .value=${this._config.lovelace_url_path || ""} placeholder="auto-detected"
            @input=${() => this._valueChanged()} />
          <span class="hint">Leave empty unless sync can't find your dashboard automatically.</span>
        </label>
      </div>
    `;
  }
  _valueChanged() {
    const get = (id) => this.shadowRoot.getElementById(id)?.value?.trim() || "";
    const config = { ...this._config };
    config.title = get("cfg-title") || "Chore Tracker";
    config.admin_password = get("cfg-password") || "1234";
    const urlPath = get("cfg-urlpath");
    if (urlPath) config.lovelace_url_path = urlPath;
    else delete config.lovelace_url_path;
    const approval = this.shadowRoot.getElementById("cfg-approval")?.checked;
    if (approval) config.require_approval = true;
    else delete config.require_approval;
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true
    }));
  }
};
if (!customElements.get("chore-tracker-card")) {
  customElements.define("chore-tracker-card", ChoreTrackerCard);
}
if (!customElements.get("chore-tracker-card-editor")) {
  customElements.define("chore-tracker-card-editor", ChoreTrackerCardEditor);
}
window.customCards = window.customCards || [];
if (!window.customCards.find((c4) => c4.type === "chore-tracker-card")) {
  window.customCards.push({
    type: "chore-tracker-card",
    name: "Chore Tracker Card",
    description: "Track family chores with points and allowance rewards"
  });
}
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
