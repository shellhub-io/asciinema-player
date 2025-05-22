(function () {
  'use strict';

  function parseNpt(time) {
    if (typeof time === "number") {
      return time;
    } else if (typeof time === "string") {
      return time.split(":").reverse().map(parseFloat).reduce((sum, n, i) => sum + n * Math.pow(60, i));
    } else {
      return undefined;
    }
  }

  class DummyLogger {
    log() {}
    debug() {}
    info() {}
    warn() {}
    error() {}
  }
  class PrefixedLogger {
    constructor(logger, prefix) {
      this.logger = logger;
      this.prefix = prefix;
    }
    log(message) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      this.logger.log(`${this.prefix}${message}`, ...args);
    }
    debug(message) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      this.logger.debug(`${this.prefix}${message}`, ...args);
    }
    info(message) {
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      this.logger.info(`${this.prefix}${message}`, ...args);
    }
    warn(message) {
      for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }
      this.logger.warn(`${this.prefix}${message}`, ...args);
    }
    error(message) {
      for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
        args[_key5 - 1] = arguments[_key5];
      }
      this.logger.error(`${this.prefix}${message}`, ...args);
    }
  }

  let wasm;
  const cachedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', {
    ignoreBOM: true,
    fatal: true
  }) : {
    decode: () => {
      throw Error('TextDecoder not available');
    }
  };
  if (typeof TextDecoder !== 'undefined') {
    cachedTextDecoder.decode();
  }
  let cachedUint8Memory0 = null;
  function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
      cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
  }
  function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
  }
  const heap = new Array(128).fill(undefined);
  heap.push(undefined, null, true, false);
  let heap_next = heap.length;
  function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
  }
  function getObject(idx) {
    return heap[idx];
  }
  function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
  }
  function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
  }
  function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
      return `${val}`;
    }
    if (type == 'string') {
      return `"${val}"`;
    }
    if (type == 'symbol') {
      const description = val.description;
      if (description == null) {
        return 'Symbol';
      } else {
        return `Symbol(${description})`;
      }
    }
    if (type == 'function') {
      const name = val.name;
      if (typeof name == 'string' && name.length > 0) {
        return `Function(${name})`;
      } else {
        return 'Function';
      }
    }
    // objects
    if (Array.isArray(val)) {
      const length = val.length;
      let debug = '[';
      if (length > 0) {
        debug += debugString(val[0]);
      }
      for (let i = 1; i < length; i++) {
        debug += ', ' + debugString(val[i]);
      }
      debug += ']';
      return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
      className = builtInMatches[1];
    } else {
      // Failed to match the standard '[object ClassName]'
      return toString.call(val);
    }
    if (className == 'Object') {
      // we're a user defined class or Object
      // JSON.stringify avoids problems with cycles, and is generally much
      // easier than looping through ownProperties of `val`.
      try {
        return 'Object(' + JSON.stringify(val) + ')';
      } catch (_) {
        return 'Object';
      }
    }
    // errors
    if (val instanceof Error) {
      return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
  }
  let WASM_VECTOR_LEN = 0;
  const cachedTextEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : {
    encode: () => {
      throw Error('TextEncoder not available');
    }
  };
  const encodeString = typeof cachedTextEncoder.encodeInto === 'function' ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
  } : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length
    };
  };
  function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
      const buf = cachedTextEncoder.encode(arg);
      const ptr = malloc(buf.length, 1) >>> 0;
      getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
      WASM_VECTOR_LEN = buf.length;
      return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
      const code = arg.charCodeAt(offset);
      if (code > 0x7F) break;
      mem[ptr + offset] = code;
    }
    if (offset !== len) {
      if (offset !== 0) {
        arg = arg.slice(offset);
      }
      ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
      const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
      const ret = encodeString(arg, view);
      offset += ret.written;
      ptr = realloc(ptr, len, offset, 1) >>> 0;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
  }
  let cachedInt32Memory0 = null;
  function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
      cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
  }
  /**
  * @param {number} cols
  * @param {number} rows
  * @param {number} scrollback_limit
  * @returns {Vt}
  */
  function create(cols, rows, scrollback_limit) {
    const ret = wasm.create(cols, rows, scrollback_limit);
    return Vt.__wrap(ret);
  }
  let cachedUint32Memory0 = null;
  function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
      cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
  }
  function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
  }
  const VtFinalization = typeof FinalizationRegistry === 'undefined' ? {
    register: () => {},
    unregister: () => {}
  } : new FinalizationRegistry(ptr => wasm.__wbg_vt_free(ptr >>> 0));
  /**
  */
  class Vt {
    static __wrap(ptr) {
      ptr = ptr >>> 0;
      const obj = Object.create(Vt.prototype);
      obj.__wbg_ptr = ptr;
      VtFinalization.register(obj, obj.__wbg_ptr, obj);
      return obj;
    }
    __destroy_into_raw() {
      const ptr = this.__wbg_ptr;
      this.__wbg_ptr = 0;
      VtFinalization.unregister(this);
      return ptr;
    }
    free() {
      const ptr = this.__destroy_into_raw();
      wasm.__wbg_vt_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {any}
    */
    feed(s) {
      const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      const ret = wasm.vt_feed(this.__wbg_ptr, ptr0, len0);
      return takeObject(ret);
    }
    /**
    * @param {number} cols
    * @param {number} rows
    * @returns {any}
    */
    resize(cols, rows) {
      const ret = wasm.vt_resize(this.__wbg_ptr, cols, rows);
      return takeObject(ret);
    }
    /**
    * @returns {string}
    */
    inspect() {
      let deferred1_0;
      let deferred1_1;
      try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vt_inspect(retptr, this.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
      } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
      }
    }
    /**
    * @returns {Uint32Array}
    */
    getSize() {
      try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vt_getSize(retptr, this.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 4, 4);
        return v1;
      } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
      }
    }
    /**
    * @param {number} n
    * @returns {any}
    */
    getLine(n) {
      const ret = wasm.vt_getLine(this.__wbg_ptr, n);
      return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    getCursor() {
      const ret = wasm.vt_getCursor(this.__wbg_ptr);
      return takeObject(ret);
    }
  }
  async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
          return await WebAssembly.instantiateStreaming(module, imports);
        } catch (e) {
          if (module.headers.get('Content-Type') != 'application/wasm') {
            console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
          } else {
            throw e;
          }
        }
      }
      const bytes = await module.arrayBuffer();
      return await WebAssembly.instantiate(bytes, imports);
    } else {
      const instance = await WebAssembly.instantiate(module, imports);
      if (instance instanceof WebAssembly.Instance) {
        return {
          instance,
          module
        };
      } else {
        return instance;
      }
    }
  }
  function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_error_new = function (arg0, arg1) {
      const ret = new Error(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function (arg0) {
      takeObject(arg0);
    };
    imports.wbg.__wbindgen_object_clone_ref = function (arg0) {
      const ret = getObject(arg0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_new = function (arg0) {
      const ret = arg0;
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function (arg0) {
      const ret = BigInt.asUintN(64, arg0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_new = function (arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_f975102236d3c502 = function (arg0, arg1, arg2) {
      getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_new_b525de17f44a8943 = function () {
      const ret = new Array();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_f841cc6f2098f4b5 = function () {
      const ret = new Map();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_f9876326328f45ed = function () {
      const ret = new Object();
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function (arg0) {
      const ret = typeof getObject(arg0) === 'string';
      return ret;
    };
    imports.wbg.__wbg_set_17224bc548dd1d7b = function (arg0, arg1, arg2) {
      getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_388c4c6422704173 = function (arg0, arg1, arg2) {
      const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_debug_string = function (arg0, arg1) {
      const ret = debugString(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_throw = function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    };
    return imports;
  }
  function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;
    return wasm;
  }
  function initSync(module) {
    if (wasm !== undefined) return wasm;
    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
      module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
  }
  async function __wbg_init(input) {
    if (wasm !== undefined) return wasm;
    const imports = __wbg_get_imports();
    if (typeof input === 'string' || typeof Request === 'function' && input instanceof Request || typeof URL === 'function' && input instanceof URL) {
      input = fetch(input);
    }
    const {
      instance,
      module
    } = await __wbg_load(await input, imports);
    return __wbg_finalize_init(instance, module);
  }

  var exports$1 = /*#__PURE__*/Object.freeze({
      __proto__: null,
      Vt: Vt,
      create: create,
      default: __wbg_init,
      initSync: initSync
  });

  const base64codes = [62,0,0,0,63,52,53,54,55,56,57,58,59,60,61,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,0,0,0,0,0,0,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51];

          function getBase64Code(charCode) {
              return base64codes[charCode - 43];
          }

          function base64_decode(str) {
              let missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0;
              let n = str.length;
              let result = new Uint8Array(3 * (n / 4));
              let buffer;

              for (let i = 0, j = 0; i < n; i += 4, j += 3) {
                  buffer =
                      getBase64Code(str.charCodeAt(i)) << 18 |
                      getBase64Code(str.charCodeAt(i + 1)) << 12 |
                      getBase64Code(str.charCodeAt(i + 2)) << 6 |
                      getBase64Code(str.charCodeAt(i + 3));
                  result[j] = buffer >> 16;
                  result[j + 1] = (buffer >> 8) & 0xFF;
                  result[j + 2] = buffer & 0xFF;
              }

              return result.subarray(0, result.length - missingOctets);
          }

          const wasm_code = base64_decode("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OgAAIAEgAkEBazYCBCABIAEoAgBBEGo2AgAMNwsgASgCBCICRQ0RIABBAToAACABIAJBAWs2AgQgASABKAIAQRBqNgIADDYLIAEoAgQiAkUNESAAQQI6AAAgASACQQFrNgIEIAEgASgCAEEQajYCAAw1CyABKAIEIgJFDREgAEEDOgAAIAEgAkEBazYCBCABIAEoAgBBEGo2AgAMNAsgASgCBCICRQ0RIABBBDoAACABIAJBAWs2AgQgASABKAIAQRBqNgIADDMLIAEoAgQiAkUNESAAQQU6AAAgASACQQFrNgIEIAEgASgCAEEQajYCAAwyCyABKAIEIgJFDREgAEEGOgAAIAEgAkEBazYCBCABIAEoAgBBEGo2AgAMMQsgASgCBCICRQ0RIABBBzoAACABIAJBAWs2AgQgASABKAIAQRBqNgIADDALIAEoAgQiAkUNESAAQQg6AAAgASACQQFrNgIEIAEgASgCAEEQajYCAAwvCyABKAIEIgJFDREgAEEJOgAAIAEgAkEBazYCBCABIAEoAgBBEGo2AgAMLgsgASgCBCICRQ0RIABBCjoAACABIAJBAWs2AgQgASABKAIAQRBqNgIADC0LIAEoAgQiAkUNESAAQQs6AAAgASACQQFrNgIEIAEgASgCAEEQajYCAAwsCyABKAIEIgJFDREgAEEMOgAAIAEgAkEBazYCBCABIAEoAgBBEGo2AgAMKwsgASgCBCICRQ0RIABBDToAACABIAJBAWs2AgQgASABKAIAQRBqNgIADCoLAkACQAJAAkACQAJAAkAgAkEea0H//wNxQQhPBEAgAkEmaw4CAQIHCyABKAIEIgNFDRggAEEOOwAAIAEgA0EBazYCBCAAIAJBHms6AAIgASABKAIAQRBqNgIADDALIAEoAgQiAkECSQ0BIAZBEGogASgCAEEQahCRASAGKAIUQQFHDQIgBigCEC8BAEECaw4EAwICBAILIAEoAgQiAkUNFyAAQQ86AAAgASACQQFrNgIEIAEgASgCAEEQajYCAAwuCyACDSdBAUEAQeiewAAQ4wEACyABKAIEIgJFDRYgAkEBayEDIAEoAgBBEGohAgwnCyABKAIAIQIgASgCBCIDQQVPBEAgAEEOOgAAIAItACQhBCACLwE0IQUgAi8BRCEHIAEgA0EFazYCBCABIAJB0ABqNgIAIAAg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QAJAAkAgAigCBCIDQQJxRQRAIAJBoJjBACgCAEYNAiACQZyYwQAoAgBGDQMgAiADQXhxIgIQICAAIAEgAmoiAUEBcjYCBCAAIAFqIAE2AgAgAEGcmMEAKAIARw0BQZSYwQAgATYCAA8LIAIgA0F+cTYCBCAAIAFBAXI2AgQgACABaiABNgIACyABQYACTwRAIAAgARAmDwsgAUH4AXFBhJbBAGohAgJ/QYyYwQAoAgAiA0EBIAFBA3Z0IgFxRQRAQYyYwQAgASADcjYCACACDAELIAIoAggLIQEgAiAANgIIIAEgADYCDCAAIAI2AgwgACABNgIIDwtBoJjBACAANgIAQZiYwQBBmJjBACgCACABaiIBNgIAIAAgAUEBcjYCBCAAQZyYwQAoAgBHDQFBlJjBAEEANgIAQZyYwQBBADYCAA8LQZyYwQAgADYCAEGUmMEAQZSYwQAoAgAgAWoiATYCACAAIAFBAXI2AgQgACABaiABNgIACwuZBgEFfyMAQcABayICJAAgACgCACEAIAJBmILAADYCuAEgAkHMhMAANgKwASACIABB3ABqNgKsASACQbyEwAA2AqgBIAIgAEGIAWo2AqQBIAJBvITAADYCoAEgAiAAQfQAajYCnAEgAkHEgcAANgKYASACIABBrAFqNgKUASACQcSBwAA2ApABIAIgAEGoAWo2AowBIAJBhIPAADYCiAEgAiAAQcIBajYChAEgAkGshMAANgKAASACIABBwQFqNgJ8IAJBhIPAADYCeCACIABBwAFqNgJ0IAJBhIPAADYCcCACIABBvwFqNgJsIAJBhIPAADYCaCACIABBvgFqNgJkIAJBhIPAADYCYCACIABBvQFqNgJcIAJBnITAADYCWCACIABB0ABqNgJUIAJBxIHAADYCUCACIABBpAFqNgJMIAJBjITAADYCSCACIABBsAFqNgJEIAJB9ILAADYCQCACIABBsgFqNgI8IAJB/IPAADYCOCACIABB6ABqNgI0IAJB7IPAADYCMCACIABByABqNgIsIAJB3IPAADYCKCACIABBvAFqNgIkIAJBzIPAADYCICACIABBJGo2AhwgAkHMg8AANgIYIAIgADYCFCACQcSBwAA2AhAgAiAAQaABajYCDCACQcSBwAA2AgggAiAAQZwBajYCBCACIABBwwFqNgK8ASACIAJBvAFqNgK0ASACQQRqIQRBFyEGQaCGwAAhAyMAQSBrIgAkACAAQRc2AgAgAEEXNgIEIAEoAgBB2IfAAEEIIAEoAgQoAgwRAQAhBSAAQQA6AA0gACAFOgAMIAAgATYCCANAIABBCGogAygCACADQQRqKAIAIARB4ITBABAqIQUgBEEIaiEEIANBCGohAyAGQQFrIgYNAAsgAC0ADSIDIAAtAAwiBHIhAQJAIANBAXFFDQAgBEEBcQ0AIAUoAgAiAS0ACkGAAXFFBEAgASgCAEHjgsEAQQIgASgCBCgCDBEBACEBDAELIAEoAgBB4oLBAEEBIAEoAgQoAgwRAQAhAQsgAEEgaiQAIAJBwAFqJAAgAUEBcQvIAwEEfyMAQRBrIgMkAAJAAkAgACgCpAEiAkEBTQRAAkAgACACai0AsAFBAUcNACABQeAAayICQR5LDQAgAkECdEGApMAAaigCACEBCyADQQxqIABBugFqLwEAOwEAIAMgATYCACADIAApAbIBNwIEIAAtAL8BRQ0CIAAtAMIBQQFHDQIgAEEAOgDCASAAQQA2AmggACgCbCIBIAAoAqwBRg0BIAEgACgCoAFBAWtPDQIgACABQbSwwAAQhQFBAToADCAAQQA6AMIBIAAgAUEBajYCbCAAQQA2AmgMAgsgAkECQbCswAAQaAALIAAgAUG0sMAAEIUBQQE6AAwgAEEBELEBCwJAIAACfyAAKAJoIgJBAWoiASAAKAKcASIESQRAIAAoAmwhBAJAIAAtAL0BRQRAIAAgAiAEIAMQiAEMAQsgACgCGCEFIAAgBEHEsMAAEIUBIAIgAiAFRyADEEkLQQAMAQsgACAEQQFrIAAoAmwgAxCIASAALQC/AUUNASAAKAKcASEBQQELOgDCASAAIAE2AmgLIAAoAmwiASAAKAJkIgJJBEAgACgCYCABakEBOgAAIANBEGokAA8LIAEgAkGwrsAAEGgAC48DAQd/IwBBEGsiBCQAAkACQAJAAkAgASgCBCICBEAgASgCACEHIAJBA3EhBQJAIAJBBEkEQEEAIQIMAQsgB0EcaiEDIAJBfHEhCEEAIQIDQCADKAIAIANBCGsoAgAgA0EQaygCACADQRhrKAIAIAJqampqIQIgA0EgaiEDIAggBkEEaiIGRw0ACwsgBQRAIAZBA3QgB2pBBGohAwNAIAMoAgAgAmohAiADQQhqIQMgBUEBayIFDQALCyABKAIMRQ0CIAJBD0sNASAHKAIEDQEMAwtBACECIAEoAgxFDQILIAJBACACQQBKG0EBdCECC0EAIQUgAkEATgRAIAJFDQFBpZTBAC0AABpBASEFIAJBARDVASIDDQILIAUgAkG498AAEMgBAAtBASEDQQAhAgsgBEEANgIIIAQgAzYCBCAEIAI2AgAgBEG49sAAIAEQGEUEQCAAIAQpAgA3AgAgAEEIaiAEQQhqKAIANgIAIARBEGokAA8LQdj3wABB1gAgBEEPakHI98AAQcj4wAAQXAAL5wIBBX8CQCABQc3/eyAAQRAgAEEQSxsiAGtPDQBBECABQQtqQXhxIAFBC0kbIgQgAGpBDGoQDyICRQ0AIAJBCGshAQJAIABBAWsiAyACcUUEQCABIQAMAQsgAkEEayIFKAIAIgZBeHFBACAAIAIgA2pBACAAa3FBCGsiACABa0EQSxsgAGoiACABayICayEDIAZBA3EEQCAAIAMgACgCBEEBcXJBAnI2AgQgACADaiIDIAMoAgRBAXI2AgQgBSACIAUoAgBBAXFyQQJyNgIAIAEgAmoiAyADKAIEQQFyNgIEIAEgAhAaDAELIAEoAgAhASAAIAM2AgQgACABIAJqNgIACwJAIAAoAgQiAUEDcUUNACABQXhxIgIgBEEQak0NACAAIAQgAUEBcXJBAnI2AgQgACAEaiIBIAIgBGsiBEEDcjYCBCAAIAJqIgIgAigCBEEBcjYCBCABIAQQGgsgAEEIaiEDCyADC+YCAQh/IwBBEGsiBSQAQQohAiAAIgNB6AdPBEAgACEEA0AgBUEGaiACaiIGQQNrIAQgBEGQzgBuIgNBkM4AbGsiB0H//wNxQeQAbiIIQQF0IglB7oLBAGotAAA6AAAgBkEEayAJQe2CwQBqLQAAOgAAIAZBAWsgByAIQeQAbGtB//8DcUEBdCIHQe6CwQBqLQAAOgAAIAZBAmsgB0HtgsEAai0AADoAACACQQRrIQIgBEH/rOIESyADIQQNAAsLAkAgA0EJTQRAIAMhBAwBCyACIAVqQQVqIAMgA0H//wNxQeQAbiIEQeQAbGtB//8DcUEBdCIDQe6CwQBqLQAAOgAAIAJBAmsiAiAFQQZqaiADQe2CwQBqLQAAOgAACyAERSAAQQBHcUUEQCACQQFrIgIgBUEGamogBEEBdEEecUHugsEAai0AADoAAAsgAUEBQQAgBUEGaiACakEKIAJrEBQgBUEQaiQAC4QDAQR/IAAoAgwhAgJAAkACQCABQYACTwRAIAAoAhghAwJAAkAgACACRgRAIABBFEEQIAAoAhQiAhtqKAIAIgENAUEAIQIMAgsgACgCCCIBIAI2AgwgAiABNgIIDAELIABBFGogAEEQaiACGyEEA0AgBCEFIAEiAigCFCEBIAJBFGogAkEQaiABGyEEIAJBFEEQIAEbaigCACIBDQALIAVBADYCAAsgA0UNAgJAIAAoAhxBAnRB9JTBAGoiASgCACAARwRAIAMoAhAgAEYNASADIAI2AhQgAg0DDAQLIAEgAjYCACACRQ0EDAILIAMgAjYCECACDQEMAgsgAiAAKAIIIgBHBEAgACACNgIMIAIgADYCCA8LQYyYwQBBjJjBACgCAEF+IAFBA3Z3cTYCAA8LIAIgAzYCGCAAKAIQIgEEQCACIAE2AhAgASACNgIYCyAAKAIUIgBFDQAgAiAANgIUIAAgAjYCGA8LDwtBkJjBAEGQmMEAKAIAQX4gACgCHHdxNgIAC8oCAQZ/IAEgAkEBdGohCSAAQYD+A3FBCHYhCiAAQf8BcSEMAkACQAJAAkADQCABQQJqIQsgByABLQABIgJqIQggCiABLQAAIgFHBEAgASAKSw0EIAghByAJIAsiAUcNAQwECyAHIAhLDQEgBCAISQ0CIAMgB2ohAQNAIAJFBEAgCCEHIAkgCyIBRw0CDAULIAJBAWshAiABLQAAIAFBAWohASAMRw0ACwtBACECDAMLIAcgCEHohcEAEOUBAAsgCCAEQeiFwQAQ5AEACyAAQf//A3EhByAFIAZqIQNBASECA0AgBUEBaiEAAkAgBSwAACIBQQBOBEAgACEFDAELIAAgA0cEQCAFLQABIAFB/wBxQQh0ciEBIAVBAmohBQwBC0HYhcEAEOcBAAsgByABayIHQQBIDQEgAkEBcyECIAMgBUcNAAsLIAJBAXELygIBA38jAEEQayICJAACQCABQYABTwRAIAJBADYCDAJ/IAFBgBBPBEAgAUGAgARPBEAgAkEMakEDciEEIAIgAUESdkHwAXI6AAwgAiABQQZ2QT9xQYABcjoADiACIAFBDHZBP3FBgAFyOgANQQQMAgsgAkEMakECciEEIAIgAUEMdkHgAXI6AAwgAiABQQZ2QT9xQYABcjoADUEDDAELIAJBDGpBAXIhBCACIAFBBnZBwAFyOgAMQQILIQMgBCABQT9xQYABcjoAACAAKAIAIAAoAggiAWsgA0kEQCAAIAEgAxA5IAAoAgghAQsgAwRAIAAoAgQgAWogAkEMaiAD/AoAAAsgACABIANqNgIIDAELIAAoAggiAyAAKAIARgRAIABB2PjAABBICyAAIANBAWo2AgggACgCBCADaiABOgAACyACQRBqJABBAAvIAgECfyMAQRBrIgIkAAJAIAFBgAFPBEAgAkEANgIMAn8gAUGAEE8EQCABQYCABE8EQCACIAFBP3FBgAFyOgAPIAIgAUESdkHwAXI6AAwgAiABQQZ2QT9xQYABcjoADiACIAFBDHZBP3FBgAFyOgANQQQMAgsgAiABQT9xQYABcjoADiACIAFBDHZB4AFyOgAMIAIgAUEGdkE/cUGAAXI6AA1BAwwBCyACIAFBP3FBgAFyOgANIAIgAUEGdkHAAXI6AAxBAgshASAAKAIAIAAoAggiA2sgAUkEQCAAIAMgARAvIAAoAgghAwsgAQRAIAAoAgQgA2ogAkEMaiAB/AoAAAsgACABIANqNgIIDAELIAAoAggiAyAAKAIARgRAIABBkPHAABBICyAAKAIEIANqIAE6AAAgACADQQFqNgIICyACQRBqJABBAAvvAwEFfyMAQTBrIgUkACACIAFrIgkgA0khBiACQQFrIgcgACgCHCIIQQFrSQRAIAAgB0HEscAAEIUBQQA6AAwLIAkgAyAGGyEDAkACQCABRQRAIAIgCEYNASAAKAIYIQcgBUEgaiIBQQxqIARBCGovAAA7AQAgBUEgNgIgIAUgBCkAADcCJCAFQRBqIAEgBxBGIAVBADoAHCADBEAgAEEMaiEEIAAoAhQgAmogACgCHGshAgNAIAVBIGoiASAFQRBqEFIgBUEAOgAsAkAgBCgCCCIGIAJPBEAgBCgCACAGRgRAIARB1LHAABCSAQsgBCgCBCACQQR0aiEIAkAgAiAGTw0AIAYgAmtBBHQiB0UNACAIQRBqIAggB/wKAAALIAggASkCADcCACAIQQhqIAFBCGopAgA3AgAgBCAGQQFqNgIIDAELIAIgBkHUscAAEGcACyADQQFrIgMNAAsLIAVBEGpBBEEQEF0MAgsgACABQQFrQeSxwAAQhQFBADoADCAFQQhqIAAgASACQfSxwAAQYSAFKAIIIQcgBSgCDCIBIANJBEBB/KTAAEEjQeylwAAQmwEACyADIAcgA0EEdGogASADaxASIAAgAiADayACIAQQRwwBCyAAIAMgACgCGBBxCyAAQQE6ACAgBUEwaiQAC74CAQF/AkACQCAAKAIAIgBB/wBPBEACQCAAQZ8BTQ0AIABBDXZBgLXAAGotAAAiAUEVTw0CIABBB3ZBP3EgAUEGdHJBgLfAAGotAAAiAUG0AU8NAyAAQQJ2QR9xIAFBBXRyQcDBwABqLQAAIABBAXRBBnF2QQNxIgFBA0cNAAJAAkACQCAAQY38A0wEQCAAQdwLRgRAQQEPCyAAQdgvRg0CQQEhASAAQZA0Rw0BDAQLIABBjvwDa0ECSQ0CQQEhASAAQYOYBEYNAwtBAUEBQQFBAUEBQQIgAEHm4wdrQRpJGyAAQbHaAGtBP0kbIABBgC9rQTBJGyAAQaIMa0HhBEkbIABB/v//AHFB/MkCRhsPC0EDDwtBACEBCyABDwsgAEEfSw8LIAFBFUGsosAAEGgACyABQbQBQbyiwAAQaAALxAIBBH8gAEIANwIQIAACf0EAIAFBgAJJDQAaQR8gAUH///8HSw0AGiABQQYgAUEIdmciA2t2QQFxIANBAXRrQT5qCyICNgIcIAJBAnRB9JTBAGohBEEBIAJ0IgNBkJjBACgCAHFFBEAgBCAANgIAIAAgBDYCGCAAIAA2AgwgACAANgIIQZCYwQBBkJjBACgCACADcjYCAA8LAkACQCABIAQoAgAiAygCBEF4cUYEQCADIQIMAQsgAUEAQRkgAkEBdmsgAkEfRht0IQUDQCADIAVBHXZBBHFqIgQoAhAiAkUNAiAFQQF0IQUgAiEDIAIoAgRBeHEgAUcNAAsLIAIoAggiASAANgIMIAIgADYCCCAAQQA2AhggACACNgIMIAAgATYCCA8LIARBEGogADYCACAAIAM2AhggACAANgIMIAAgADYCCAuZAwIEfwF+IwBBIGsiBiQAAkAgBUUNACACIANqIgMgAkkNACAEIAVqQQFrQQAgBGtxrSADIAEoAgAiCEEBdCICIAIgA0kbIgJBCEEEQQEgBUGBCEkbIAVBAUYbIgMgAiADSxsiCa1+IgpCIIinDQAgCqciA0GAgICAeCAEa0sNAAJ/IAhFBEAgBkEYaiEHQQAMAQsgBkEcaiEHIAYgBDYCGCAGIAEoAgQ2AhQgBSAIbAshBSAHIAU2AgAgBkEUaiEIIAZBCGoiBwJ/An8CQCADIgVBAE4EQCAIKAIEBEAgCCgCCCIDBEAgCCgCACADIAQgBRDMAQwECwsgBUUNAUGllMEALQAAGiAFIAQQ1QEMAgsgB0EANgIEQQEMAgsgBAsiA0UEQCAHIAU2AgggByAENgIEQQEMAQsgByAFNgIIIAcgAzYCBEEACzYCACAGKAIIQQFGBEAgBigCECECIAYoAgwhBwwBCyAGKAIMIQMgASAJNgIAIAEgAzYCBEGBgICAeCEHCyAAIAI2AgQgACAHNgIAIAZBIGokAAufBQEMfyMAQTBrIgYkACAGQQA7AA4gBkECOgAKIAZBAjoABiAGQSxqIAUgBkEGaiAFGyIFQQhqLwAAOwEAIAZBIDYCICAGIAUpAAA3AiQgBkEQaiILIAZBIGoiDyABEEYgBkEAOgAcIwBBEGsiDCQAIAJBBHQhCAJAAkAgAkH/////AEsNACAIQfz///8HSw0AAn8gCEUEQEEEIQ1BAAwBC0GllMEALQAAGkEEIQcgCEEEENUBIg1FDQEgAgshCCAMQQRqIgdBCGoiEEEANgIAIAwgDTYCCCAMIAg2AgQjAEEQayIOJAAgBygCACAHKAIIIglrIAJJBEAgByAJIAJBBEEQEJQBIAcoAgghCQsgBygCBCAJQQR0aiEKAkACQCACQQJPBEAgAkEBayENIAstAAwhCANAIA4gCxBSIAogDikCADcCACAOIAg6AAwgCkEIaiAOQQhqKQIANwIAIApBEGohCiANQQFrIg0NAAsgAiAJakEBayEJDAELIAINACAHIAk2AgggC0EEQRAQXQwBCyAKIAspAgA3AgAgByAJQQFqNgIIIApBCGogC0EIaikCADcCAAsgDkEQaiQAIA9BCGogECgCADYCACAPIAwpAgQ3AgAgDEEQaiQADAELIAcgCEGUsMAAEMgBAAsCQCADQQFxBEACQCAERQ0AIAQgBigCICAGKAIoIgNrTQ0AIAZBIGogAyAEQQRBEBCUAQsgBEEKbiAEaiEFQQEhEQwBCyAGKAIgIAYoAigiBGtB5wdLDQAgBkEgaiAEQegHQQRBEBCUAQsgACAGKQIgNwIMIAAgAjYCHCAAIAE2AhggAEEAOgAgIAAgBTYCCCAAIAQ2AgQgACARNgIAIABBFGogBkEoaigCADYCACAGQTBqJAALzAIAAkACQAJAAkACQAJAAkAgA0EBaw4GAAECAwQFBgsgACgCGCEDIAAgAkH0sMAAEIUBIgRBADoADCAEIAEgAyAFEE8gACACQQFqIAAoAhwgBRBHDwsgACgCGCEDIAAgAkGEscAAEIUBQQAgAyABQQFqIgEgASADSxsgBRBPIABBACACIAUQRw8LIABBACAAKAIcIAUQRw8LIAAoAhghAyAAIAJBlLHAABCFASIAIAEgAyAFEE8gAEEAOgAMDwsgACgCGCEDIAAgAkGkscAAEIUBQQAgAyABQQFqIgAgACADSxsgBRBPDwsgACgCGCEBIAAgAkG0scAAEIUBIgBBACABIAUQTyAAQQA6AAwPCyAAKAIYIQMgACACQeSwwAAQhQEiACABIAEgAyABayIBIAQgASAESRtqIgEgBRBPIAEgA0YEQCAAQQA6AAwLC84CAQR/IwBBIGsiBSQAQQEhBwJAIAAtAAQNACAALQAFIQggACgCACIGLQAKQYABcUUEQCAGKAIAQduCwQBB2ILBACAIQQFxIggbQQJBAyAIGyAGKAIEKAIMEQEADQEgBigCACABIAIgBigCBCgCDBEBAA0BIAYoAgBBqILBAEECIAYoAgQoAgwRAQANASADIAYgBCgCDBEAACEHDAELIAhBAXFFBEAgBigCAEHdgsEAQQMgBigCBCgCDBEBAA0BCyAFQQE6AA8gBUG8gsEANgIUIAUgBikCADcCACAFIAYpAgg3AhggBSAFQQ9qNgIIIAUgBTYCECAFIAEgAhAZDQAgBUGogsEAQQIQGQ0AIAMgBUEQaiAEKAIMEQAADQAgBSgCEEHggsEAQQIgBSgCFCgCDBEBACEHCyAAQQE6AAUgACAHOgAEIAVBIGokACAAC6kCAQZ/IwBBEGsiAiQAAkACQCABKAIQIgUgACgCACAAKAIIIgNrSwRAIAAgAyAFQQRBEBCUASAAKAIIIQMgACgCBCEEIAJBCGogAUEMaigCADYCACACIAEpAgQ3AwAMAQsgACgCBCEEIAJBCGogAUEMaigCADYCACACIAEpAgQ3AwAgBUUNAQsCQCABKAIAIgZBgIDEAEYNACAEIANBBHRqIgEgBjYCACABIAIpAwA3AgQgAUEMaiACQQhqIgcoAgA2AgAgBUEBayIERQRAIANBAWohAwwBCyADIAVqIQMgAUEUaiEBA0AgAUEEayAGNgIAIAEgAikDADcCACABQQhqIAcoAgA2AgAgAUEQaiEBIARBAWsiBA0ACwsgACADNgIICyACQRBqJAALhgIBA38jAEGAAWsiBCQAIAAoAgAhAAJ/AkAgASgCCCICQYCAgBBxRQRAIAJBgICAIHENASAAKAIAIAEQHwwCCyAAKAIAIQBBACECA0AgAiAEakH/AGogAEEPcSIDQTByIANB1wBqIANBCkkbOgAAIAJBAWshAiAAQQ9LIABBBHYhAA0ACyABQeuCwQBBAiACIARqQYABakEAIAJrEBQMAQsgACgCACEAQQAhAgNAIAIgBGpB/wBqIABBD3EiA0EwciADQTdqIANBCkkbOgAAIAJBAWshAiAAQQ9LIABBBHYhAA0ACyABQeuCwQBBAiACIARqQYABakEAIAJrEBQLIARBgAFqJAALvgICBX8BfiMAQUBqIgIkACABKAIAQYCAgIB4RgRAIAEoAgwhBCACQRxqIgVBCGoiBkEANgIAIAJCgICAgBA3AhwgAkEoaiIDQQhqIAQoAgAiBEEIaikCADcDACADQRBqIARBEGopAgA3AwAgAiAEKQIANwMoIAVBgPLAACADEBgaIAJBGGogBigCACIDNgIAIAIgAikCHCIHNwMQIAFBCGogAzYCACABIAc3AgALIAEpAgAhByABQoCAgIAQNwIAIAJBCGoiAyABQQhqIgEoAgA2AgAgAUEANgIAQaWUwQAtAAAaIAIgBzcDAEEMQQQQ1QEiAUUEQEEEQQxB4JTBACgCACIAQdAAIAAbEQIAAAsgASACKQMANwIAIAFBCGogAygCADYCACAAQfj0wAA2AgQgACABNgIAIAJBQGskAAvtAgEHfyMAQTBrIgMkACACKAIEIQQgA0EgaiABIAIoAggiARDGASAAAn8CQAJAIAMoAiBFBEAgAygCJCEEDAELIANBGGogA0EoaigCADYCACADIAMpAiA3AxAgAUECdCECA0AgAkUNAiACQQRrIQIgAyAENgIgIARBBGohBCADQQhqIQcjAEEQayIBJAAgA0EQaiIFKAIIIQggAUEIaiAFKAIAIANBIGooAgA1AgAQTkEBIQYgASgCDCEJIAEoAghBAXFFBEAgBUEEaiAIIAkQ4QEgBSAIQQFqNgIIQQAhBgsgByAJNgIEIAcgBjYCACABQRBqJAAgAygCCEEBcUUNAAsgAygCDCEEIAMoAhQiAUGEAUkNACABEAELQQEMAQsgA0EgaiIBQQhqIANBGGooAgA2AgAgAyADKQMQNwMgIAMgASgCBDYCBCADQQA2AgAgAygCBCEEIAMoAgALNgIAIAAgBDYCBCADQTBqJAAL0gECBH8BfiMAQSBrIgMkAAJAAkAgASACaiICIAFJBEBBACEBDAELQQAhASACIAAoAgAiBUEBdCIEIAIgBEsbIgJBCCACQQhLGyIErSIHQiCIpw0AIAenIgZB/////wdLDQAgAyAFBH8gAyAFNgIcIAMgACgCBDYCFEEBBUEACzYCGCADQQhqIAYgA0EUahBKIAMoAghBAUcNASADKAIQIQIgAygCDCEBCyABIAJB8PHAABDIAQALIAMoAgwhASAAIAQ2AgAgACABNgIEIANBIGokAAuiAgEEfyMAQSBrIgUkAEEBIQYCQCAAKAIAIgcgASACIAAoAgQiCCgCDCIBEQEADQACQCAALQAKQYABcUUEQCAHQeWCwQBBASABEQEADQIgAyAAIAQoAgwRAABFDQEMAgsgB0HmgsEAQQIgAREBAA0BIAVBAToADyAFIAg2AgQgBSAHNgIAIAVBvILBADYCFCAFIAApAgg3AhggBSAFQQ9qNgIIIAUgBTYCECADIAVBEGogBCgCDBEAAA0BIAUoAhBB4ILBAEECIAUoAhQoAgwRAQANAQsCQCACDQAgAC0ACkGAAXENACAAKAIAQeiCwQBBASAAKAIEKAIMEQEADQELIAAoAgBB3//AAEEBIAAoAgQoAgwRAQAhBgsgBUEgaiQAIAYL8gEBBX8gACgCBCECIAAoAgAhASAAQoSAgIDAADcCACAAKAIIIQMCQAJAIAEgAkYEQCAAKAIQIgFFDQEgACgCDCICIAMoAggiAEYNAiABQQR0IgRFDQIgAygCBCIFIABBBHRqIAUgAkEEdGogBPwKAAAMAgsgAiABa0EEdiECA0AgAUEEQRAQXSABQRBqIQEgAkEBayICDQALIAAoAhAiAUUNAAJAIAAoAgwiAiADKAIIIgBGDQAgAUEEdCIERQ0AIAMoAgQiBSAAQQR0aiAFIAJBBHRqIAT8CgAACyADIAAgAWo2AggLDwsgAyAAIAFqNgIIC4ICAQR/IwBBIGsiAyQAQQEhBQJAIAAtAAQNACAALQAFIQYCQCAAKAIAIgQtAApBgAFxRQRAIAZBAXFFDQEgBCgCAEHbgsEAQQIgBCgCBCgCDBEBAEUNAQwCCyAGQQFxRQRAIAQoAgBB6YLBAEEBIAQoAgQoAgwRAQANAgsgA0EBOgAPIANBvILBADYCFCADIAQpAgA3AgAgAyAEKQIINwIYIAMgA0EPajYCCCADIAM2AhAgASADQRBqIAIoAgwRAAANASADKAIQQeCCwQBBAiADKAIUKAIMEQEAIQUMAQsgASAEIAIoAgwRAAAhBQsgAEEBOgAFIAAgBToABCADQSBqJAALjAEBBH8jAEEQayICJAACQCABQQBIDQBBASEEIAEEQEGllMEALQAAGkEBIQMgAUEBENUBIgRFDQELIAJBBGoiA0EIaiIFQQA2AgAgAiAENgIIIAIgATYCBCADIAFBARBTIABBCGogBSgCADYCACAAIAIpAgQ3AgAgAkEQaiQADwsgAyABQaCuwAAQyAEAC9gBAQV/IwBBEGsiByQAIAdBDGohCAJAIARFDQAgASgCACIGRQ0AIAcgAzYCDCAEIAZsIQUgASgCBCEJIAdBCGohCAsgCCAFNgIAAkAgBygCDCIFBEAgBygCCCEGAkAgAkUEQCAGRQ0BIAkgBiAFEN8BDAELIAIgBGwhCAJ/AkAgBEUEQCAGRQ0BIAkgBiAFEN8BDAELIAkgBiAFIAgQzAEMAQsgBQsiA0UNAgsgASACNgIAIAEgAzYCBAtBgYCAgHghBQsgACAINgIEIAAgBTYCACAHQRBqJAALkAMBBn8jAEEgayIEJAAgBCACNgIQIAQgBEEUajYCFAJAAkACQCABIAJGDQADQCABEJABQf//A3EiA0UEQCACIAFBEGoiAUcNAQwCCwsgBCABQRBqNgIMQaWUwQAtAAAaQQhBAhDVASICRQ0CIAIgAzsBACAEQRRqIgFBCGoiBkEBNgIAIAQgAjYCGCAEQQQ2AhQgBCgCDCEDIAQoAhAhBSMAQRBrIgIkACACIAU2AgggAiADNgIEIAIgAkEMaiIHNgIMAkAgAyAFRg0AA0AgAxCQAUH//wNxIghFBEAgBSADQRBqIgNGDQIMAQsgAiADQRBqNgIEIAEoAggiAyABKAIARgRAIAEgA0EBQQJBAhCUAQsgASADQQFqNgIIIAEoAgQgA0EBdGogCDsBACACIAc2AgwgAigCBCIDIAIoAggiBUcNAAsLIAJBEGokACAAQQhqIAYoAgA2AgAgACAEKQIUNwIADAELIABBADYCCCAAQoCAgIAgNwIACyAEQSBqJAAPC0ECQQhBnJvAABDIAQALzgIBBX8jAEEQayIFJAACQAJAAkAgASACRg0AA0BBBEEUQQMgAUEEai8BACIDQRRGGyADQQRGGyIDQQNGBEAgAiABQRBqIgFHDQEMAgsLQaWUwQAtAAAaQQhBAhDVASIERQ0CIAQgAzsBACAFQQRqIgNBCGoiBkEBNgIAIAUgBDYCCCAFQQQ2AgQCQCABQRBqIgEgAkYNACABQRBqIQEDQEEEQRRBAyABQQxrLwEAIgRBFEYbIARBBEYbIgdBA0cEQCADKAIIIgQgAygCAEYEQCADIARBAUECQQIQlAELIAMgBEEBajYCCCADKAIEIARBAXRqIAc7AQALIAEgAkYNASABQRBqIQEMAAsACyAAQQhqIAYoAgA2AgAgACAFKQIENwIADAELIABBADYCCCAAQoCAgIAgNwIACyAFQRBqJAAPC0ECQQhBnJvAABDIAQAL6wEBAX8jAEEQayIVJAAgACgCACABIAIgACgCBCgCDBEBACEBIBVBADoADSAVIAE6AAwgFSAANgIIIBVBCGogAyAEIAUgBhAqIAcgCCAJQcSBwAAQKiAKIAsgDCANECogDiAPIBAgERAqIBIgEyAUQZiCwAAQKiEBIBUtAA0iAiAVLQAMIgNyIQACQCACQQFHDQAgA0EBcQ0AIAEoAgAiAC0ACkGAAXFFBEAgACgCAEHjgsEAQQIgACgCBCgCDBEBACEADAELIAAoAgBB4oLBAEEBIAAoAgQoAgwRAQAhAAsgFUEQaiQAIABBAXELkQIBAn8jAEEgayIFJABB8JTBAEHwlMEAKAIAIgZBAWo2AgACf0EAIAZBAEgNABpBAUG8mMEALQAADQAaQbyYwQBBAToAAEG4mMEAQbiYwQAoAgBBAWo2AgBBAgsiBkECRwRAIAZBAXEEQCAFQQhqIAAgASgCGBECAAsACwJAQeSUwQAoAgAiBkEATgRAQeSUwQAgBkEBajYCAEHolMEAKAIABEAgBSAAIAEoAhQRAgAgBSAEOgAdIAUgAzoAHCAFIAI2AhggBSAFKQMANwIQQeiUwQAoAgAgBUEQakHslMEAKAIAKAIUEQIAC0HklMEAQeSUwQAoAgBBAWs2AgBBvJjBAEEAOgAAIANFDQEACwALAAvCAQEDfyMAQSBrIgMkAAJAAkAgASABIAJqIgJLBEBBACEBDAELQQAhASACIAAoAgAiBUEBdCIEIAIgBEsbIgJBCCACQQhLGyIEQQBIDQBBACECIAMgBQR/IAMgBTYCHCADIAAoAgQ2AhRBAQVBAAs2AhggA0EIaiAEIANBFGoQSiADKAIIQQFHDQEgAygCECEAIAMoAgwhAQsgASAAQYz3wAAQyAEACyADKAIMIQEgACAENgIAIAAgATYCBCADQSBqJAAL2wEBAX8jAEEQayISJAAgACgCACABIAIgACgCBCgCDBEBACEBIBJBADoADSASIAE6AAwgEiAANgIIIBJBCGogAyAEIAUgBhAqIAcgCCAJIAoQKiALQQkgDCANECogDiAPIBAgERAqIQEgEi0ADSICIBItAAwiA3IhAAJAIAJBAUcNACADQQFxDQAgASgCACIALQAKQYABcUUEQCAAKAIAQeOCwQBBAiAAKAIEKAIMEQEAIQAMAQsgACgCAEHigsEAQQEgACgCBCgCDBEBACEACyASQRBqJAAgAEEBcQvSAQIEfwF+IwBBEGsiBSQAIAEoAgAhAyABKAIEIQYCQAJAAkAgAkUEQCADIQQMAQsDQCADIAZGDQIgASADQRBqIgQ2AgAgBUEIaiADQQhqKQIANwMAIAUgAykCACIHNwMAIAenQYCAgIB4Rg0CIAVBBEEQEF0gBCEDIAJBAWsiAg0ACwsgBCAGRwRAIAEgBEEQajYCACAAIAQpAgA3AgAgAEEIaiAEQQhqKQIANwIADAILIABBgICAgHg2AgAMAQsgAEGAgICAeDYCAAsgBUEQaiQAC54MARJ/IwBBEGsiECQAIAAoApwBIgYgACgCGEcEQCAAQQA6AMIBCyAQQQhqIREgACgCoAEhDSAAKAJoIQsgACgCbCEIIwBBQGoiByQAQQAgCCAAKAIcIglrIgEgASAAKAIUIgQgCWsgCGoiAUsbIQ4gACgCECEMIAAoAhghDwJAIARFDQAgAUUNACAEIAhqIAlBf3NqIQIgDEEMaiEFIARBBHRBEGshAQNAIAogD2pBACAFLQAAIgMbIQogDiADQQFzaiEOIAJFDQEgBUEQaiEFIAJBAWshAiABIgNBEGshASADDQALCwJAIAYgD0YNACAKIAtqIQogAEEANgIUIAdBADYCOCAHIAQ2AjQgByAAQQxqIgg2AjAgByAMIARBBHRqNgIsIAcgDDYCKCAHIAY2AjwgB0GAgICAeDYCGCAHQQxqIQsjAEHQAGsiASQAIAFBGGogB0EYaiICEBYCQAJAAkAgASgCGEGAgICAeEcEQEGllMEALQAAGkHAAEEEENUBIgNFDQIgAyABKQIYNwIAIAFBFGoiD0EBNgIAIANBCGogAUEgaikCADcCACABIAM2AhAgAUEENgIMIAFBKGoiDCACQSj8CgAAIAFBDGohBCMAQRBrIgMkACADIAwQFiADKAIAQYCAgIB4RwRAIAQoAggiAkEEdCEFA0AgBCgCACACRgRAIAQgAkEBQQRBEBCUAQsgBCACQQFqIgI2AgggBCgCBCAFaiISIAMpAgA3AgAgEkEIaiADQQhqKQIANwIAIAMgDBAWIAVBEGohBSADKAIAQYCAgIB4Rw0ACwsgDBC9ASADQRBqJAAgC0EIaiAPKAIANgIAIAsgASkCDDcCAAwBCyALQQA2AgggC0KAgICAwAA3AgAgAhC9AQsgAUHQAGokAAwBC0EEQcAAQaivwAAQyAEACyAHKAIUQQR0IQIgBygCECEFAkADQCACRQ0BIAJBEGshAiAFKAIIIAVBEGohBSAGRg0AC0GUs8AAQTdBzLPAABCbAQALIAdBIGoiASAHQRRqKAIANgIAIAcgBykCDDcDGCAIEKYBIAhBBEEQEF0gCEEIaiABKAIANgIAIAggBykDGDcCACAJIAAoAhQiBEsEQCAAIAkgBGsgBhBxIAAoAhQhBAtBACECAkAgDkUNACAEQQFrIgNFDQAgACgCEEEMaiEFQQAhAQNAAkAgAiAERwRAIAJBAWohAiAOIAEgBS0AAEEBc2oiAUsNAQwDCyAEIARB1LLAABBoAAsgBUEQaiEFIAIgA0kNAAsLAkACQCAGIApLDQAgAiAEIAIgBEsbIQEgACgCECACQQR0akEMaiEFA0AgASACRg0CIAUtAABBAUcNASAFQRBqIQUgAkEBaiECIAogBmsiCiAGTw0ACwsgBkEBayIBIAogASAKSRshCyACIAkgBGtqIgFBAE4hAyABQQAgAxshCCAJQQAgASADG2shCQwBCyABIARBxLLAABBoAAsCQAJAAkACQAJAIAkgDUkgCSANS2tB/wFxDgIEAQALIAkgCEF/c2oiASAJIA1rIgMgASADSRsiAkUNAgJAIAQgAmsiASAAQQxqIgQoAggiBUsNACAEIAE2AgggASAFRg0AIAUgAWshBSAEKAIEIAFBBHRqIQEDQCABQQRBEBBdIAFBEGohASAFQQFrIgUNAAsLIAAoAhQiAQRAIAAoAhAgAUEEdGoiAUEQaw0CC0G0ssAAEOcBAAsgDSAJayIBQQAgBCAJayIDIAMgBEsbIgMgASADSRsiAkEAIAggCUkbIAhqIQggASADTQ0CIAAgASACayAGEHEMAgsgAUEEa0EAOgAACyAIIANrIAJqIQgLIABBAToAICAAIA02AhwgACAGNgIYIBEgCDYCBCARIAs2AgAgB0FAayQAIAAgECkDCDcCaCAAQdwAaiEBAkAgACgCoAEiBiAAKAJkIgNNBEAgACAGNgJkDAELIAEgBiADa0EAEFMgACgCoAEhBgsgAUEAIAYQdyAAKAKcASIGIAAoAnRNBEAgACAGQQFrNgJ0CyAAKAKgASIGIAAoAnhNBEAgACAGQQFrNgJ4CyAQQRBqJAAL0QEBAX8jAEEQayIPJAAgACgCACABIAIgACgCBCgCDBEBACEBIA9BADoADSAPIAE6AAwgDyAANgIIIA9BCGogAyAEIAUgBhAqIAcgCCAJIAoQKiALIAwgDSAOECohASAPLQANIgIgDy0ADCIDciEAAkAgAkEBRw0AIANBAXENACABKAIAIgAtAApBgAFxRQRAIAAoAgBB44LBAEECIAAoAgQoAgwRAQAhAAwBCyAAKAIAQeKCwQBBASAAKAIEKAIMEQEAIQALIA9BEGokACAAQQFxC74BAQN/AkAgACgChAQiAUF/RwRAIAFBAWohAiABQSBJDQEgAkEgQYicwAAQ5AEAC0GInMAAEKgBAAsgAEEEaiEBIAAgAkEEdGpBBGohAwNAAkAgASgCACICQX9HBEAgAkEGSQ0BIAJBAWpBBkGYocAAEOQBAAtBmKHAABCoAQALIAJBAXRBAmoiAgRAIAFBBGpBACAC/AsACyABQQA2AgAgAyABQRBqIgFHDQALIABBgIDEADYCACAAQQA2AoQEC64BAQN/IwBBEGsiAiQAIAJCgICAgMAANwIEIAJBADYCDEEAIAFBCGsiBCABIARJGyIBQQN2IAFBB3FBAEdqIgQEQEEIIQEDQCACKAIEIANGBEAgAkEEakHMqsAAEJMBCyACKAIIIANBAnRqIAE2AgAgAiADQQFqIgM2AgwgAUEIaiEBIARBAWsiBA0ACwsgACACKQIENwIAIABBCGogAkEMaigCADYCACACQRBqJAALxQECBX8BfiMAQTBrIgIkACABKAIAQYCAgIB4RgRAIAEoAgwhAyACQQxqIgVBCGoiBkEANgIAIAJCgICAgBA3AgwgAkEYaiIEQQhqIAMoAgAiA0EIaikCADcDACAEQRBqIANBEGopAgA3AwAgAiADKQIANwMYIAVBgPLAACAEEBgaIAJBCGogBigCACIENgIAIAIgAikCDCIHNwMAIAFBCGogBDYCACABIAc3AgALIABB+PTAADYCBCAAIAE2AgAgAkEwaiQAC8cBAQJ/IwBBQGoiAiQAAkAgAQRAIAEoAgAiA0F/Rg0BIAEgA0EBajYCACACQQE2AhggAkG8j8AANgIUIAJCATcCICACQSM2AjAgAiABQQRqNgIsIAIgAkEsajYCHCACQTRqIgMgAkEUahAdIAEgASgCAEEBazYCACACQQhqIANBtIvAABBmIAIoAgghASACIAIoAgw2AgQgAiABNgIAIAIoAgQhASAAIAIoAgA2AgAgACABNgIEIAJBQGskAA8LEPcBAAsQ+AEAC/gCAQV/IwBBIGsiBCQAIARBDGohAgJAIAEtACBFBEAgAkEANgIADAELIAFBADoAIAJAIAEoAgBBAUYEQCABKAIUIAEoAhxrIgMgASgCCEsNAQsgAkEANgIADAELIAFBDGoiBSgCCCIGIAMgASgCBGsiA0kEQCADIAZB2JnAABDkAQALIAVBADYCCCACIAM2AgwgAiAFNgIIIAIgBiADazYCECACIAUoAgQiBTYCACACIAUgA0EEdGo2AgQLIAQoAgwhAwJAAkACQCABLQC8AUUEQCADDQFBASEBQYyrwAAhAgwCC0EBIQFBjKvAACECIANFDQEgBEEMahAxDAELQaWUwQAtAAAaQRRBBBDVASIBRQ0BIAEgBCkCDDcCACABQRBqIARBDGoiAkEQaigCADYCACABQQhqIAJBCGopAgA3AgBB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/////wBLDQAgAkH8////B0sNACABKAIEIQUCfyACRQRAQQQhAUEADAELQaWUwQAtAAAaQQQhAyACQQQQ1QEiAUUNASAECyEDIAIEQCABIAUgAvwKAAALIAAgBDYCCCAAIAE2AgQgACADNgIADwsgAyACQbSawAAQyAEAC4ABAQN/IAAoAgAgACgCCCIDayABSQRAIAAgAyABQQFBARCUASAAKAIIIQMLIAMgACgCBCIFaiEEAkACQCABQQJPBEAgAUEBayIBBEAgBCACIAH8CwALIAEgA2oiAyAFaiEEDAELIAFFDQELIAQgAjoAACADQQFqIQMLIAAgAzYCCAt1AQN/IwBBgAFrIgMkACAALQAAIQRBACEAA0AgACADakH/AGogBEEPcSICQTByIAJBN2ogAkEKSRs6AAAgAEEBayEAIAQiAkEEdiEEIAJBD0sNAAsgAUHrgsEAQQIgACADakGAAWpBACAAaxAUIANBgAFqJAALdgEDfyMAQYABayIDJAAgAC0AACEEQQAhAANAIAAgA2pB/wBqIARBD3EiAkEwciACQdcAaiACQQpJGzoAACAAQQFrIQAgBCICQQR2IQQgAkEPSw0ACyABQeuCwQBBAiAAIANqQYABakEAIABrEBQgA0GAAWokAAuFAQIEfwF+IwBBEGsiAyQAAkAgAQRAIAAoAgQhBCAAKAIAIQIDQCACIARGDQIgACACQRBqIgU2AgAgA0EIaiACQQhqKQIANwMAIAMgAikCACIGNwMAIAanQYCAgIB4Rg0CIANBBEEQEF0gBSECIAFBAWsiAQ0ACwtBACEBCyADQRBqJAAgAQtwAQN/IwBBgAFrIgQkACAAKAIAIQADQCACIARqQf8AaiAAQQ9xIgNBMHIgA0HXAGogA0EKSRs6AAAgAkEBayECIABBD0sgAEEEdiEADQALIAFB64LBAEECIAIgBGpBgAFqQQAgAmsQFCAEQYABaiQAC28BA38jAEGAAWsiBCQAIAAoAgAhAANAIAIgBGpB/wBqIABBD3EiA0EwciADQTdqIANBCkkbOgAAIAJBAWshAiAAQQ9LIABBBHYhAA0ACyABQeuCwQBBAiACIARqQYABakEAIAJrEBQgBEGAAWokAAuHAQECfyMAQSBrIgIkAAJ/IAAoAgBBgICAgHhHBEAgASgCACAAKAIEIAAoAgggASgC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KAIANgIAIAYgBTYCACALQQRqIgtBFEcNAAtBACELA0AgAyALaiIJQSRqIgUoAgAhBiAFIAkoAgA2AgAgCSAGNgIAIAtBBGoiC0EkRw0ACyANQQxqIgkgAygCnAEgAygCoAEiBUEBQQAgA0GyAWoQKCADQQxqIgYQpgEgBkEEQRAQXSADIAlBJPwKAAAgA0HcAGpBACAFEHcLIA1BMGokACADEDwLIAJBAmohAiAPQQJrIg8NAAsLIAcgBDYCDCAHIAw2AgggB0EIakECQQIQXSAHQRBqJAAMIAsCQCACLwECIgRBASAEQQFLG0EBayIEIAIvAQQiBiADKAKgASICIAYbQQFrIgZJIAIgBktxRQRAIAMoAqgBIQQMAQsgAyAGNgKsASADIAQ2AqgBCyADQQA6AMIBIANBADYCaCADIARBACADLQC+ARs2AmwMHwsgA0EBOgBwIANBADsAvQEgA0EAOwG6ASADQQI6ALYBIANBAjoAsgEgA0EAOwGwASADQgA3AqQBIANBgICACDYChAEgA0ECOgCAASADQQI6AHwgA0IANwJ0IAMgAygCoAFBAWs2AqwBDB4LIAMoAqABIAMoAqwBIgRBAWogAygCbCIGIARLGyEEIAMgBiAEIAIvAQIiAkEBIAJBAUsbIANBsgFqECQgA0HcAGogBiAEEHcMHQsgAyADKAJoIAMoAmwiBEEAIAIvAQIiAkEBIAJBAUsbIANBsgFqECkgBCADKAJkIgJPDR0gAygCYCAEakEBOgAADBwLAkACQAJAAkAgAi0AAUEBaw4DAQIDAAsgAyADKAJoIAMoAmxBASADIANBsgFqECkgA0HcAGogAygCbCADKAKgARB3DAILIAMgAygCaCADKAJsQQIgAyADQbIBahApIANB3ABqQQAgAygCbEEBahB3DAELIANBACADKAIcIANBsgFqEEcgA0HcAGpBACADKAKgARB3CwwbCyADIAMoAmggAygCbCIEIAItAAFBBHIgAyADQbIBahApIAQgAygCZCICTw0bIAMoAmAgBGpBAToAAAwaCyADIAItAAE6ALEBDBkLIAMgAi0AAToAsAEMGAsgAygCWEECdCEEIAMoAlQhDyADKAJoIQUDQCAEIgYEQCAGQQRrIQQgDygCACECIA9BBGohDyACIAVNDQELCyADQQA6AMIBIAMgAiADKAKc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AUUEQEEEQQhB4JTBACgCACIAQdAAIAAbEQIAAAsgASACNgIEIAEgAzYCACAAQYj1wAA2AgQgACABNgIAC0kBAX8jAEEQayICJAAgAiAANgIMIAFB5IvAAEECQeaLwABBBiAAQcQBakHEi8AAQeyLwABBCCACQQxqQdSLwAAQRCACQRBqJAALPAECfyAAEPUBIAAoAgwhAiAAKAIQIgAoAgAiAQRAIAIgAREEAAsgACgCBCIBBEAgAiABIAAoAggQ3wELC0QBAX8gASgCACICIAEoAgRHBEAgASACQRBqNgIAIAAgAikCADcCACAAQQhqIAJBCGopAgA3AgAPCyAAQYCAgIB4NgIAC0EBA38gASgCFCICIAEoAhwiA2shBCACIANJBEAgBCACQeSywAAQ4wEACyAAIAM2AgQgACABKAIQIARBBHRqNgIAC0EBA38gASgCFCICIAEoAhwiA2shBCACIANJBEAgBCACQfSywAAQ4wEACyAAIAM2AgQgACABKAIQIARBBHRqNgIAC0IBAX8jAEEgayIDJAAgA0EANgIQIANBATYCBCADQgQ3AgggAyABNgIcIAMgADYCGCADIANBGGo2AgAgAyACELIBAAvSAwEGfyMAQRBrIgQkACAEIAAoAgAiAEEEajYCDCAEQQxqIQUjAEEgayICJAACQCABKAIAIgZBkIHAAEEEIAEoAgQoAgwiBxEBAARAQQEhAwwBCwJAIAEtAApBgAFxRQRAQQEhAyAGQeWCwQBBASAHEQEADQIgACABQfyAwAAoAgARAABFDQEMAgsgBkHmgsEAQQIgBxEBAARAQQEhAwwCC0EBIQMgAkEBOgAPIAJBvILBADYCFCACIAEpAgA3AgAgAiABKQIINwIYIAIgAkEPajYCCCACIAI2AhAgACACQRBqQfyAwAAoAgARAAANASACKAIQQeCCwQBBAiACKAIUKAIMEQEADQELAkAgAS0ACkGAAXFFBEAgASgCAEHbgsEAQQIgASgCBCgCDBEBAA0CIAUgAUGMgcAAKAIAEQAARQ0BDAILIAJBAToADyACQbyCwQA2AhQgAiABKQIANwIAIAIgASkCCDcCGCACIAJBD2o2AgggAiACNgIQIAUgAkEQakGMgcAAKAIAEQAADQEgAigCEEHggsEAQQIgAigCFCgCDBEBAA0BCyABKAIAQd//wABB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C/oBAgJ/AX4jAEEQayICJAAgAkEBOwEMIAIgATYCCCACIAA2AgQjAEEQayIBJAAgAkEEaiIAKQIAIQQgASAANgIMIAEgBDcCBCMAQRBrIgAkACABQQRqIgEoAgAiAigCDCEDAkACQAJAAkAgAigCBA4CAAECCyADDQFBASECQQAhAwwCCyADDQAgAigCACICKAIEIQMgAigCACECDAELIABBgICAgHg2AgAgACABNgIMIABBtPXAACABKAIEIAEoAggiAC0ACCAALQAJEDgACyAAIAM2AgQgACACNgIAIABBmPXAACABKAIEIAEoAggiAC0ACCAALQAJEDgACyUAIABBATYCBCAAIAEoAgQgASgCAGtBBHYiATYCCCAAIAE2AgALJQAgAEUEQEHYmMAAQTIQ9gEACyAAIAIgAyAEIAUgASgCEBEIAAswACABKAIAIAAtAABBAnQiAEG8isAAaigCACAAQbCKwABqKAIAIAEoAgQoAgwRAQALMAAgASgCACAALQAAQQJ0IgBB2JDAAGooAgAgAEGgkMAAaigCACABKAIEKAIMEQEACzAAIAEoAgAgAC0AAEECdCIAQcSUwABqKAIAIABBuJTAAGooAgAgASgCBCgCDBEBAAsjACAARQRAQdiYwABBMhD2AQALIAAgAiADIAQgASgCEBEGAAsjACAARQRAQdiYwABBMhD2AQALIAAgAiADIAQgASgCEBEMAAsjACAARQRAQdiYwABBMhD2AQALIAAgAiADIAQgASgCEBEXAAsjACAARQRAQdiYwABBMhD2AQALIAAgAiADIAQgASgCEBEZAAsjACAARQRAQdiYwABBMhD2AQALIAAgAiADIAQgASgCEBEbAAsgACAAQRBqEDEgACgCAEGAgICAeEcEQCAAQQRBEBBdCwsoAQF/IAAoAgAiAUGAgICAeHJBgICAgHhHBEAgACgCBCABQQEQ3wELCy4AIAEoAgBB6oLAAEHlgsAAIAAoAgAtAAAiABtBB0EFIAAbIAEoAgQoAgwRAQALIQAgAEUEQEHYmMAAQTIQ9gEACyAAIAIgAyABKAIQEQMACyIAIAAtAABFBEAgAUHwhMEAQQUQFw8LIAFB9YTBAEEEEBcLKwAgASgCAEHnh8AAQeCHwAAgAC0AACIAG0EJQQcgABsgASgCBCgCDBEBAAsrACABKAIAQZeI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AAAAIQAAAERpcnR5TGluZXNNYXAga2V5IGlzIG5vdCBhIHN0cmluZyBhbmQgY2Fubm90IGJlIGFuIG9iamVjdCBrZXkvcnVzdGMvMTcwNjdlOWFjNmQ3ZWNiNzBlNTBmOTJjMTk0NGU1NDUxODhkMjM1OS9saWJyYXJ5L2FsbG9jL3NyYy9zbGljZS5ycwDVBBAASgAAAL4BAAAdAAAABgAAAAQAAAAFAAAAVgEQAFwBEABgARAAL2hvbWUvbHVhbm4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi93YXNtLWJpbmRnZW4tMC4yLjkyL3NyYy9jb252ZXJ0L3NsaWNlcy5ycwAASAUQAGoAAAAZAQAAEgAAAAAAAAAMAgAABAAAACQAAAAAAAAABAAAAAQAAAAlAAAAVnRwYXJzZXJ0ZXJtaW5hbCYAAAAEAAAABAAAACcAAABjYWxsZWQgYFJlc3VsdDo6dW53cmFwKClgIG9uIGFuIGBFcnJgIHZhbHVlR3JvdW5kRXNjYXBlRXNjYXBlSW50ZXJtZWRpYXRlQ3NpRW50cnlDc2lQYXJhbUNzaUludGVybWVkaWF0ZUNzaUlnbm9yZURjc0VudHJ5RGNzUGFyYW1EY3NJbnRlcm1lZGlhdGVEY3NQYXNzdGhyb3VnaERjc0lnbm9yZU9zY1N0cmluZ1Nvc1BtQXBjU3RyaW5nAAAAAAAAAQAAAAEAAAAoAAAAAAAAAAACAAAEAAAAKQAAAAAAAAAEAAAABAAAACoAAAAAAAAABAAAAAQAAAArAAAAUGFyc2Vyc3RhdGVwYXJhbXNjdXJfcGFyYW1pbnRlcm1lZGlhdGUAAAAAAAAEAAAABAAAACwAAABFcnJvcmZnc3JjL2xpYi5yc2JnZmFpbnQBYm9sZGl0YWxpY3VuZGVybGluZXN0cmlrZXRocm91Z2hibGlua2ludmVyc2UjAACBBxAAAQAAAAEAAAAAAAAAAQAAAAAAAABDBxAACgAAACMAAAA2AAAAQwcQAAoAAAAoAAAANgAAAAEAAAAAAAAAQwcQAAoAAABNAAAAMQAAAEMHEAAKAAAARQAAACAAAABDBxAACgAAAEMAAAAWAAAAQwcQAAoAAABUAAAALwAAAFNlZ21lbnR0ZXh0cGVub2Zmc2V0d2lkdGgAAAAGAAAABgAAABIAAAAIAAAACAAAAA8AAAAJAAAACAAAAAgAAAAPAAAADgAAAAkAAAAJAAAADgAAAC8GEAA1BhAAOwYQAE0GEABVBhAAXQYQAGwGEAB1BhAAfQYQAIUGEACUBhAAogYQAKsGEAC0BhAAAAAAAAQAAAAEAAAALQAAAAAAAAAEAAAABAAAAA0AAAAAAAAABAAAAAQAAAAuAAAAAAAAAAQAAAAEAAAALwAAAAAAAAAEAAAABAAAADAAAAAAAAAABAAAAAQAAAAxAAAAAAAAAAQAAAAEAAAAHAAAAAAAAAAEAAAAAQAAADIAAAAAAAAAAQAAAAEAAAAzAAAAAAAAAAQAAAAEAAAAAwAAAFBlbmZvcmVncm91bmRiYWNrZ3JvdW5kaW50ZW5zaXR5YXR0cnMAAAA0AAAADAAAAAQAAAA1AAAATGluZWNlbGxzd3JhcHBlZE5vcm1hbEJvbGRGYWludE5vbmUAAAAAAAQAAAAEAAAAHQAAAFNvbWUvaG9tZS9sdWFubi8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL2F2dC0wLjE1LjAvc3JjL2xpbmUucnMAoAkQAFcAAADQAAAAMwAAAKAJEABXAAAA1QAAABwAAACgCRAAVwAAANIAAAAcAAAAoAkQAFcAAADMAAAAHAAAAAYAAAAEAAAABQAAAHgJEAB+CRAAggkQAC9ydXN0Yy8xNzA2N2U5YWM2ZDdlY2I3MGU1MGY5MmMxOTQ0ZTU0NTE4OGQyMzU5L2xpYnJhcnkvc3RkL3NyYy90aHJlYWQvbG9jYWwucnMAUAoQAE8AAAAVAQAAGQAAAC9ydXN0Yy8xNzA2N2U5YWM2ZDdlY2I3MGU1MGY5MmMxOTQ0ZTU0NTE4OGQyMzU5L2xpYnJhcnkvYWxsb2Mvc3JjL3NsaWNlLnJzAACwChAASgAAAL4BAAAdAAAAAAAAAP//////////EAsQAEGolsAAC+EUIGNhbid0IGJlIHJlcHJlc2VudGVkIGFzIGEgSmF2YVNjcmlwdCBudW1iZXIBAAAAAAAAACgLEAAsAAAANwAAAC9ob21lL2x1YW5uLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvc2VyZGUtd2FzbS1iaW5kZ2VuLTAuNi41L3NyYy9saWIucnNoCxAAZAAAADUAAAAOAAAAL2hvbWUvbHVhbm4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi93YXNtLWJpbmRnZW4tMC4yLjkyL3NyYy9jb252ZXJ0L3NsaWNlcy5ycwAA3AsQAGoAAAAZAQAAEgAAAGNsb3N1cmUgaW52b2tlZCByZWN1cnNpdmVseSBvciBhZnRlciBiZWluZyBkcm9wcGVkL3J1c3RjLzE3MDY3ZTlhYzZkN2VjYjcwZTUwZjkyYzE5NDRlNTQ1MTg4ZDIzNTkvbGlicmFyeS9hbGxvYy9zcmMvdmVjL21vZC5ycwAAigwQAEwAAABWCgAAJAAAAC9ydXN0Yy8xNzA2N2U5YWM2ZDdlY2I3MGU1MGY5MmMxOTQ0ZTU0NTE4OGQyMzU5L2xpYnJhcnkvYWxsb2Mvc3JjL3NsaWNlLnJzAADoDBAASgAAAL4BAAAdAAAAL3J1c3RjLzE3MDY3ZTlhYzZkN2VjYjcwZTUwZjkyYzE5NDRlNTQ1MTg4ZDIzNTkvbGlicmFyeS9jb3JlL3NyYy9pdGVyL3RyYWl0cy9pdGVyYXRvci5yc0QNEABYAAAAwQcAAAkAAAAvaG9tZS9sdWFubi8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL2F2dC0wLjE1LjAvc3JjL3BhcnNlci5ycwAAAKwNEABZAAAAxgEAACIAAACsDRAAWQAAANoBAAANAAAArA0QAFkAAADcAQAADQAAAKwNEABZAAAATQIAACYAAACsDRAAWQAAAFICAAAmAAAArA0QAFkAAABYAgAAGAAAAKwNEABZAAAAcAIAABMAAACsDRAAWQAAAHQCAAATAAAArA0QAFkAAAAFAwAAJwAAAKwNEABZAAAACwMAACcAAACsDRAAWQAAABEDAAAnAAAArA0QAFkAAAAXAwAAJwAAAKwNEABZAAAAHQMAACcAAACsDRAAWQAAACMDAAAnAAAArA0QAFkAAAApAwAAJwAAAKwNEABZAAAALwMAACcAAACsDRAAWQAAADUDAAAnAAAArA0QAFkAAAA7AwAAJwAAAKwNEABZAAAAQQMAACcAAACsDRAAWQAAAEcDAAAnAAAArA0QAFkAAABNAwAAJwAAAKwNEABZAAAAUwMAACcAAACsDRAAWQAAAG4DAAArAAAArA0QAFkAAAB7AwAALwAAAKwNEABZAAAAhwMAAC8AAACsDRAAWQAAAIwDAAArAAAArA0QAFkAAACRAwAAJwAAAKwNEABZAAAArQMAACsAAACsDRAAWQAAALoDAAAvAAAArA0QAFkAAADGAwAALwAAAKwNEABZAAAAywMAACsAAACsDRAAWQAAANADAAAnAAAArA0QAFkAAADeAwAAJwAAAKwNEABZAAAA1wMAACcAAACsDRAAWQAAAJgDAAAnAAAArA0QAFkAAABaAwAAJwAAAKwNEABZAAAAYAMAACcAAACsDRAAWQAAAJ8DAAAnAAAArA0QAFkAAABnAwAAJwAAAKwNEABZAAAApgMAACcAAACsDRAAWQAAAOQDAAAnAAAArA0QAFkAAAAOBAAAEwAAAKwNEABZAAAAFwQAABsAAACsDRAAWQAAACAEAAAUAAAAL2hvbWUvbHVhbm4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi91bmljb2RlLXdpZHRoLTAuMS4xNC9zcmMvdGFibGVzLnJzAMgQEABjAAAAkQAAABUAAADIEBAAYwAAAJcAAAAZAAAAYXNzZXJ0aW9uIGZhaWxlZDogbWlkIDw9IHNlbGYubGVuKCkvcnVzdGMvMTcwNjdlOWFjNmQ3ZWNiNzBlNTBmOTJjMTk0NGU1NDUxODhkMjM1OS9saWJyYXJ5L2NvcmUvc3JjL3NsaWNlL21vZC5yc28REABNAAAAvA0AAAkAAABhc3NlcnRpb24gZmFpbGVkOiBrIDw9IHNlbGYubGVuKCkAAABvERAATQAAAOkNAAAJAAAAZiYAAJIlAAAJJAAADCQAAA0kAAAKJAAAsAAAALEAAAAkJAAACyQAABglAAAQJQAADCUAABQlAAA8JQAAuiMAALsjAAAAJQAAvCMAAL0jAAAcJQAAJCUAADQlAAAsJQAAAiUAAGQiAABlIgAAwAMAAGAiAACjAAAAxSIAAGFzc2VydGlvbiBmYWlsZWQ6IG1pZCA8PSBzZWxmLmxlbigpL3J1c3RjLzE3MDY3ZTlhYzZkN2VjYjcwZTUwZjkyYzE5NDRlNTQ1MTg4ZDIzNTkvbGlicmFyeS9jb3JlL3NyYy9zbGljZS9tb2QucnOfEhAATQAAALwNAAAJAAAAYXNzZXJ0aW9uIGZhaWxlZDogayA8PSBzZWxmLmxlbigpAAAAnxIQAE0AAADpDQAACQAAAC9ob21lL2x1YW5uLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvYXZ0LTAuMTUuMC9zcmMvbGluZS5ycwAwExAAVwAAAA4AAAAUAAAAMBMQAFcAAAAUAAAAEwAAADATEABXAAAAGAAAABMAAAAwExAAVwAAABwAAAATAAAAMBMQAFcAAAAdAAAAEwAAADATEABXAAAAIQAAABMAAAAwExAAVwAAACMAAAATAAAAMBMQAFcAAAA4AAAAJQAAADATEABXAAAAYwAAACMAAAAwExAAVwAAAAUAAAARAAAAL3J1c3RjLzE3MDY3ZTlhYzZkN2VjYjcwZTUwZjkyYzE5NDRlNTQ1MTg4ZDIzNTkvbGlicmFyeS9hbGxvYy9zcmMvcmF3X3ZlYy9tb2QucnMoFBAAUAAAAC4CAAARAAAAL3J1c3RjLzE3MDY3ZTlhYzZkN2VjYjcwZTUwZjkyYzE5NDRlNTQ1MTg4ZDIzNTkvbGlicmFyeS9hbGxvYy9zcmMvc3RyaW5nLnJzAIgUEABLAAAAfwUAABoAAACIFBAASwAAAH0FAAAbAAAAL2hvbWUvbHVhbm4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9hdnQtMC4xNS4wL3NyYy90YWJzLnJzAPQUEABXAAAACQAAABIAAAD0FBAAVwAAABEAAAAUAAAA9BQQAFcAAAAXAAAAFAAAAPQUEABXAAAAHwAAABQAQZSrwAALrQkBAAAARAAAAEUAAABGAAAARwAAAEgAAAAUAAAABAAAAEkAAABKAAAASwAAAEwAAAAvaG9tZS9sdWFubi8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL2F2dC0wLjE1LjAvc3JjL3Rlcm1pbmFsLnJzAMQVEABbAAAAeQIAABUAAADEFRAAWwAAAK0CAAAOAAAAxBUQAFsAAADyAwAAIwAAAC9ydXN0Yy8xNzA2N2U5YWM2ZDdlY2I3MGU1MGY5MmMxOTQ0ZTU0NTE4OGQyMzU5L2xpYnJhcnkvY29yZS9zcmMvaXRlci90cmFpdHMvaXRlcmF0b3IucnNQFhAAWAAAAMEHAAAJAAAAL2hvbWUvbHVhbm4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9hdnQtMC4xNS4wL3NyYy90ZXJtaW5hbC9kaXJ0eV9saW5lcy5ycwC4FhAAZwAAAAgAAAAUAAAAuBYQAGcAAAAMAAAADwAAALgWEABnAAAAEAAAAA8AAAAvcnVzdGMvMTcwNjdlOWFjNmQ3ZWNiNzBlNTBmOTJjMTk0NGU1NDUxODhkMjM1OS9saWJyYXJ5L2NvcmUvc3JjL2l0ZXIvdHJhaXRzL2l0ZXJhdG9yLnJzUBcQAFgAAADBBwAACQAAAC9ob21lL2x1YW5uLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvYXZ0LTAuMTUuMC9zcmMvYnVmZmVyLnJzAAAAuBcQAFkAAAAtAAAAGQAAALgXEABZAAAAWgAAAA0AAAC4FxAAWQAAAF4AAAANAAAAuBcQAFkAAABjAAAADQAAALgXEABZAAAAaAAAAB0AAAC4FxAAWQAAAHUAAAAlAAAAuBcQAFkAAAB/AAAAJQAAALgXEABZAAAAhwAAABUAAAC4FxAAWQAAAJEAAAAlAAAAuBcQAFkAAACYAAAAFQAAALgXEABZAAAAnQAAACUAAAC4FxAAWQAAAKgAAAARAAAAuBcQAFkAAACzAAAAIAAAALgXEABZAAAAtwAAABEAAAC4FxAAWQAAALkAAAARAAAAuBcQAFkAAADDAAAADQAAALgXEABZAAAAxwAAABEAAAC4FxAAWQAAAMoAAAANAAAAuBcQAFkAAAD0AAAAKwAAALgXEABZAAAAOQEAACwAAAC4FxAAWQAAADIBAAAbAAAAuBcQAFkAAABFAQAAFAAAALgXEABZAAAAVwEAABgAAAC4FxAAWQAAAFwBAAAYAAAAYXNzZXJ0aW9uIGZhaWxlZDogbGluZXMuaXRlcigpLmFsbCh8bHwgbC5sZW4oKSA9PSBjb2xzKQC4FxAAWQAAAMkBAAAFAAAAL2hvbWUvbHVhbm4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi9hdnQtMC4xNS4wL3NyYy9saW5lLnJzANwZEABXAAAABQAAABEAQYG1wAALhwEBAgMDBAUGBwgJCgsMDQ4DAwMDAwMDDwMDAwMDAwMPCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkQCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkAQYG3wAALnwsBAgICAgMCAgQCBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHQICHgICAgICAgIfICEiIwIkJSYnKCkCKgICAgIrLAICAgItLgICAi8wMTIzAgICAgICNAICNTY3Ajg5Ojs8PT4/OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5QDk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTlBAgJCQwICREVGR0hJAko5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTlLAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICOTk5OUwCAgICAk1OT1ACAgJRAlJTAgICAgICAgICAgICAlRVAgJWAlcCAlhZWltcXV5fYGECYmMCZGVmZwJoAmlqa2wCAm1ub3ACcXICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0dQICAgICAgJ2dzk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5eDk5OTk5OTk5OXl6AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ7OTl8OTl9AgICAgICAgICAgICAgICAgICAn4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/AgICgIGCAgICAgICAgICAgICAgICg4QCAgICAgICAgIChYZ1AgKHAgICiAICAgICAgKJigICAgICAgICAgICAgKLjAKNjgKPkJGSk5SVlgKXAgKYmZqbAgICAgICAgICAjk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OZwdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAJ0CAgICnp8CBAIFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdAgIeAgICAgICAh8gISIjAiQlJicoKQIqAgICAqChoqOkpaYup6ipqqusrTMCAgICAgKuAgI1NjcCODk6Ozw9Pq85OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTlMAgICAgKwTk+xhYZ1AgKHAgICiAICAgICAgKJigICAgICAgICAgICAgKLjLKzjgKPkJGSk5SVlgKXAgKYmZqbAgICAgICAgICAlVVdVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBBvMLAAAspVVVVVRUAUFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQEAQe/CwAALxAEQQRBVVVVVVVdVVVVVVVVVVVVRVVUAAEBU9d1VVVVVVVVVVRUAAAAAAFVVVVX8XVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVBQAUABQEUFVVVVVVVVUVUVVVVVVVVVUAAAAAAABAVVVVVVVVVVVV1VdVVVVVVVVVVVVVVQUAAFRVVVVVVVVVVVVVVVVVFQAAVVVRVVVVVVUFEAAAAQFQVVVVVVVVVVVVVQFVVVVVVf////9/VVVVUFUAAFVVVVVVVVVVVVUFAEHAxMAAC5gEQFVVVVVVVVVVVVVVVVVFVAEAVFEBAFVVBVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVEAVRVUVUVVVUFVVVVVVVVRUFVVVVVVVVVVVVVVVVVVVRBFRRQUVVVVVVVVVVQUVVVQVVVVVVVVVVVVVVVVVVVVAEQVFFVVVVVBVVVVVVVBQBRVVVVVVVVVVVVVVVVVVUEAVRVUVUBVVUFVVVVVVVVVUVVVVVVVVVVVVVVVVVVVUVUVVVRVRVVVVVVVVVVVVVVVFRVVVVVVVVVVVVVVVVVBFQFBFBVQVVVBVVVVVVVVVVRVVVVVVVVVVVVVVVVVVUURAUEUFVBVVUFVVVVVVVVVVBVVVVVVVVVVVVVVVVVFUQBVFVBVRVVVQVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVVVRRUFRFUVVVVVVVVVVVVVVVVVVVVVVVVVVVVRAEBVVRUAQFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVEAAFRVVQBAVVVVVVVVVVVVVVVVVVVVVVVVUFVVVVVVVRFRVVVVVVVVVVVVVVVVVQEAAEAABFUBAAABAAAAAAAAAABUVUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAQQAQUFVVVVVVVVQBVRVVVUBVFVVRUFVUVVVVVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqoAQYDJwAALkANVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQFVVVVVVVVVVVVVVVUFVFVVVVVVVQVVVVVVVVVVBVVVVVVVVVUFVVVVf//99//911931tXXVRAAUFVFAQAAVVdRVVVVVVVVVVVVVRUAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVBVVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAFVRVRVUBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVxUUVVVVVVVVVVVVVVVVVVVFAEBEAQBUFQAAFFVVVVVVVVVVVVVVVQAAAAAAAABAVVVVVVVVVVVVVVVVAFVVVVVVVVVVVVVVVQAAUAVVVVVVVVVVVVUVAABVVVVQVVVVVVVVVQVQEFBVVVVVVVVVVVVVVVVVRVARUFVVVVVVVVVVVVVVVVVVAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAAAAABABUUVVUUFVVVVVVVVVVVVVVVVVVVVVVAEGgzMAAC5MIVVUVAFVVVVVVVQVAVVVVVVVVVVVVVVVVAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAAAAAAAAAAVFVVVVVVVVVVVfVVVVVpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX9V9dVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVfVVVVVVVX1VVVVVVVVVVVVVVVf///1VVVVVVVVVVVVXVVVVVVdVVVVVdVfVVVVVVfVVfVXVVV1VVVVV1VfVddV1VXfVVVVVVVVVVV1VVVVVVVVVVd9XfVVVVVVVVVVVVVVVVVVVV/VVVVVVVVVdVVdVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV1VdVVVVVVVVVVVVVVVVXXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVUFVVVVVVVVVVVVVVVVVVVf3///////////////9fVdVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAAAAAAAAAACqqqqqqqqaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlVVVaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqWlVVVVVVVaqqqqqqqqqqqqqqqqqqCgCqqqpqqaqqqqqqqqqqqqqqqqqqqqqqqqqqaoGqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqVamqqqqqqqqqqqqqqaqqqqqqqqqqqqqqqqiqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqVVWVqqqqqqqqqqqqqqpqqqqqqqqqqqqqqlVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlVVVVVVVVVVVVVVVVVVVVWqqqpWqqqqqqqqqqqqqqqqqmpVVVVVVVVVVVVVVVVVX1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVAAABQVVVVVVVVVQVVVVVVVVVVVVVVVVVVVVVVVVVVVVBVVVVFRRVVVVVVVVVBVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUFVVVVVVVQAAAABQVUUVVVVVVVVVVVVVBQBQVVVVVVUVAABQVVVVqqqqqqqqqlZAVVVVVVVVVVVVVVUVBVBQVVVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVUBQEFBVVUVVVVUVVVVVVVVVVVVVVVUVVVVVVVVVVVVVVVVBBRUBVFVVVVVVVVVVVVVUFVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVRRVVVVVaqqqqqqqqqqqlVVVQAAAAAAQBUAQb/UwAAL4QxVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAAADwqqpaVQAAAACqqqqqqqqqqmqqqqqqaqpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVqaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqVlVVVVVVVVVVVVVVVVVVBVRVVVVVVVVVVVVVVVVVVVWqalVVAABUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQVAVQFBVQBVVVVVVVVVVVVVQBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUFVVVVVVVXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVUVVVVVVVVVVVVVVVVVVVVVVVVVQFVVVVVVVVVVVVVVVVVVVVVVQUAAFRVVVVVVVVVVVVVVQVQVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVVVVVVVVVVVVVVVVVUAAABAVVVVVVVVVVVVVRRUVRVQVVVVVVVVVVVVVVUVQEFVRVVVVVVVVVVVVVVVVVVVVUBVVVVVVVVVVRUAAQBUVVVVVVVVVVVVVVVVVVUVVVVVUFVVVVVVVVVVVVVVVQUAQAVVARRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVQBFVFUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFRUAQFVVVVVVUFVVVVVVVVVVVVVVVVUVRFRVVVVVFVVVVQUAVABUVVVVVVVVVVVVVVVVVVVVVQAABURVVVVVVUVVVVVVVVVVVVVVVVVVVVVVVVVVVRQARBEEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVBVBVEFRVVVVVVVVQVVVVVVVVVVVVVVVVVVVVVVVVVVUVAEARVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVUQAQVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQEFEABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRUAAEFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVFQQRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAAVVVFVVVVVVVVUBAEBVVVVVVVVVVVUVAARAVRVVVQFAAVVVVVVVVVVVVVUAAAAAQFBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAEAAEFVVVVVVVVVVVVVVVVVVVVVVVVVVBQAAAAAABQAEQVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQFARRAAAFVVVVVVVVVVVVVVVVVVVVVVVVARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVRVVUBVVVVVVVVVVVVVVVUFQFVEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQVAAAAUFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAFRVVVVVVVVVVVVVVVVVVQBAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVVUVQFVVVVVVVVVVVVVVVVVVVVVVVVWqVFVVWlVVVaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqWlVVVVVVVVVVVVWqqlZVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqappqqqqqqqqqqpqVVVVZVVVVVVVVVVqWVVVVapVVaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqVVVVVVVVVVVBAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAEGr4cAAC3VQAAAAAABAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVEVAFAAAAAEABAFVVVVVVVVUFUFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQVUVVVVVVVVVVVVVVVVVVUAQa3iwAALAkAVAEG74sAAC8UGVFVRVVVVVFVVVVUVAAEAAABVVVVVVVVVVVVVVVVVVVVVVVVVVQBAAAAAABQAEARAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVUAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAQFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBAVVVVVVVVVVVVVVVVVVVXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdVVVVVVVVVVVVVVVVVVVVV1/f9/VVVVVVVVVVVVVVVVVVVVVVVV9f///////25VVVWqqrqqqqqq6vq/v1WqqlZVX1VVVapaVVVVVVVV//////////9XVVX9/9////////////////////////f//////1VVVf////////////9/1f9VVVX/////V1f//////////////////////3/3/////////////////////////////////////////////////////////////9f///////////////////9fVVXVf////////1VVVVV1VVVVVVVVfVVVVVdVVVVVVVVVVVVVVVVVVVVVVVVVVdX///////////////////////////9VVVVVVVVVVVVVVVX//////////////////////19VV3/9Vf9VVdVXVf//V1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf///1VXVVVVVVVV//////////////9////f/////////////////////////////////////////////////////////////1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX///9X//9XVf//////////////3/9fVfX///9V//9XVf//V1WqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqWlVVVVVVVVVVWZZVYaqlWapVVVVVVZVVVVVVVVVVlVVVAEGO6cAACwEDAEGc6cAAC6kOVVVVVVWVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVAJZqWlpqqgVAplmVZVVVVVVVVVVVAAAAAFVWVVWpVlVVVVVVVVVVVVZVVVVVVVVVVQAAAAAAAAAAVFVVVZVZWVVVZVVVaVVVVVVVVVVVVVVVlVaVaqqqqlWqqlpVVVVZVaqqqlVVVVVlVVVaVVVVVaVlVlVVVZVVVVVVVVWmlpqWWVllqZaqqmZVqlVaWVVaVmVVVVVqqqWlWlVVVaWqWlVVWVlVVVlVVVVVVZVVVVVVVVVVVVVVVVVVVVVVVVVVVWVV9VVVVWlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlWqqqqqqqqqqqpVVVWqqqqqpVpVVZqqWlWlpVVaWqWWpVpVVVWlWlWVVVVVfVVpWaVVX1VmVVVVVVVVVVVmVf///1VVVZqaappVVVXVVVVVVdVVVaVdVfVVVVVVvVWvqrqqq6qqmlW6qvquuq5VXfVVVVVVVVVVV1VVVVVZVVVVd9XfVVVVVVVVVaWqqlVVVVVVVdVXVVVVVVVVVVVVVVVVV61aVVVVVVVVVVVVqqqqqqqqqmqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqoAAADAqqpaVQAAAACqqqqqqqqqqmqqqqqqaqpVVVVVVVVVVVVVVVUFVFVVVVVVVVVVVVVVVVVVVapqVVUAAFRZqqpqVaqqqqqqqqpaqqqqqqqqqqqqqqqqqqpaVaqqqqqqqqq6/v+/qqqqqlZVVVVVVVVVVVVVVVVV9f///////0pzVmFsdWUoKQAAAEA3EAAIAAAASDcQAAEAAAAvaG9tZS9sdWFubi8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3dhc20tYmluZGdlbi0wLjIuOTIvc3JjL2NvbnZlcnQvc2xpY2VzLnJzAABcNxAAagAAAN4AAAABAAAAbnVsbCBwb2ludGVyIHBhc3NlZCB0byBydXN0cmVjdXJzaXZlIHVzZSBvZiBhbiBvYmplY3QgZGV0ZWN0ZWQgd2hpY2ggd291bGQgbGVhZCB0byB1bnNhZmUgYWxpYXNpbmcgaW4gcnVzdC9ydXN0Yy8xNzA2N2U5YWM2ZDdlY2I3MGU1MGY5MmMxOTQ0ZTU0NTE4OGQyMzU5L2xpYnJhcnkvYWxsb2Mvc3JjL3N0cmluZy5ycwAAAEI4EABLAAAAfQUAABsAAAAvcnVzdGMvMTcwNjdlOWFjNmQ3ZWNiNzBlNTBmOTJjMTk0NGU1NDUxODhkMjM1OS9saWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjL21vZC5yc6A4EABQAAAALgIAABEAAABRAAAADAAAAAQAAABSAAAAUwAAAFQAAAAvcnVzdC9kZXBzL2RsbWFsbG9jLTAuMi43L3NyYy9kbG1hbGxvYy5yc2Fzc2VydGlvbiBmYWlsZWQ6IHBzaXplID49IHNpemUgKyBtaW5fb3ZlcmhlYWQAGDkQACkAAACoBAAACQAAAGFzc2VydGlvbiBmYWlsZWQ6IHBzaXplIDw9IHNpemUgKyBtYXhfb3ZlcmhlYWQAABg5EAApAAAArgQAAA0AAABBY2Nlc3NFcnJvcmNhbm5vdCBhY2Nlc3MgYSBUaHJlYWQgTG9jYWwgU3RvcmFnZSB2YWx1ZSBkdXJpbmcgb3IgYWZ0ZXIgZGVzdHJ1Y3Rpb246IADLORAASAAAAG1lbW9yeSBhbGxvY2F0aW9uIG9mICBieXRlcyBmYWlsZWQAABw6EAAVAAAAMToQAA0AAABs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");

          var loadVt = async () => {
                  await __wbg_init(wasm_code);
                  return exports$1;
              };

  class Clock {
    constructor() {
      let speed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1.0;
      this.speed = speed;
      this.startTime = performance.now();
    }
    getTime() {
      return this.speed * (performance.now() - this.startTime) / 1000.0;
    }
    setTime(time) {
      this.startTime = performance.now() - time / this.speed * 1000.0;
    }
  }
  class NullClock {
    constructor() {}
    getTime(_speed) {}
    setTime(_time) {}
  }

  // Efficient array transformations without intermediate array objects.
  // Inspired by Elixir's streams and Rust's iterator adapters.

  class Stream {
    constructor(input, xfs) {
      this.input = typeof input.next === "function" ? input : input[Symbol.iterator]();
      this.xfs = xfs ?? [];
    }
    map(f) {
      return this.transform(Map$1(f));
    }
    flatMap(f) {
      return this.transform(FlatMap(f));
    }
    filter(f) {
      return this.transform(Filter(f));
    }
    take(n) {
      return this.transform(Take(n));
    }
    drop(n) {
      return this.transform(Drop(n));
    }
    transform(f) {
      return new Stream(this.input, this.xfs.concat([f]));
    }
    multiplex(other, comparator) {
      return new Stream(new Multiplexer(this[Symbol.iterator](), other[Symbol.iterator](), comparator));
    }
    toArray() {
      return Array.from(this);
    }
    [Symbol.iterator]() {
      let v = 0;
      let values = [];
      let flushed = false;
      const xf = compose(this.xfs, val => values.push(val));
      return {
        next: () => {
          if (v === values.length) {
            values = [];
            v = 0;
          }
          while (values.length === 0) {
            const next = this.input.next();
            if (next.done) {
              break;
            } else {
              xf.step(next.value);
            }
          }
          if (values.length === 0 && !flushed) {
            xf.flush();
            flushed = true;
          }
          if (values.length > 0) {
            return {
              done: false,
              value: values[v++]
            };
          } else {
            return {
              done: true
            };
          }
        }
      };
    }
  }
  function Map$1(f) {
    return emit => {
      return input => {
        emit(f(input));
      };
    };
  }
  function FlatMap(f) {
    return emit => {
      return input => {
        f(input).forEach(emit);
      };
    };
  }
  function Filter(f) {
    return emit => {
      return input => {
        if (f(input)) {
          emit(input);
        }
      };
    };
  }
  function Take(n) {
    let c = 0;
    return emit => {
      return input => {
        if (c < n) {
          emit(input);
        }
        c += 1;
      };
    };
  }
  function Drop(n) {
    let c = 0;
    return emit => {
      return input => {
        c += 1;
        if (c > n) {
          emit(input);
        }
      };
    };
  }
  function compose(xfs, push) {
    return xfs.reverse().reduce((next, curr) => {
      const xf = toXf(curr(next.step));
      return {
        step: xf.step,
        flush: () => {
          xf.flush();
          next.flush();
        }
      };
    }, toXf(push));
  }
  function toXf(xf) {
    if (typeof xf === "function") {
      return {
        step: xf,
        flush: () => {}
      };
    } else {
      return xf;
    }
  }
  class Multiplexer {
    constructor(left, right, comparator) {
      this.left = left;
      this.right = right;
      this.comparator = comparator;
    }
    [Symbol.iterator]() {
      let leftItem;
      let rightItem;
      return {
        next: () => {
          if (leftItem === undefined && this.left !== undefined) {
            const result = this.left.next();
            if (result.done) {
              this.left = undefined;
            } else {
              leftItem = result.value;
            }
          }
          if (rightItem === undefined && this.right !== undefined) {
            const result = this.right.next();
            if (result.done) {
              this.right = undefined;
            } else {
              rightItem = result.value;
            }
          }
          if (leftItem === undefined && rightItem === undefined) {
            return {
              done: true
            };
          } else if (leftItem === undefined) {
            const value = rightItem;
            rightItem = undefined;
            return {
              done: false,
              value: value
            };
          } else if (rightItem === undefined) {
            const value = leftItem;
            leftItem = undefined;
            return {
              done: false,
              value: value
            };
          } else if (this.comparator(leftItem, rightItem)) {
            const value = leftItem;
            leftItem = undefined;
            return {
              done: false,
              value: value
            };
          } else {
            const value = rightItem;
            rightItem = undefined;
            return {
              done: false,
              value: value
            };
          }
        }
      };
    }
  }

  async function parse$2(data) {
    if (data instanceof Response) {
      const text = await data.text();
      const result = parseJsonl(text);
      if (result !== undefined) {
        const {
          header,
          events
        } = result;
        if (header.version === 2) {
          return parseAsciicastV2(header, events);
        } else if (header.version === 3) {
          return parseAsciicastV3(header, events);
        } else {
          throw `asciicast v${header.version} format not supported`;
        }
      } else {
        const header = JSON.parse(text);
        if (header.version === 1) {
          return parseAsciicastV1(header);
        }
      }
    } else if (typeof data === "object" && data.version === 1) {
      return parseAsciicastV1(data);
    } else if (Array.isArray(data)) {
      const header = data[0];
      if (header.version === 2) {
        const events = data.slice(1, data.length);
        return parseAsciicastV2(header, events);
      } else if (header.version === 3) {
        const events = data.slice(1, data.length);
        return parseAsciicastV3(header, events);
      } else {
        throw `asciicast v${header.version} format not supported`;
      }
    }
    throw "invalid data";
  }
  function parseJsonl(jsonl) {
    const lines = jsonl.split("\n");
    let header;
    try {
      header = JSON.parse(lines[0]);
    } catch (_error) {
      return;
    }
    const events = new Stream(lines).drop(1).filter(l => l[0] === "[").map(JSON.parse);
    return {
      header,
      events
    };
  }
  function parseAsciicastV1(data) {
    let time = 0;
    const events = new Stream(data.stdout).map(e => {
      time += e[0];
      return [time, "o", e[1]];
    });
    return {
      cols: data.width,
      rows: data.height,
      events
    };
  }
  function parseAsciicastV2(header, events) {
    return {
      cols: header.width,
      rows: header.height,
      theme: parseTheme$1(header.theme),
      events,
      idleTimeLimit: header.idle_time_limit
    };
  }
  function parseAsciicastV3(header, events) {
    if (!(events instanceof Stream)) {
      events = new Stream(events);
    }
    let time = 0;
    events = events.map(e => {
      time += e[0];
      return [time, e[1], e[2]];
    });
    return {
      cols: header.term.cols,
      rows: header.term.rows,
      theme: parseTheme$1(header.term?.theme),
      events,
      idleTimeLimit: header.idle_time_limit
    };
  }
  function parseTheme$1(theme) {
    if (theme === undefined) return;
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    const paletteRegex = /^(#[0-9A-Fa-f]{6}:){7,}#[0-9A-Fa-f]{6}$/;
    const fg = theme?.fg;
    const bg = theme?.bg;
    const palette = theme?.palette;
    if (colorRegex.test(fg) && colorRegex.test(bg) && paletteRegex.test(palette)) {
      return {
        foreground: fg,
        background: bg,
        palette: palette.split(":")
      };
    }
  }
  function unparseAsciicastV2(recording) {
    const header = JSON.stringify({
      version: 2,
      width: recording.cols,
      height: recording.rows
    });
    const events = recording.events.map(JSON.stringify).join("\n");
    return `${header}\n${events}\n`;
  }

  function recording(src, _ref, _ref2) {
    let {
      feed,
      resize,
      onInput,
      onMarker,
      now,
      setTimeout,
      setState,
      logger
    } = _ref;
    let {
      idleTimeLimit,
      startAt,
      loop,
      posterTime,
      markers: markers_,
      pauseOnMarkers,
      cols: initialCols,
      rows: initialRows
    } = _ref2;
    let cols;
    let rows;
    let events;
    let markers;
    let duration;
    let effectiveStartAt;
    let eventTimeoutId;
    let nextEventIndex = 0;
    let lastEventTime = 0;
    let startTime;
    let pauseElapsedTime;
    let playCount = 0;
    async function init() {
      const {
        parser,
        minFrameTime,
        inputOffset,
        dumpFilename,
        encoding = "utf-8"
      } = src;
      const recording = prepare(await parser(await doFetch(src), {
        encoding
      }), logger, {
        idleTimeLimit,
        startAt,
        minFrameTime,
        inputOffset,
        markers_
      });
      ({
        cols,
        rows,
        events,
        duration,
        effectiveStartAt
      } = recording);
      initialCols = initialCols ?? cols;
      initialRows = initialRows ?? rows;
      if (events.length === 0) {
        throw "recording is missing events";
      }
      if (dumpFilename !== undefined) {
        dump(recording, dumpFilename);
      }
      const poster = posterTime !== undefined ? getPoster(posterTime) : undefined;
      markers = events.filter(e => e[1] === "m").map(e => [e[0], e[2].label]);
      return {
        cols,
        rows,
        duration,
        theme: recording.theme,
        poster,
        markers
      };
    }
    function doFetch(_ref3) {
      let {
        url,
        data,
        fetchOpts = {}
      } = _ref3;
      if (typeof url === "string") {
        return doFetchOne(url, fetchOpts);
      } else if (Array.isArray(url)) {
        return Promise.all(url.map(url => doFetchOne(url, fetchOpts)));
      } else if (data !== undefined) {
        if (typeof data === "function") {
          data = data();
        }
        if (!(data instanceof Promise)) {
          data = Promise.resolve(data);
        }
        return data.then(value => {
          if (typeof value === "string" || value instanceof ArrayBuffer) {
            return new Response(value);
          } else {
            return value;
          }
        });
      } else {
        throw "failed fetching recording file: url/data missing in src";
      }
    }
    async function doFetchOne(url, fetchOpts) {
      const response = await fetch(url, fetchOpts);
      if (!response.ok) {
        throw `failed fetching recording from ${url}: ${response.status} ${response.statusText}`;
      }
      return response;
    }
    function delay(targetTime) {
      let delay = targetTime * 1000 - (now() - startTime);
      if (delay < 0) {
        delay = 0;
      }
      return delay;
    }
    function scheduleNextEvent() {
      const nextEvent = events[nextEventIndex];
      if (nextEvent) {
        eventTimeoutId = setTimeout(runNextEvent, delay(nextEvent[0]));
      } else {
        onEnd();
      }
    }
    function runNextEvent() {
      let event = events[nextEventIndex];
      let elapsedWallTime;
      do {
        lastEventTime = event[0];
        nextEventIndex++;
        const stop = executeEvent(event);
        if (stop) {
          return;
        }
        event = events[nextEventIndex];
        elapsedWallTime = now() - startTime;
      } while (event && elapsedWallTime > event[0] * 1000);
      scheduleNextEvent();
    }
    function cancelNextEvent() {
      clearTimeout(eventTimeoutId);
      eventTimeoutId = null;
    }
    function executeEvent(event) {
      const [time, type, data] = event;
      if (type === "o") {
        feed(data);
      } else if (type === "i") {
        onInput(data);
      } else if (type === "r") {
        const [cols, rows] = data.split("x");
        resize(cols, rows);
      } else if (type === "m") {
        onMarker(data);
        if (pauseOnMarkers) {
          pause();
          pauseElapsedTime = time * 1000;
          setState("idle", {
            reason: "paused"
          });
          return true;
        }
      }
      return false;
    }
    function onEnd() {
      cancelNextEvent();
      playCount++;
      if (loop === true || typeof loop === "number" && playCount < loop) {
        nextEventIndex = 0;
        startTime = now();
        feed("\x1bc"); // reset terminal
        resizeTerminalToInitialSize();
        scheduleNextEvent();
      } else {
        pauseElapsedTime = duration * 1000;
        setState("ended");
      }
    }
    function play() {
      if (eventTimeoutId) throw "already playing";
      if (events[nextEventIndex] === undefined) throw "already ended";
      if (effectiveStartAt !== null) {
        seek(effectiveStartAt);
      }
      resume();
      return true;
    }
    function pause() {
      if (!eventTimeoutId) return true;
      cancelNextEvent();
      pauseElapsedTime = now() - startTime;
      return true;
    }
    function resume() {
      startTime = now() - pauseElapsedTime;
      pauseElapsedTime = null;
      scheduleNextEvent();
    }
    function seek(where) {
      const isPlaying = !!eventTimeoutId;
      pause();
      const currentTime = (pauseElapsedTime ?? 0) / 1000;
      if (typeof where === "string") {
        if (where === "<<") {
          where = currentTime - 5;
        } else if (where === ">>") {
          where = currentTime + 5;
        } else if (where === "<<<") {
          where = currentTime - 0.1 * duration;
        } else if (where === ">>>") {
          where = currentTime + 0.1 * duration;
        } else if (where[where.length - 1] === "%") {
          where = parseFloat(where.substring(0, where.length - 1)) / 100 * duration;
        }
      } else if (typeof where === "object") {
        if (where.marker === "prev") {
          where = findMarkerTimeBefore(currentTime) ?? 0;
          if (isPlaying && currentTime - where < 1) {
            where = findMarkerTimeBefore(where) ?? 0;
          }
        } else if (where.marker === "next") {
          where = findMarkerTimeAfter(currentTime) ?? duration;
        } else if (typeof where.marker === "number") {
          const marker = markers[where.marker];
          if (marker === undefined) {
            throw `invalid marker index: ${where.marker}`;
          } else {
            where = marker[0];
          }
        }
      }
      const targetTime = Math.min(Math.max(where, 0), duration);
      if (targetTime < lastEventTime) {
        feed("\x1bc"); // reset terminal
        resizeTerminalToInitialSize();
        nextEventIndex = 0;
        lastEventTime = 0;
      }
      let event = events[nextEventIndex];
      while (event && event[0] <= targetTime) {
        if (event[1] === "o" || event[1] === "r") {
          executeEvent(event);
        }
        lastEventTime = event[0];
        event = events[++nextEventIndex];
      }
      pauseElapsedTime = targetTime * 1000;
      effectiveStartAt = null;
      if (isPlaying) {
        resume();
      }
      return true;
    }
    function findMarkerTimeBefore(time) {
      if (markers.length == 0) return;
      let i = 0;
      let marker = markers[i];
      let lastMarkerTimeBefore;
      while (marker && marker[0] < time) {
        lastMarkerTimeBefore = marker[0];
        marker = markers[++i];
      }
      return lastMarkerTimeBefore;
    }
    function findMarkerTimeAfter(time) {
      if (markers.length == 0) return;
      let i = markers.length - 1;
      let marker = markers[i];
      let firstMarkerTimeAfter;
      while (marker && marker[0] > time) {
        firstMarkerTimeAfter = marker[0];
        marker = markers[--i];
      }
      return firstMarkerTimeAfter;
    }
    function step(n) {
      if (n === undefined) {
        n = 1;
      }
      let nextEvent;
      let targetIndex;
      if (n > 0) {
        let index = nextEventIndex;
        nextEvent = events[index];
        for (let i = 0; i < n; i++) {
          while (nextEvent !== undefined && nextEvent[1] !== "o") {
            nextEvent = events[++index];
          }
          if (nextEvent !== undefined && nextEvent[1] === "o") {
            targetIndex = index;
          }
        }
      } else {
        let index = Math.max(nextEventIndex - 2, 0);
        nextEvent = events[index];
        for (let i = n; i < 0; i++) {
          while (nextEvent !== undefined && nextEvent[1] !== "o") {
            nextEvent = events[--index];
          }
          if (nextEvent !== undefined && nextEvent[1] === "o") {
            targetIndex = index;
          }
        }
        if (targetIndex !== undefined) {
          feed("\x1bc"); // reset terminal
          resizeTerminalToInitialSize();
          nextEventIndex = 0;
        }
      }
      if (targetIndex === undefined) return;
      while (nextEventIndex <= targetIndex) {
        nextEvent = events[nextEventIndex++];
        if (nextEvent[1] === "o" || nextEvent[1] === "r") {
          executeEvent(nextEvent);
        }
      }
      lastEventTime = nextEvent[0];
      pauseElapsedTime = lastEventTime * 1000;
      effectiveStartAt = null;
      if (events[targetIndex + 1] === undefined) {
        onEnd();
      }
    }
    function restart() {
      if (eventTimeoutId) throw "still playing";
      if (events[nextEventIndex] !== undefined) throw "not ended";
      seek(0);
      resume();
      return true;
    }
    function getPoster(time) {
      return events.filter(e => e[0] < time && e[1] === "o").map(e => e[2]);
    }
    function getCurrentTime() {
      if (eventTimeoutId) {
        return (now() - startTime) / 1000;
      } else {
        return (pauseElapsedTime ?? 0) / 1000;
      }
    }
    function resizeTerminalToInitialSize() {
      resize(initialCols, initialRows);
    }
    return {
      init,
      play,
      pause,
      seek,
      step,
      restart,
      stop: pause,
      getCurrentTime
    };
  }
  function batcher(logger) {
    let minFrameTime = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1.0 / 60;
    let prevEvent;
    return emit => {
      let ic = 0;
      let oc = 0;
      return {
        step: event => {
          ic++;
          if (prevEvent === undefined) {
            prevEvent = event;
            return;
          }
          if (event[1] === "o" && prevEvent[1] === "o" && event[0] - prevEvent[0] < minFrameTime) {
            prevEvent[2] += event[2];
          } else {
            emit(prevEvent);
            prevEvent = event;
            oc++;
          }
        },
        flush: () => {
          if (prevEvent !== undefined) {
            emit(prevEvent);
            oc++;
          }
          logger.debug(`batched ${ic} frames to ${oc} frames`);
        }
      };
    };
  }
  function prepare(recording, logger, _ref4) {
    let {
      startAt = 0,
      idleTimeLimit,
      minFrameTime,
      inputOffset,
      markers_
    } = _ref4;
    let {
      events
    } = recording;
    if (!(events instanceof Stream)) {
      events = new Stream(events);
    }
    idleTimeLimit = idleTimeLimit ?? recording.idleTimeLimit ?? Infinity;
    const limiterOutput = {
      offset: 0
    };
    events = events.transform(batcher(logger, minFrameTime)).map(timeLimiter(idleTimeLimit, startAt, limiterOutput)).map(markerWrapper());
    if (markers_ !== undefined) {
      markers_ = new Stream(markers_).map(normalizeMarker);
      events = events.filter(e => e[1] !== "m").multiplex(markers_, (a, b) => a[0] < b[0]).map(markerWrapper());
    }
    events = events.toArray();
    if (inputOffset !== undefined) {
      events = events.map(e => e[1] === "i" ? [e[0] + inputOffset, e[1], e[2]] : e);
      events.sort((a, b) => a[0] - b[0]);
    }
    const duration = events[events.length - 1][0];
    const effectiveStartAt = startAt - limiterOutput.offset;
    return {
      ...recording,
      events,
      duration,
      effectiveStartAt
    };
  }
  function normalizeMarker(m) {
    return typeof m === "number" ? [m, "m", ""] : [m[0], "m", m[1]];
  }
  function timeLimiter(idleTimeLimit, startAt, output) {
    let prevT = 0;
    let shift = 0;
    return function (e) {
      const delay = e[0] - prevT;
      const delta = delay - idleTimeLimit;
      prevT = e[0];
      if (delta > 0) {
        shift += delta;
        if (e[0] < startAt) {
          output.offset += delta;
        }
      }
      return [e[0] - shift, e[1], e[2]];
    };
  }
  function markerWrapper() {
    let i = 0;
    return function (e) {
      if (e[1] === "m") {
        return [e[0], e[1], {
          index: i++,
          time: e[0],
          label: e[2]
        }];
      } else {
        return e;
      }
    };
  }
  function dump(recording, filename) {
    const link = document.createElement("a");
    const events = recording.events.map(e => e[1] === "m" ? [e[0], e[1], e[2].label] : e);
    const asciicast = unparseAsciicastV2({
      ...recording,
      events
    });
    link.href = URL.createObjectURL(new Blob([asciicast], {
      type: "text/plain"
    }));
    link.download = filename;
    link.click();
  }

  function clock(_ref, _ref2, _ref3) {
    let {
      hourColor = 3,
      minuteColor = 4,
      separatorColor = 9
    } = _ref;
    let {
      feed
    } = _ref2;
    let {
      cols = 5,
      rows = 1
    } = _ref3;
    const middleRow = Math.floor(rows / 2);
    const leftPad = Math.floor(cols / 2) - 2;
    const setupCursor = `\x1b[?25l\x1b[1m\x1b[${middleRow}B`;
    let intervalId;
    const getCurrentTime = () => {
      const d = new Date();
      const h = d.getHours();
      const m = d.getMinutes();
      const seqs = [];
      seqs.push("\r");
      for (let i = 0; i < leftPad; i++) {
        seqs.push(" ");
      }
      seqs.push(`\x1b[3${hourColor}m`);
      if (h < 10) {
        seqs.push("0");
      }
      seqs.push(`${h}`);
      seqs.push(`\x1b[3${separatorColor};5m:\x1b[25m`);
      seqs.push(`\x1b[3${minuteColor}m`);
      if (m < 10) {
        seqs.push("0");
      }
      seqs.push(`${m}`);
      return seqs;
    };
    const updateTime = () => {
      getCurrentTime().forEach(feed);
    };
    return {
      init: () => {
        const duration = 24 * 60;
        const poster = [setupCursor].concat(getCurrentTime());
        return {
          cols,
          rows,
          duration,
          poster
        };
      },
      play: () => {
        feed(setupCursor);
        updateTime();
        intervalId = setInterval(updateTime, 1000);
        return true;
      },
      stop: () => {
        clearInterval(intervalId);
      },
      getCurrentTime: () => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
      }
    };
  }

  function random(src, _ref) {
    let {
      feed,
      setTimeout
    } = _ref;
    const base = " ".charCodeAt(0);
    const range = "~".charCodeAt(0) - base;
    let timeoutId;
    const schedule = () => {
      const t = Math.pow(5, Math.random() * 4);
      timeoutId = setTimeout(print, t);
    };
    const print = () => {
      schedule();
      const char = String.fromCharCode(base + Math.floor(Math.random() * range));
      feed(char);
    };
    return () => {
      schedule();
      return () => clearInterval(timeoutId);
    };
  }

  function benchmark(_ref, _ref2) {
    let {
      url,
      iterations = 10
    } = _ref;
    let {
      feed,
      setState,
      now
    } = _ref2;
    let data;
    let byteCount = 0;
    return {
      async init() {
        const recording = await parse$2(await fetch(url));
        const {
          cols,
          rows,
          events
        } = recording;
        data = Array.from(events).filter(_ref3 => {
          let [_time, type, _text] = _ref3;
          return type === "o";
        }).map(_ref4 => {
          let [time, _type, text] = _ref4;
          return [time, text];
        });
        const duration = data[data.length - 1][0];
        for (const [_, text] of data) {
          byteCount += new Blob([text]).size;
        }
        return {
          cols,
          rows,
          duration
        };
      },
      play() {
        const startTime = now();
        for (let i = 0; i < iterations; i++) {
          for (const [_, text] of data) {
            feed(text);
          }
          feed("\x1bc"); // reset terminal
        }

        const endTime = now();
        const duration = (endTime - startTime) / 1000;
        const throughput = byteCount * iterations / duration;
        const throughputMbs = byteCount / (1024 * 1024) * iterations / duration;
        console.info("benchmark: result", {
          byteCount,
          iterations,
          duration,
          throughput,
          throughputMbs
        });
        setTimeout(() => {
          setState("stopped", {
            reason: "ended"
          });
        }, 0);
        return true;
      }
    };
  }

  class Queue {
    constructor() {
      this.items = [];
      this.onPush = undefined;
    }
    push(item) {
      this.items.push(item);
      if (this.onPush !== undefined) {
        this.onPush(this.popAll());
        this.onPush = undefined;
      }
    }
    popAll() {
      if (this.items.length > 0) {
        const items = this.items;
        this.items = [];
        return items;
      } else {
        const thiz = this;
        return new Promise(resolve => {
          thiz.onPush = resolve;
        });
      }
    }
  }

  function getBuffer(bufferTime, feed, resize, onInput, onMarker, setTime, baseStreamTime, minFrameTime, logger) {
    const execute = executeEvent(feed, resize, onInput, onMarker);
    if (bufferTime === 0) {
      logger.debug("using no buffer");
      return nullBuffer(execute);
    } else {
      bufferTime = bufferTime ?? {};
      let getBufferTime;
      if (typeof bufferTime === "number") {
        logger.debug(`using fixed time buffer (${bufferTime} ms)`);
        getBufferTime = _latency => bufferTime;
      } else if (typeof bufferTime === "function") {
        logger.debug("using custom dynamic buffer");
        getBufferTime = bufferTime({
          logger
        });
      } else {
        logger.debug("using adaptive buffer", bufferTime);
        getBufferTime = adaptiveBufferTimeProvider({
          logger
        }, bufferTime);
      }
      return buffer(getBufferTime, execute, setTime, logger, baseStreamTime ?? 0.0, minFrameTime);
    }
  }
  function nullBuffer(execute) {
    return {
      pushEvent(event) {
        execute(event[1], event[2]);
      },
      pushText(text) {
        execute("o", text);
      },
      stop() {}
    };
  }
  function executeEvent(feed, resize, onInput, onMarker) {
    return function (code, data) {
      if (code === "o") {
        feed(data);
      } else if (code === "i") {
        onInput(data);
      } else if (code === "r") {
        resize(data.cols, data.rows);
      } else if (code === "m") {
        onMarker(data);
      }
    };
  }
  function buffer(getBufferTime, execute, setTime, logger, baseStreamTime) {
    let minFrameTime = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1.0 / 60;
    let epoch = performance.now() - baseStreamTime * 1000;
    let bufferTime = getBufferTime(0);
    const queue = new Queue();
    minFrameTime *= 1000;
    let prevElapsedStreamTime = -minFrameTime;
    let stop = false;
    function elapsedWallTime() {
      return performance.now() - epoch;
    }
    setTimeout(async () => {
      while (!stop) {
        const events = await queue.popAll();
        if (stop) return;
        for (const event of events) {
          const elapsedStreamTime = event[0] * 1000 + bufferTime;
          if (elapsedStreamTime - prevElapsedStreamTime < minFrameTime) {
            execute(event[1], event[2]);
            continue;
          }
          const delay = elapsedStreamTime - elapsedWallTime();
          if (delay > 0) {
            await sleep(delay);
            if (stop) return;
          }
          setTime(event[0]);
          execute(event[1], event[2]);
          prevElapsedStreamTime = elapsedStreamTime;
        }
      }
    }, 0);
    return {
      pushEvent(event) {
        let latency = elapsedWallTime() - event[0] * 1000;
        if (latency < 0) {
          logger.debug(`correcting epoch by ${latency} ms`);
          epoch += latency;
          latency = 0;
        }
        bufferTime = getBufferTime(latency);
        queue.push(event);
      },
      pushText(text) {
        queue.push([elapsedWallTime() / 1000, "o", text]);
      },
      stop() {
        stop = true;
        queue.push(undefined);
      }
    };
  }
  function sleep(t) {
    return new Promise(resolve => {
      setTimeout(resolve, t);
    });
  }
  function adaptiveBufferTimeProvider(_ref, _ref2) {
    let {
      logger
    } = _ref;
    let {
      minTime = 25,
      maxLevel = 100,
      interval = 50,
      windowSize = 20,
      smoothingFactor = 0.2,
      minImprovementDuration = 1000
    } = _ref2;
    let bufferLevel = 0;
    let bufferTime = calcBufferTime(bufferLevel);
    let latencies = [];
    let maxJitter = 0;
    let jitterRange = 0;
    let improvementTs = null;
    function calcBufferTime(level) {
      if (level === 0) {
        return minTime;
      } else {
        return interval * level;
      }
    }
    return latency => {
      latencies.push(latency);
      if (latencies.length < windowSize) {
        return bufferTime;
      }
      latencies = latencies.slice(-windowSize);
      const currentMinJitter = min(latencies);
      const currentMaxJitter = max(latencies);
      const currentJitterRange = currentMaxJitter - currentMinJitter;
      maxJitter = currentMaxJitter * smoothingFactor + maxJitter * (1 - smoothingFactor);
      jitterRange = currentJitterRange * smoothingFactor + jitterRange * (1 - smoothingFactor);
      const minBufferTime = maxJitter + jitterRange;
      if (latency > bufferTime) {
        logger.debug('buffer underrun', {
          latency,
          maxJitter,
          jitterRange,
          bufferTime
        });
      }
      if (bufferLevel < maxLevel && minBufferTime > bufferTime) {
        bufferTime = calcBufferTime(bufferLevel += 1);
        logger.debug(`jitter increased, raising bufferTime`, {
          latency,
          maxJitter,
          jitterRange,
          bufferTime
        });
      } else if (bufferLevel > 1 && minBufferTime < calcBufferTime(bufferLevel - 2) || bufferLevel == 1 && minBufferTime < calcBufferTime(bufferLevel - 1)) {
        if (improvementTs === null) {
          improvementTs = performance.now();
        } else if (performance.now() - improvementTs > minImprovementDuration) {
          improvementTs = performance.now();
          bufferTime = calcBufferTime(bufferLevel -= 1);
          logger.debug(`jitter decreased, lowering bufferTime`, {
            latency,
            maxJitter,
            jitterRange,
            bufferTime
          });
        }
        return bufferTime;
      }
      improvementTs = null;
      return bufferTime;
    };
  }
  function min(numbers) {
    return numbers.reduce((prev, cur) => cur < prev ? cur : prev);
  }
  function max(numbers) {
    return numbers.reduce((prev, cur) => cur > prev ? cur : prev);
  }

  const ONE_SEC_IN_USEC = 1000000;
  function alisHandler(logger) {
    const outputDecoder = new TextDecoder();
    const inputDecoder = new TextDecoder();
    let handler = parseMagicString;
    let lastEventTime;
    let markerIndex = 0;
    function parseMagicString(buffer) {
      const text = new TextDecoder().decode(buffer);
      if (text === "ALiS\x01") {
        handler = parseFirstFrame;
      } else {
        throw "not an ALiS v1 live stream";
      }
    }
    function parseFirstFrame(buffer) {
      const view = new BinaryReader(new DataView(buffer));
      const type = view.getUint8();
      if (type !== 0x01) throw `expected reset (0x01) frame, got ${type}`;
      return parseResetFrame(view, buffer);
    }
    function parseResetFrame(view, buffer) {
      view.decodeVarUint();
      let time = view.decodeVarUint();
      lastEventTime = time;
      time = time / ONE_SEC_IN_USEC;
      markerIndex = 0;
      const cols = view.decodeVarUint();
      const rows = view.decodeVarUint();
      const themeFormat = view.getUint8();
      let theme;
      if (themeFormat === 8) {
        const len = (2 + 8) * 3;
        theme = parseTheme(new Uint8Array(buffer, view.offset, len));
        view.forward(len);
      } else if (themeFormat === 16) {
        const len = (2 + 16) * 3;
        theme = parseTheme(new Uint8Array(buffer, view.offset, len));
        view.forward(len);
      } else if (themeFormat !== 0) {
        throw `alis: invalid theme format (${themeFormat})`;
      }
      const initLen = view.decodeVarUint();
      let init;
      if (initLen > 0) {
        init = outputDecoder.decode(new Uint8Array(buffer, view.offset, initLen));
      }
      handler = parseFrame;
      return {
        time,
        term: {
          size: {
            cols,
            rows
          },
          theme,
          init
        }
      };
    }
    function parseFrame(buffer) {
      const view = new BinaryReader(new DataView(buffer));
      const type = view.getUint8();
      if (type === 0x01) {
        return parseResetFrame(view, buffer);
      } else if (type === 0x6f) {
        return parseOutputFrame(view, buffer);
      } else if (type === 0x69) {
        return parseInputFrame(view, buffer);
      } else if (type === 0x72) {
        return parseResizeFrame(view);
      } else if (type === 0x6d) {
        return parseMarkerFrame(view, buffer);
      } else if (type === 0x04) {
        // EOT
        handler = parseFirstFrame;
        return false;
      } else {
        logger.debug(`alis: unknown frame type: ${type}`);
      }
    }
    function parseOutputFrame(view, buffer) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const len = view.decodeVarUint();
      const text = outputDecoder.decode(new Uint8Array(buffer, view.offset, len));
      return [lastEventTime / ONE_SEC_IN_USEC, "o", text];
    }
    function parseInputFrame(view, buffer) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const len = view.decodeVarUint();
      const text = inputDecoder.decode(new Uint8Array(buffer, view.offset, len));
      return [lastEventTime / ONE_SEC_IN_USEC, "i", text];
    }
    function parseResizeFrame(view) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const cols = view.decodeVarUint();
      const rows = view.decodeVarUint();
      return [lastEventTime / ONE_SEC_IN_USEC, "r", {
        cols,
        rows
      }];
    }
    function parseMarkerFrame(view, buffer) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const len = view.decodeVarUint();
      const decoder = new TextDecoder();
      const index = markerIndex++;
      const time = lastEventTime / ONE_SEC_IN_USEC;
      const label = decoder.decode(new Uint8Array(buffer, view.offset, len));
      return [time, "m", {
        index,
        time,
        label
      }];
    }
    return function (buffer) {
      return handler(buffer);
    };
  }
  function parseTheme(arr) {
    const colorCount = arr.length / 3;
    const foreground = hexColor(arr[0], arr[1], arr[2]);
    const background = hexColor(arr[3], arr[4], arr[5]);
    const palette = [];
    for (let i = 2; i < colorCount; i++) {
      palette.push(hexColor(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]));
    }
    return {
      foreground,
      background,
      palette
    };
  }
  function hexColor(r, g, b) {
    return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
  }
  function byteToHex(value) {
    return value.toString(16).padStart(2, "0");
  }
  class BinaryReader {
    constructor(inner) {
      let offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      this.inner = inner;
      this.offset = offset;
    }
    forward(delta) {
      this.offset += delta;
    }
    getUint8() {
      const value = this.inner.getUint8(this.offset);
      this.offset += 1;
      return value;
    }
    decodeVarUint() {
      let number = BigInt(0);
      let shift = BigInt(0);
      let byte = this.getUint8();
      while (byte > 127) {
        byte &= 127;
        number += BigInt(byte) << shift;
        shift += BigInt(7);
        byte = this.getUint8();
      }
      number = number + (BigInt(byte) << shift);
      return Number(number);
    }
  }

  function jsonHandler() {
    let parse = parseHeader;
    function parseHeader(buffer) {
      const header = JSON.parse(buffer);
      if (header.version !== 2) {
        throw "not an asciicast v2 stream";
      }
      parse = parseEvent;
      return {
        time: 0.0,
        term: {
          size: {
            cols: header.width,
            rows: header.height
          }
        }
      };
    }
    function parseEvent(buffer) {
      const event = JSON.parse(buffer);
      if (event[1] === "r") {
        const [cols, rows] = event[2].split("x");
        return [event[0], "r", {
          cols,
          rows
        }];
      } else {
        return event;
      }
    }
    return function (buffer) {
      return parse(buffer);
    };
  }

  function rawHandler() {
    const outputDecoder = new TextDecoder();
    let parse = parseSize;
    function parseSize(buffer) {
      const text = outputDecoder.decode(buffer, {
        stream: true
      });
      const [cols, rows] = sizeFromResizeSeq(text) ?? sizeFromScriptStartMessage(text) ?? [80, 24];
      parse = parseOutput;
      return {
        time: 0.0,
        term: {
          size: {
            cols,
            rows
          },
          init: text
        }
      };
    }
    function parseOutput(buffer) {
      return outputDecoder.decode(buffer, {
        stream: true
      });
    }
    return function (buffer) {
      return parse(buffer);
    };
  }
  function sizeFromResizeSeq(text) {
    const match = text.match(/\x1b\[8;(\d+);(\d+)t/);
    if (match !== null) {
      return [parseInt(match[2], 10), parseInt(match[1], 10)];
    }
  }
  function sizeFromScriptStartMessage(text) {
    const match = text.match(/\[.*COLUMNS="(\d{1,3})" LINES="(\d{1,3})".*\]/);
    if (match !== null) {
      return [parseInt(match[1], 10), parseInt(match[2], 10)];
    }
  }

  function exponentialDelay(attempt) {
    return Math.min(500 * Math.pow(2, attempt), 5000);
  }
  function websocket(_ref, _ref2) {
    let {
      url,
      bufferTime,
      reconnectDelay = exponentialDelay,
      minFrameTime
    } = _ref;
    let {
      feed,
      reset,
      resize,
      onInput,
      onMarker,
      setState,
      logger
    } = _ref2;
    logger = new PrefixedLogger(logger, "websocket: ");
    let socket;
    let buf;
    let clock = new NullClock();
    let reconnectAttempt = 0;
    let successfulConnectionTimeout;
    let stop = false;
    let wasOnline = false;
    let initTimeout;
    function connect() {
      socket = new WebSocket(url, ["v1.alis", "v2.asciicast", "raw"]);
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        const proto = socket.protocol || "raw";
        logger.info("opened");
        logger.info(`activating ${proto} protocol handler`);
        if (proto === "v1.alis") {
          socket.onmessage = onMessage(alisHandler(logger));
        } else if (proto === "v2.asciicast") {
          socket.onmessage = onMessage(jsonHandler());
        } else if (proto === "raw") {
          socket.onmessage = onMessage(rawHandler());
        }
        successfulConnectionTimeout = setTimeout(() => {
          reconnectAttempt = 0;
        }, 1000);
      };
      socket.onclose = event => {
        clearTimeout(initTimeout);
        stopBuffer();
        if (stop || event.code === 1000 || event.code === 1005) {
          logger.info("closed");
          setState("ended", {
            message: "Stream ended"
          });
        } else if (event.code === 1002) {
          logger.debug(`close reason: ${event.reason}`);
          setState("ended", {
            message: "Err: Player not compatible with the server"
          });
        } else {
          clearTimeout(successfulConnectionTimeout);
          const delay = reconnectDelay(reconnectAttempt++);
          logger.info(`unclean close, reconnecting in ${delay}...`);
          setState("loading");
          setTimeout(connect, delay);
        }
      };
      wasOnline = false;
    }
    function onMessage(handler) {
      initTimeout = setTimeout(onStreamEnd, 5000);
      return function (event) {
        try {
          const result = handler(event.data);
          if (buf) {
            if (Array.isArray(result)) {
              buf.pushEvent(result);
            } else if (typeof result === "string") {
              buf.pushText(result);
            } else if (typeof result === "object" && !Array.isArray(result)) {
              // TODO: check last event ID from the parser, don't reset if we didn't miss anything
              onStreamReset(result);
            } else if (result === false) {
              // EOT
              onStreamEnd();
            } else if (result !== undefined) {
              throw `unexpected value from protocol handler: ${result}`;
            }
          } else {
            if (typeof result === "object" && !Array.isArray(result)) {
              onStreamReset(result);
              clearTimeout(initTimeout);
            } else if (result === undefined) {
              clearTimeout(initTimeout);
              initTimeout = setTimeout(onStreamEnd, 1000);
            } else {
              clearTimeout(initTimeout);
              throw `unexpected value from protocol handler: ${result}`;
            }
          }
        } catch (e) {
          socket.close();
          throw e;
        }
      };
    }
    function onStreamReset(_ref3) {
      let {
        time,
        term
      } = _ref3;
      const {
        size,
        init,
        theme
      } = term;
      const {
        cols,
        rows
      } = size;
      logger.info(`stream reset (${cols}x${rows} @${time})`);
      setState("playing");
      stopBuffer();
      buf = getBuffer(bufferTime, feed, resize, onInput, onMarker, t => clock.setTime(t), time, minFrameTime, logger);
      reset(cols, rows, init, theme);
      clock = new Clock();
      wasOnline = true;
      if (typeof time === "number") {
        clock.setTime(time);
      }
    }
    function onStreamEnd() {
      stopBuffer();
      if (wasOnline) {
        logger.info("stream ended");
        setState("offline", {
          message: "Stream ended"
        });
      } else {
        logger.info("stream offline");
        setState("offline", {
          message: "Stream offline"
        });
      }
      clock = new NullClock();
    }
    function stopBuffer() {
      if (buf) buf.stop();
      buf = null;
    }
    return {
      play: () => {
        connect();
      },
      stop: () => {
        stop = true;
        stopBuffer();
        if (socket !== undefined) socket.close();
      },
      getCurrentTime: () => clock.getTime()
    };
  }

  function eventsource(_ref, _ref2) {
    let {
      url,
      bufferTime,
      minFrameTime
    } = _ref;
    let {
      feed,
      reset,
      resize,
      onInput,
      onMarker,
      setState,
      logger
    } = _ref2;
    logger = new PrefixedLogger(logger, "eventsource: ");
    let es;
    let buf;
    let clock = new NullClock();
    function initBuffer(baseStreamTime) {
      if (buf !== undefined) buf.stop();
      buf = getBuffer(bufferTime, feed, resize, onInput, onMarker, t => clock.setTime(t), baseStreamTime, minFrameTime, logger);
    }
    return {
      play: () => {
        es = new EventSource(url);
        es.addEventListener("open", () => {
          logger.info("opened");
          initBuffer();
        });
        es.addEventListener("error", e => {
          logger.info("errored");
          logger.debug({
            e
          });
          setState("loading");
        });
        es.addEventListener("message", event => {
          const e = JSON.parse(event.data);
          if (Array.isArray(e)) {
            buf.pushEvent(e);
          } else if (e.cols !== undefined || e.width !== undefined) {
            const cols = e.cols ?? e.width;
            const rows = e.rows ?? e.height;
            logger.debug(`vt reset (${cols}x${rows})`);
            setState("playing");
            initBuffer(e.time);
            reset(cols, rows, e.init ?? undefined);
            clock = new Clock();
            if (typeof e.time === "number") {
              clock.setTime(e.time);
            }
          } else if (e.state === "offline") {
            logger.info("stream offline");
            setState("offline", {
              message: "Stream offline"
            });
            clock = new NullClock();
          }
        });
        es.addEventListener("done", () => {
          logger.info("closed");
          es.close();
          setState("ended", {
            message: "Stream ended"
          });
        });
      },
      stop: () => {
        if (buf !== undefined) buf.stop();
        if (es !== undefined) es.close();
      },
      getCurrentTime: () => clock.getTime()
    };
  }

  async function parse$1(responses, _ref) {
    let {
      encoding
    } = _ref;
    const textDecoder = new TextDecoder(encoding);
    let cols;
    let rows;
    let timing = (await responses[0].text()).split("\n").filter(line => line.length > 0).map(line => line.split(" "));
    if (timing[0].length < 3) {
      timing = timing.map(entry => ["O", entry[0], entry[1]]);
    }
    const buffer = await responses[1].arrayBuffer();
    const array = new Uint8Array(buffer);
    const dataOffset = array.findIndex(byte => byte == 0x0a) + 1;
    const header = textDecoder.decode(array.subarray(0, dataOffset));
    const sizeMatch = header.match(/COLUMNS="(\d+)" LINES="(\d+)"/);
    if (sizeMatch !== null) {
      cols = parseInt(sizeMatch[1], 10);
      rows = parseInt(sizeMatch[2], 10);
    }
    const stdout = {
      array,
      cursor: dataOffset
    };
    let stdin = stdout;
    if (responses[2] !== undefined) {
      const buffer = await responses[2].arrayBuffer();
      const array = new Uint8Array(buffer);
      stdin = {
        array,
        cursor: dataOffset
      };
    }
    const events = [];
    let time = 0;
    for (const entry of timing) {
      time += parseFloat(entry[1]);
      if (entry[0] === "O") {
        const count = parseInt(entry[2], 10);
        const bytes = stdout.array.subarray(stdout.cursor, stdout.cursor + count);
        const text = textDecoder.decode(bytes);
        events.push([time, "o", text]);
        stdout.cursor += count;
      } else if (entry[0] === "I") {
        const count = parseInt(entry[2], 10);
        const bytes = stdin.array.subarray(stdin.cursor, stdin.cursor + count);
        const text = textDecoder.decode(bytes);
        events.push([time, "i", text]);
        stdin.cursor += count;
      } else if (entry[0] === "S" && entry[2] === "SIGWINCH") {
        const cols = parseInt(entry[4].slice(5), 10);
        const rows = parseInt(entry[3].slice(5), 10);
        events.push([time, "r", `${cols}x${rows}`]);
      } else if (entry[0] === "H" && entry[2] === "COLUMNS") {
        cols = parseInt(entry[3], 10);
      } else if (entry[0] === "H" && entry[2] === "LINES") {
        rows = parseInt(entry[3], 10);
      }
    }
    cols = cols ?? 80;
    rows = rows ?? 24;
    return {
      cols,
      rows,
      events
    };
  }

  async function parse(response, _ref) {
    let {
      encoding
    } = _ref;
    const textDecoder = new TextDecoder(encoding);
    const buffer = await response.arrayBuffer();
    const array = new Uint8Array(buffer);
    const firstFrame = parseFrame(array);
    const baseTime = firstFrame.time;
    const firstFrameText = textDecoder.decode(firstFrame.data);
    const sizeMatch = firstFrameText.match(/\x1b\[8;(\d+);(\d+)t/);
    const events = [];
    let cols = 80;
    let rows = 24;
    if (sizeMatch !== null) {
      cols = parseInt(sizeMatch[2], 10);
      rows = parseInt(sizeMatch[1], 10);
    }
    let cursor = 0;
    let frame = parseFrame(array);
    while (frame !== undefined) {
      const time = frame.time - baseTime;
      const text = textDecoder.decode(frame.data);
      events.push([time, "o", text]);
      cursor += frame.len;
      frame = parseFrame(array.subarray(cursor));
    }
    return {
      cols,
      rows,
      events
    };
  }
  function parseFrame(array) {
    if (array.length < 13) return;
    const time = parseTimestamp(array.subarray(0, 8));
    const len = parseNumber(array.subarray(8, 12));
    const data = array.subarray(12, 12 + len);
    return {
      time,
      data,
      len: len + 12
    };
  }
  function parseNumber(array) {
    return array[0] + array[1] * 256 + array[2] * 256 * 256 + array[3] * 256 * 256 * 256;
  }
  function parseTimestamp(array) {
    const sec = parseNumber(array.subarray(0, 4));
    const usec = parseNumber(array.subarray(4, 8));
    return sec + usec / 1000000;
  }

  const vt = loadVt(); // trigger async loading of wasm

  class State {
    constructor(core) {
      this.core = core;
      this.driver = core.driver;
    }
    onEnter(data) {}
    init() {}
    play() {}
    pause() {}
    togglePlay() {}
    seek(where) {
      return false;
    }
    step(n) {}
    stop() {
      this.driver.stop();
    }
  }
  class UninitializedState extends State {
    async init() {
      try {
        await this.core._initializeDriver();
        return this.core._setState("idle");
      } catch (e) {
        this.core._setState("errored");
        throw e;
      }
    }
    async play() {
      this.core._dispatchEvent("play");
      const idleState = await this.init();
      await idleState.doPlay();
    }
    async togglePlay() {
      await this.play();
    }
    async seek(where) {
      const idleState = await this.init();
      return await idleState.seek(where);
    }
    async step(n) {
      const idleState = await this.init();
      await idleState.step(n);
    }
    stop() {}
  }
  class Idle extends State {
    onEnter(_ref) {
      let {
        reason,
        message
      } = _ref;
      this.core._dispatchEvent("idle", {
        message
      });
      if (reason === "paused") {
        this.core._dispatchEvent("pause");
      }
    }
    async play() {
      this.core._dispatchEvent("play");
      await this.doPlay();
    }
    async doPlay() {
      const stop = await this.driver.play();
      if (stop === true) {
        this.core._setState("playing");
      } else if (typeof stop === "function") {
        this.core._setState("playing");
        this.driver.stop = stop;
      }
    }
    async togglePlay() {
      await this.play();
    }
    seek(where) {
      return this.driver.seek(where);
    }
    step(n) {
      this.driver.step(n);
    }
  }
  class PlayingState extends State {
    onEnter() {
      this.core._dispatchEvent("playing");
    }
    pause() {
      if (this.driver.pause() === true) {
        this.core._setState("idle", {
          reason: "paused"
        });
      }
    }
    togglePlay() {
      this.pause();
    }
    seek(where) {
      return this.driver.seek(where);
    }
  }
  class LoadingState extends State {
    onEnter() {
      this.core._dispatchEvent("loading");
    }
  }
  class OfflineState extends State {
    onEnter(_ref2) {
      let {
        message
      } = _ref2;
      this.core._dispatchEvent("offline", {
        message
      });
    }
  }
  class EndedState extends State {
    onEnter(_ref3) {
      let {
        message
      } = _ref3;
      this.core._dispatchEvent("ended", {
        message
      });
    }
    async play() {
      this.core._dispatchEvent("play");
      if (await this.driver.restart()) {
        this.core._setState('playing');
      }
    }
    async togglePlay() {
      await this.play();
    }
    seek(where) {
      if (this.driver.seek(where) === true) {
        this.core._setState('idle');
        return true;
      }
      return false;
    }
  }
  class ErroredState extends State {
    onEnter() {
      this.core._dispatchEvent("errored");
    }
  }
  class Core {
    constructor(src, opts) {
      this.logger = opts.logger;
      this.state = new UninitializedState(this);
      this.stateName = "uninitialized";
      this.driver = getDriver(src);
      this.changedLines = new Set();
      this.cursor = undefined;
      this.duration = undefined;
      this.cols = opts.cols;
      this.rows = opts.rows;
      this.speed = opts.speed;
      this.loop = opts.loop;
      this.autoPlay = opts.autoPlay;
      this.idleTimeLimit = opts.idleTimeLimit;
      this.preload = opts.preload;
      this.startAt = parseNpt(opts.startAt);
      this.poster = this._parsePoster(opts.poster);
      this.markers = this._normalizeMarkers(opts.markers);
      this.pauseOnMarkers = opts.pauseOnMarkers;
      this.commandQueue = Promise.resolve();
      this.eventHandlers = new Map([["ended", []], ["errored", []], ["idle", []], ["input", []], ["loading", []], ["marker", []], ["metadata", []], ["offline", []], ["pause", []], ["play", []], ["playing", []], ["ready", []], ["reset", []], ["resize", []], ["seeked", []], ["terminalUpdate", []]]);
    }
    async init() {
      this.wasm = await vt;
      const feed = this._feed.bind(this);
      const onInput = data => {
        this._dispatchEvent("input", {
          data
        });
      };
      const onMarker = _ref4 => {
        let {
          index,
          time,
          label
        } = _ref4;
        this._dispatchEvent("marker", {
          index,
          time,
          label
        });
      };
      const now = this._now.bind(this);
      const reset = this._resetVt.bind(this);
      const resize = this._resizeVt.bind(this);
      const setState = this._setState.bind(this);
      const posterTime = this.poster.type === "npt" ? this.poster.value : undefined;
      this.driver = this.driver({
        feed,
        onInput,
        onMarker,
        reset,
        resize,
        now,
        setTimeout: (f, t) => setTimeout(f, t / this.speed),
        setInterval: (f, t) => setInterval(f, t / this.speed),
        setState,
        logger: this.logger
      }, {
        cols: this.cols,
        rows: this.rows,
        idleTimeLimit: this.idleTimeLimit,
        startAt: this.startAt,
        loop: this.loop,
        posterTime: posterTime,
        markers: this.markers,
        pauseOnMarkers: this.pauseOnMarkers
      });
      if (typeof this.driver === "function") {
        this.driver = {
          play: this.driver
        };
      }
      if (this.preload || posterTime !== undefined) {
        this._withState(state => state.init());
      }
      const poster = this.poster.type === "text" ? this._renderPoster(this.poster.value) : null;
      const config = {
        isPausable: !!this.driver.pause,
        isSeekable: !!this.driver.seek,
        poster
      };
      if (this.driver.init === undefined) {
        this.driver.init = () => {
          return {};
        };
      }
      if (this.driver.pause === undefined) {
        this.driver.pause = () => {};
      }
      if (this.driver.seek === undefined) {
        this.driver.seek = where => false;
      }
      if (this.driver.step === undefined) {
        this.driver.step = n => {};
      }
      if (this.driver.stop === undefined) {
        this.driver.stop = () => {};
      }
      if (this.driver.restart === undefined) {
        this.driver.restart = () => {};
      }
      if (this.driver.getCurrentTime === undefined) {
        const play = this.driver.play;
        let clock = new NullClock();
        this.driver.play = () => {
          clock = new Clock(this.speed);
          return play();
        };
        this.driver.getCurrentTime = () => clock.getTime();
      }
      this._dispatchEvent("ready", config);
      if (this.autoPlay) {
        this.play();
      }
    }
    play() {
      return this._withState(state => state.play());
    }
    pause() {
      return this._withState(state => state.pause());
    }
    togglePlay() {
      return this._withState(state => state.togglePlay());
    }
    seek(where) {
      return this._withState(async state => {
        if (await state.seek(where)) {
          this._dispatchEvent("seeked");
        }
      });
    }
    step(n) {
      return this._withState(state => state.step(n));
    }
    stop() {
      return this._withState(state => state.stop());
    }
    getChanges() {
      const changes = {};
      if (this.changedLines.size > 0) {
        const lines = new Map();
        const rows = this.vt.rows;
        for (const i of this.changedLines) {
          if (i < rows) {
            lines.set(i, {
              id: i,
              segments: this.vt.getLine(i)
            });
          }
        }
        this.changedLines.clear();
        changes.lines = lines;
      }
      if (this.cursor === undefined && this.vt) {
        this.cursor = this.vt.getCursor() ?? false;
        changes.cursor = this.cursor;
      }
      return changes;
    }
    getCurrentTime() {
      return this.driver.getCurrentTime();
    }
    getRemainingTime() {
      if (typeof this.duration === "number") {
        return this.duration - Math.min(this.getCurrentTime(), this.duration);
      }
    }
    getProgress() {
      if (typeof this.duration === "number") {
        return Math.min(this.getCurrentTime(), this.duration) / this.duration;
      }
    }
    getDuration() {
      return this.duration;
    }
    addEventListener(eventName, handler) {
      this.eventHandlers.get(eventName).push(handler);
    }
    _dispatchEvent(eventName) {
      let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      for (const h of this.eventHandlers.get(eventName)) {
        h(data);
      }
    }
    _withState(f) {
      return this._enqueueCommand(() => f(this.state));
    }
    _enqueueCommand(f) {
      this.commandQueue = this.commandQueue.then(f);
      return this.commandQueue;
    }
    _setState(newState) {
      let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (this.stateName === newState) return this.state;
      this.stateName = newState;
      if (newState === "playing") {
        this.state = new PlayingState(this);
      } else if (newState === "idle") {
        this.state = new Idle(this);
      } else if (newState === "loading") {
        this.state = new LoadingState(this);
      } else if (newState === "ended") {
        this.state = new EndedState(this);
      } else if (newState === "offline") {
        this.state = new OfflineState(this);
      } else if (newState === "errored") {
        this.state = new ErroredState(this);
      } else {
        throw `invalid state: ${newState}`;
      }
      this.state.onEnter(data);
      return this.state;
    }
    _feed(data) {
      this._doFeed(data);
      this._dispatchEvent("terminalUpdate");
    }
    _doFeed(data) {
      const affectedLines = this.vt.feed(data);
      affectedLines.forEach(i => this.changedLines.add(i));
      this.cursor = undefined;
    }
    _now() {
      return performance.now() * this.speed;
    }
    async _initializeDriver() {
      const meta = await this.driver.init();
      this.cols = this.cols ?? meta.cols ?? 80;
      this.rows = this.rows ?? meta.rows ?? 24;
      this.duration = this.duration ?? meta.duration;
      this.markers = this._normalizeMarkers(meta.markers) ?? this.markers ?? [];
      if (this.cols === 0) {
        this.cols = 80;
      }
      if (this.rows === 0) {
        this.rows = 24;
      }
      this._initializeVt(this.cols, this.rows);
      const poster = meta.poster !== undefined ? this._renderPoster(meta.poster) : null;
      this._dispatchEvent("metadata", {
        cols: this.cols,
        rows: this.rows,
        duration: this.duration,
        markers: this.markers,
        theme: meta.theme,
        poster
      });
    }
    _resetVt(cols, rows) {
      let init = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
      let theme = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
      this.logger.debug(`core: vt reset (${cols}x${rows})`);
      this.cols = cols;
      this.rows = rows;
      this.cursor = undefined;
      this._initializeVt(cols, rows);
      if (init !== undefined && init !== "") {
        this._doFeed(init);
      }
      this._dispatchEvent("reset", {
        cols,
        rows,
        theme
      });
    }
    _resizeVt(cols, rows) {
      if (cols === this.vt.cols && rows === this.vt.rows) return;
      const affectedLines = this.vt.resize(cols, rows);
      affectedLines.forEach(i => this.changedLines.add(i));
      this.cursor = undefined;
      this.vt.cols = cols;
      this.vt.rows = rows;
      this.logger.debug(`core: vt resize (${cols}x${rows})`);
      this._dispatchEvent("resize", {
        cols,
        rows
      });
    }
    _initializeVt(cols, rows) {
      this.vt = this.wasm.create(cols, rows, true, 100);
      this.vt.cols = cols;
      this.vt.rows = rows;
      this.changedLines.clear();
      for (let i = 0; i < rows; i++) {
        this.changedLines.add(i);
      }
    }
    _parsePoster(poster) {
      if (typeof poster !== "string") return {};
      if (poster.substring(0, 16) == "data:text/plain,") {
        return {
          type: "text",
          value: [poster.substring(16)]
        };
      } else if (poster.substring(0, 4) == "npt:") {
        return {
          type: "npt",
          value: parseNpt(poster.substring(4))
        };
      }
      return {};
    }
    _renderPoster(poster) {
      const cols = this.cols ?? 80;
      const rows = this.rows ?? 24;
      this.logger.debug(`core: poster init (${cols}x${rows})`);
      const vt = this.wasm.create(cols, rows, false, 0);
      poster.forEach(text => vt.feed(text));
      const cursor = vt.getCursor() ?? false;
      const lines = [];
      for (let i = 0; i < rows; i++) {
        lines.push({
          id: i,
          segments: vt.getLine(i)
        });
      }
      return {
        cursor,
        lines
      };
    }
    _normalizeMarkers(markers) {
      if (Array.isArray(markers)) {
        return markers.map(m => typeof m === "number" ? [m, ""] : m);
      }
    }
  }
  const DRIVERS = new Map([["benchmark", benchmark], ["clock", clock], ["eventsource", eventsource], ["random", random], ["recording", recording], ["websocket", websocket]]);
  const PARSERS = new Map([["asciicast", parse$2], ["typescript", parse$1], ["ttyrec", parse]]);
  function getDriver(src) {
    if (typeof src === "function") return src;
    if (typeof src === "string") {
      if (src.substring(0, 5) == "ws://" || src.substring(0, 6) == "wss://") {
        src = {
          driver: "websocket",
          url: src
        };
      } else if (src.substring(0, 6) == "clock:") {
        src = {
          driver: "clock"
        };
      } else if (src.substring(0, 7) == "random:") {
        src = {
          driver: "random"
        };
      } else if (src.substring(0, 10) == "benchmark:") {
        src = {
          driver: "benchmark",
          url: src.substring(10)
        };
      } else {
        src = {
          driver: "recording",
          url: src
        };
      }
    }
    if (src.driver === undefined) {
      src.driver = "recording";
    }
    if (src.driver == "recording") {
      if (src.parser === undefined) {
        src.parser = "asciicast";
      }
      if (typeof src.parser === "string") {
        if (PARSERS.has(src.parser)) {
          src.parser = PARSERS.get(src.parser);
        } else {
          throw `unknown parser: ${src.parser}`;
        }
      }
    }
    if (DRIVERS.has(src.driver)) {
      const driver = DRIVERS.get(src.driver);
      return (callbacks, opts) => driver(src, callbacks, opts);
    } else {
      throw `unsupported driver: ${JSON.stringify(src)}`;
    }
  }

  let logger = new DummyLogger();
  let core;
  onmessage = async function (e) {
    const promise = invoke(e.data.method, e.data.params);
    if (e.data.id !== undefined) {
      const result = await promise;
      postMessage({
        result,
        id: e.data.id
      });
    }
  };
  function invoke(method, params) {
    switch (method) {
      case "getChanges":
        return core.getChanges();
      case "new":
        const opts = params[1];
        if (opts.logger === true) {
          logger = console;
        }
        opts.logger = logger;
        core = new Core(params[0], opts);
        return;
      case "init":
        return core.init();
      case "play":
        return core.play();
      case "pause":
        return core.pause();
      case "togglePlay":
        return core.togglePlay();
      case "stop":
        return core.stop();
      case "seek":
        return core.seek(params);
      case "step":
        return core.step(params);
      case "getCurrentTime":
        return core.getCurrentTime();
      case "getRemainingTime":
        return core.getRemainingTime();
      case "getProgress":
        return core.getProgress();
      case "addEventListener":
        core.addEventListener(params[0], e => {
          postMessage({
            method: "onEvent",
            params: {
              name: params[0],
              event: e
            }
          });
        });
        return;
      default:
        throw `invalid method ${method}`;
    }
  }

})();
