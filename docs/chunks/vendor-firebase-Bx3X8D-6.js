var e={};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const t=function(e){const t=[];let n=0;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);i<128?t[n++]=i:i<2048?(t[n++]=i>>6|192,t[n++]=63&i|128):55296==(64512&i)&&r+1<e.length&&56320==(64512&e.charCodeAt(r+1))?(i=65536+((1023&i)<<10)+(1023&e.charCodeAt(++r)),t[n++]=i>>18|240,t[n++]=i>>12&63|128,t[n++]=i>>6&63|128,t[n++]=63&i|128):(t[n++]=i>>12|224,t[n++]=i>>6&63|128,t[n++]=63&i|128)}return t},n={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:"function"==typeof atob,encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<e.length;i+=3){const t=e[i],s=i+1<e.length,o=s?e[i+1]:0,a=i+2<e.length,c=a?e[i+2]:0,u=t>>2,l=(3&t)<<4|o>>4;let h=(15&o)<<2|c>>6,d=63&c;a||(d=64,s||(h=64)),r.push(n[u],n[l],n[h],n[d])}return r.join("")},encodeString(e,n){return this.HAS_NATIVE_SUPPORT&&!n?btoa(e):this.encodeByteArray(t(e),n)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):function(e){const t=[];let n=0,r=0;for(;n<e.length;){const i=e[n++];if(i<128)t[r++]=String.fromCharCode(i);else if(i>191&&i<224){const s=e[n++];t[r++]=String.fromCharCode((31&i)<<6|63&s)}else if(i>239&&i<365){const s=((7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++])-65536;t[r++]=String.fromCharCode(55296+(s>>10)),t[r++]=String.fromCharCode(56320+(1023&s))}else{const s=e[n++],o=e[n++];t[r++]=String.fromCharCode((15&i)<<12|(63&s)<<6|63&o)}}return t.join("")}(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,i=[];for(let s=0;s<e.length;){const t=n[e.charAt(s++)],o=s<e.length?n[e.charAt(s)]:0;++s;const a=s<e.length?n[e.charAt(s)]:64;++s;const c=s<e.length?n[e.charAt(s)]:64;if(++s,null==t||null==o||null==a||null==c)throw new r;const u=t<<2|o>>4;if(i.push(u),64!==a){const e=o<<4&240|a>>2;if(i.push(e),64!==c){const e=a<<6&192|c;i.push(e)}}}return i},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class r extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const i=function(e){return function(e){const r=t(e);return n.encodeByteArray(r,!0)}(e).replace(/\./g,"")},s=function(e){try{return n.decodeString(e,!0)}catch(t){}return null},o=()=>{try{
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
return function(){if("undefined"!=typeof self)return self;if("undefined"!=typeof window)return window;if("undefined"!=typeof global)return global;throw new Error("Unable to locate global object.")}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */().__FIREBASE_DEFAULTS__||(()=>{if("undefined"==typeof process)return;const t=e.__FIREBASE_DEFAULTS__;return t?JSON.parse(t):void 0})()||(()=>{if("undefined"==typeof document)return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch(n){return}const t=e&&s(e[1]);return t&&JSON.parse(t)})()}catch(t){return}},a=e=>{var t,n;return null===(n=null===(t=o())||void 0===t?void 0:t.emulatorHosts)||void 0===n?void 0:n[e]},c=()=>{var e;return null===(e=o())||void 0===e?void 0:e.config},u=e=>{var t;return null===(t=o())||void 0===t?void 0:t[`_${e}`]};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class l{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),"function"==typeof e&&(this.promise.catch(()=>{}),1===e.length?e(t):e(t,n))}}}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function h(){return"undefined"!=typeof navigator&&"string"==typeof navigator.userAgent?navigator.userAgent:""}function d(){return!function(){var e;const t=null===(e=o())||void 0===e?void 0:e.forceEnvironment;if("node"===t)return!0;if("browser"===t)return!1;try{return"[object process]"===Object.prototype.toString.call(global.process)}catch(n){return!1}}()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function f(){try{return"object"==typeof indexedDB}catch(e){return!1}}class p extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name="FirebaseError",Object.setPrototypeOf(this,p.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,m.prototype.create)}}class m{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},r=`${this.service}/${e}`,i=this.errors[e],s=i?function(e,t){return e.replace(g,(e,n)=>{const r=t[n];return null!=r?String(r):`<${n}?>`})}(i,n):"Error",o=`${this.serviceName}: ${s} (${r}).`;return new p(r,o,n)}}const g=/\{\$([^}]+)}/g;function y(e,t){if(e===t)return!0;const n=Object.keys(e),r=Object.keys(t);for(const i of n){if(!r.includes(i))return!1;const n=e[i],s=t[i];if(v(n)&&v(s)){if(!y(n,s))return!1}else if(n!==s)return!1}for(const i of r)if(!n.includes(i))return!1;return!0}function v(e){return null!==e&&"object"==typeof e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function w(e){const t=[];for(const[n,r]of Object.entries(e))Array.isArray(r)?r.forEach(e=>{t.push(encodeURIComponent(n)+"="+encodeURIComponent(e))}):t.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return t.length?"&"+t.join("&"):""}class I{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(e=>{this.error(e)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let r;if(void 0===e&&void 0===t&&void 0===n)throw new Error("Missing Observer.");r=function(e){if("object"!=typeof e||null===e)return!1;for(const t of["next","error","complete"])if(t in e&&"function"==typeof e[t])return!0;return!1}(e)?e:{next:e,error:t,complete:n},void 0===r.next&&(r.next=b),void 0===r.error&&(r.error=b),void 0===r.complete&&(r.complete=b);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?r.error(this.finalError):r.complete()}catch(e){}}),this.observers.push(r),i}unsubscribeOne(e){void 0!==this.observers&&void 0!==this.observers[e]&&(delete this.observers[e],this.observerCount-=1,0===this.observerCount&&void 0!==this.onNoObservers&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(void 0!==this.observers&&void 0!==this.observers[e])try{t(this.observers[e])}catch(n){"undefined"!=typeof console&&console.error}})}close(e){this.finalized||(this.finalized=!0,void 0!==e&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function b(){}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _(e){return e&&e._delegate?e._delegate:e}class T{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const E="[DEFAULT]";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class S{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const e=new l;if(this.instancesDeferred.set(t,e),this.isInitialized(t)||this.shouldAutoInitialize())try{const n=this.getOrInitializeService({instanceIdentifier:t});n&&e.resolve(n)}catch(n){}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;const n=this.normalizeInstanceIdentifier(null==e?void 0:e.identifier),r=null!==(t=null==e?void 0:e.optional)&&void 0!==t&&t;if(!this.isInitialized(n)&&!this.shouldAutoInitialize()){if(r)return null;throw Error(`Service ${this.name} is not available`)}try{return this.getOrInitializeService({instanceIdentifier:n})}catch(i){if(r)return null;throw i}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,this.shouldAutoInitialize()){if(function(e){return"EAGER"===e.instantiationMode}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e))try{this.getOrInitializeService({instanceIdentifier:E})}catch(t){}for(const[e,n]of this.instancesDeferred.entries()){const r=this.normalizeInstanceIdentifier(e);try{const e=this.getOrInitializeService({instanceIdentifier:r});n.resolve(e)}catch(t){}}}}clearInstance(e=E){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(e=>"INTERNAL"in e).map(e=>e.INTERNAL.delete()),...e.filter(e=>"_delete"in e).map(e=>e._delete())])}isComponentSet(){return null!=this.component}isInitialized(e=E){return this.instances.has(e)}getOptions(e=E){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const r=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[i,s]of this.instancesDeferred.entries())n===this.normalizeInstanceIdentifier(i)&&s.resolve(r);return r}onInit(e,t){var n;const r=this.normalizeInstanceIdentifier(t),i=null!==(n=this.onInitCallbacks.get(r))&&void 0!==n?n:new Set;i.add(e),this.onInitCallbacks.set(r,i);const s=this.instances.get(r);return s&&e(s,r),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch(r){}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:(r=e,r===E?void 0:r),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch(i){}var r;return n||null}normalizeInstanceIdentifier(e=E){return this.component?this.component.multipleInstances?e:E:e}shouldAutoInitialize(){return!!this.component&&"EXPLICIT"!==this.component.instantiationMode}}class C{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new S(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var k,A;(A=k||(k={}))[A.DEBUG=0]="DEBUG",A[A.VERBOSE=1]="VERBOSE",A[A.INFO=2]="INFO",A[A.WARN=3]="WARN",A[A.ERROR=4]="ERROR",A[A.SILENT=5]="SILENT";const D={debug:k.DEBUG,verbose:k.VERBOSE,info:k.INFO,warn:k.WARN,error:k.ERROR,silent:k.SILENT},x=k.INFO,N={[k.DEBUG]:"log",[k.VERBOSE]:"log",[k.INFO]:"info",[k.WARN]:"warn",[k.ERROR]:"error"},R=(e,t,...n)=>{if(!(t<e.logLevel||((new Date).toISOString(),N[t])))throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class O{constructor(e){this.name=e,this._logLevel=x,this._logHandler=R,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in k))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel="string"==typeof e?D[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if("function"!=typeof e)throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,k.DEBUG,...e),this._logHandler(this,k.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,k.VERBOSE,...e),this._logHandler(this,k.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,k.INFO,...e),this._logHandler(this,k.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,k.WARN,...e),this._logHandler(this,k.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,k.ERROR,...e),this._logHandler(this,k.ERROR,...e)}}let P,L;const M=new WeakMap,V=new WeakMap,F=new WeakMap,U=new WeakMap,B=new WeakMap;let j={get(e,t,n){if(e instanceof IDBTransaction){if("done"===t)return V.get(e);if("objectStoreNames"===t)return e.objectStoreNames||F.get(e);if("store"===t)return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return z(e[t])},set:(e,t,n)=>(e[t]=n,!0),has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function q(e){return"function"==typeof e?(t=e)!==IDBDatabase.prototype.transaction||"objectStoreNames"in IDBTransaction.prototype?(L||(L=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(t)?function(...e){return t.apply(K(this),e),z(M.get(this))}:function(...e){return z(t.apply(K(this),e))}:function(e,...n){const r=t.call(K(this),e,...n);return F.set(r,e.sort?e.sort():[e]),z(r)}:(e instanceof IDBTransaction&&function(e){if(V.has(e))return;const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",s),e.removeEventListener("abort",s)},i=()=>{t(),r()},s=()=>{n(e.error||new DOMException("AbortError","AbortError")),r()};e.addEventListener("complete",i),e.addEventListener("error",s),e.addEventListener("abort",s)});V.set(e,t)}(e),n=e,(P||(P=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])).some(e=>n instanceof e)?new Proxy(e,j):e);var t,n}function z(e){if(e instanceof IDBRequest)return function(e){const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("success",i),e.removeEventListener("error",s)},i=()=>{t(z(e.result)),r()},s=()=>{n(e.error),r()};e.addEventListener("success",i),e.addEventListener("error",s)});return t.then(t=>{t instanceof IDBCursor&&M.set(t,e)}).catch(()=>{}),B.set(t,e),t}(e);if(U.has(e))return U.get(e);const t=q(e);return t!==e&&(U.set(e,t),B.set(t,e)),t}const K=e=>B.get(e),G=["get","getKey","getAll","getAllKeys","count"],$=["put","add","delete","clear"],H=new Map;function W(e,t){if(!(e instanceof IDBDatabase)||t in e||"string"!=typeof t)return;if(H.get(t))return H.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,i=$.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!i&&!G.includes(n))return;const s=async function(e,...t){const s=this.transaction(e,i?"readwrite":"readonly");let o=s.store;return r&&(o=o.index(t.shift())),(await Promise.all([o[n](...t),i&&s.done]))[0]};return H.set(t,s),s}var Q;Q=j,j={...Q,get:(e,t,n)=>W(e,t)||Q.get(e,t,n),has:(e,t)=>!!W(e,t)||Q.has(e,t)};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class J{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(e=>{if(function(e){const t=e.getComponent();return"VERSION"===(null==t?void 0:t.type)}(e)){const t=e.getImmediate();return`${t.library}/${t.version}`}return null}).filter(e=>e).join(" ")}}const X="@firebase/app",Y="0.10.13",Z=new O("@firebase/app"),ee="@firebase/app-compat",te="@firebase/analytics-compat",ne="@firebase/analytics",re="@firebase/app-check-compat",ie="@firebase/app-check",se="@firebase/auth",oe="@firebase/auth-compat",ae="@firebase/database",ce="@firebase/data-connect",ue="@firebase/database-compat",le="@firebase/functions",he="@firebase/functions-compat",de="@firebase/installations",fe="@firebase/installations-compat",pe="@firebase/messaging",me="@firebase/messaging-compat",ge="@firebase/performance",ye="@firebase/performance-compat",ve="@firebase/remote-config",we="@firebase/remote-config-compat",Ie="@firebase/storage",be="@firebase/storage-compat",_e="@firebase/firestore",Te="@firebase/vertexai-preview",Ee="@firebase/firestore-compat",Se="firebase",Ce="[DEFAULT]",ke={[X]:"fire-core",[ee]:"fire-core-compat",[ne]:"fire-analytics",[te]:"fire-analytics-compat",[ie]:"fire-app-check",[re]:"fire-app-check-compat",[se]:"fire-auth",[oe]:"fire-auth-compat",[ae]:"fire-rtdb",[ce]:"fire-data-connect",[ue]:"fire-rtdb-compat",[le]:"fire-fn",[he]:"fire-fn-compat",[de]:"fire-iid",[fe]:"fire-iid-compat",[pe]:"fire-fcm",[me]:"fire-fcm-compat",[ge]:"fire-perf",[ye]:"fire-perf-compat",[ve]:"fire-rc",[we]:"fire-rc-compat",[Ie]:"fire-gcs",[be]:"fire-gcs-compat",[_e]:"fire-fst",[Ee]:"fire-fst-compat",[Te]:"fire-vertex","fire-js":"fire-js",[Se]:"fire-js-all"},Ae=new Map,De=new Map,xe=new Map;function Ne(e,t){try{e.container.addComponent(t)}catch(n){Z.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function Re(e){const t=e.name;if(xe.has(t))return Z.debug(`There were multiple attempts to register component ${t}.`),!1;xe.set(t,e);for(const n of Ae.values())Ne(n,e);for(const n of De.values())Ne(n,e);return!0}function Oe(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}function Pe(e){return void 0!==e.settings}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Le=new m("app","Firebase",{"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."});
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Me{constructor(e,t,n){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new T("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Le.create("app-deleted",{appName:this._name})}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ve="10.14.1";function Fe(e,t={}){let n=e;"object"!=typeof t&&(t={name:t});const r=Object.assign({name:Ce,automaticDataCollectionEnabled:!1},t),i=r.name;if("string"!=typeof i||!i)throw Le.create("bad-app-name",{appName:String(i)});if(n||(n=c()),!n)throw Le.create("no-options");const s=Ae.get(i);if(s){if(y(n,s.options)&&y(r,s.config))return s;throw Le.create("duplicate-app",{appName:i})}const o=new C(i);for(const c of xe.values())o.addComponent(c);const a=new Me(n,r,o);return Ae.set(i,a),a}function Ue(e=Ce){const t=Ae.get(e);if(!t&&e===Ce&&c())return Fe();if(!t)throw Le.create("no-app",{appName:e});return t}function Be(){return Array.from(Ae.values())}function je(e,t,n){var r;let i=null!==(r=ke[e])&&void 0!==r?r:e;n&&(i+=`-${n}`);const s=i.match(/\s|\//),o=t.match(/\s|\//);if(s||o){const e=[`Unable to register library "${i}" with version "${t}":`];return s&&e.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&o&&e.push("and"),o&&e.push(`version name "${t}" contains illegal characters (whitespace or "/")`),void Z.warn(e.join(" "))}Re(new T(`${i}-version`,()=>({library:i,version:t}),"VERSION"))}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qe="firebase-heartbeat-store";let ze=null;function Ke(){return ze||(ze=function(e,t,{blocked:n,upgrade:r,blocking:i,terminated:s}={}){const o=indexedDB.open(e,t),a=z(o);return r&&o.addEventListener("upgradeneeded",e=>{r(z(o.result),e.oldVersion,e.newVersion,z(o.transaction),e)}),n&&o.addEventListener("blocked",e=>n(e.oldVersion,e.newVersion,e)),a.then(e=>{s&&e.addEventListener("close",()=>s()),i&&e.addEventListener("versionchange",e=>i(e.oldVersion,e.newVersion,e))}).catch(()=>{}),a}("firebase-heartbeat-database",1,{upgrade:(e,t)=>{if(0===t)try{e.createObjectStore(qe)}catch(n){}}}).catch(e=>{throw Le.create("idb-open",{originalErrorMessage:e.message})})),ze}async function Ge(e,t){try{const n=(await Ke()).transaction(qe,"readwrite"),r=n.objectStore(qe);await r.put(t,$e(e)),await n.done}catch(n){if(n instanceof p)Z.warn(n.message);else{const e=Le.create("idb-set",{originalErrorMessage:null==n?void 0:n.message});Z.warn(e.message)}}}function $e(e){return`${e.name}!${e.options.appId}`}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class He{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new Qe(t),this._heartbeatsCachePromise=this._storage.read().then(e=>(this._heartbeatsCache=e,e))}async triggerHeartbeat(){var e,t;try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=We();if(null==(null===(e=this._heartbeatsCache)||void 0===e?void 0:e.heartbeats)&&(this._heartbeatsCache=await this._heartbeatsCachePromise,null==(null===(t=this._heartbeatsCache)||void 0===t?void 0:t.heartbeats)))return;if(this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(e=>e.date===r))return;return this._heartbeatsCache.heartbeats.push({date:r,agent:n}),this._heartbeatsCache.heartbeats=this._heartbeatsCache.heartbeats.filter(e=>{const t=new Date(e.date).valueOf();return Date.now()-t<=2592e6}),this._storage.overwrite(this._heartbeatsCache)}catch(n){Z.warn(n)}}async getHeartbeatsHeader(){var e;try{if(null===this._heartbeatsCache&&await this._heartbeatsCachePromise,null==(null===(e=this._heartbeatsCache)||void 0===e?void 0:e.heartbeats)||0===this._heartbeatsCache.heartbeats.length)return"";const t=We(),{heartbeatsToSend:n,unsentEntries:r}=function(e,t=1024){const n=[];let r=e.slice();for(const i of e){const e=n.find(e=>e.agent===i.agent);if(e){if(e.dates.push(i.date),Je(n)>t){e.dates.pop();break}}else if(n.push({agent:i.agent,dates:[i.date]}),Je(n)>t){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}(this._heartbeatsCache.heartbeats),s=i(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Z.warn(t),""}}}function We(){return(new Date).toISOString().substring(0,10)}class Qe{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return!!f()&&new Promise((e,t)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),n||self.indexedDB.deleteDatabase(r),e(!0)},i.onupgradeneeded=()=>{n=!1},i.onerror=()=>{var e;t((null===(e=i.error)||void 0===e?void 0:e.message)||"")}}catch(n){t(n)}}).then(()=>!0).catch(()=>!1)}async read(){if(await this._canUseIndexedDBPromise){const e=await async function(e){try{const t=(await Ke()).transaction(qe),n=await t.objectStore(qe).get($e(e));return await t.done,n}catch(t){if(t instanceof p)Z.warn(t.message);else{const e=Le.create("idb-get",{originalErrorMessage:null==t?void 0:t.message});Z.warn(e.message)}}}(this.app);return(null==e?void 0:e.heartbeats)?e:{heartbeats:[]}}return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const n=await this.read();return Ge(this.app,{lastSentHeartbeatDate:null!==(t=e.lastSentHeartbeatDate)&&void 0!==t?t:n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}}async add(e){var t;if(await this._canUseIndexedDBPromise){const n=await this.read();return Ge(this.app,{lastSentHeartbeatDate:null!==(t=e.lastSentHeartbeatDate)&&void 0!==t?t:n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}}}function Je(e){return i(JSON.stringify({version:2,heartbeats:e})).length}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xe(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var i=0;for(r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]])}return n}Re(new T("platform-logger",e=>new J(e),"PRIVATE")),Re(new T("heartbeat",e=>new He(e),"PRIVATE")),je(X,Y,""),je(X,Y,"esm2017"),je("fire-js",""),
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
je("firebase","10.14.1","app"),"function"==typeof SuppressedError&&SuppressedError;const Ye=function(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}},Ze=new m("auth","Firebase",{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}),et=new O("@firebase/auth");function tt(e,...t){et.logLevel<=k.ERROR&&et.error(`Auth (${Ve}): ${e}`,...t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nt(e,...t){throw ot(e,...t)}function rt(e,...t){return ot(e,...t)}function it(e,t,n){const r=Object.assign(Object.assign({},Ye()),{[t]:n});return new m("auth","Firebase",r).create(t,{appName:e.name})}function st(e){return it(e,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function ot(e,...t){if("string"!=typeof e){const n=t[0],r=[...t.slice(1)];return r[0]&&(r[0].appName=e.name),e._errorFactory.create(n,...r)}return Ze.create(e,...t)}function at(e,t,...n){if(!e)throw ot(t,...n)}function ct(e){const t="INTERNAL ASSERTION FAILED: "+e;throw tt(t),new Error(t)}function ut(e,t){e||ct(t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lt(){var e;return"undefined"!=typeof self&&(null===(e=self.location)||void 0===e?void 0:e.href)||""}function ht(){var e;return"undefined"!=typeof self&&(null===(e=self.location)||void 0===e?void 0:e.protocol)||null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class dt{constructor(e,t){this.shortDelay=e,this.longDelay=t,ut(t>e,"Short delay should be less than long delay!"),this.isMobile="undefined"!=typeof window&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(h())||"object"==typeof navigator&&"ReactNative"===navigator.product}get(){return"undefined"!=typeof navigator&&navigator&&"onLine"in navigator&&"boolean"==typeof navigator.onLine&&("http:"===ht()||"https:"===ht()||function(){const e="object"==typeof chrome?chrome.runtime:"object"==typeof browser?browser.runtime:void 0;return"object"==typeof e&&void 0!==e.id}()||"connection"in navigator)&&!navigator.onLine?Math.min(5e3,this.shortDelay):this.isMobile?this.longDelay:this.shortDelay}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ft(e,t){ut(e.emulator,"Emulator should always be set here");const{url:n}=e.emulator;return t?`${n}${t.startsWith("/")?t.slice(1):t}`:n}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pt{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){return this.fetchImpl?this.fetchImpl:"undefined"!=typeof self&&"fetch"in self?self.fetch:"undefined"!=typeof globalThis&&globalThis.fetch?globalThis.fetch:"undefined"!=typeof fetch?fetch:void ct("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){return this.headersImpl?this.headersImpl:"undefined"!=typeof self&&"Headers"in self?self.Headers:"undefined"!=typeof globalThis&&globalThis.Headers?globalThis.Headers:"undefined"!=typeof Headers?Headers:void ct("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){return this.responseImpl?this.responseImpl:"undefined"!=typeof self&&"Response"in self?self.Response:"undefined"!=typeof globalThis&&globalThis.Response?globalThis.Response:"undefined"!=typeof Response?Response:void ct("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mt={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"},gt=new dt(3e4,6e4);
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yt(e,t){return e.tenantId&&!t.tenantId?Object.assign(Object.assign({},t),{tenantId:e.tenantId}):t}async function vt(e,t,n,r,i={}){return wt(e,i,async()=>{let i={},s={};r&&("GET"===t?s=r:i={body:JSON.stringify(r)});const o=w(Object.assign({key:e.config.apiKey},s)).slice(1),a=await e._getAdditionalHeaders();a["Content-Type"]="application/json",e.languageCode&&(a["X-Firebase-Locale"]=e.languageCode);const c=Object.assign({method:t,headers:a},i);return"undefined"!=typeof navigator&&"Cloudflare-Workers"===navigator.userAgent||(c.referrerPolicy="no-referrer"),pt.fetch()(It(e,e.config.apiHost,n,o),c)})}async function wt(e,t,n){e._canInitEmulator=!1;const r=Object.assign(Object.assign({},mt),t);try{const t=new bt(e),i=await Promise.race([n(),t.promise]);t.clearNetworkTimeout();const s=await i.json();if("needConfirmation"in s)throw _t(e,"account-exists-with-different-credential",s);if(i.ok&&!("errorMessage"in s))return s;{const t=i.ok?s.errorMessage:s.error.message,[n,o]=t.split(" : ");if("FEDERATED_USER_ID_ALREADY_LINKED"===n)throw _t(e,"credential-already-in-use",s);if("EMAIL_EXISTS"===n)throw _t(e,"email-already-in-use",s);if("USER_DISABLED"===n)throw _t(e,"user-disabled",s);const a=r[n]||n.toLowerCase().replace(/[_\s]+/g,"-");if(o)throw it(e,a,o);nt(e,a)}}catch(i){if(i instanceof p)throw i;nt(e,"network-request-failed",{message:String(i)})}}function It(e,t,n,r){const i=`${t}${n}?${r}`;return e.config.emulator?ft(e.config,i):`${e.config.apiScheme}://${i}`}class bt{constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((e,t)=>{this.timer=setTimeout(()=>t(rt(this.auth,"network-request-failed")),gt.get())})}clearNetworkTimeout(){clearTimeout(this.timer)}}function _t(e,t,n){const r={appName:e.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const i=rt(e,t,r);return i.customData._tokenResponse=n,i}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Tt(e,t){return vt(e,"POST","/v1/accounts:lookup",t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Et(e){if(e)try{const t=new Date(Number(e));if(!isNaN(t.getTime()))return t.toUTCString()}catch(t){}}function St(e){return 1e3*Number(e)}function Ct(e){const[t,n,r]=e.split(".");if(void 0===t||void 0===n||void 0===r)return tt("JWT malformed, contained fewer than 3 sections"),null;try{const e=s(n);return e?JSON.parse(e):(tt("Failed to decode base64 JWT payload"),null)}catch(i){return tt("Caught error parsing JWT payload as JSON",null==i?void 0:i.toString()),null}}function kt(e){const t=Ct(e);return at(t,"internal-error"),at(void 0!==t.exp,"internal-error"),at(void 0!==t.iat,"internal-error"),Number(t.exp)-Number(t.iat)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function At(e,t,n=!1){if(n)return t;try{return await t}catch(r){throw r instanceof p&&function({code:e}){return"auth/user-disabled"===e||"auth/user-token-expired"===e}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(r)&&e.auth.currentUser===e&&await e.auth.signOut(),r}}class Dt{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,null!==this.timerId&&clearTimeout(this.timerId))}getInterval(e){var t;if(e){const e=this.errorBackoff;return this.errorBackoff=Math.min(2*this.errorBackoff,96e4),e}{this.errorBackoff=3e4;const e=(null!==(t=this.user.stsTokenManager.expirationTime)&&void 0!==t?t:0)-Date.now()-3e5;return Math.max(0,e)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){return void("auth/network-request-failed"===(null==e?void 0:e.code)&&this.schedule(!0))}this.schedule()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xt{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Et(this.lastLoginAt),this.creationTime=Et(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nt(e){var t;const n=e.auth,r=await e.getIdToken(),i=await At(e,Tt(n,{idToken:r}));at(null==i?void 0:i.users.length,n,"internal-error");const s=i.users[0];e._notifyReloadListener(s);const o=(null===(t=s.providerUserInfo)||void 0===t?void 0:t.length)?Rt(s.providerUserInfo):[],a=(c=e.providerData,u=o,[...c.filter(e=>!u.some(t=>t.providerId===e.providerId)),...u]);var c,u;const l=e.isAnonymous,h=!(e.email&&s.passwordHash||(null==a?void 0:a.length)),d=!!l&&h,f={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:a,metadata:new xt(s.createdAt,s.lastLoginAt),isAnonymous:d};Object.assign(e,f)}function Rt(e){return e.map(e=>{var{providerId:t}=e,n=Xe(e,["providerId"]);return{providerId:t,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Ot{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){at(e.idToken,"internal-error"),at(void 0!==e.idToken,"internal-error"),at(void 0!==e.refreshToken,"internal-error");const t="expiresIn"in e&&void 0!==e.expiresIn?Number(e.expiresIn):kt(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){at(0!==e.length,"internal-error");const t=kt(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return t||!this.accessToken||this.isExpired?(at(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null):this.accessToken}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:r,expiresIn:i}=await async function(e,t){const n=await wt(e,{},async()=>{const n=w({grant_type:"refresh_token",refresh_token:t}).slice(1),{tokenApiHost:r,apiKey:i}=e.config,s=It(e,r,"/v1/token",`key=${i}`),o=await e._getAdditionalHeaders();return o["Content-Type"]="application/x-www-form-urlencoded",pt.fetch()(s,{method:"POST",headers:o,body:n})});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}(e,t);this.updateTokensAndExpiration(n,r,Number(i))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+1e3*n}static fromJSON(e,t){const{refreshToken:n,accessToken:r,expirationTime:i}=t,s=new Ot;return n&&(at("string"==typeof n,"internal-error",{appName:e}),s.refreshToken=n),r&&(at("string"==typeof r,"internal-error",{appName:e}),s.accessToken=r),i&&(at("number"==typeof i,"internal-error",{appName:e}),s.expirationTime=i),s}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Ot,this.toJSON())}_performRefresh(){return ct("not implemented")}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pt(e,t){at("string"==typeof e||void 0===e,"internal-error",{appName:t})}class Lt{constructor(e){var{uid:t,auth:n,stsTokenManager:r}=e,i=Xe(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new Dt(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=t,this.auth=n,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new xt(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await At(this,this.stsTokenManager.getToken(this.auth,e));return at(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return async function(e,t=!1){const n=_(e),r=await n.getIdToken(t),i=Ct(r);at(i&&i.exp&&i.auth_time&&i.iat,n.auth,"internal-error");const s="object"==typeof i.firebase?i.firebase:void 0,o=null==s?void 0:s.sign_in_provider;return{claims:i,token:r,authTime:Et(St(i.auth_time)),issuedAtTime:Et(St(i.iat)),expirationTime:Et(St(i.exp)),signInProvider:o||null,signInSecondFactor:(null==s?void 0:s.sign_in_second_factor)||null}}(this,e)}reload(){return async function(e){const t=_(e);await Nt(t),await t.auth._persistUserIfCurrent(t),t.auth._notifyListenersIfCurrent(t)}(this)}_assign(e){this!==e&&(at(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(e=>Object.assign({},e)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Lt(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return t.metadata._copy(this.metadata),t}_onReload(e){at(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Nt(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Pe(this.auth.app))return Promise.reject(st(this.auth));const e=await this.getIdToken();return await At(this,async function(e,t){return vt(e,"POST","/v1/accounts:delete",t)}(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){var n,r,i,s,o,a,c,u;const l=null!==(n=t.displayName)&&void 0!==n?n:void 0,h=null!==(r=t.email)&&void 0!==r?r:void 0,d=null!==(i=t.phoneNumber)&&void 0!==i?i:void 0,f=null!==(s=t.photoURL)&&void 0!==s?s:void 0,p=null!==(o=t.tenantId)&&void 0!==o?o:void 0,m=null!==(a=t._redirectEventId)&&void 0!==a?a:void 0,g=null!==(c=t.createdAt)&&void 0!==c?c:void 0,y=null!==(u=t.lastLoginAt)&&void 0!==u?u:void 0,{uid:v,emailVerified:w,isAnonymous:I,providerData:b,stsTokenManager:_}=t;at(v&&_,e,"internal-error");const T=Ot.fromJSON(this.name,_);at("string"==typeof v,e,"internal-error"),Pt(l,e.name),Pt(h,e.name),at("boolean"==typeof w,e,"internal-error"),at("boolean"==typeof I,e,"internal-error"),Pt(d,e.name),Pt(f,e.name),Pt(p,e.name),Pt(m,e.name),Pt(g,e.name),Pt(y,e.name);const E=new Lt({uid:v,auth:e,email:h,emailVerified:w,displayName:l,isAnonymous:I,photoURL:f,phoneNumber:d,tenantId:p,stsTokenManager:T,createdAt:g,lastLoginAt:y});return b&&Array.isArray(b)&&(E.providerData=b.map(e=>Object.assign({},e))),m&&(E._redirectEventId=m),E}static async _fromIdTokenResponse(e,t,n=!1){const r=new Ot;r.updateFromServerResponse(t);const i=new Lt({uid:t.localId,auth:e,stsTokenManager:r,isAnonymous:n});return await Nt(i),i}static async _fromGetAccountInfoResponse(e,t,n){const r=t.users[0];at(void 0!==r.localId,"internal-error");const i=void 0!==r.providerUserInfo?Rt(r.providerUserInfo):[],s=!(r.email&&r.passwordHash||(null==i?void 0:i.length)),o=new Ot;o.updateFromIdToken(n);const a=new Lt({uid:r.localId,auth:e,stsTokenManager:o,isAnonymous:s}),c={uid:r.localId,displayName:r.displayName||null,photoURL:r.photoUrl||null,email:r.email||null,emailVerified:r.emailVerified||!1,phoneNumber:r.phoneNumber||null,tenantId:r.tenantId||null,providerData:i,metadata:new xt(r.createdAt,r.lastLoginAt),isAnonymous:!(r.email&&r.passwordHash||(null==i?void 0:i.length))};return Object.assign(a,c),a}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mt=new Map;function Vt(e){ut(e instanceof Function,"Expected a class definition");let t=Mt.get(e);return t?(ut(t instanceof e,"Instance stored in cache mismatched with class"),t):(t=new e,Mt.set(e,t),t)}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ft{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return void 0===t?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Ft.type="NONE";const Ut=Ft;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bt(e,t,n){return`firebase:${e}:${t}:${n}`}class jt{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:r,name:i}=this.auth;this.fullUserKey=Bt(this.userKey,r.apiKey,i),this.fullPersistenceKey=Bt("persistence",r.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);return e?Lt._fromJSON(this.auth,e):null}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();return await this.removeCurrentUser(),this.persistence=e,t?this.setCurrentUser(t):void 0}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new jt(Vt(Ut),e,n);const r=(await Promise.all(t.map(async e=>{if(await e._isAvailable())return e}))).filter(e=>e);let i=r[0]||Vt(Ut);const s=Bt(n,e.config.apiKey,e.name);let o=null;for(const u of t)try{const t=await u._get(s);if(t){const n=Lt._fromJSON(e,t);u!==i&&(o=n),i=u;break}}catch(c){}const a=r.filter(e=>e._shouldAllowMigration);return i._shouldAllowMigration&&a.length?(i=a[0],o&&await i._set(s,o.toJSON()),await Promise.all(t.map(async e=>{if(e!==i)try{await e._remove(s)}catch(c){}})),new jt(i,e,n)):new jt(i,e,n)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qt(e){const t=e.toLowerCase();if(t.includes("opera/")||t.includes("opr/")||t.includes("opios/"))return"Opera";if($t(t))return"IEMobile";if(t.includes("msie")||t.includes("trident/"))return"IE";if(t.includes("edge/"))return"Edge";if(zt(t))return"Firefox";if(t.includes("silk/"))return"Silk";if(Wt(t))return"Blackberry";if(Qt(t))return"Webos";if(Kt(t))return"Safari";if((t.includes("chrome/")||Gt(t))&&!t.includes("edge/"))return"Chrome";if(Ht(t))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=e.match(t);if(2===(null==n?void 0:n.length))return n[1]}return"Other"}function zt(e=h()){return/firefox\//i.test(e)}function Kt(e=h()){const t=e.toLowerCase();return t.includes("safari/")&&!t.includes("chrome/")&&!t.includes("crios/")&&!t.includes("android")}function Gt(e=h()){return/crios\//i.test(e)}function $t(e=h()){return/iemobile/i.test(e)}function Ht(e=h()){return/android/i.test(e)}function Wt(e=h()){return/blackberry/i.test(e)}function Qt(e=h()){return/webos/i.test(e)}function Jt(e=h()){return/iphone|ipad|ipod/i.test(e)||/macintosh/i.test(e)&&/mobile/i.test(e)}function Xt(e=h()){return Jt(e)||Ht(e)||Qt(e)||Wt(e)||/windows phone/i.test(e)||$t(e)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yt(e,t=[]){let n;switch(e){case"Browser":n=qt(h());break;case"Worker":n=`${qt(h())}-${e}`;break;default:n=e}const r=t.length?t.join(","):"FirebaseCore-web";return`${n}/JsCore/${Ve}/${r}`}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zt{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=t=>new Promise((n,r)=>{try{n(e(t))}catch(i){r(i)}});n.onAbort=t,this.queue.push(n);const r=this.queue.length-1;return()=>{this.queue[r]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const e of t)try{e()}catch(r){}throw this.auth._errorFactory.create("login-blocked",{originalMessage:null==n?void 0:n.message})}}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class en{constructor(e){var t,n,r,i;const s=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=null!==(t=s.minPasswordLength)&&void 0!==t?t:6,s.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=s.maxPasswordLength),void 0!==s.containsLowercaseCharacter&&(this.customStrengthOptions.containsLowercaseLetter=s.containsLowercaseCharacter),void 0!==s.containsUppercaseCharacter&&(this.customStrengthOptions.containsUppercaseLetter=s.containsUppercaseCharacter),void 0!==s.containsNumericCharacter&&(this.customStrengthOptions.containsNumericCharacter=s.containsNumericCharacter),void 0!==s.containsNonAlphanumericCharacter&&(this.customStrengthOptions.containsNonAlphanumericCharacter=s.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,"ENFORCEMENT_STATE_UNSPECIFIED"===this.enforcementState&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=null!==(r=null===(n=e.allowedNonAlphanumericCharacters)||void 0===n?void 0:n.join(""))&&void 0!==r?r:"",this.forceUpgradeOnSignin=null!==(i=e.forceUpgradeOnSignin)&&void 0!==i&&i,this.schemaVersion=e.schemaVersion}validatePassword(e){var t,n,r,i,s,o;const a={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,a),this.validatePasswordCharacterOptions(e,a),a.isValid&&(a.isValid=null===(t=a.meetsMinPasswordLength)||void 0===t||t),a.isValid&&(a.isValid=null===(n=a.meetsMaxPasswordLength)||void 0===n||n),a.isValid&&(a.isValid=null===(r=a.containsLowercaseLetter)||void 0===r||r),a.isValid&&(a.isValid=null===(i=a.containsUppercaseLetter)||void 0===i||i),a.isValid&&(a.isValid=null===(s=a.containsNumericCharacter)||void 0===s||s),a.isValid&&(a.isValid=null===(o=a.containsNonAlphanumericCharacter)||void 0===o||o),a}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,r=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),r&&(t.meetsMaxPasswordLength=e.length<=r)}validatePasswordCharacterOptions(e,t){let n;this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);for(let r=0;r<e.length;r++)n=e.charAt(r),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,r,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=r)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tn{constructor(e,t,n,r){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=r,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new rn(this),this.idTokenSubscription=new rn(this),this.beforeStateQueue=new Zt(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Ze,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=r.sdkClientVersion}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=Vt(t)),this._initializationPromise=this.queue(async()=>{var n,r;if(!this._deleted&&(this.persistenceManager=await jt.create(this,e),!this._deleted)){if(null===(n=this._popupRedirectResolver)||void 0===n?void 0:n._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch(i){}await this.initializeCurrentUser(t),this.lastNotifiedUid=(null===(r=this.currentUser)||void 0===r?void 0:r.uid)||null,this._deleted||(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();return this.currentUser||e?this.currentUser&&e&&this.currentUser.uid===e.uid?(this._currentUser._assign(e),void(await this.currentUser.getIdToken())):void(await this._updateCurrentUser(e,!0)):void 0}async initializeCurrentUserFromIdToken(e){try{const t=await Tt(this,{idToken:e}),n=await Lt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var t;if(Pe(this.app)){const e=this.app.settings.authIdToken;return e?new Promise(t=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(e).then(t,t))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let r=n,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const n=null===(t=this.redirectUser)||void 0===t?void 0:t._redirectEventId,s=null==r?void 0:r._redirectEventId,o=await this.tryRedirectSignIn(e);n&&n!==s||!(null==o?void 0:o.user)||(r=o.user,i=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(r)}catch(s){r=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(s))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return at(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch(n){await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Nt(e)}catch(t){if("auth/network-request-failed"!==(null==t?void 0:t.code))return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=function(){if("undefined"==typeof navigator)return null;const e=navigator;return e.languages&&e.languages[0]||e.language||null}()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Pe(this.app))return Promise.reject(st(this));const t=e?_(e):null;return t&&at(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&at(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Pe(this.app)?Promise.reject(st(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Pe(this.app)?Promise.reject(st(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Vt(e))})}_getRecaptchaConfig(){return null==this.tenantId?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return null===this.tenantId?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await async function(e,t={}){return vt(e,"GET","/v2/passwordPolicy",yt(e,t))}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this),t=new en(e);null===this.tenantId?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistence(){return this.assertedPersistence.persistence.type}_updateErrorMap(e){this._errorFactory=new m("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:await this.currentUser.getIdToken()};null!=this.tenantId&&(t.tenantId=this.tenantId),await async function(e,t){return vt(e,"POST","/v2/accounts:revokeToken",yt(e,t))}(this,t)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:null===(e=this._currentUser)||void 0===e?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return null===e?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&Vt(e)||this._popupRedirectResolver;at(t,this,"argument-error"),this.redirectPersistenceManager=await jt.create(this,[Vt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),(null===(t=this._currentUser)||void 0===t?void 0:t._redirectEventId)===e?this._currentUser:(null===(n=this.redirectUser)||void 0===n?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const n=null!==(t=null===(e=this.currentUser)||void 0===e?void 0:e.uid)&&void 0!==t?t:null;this.lastNotifiedUid!==n&&(this.lastNotifiedUid=n,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,r){if(this._deleted)return()=>{};const i="function"==typeof t?t:t.next.bind(t);let s=!1;const o=this._isInitialized?Promise.resolve():this._initializationPromise;if(at(o,this,"internal-error"),o.then(()=>{s||i(this.currentUser)}),"function"==typeof t){const i=e.addObserver(t,n,r);return()=>{s=!0,i()}}{const n=e.addObserver(t);return()=>{s=!0,n()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return at(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){e&&!this.frameworks.includes(e)&&(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Yt(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const t={"X-Client-Version":this.clientVersion};this.app.options.appId&&(t["X-Firebase-gmpid"]=this.app.options.appId);const n=await(null===(e=this.heartbeatServiceProvider.getImmediate({optional:!0}))||void 0===e?void 0:e.getHeartbeatsHeader());n&&(t["X-Firebase-Client"]=n);const r=await this._getAppCheckToken();return r&&(t["X-Firebase-AppCheck"]=r),t}async _getAppCheckToken(){var e;const t=await(null===(e=this.appCheckServiceProvider.getImmediate({optional:!0}))||void 0===e?void 0:e.getToken());return(null==t?void 0:t.error)&&function(e,...t){et.logLevel<=k.WARN&&et.warn(`Auth (${Ve}): ${e}`,...t)}(`Error while retrieving App Check token: ${t.error}`),null==t?void 0:t.token}}function nn(e){return _(e)}class rn{constructor(e){this.auth=e,this.observer=null,this.addObserver=function(e){const t=new I(e,void 0);return t.subscribe.bind(t)}(e=>this.observer=e)}get next(){return at(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let sn={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function on(e){const t=e.indexOf(":");return t<0?"":e.substr(0,t+1)}function an(e){if(!e)return null;const t=Number(e);return isNaN(t)?null:t}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class cn{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return ct("not implemented")}_getIdTokenResponse(e){return ct("not implemented")}_linkToIdToken(e,t){return ct("not implemented")}_getReauthenticationResolver(e){return ct("not implemented")}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function un(e,t){return async function(e,t,n,r,i={}){const s=await vt(e,t,n,r,i);return"mfaPendingCredential"in s&&nt(e,"multi-factor-auth-required",{_serverResponse:s}),s}(e,"POST","/v1/accounts:signInWithIdp",yt(e,t))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ln extends cn{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new ln(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):nt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t="string"==typeof e?JSON.parse(e):e,{providerId:n,signInMethod:r}=t,i=Xe(t,["providerId","signInMethod"]);if(!n||!r)return null;const s=new ln(n,r);return s.idToken=i.idToken||void 0,s.accessToken=i.accessToken||void 0,s.secret=i.secret,s.nonce=i.nonce,s.pendingToken=i.pendingToken||null,s}_getIdTokenResponse(e){return un(e,this.buildRequest())}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,un(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,un(e,t)}buildRequest(){const e={requestUri:"http://localhost",returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=w(t)}return e}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hn{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dn extends hn{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fn extends dn{constructor(){super("facebook.com")}static credential(e){return ln._fromParams({providerId:fn.PROVIDER_ID,signInMethod:fn.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return fn.credentialFromTaggedObject(e)}static credentialFromError(e){return fn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e))return null;if(!e.oauthAccessToken)return null;try{return fn.credential(e.oauthAccessToken)}catch(t){return null}}}fn.FACEBOOK_SIGN_IN_METHOD="facebook.com",fn.PROVIDER_ID="facebook.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class pn extends dn{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return ln._fromParams({providerId:pn.PROVIDER_ID,signInMethod:pn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return pn.credentialFromTaggedObject(e)}static credentialFromError(e){return pn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return pn.credential(t,n)}catch(r){return null}}}pn.GOOGLE_SIGN_IN_METHOD="google.com",pn.PROVIDER_ID="google.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class mn extends dn{constructor(){super("github.com")}static credential(e){return ln._fromParams({providerId:mn.PROVIDER_ID,signInMethod:mn.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return mn.credentialFromTaggedObject(e)}static credentialFromError(e){return mn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e))return null;if(!e.oauthAccessToken)return null;try{return mn.credential(e.oauthAccessToken)}catch(t){return null}}}mn.GITHUB_SIGN_IN_METHOD="github.com",mn.PROVIDER_ID="github.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class gn extends dn{constructor(){super("twitter.com")}static credential(e,t){return ln._fromParams({providerId:gn.PROVIDER_ID,signInMethod:gn.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return gn.credentialFromTaggedObject(e)}static credentialFromError(e){return gn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return gn.credential(t,n)}catch(r){return null}}}gn.TWITTER_SIGN_IN_METHOD="twitter.com",gn.PROVIDER_ID="twitter.com";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class yn{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,r=!1){const i=await Lt._fromIdTokenResponse(e,n,r),s=vn(n);return new yn({user:i,providerId:s,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const r=vn(n);return new yn({user:e,providerId:r,_tokenResponse:n,operationType:t})}}function vn(e){return e.providerId?e.providerId:"phoneNumber"in e?"phone":null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wn extends p{constructor(e,t,n,r){var i;super(t.code,t.message),this.operationType=n,this.user=r,Object.setPrototypeOf(this,wn.prototype),this.customData={appName:e.name,tenantId:null!==(i=e.tenantId)&&void 0!==i?i:void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,r){return new wn(e,t,n,r)}}function In(e,t,n,r){return("reauthenticate"===t?n._getReauthenticationResolver(e):n._getIdTokenResponse(e)).catch(n=>{if("auth/multi-factor-auth-required"===n.code)throw wn._fromErrorAndOperation(e,n,t,r);throw n})}function bn(e,t,n,r){return _(e).onAuthStateChanged(t,n,r)}const _n="__sak";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tn{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(_n,"1"),this.storage.removeItem(_n),Promise.resolve(!0)):Promise.resolve(!1)}catch(e){return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class En extends Tn{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Xt(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),r=this.localCache[t];n!==r&&e(t,r,n)}}onStorageEvent(e,t=!1){if(!e.key)return void this.forAllChangedKeys((e,t,n)=>{this.notifyListeners(e,n)});const n=e.key;t?this.detachListener():this.stopPolling();const r=()=>{const e=this.storage.getItem(n);(t||this.localCache[n]!==e)&&this.notifyListeners(n,e)},i=this.storage.getItem(n);!function(){const e=h();return e.indexOf("MSIE ")>=0||e.indexOf("Trident/")>=0}()||10!==document.documentMode||i===e.newValue||e.newValue===e.oldValue?r():setTimeout(r,10)}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const r of Array.from(n))r(t?JSON.parse(t):t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},1e3)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){0===Object.keys(this.listeners).length&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),0===this.listeners[e].size&&delete this.listeners[e]),0===Object.keys(this.listeners).length&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}En.type="LOCAL";const Sn=En;
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cn extends Tn{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Cn.type="SESSION";const kn=Cn;
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class An{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(t=>t.isListeningto(e));if(t)return t;const n=new An(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:r,data:i}=t.data,s=this.handlersMap[r];if(!(null==s?void 0:s.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:r});const o=Array.from(s).map(async e=>e(t.origin,i)),a=await function(e){return Promise.all(e.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}(o);t.ports[0].postMessage({status:"done",eventId:n,eventType:r,response:a})}_subscribe(e,t){0===Object.keys(this.handlersMap).length&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),t&&0!==this.handlersMap[e].size||delete this.handlersMap[e],0===Object.keys(this.handlersMap).length&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Dn(e="",t=10){let n="";for(let r=0;r<t;r++)n+=Math.floor(10*Math.random());return e+n}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */An.receivers=[];class xn{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const r="undefined"!=typeof MessageChannel?new MessageChannel:null;if(!r)throw new Error("connection_unavailable");let i,s;return new Promise((o,a)=>{const c=Dn("",20);r.port1.start();const u=setTimeout(()=>{a(new Error("unsupported_event"))},n);s={messageChannel:r,onMessage(e){const t=e;if(t.data.eventId===c)switch(t.data.status){case"ack":clearTimeout(u),i=setTimeout(()=>{a(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),o(t.data.response);break;default:clearTimeout(u),clearTimeout(i),a(new Error("invalid_response"))}}},this.handlers.add(s),r.port1.addEventListener("message",s.onMessage),this.target.postMessage({eventType:e,eventId:c,data:t},[r.port2])}).finally(()=>{s&&this.removeMessageHandler(s)})}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nn(){return window}
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Rn(){return void 0!==Nn().WorkerGlobalScope&&"function"==typeof Nn().importScripts}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const On="firebaseLocalStorageDb",Pn="firebaseLocalStorage",Ln="fbase_key";class Mn{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Vn(e,t){return e.transaction([Pn],t?"readwrite":"readonly").objectStore(Pn)}function Fn(){const e=indexedDB.open(On,1);return new Promise((t,n)=>{e.addEventListener("error",()=>{n(e.error)}),e.addEventListener("upgradeneeded",()=>{const t=e.result;try{t.createObjectStore(Pn,{keyPath:Ln})}catch(r){n(r)}}),e.addEventListener("success",async()=>{const n=e.result;n.objectStoreNames.contains(Pn)?t(n):(n.close(),await function(){const e=indexedDB.deleteDatabase(On);return new Mn(e).toPromise()}(),t(await Fn()))})})}async function Un(e,t,n){const r=Vn(e,!0).put({[Ln]:t,value:n});return new Mn(r).toPromise()}function Bn(e,t){const n=Vn(e,!0).delete(t);return new Mn(n).toPromise()}class jn{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db||(this.db=await Fn()),this.db}async _withRetries(e){let t=0;for(;;)try{const t=await this._openDb();return await e(t)}catch(n){if(t++>3)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Rn()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=An._getInstance(Rn()?self:null),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var e,t;if(this.activeServiceWorker=await async function(){if(!(null===navigator||void 0===navigator?void 0:navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch(e){return null}}(),!this.activeServiceWorker)return;this.sender=new xn(this.activeServiceWorker);const n=await this.sender._send("ping",{},800);n&&(null===(e=n[0])||void 0===e?void 0:e.fulfilled)&&(null===(t=n[0])||void 0===t?void 0:t.value.includes("keyChanged"))&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){var t;if(this.sender&&this.activeServiceWorker&&((null===(t=null===navigator||void 0===navigator?void 0:navigator.serviceWorker)||void 0===t?void 0:t.controller)||null)===this.activeServiceWorker)try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch(t){}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Fn();return await Un(e,_n,"1"),await Bn(e,_n),!0}catch(e){}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Un(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(t=>async function(e,t){const n=Vn(e,!1).get(t),r=await new Mn(n).toPromise();return void 0===r?null:r.value}(t,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Bn(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(e=>{const t=Vn(e,!1).getAll();return new Mn(t).toPromise()});if(!e)return[];if(0!==this.pendingWrites)return[];const t=[],n=new Set;if(0!==e.length)for(const{fbase_key:r,value:i}of e)n.add(r),JSON.stringify(this.localCache[r])!==JSON.stringify(i)&&(this.notifyListeners(r,i),t.push(r));for(const r of Object.keys(this.localCache))this.localCache[r]&&!n.has(r)&&(this.notifyListeners(r,null),t.push(r));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const r of Array.from(n))r(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),800)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){0===Object.keys(this.listeners).length&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),0===this.listeners[e].size&&delete this.listeners[e]),0===Object.keys(this.listeners).length&&this.stopPolling()}}jn.type="LOCAL";const qn=jn;new dt(3e4,6e4);
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class zn extends cn{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return un(e,this._buildIdpRequest())}_linkToIdToken(e,t){return un(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return un(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function Kn(e){
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
return async function(e,t,n=!1){if(Pe(e.app))return Promise.reject(st(e));const r="signIn",i=await In(e,r,t),s=await yn._fromIdTokenResponse(e,r,i);return n||await e._updateCurrentUser(s.user),s}(e.auth,new zn(e),e.bypassAuthState)}function Gn(e){const{auth:t,user:n}=e;return at(n,t,"internal-error"),
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function(e,t,n=!1){const{auth:r}=e;if(Pe(r.app))return Promise.reject(st(r));const i="reauthenticate";try{const s=await At(e,In(r,i,t,e),n);at(s.idToken,r,"internal-error");const o=Ct(s.idToken);at(o,r,"internal-error");const{sub:a}=o;return at(e.uid===a,r,"user-mismatch"),yn._forOperation(e,i,s)}catch(s){throw"auth/user-not-found"===(null==s?void 0:s.code)&&nt(r,"user-mismatch"),s}}(n,new zn(e),e.bypassAuthState)}async function $n(e){const{auth:t,user:n}=e;return at(n,t,"internal-error"),async function(e,t,n=!1){const r=await At(e,t._linkToIdToken(e.auth,await e.getIdToken()),n);return yn._forOperation(e,"link",r)}(n,new zn(e),e.bypassAuthState)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hn{constructor(e,t,n,r,i=!1){this.auth=e,this.resolver=n,this.user=r,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:r,tenantId:i,error:s,type:o}=e;if(s)return void this.reject(s);const a={auth:this.auth,requestUri:t,sessionId:n,tenantId:i||void 0,postBody:r||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(o)(a))}catch(c){this.reject(c)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Kn;case"linkViaPopup":case"linkViaRedirect":return $n;case"reauthViaPopup":case"reauthViaRedirect":return Gn;default:nt(this.auth,"internal-error")}}resolve(e){ut(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){ut(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wn=new dt(2e3,1e4);class Qn extends Hn{constructor(e,t,n,r,i){super(e,t,r,i),this.provider=n,this.authWindow=null,this.pollId=null,Qn.currentPopupAction&&Qn.currentPopupAction.cancel(),Qn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return at(e,this.auth,"internal-error"),e}async onExecution(){ut(1===this.filter.length,"Popup operations only handle one event");const e=Dn();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(e=>{this.reject(e)}),this.resolver._isIframeWebStorageSupported(this.auth,e=>{e||this.reject(rt(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return(null===(e=this.authWindow)||void 0===e?void 0:e.associatedEvent)||null}cancel(){this.reject(rt(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Qn.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;(null===(n=null===(t=this.authWindow)||void 0===t?void 0:t.window)||void 0===n?void 0:n.closed)?this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(rt(this.auth,"popup-closed-by-user"))},8e3):this.pollId=window.setTimeout(e,Wn.get())};e()}}Qn.currentPopupAction=null;
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Jn=new Map;class Xn extends Hn{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=Jn.get(this.auth._key());if(!e){try{const t=await async function(e,t){const n=function(e){return Bt("pendingRedirect",e.config.apiKey,e.name)}(t),r=function(e){return Vt(e._redirectPersistence)}(e);if(!(await r._isAvailable()))return!1;const i="true"===await r._get(n);return await r._remove(n),i}(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(t)}catch(t){e=()=>Promise.reject(t)}Jn.set(this.auth._key(),e)}return this.bypassAuthState||Jn.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if("signInViaRedirect"===e.type)return super.onAuthEvent(e);if("unknown"!==e.type){if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}else this.resolve(null)}async onExecution(){}cleanUp(){}}function Yn(e,t){Jn.set(e._key(),t)}async function Zn(e,t,n=!1){if(Pe(e.app))return Promise.reject(st(e));const r=nn(e),i=
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function(e,t){return t?Vt(t):(at(e._popupRedirectResolver,e,"argument-error"),e._popupRedirectResolver)}(r,t),s=new Xn(r,i,n),o=await s.execute();return o&&!n&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,t)),o}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class er{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!function(e){switch(e.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return nr(e);default:return!1}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!nr(e)){const r=(null===(n=e.error.code)||void 0===n?void 0:n.split("auth/")[1])||"internal-error";t.onError(rt(this.auth,r))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=null===t.eventId||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=6e5&&this.cachedEventUids.clear(),this.cachedEventUids.has(tr(e))}saveEventToCache(e){this.cachedEventUids.add(tr(e)),this.lastProcessedEventTime=Date.now()}}function tr(e){return[e.type,e.eventId,e.sessionId,e.tenantId].filter(e=>e).join("-")}function nr({type:e,error:t}){return"unknown"===e&&"auth/no-auth-event"===(null==t?void 0:t.code)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const rr=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,ir=/^https?/;function sr(e){const t=lt(),{protocol:n,hostname:r}=new URL(t);if(e.startsWith("chrome-extension://")){const i=new URL(e);return""===i.hostname&&""===r?"chrome-extension:"===n&&e.replace("chrome-extension://","")===t.replace("chrome-extension://",""):"chrome-extension:"===n&&i.hostname===r}if(!ir.test(n))return!1;if(rr.test(e))return r===e;const i=e.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const or=new dt(3e4,6e4);function ar(){const e=Nn().___jsl;if(null==e?void 0:e.H)for(const t of Object.keys(e.H))if(e.H[t].r=e.H[t].r||[],e.H[t].L=e.H[t].L||[],e.H[t].r=[...e.H[t].L],e.CP)for(let n=0;n<e.CP.length;n++)e.CP[n]=null}let cr=null;
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ur=new dt(5e3,15e3),lr={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},hr=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function dr(e){const t=e.config;at(t.authDomain,e,"auth-domain-config-required");const n=t.emulator?ft(t,"emulator/auth/iframe"):`https://${e.config.authDomain}/__/auth/iframe`,r={apiKey:t.apiKey,appName:e.name,v:Ve},i=hr.get(e.config.apiHost);i&&(r.eid=i);const s=e._getFrameworks();return s.length&&(r.fw=s.join(",")),`${n}?${w(r).slice(1)}`}async function fr(e){const t=await function(e){return cr=cr||function(e){return new Promise((t,n)=>{var r,i,s,o;function a(){ar(),gapi.load("gapi.iframes",{callback:()=>{t(gapi.iframes.getContext())},ontimeout:()=>{ar(),n(rt(e,"network-request-failed"))},timeout:or.get()})}if(null===(i=null===(r=Nn().gapi)||void 0===r?void 0:r.iframes)||void 0===i?void 0:i.Iframe)t(gapi.iframes.getContext());else{if(!(null===(s=Nn().gapi)||void 0===s?void 0:s.load)){const t=`__iframefcb${Math.floor(1e6*Math.random())}`;return Nn()[t]=()=>{gapi.load?a():n(rt(e,"network-request-failed"))},(o=`${sn.gapiScript}?onload=${t}`,sn.loadJS(o)).catch(e=>n(e))}a()}}).catch(e=>{throw cr=null,e})}(e),cr}(e),n=Nn().gapi;return at(n,e,"internal-error"),t.open({where:document.body,url:dr(e),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:lr,dontclear:!0},t=>new Promise(async(n,r)=>{await t.restyle({setHideOnLeave:!1});const i=rt(e,"network-request-failed"),s=Nn().setTimeout(()=>{r(i)},ur.get());function o(){Nn().clearTimeout(s),n(t)}t.ping(o).then(o,()=>{r(i)})}))}
/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pr={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"};class mr{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch(e){}}}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const gr=encodeURIComponent("fac");async function yr(e,t,n,r,i,s){at(e.config.authDomain,e,"auth-domain-config-required"),at(e.config.apiKey,e,"invalid-api-key");const o={apiKey:e.config.apiKey,appName:e.name,authType:n,redirectUrl:r,v:Ve,eventId:i};if(t instanceof hn){t.setDefaultLanguage(e.languageCode),o.providerId=t.providerId||"",function(e){for(const t in e)if(Object.prototype.hasOwnProperty.call(e,t))return!1;return!0}(t.getCustomParameters())||(o.customParameters=JSON.stringify(t.getCustomParameters()));for(const[e,t]of Object.entries({}))o[e]=t}if(t instanceof dn){const e=t.getScopes().filter(e=>""!==e);e.length>0&&(o.scopes=e.join(","))}e.tenantId&&(o.tid=e.tenantId);const a=o;for(const l of Object.keys(a))void 0===a[l]&&delete a[l];const c=await e._getAppCheckToken(),u=c?`#${gr}=${encodeURIComponent(c)}`:"";return`${function({config:e}){return e.emulator?ft(e,"emulator/auth/handler"):`https://${e.authDomain}/__/auth/handler`}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e)}?${w(a).slice(1)}${u}`}const vr="webStorageSupport",wr=class{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=kn,this._completeRedirectFn=Zn,this._overrideRedirectResult=Yn}async _openPopup(e,t,n,r){var i;return ut(null===(i=this.eventManagers[e._key()])||void 0===i?void 0:i.manager,"_initialize() not called before _openPopup()"),function(e,t,n,r=500,i=600){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString();let a="";const c=Object.assign(Object.assign({},pr),{width:r.toString(),height:i.toString(),top:s,left:o}),u=h().toLowerCase();n&&(a=Gt(u)?"_blank":n),zt(u)&&(t=t||"http://localhost",c.scrollbars="yes");const l=Object.entries(c).reduce((e,[t,n])=>`${e}${t}=${n},`,"");if(function(e=h()){var t;return Jt(e)&&!!(null===(t=window.navigator)||void 0===t?void 0:t.standalone)}(u)&&"_self"!==a)return function(e,t){const n=document.createElement("a");n.href=e,n.target=t;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}(t||"",a),new mr(null);const d=window.open(t||"",a,l);at(d,e,"popup-blocked");try{d.focus()}catch(f){}return new mr(d)}(e,await yr(e,t,n,lt(),r),Dn())}async _openRedirect(e,t,n,r){return await this._originValidation(e),i=await yr(e,t,n,lt(),r),Nn().location.href=i,new Promise(()=>{});var i}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:e,promise:n}=this.eventManagers[t];return e?Promise.resolve(e):(ut(n,"If manager is not set, promise should be"),n)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await fr(e),n=new er(e);return t.register("authEvent",t=>(at(null==t?void 0:t.authEvent,e,"invalid-auth-event"),{status:n.onEvent(t.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(vr,{type:vr},n=>{var r;const i=null===(r=null==n?void 0:n[0])||void 0===r?void 0:r[vr];void 0!==i&&t(!!i),nt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=async function(e){if(e.config.emulator)return;const{authorizedDomains:t}=await async function(e,t={}){return vt(e,"GET","/v1/projects",t)}(e);for(const r of t)try{if(sr(r))return}catch(n){}nt(e,"unauthorized-domain")}(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Xt()||Kt()||Jt()}};var Ir="@firebase/auth",br="1.7.9";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class _r{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),(null===(e=this.auth.currentUser)||void 0===e?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(t=>{e((null==t?void 0:t.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){at(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Tr=u("authIdTokenMaxAge")||300;let Er=null;function Sr(e=Ue()){const t=Oe(e,"auth");if(t.isInitialized())return t.getImmediate();const n=
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function(e,t){const n=Oe(e,"auth");if(n.isInitialized()){const e=n.getImmediate();if(y(n.getOptions(),null!=t?t:{}))return e;nt(e,"already-initialized")}return n.initialize({options:t})}(e,{popupRedirectResolver:wr,persistence:[qn,Sn,kn]}),r=u("authTokenSyncURL");if(r&&"boolean"==typeof isSecureContext&&isSecureContext){const e=new URL(r,location.origin);if(location.origin===e.origin){const t=(i=e.toString(),async e=>{const t=e&&await e.getIdTokenResult(),n=t&&((new Date).getTime()-Date.parse(t.issuedAtTime))/1e3;if(n&&n>Tr)return;const r=null==t?void 0:t.token;Er!==r&&(Er=r,await fetch(i,{method:r?"POST":"DELETE",headers:r?{Authorization:`Bearer ${r}`}:{}}))});!function(e,t,n){_(e).beforeAuthStateChanged(t,n)}(n,t,()=>t(n.currentUser)),function(e){_(e).onIdTokenChanged(e=>t(e),void 0,void 0)}(n)}}var i;const s=a("auth");return s&&function(e,t){const n=nn(e);at(n._canInitEmulator,n,"emulator-config-failed"),at(/^https?:\/\//.test(t),n,"invalid-emulator-scheme");const r=on(t),{host:i,port:s}=function(e){const t=on(e),n=/(\/\/)?([^?#/]+)/.exec(e.substr(t.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(r);if(i){const e=i[1];return{host:e,port:an(r.substr(e.length+1))}}{const[e,t]=r.split(":");return{host:e,port:an(t)}}}(t),o=null===s?"":`:${s}`;n.config.emulator={url:`${r}//${i}${o}/`},n.settings.appVerificationDisabledForTesting=!0,n.emulatorConfig=Object.freeze({host:i,port:s,protocol:r.replace(":",""),options:Object.freeze({disableWarnings:!1})}),function(){function e(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}"undefined"!=typeof console&&console.info,"undefined"!=typeof window&&"undefined"!=typeof document&&("loading"===document.readyState?window.addEventListener("DOMContentLoaded",e):e())}()}(n,`http://${s}`),n}var Cr;sn={loadJS:e=>new Promise((t,n)=>{const r=document.createElement("script");var i,s;r.setAttribute("src",e),r.onload=t,r.onerror=e=>{const t=rt("internal-error");t.customData=e,n(t)},r.type="text/javascript",r.charset="UTF-8",(null!==(s=null===(i=document.getElementsByTagName("head"))||void 0===i?void 0:i[0])&&void 0!==s?s:document).appendChild(r)}),gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="},Cr="Browser",Re(new T("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),r=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:s,authDomain:o}=n.options;at(s&&!s.includes(":"),"invalid-api-key",{appName:n.name});const a={apiKey:s,authDomain:o,clientPlatform:Cr,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Yt(Cr)},c=new tn(n,r,i,a);return function(e,t){const n=(null==t?void 0:t.persistence)||[],r=(Array.isArray(n)?n:[n]).map(Vt);(null==t?void 0:t.errorMap)&&e._updateErrorMap(t.errorMap),e._initializeWithPersistence(r,null==t?void 0:t.popupRedirectResolver)}(c,t),c},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Re(new T("auth-internal",e=>{const t=nn(e.getProvider("auth").getImmediate());return new _r(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),je(Ir,br,function(e){switch(e){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}(Cr)),je(Ir,br,"esm2017");var kr,Ar,Dr="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};
/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/(function(){var e;
/** @license

   Copyright The Closure Library Authors.
   SPDX-License-Identifier: Apache-2.0
  */function t(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}function n(e,t,n){n||(n=0);var r=Array(16);if("string"==typeof t)for(var i=0;16>i;++i)r[i]=t.charCodeAt(n++)|t.charCodeAt(n++)<<8|t.charCodeAt(n++)<<16|t.charCodeAt(n++)<<24;else for(i=0;16>i;++i)r[i]=t[n++]|t[n++]<<8|t[n++]<<16|t[n++]<<24;t=e.g[0],n=e.g[1],i=e.g[2];var s=e.g[3],o=t+(s^n&(i^s))+r[0]+3614090360&4294967295;o=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=(n=(i=(s=(t=n+(o<<7&4294967295|o>>>25))+((o=s+(i^t&(n^i))+r[1]+3905402710&4294967295)<<12&4294967295|o>>>20))+((o=i+(n^s&(t^n))+r[2]+606105819&4294967295)<<17&4294967295|o>>>15))+((o=n+(t^i&(s^t))+r[3]+3250441966&4294967295)<<22&4294967295|o>>>10))+((o=t+(s^n&(i^s))+r[4]+4118548399&4294967295)<<7&4294967295|o>>>25))+((o=s+(i^t&(n^i))+r[5]+1200080426&4294967295)<<12&4294967295|o>>>20))+((o=i+(n^s&(t^n))+r[6]+2821735955&4294967295)<<17&4294967295|o>>>15))+((o=n+(t^i&(s^t))+r[7]+4249261313&4294967295)<<22&4294967295|o>>>10))+((o=t+(s^n&(i^s))+r[8]+1770035416&4294967295)<<7&4294967295|o>>>25))+((o=s+(i^t&(n^i))+r[9]+2336552879&4294967295)<<12&4294967295|o>>>20))+((o=i+(n^s&(t^n))+r[10]+4294925233&4294967295)<<17&4294967295|o>>>15))+((o=n+(t^i&(s^t))+r[11]+2304563134&4294967295)<<22&4294967295|o>>>10))+((o=t+(s^n&(i^s))+r[12]+1804603682&4294967295)<<7&4294967295|o>>>25))+((o=s+(i^t&(n^i))+r[13]+4254626195&4294967295)<<12&4294967295|o>>>20))+((o=i+(n^s&(t^n))+r[14]+2792965006&4294967295)<<17&4294967295|o>>>15))+((o=n+(t^i&(s^t))+r[15]+1236535329&4294967295)<<22&4294967295|o>>>10))+((o=t+(i^s&(n^i))+r[1]+4129170786&4294967295)<<5&4294967295|o>>>27))+((o=s+(n^i&(t^n))+r[6]+3225465664&4294967295)<<9&4294967295|o>>>23))+((o=i+(t^n&(s^t))+r[11]+643717713&4294967295)<<14&4294967295|o>>>18))+((o=n+(s^t&(i^s))+r[0]+3921069994&4294967295)<<20&4294967295|o>>>12))+((o=t+(i^s&(n^i))+r[5]+3593408605&4294967295)<<5&4294967295|o>>>27))+((o=s+(n^i&(t^n))+r[10]+38016083&4294967295)<<9&4294967295|o>>>23))+((o=i+(t^n&(s^t))+r[15]+3634488961&4294967295)<<14&4294967295|o>>>18))+((o=n+(s^t&(i^s))+r[4]+3889429448&4294967295)<<20&4294967295|o>>>12))+((o=t+(i^s&(n^i))+r[9]+568446438&4294967295)<<5&4294967295|o>>>27))+((o=s+(n^i&(t^n))+r[14]+3275163606&4294967295)<<9&4294967295|o>>>23))+((o=i+(t^n&(s^t))+r[3]+4107603335&4294967295)<<14&4294967295|o>>>18))+((o=n+(s^t&(i^s))+r[8]+1163531501&4294967295)<<20&4294967295|o>>>12))+((o=t+(i^s&(n^i))+r[13]+2850285829&4294967295)<<5&4294967295|o>>>27))+((o=s+(n^i&(t^n))+r[2]+4243563512&4294967295)<<9&4294967295|o>>>23))+((o=i+(t^n&(s^t))+r[7]+1735328473&4294967295)<<14&4294967295|o>>>18))+((o=n+(s^t&(i^s))+r[12]+2368359562&4294967295)<<20&4294967295|o>>>12))+((o=t+(n^i^s)+r[5]+4294588738&4294967295)<<4&4294967295|o>>>28))+((o=s+(t^n^i)+r[8]+2272392833&4294967295)<<11&4294967295|o>>>21))+((o=i+(s^t^n)+r[11]+1839030562&4294967295)<<16&4294967295|o>>>16))+((o=n+(i^s^t)+r[14]+4259657740&4294967295)<<23&4294967295|o>>>9))+((o=t+(n^i^s)+r[1]+2763975236&4294967295)<<4&4294967295|o>>>28))+((o=s+(t^n^i)+r[4]+1272893353&4294967295)<<11&4294967295|o>>>21))+((o=i+(s^t^n)+r[7]+4139469664&4294967295)<<16&4294967295|o>>>16))+((o=n+(i^s^t)+r[10]+3200236656&4294967295)<<23&4294967295|o>>>9))+((o=t+(n^i^s)+r[13]+681279174&4294967295)<<4&4294967295|o>>>28))+((o=s+(t^n^i)+r[0]+3936430074&4294967295)<<11&4294967295|o>>>21))+((o=i+(s^t^n)+r[3]+3572445317&4294967295)<<16&4294967295|o>>>16))+((o=n+(i^s^t)+r[6]+76029189&4294967295)<<23&4294967295|o>>>9))+((o=t+(n^i^s)+r[9]+3654602809&4294967295)<<4&4294967295|o>>>28))+((o=s+(t^n^i)+r[12]+3873151461&4294967295)<<11&4294967295|o>>>21))+((o=i+(s^t^n)+r[15]+530742520&4294967295)<<16&4294967295|o>>>16))+((o=n+(i^s^t)+r[2]+3299628645&4294967295)<<23&4294967295|o>>>9))+((o=t+(i^(n|~s))+r[0]+4096336452&4294967295)<<6&4294967295|o>>>26))+((o=s+(n^(t|~i))+r[7]+1126891415&4294967295)<<10&4294967295|o>>>22))+((o=i+(t^(s|~n))+r[14]+2878612391&4294967295)<<15&4294967295|o>>>17))+((o=n+(s^(i|~t))+r[5]+4237533241&4294967295)<<21&4294967295|o>>>11))+((o=t+(i^(n|~s))+r[12]+1700485571&4294967295)<<6&4294967295|o>>>26))+((o=s+(n^(t|~i))+r[3]+2399980690&4294967295)<<10&4294967295|o>>>22))+((o=i+(t^(s|~n))+r[10]+4293915773&4294967295)<<15&4294967295|o>>>17))+((o=n+(s^(i|~t))+r[1]+2240044497&4294967295)<<21&4294967295|o>>>11))+((o=t+(i^(n|~s))+r[8]+1873313359&4294967295)<<6&4294967295|o>>>26))+((o=s+(n^(t|~i))+r[15]+4264355552&4294967295)<<10&4294967295|o>>>22))+((o=i+(t^(s|~n))+r[6]+2734768916&4294967295)<<15&4294967295|o>>>17))+((o=n+(s^(i|~t))+r[13]+1309151649&4294967295)<<21&4294967295|o>>>11))+((s=(t=n+((o=t+(i^(n|~s))+r[4]+4149444226&4294967295)<<6&4294967295|o>>>26))+((o=s+(n^(t|~i))+r[11]+3174756917&4294967295)<<10&4294967295|o>>>22))^((i=s+((o=i+(t^(s|~n))+r[2]+718787259&4294967295)<<15&4294967295|o>>>17))|~t))+r[9]+3951481745&4294967295,e.g[0]=e.g[0]+t&4294967295,e.g[1]=e.g[1]+(i+(o<<21&4294967295|o>>>11))&4294967295,e.g[2]=e.g[2]+i&4294967295,e.g[3]=e.g[3]+s&4294967295}function r(e,t){this.h=t;for(var n=[],r=!0,i=e.length-1;0<=i;i--){var s=0|e[i];r&&s==t||(n[i]=s,r=!1)}this.g=n}!function(e,t){function n(){}n.prototype=t.prototype,e.D=t.prototype,e.prototype=new n,e.prototype.constructor=e,e.C=function(e,n,r){for(var i=Array(arguments.length-2),s=2;s<arguments.length;s++)i[s-2]=arguments[s];return t.prototype[n].apply(e,i)}}(t,function(){this.blockSize=-1}),t.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0},t.prototype.u=function(e,t){void 0===t&&(t=e.length);for(var r=t-this.blockSize,i=this.B,s=this.h,o=0;o<t;){if(0==s)for(;o<=r;)n(this,e,o),o+=this.blockSize;if("string"==typeof e){for(;o<t;)if(i[s++]=e.charCodeAt(o++),s==this.blockSize){n(this,i),s=0;break}}else for(;o<t;)if(i[s++]=e[o++],s==this.blockSize){n(this,i),s=0;break}}this.h=s,this.o+=t},t.prototype.v=function(){var e=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);e[0]=128;for(var t=1;t<e.length-8;++t)e[t]=0;var n=8*this.o;for(t=e.length-8;t<e.length;++t)e[t]=255&n,n/=256;for(this.u(e),e=Array(16),t=n=0;4>t;++t)for(var r=0;32>r;r+=8)e[n++]=this.g[t]>>>r&255;return e};var i={};function s(e){return-128<=e&&128>e?function(e){var t=i;return Object.prototype.hasOwnProperty.call(t,e)?t[e]:t[e]=function(e){return new r([0|e],0>e?-1:0)}(e)}(e):new r([0|e],0>e?-1:0)}function o(e){if(isNaN(e)||!isFinite(e))return a;if(0>e)return d(o(-e));for(var t=[],n=1,i=0;e>=n;i++)t[i]=e/n|0,n*=4294967296;return new r(t,0)}var a=s(0),c=s(1),u=s(16777216);function l(e){if(0!=e.h)return!1;for(var t=0;t<e.g.length;t++)if(0!=e.g[t])return!1;return!0}function h(e){return-1==e.h}function d(e){for(var t=e.g.length,n=[],i=0;i<t;i++)n[i]=~e.g[i];return new r(n,~e.h).add(c)}function f(e,t){return e.add(d(t))}function p(e,t){for(;(65535&e[t])!=e[t];)e[t+1]+=e[t]>>>16,e[t]&=65535,t++}function m(e,t){this.g=e,this.h=t}function g(e,t){if(l(t))throw Error("division by zero");if(l(e))return new m(a,a);if(h(e))return t=g(d(e),t),new m(d(t.g),d(t.h));if(h(t))return t=g(e,d(t)),new m(d(t.g),t.h);if(30<e.g.length){if(h(e)||h(t))throw Error("slowDivide_ only works with positive integers.");for(var n=c,r=t;0>=r.l(e);)n=y(n),r=y(r);var i=v(n,1),s=v(r,1);for(r=v(r,2),n=v(n,2);!l(r);){var u=s.add(r);0>=u.l(e)&&(i=i.add(n),s=u),r=v(r,1),n=v(n,1)}return t=f(e,i.j(t)),new m(i,t)}for(i=a;0<=e.l(t);){for(n=Math.max(1,Math.floor(e.m()/t.m())),r=48>=(r=Math.ceil(Math.log(n)/Math.LN2))?1:Math.pow(2,r-48),u=(s=o(n)).j(t);h(u)||0<u.l(e);)u=(s=o(n-=r)).j(t);l(s)&&(s=c),i=i.add(s),e=f(e,u)}return new m(i,e)}function y(e){for(var t=e.g.length+1,n=[],i=0;i<t;i++)n[i]=e.i(i)<<1|e.i(i-1)>>>31;return new r(n,e.h)}function v(e,t){var n=t>>5;t%=32;for(var i=e.g.length-n,s=[],o=0;o<i;o++)s[o]=0<t?e.i(o+n)>>>t|e.i(o+n+1)<<32-t:e.i(o+n);return new r(s,e.h)}(e=r.prototype).m=function(){if(h(this))return-d(this).m();for(var e=0,t=1,n=0;n<this.g.length;n++){var r=this.i(n);e+=(0<=r?r:4294967296+r)*t,t*=4294967296}return e},e.toString=function(e){if(2>(e=e||10)||36<e)throw Error("radix out of range: "+e);if(l(this))return"0";if(h(this))return"-"+d(this).toString(e);for(var t=o(Math.pow(e,6)),n=this,r="";;){var i=g(n,t).g,s=((0<(n=f(n,i.j(t))).g.length?n.g[0]:n.h)>>>0).toString(e);if(l(n=i))return s+r;for(;6>s.length;)s="0"+s;r=s+r}},e.i=function(e){return 0>e?0:e<this.g.length?this.g[e]:this.h},e.l=function(e){return h(e=f(this,e))?-1:l(e)?0:1},e.abs=function(){return h(this)?d(this):this},e.add=function(e){for(var t=Math.max(this.g.length,e.g.length),n=[],i=0,s=0;s<=t;s++){var o=i+(65535&this.i(s))+(65535&e.i(s)),a=(o>>>16)+(this.i(s)>>>16)+(e.i(s)>>>16);i=a>>>16,o&=65535,a&=65535,n[s]=a<<16|o}return new r(n,-2147483648&n[n.length-1]?-1:0)},e.j=function(e){if(l(this)||l(e))return a;if(h(this))return h(e)?d(this).j(d(e)):d(d(this).j(e));if(h(e))return d(this.j(d(e)));if(0>this.l(u)&&0>e.l(u))return o(this.m()*e.m());for(var t=this.g.length+e.g.length,n=[],i=0;i<2*t;i++)n[i]=0;for(i=0;i<this.g.length;i++)for(var s=0;s<e.g.length;s++){var c=this.i(i)>>>16,f=65535&this.i(i),m=e.i(s)>>>16,g=65535&e.i(s);n[2*i+2*s]+=f*g,p(n,2*i+2*s),n[2*i+2*s+1]+=c*g,p(n,2*i+2*s+1),n[2*i+2*s+1]+=f*m,p(n,2*i+2*s+1),n[2*i+2*s+2]+=c*m,p(n,2*i+2*s+2)}for(i=0;i<t;i++)n[i]=n[2*i+1]<<16|n[2*i];for(i=t;i<2*t;i++)n[i]=0;return new r(n,0)},e.A=function(e){return g(this,e).h},e.and=function(e){for(var t=Math.max(this.g.length,e.g.length),n=[],i=0;i<t;i++)n[i]=this.i(i)&e.i(i);return new r(n,this.h&e.h)},e.or=function(e){for(var t=Math.max(this.g.length,e.g.length),n=[],i=0;i<t;i++)n[i]=this.i(i)|e.i(i);return new r(n,this.h|e.h)},e.xor=function(e){for(var t=Math.max(this.g.length,e.g.length),n=[],i=0;i<t;i++)n[i]=this.i(i)^e.i(i);return new r(n,this.h^e.h)},t.prototype.digest=t.prototype.v,t.prototype.reset=t.prototype.s,t.prototype.update=t.prototype.u,Ar=t,r.prototype.add=r.prototype.add,r.prototype.multiply=r.prototype.j,r.prototype.modulo=r.prototype.A,r.prototype.compare=r.prototype.l,r.prototype.toNumber=r.prototype.m,r.prototype.toString=r.prototype.toString,r.prototype.getBits=r.prototype.i,r.fromNumber=o,r.fromString=function e(t,n){if(0==t.length)throw Error("number format error: empty string");if(2>(n=n||10)||36<n)throw Error("radix out of range: "+n);if("-"==t.charAt(0))return d(e(t.substring(1),n));if(0<=t.indexOf("-"))throw Error('number format error: interior "-" character');for(var r=o(Math.pow(n,8)),i=a,s=0;s<t.length;s+=8){var c=Math.min(8,t.length-s),u=parseInt(t.substring(s,s+c),n);8>c?(c=o(Math.pow(n,c)),i=i.j(c).add(o(u))):i=(i=i.j(r)).add(o(u))}return i},kr=r}).apply(void 0!==Dr?Dr:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});var xr,Nr,Rr,Or,Pr,Lr,Mr,Vr,Fr="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};
/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/(function(){var e,t="function"==typeof Object.defineProperties?Object.defineProperty:function(e,t,n){return e==Array.prototype||e==Object.prototype||(e[t]=n.value),e},n=function(e){e=["object"==typeof globalThis&&globalThis,e,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof Fr&&Fr];for(var t=0;t<e.length;++t){var n=e[t];if(n&&n.Math==Math)return n}throw Error("Cannot find global object")}(this);!function(e,r){if(r)e:{var i=n;e=e.split(".");for(var s=0;s<e.length-1;s++){var o=e[s];if(!(o in i))break e;i=i[o]}(r=r(s=i[e=e[e.length-1]]))!=s&&null!=r&&t(i,e,{configurable:!0,writable:!0,value:r})}}("Array.prototype.values",function(e){return e||function(){return function(e,t){e instanceof String&&(e+="");var n=0,r=!1,i={next:function(){if(!r&&n<e.length){var i=n++;return{value:t(0,e[i]),done:!1}}return r=!0,{done:!0,value:void 0}}};return i[Symbol.iterator]=function(){return i},i}(this,function(e,t){return t})}});
/** @license

   Copyright The Closure Library Authors.
   SPDX-License-Identifier: Apache-2.0
  */
var r=r||{},i=this||self;function s(e){var t=typeof e;return"array"==(t="object"!=t?t:e?Array.isArray(e)?"array":t:"null")||"object"==t&&"number"==typeof e.length}function o(e){var t=typeof e;return"object"==t&&null!=e||"function"==t}function a(e,t,n){return e.call.apply(e.bind,arguments)}function c(e,t,n){if(!e)throw Error();if(2<arguments.length){var r=Array.prototype.slice.call(arguments,2);return function(){var n=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(n,r),e.apply(t,n)}}return function(){return e.apply(t,arguments)}}function u(e,t,n){return(u=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?a:c).apply(null,arguments)}function l(e,t){var n=Array.prototype.slice.call(arguments,1);return function(){var t=n.slice();return t.push.apply(t,arguments),e.apply(this,t)}}function h(e,t){function n(){}n.prototype=t.prototype,e.aa=t.prototype,e.prototype=new n,e.prototype.constructor=e,e.Qb=function(e,n,r){for(var i=Array(arguments.length-2),s=2;s<arguments.length;s++)i[s-2]=arguments[s];return t.prototype[n].apply(e,i)}}function d(e){const t=e.length;if(0<t){const n=Array(t);for(let r=0;r<t;r++)n[r]=e[r];return n}return[]}function f(e,t){for(let n=1;n<arguments.length;n++){const t=arguments[n];if(s(t)){const n=e.length||0,r=t.length||0;e.length=n+r;for(let i=0;i<r;i++)e[n+i]=t[i]}else e.push(t)}}function p(e){return/^[\s\xa0]*$/.test(e)}function m(){var e=i.navigator;return e&&(e=e.userAgent)?e:""}function g(e){return g[" "](e),e}g[" "]=function(){};var y=!(-1==m().indexOf("Gecko")||-1!=m().toLowerCase().indexOf("webkit")&&-1==m().indexOf("Edge")||-1!=m().indexOf("Trident")||-1!=m().indexOf("MSIE")||-1!=m().indexOf("Edge"));function v(e,t,n){for(const r in e)t.call(n,e[r],r,e)}function w(e){const t={};for(const n in e)t[n]=e[n];return t}const I="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function b(e,t){let n,r;for(let i=1;i<arguments.length;i++){for(n in r=arguments[i],r)e[n]=r[n];for(let t=0;t<I.length;t++)n=I[t],Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n])}}function _(e){var t=1;e=e.split(":");const n=[];for(;0<t&&e.length;)n.push(e.shift()),t--;return e.length&&n.push(e.join(":")),n}function T(e){i.setTimeout(()=>{throw e},0)}function E(){var e=D;let t=null;return e.g&&(t=e.g,e.g=e.g.next,e.g||(e.h=null),t.next=null),t}var S=new class{constructor(e,t){this.i=e,this.j=t,this.h=0,this.g=null}get(){let e;return 0<this.h?(this.h--,e=this.g,this.g=e.next,e.next=null):e=this.i(),e}}(()=>new C,e=>e.reset());class C{constructor(){this.next=this.g=this.h=null}set(e,t){this.h=e,this.g=t,this.next=null}reset(){this.next=this.g=this.h=null}}let k,A=!1,D=new class{constructor(){this.h=this.g=null}add(e,t){const n=S.get();n.set(e,t),this.h?this.h.next=n:this.g=n,this.h=n}},x=()=>{const e=i.Promise.resolve(void 0);k=()=>{e.then(N)}};var N=()=>{for(var e;e=E();){try{e.h.call(e.g)}catch(n){T(n)}var t=S;t.j(e),100>t.h&&(t.h++,e.next=t.g,t.g=e)}A=!1};function R(){this.s=this.s,this.C=this.C}function O(e,t){this.type=e,this.g=this.target=t,this.defaultPrevented=!1}R.prototype.s=!1,R.prototype.ma=function(){this.s||(this.s=!0,this.N())},R.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()},O.prototype.h=function(){this.defaultPrevented=!0};var P=function(){if(!i.addEventListener||!Object.defineProperty)return!1;var e=!1,t=Object.defineProperty({},"passive",{get:function(){e=!0}});try{const e=()=>{};i.addEventListener("test",e,t),i.removeEventListener("test",e,t)}catch(n){}return e}();function L(e,t){if(O.call(this,e?e.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,e){var n=this.type=e.type,r=e.changedTouches&&e.changedTouches.length?e.changedTouches[0]:null;if(this.target=e.target||e.srcElement,this.g=t,t=e.relatedTarget){if(y){e:{try{g(t.nodeName);var i=!0;break e}catch(s){}i=!1}i||(t=null)}}else"mouseover"==n?t=e.fromElement:"mouseout"==n&&(t=e.toElement);this.relatedTarget=t,r?(this.clientX=void 0!==r.clientX?r.clientX:r.pageX,this.clientY=void 0!==r.clientY?r.clientY:r.pageY,this.screenX=r.screenX||0,this.screenY=r.screenY||0):(this.clientX=void 0!==e.clientX?e.clientX:e.pageX,this.clientY=void 0!==e.clientY?e.clientY:e.pageY,this.screenX=e.screenX||0,this.screenY=e.screenY||0),this.button=e.button,this.key=e.key||"",this.ctrlKey=e.ctrlKey,this.altKey=e.altKey,this.shiftKey=e.shiftKey,this.metaKey=e.metaKey,this.pointerId=e.pointerId||0,this.pointerType="string"==typeof e.pointerType?e.pointerType:M[e.pointerType]||"",this.state=e.state,this.i=e,e.defaultPrevented&&L.aa.h.call(this)}}h(L,O);var M={2:"touch",3:"pen",4:"mouse"};L.prototype.h=function(){L.aa.h.call(this);var e=this.i;e.preventDefault?e.preventDefault():e.returnValue=!1};var V="closure_listenable_"+(1e6*Math.random()|0),F=0;function U(e,t,n,r,i){this.listener=e,this.proxy=null,this.src=t,this.type=n,this.capture=!!r,this.ha=i,this.key=++F,this.da=this.fa=!1}function B(e){e.da=!0,e.listener=null,e.proxy=null,e.src=null,e.ha=null}function j(e){this.src=e,this.g={},this.h=0}function q(e,t){var n=t.type;if(n in e.g){var r,i=e.g[n],s=Array.prototype.indexOf.call(i,t,void 0);(r=0<=s)&&Array.prototype.splice.call(i,s,1),r&&(B(t),0==e.g[n].length&&(delete e.g[n],e.h--))}}function z(e,t,n,r){for(var i=0;i<e.length;++i){var s=e[i];if(!s.da&&s.listener==t&&s.capture==!!n&&s.ha==r)return i}return-1}j.prototype.add=function(e,t,n,r,i){var s=e.toString();(e=this.g[s])||(e=this.g[s]=[],this.h++);var o=z(e,t,r,i);return-1<o?(t=e[o],n||(t.fa=!1)):((t=new U(t,this.src,s,!!r,i)).fa=n,e.push(t)),t};var K="closure_lm_"+(1e6*Math.random()|0),G={};function $(e,t,n,r,i){if(Array.isArray(t)){for(var s=0;s<t.length;s++)$(e,t[s],n,r,i);return null}return n=Z(n),e&&e[V]?e.K(t,n,!!o(r)&&!!r.capture,i):function(e,t,n,r,i,s){if(!t)throw Error("Invalid event type");var a=o(i)?!!i.capture:!!i,c=X(e);if(c||(e[K]=c=new j(e)),(n=c.add(t,n,r,a,s)).proxy)return n;if(r=function(){const e=J;return function t(n){return e.call(t.src,t.listener,n)}}(),n.proxy=r,r.src=e,r.listener=n,e.addEventListener)P||(i=a),void 0===i&&(i=!1),e.addEventListener(t.toString(),r,i);else if(e.attachEvent)e.attachEvent(Q(t.toString()),r);else{if(!e.addListener||!e.removeListener)throw Error("addEventListener and attachEvent are unavailable.");e.addListener(r)}return n}(e,t,n,!1,r,i)}function H(e,t,n,r,i){if(Array.isArray(t))for(var s=0;s<t.length;s++)H(e,t[s],n,r,i);else r=o(r)?!!r.capture:!!r,n=Z(n),e&&e[V]?(e=e.i,(t=String(t).toString())in e.g&&-1<(n=z(s=e.g[t],n,r,i))&&(B(s[n]),Array.prototype.splice.call(s,n,1),0==s.length&&(delete e.g[t],e.h--))):e&&(e=X(e))&&(t=e.g[t.toString()],e=-1,t&&(e=z(t,n,r,i)),(n=-1<e?t[e]:null)&&W(n))}function W(e){if("number"!=typeof e&&e&&!e.da){var t=e.src;if(t&&t[V])q(t.i,e);else{var n=e.type,r=e.proxy;t.removeEventListener?t.removeEventListener(n,r,e.capture):t.detachEvent?t.detachEvent(Q(n),r):t.addListener&&t.removeListener&&t.removeListener(r),(n=X(t))?(q(n,e),0==n.h&&(n.src=null,t[K]=null)):B(e)}}}function Q(e){return e in G?G[e]:G[e]="on"+e}function J(e,t){if(e.da)e=!0;else{t=new L(t,this);var n=e.listener,r=e.ha||e.src;e.fa&&W(e),e=n.call(r,t)}return e}function X(e){return(e=e[K])instanceof j?e:null}var Y="__closure_events_fn_"+(1e9*Math.random()>>>0);function Z(e){return"function"==typeof e?e:(e[Y]||(e[Y]=function(t){return e.handleEvent(t)}),e[Y])}function ee(){R.call(this),this.i=new j(this),this.M=this,this.F=null}function te(e,t){var n,r=e.F;if(r)for(n=[];r;r=r.F)n.push(r);if(e=e.M,r=t.type||t,"string"==typeof t)t=new O(t,e);else if(t instanceof O)t.target=t.target||e;else{var i=t;b(t=new O(r,e),i)}if(i=!0,n)for(var s=n.length-1;0<=s;s--){var o=t.g=n[s];i=ne(o,r,!0,t)&&i}if(i=ne(o=t.g=e,r,!0,t)&&i,i=ne(o,r,!1,t)&&i,n)for(s=0;s<n.length;s++)i=ne(o=t.g=n[s],r,!1,t)&&i}function ne(e,t,n,r){if(!(t=e.i.g[String(t)]))return!0;t=t.concat();for(var i=!0,s=0;s<t.length;++s){var o=t[s];if(o&&!o.da&&o.capture==n){var a=o.listener,c=o.ha||o.src;o.fa&&q(e.i,o),i=!1!==a.call(c,r)&&i}}return i&&!r.defaultPrevented}function re(e,t,n){if("function"==typeof e)n&&(e=u(e,n));else{if(!e||"function"!=typeof e.handleEvent)throw Error("Invalid listener argument");e=u(e.handleEvent,e)}return 2147483647<Number(t)?-1:i.setTimeout(e,t||0)}function ie(e){e.g=re(()=>{e.g=null,e.i&&(e.i=!1,ie(e))},e.l);const t=e.h;e.h=null,e.m.apply(null,t)}h(ee,R),ee.prototype[V]=!0,ee.prototype.removeEventListener=function(e,t,n,r){H(this,e,t,n,r)},ee.prototype.N=function(){if(ee.aa.N.call(this),this.i){var e,t=this.i;for(e in t.g){for(var n=t.g[e],r=0;r<n.length;r++)B(n[r]);delete t.g[e],t.h--}}this.F=null},ee.prototype.K=function(e,t,n,r){return this.i.add(String(e),t,!1,n,r)},ee.prototype.L=function(e,t,n,r){return this.i.add(String(e),t,!0,n,r)};class se extends R{constructor(e,t){super(),this.m=e,this.l=t,this.h=null,this.i=!1,this.g=null}j(e){this.h=arguments,this.g?this.i=!0:ie(this)}N(){super.N(),this.g&&(i.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function oe(e){R.call(this),this.h=e,this.g={}}h(oe,R);var ae=[];function ce(e){v(e.g,function(e,t){this.g.hasOwnProperty(t)&&W(e)},e),e.g={}}oe.prototype.N=function(){oe.aa.N.call(this),ce(this)},oe.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var ue=i.JSON.stringify,le=i.JSON.parse,he=class{stringify(e){return i.JSON.stringify(e,void 0)}parse(e){return i.JSON.parse(e,void 0)}};function de(){}function fe(e){return e.h||(e.h=e.i())}function pe(){}de.prototype.h=null;var me={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function ge(){O.call(this,"d")}function ye(){O.call(this,"c")}h(ge,O),h(ye,O);var ve={},we=null;function Ie(){return we=we||new ee}function be(e){O.call(this,ve.La,e)}function _e(e){const t=Ie();te(t,new be(t))}function Te(e,t){O.call(this,ve.STAT_EVENT,e),this.stat=t}function Ee(e){const t=Ie();te(t,new Te(t,e))}function Se(e,t){O.call(this,ve.Ma,e),this.size=t}function Ce(e,t){if("function"!=typeof e)throw Error("Fn must not be null and must be a function");return i.setTimeout(function(){e()},t)}function ke(){this.g=!0}function Ae(e,t,n,r){e.info(function(){return"XMLHTTP TEXT ("+t+"): "+function(e,t){if(!e.g)return t;if(!t)return null;try{var n=JSON.parse(t);if(n)for(e=0;e<n.length;e++)if(Array.isArray(n[e])){var r=n[e];if(!(2>r.length)){var i=r[1];if(Array.isArray(i)&&!(1>i.length)){var s=i[0];if("noop"!=s&&"stop"!=s&&"close"!=s)for(var o=1;o<i.length;o++)i[o]=""}}}return ue(n)}catch(a){return t}}(e,n)+(r?" "+r:"")})}ve.La="serverreachability",h(be,O),ve.STAT_EVENT="statevent",h(Te,O),ve.Ma="timingevent",h(Se,O),ke.prototype.xa=function(){this.g=!1},ke.prototype.info=function(){};var De,xe={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},Ne={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"};function Re(){}function Oe(e,t,n,r){this.j=e,this.i=t,this.l=n,this.R=r||1,this.U=new oe(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new Pe}function Pe(){this.i=null,this.g="",this.h=!1}h(Re,de),Re.prototype.g=function(){return new XMLHttpRequest},Re.prototype.i=function(){return{}},De=new Re;var Le={},Me={};function Ve(e,t,n){e.L=1,e.v=ut(it(t)),e.m=n,e.P=!0,Fe(e,null)}function Fe(e,t){e.F=Date.now(),je(e),e.A=it(e.v);var n=e.A,r=e.R;Array.isArray(r)||(r=[String(r)]),_t(n.i,"t",r),e.C=0,n=e.j.J,e.h=new Pe,e.g=ln(e.j,n?t:null,!e.m),0<e.O&&(e.M=new se(u(e.Y,e,e.g),e.O)),t=e.U,n=e.g,r=e.ca;var i="readystatechange";Array.isArray(i)||(i&&(ae[0]=i.toString()),i=ae);for(var s=0;s<i.length;s++){var o=$(n,i[s],r||t.handleEvent,!1,t.h||t);if(!o)break;t.g[o.key]=o}t=e.H?w(e.H):{},e.m?(e.u||(e.u="POST"),t["Content-Type"]="application/x-www-form-urlencoded",e.g.ea(e.A,e.u,e.m,t)):(e.u="GET",e.g.ea(e.A,e.u,null,t)),_e(),function(e,t,n,r,i,s){e.info(function(){if(e.g)if(s)for(var o="",a=s.split("&"),c=0;c<a.length;c++){var u=a[c].split("=");if(1<u.length){var l=u[0];u=u[1];var h=l.split("_");o=2<=h.length&&"type"==h[1]?o+(l+"=")+u+"&":o+(l+"=redacted&")}}else o=null;else o=s;return"XMLHTTP REQ ("+r+") [attempt "+i+"]: "+t+"\n"+n+"\n"+o})}(e.i,e.u,e.A,e.l,e.R,e.m)}function Ue(e){return!!e.g&&"GET"==e.u&&2!=e.L&&e.j.Ca}function Be(e,t){var n=e.C,r=t.indexOf("\n",n);return-1==r?Me:(n=Number(t.substring(n,r)),isNaN(n)?Le:(r+=1)+n>t.length?Me:(t=t.slice(r,r+n),e.C=r+n,t))}function je(e){e.S=Date.now()+e.I,qe(e,e.I)}function qe(e,t){if(null!=e.B)throw Error("WatchDog timer not null");e.B=Ce(u(e.ba,e),t)}function ze(e){e.B&&(i.clearTimeout(e.B),e.B=null)}function Ke(e){0==e.j.G||e.J||sn(e.j,e)}function Ge(e){ze(e);var t=e.M;t&&"function"==typeof t.ma&&t.ma(),e.M=null,ce(e.U),e.g&&(t=e.g,e.g=null,t.abort(),t.ma())}function $e(e,t){try{var n=e.j;if(0!=n.G&&(n.g==e||Xe(n.h,e)))if(!e.K&&Xe(n.h,e)&&3==n.G){try{var r=n.Da.g.parse(t)}catch(l){r=null}if(Array.isArray(r)&&3==r.length){var i=r;if(0==i[0]){e:if(!n.u){if(n.g){if(!(n.g.F+3e3<e.F))break e;rn(n),Ht(n)}en(n),Ee(18)}}else n.za=i[1],0<n.za-n.T&&37500>i[2]&&n.F&&0==n.v&&!n.C&&(n.C=Ce(u(n.Za,n),6e3));if(1>=Je(n.h)&&n.ca){try{n.ca()}catch(l){}n.ca=void 0}}else an(n,11)}else if((e.K||n.g==e)&&rn(n),!p(t))for(i=n.Da.g.parse(t),t=0;t<i.length;t++){let u=i[t];if(n.T=u[0],u=u[1],2==n.G)if("c"==u[0]){n.K=u[1],n.ia=u[2];const t=u[3];null!=t&&(n.la=t,n.j.info("VER="+n.la));const i=u[4];null!=i&&(n.Aa=i,n.j.info("SVER="+n.Aa));const l=u[5];null!=l&&"number"==typeof l&&0<l&&(r=1.5*l,n.L=r,n.j.info("backChannelRequestTimeoutMs_="+r)),r=n;const h=e.g;if(h){const e=h.g?h.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(e){var s=r.h;s.g||-1==e.indexOf("spdy")&&-1==e.indexOf("quic")&&-1==e.indexOf("h2")||(s.j=s.l,s.g=new Set,s.h&&(Ye(s,s.h),s.h=null))}if(r.D){const e=h.g?h.g.getResponseHeader("X-HTTP-Session-Id"):null;e&&(r.ya=e,ct(r.I,r.D,e))}}n.G=3,n.l&&n.l.ua(),n.ba&&(n.R=Date.now()-e.F,n.j.info("Handshake RTT: "+n.R+"ms"));var o=e;if((r=n).qa=un(r,r.J?r.ia:null,r.W),o.K){Ze(r.h,o);var a=o,c=r.L;c&&(a.I=c),a.B&&(ze(a),je(a)),r.g=o}else Zt(r);0<n.i.length&&Qt(n)}else"stop"!=u[0]&&"close"!=u[0]||an(n,7);else 3==n.G&&("stop"==u[0]||"close"==u[0]?"stop"==u[0]?an(n,7):$t(n):"noop"!=u[0]&&n.l&&n.l.ta(u),n.v=0)}_e()}catch(l){}}Oe.prototype.ca=function(e){e=e.target;const t=this.M;t&&3==qt(e)?t.j():this.Y(e)},Oe.prototype.Y=function(e){try{if(e==this.g)e:{const d=qt(this.g);var t=this.g.Ba();if(this.g.Z(),!(3>d)&&(3!=d||this.g&&(this.h.h||this.g.oa()||zt(this.g)))){this.J||4!=d||7==t||_e(),ze(this);var n=this.g.Z();this.X=n;t:if(Ue(this)){var r=zt(this.g);e="";var s=r.length,o=4==qt(this.g);if(!this.h.i){if("undefined"==typeof TextDecoder){Ge(this),Ke(this);var a="";break t}this.h.i=new i.TextDecoder}for(t=0;t<s;t++)this.h.h=!0,e+=this.h.i.decode(r[t],{stream:!(o&&t==s-1)});r.length=0,this.h.g+=e,this.C=0,a=this.h.g}else a=this.g.oa();if(this.o=200==n,function(e,t,n,r,i,s,o){e.info(function(){return"XMLHTTP RESP ("+r+") [ attempt "+i+"]: "+t+"\n"+n+"\n"+s+" "+o})}(this.i,this.u,this.A,this.l,this.R,d,n),this.o){if(this.T&&!this.K){t:{if(this.g){var c,u=this.g;if((c=u.g?u.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!p(c)){var l=c;break t}}l=null}if(!(n=l)){this.o=!1,this.s=3,Ee(12),Ge(this),Ke(this);break e}Ae(this.i,this.l,n,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,$e(this,n)}if(this.P){let e;for(n=!0;!this.J&&this.C<a.length;){if(e=Be(this,a),e==Me){4==d&&(this.s=4,Ee(14),n=!1),Ae(this.i,this.l,null,"[Incomplete Response]");break}if(e==Le){this.s=4,Ee(15),Ae(this.i,this.l,a,"[Invalid Chunk]"),n=!1;break}Ae(this.i,this.l,e,null),$e(this,e)}if(Ue(this)&&0!=this.C&&(this.h.g=this.h.g.slice(this.C),this.C=0),4!=d||0!=a.length||this.h.h||(this.s=1,Ee(16),n=!1),this.o=this.o&&n,n){if(0<a.length&&!this.W){this.W=!0;var h=this.j;h.g==this&&h.ba&&!h.M&&(h.j.info("Great, no buffering proxy detected. Bytes received: "+a.length),tn(h),h.M=!0,Ee(11))}}else Ae(this.i,this.l,a,"[Invalid Chunked Response]"),Ge(this),Ke(this)}else Ae(this.i,this.l,a,null),$e(this,a);4==d&&Ge(this),this.o&&!this.J&&(4==d?sn(this.j,this):(this.o=!1,je(this)))}else(function(e){const t={};e=(e.g&&2<=qt(e)&&e.g.getAllResponseHeaders()||"").split("\r\n");for(let r=0;r<e.length;r++){if(p(e[r]))continue;var n=_(e[r]);const i=n[0];if("string"!=typeof(n=n[1]))continue;n=n.trim();const s=t[i]||[];t[i]=s,s.push(n)}!function(e,t){for(const n in e)t.call(void 0,e[n],n,e)}(t,function(e){return e.join(", ")})})(this.g),400==n&&0<a.indexOf("Unknown SID")?(this.s=3,Ee(12)):(this.s=0,Ee(13)),Ge(this),Ke(this)}}}catch(d){}},Oe.prototype.cancel=function(){this.J=!0,Ge(this)},Oe.prototype.ba=function(){this.B=null;const e=Date.now();0<=e-this.S?(function(e,t){e.info(function(){return"TIMEOUT: "+t})}(this.i,this.A),2!=this.L&&(_e(),Ee(17)),Ge(this),this.s=2,Ke(this)):qe(this,this.S-e)};var He=class{constructor(e,t){this.g=e,this.map=t}};function We(e){this.l=e||10,e=i.PerformanceNavigationTiming?0<(e=i.performance.getEntriesByType("navigation")).length&&("hq"==e[0].nextHopProtocol||"h2"==e[0].nextHopProtocol):!!(i.chrome&&i.chrome.loadTimes&&i.chrome.loadTimes()&&i.chrome.loadTimes().wasFetchedViaSpdy),this.j=e?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function Qe(e){return!!e.h||!!e.g&&e.g.size>=e.j}function Je(e){return e.h?1:e.g?e.g.size:0}function Xe(e,t){return e.h?e.h==t:!!e.g&&e.g.has(t)}function Ye(e,t){e.g?e.g.add(t):e.h=t}function Ze(e,t){e.h&&e.h==t?e.h=null:e.g&&e.g.has(t)&&e.g.delete(t)}function et(e){if(null!=e.h)return e.i.concat(e.h.D);if(null!=e.g&&0!==e.g.size){let t=e.i;for(const n of e.g.values())t=t.concat(n.D);return t}return d(e.i)}function tt(e,t){if(e.forEach&&"function"==typeof e.forEach)e.forEach(t,void 0);else if(s(e)||"string"==typeof e)Array.prototype.forEach.call(e,t,void 0);else for(var n=function(e){if(e.na&&"function"==typeof e.na)return e.na();if(!e.V||"function"!=typeof e.V){if("undefined"!=typeof Map&&e instanceof Map)return Array.from(e.keys());if(!("undefined"!=typeof Set&&e instanceof Set)){if(s(e)||"string"==typeof e){var t=[];e=e.length;for(var n=0;n<e;n++)t.push(n);return t}t=[],n=0;for(const r in e)t[n++]=r;return t}}}(e),r=function(e){if(e.V&&"function"==typeof e.V)return e.V();if("undefined"!=typeof Map&&e instanceof Map||"undefined"!=typeof Set&&e instanceof Set)return Array.from(e.values());if("string"==typeof e)return e.split("");if(s(e)){for(var t=[],n=e.length,r=0;r<n;r++)t.push(e[r]);return t}for(r in t=[],n=0,e)t[n++]=e[r];return t}(e),i=r.length,o=0;o<i;o++)t.call(void 0,r[o],n&&n[o],e)}We.prototype.cancel=function(){if(this.i=et(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&0!==this.g.size){for(const e of this.g.values())e.cancel();this.g.clear()}};var nt=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function rt(e){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,e instanceof rt){this.h=e.h,st(this,e.j),this.o=e.o,this.g=e.g,ot(this,e.s),this.l=e.l;var t=e.i,n=new vt;n.i=t.i,t.g&&(n.g=new Map(t.g),n.h=t.h),at(this,n),this.m=e.m}else e&&(t=String(e).match(nt))?(this.h=!1,st(this,t[1]||"",!0),this.o=lt(t[2]||""),this.g=lt(t[3]||"",!0),ot(this,t[4]),this.l=lt(t[5]||"",!0),at(this,t[6]||"",!0),this.m=lt(t[7]||"")):(this.h=!1,this.i=new vt(null,this.h))}function it(e){return new rt(e)}function st(e,t,n){e.j=n?lt(t,!0):t,e.j&&(e.j=e.j.replace(/:$/,""))}function ot(e,t){if(t){if(t=Number(t),isNaN(t)||0>t)throw Error("Bad port number "+t);e.s=t}else e.s=null}function at(e,t,n){t instanceof vt?(e.i=t,function(e,t){t&&!e.j&&(wt(e),e.i=null,e.g.forEach(function(e,t){var n=t.toLowerCase();t!=n&&(It(this,t),_t(this,n,e))},e)),e.j=t}(e.i,e.h)):(n||(t=ht(t,gt)),e.i=new vt(t,e.h))}function ct(e,t,n){e.i.set(t,n)}function ut(e){return ct(e,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),e}function lt(e,t){return e?t?decodeURI(e.replace(/%25/g,"%2525")):decodeURIComponent(e):""}function ht(e,t,n){return"string"==typeof e?(e=encodeURI(e).replace(t,dt),n&&(e=e.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),e):null}function dt(e){return"%"+((e=e.charCodeAt(0))>>4&15).toString(16)+(15&e).toString(16)}rt.prototype.toString=function(){var e=[],t=this.j;t&&e.push(ht(t,ft,!0),":");var n=this.g;return(n||"file"==t)&&(e.push("//"),(t=this.o)&&e.push(ht(t,ft,!0),"@"),e.push(encodeURIComponent(String(n)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),null!=(n=this.s)&&e.push(":",String(n))),(n=this.l)&&(this.g&&"/"!=n.charAt(0)&&e.push("/"),e.push(ht(n,"/"==n.charAt(0)?mt:pt,!0))),(n=this.i.toString())&&e.push("?",n),(n=this.m)&&e.push("#",ht(n,yt)),e.join("")};var ft=/[#\/\?@]/g,pt=/[#\?:]/g,mt=/[#\?]/g,gt=/[#\?@]/g,yt=/#/g;function vt(e,t){this.h=this.g=null,this.i=e||null,this.j=!!t}function wt(e){e.g||(e.g=new Map,e.h=0,e.i&&function(e,t){if(e){e=e.split("&");for(var n=0;n<e.length;n++){var r=e[n].indexOf("="),i=null;if(0<=r){var s=e[n].substring(0,r);i=e[n].substring(r+1)}else s=e[n];t(s,i?decodeURIComponent(i.replace(/\+/g," ")):"")}}}(e.i,function(t,n){e.add(decodeURIComponent(t.replace(/\+/g," ")),n)}))}function It(e,t){wt(e),t=Tt(e,t),e.g.has(t)&&(e.i=null,e.h-=e.g.get(t).length,e.g.delete(t))}function bt(e,t){return wt(e),t=Tt(e,t),e.g.has(t)}function _t(e,t,n){It(e,t),0<n.length&&(e.i=null,e.g.set(Tt(e,t),d(n)),e.h+=n.length)}function Tt(e,t){return t=String(t),e.j&&(t=t.toLowerCase()),t}function Et(e,t,n,r,i){try{i&&(i.onload=null,i.onerror=null,i.onabort=null,i.ontimeout=null),r(n)}catch(s){}}function St(){this.g=new he}function Ct(e,t,n){const r=n||"";try{tt(e,function(e,n){let i=e;o(e)&&(i=ue(e)),t.push(r+n+"="+encodeURIComponent(i))})}catch(i){throw t.push(r+"type="+encodeURIComponent("_badmap")),i}}function kt(e){this.l=e.Ub||null,this.j=e.eb||!1}function At(e,t){ee.call(this),this.D=e,this.o=t,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}function Dt(e){e.j.read().then(e.Pa.bind(e)).catch(e.ga.bind(e))}function xt(e){e.readyState=4,e.l=null,e.j=null,e.v=null,Nt(e)}function Nt(e){e.onreadystatechange&&e.onreadystatechange.call(e)}function Rt(e){let t="";return v(e,function(e,n){t+=n,t+=":",t+=e,t+="\r\n"}),t}function Ot(e,t,n){e:{for(r in n){var r=!1;break e}r=!0}r||(n=Rt(n),"string"==typeof e?null!=n&&encodeURIComponent(String(n)):ct(e,t,n))}function Pt(e){ee.call(this),this.headers=new Map,this.o=e||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}(e=vt.prototype).add=function(e,t){wt(this),this.i=null,e=Tt(this,e);var n=this.g.get(e);return n||this.g.set(e,n=[]),n.push(t),this.h+=1,this},e.forEach=function(e,t){wt(this),this.g.forEach(function(n,r){n.forEach(function(n){e.call(t,n,r,this)},this)},this)},e.na=function(){wt(this);const e=Array.from(this.g.values()),t=Array.from(this.g.keys()),n=[];for(let r=0;r<t.length;r++){const i=e[r];for(let e=0;e<i.length;e++)n.push(t[r])}return n},e.V=function(e){wt(this);let t=[];if("string"==typeof e)bt(this,e)&&(t=t.concat(this.g.get(Tt(this,e))));else{e=Array.from(this.g.values());for(let n=0;n<e.length;n++)t=t.concat(e[n])}return t},e.set=function(e,t){return wt(this),this.i=null,bt(this,e=Tt(this,e))&&(this.h-=this.g.get(e).length),this.g.set(e,[t]),this.h+=1,this},e.get=function(e,t){return e&&0<(e=this.V(e)).length?String(e[0]):t},e.toString=function(){if(this.i)return this.i;if(!this.g)return"";const e=[],t=Array.from(this.g.keys());for(var n=0;n<t.length;n++){var r=t[n];const s=encodeURIComponent(String(r)),o=this.V(r);for(r=0;r<o.length;r++){var i=s;""!==o[r]&&(i+="="+encodeURIComponent(String(o[r]))),e.push(i)}}return this.i=e.join("&")},h(kt,de),kt.prototype.g=function(){return new At(this.l,this.j)},kt.prototype.i=function(e){return function(){return e}}({}),h(At,ee),(e=At.prototype).open=function(e,t){if(0!=this.readyState)throw this.abort(),Error("Error reopening a connection");this.B=e,this.A=t,this.readyState=1,Nt(this)},e.send=function(e){if(1!=this.readyState)throw this.abort(),Error("need to call open() first. ");this.g=!0;const t={headers:this.u,method:this.B,credentials:this.m,cache:void 0};e&&(t.body=e),(this.D||i).fetch(new Request(this.A,t)).then(this.Sa.bind(this),this.ga.bind(this))},e.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&4!=this.readyState&&(this.g=!1,xt(this)),this.readyState=0},e.Sa=function(e){if(this.g&&(this.l=e,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=e.headers,this.readyState=2,Nt(this)),this.g&&(this.readyState=3,Nt(this),this.g)))if("arraybuffer"===this.responseType)e.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(void 0!==i.ReadableStream&&"body"in e){if(this.j=e.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Dt(this)}else e.text().then(this.Ra.bind(this),this.ga.bind(this))},e.Pa=function(e){if(this.g){if(this.o&&e.value)this.response.push(e.value);else if(!this.o){var t=e.value?e.value:new Uint8Array(0);(t=this.v.decode(t,{stream:!e.done}))&&(this.response=this.responseText+=t)}e.done?xt(this):Nt(this),3==this.readyState&&Dt(this)}},e.Ra=function(e){this.g&&(this.response=this.responseText=e,xt(this))},e.Qa=function(e){this.g&&(this.response=e,xt(this))},e.ga=function(){this.g&&xt(this)},e.setRequestHeader=function(e,t){this.u.append(e,t)},e.getResponseHeader=function(e){return this.h&&this.h.get(e.toLowerCase())||""},e.getAllResponseHeaders=function(){if(!this.h)return"";const e=[],t=this.h.entries();for(var n=t.next();!n.done;)n=n.value,e.push(n[0]+": "+n[1]),n=t.next();return e.join("\r\n")},Object.defineProperty(At.prototype,"withCredentials",{get:function(){return"include"===this.m},set:function(e){this.m=e?"include":"same-origin"}}),h(Pt,ee);var Lt=/^https?$/i,Mt=["POST","PUT"];function Vt(e,t){e.h=!1,e.g&&(e.j=!0,e.g.abort(),e.j=!1),e.l=t,e.m=5,Ft(e),Bt(e)}function Ft(e){e.A||(e.A=!0,te(e,"complete"),te(e,"error"))}function Ut(e){if(e.h&&void 0!==r&&(!e.v[1]||4!=qt(e)||2!=e.Z()))if(e.u&&4==qt(e))re(e.Ea,0,e);else if(te(e,"readystatechange"),4==qt(e)){e.h=!1;try{const r=e.Z();e:switch(r){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var t=!0;break e;default:t=!1}var n;if(!(n=t)){var s;if(s=0===r){var o=String(e.D).match(nt)[1]||null;!o&&i.self&&i.self.location&&(o=i.self.location.protocol.slice(0,-1)),s=!Lt.test(o?o.toLowerCase():"")}n=s}if(n)te(e,"complete"),te(e,"success");else{e.m=6;try{var a=2<qt(e)?e.g.statusText:""}catch(c){a=""}e.l=a+" ["+e.Z()+"]",Ft(e)}}finally{Bt(e)}}}function Bt(e,t){if(e.g){jt(e);const r=e.g,i=e.v[0]?()=>{}:null;e.g=null,e.v=null,t||te(e,"ready");try{r.onreadystatechange=i}catch(n){}}}function jt(e){e.I&&(i.clearTimeout(e.I),e.I=null)}function qt(e){return e.g?e.g.readyState:0}function zt(e){try{if(!e.g)return null;if("response"in e.g)return e.g.response;switch(e.H){case"":case"text":return e.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in e.g)return e.g.mozResponseArrayBuffer}return null}catch(t){return null}}function Kt(e,t,n){return n&&n.internalChannelParams&&n.internalChannelParams[e]||t}function Gt(e){this.Aa=0,this.i=[],this.j=new ke,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Kt("failFast",!1,e),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Kt("baseRetryDelayMs",5e3,e),this.cb=Kt("retryDelaySeedMs",1e4,e),this.Wa=Kt("forwardChannelMaxRetries",2,e),this.wa=Kt("forwardChannelRequestTimeoutMs",2e4,e),this.pa=e&&e.xmlHttpFactory||void 0,this.Xa=e&&e.Tb||void 0,this.Ca=e&&e.useFetchStreams||!1,this.L=void 0,this.J=e&&e.supportsCrossDomainXhr||!1,this.K="",this.h=new We(e&&e.concurrentRequestLimit),this.Da=new St,this.P=e&&e.fastHandshake||!1,this.O=e&&e.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=e&&e.Rb||!1,e&&e.xa&&this.j.xa(),e&&e.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&e&&e.detectBufferingProxy||!1,this.ja=void 0,e&&e.longPollingTimeout&&0<e.longPollingTimeout&&(this.ja=e.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}function $t(e){if(Wt(e),3==e.G){var t=e.U++,n=it(e.I);if(ct(n,"SID",e.K),ct(n,"RID",t),ct(n,"TYPE","terminate"),Xt(e,n),(t=new Oe(e,e.j,t)).L=2,t.v=ut(it(n)),n=!1,i.navigator&&i.navigator.sendBeacon)try{n=i.navigator.sendBeacon(t.v.toString(),"")}catch(r){}!n&&i.Image&&((new Image).src=t.v,n=!0),n||(t.g=ln(t.j,null),t.g.ea(t.v)),t.F=Date.now(),je(t)}cn(e)}function Ht(e){e.g&&(tn(e),e.g.cancel(),e.g=null)}function Wt(e){Ht(e),e.u&&(i.clearTimeout(e.u),e.u=null),rn(e),e.h.cancel(),e.s&&("number"==typeof e.s&&i.clearTimeout(e.s),e.s=null)}function Qt(e){if(!Qe(e.h)&&!e.s){e.s=!0;var t=e.Ga;k||x(),A||(k(),A=!0),D.add(t,e),e.B=0}}function Jt(e,t){var n;n=t?t.l:e.U++;const r=it(e.I);ct(r,"SID",e.K),ct(r,"RID",n),ct(r,"AID",e.T),Xt(e,r),e.m&&e.o&&Ot(r,e.m,e.o),n=new Oe(e,e.j,n,e.B+1),null===e.m&&(n.H=e.o),t&&(e.i=t.D.concat(e.i)),t=Yt(e,n,1e3),n.I=Math.round(.5*e.wa)+Math.round(.5*e.wa*Math.random()),Ye(e.h,n),Ve(n,r,t)}function Xt(e,t){e.H&&v(e.H,function(e,n){ct(t,n,e)}),e.l&&tt({},function(e,n){ct(t,n,e)})}function Yt(e,t,n){n=Math.min(e.i.length,n);var r=e.l?u(e.l.Na,e.l,e):null;e:{var i=e.i;let t=-1;for(;;){const e=["count="+n];-1==t?0<n?(t=i[0].g,e.push("ofs="+t)):t=0:e.push("ofs="+t);let o=!0;for(let a=0;a<n;a++){let n=i[a].g;const c=i[a].map;if(n-=t,0>n)t=Math.max(0,i[a].g-100),o=!1;else try{Ct(c,e,"req"+n+"_")}catch(s){r&&r(c)}}if(o){r=e.join("&");break e}}}return e=e.i.splice(0,n),t.D=e,r}function Zt(e){if(!e.g&&!e.u){e.Y=1;var t=e.Fa;k||x(),A||(k(),A=!0),D.add(t,e),e.v=0}}function en(e){return!(e.g||e.u||3<=e.v||(e.Y++,e.u=Ce(u(e.Fa,e),on(e,e.v)),e.v++,0))}function tn(e){null!=e.A&&(i.clearTimeout(e.A),e.A=null)}function nn(e){e.g=new Oe(e,e.j,"rpc",e.Y),null===e.m&&(e.g.H=e.o),e.g.O=0;var t=it(e.qa);ct(t,"RID","rpc"),ct(t,"SID",e.K),ct(t,"AID",e.T),ct(t,"CI",e.F?"0":"1"),!e.F&&e.ja&&ct(t,"TO",e.ja),ct(t,"TYPE","xmlhttp"),Xt(e,t),e.m&&e.o&&Ot(t,e.m,e.o),e.L&&(e.g.I=e.L);var n=e.g;e=e.ia,n.L=1,n.v=ut(it(t)),n.m=null,n.P=!0,Fe(n,e)}function rn(e){null!=e.C&&(i.clearTimeout(e.C),e.C=null)}function sn(e,t){var n=null;if(e.g==t){rn(e),tn(e),e.g=null;var r=2}else{if(!Xe(e.h,t))return;n=t.D,Ze(e.h,t),r=1}if(0!=e.G)if(t.o)if(1==r){n=t.m?t.m.length:0,t=Date.now()-t.F;var i=e.B;te(r=Ie(),new Se(r,n)),Qt(e)}else Zt(e);else if(3==(i=t.s)||0==i&&0<t.X||!(1==r&&function(e,t){return!(Je(e.h)>=e.h.j-(e.s?1:0)||(e.s?(e.i=t.D.concat(e.i),0):1==e.G||2==e.G||e.B>=(e.Va?0:e.Wa)||(e.s=Ce(u(e.Ga,e,t),on(e,e.B)),e.B++,0)))}(e,t)||2==r&&en(e)))switch(n&&0<n.length&&(t=e.h,t.i=t.i.concat(n)),i){case 1:an(e,5);break;case 4:an(e,10);break;case 3:an(e,6);break;default:an(e,2)}}function on(e,t){let n=e.Ta+Math.floor(Math.random()*e.cb);return e.isActive()||(n*=2),n*t}function an(e,t){if(e.j.info("Error code "+t),2==t){var n=u(e.fb,e),r=e.Xa;const t=!r;r=new rt(r||"//www.google.com/images/cleardot.gif"),i.location&&"http"==i.location.protocol||st(r,"https"),ut(r),t?function(e,t){const n=new ke;if(i.Image){const r=new Image;r.onload=l(Et,n,"TestLoadImage: loaded",!0,t,r),r.onerror=l(Et,n,"TestLoadImage: error",!1,t,r),r.onabort=l(Et,n,"TestLoadImage: abort",!1,t,r),r.ontimeout=l(Et,n,"TestLoadImage: timeout",!1,t,r),i.setTimeout(function(){r.ontimeout&&r.ontimeout()},1e4),r.src=e}else t(!1)}(r.toString(),n):function(e,t){new ke;const n=new AbortController,r=setTimeout(()=>{n.abort(),Et(0,0,!1,t)},1e4);fetch(e,{signal:n.signal}).then(e=>{clearTimeout(r),e.ok?Et(0,0,!0,t):Et(0,0,!1,t)}).catch(()=>{clearTimeout(r),Et(0,0,!1,t)})}(r.toString(),n)}else Ee(2);e.G=0,e.l&&e.l.sa(t),cn(e),Wt(e)}function cn(e){if(e.G=0,e.ka=[],e.l){const t=et(e.h);0==t.length&&0==e.i.length||(f(e.ka,t),f(e.ka,e.i),e.h.i.length=0,d(e.i),e.i.length=0),e.l.ra()}}function un(e,t,n){var r=n instanceof rt?it(n):new rt(n);if(""!=r.g)t&&(r.g=t+"."+r.g),ot(r,r.s);else{var s=i.location;r=s.protocol,t=t?t+"."+s.hostname:s.hostname,s=+s.port;var o=new rt(null);r&&st(o,r),t&&(o.g=t),s&&ot(o,s),n&&(o.l=n),r=o}return n=e.D,t=e.ya,n&&t&&ct(r,n,t),ct(r,"VER",e.la),Xt(e,r),r}function ln(e,t,n){if(t&&!e.J)throw Error("Can't create secondary domain capable XhrIo object.");return(t=e.Ca&&!e.pa?new Pt(new kt({eb:n})):new Pt(e.pa)).Ha(e.J),t}function hn(){}function dn(){}function fn(e,t){ee.call(this),this.g=new Gt(t),this.l=e,this.h=t&&t.messageUrlParams||null,e=t&&t.messageHeaders||null,t&&t.clientProtocolHeaderRequired&&(e?e["X-Client-Protocol"]="webchannel":e={"X-Client-Protocol":"webchannel"}),this.g.o=e,e=t&&t.initMessageHeaders||null,t&&t.messageContentType&&(e?e["X-WebChannel-Content-Type"]=t.messageContentType:e={"X-WebChannel-Content-Type":t.messageContentType}),t&&t.va&&(e?e["X-WebChannel-Client-Profile"]=t.va:e={"X-WebChannel-Client-Profile":t.va}),this.g.S=e,(e=t&&t.Sb)&&!p(e)&&(this.g.m=e),this.v=t&&t.supportsCrossDomainXhr||!1,this.u=t&&t.sendRawJson||!1,(t=t&&t.httpSessionIdParam)&&!p(t)&&(this.g.D=t,null!==(e=this.h)&&t in e&&t in(e=this.h)&&delete e[t]),this.j=new gn(this)}function pn(e){ge.call(this),e.__headers__&&(this.headers=e.__headers__,this.statusCode=e.__status__,delete e.__headers__,delete e.__status__);var t=e.__sm__;if(t){e:{for(const n in t){e=n;break e}e=void 0}(this.i=e)&&(e=this.i,t=null!==t&&e in t?t[e]:void 0),this.data=t}else this.data=e}function mn(){ye.call(this),this.status=1}function gn(e){this.g=e}(e=Pt.prototype).Ha=function(e){this.J=e},e.ea=function(e,t,n,r){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+e);t=t?t.toUpperCase():"GET",this.D=e,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():De.g(),this.v=this.o?fe(this.o):fe(De),this.g.onreadystatechange=u(this.Ea,this);try{this.B=!0,this.g.open(t,String(e),!0),this.B=!1}catch(o){return void Vt(this,o)}if(e=n||"",n=new Map(this.headers),r)if(Object.getPrototypeOf(r)===Object.prototype)for(var s in r)n.set(s,r[s]);else{if("function"!=typeof r.keys||"function"!=typeof r.get)throw Error("Unknown input type for opt_headers: "+String(r));for(const e of r.keys())n.set(e,r.get(e))}r=Array.from(n.keys()).find(e=>"content-type"==e.toLowerCase()),s=i.FormData&&e instanceof i.FormData,!(0<=Array.prototype.indexOf.call(Mt,t,void 0))||r||s||n.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[i,a]of n)this.g.setRequestHeader(i,a);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{jt(this),this.u=!0,this.g.send(e),this.u=!1}catch(o){Vt(this,o)}},e.abort=function(e){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=e||7,te(this,"complete"),te(this,"abort"),Bt(this))},e.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Bt(this,!0)),Pt.aa.N.call(this)},e.Ea=function(){this.s||(this.B||this.u||this.j?Ut(this):this.bb())},e.bb=function(){Ut(this)},e.isActive=function(){return!!this.g},e.Z=function(){try{return 2<qt(this)?this.g.status:-1}catch(e){return-1}},e.oa=function(){try{return this.g?this.g.responseText:""}catch(e){return""}},e.Oa=function(e){if(this.g){var t=this.g.responseText;return e&&0==t.indexOf(e)&&(t=t.substring(e.length)),le(t)}},e.Ba=function(){return this.m},e.Ka=function(){return"string"==typeof this.l?this.l:String(this.l)},(e=Gt.prototype).la=8,e.G=1,e.connect=function(e,t,n,r){Ee(0),this.W=e,this.H=t||{},n&&void 0!==r&&(this.H.OSID=n,this.H.OAID=r),this.F=this.X,this.I=un(this,null,this.W),Qt(this)},e.Ga=function(e){if(this.s)if(this.s=null,1==this.G){if(!e){this.U=Math.floor(1e5*Math.random()),e=this.U++;const i=new Oe(this,this.j,e);let s=this.o;if(this.S&&(s?(s=w(s),b(s,this.S)):s=this.S),null!==this.m||this.O||(i.H=s,s=null),this.P)e:{for(var t=0,n=0;n<this.i.length;n++){var r=this.i[n];if(void 0===(r="__data__"in r.map&&"string"==typeof(r=r.map.__data__)?r.length:void 0))break;if(4096<(t+=r)){t=n;break e}if(4096===t||n===this.i.length-1){t=n+1;break e}}t=1e3}else t=1e3;t=Yt(this,i,t),ct(n=it(this.I),"RID",e),ct(n,"CVER",22),this.D&&ct(n,"X-HTTP-Session-Id",this.D),Xt(this,n),s&&(this.O?t="headers="+encodeURIComponent(String(Rt(s)))+"&"+t:this.m&&Ot(n,this.m,s)),Ye(this.h,i),this.Ua&&ct(n,"TYPE","init"),this.P?(ct(n,"$req",t),ct(n,"SID","null"),i.T=!0,Ve(i,n,null)):Ve(i,n,t),this.G=2}}else 3==this.G&&(e?Jt(this,e):0==this.i.length||Qe(this.h)||Jt(this))},e.Fa=function(){if(this.u=null,nn(this),this.ba&&!(this.M||null==this.g||0>=this.R)){var e=2*this.R;this.j.info("BP detection timer enabled: "+e),this.A=Ce(u(this.ab,this),e)}},e.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Ee(10),Ht(this),nn(this))},e.Za=function(){null!=this.C&&(this.C=null,Ht(this),en(this),Ee(19))},e.fb=function(e){e?(this.j.info("Successfully pinged google.com"),Ee(2)):(this.j.info("Failed to ping google.com"),Ee(1))},e.isActive=function(){return!!this.l&&this.l.isActive(this)},(e=hn.prototype).ua=function(){},e.ta=function(){},e.sa=function(){},e.ra=function(){},e.isActive=function(){return!0},e.Na=function(){},dn.prototype.g=function(e,t){return new fn(e,t)},h(fn,ee),fn.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},fn.prototype.close=function(){$t(this.g)},fn.prototype.o=function(e){var t=this.g;if("string"==typeof e){var n={};n.__data__=e,e=n}else this.u&&((n={}).__data__=ue(e),e=n);t.i.push(new He(t.Ya++,e)),3==t.G&&Qt(t)},fn.prototype.N=function(){this.g.l=null,delete this.j,$t(this.g),delete this.g,fn.aa.N.call(this)},h(pn,ge),h(mn,ye),h(gn,hn),gn.prototype.ua=function(){te(this.g,"a")},gn.prototype.ta=function(e){te(this.g,new pn(e))},gn.prototype.sa=function(e){te(this.g,new mn)},gn.prototype.ra=function(){te(this.g,"b")},dn.prototype.createWebChannel=dn.prototype.g,fn.prototype.send=fn.prototype.o,fn.prototype.open=fn.prototype.m,fn.prototype.close=fn.prototype.close,Vr=function(){return new dn},Mr=function(){return Ie()},Lr=ve,Pr={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},xe.NO_ERROR=0,xe.TIMEOUT=8,xe.HTTP_ERROR=6,Or=xe,Ne.COMPLETE="complete",Rr=Ne,pe.EventType=me,me.OPEN="a",me.CLOSE="b",me.ERROR="c",me.MESSAGE="d",ee.prototype.listen=ee.prototype.K,Nr=pe,Pt.prototype.listenOnce=Pt.prototype.L,Pt.prototype.getLastError=Pt.prototype.Ka,Pt.prototype.getLastErrorCode=Pt.prototype.Ba,Pt.prototype.getStatus=Pt.prototype.Z,Pt.prototype.getResponseJson=Pt.prototype.Oa,Pt.prototype.getResponseText=Pt.prototype.oa,Pt.prototype.send=Pt.prototype.ea,Pt.prototype.setWithCredentials=Pt.prototype.Ha,xr=Pt}).apply(void 0!==Fr?Fr:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});const Ur="@firebase/firestore";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Br{constructor(e){this.uid=e}isAuthenticated(){return null!=this.uid}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Br.UNAUTHENTICATED=new Br(null),Br.GOOGLE_CREDENTIALS=new Br("google-credentials-uid"),Br.FIRST_PARTY=new Br("first-party-uid"),Br.MOCK_USER=new Br("mock-user");
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let jr="10.14.0";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qr=new O("@firebase/firestore");function zr(){return qr.logLevel}function Kr(e,...t){if(qr.logLevel<=k.DEBUG){const n=t.map(Hr);qr.debug(`Firestore (${jr}): ${e}`,...n)}}function Gr(e,...t){if(qr.logLevel<=k.ERROR){const n=t.map(Hr);qr.error(`Firestore (${jr}): ${e}`,...n)}}function $r(e,...t){if(qr.logLevel<=k.WARN){const n=t.map(Hr);qr.warn(`Firestore (${jr}): ${e}`,...n)}}function Hr(e){if("string"==typeof e)return e;try{
/**
    * @license
    * Copyright 2020 Google LLC
    *
    * Licensed under the Apache License, Version 2.0 (the "License");
    * you may not use this file except in compliance with the License.
    * You may obtain a copy of the License at
    *
    *   http://www.apache.org/licenses/LICENSE-2.0
    *
    * Unless required by applicable law or agreed to in writing, software
    * distributed under the License is distributed on an "AS IS" BASIS,
    * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    * See the License for the specific language governing permissions and
    * limitations under the License.
    */
return t=e,JSON.stringify(t)}catch(n){return e}var t}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wr(e="Unexpected state"){const t=`FIRESTORE (${jr}) INTERNAL ASSERTION FAILED: `+e;throw Gr(t),new Error(t)}function Qr(e,t){e||Wr()}function Jr(e,t){return e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xr={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class Yr extends p{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zr{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ei{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class ti{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Br.UNAUTHENTICATED))}shutdown(){}}class ni{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class ri{constructor(e){this.t=e,this.currentUser=Br.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){Qr(void 0===this.o);let n=this.i;const r=e=>this.i!==n?(n=this.i,t(e)):Promise.resolve();let i=new Zr;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new Zr,e.enqueueRetryable(()=>r(this.currentUser))};const s=()=>{const t=i;e.enqueueRetryable(async()=>{await t.promise,await r(this.currentUser)})},o=e=>{Kr("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=e,this.o&&(this.auth.addAuthTokenListener(this.o),s())};this.t.onInit(e=>o(e)),setTimeout(()=>{if(!this.auth){const e=this.t.getImmediate({optional:!0});e?o(e):(Kr("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new Zr)}},0),s()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(t=>this.i!==e?(Kr("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):t?(Qr("string"==typeof t.accessToken),new ei(t.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return Qr(null===e||"string"==typeof e),new Br(e)}}class ii{constructor(e,t,n){this.l=e,this.h=t,this.P=n,this.type="FirstParty",this.user=Br.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class si{constructor(e,t,n){this.l=e,this.h=t,this.P=n}getToken(){return Promise.resolve(new ii(this.l,this.h,this.P))}start(e,t){e.enqueueRetryable(()=>t(Br.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class oi{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class ai{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,t){Qr(void 0===this.o);const n=e=>{null!=e.error&&Kr("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${e.error.message}`);const n=e.token!==this.R;return this.R=e.token,Kr("FirebaseAppCheckTokenProvider",`Received ${n?"new":"existing"} token.`),n?t(e.token):Promise.resolve()};this.o=t=>{e.enqueueRetryable(()=>n(t))};const r=e=>{Kr("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=e,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit(e=>r(e)),setTimeout(()=>{if(!this.appCheck){const e=this.A.getImmediate({optional:!0});e?r(e):Kr("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(e=>e?(Qr("string"==typeof e.token),this.R=e.token,new oi(e.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ci(e){const t="undefined"!=typeof self&&(self.crypto||self.msCrypto),n=new Uint8Array(e);if(t&&"function"==typeof t.getRandomValues)t.getRandomValues(n);else for(let r=0;r<e;r++)n[r]=Math.floor(256*Math.random());return n}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ui{static newId(){const e=62*Math.floor(256/62);let t="";for(;t.length<20;){const n=ci(40);for(let r=0;r<n.length;++r)t.length<20&&n[r]<e&&(t+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(n[r]%62))}return t}}function li(e,t){return e<t?-1:e>t?1:0}function hi(e,t,n){return e.length===t.length&&e.every((e,r)=>n(e,t[r]))}function di(e){return e+"\0"}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fi{constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new Yr(Xr.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new Yr(Xr.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<-62135596800)throw new Yr(Xr.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new Yr(Xr.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}static now(){return fi.fromMillis(Date.now())}static fromDate(e){return fi.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor(1e6*(e-1e3*t));return new fi(t,n)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?li(this.nanoseconds,e.nanoseconds):li(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const e=this.seconds- -62135596800;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pi{constructor(e){this.timestamp=e}static fromTimestamp(e){return new pi(e)}static min(){return new pi(new fi(0,0))}static max(){return new pi(new fi(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mi{constructor(e,t,n){void 0===t?t=0:t>e.length&&Wr(),void 0===n?n=e.length-t:n>e.length-t&&Wr(),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return 0===mi.comparator(this,e)}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof mi?e.forEach(e=>{t.push(e)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=void 0===e?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return 0===this.length}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let r=0;r<n;r++){const n=e.get(r),i=t.get(r);if(n<i)return-1;if(n>i)return 1}return e.length<t.length?-1:e.length>t.length?1:0}}class gi extends mi{construct(e,t,n){return new gi(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new Yr(Xr.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(e=>e.length>0))}return new gi(t)}static emptyPath(){return new gi([])}}const yi=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class vi extends mi{construct(e,t,n){return new vi(e,t,n)}static isValidIdentifier(e){return yi.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),vi.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return 1===this.length&&"__name__"===this.get(0)}static keyField(){return new vi(["__name__"])}static fromServerFormat(e){const t=[];let n="",r=0;const i=()=>{if(0===n.length)throw new Yr(Xr.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let s=!1;for(;r<e.length;){const t=e[r];if("\\"===t){if(r+1===e.length)throw new Yr(Xr.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const t=e[r+1];if("\\"!==t&&"."!==t&&"`"!==t)throw new Yr(Xr.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=t,r+=2}else"`"===t?(s=!s,r++):"."!==t||s?(n+=t,r++):(i(),r++)}if(i(),s)throw new Yr(Xr.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new vi(t)}static emptyPath(){return new vi([])}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wi{constructor(e){this.path=e}static fromPath(e){return new wi(gi.fromString(e))}static fromName(e){return new wi(gi.fromString(e).popFirst(5))}static empty(){return new wi(gi.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return null!==e&&0===gi.comparator(this.path,e.path)}toString(){return this.path.toString()}static comparator(e,t){return gi.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new wi(new gi(e.slice()))}}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ii{constructor(e,t,n,r){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=r}}function bi(e){return e.fields.find(e=>2===e.kind)}function _i(e){return e.fields.filter(e=>2!==e.kind)}Ii.UNKNOWN_ID=-1;class Ti{constructor(e,t){this.fieldPath=e,this.kind=t}}class Ei{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Ei(0,Ci.min())}}function Si(e){return new Ci(e.readTime,e.key,-1)}class Ci{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new Ci(pi.min(),wi.empty(),-1)}static max(){return new Ci(pi.max(),wi.empty(),-1)}}function ki(e,t){let n=e.readTime.compareTo(t.readTime);return 0!==n?n:(n=wi.comparator(e.documentKey,t.documentKey),0!==n?n:li(e.largestBatchId,t.largestBatchId)
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */)}const Ai="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Di{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xi(e){if(e.code!==Xr.FAILED_PRECONDITION||e.message!==Ai)throw e;Kr("LocalStore","Unexpectedly lost primary lease")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ni{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)},e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&Wr(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new Ni((n,r)=>{this.nextCallback=t=>{this.wrapSuccess(e,t).next(n,r)},this.catchCallback=e=>{this.wrapFailure(t,e).next(n,r)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof Ni?t:Ni.resolve(t)}catch(t){return Ni.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):Ni.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):Ni.reject(t)}static resolve(e){return new Ni((t,n)=>{t(e)})}static reject(e){return new Ni((t,n)=>{n(e)})}static waitFor(e){return new Ni((t,n)=>{let r=0,i=0,s=!1;e.forEach(e=>{++r,e.next(()=>{++i,s&&i===r&&t()},e=>n(e))}),s=!0,i===r&&t()})}static or(e){let t=Ni.resolve(!1);for(const n of e)t=t.next(e=>e?Ni.resolve(e):n());return t}static forEach(e,t){const n=[];return e.forEach((e,r)=>{n.push(t.call(this,e,r))}),this.waitFor(n)}static mapArray(e,t){return new Ni((n,r)=>{const i=e.length,s=new Array(i);let o=0;for(let a=0;a<i;a++){const c=a;t(e[c]).next(e=>{s[c]=e,++o,o===i&&n(s)},e=>r(e))}})}static doWhile(e,t){return new Ni((n,r)=>{const i=()=>{!0===e()?t().next(()=>{i()},r):n()};i()})}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ri{constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.V=new Zr,this.transaction.oncomplete=()=>{this.V.resolve()},this.transaction.onabort=()=>{t.error?this.V.reject(new Mi(e,t.error)):this.V.resolve()},this.transaction.onerror=t=>{const n=ji(t.target.error);this.V.reject(new Mi(e,n))}}static open(e,t,n,r){try{return new Ri(t,e.transaction(r,n))}catch(i){throw new Mi(t,i)}}get m(){return this.V.promise}abort(e){e&&this.V.reject(e),this.aborted||(Kr("SimpleDb","Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}g(){const e=this.transaction;this.aborted||"function"!=typeof e.commit||e.commit()}store(e){const t=this.transaction.objectStore(e);return new Fi(t)}}class Oi{constructor(e,t,n){this.name=e,this.version=t,this.p=n,12.2===Oi.S(h())&&Gr("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}static delete(e){return Kr("SimpleDb","Removing database:",e),Ui(window.indexedDB.deleteDatabase(e)).toPromise()}static D(){if(!f())return!1;if(Oi.v())return!0;const e=h(),t=Oi.S(e),n=0<t&&t<10,r=Pi(e),i=0<r&&r<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||i)}static v(){var e;return"undefined"!=typeof process&&"YES"===(null===(e=process.__PRIVATE_env)||void 0===e?void 0:e.C)}static F(e,t){return e.store(t)}static S(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}async M(e){return this.db||(Kr("SimpleDb","Opening database:",this.name),this.db=await new Promise((t,n)=>{const r=indexedDB.open(this.name,this.version);r.onsuccess=e=>{const n=e.target.result;t(n)},r.onblocked=()=>{n(new Mi(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},r.onerror=t=>{const r=t.target.error;"VersionError"===r.name?n(new Yr(Xr.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):"InvalidStateError"===r.name?n(new Yr(Xr.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+r)):n(new Mi(e,r))},r.onupgradeneeded=e=>{Kr("SimpleDb",'Database "'+this.name+'" requires upgrade from version:',e.oldVersion);const t=e.target.result;this.p.O(t,r.transaction,e.oldVersion,this.version).next(()=>{Kr("SimpleDb","Database upgrade to version "+this.version+" complete")})}})),this.N&&(this.db.onversionchange=e=>this.N(e)),this.db}L(e){this.N=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,r){const i="readonly"===t;let s=0;for(;;){++s;try{this.db=await this.M(e);const t=Ri.open(this.db,e,i?"readonly":"readwrite",n),s=r(t).next(e=>(t.g(),e)).catch(e=>(t.abort(e),Ni.reject(e))).toPromise();return s.catch(()=>{}),await t.m,s}catch(o){const e=o,t="FirebaseError"!==e.name&&s<3;if(Kr("SimpleDb","Transaction failed with error:",e.message,"Retrying:",t),this.close(),!t)return Promise.reject(e)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Pi(e){const t=e.match(/Android ([\d.]+)/i),n=t?t[1].split(".").slice(0,2).join("."):"-1";return Number(n)}class Li{constructor(e){this.B=e,this.k=!1,this.q=null}get isDone(){return this.k}get K(){return this.q}set cursor(e){this.B=e}done(){this.k=!0}$(e){this.q=e}delete(){return Ui(this.B.delete())}}class Mi extends Yr{constructor(e,t){super(Xr.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Vi(e){return"IndexedDbTransactionError"===e.name}class Fi{constructor(e){this.store=e}put(e,t){let n;return void 0!==t?(Kr("SimpleDb","PUT",this.store.name,e,t),n=this.store.put(t,e)):(Kr("SimpleDb","PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),Ui(n)}add(e){return Kr("SimpleDb","ADD",this.store.name,e,e),Ui(this.store.add(e))}get(e){return Ui(this.store.get(e)).next(t=>(void 0===t&&(t=null),Kr("SimpleDb","GET",this.store.name,e,t),t))}delete(e){return Kr("SimpleDb","DELETE",this.store.name,e),Ui(this.store.delete(e))}count(){return Kr("SimpleDb","COUNT",this.store.name),Ui(this.store.count())}U(e,t){const n=this.options(e,t),r=n.index?this.store.index(n.index):this.store;if("function"==typeof r.getAll){const e=r.getAll(n.range);return new Ni((t,n)=>{e.onerror=e=>{n(e.target.error)},e.onsuccess=e=>{t(e.target.result)}})}{const e=this.cursor(n),t=[];return this.W(e,(e,n)=>{t.push(n)}).next(()=>t)}}G(e,t){const n=this.store.getAll(e,null===t?void 0:t);return new Ni((e,t)=>{n.onerror=e=>{t(e.target.error)},n.onsuccess=t=>{e(t.target.result)}})}j(e,t){Kr("SimpleDb","DELETE ALL",this.store.name);const n=this.options(e,t);n.H=!1;const r=this.cursor(n);return this.W(r,(e,t,n)=>n.delete())}J(e,t){let n;t?n=e:(n={},t=e);const r=this.cursor(n);return this.W(r,t)}Y(e){const t=this.cursor({});return new Ni((n,r)=>{t.onerror=e=>{const t=ji(e.target.error);r(t)},t.onsuccess=t=>{const r=t.target.result;r?e(r.primaryKey,r.value).next(e=>{e?r.continue():n()}):n()}})}W(e,t){const n=[];return new Ni((r,i)=>{e.onerror=e=>{i(e.target.error)},e.onsuccess=e=>{const i=e.target.result;if(!i)return void r();const s=new Li(i),o=t(i.primaryKey,i.value,s);if(o instanceof Ni){const e=o.catch(e=>(s.done(),Ni.reject(e)));n.push(e)}s.isDone?r():null===s.K?i.continue():i.continue(s.K)}}).next(()=>Ni.waitFor(n))}options(e,t){let n;return void 0!==e&&("string"==typeof e?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.H?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Ui(e){return new Ni((t,n)=>{e.onsuccess=e=>{const n=e.target.result;t(n)},e.onerror=e=>{const t=ji(e.target.error);n(t)}})}let Bi=!1;function ji(e){const t=Oi.S(h());if(t>=12.2&&t<13){const t="An internal error was encountered in the Indexed Database server";if(e.message.indexOf(t)>=0){const e=new Yr("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Bi||(Bi=!0,setTimeout(()=>{throw e},0)),e}}return e}class qi{constructor(e,t){this.asyncQueue=e,this.Z=t,this.task=null}start(){this.X(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return null!==this.task}X(e){Kr("IndexBackfiller",`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{Kr("IndexBackfiller",`Documents written: ${await this.Z.ee()}`)}catch(e){Vi(e)?Kr("IndexBackfiller","Ignoring IndexedDB error during index backfill: ",e):await xi(e)}await this.X(6e4)})}}class zi{constructor(e,t){this.localStore=e,this.persistence=t}async ee(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.te(t,e))}te(e,t){const n=new Set;let r=t,i=!0;return Ni.doWhile(()=>!0===i&&r>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(t=>{if(null!==t&&!n.has(t))return Kr("IndexBackfiller",`Processing collection: ${t}`),this.ne(e,t,r).next(e=>{r-=e,n.add(t)});i=!1})).next(()=>t-r)}ne(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(r=>this.localStore.localDocuments.getNextDocuments(e,t,r,n).next(n=>{const i=n.changes;return this.localStore.indexManager.updateIndexEntries(e,i).next(()=>this.re(r,n)).next(n=>(Kr("IndexBackfiller",`Updating offset: ${n}`),this.localStore.indexManager.updateCollectionGroup(e,t,n))).next(()=>i.size)}))}re(e,t){let n=e;return t.changes.forEach((e,t)=>{const r=Si(t);ki(r,n)>0&&(n=r)}),new Ci(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ki{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=e=>this.ie(e),this.se=e=>t.writeSequenceNumber(e))}ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.se&&this.se(e),e}}function Gi(e){return null==e}function $i(e){return 0===e&&1/e==-1/0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Hi(e){let t="";for(let n=0;n<e.length;n++)t.length>0&&(t=Qi(t)),t=Wi(e.get(n),t);return Qi(t)}function Wi(e,t){let n=t;const r=e.length;for(let i=0;i<r;i++){const t=e.charAt(i);switch(t){case"\0":n+="";break;case"":n+="";break;default:n+=t}}return n}function Qi(e){return e+""}function Ji(e){const t=e.length;if(Qr(t>=2),2===t)return Qr(""===e.charAt(0)&&""===e.charAt(1)),gi.emptyPath();const n=t-2,r=[];let i="";for(let s=0;s<t;){const t=e.indexOf("",s);switch((t<0||t>n)&&Wr(),e.charAt(t+1)){case"":const n=e.substring(s,t);let o;0===i.length?o=n:(i+=n,o=i,i=""),r.push(o);break;case"":i+=e.substring(s,t),i+="\0";break;case"":i+=e.substring(s,t+1);break;default:Wr()}s=t+2}return new gi(r)}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ki.oe=-1;const Xi=["userId","batchId"];
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yi(e,t){return[e,Hi(t)]}function Zi(e,t,n){return[e,Hi(t),n]}const es={},ts=["prefixPath","collectionGroup","readTime","documentId"],ns=["prefixPath","collectionGroup","documentId"],rs=["collectionGroup","readTime","prefixPath","documentId"],is=["canonicalId","targetId"],ss=["targetId","path"],os=["path","targetId"],as=["collectionId","parent"],cs=["indexId","uid"],us=["uid","sequenceNumber"],ls=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],hs=["indexId","uid","orderedDocumentKey"],ds=["userId","collectionPath","documentId"],fs=["userId","collectionPath","largestBatchId"],ps=["userId","collectionGroup","largestBatchId"],ms=["mutationQueues","mutations","documentMutations","remoteDocuments","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries"],gs=[...ms,"documentOverlays"],ys=["mutationQueues","mutations","documentMutations","remoteDocumentsV14","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries","documentOverlays"],vs=ys,ws=[...vs,"indexConfiguration","indexState","indexEntries"],Is=ws,bs=[...ws,"globals"];
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _s extends Di{constructor(e,t){super(),this._e=e,this.currentSequenceNumber=t}}function Ts(e,t){const n=Jr(e);return Oi.F(n._e,t)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Es(e){let t=0;for(const n in e)Object.prototype.hasOwnProperty.call(e,n)&&t++;return t}function Ss(e,t){for(const n in e)Object.prototype.hasOwnProperty.call(e,n)&&t(n,e[n])}function Cs(e){for(const t in e)if(Object.prototype.hasOwnProperty.call(e,t))return!1;return!0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ks{constructor(e,t){this.comparator=e,this.root=t||Ds.EMPTY}insert(e,t){return new ks(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Ds.BLACK,null,null))}remove(e){return new ks(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Ds.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(0===n)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const r=this.comparator(e,n.key);if(0===r)return t+n.left.size;r<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new As(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new As(this.root,e,this.comparator,!1)}getReverseIterator(){return new As(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new As(this.root,e,this.comparator,!0)}}class As{constructor(e,t,n,r){this.isReverse=r,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?n(e.key,t):1,t&&r&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(0===i){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(0===this.nodeStack.length)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Ds{constructor(e,t,n,r,i){this.key=e,this.value=t,this.color=null!=n?n:Ds.RED,this.left=null!=r?r:Ds.EMPTY,this.right=null!=i?i:Ds.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,r,i){return new Ds(null!=e?e:this.key,null!=t?t:this.value,null!=n?n:this.color,null!=r?r:this.left,null!=i?i:this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let r=this;const i=n(e,r.key);return r=i<0?r.copy(null,null,null,r.left.insert(e,t,n),null):0===i?r.copy(null,t,null,null,null):r.copy(null,null,null,null,r.right.insert(e,t,n)),r.fixUp()}removeMin(){if(this.left.isEmpty())return Ds.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,r=this;if(t(e,r.key)<0)r.left.isEmpty()||r.left.isRed()||r.left.left.isRed()||(r=r.moveRedLeft()),r=r.copy(null,null,null,r.left.remove(e,t),null);else{if(r.left.isRed()&&(r=r.rotateRight()),r.right.isEmpty()||r.right.isRed()||r.right.left.isRed()||(r=r.moveRedRight()),0===t(e,r.key)){if(r.right.isEmpty())return Ds.EMPTY;n=r.right.min(),r=r.copy(n.key,n.value,null,null,r.right.removeMin())}r=r.copy(null,null,null,null,r.right.remove(e,t))}return r.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Ds.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Ds.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw Wr();if(this.right.isRed())throw Wr();const e=this.left.check();if(e!==this.right.check())throw Wr();return e+(this.isRed()?0:1)}}Ds.EMPTY=null,Ds.RED=!0,Ds.BLACK=!1,Ds.EMPTY=new class{constructor(){this.size=0}get key(){throw Wr()}get value(){throw Wr()}get color(){throw Wr()}get left(){throw Wr()}get right(){throw Wr()}copy(e,t,n,r,i){return this}insert(e,t,n){return new Ds(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class xs{constructor(e){this.comparator=e,this.data=new ks(this.comparator)}has(e){return null!==this.data.get(e)}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const r=n.getNext();if(this.comparator(r.key,e[1])>=0)return;t(r.key)}}forEachWhile(e,t){let n;for(n=void 0!==t?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Ns(this.data.getIterator())}getIteratorFrom(e){return new Ns(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(e=>{t=t.add(e)}),t}isEqual(e){if(!(e instanceof xs))return!1;if(this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const e=t.getNext().key,r=n.getNext().key;if(0!==this.comparator(e,r))return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new xs(this.comparator);return t.data=e,t}}class Ns{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Rs(e){return e.hasNext()?e.getNext():void 0}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Os{constructor(e){this.fields=e,e.sort(vi.comparator)}static empty(){return new Os([])}unionWith(e){let t=new xs(vi.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new Os(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return hi(this.fields,e.fields,(e,t)=>e.isEqual(t))}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ps extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ls{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(e){try{return atob(e)}catch(t){throw"undefined"!=typeof DOMException&&t instanceof DOMException?new Ps("Invalid base64 string: "+t):t}}(e);return new Ls(t)}static fromUint8Array(e){const t=function(e){let t="";for(let n=0;n<e.length;++n)t+=String.fromCharCode(e[n]);return t}(e);return new Ls(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return e=this.binaryString,btoa(e);var e}toUint8Array(){return function(e){const t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return li(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ls.EMPTY_BYTE_STRING=new Ls("");const Ms=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Vs(e){if(Qr(!!e),"string"==typeof e){let t=0;const n=Ms.exec(e);if(Qr(!!n),n[1]){let e=n[1];e=(e+"000000000").substr(0,9),t=Number(e)}const r=new Date(e);return{seconds:Math.floor(r.getTime()/1e3),nanos:t}}return{seconds:Fs(e.seconds),nanos:Fs(e.nanos)}}function Fs(e){return"number"==typeof e?e:"string"==typeof e?Number(e):0}function Us(e){return"string"==typeof e?Ls.fromBase64String(e):Ls.fromUint8Array(e)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bs(e){var t,n;return"server_timestamp"===(null===(n=((null===(t=null==e?void 0:e.mapValue)||void 0===t?void 0:t.fields)||{}).__type__)||void 0===n?void 0:n.stringValue)}function js(e){const t=e.mapValue.fields.__previous_value__;return Bs(t)?js(t):t}function qs(e){const t=Vs(e.mapValue.fields.__local_write_time__.timestampValue);return new fi(t.seconds,t.nanos)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zs{constructor(e,t,n,r,i,s,o,a,c){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=r,this.ssl=i,this.forceLongPolling=s,this.autoDetectLongPolling=o,this.longPollingOptions=a,this.useFetchStreams=c}}class Ks{constructor(e,t){this.projectId=e,this.database=t||"(default)"}static empty(){return new Ks("","")}get isDefaultDatabase(){return"(default)"===this.database}isEqual(e){return e instanceof Ks&&e.projectId===this.projectId&&e.database===this.database}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gs={mapValue:{fields:{__type__:{stringValue:"__max__"}}}},$s={nullValue:"NULL_VALUE"};function Hs(e){return"nullValue"in e?0:"booleanValue"in e?1:"integerValue"in e||"doubleValue"in e?2:"timestampValue"in e?3:"stringValue"in e?5:"bytesValue"in e?6:"referenceValue"in e?7:"geoPointValue"in e?8:"arrayValue"in e?9:"mapValue"in e?Bs(e)?4:uo(e)?9007199254740991:ao(e)?10:11:Wr()}function Ws(e,t){if(e===t)return!0;const n=Hs(e);if(n!==Hs(t))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return e.booleanValue===t.booleanValue;case 4:return qs(e).isEqual(qs(t));case 3:return function(e,t){if("string"==typeof e.timestampValue&&"string"==typeof t.timestampValue&&e.timestampValue.length===t.timestampValue.length)return e.timestampValue===t.timestampValue;const n=Vs(e.timestampValue),r=Vs(t.timestampValue);return n.seconds===r.seconds&&n.nanos===r.nanos}(e,t);case 5:return e.stringValue===t.stringValue;case 6:return r=t,Us(e.bytesValue).isEqual(Us(r.bytesValue));case 7:return e.referenceValue===t.referenceValue;case 8:return function(e,t){return Fs(e.geoPointValue.latitude)===Fs(t.geoPointValue.latitude)&&Fs(e.geoPointValue.longitude)===Fs(t.geoPointValue.longitude)}(e,t);case 2:return function(e,t){if("integerValue"in e&&"integerValue"in t)return Fs(e.integerValue)===Fs(t.integerValue);if("doubleValue"in e&&"doubleValue"in t){const n=Fs(e.doubleValue),r=Fs(t.doubleValue);return n===r?$i(n)===$i(r):isNaN(n)&&isNaN(r)}return!1}(e,t);case 9:return hi(e.arrayValue.values||[],t.arrayValue.values||[],Ws);case 10:case 11:return function(e,t){const n=e.mapValue.fields||{},r=t.mapValue.fields||{};if(Es(n)!==Es(r))return!1;for(const i in n)if(n.hasOwnProperty(i)&&(void 0===r[i]||!Ws(n[i],r[i])))return!1;return!0}(e,t);default:return Wr()}var r}function Qs(e,t){return void 0!==(e.values||[]).find(e=>Ws(e,t))}function Js(e,t){if(e===t)return 0;const n=Hs(e),r=Hs(t);if(n!==r)return li(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return li(e.booleanValue,t.booleanValue);case 2:return function(e,t){const n=Fs(e.integerValue||e.doubleValue),r=Fs(t.integerValue||t.doubleValue);return n<r?-1:n>r?1:n===r?0:isNaN(n)?isNaN(r)?0:-1:1}(e,t);case 3:return Xs(e.timestampValue,t.timestampValue);case 4:return Xs(qs(e),qs(t));case 5:return li(e.stringValue,t.stringValue);case 6:return function(e,t){const n=Us(e),r=Us(t);return n.compareTo(r)}(e.bytesValue,t.bytesValue);case 7:return function(e,t){const n=e.split("/"),r=t.split("/");for(let i=0;i<n.length&&i<r.length;i++){const e=li(n[i],r[i]);if(0!==e)return e}return li(n.length,r.length)}(e.referenceValue,t.referenceValue);case 8:return function(e,t){const n=li(Fs(e.latitude),Fs(t.latitude));return 0!==n?n:li(Fs(e.longitude),Fs(t.longitude))}(e.geoPointValue,t.geoPointValue);case 9:return Ys(e.arrayValue,t.arrayValue);case 10:return function(e,t){var n,r,i,s;const o=e.fields||{},a=t.fields||{},c=null===(n=o.value)||void 0===n?void 0:n.arrayValue,u=null===(r=a.value)||void 0===r?void 0:r.arrayValue,l=li((null===(i=null==c?void 0:c.values)||void 0===i?void 0:i.length)||0,(null===(s=null==u?void 0:u.values)||void 0===s?void 0:s.length)||0);return 0!==l?l:Ys(c,u)}(e.mapValue,t.mapValue);case 11:return function(e,t){if(e===Gs.mapValue&&t===Gs.mapValue)return 0;if(e===Gs.mapValue)return 1;if(t===Gs.mapValue)return-1;const n=e.fields||{},r=Object.keys(n),i=t.fields||{},s=Object.keys(i);r.sort(),s.sort();for(let o=0;o<r.length&&o<s.length;++o){const e=li(r[o],s[o]);if(0!==e)return e;const t=Js(n[r[o]],i[s[o]]);if(0!==t)return t}return li(r.length,s.length)}(e.mapValue,t.mapValue);default:throw Wr()}}function Xs(e,t){if("string"==typeof e&&"string"==typeof t&&e.length===t.length)return li(e,t);const n=Vs(e),r=Vs(t),i=li(n.seconds,r.seconds);return 0!==i?i:li(n.nanos,r.nanos)}function Ys(e,t){const n=e.values||[],r=t.values||[];for(let i=0;i<n.length&&i<r.length;++i){const e=Js(n[i],r[i]);if(e)return e}return li(n.length,r.length)}function Zs(e){return eo(e)}function eo(e){return"nullValue"in e?"null":"booleanValue"in e?""+e.booleanValue:"integerValue"in e?""+e.integerValue:"doubleValue"in e?""+e.doubleValue:"timestampValue"in e?function(e){const t=Vs(e);return`time(${t.seconds},${t.nanos})`}(e.timestampValue):"stringValue"in e?e.stringValue:"bytesValue"in e?Us(e.bytesValue).toBase64():"referenceValue"in e?(t=e.referenceValue,wi.fromName(t).toString()):"geoPointValue"in e?function(e){return`geo(${e.latitude},${e.longitude})`}(e.geoPointValue):"arrayValue"in e?function(e){let t="[",n=!0;for(const r of e.values||[])n?n=!1:t+=",",t+=eo(r);return t+"]"}(e.arrayValue):"mapValue"in e?function(e){const t=Object.keys(e.fields||{}).sort();let n="{",r=!0;for(const i of t)r?r=!1:n+=",",n+=`${i}:${eo(e.fields[i])}`;return n+"}"}(e.mapValue):Wr();var t}function to(e,t){return{referenceValue:`projects/${e.projectId}/databases/${e.database}/documents/${t.path.canonicalString()}`}}function no(e){return!!e&&"integerValue"in e}function ro(e){return!!e&&"arrayValue"in e}function io(e){return!!e&&"nullValue"in e}function so(e){return!!e&&"doubleValue"in e&&isNaN(Number(e.doubleValue))}function oo(e){return!!e&&"mapValue"in e}function ao(e){var t,n;return"__vector__"===(null===(n=((null===(t=null==e?void 0:e.mapValue)||void 0===t?void 0:t.fields)||{}).__type__)||void 0===n?void 0:n.stringValue)}function co(e){if(e.geoPointValue)return{geoPointValue:Object.assign({},e.geoPointValue)};if(e.timestampValue&&"object"==typeof e.timestampValue)return{timestampValue:Object.assign({},e.timestampValue)};if(e.mapValue){const t={mapValue:{fields:{}}};return Ss(e.mapValue.fields,(e,n)=>t.mapValue.fields[e]=co(n)),t}if(e.arrayValue){const t={arrayValue:{values:[]}};for(let n=0;n<(e.arrayValue.values||[]).length;++n)t.arrayValue.values[n]=co(e.arrayValue.values[n]);return t}return Object.assign({},e)}function uo(e){return"__max__"===(((e.mapValue||{}).fields||{}).__type__||{}).stringValue}const lo={mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{}}}}};function ho(e){return"nullValue"in e?$s:"booleanValue"in e?{booleanValue:!1}:"integerValue"in e||"doubleValue"in e?{doubleValue:NaN}:"timestampValue"in e?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in e?{stringValue:""}:"bytesValue"in e?{bytesValue:""}:"referenceValue"in e?to(Ks.empty(),wi.empty()):"geoPointValue"in e?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in e?{arrayValue:{}}:"mapValue"in e?ao(e)?lo:{mapValue:{}}:Wr()}function fo(e){return"nullValue"in e?{booleanValue:!1}:"booleanValue"in e?{doubleValue:NaN}:"integerValue"in e||"doubleValue"in e?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in e?{stringValue:""}:"stringValue"in e?{bytesValue:""}:"bytesValue"in e?to(Ks.empty(),wi.empty()):"referenceValue"in e?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in e?{arrayValue:{}}:"arrayValue"in e?lo:"mapValue"in e?ao(e)?{mapValue:{}}:Gs:Wr()}function po(e,t){const n=Js(e.value,t.value);return 0!==n?n:e.inclusive&&!t.inclusive?-1:!e.inclusive&&t.inclusive?1:0}function mo(e,t){const n=Js(e.value,t.value);return 0!==n?n:e.inclusive&&!t.inclusive?1:!e.inclusive&&t.inclusive?-1:0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class go{constructor(e){this.value=e}static empty(){return new go({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!oo(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=co(t)}setAll(e){let t=vi.emptyPath(),n={},r=[];e.forEach((e,i)=>{if(!t.isImmediateParentOf(i)){const e=this.getFieldsMap(t);this.applyChanges(e,n,r),n={},r=[],t=i.popLast()}e?n[i.lastSegment()]=co(e):r.push(i.lastSegment())});const i=this.getFieldsMap(t);this.applyChanges(i,n,r)}delete(e){const t=this.field(e.popLast());oo(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Ws(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let r=t.mapValue.fields[e.get(n)];oo(r)&&r.mapValue.fields||(r={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=r),t=r}return t.mapValue.fields}applyChanges(e,t,n){Ss(t,(t,n)=>e[t]=n);for(const r of n)delete e[r]}clone(){return new go(co(this.value))}}function yo(e){const t=[];return Ss(e.fields,(e,n)=>{const r=new vi([e]);if(oo(n)){const e=yo(n.mapValue).fields;if(0===e.length)t.push(r);else for(const n of e)t.push(r.child(n))}else t.push(r)}),new Os(t)
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class vo{constructor(e,t,n,r,i,s,o){this.key=e,this.documentType=t,this.version=n,this.readTime=r,this.createTime=i,this.data=s,this.documentState=o}static newInvalidDocument(e){return new vo(e,0,pi.min(),pi.min(),pi.min(),go.empty(),0)}static newFoundDocument(e,t,n,r){return new vo(e,1,t,pi.min(),n,r,0)}static newNoDocument(e,t){return new vo(e,2,t,pi.min(),pi.min(),go.empty(),0)}static newUnknownDocument(e,t){return new vo(e,3,t,pi.min(),pi.min(),go.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(pi.min())||2!==this.documentType&&0!==this.documentType||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=go.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=go.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=pi.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return 1===this.documentState}get hasCommittedMutations(){return 2===this.documentState}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return 0!==this.documentType}isFoundDocument(){return 1===this.documentType}isNoDocument(){return 2===this.documentType}isUnknownDocument(){return 3===this.documentType}isEqual(e){return e instanceof vo&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new vo(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wo{constructor(e,t){this.position=e,this.inclusive=t}}function Io(e,t,n){let r=0;for(let i=0;i<e.position.length;i++){const s=t[i],o=e.position[i];if(r=s.field.isKeyField()?wi.comparator(wi.fromName(o.referenceValue),n.key):Js(o,n.data.field(s.field)),"desc"===s.dir&&(r*=-1),0!==r)break}return r}function bo(e,t){if(null===e)return null===t;if(null===t)return!1;if(e.inclusive!==t.inclusive||e.position.length!==t.position.length)return!1;for(let n=0;n<e.position.length;n++)if(!Ws(e.position[n],t.position[n]))return!1;return!0}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _o{constructor(e,t="asc"){this.field=e,this.dir=t}}function To(e,t){return e.dir===t.dir&&e.field.isEqual(t.field)}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Eo{}class So extends Eo{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?"in"===t||"not-in"===t?this.createKeyFieldInFilter(e,t,n):new Lo(e,t,n):"array-contains"===t?new Uo(e,n):"in"===t?new Bo(e,n):"not-in"===t?new jo(e,n):"array-contains-any"===t?new qo(e,n):new So(e,t,n)}static createKeyFieldInFilter(e,t,n){return"in"===t?new Mo(e,n):new Vo(e,n)}matches(e){const t=e.data.field(this.field);return"!="===this.op?null!==t&&this.matchesComparison(Js(t,this.value)):null!==t&&Hs(this.value)===Hs(t)&&this.matchesComparison(Js(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return 0===e;case"!=":return 0!==e;case">":return e>0;case">=":return e>=0;default:return Wr()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Co extends Eo{constructor(e,t){super(),this.filters=e,this.op=t,this.ae=null}static create(e,t){return new Co(e,t)}matches(e){return ko(this)?void 0===this.filters.find(t=>!t.matches(e)):void 0!==this.filters.find(t=>t.matches(e))}getFlattenedFilters(){return null!==this.ae||(this.ae=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function ko(e){return"and"===e.op}function Ao(e){return"or"===e.op}function Do(e){return xo(e)&&ko(e)}function xo(e){for(const t of e.filters)if(t instanceof Co)return!1;return!0}function No(e){if(e instanceof So)return e.field.canonicalString()+e.op.toString()+Zs(e.value);if(Do(e))return e.filters.map(e=>No(e)).join(",");{const t=e.filters.map(e=>No(e)).join(",");return`${e.op}(${t})`}}function Ro(e,t){return e instanceof So?(n=e,(r=t)instanceof So&&n.op===r.op&&n.field.isEqual(r.field)&&Ws(n.value,r.value)):e instanceof Co?function(e,t){return t instanceof Co&&e.op===t.op&&e.filters.length===t.filters.length&&e.filters.reduce((e,n,r)=>e&&Ro(n,t.filters[r]),!0)}(e,t):void Wr();var n,r}function Oo(e,t){const n=e.filters.concat(t);return Co.create(n,e.op)}function Po(e){return e instanceof So?`${(t=e).field.canonicalString()} ${t.op} ${Zs(t.value)}`:e instanceof Co?function(e){return e.op.toString()+" {"+e.getFilters().map(Po).join(" ,")+"}"}(e):"Filter";var t}class Lo extends So{constructor(e,t,n){super(e,t,n),this.key=wi.fromName(n.referenceValue)}matches(e){const t=wi.comparator(e.key,this.key);return this.matchesComparison(t)}}class Mo extends So{constructor(e,t){super(e,"in",t),this.keys=Fo(0,t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class Vo extends So{constructor(e,t){super(e,"not-in",t),this.keys=Fo(0,t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Fo(e,t){var n;return((null===(n=t.arrayValue)||void 0===n?void 0:n.values)||[]).map(e=>wi.fromName(e.referenceValue))}class Uo extends So{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return ro(t)&&Qs(t.arrayValue,this.value)}}class Bo extends So{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return null!==t&&Qs(this.value.arrayValue,t)}}class jo extends So{constructor(e,t){super(e,"not-in",t)}matches(e){if(Qs(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return null!==t&&!Qs(this.value.arrayValue,t)}}class qo extends So{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!ro(t)||!t.arrayValue.values)&&t.arrayValue.values.some(e=>Qs(this.value.arrayValue,e))}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zo{constructor(e,t=null,n=[],r=[],i=null,s=null,o=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=r,this.limit=i,this.startAt=s,this.endAt=o,this.ue=null}}function Ko(e,t=null,n=[],r=[],i=null,s=null,o=null){return new zo(e,t,n,r,i,s,o)}function Go(e){const t=Jr(e);if(null===t.ue){let e=t.path.canonicalString();null!==t.collectionGroup&&(e+="|cg:"+t.collectionGroup),e+="|f:",e+=t.filters.map(e=>No(e)).join(","),e+="|ob:",e+=t.orderBy.map(e=>{return(t=e).field.canonicalString()+t.dir;var t}).join(","),Gi(t.limit)||(e+="|l:",e+=t.limit),t.startAt&&(e+="|lb:",e+=t.startAt.inclusive?"b:":"a:",e+=t.startAt.position.map(e=>Zs(e)).join(",")),t.endAt&&(e+="|ub:",e+=t.endAt.inclusive?"a:":"b:",e+=t.endAt.position.map(e=>Zs(e)).join(",")),t.ue=e}return t.ue}function $o(e,t){if(e.limit!==t.limit)return!1;if(e.orderBy.length!==t.orderBy.length)return!1;for(let n=0;n<e.orderBy.length;n++)if(!To(e.orderBy[n],t.orderBy[n]))return!1;if(e.filters.length!==t.filters.length)return!1;for(let n=0;n<e.filters.length;n++)if(!Ro(e.filters[n],t.filters[n]))return!1;return e.collectionGroup===t.collectionGroup&&!!e.path.isEqual(t.path)&&!!bo(e.startAt,t.startAt)&&bo(e.endAt,t.endAt)}function Ho(e){return wi.isDocumentKey(e.path)&&null===e.collectionGroup&&0===e.filters.length}function Wo(e,t){return e.filters.filter(e=>e instanceof So&&e.field.isEqual(t))}function Qo(e,t,n){let r=$s,i=!0;for(const s of Wo(e,t)){let e=$s,t=!0;switch(s.op){case"<":case"<=":e=ho(s.value);break;case"==":case"in":case">=":e=s.value;break;case">":e=s.value,t=!1;break;case"!=":case"not-in":e=$s}po({value:r,inclusive:i},{value:e,inclusive:t})<0&&(r=e,i=t)}if(null!==n)for(let s=0;s<e.orderBy.length;++s)if(e.orderBy[s].field.isEqual(t)){const e=n.position[s];po({value:r,inclusive:i},{value:e,inclusive:n.inclusive})<0&&(r=e,i=n.inclusive);break}return{value:r,inclusive:i}}function Jo(e,t,n){let r=Gs,i=!0;for(const s of Wo(e,t)){let e=Gs,t=!0;switch(s.op){case">=":case">":e=fo(s.value),t=!1;break;case"==":case"in":case"<=":e=s.value;break;case"<":e=s.value,t=!1;break;case"!=":case"not-in":e=Gs}mo({value:r,inclusive:i},{value:e,inclusive:t})>0&&(r=e,i=t)}if(null!==n)for(let s=0;s<e.orderBy.length;++s)if(e.orderBy[s].field.isEqual(t)){const e=n.position[s];mo({value:r,inclusive:i},{value:e,inclusive:n.inclusive})>0&&(r=e,i=n.inclusive);break}return{value:r,inclusive:i}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xo{constructor(e,t=null,n=[],r=[],i=null,s="F",o=null,a=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=r,this.limit=i,this.limitType=s,this.startAt=o,this.endAt=a,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function Yo(e){return new Xo(e)}function Zo(e){return 0===e.filters.length&&null===e.limit&&null==e.startAt&&null==e.endAt&&(0===e.explicitOrderBy.length||1===e.explicitOrderBy.length&&e.explicitOrderBy[0].field.isKeyField())}function ea(e){const t=Jr(e);if(null===t.ce){t.ce=[];const e=new Set;for(const r of t.explicitOrderBy)t.ce.push(r),e.add(r.field.canonicalString());const n=t.explicitOrderBy.length>0?t.explicitOrderBy[t.explicitOrderBy.length-1].dir:"asc";(function(e){let t=new xs(vi.comparator);return e.filters.forEach(e=>{e.getFlattenedFilters().forEach(e=>{e.isInequality()&&(t=t.add(e.field))})}),t})(t).forEach(r=>{e.has(r.canonicalString())||r.isKeyField()||t.ce.push(new _o(r,n))}),e.has(vi.keyField().canonicalString())||t.ce.push(new _o(vi.keyField(),n))}return t.ce}function ta(e){const t=Jr(e);return t.le||(t.le=function(e,t){if("F"===e.limitType)return Ko(e.path,e.collectionGroup,t,e.filters,e.limit,e.startAt,e.endAt);{t=t.map(e=>{const t="desc"===e.dir?"asc":"desc";return new _o(e.field,t)});const n=e.endAt?new wo(e.endAt.position,e.endAt.inclusive):null,r=e.startAt?new wo(e.startAt.position,e.startAt.inclusive):null;return Ko(e.path,e.collectionGroup,t,e.filters,e.limit,n,r)}}(t,ea(e))),t.le}function na(e,t,n){return new Xo(e.path,e.collectionGroup,e.explicitOrderBy.slice(),e.filters.slice(),t,n,e.startAt,e.endAt)}function ra(e,t){return $o(ta(e),ta(t))&&e.limitType===t.limitType}function ia(e){return`${Go(ta(e))}|lt:${e.limitType}`}function sa(e){return`Query(target=${function(e){let t=e.path.canonicalString();return null!==e.collectionGroup&&(t+=" collectionGroup="+e.collectionGroup),e.filters.length>0&&(t+=`, filters: [${e.filters.map(e=>Po(e)).join(", ")}]`),Gi(e.limit)||(t+=", limit: "+e.limit),e.orderBy.length>0&&(t+=`, orderBy: [${e.orderBy.map(e=>{return`${(t=e).field.canonicalString()} (${t.dir})`;var t}).join(", ")}]`),e.startAt&&(t+=", startAt: ",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(e=>Zs(e)).join(",")),e.endAt&&(t+=", endAt: ",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(e=>Zs(e)).join(",")),`Target(${t})`}(ta(e))}; limitType=${e.limitType})`}function oa(e,t){return t.isFoundDocument()&&function(e,t){const n=t.key.path;return null!==e.collectionGroup?t.key.hasCollectionId(e.collectionGroup)&&e.path.isPrefixOf(n):wi.isDocumentKey(e.path)?e.path.isEqual(n):e.path.isImmediateParentOf(n)}(e,t)&&function(e,t){for(const n of ea(e))if(!n.field.isKeyField()&&null===t.data.field(n.field))return!1;return!0}(e,t)&&function(e,t){for(const n of e.filters)if(!n.matches(t))return!1;return!0}(e,t)&&(r=t,!((n=e).startAt&&!function(e,t,n){const r=Io(e,t,n);return e.inclusive?r<=0:r<0}(n.startAt,ea(n),r)||n.endAt&&!function(e,t,n){const r=Io(e,t,n);return e.inclusive?r>=0:r>0}(n.endAt,ea(n),r)));var n,r}function aa(e){return(t,n)=>{let r=!1;for(const i of ea(e)){const e=ca(i,t,n);if(0!==e)return e;r=r||i.field.isKeyField()}return 0}}function ca(e,t,n){const r=e.field.isKeyField()?wi.comparator(t.key,n.key):function(e,t,n){const r=t.data.field(e),i=n.data.field(e);return null!==r&&null!==i?Js(r,i):Wr()}(e.field,t,n);switch(e.dir){case"asc":return r;case"desc":return-1*r;default:return Wr()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ua{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(void 0!==n)for(const[r,i]of n)if(this.equalsFn(r,e))return i}has(e){return void 0!==this.get(e)}set(e,t){const n=this.mapKeyFn(e),r=this.inner[n];if(void 0===r)return this.inner[n]=[[e,t]],void this.innerSize++;for(let i=0;i<r.length;i++)if(this.equalsFn(r[i][0],e))return void(r[i]=[e,t]);r.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(void 0===n)return!1;for(let r=0;r<n.length;r++)if(this.equalsFn(n[r][0],e))return 1===n.length?delete this.inner[t]:n.splice(r,1),this.innerSize--,!0;return!1}forEach(e){Ss(this.inner,(t,n)=>{for(const[r,i]of n)e(r,i)})}isEmpty(){return Cs(this.inner)}size(){return this.innerSize}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const la=new ks(wi.comparator);function ha(){return la}const da=new ks(wi.comparator);function fa(...e){let t=da;for(const n of e)t=t.insert(n.key,n);return t}function pa(e){let t=da;return e.forEach((e,n)=>t=t.insert(e,n.overlayedDocument)),t}function ma(){return ya()}function ga(){return ya()}function ya(){return new ua(e=>e.toString(),(e,t)=>e.isEqual(t))}const va=new ks(wi.comparator),wa=new xs(wi.comparator);function Ia(...e){let t=wa;for(const n of e)t=t.add(n);return t}const ba=new xs(li);
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _a(e,t){if(e.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:$i(t)?"-0":t}}function Ta(e){return{integerValue:""+e}}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Ea{constructor(){this._=void 0}}function Sa(e,t,n){return e instanceof Aa?function(e,t){const n={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:e.seconds,nanos:e.nanoseconds}}}};return t&&Bs(t)&&(t=js(t)),t&&(n.fields.__previous_value__=t),{mapValue:n}}(n,t):e instanceof Da?xa(e,t):e instanceof Na?Ra(e,t):function(e,t){const n=ka(e,t),r=Pa(n)+Pa(e.Pe);return no(n)&&no(e.Pe)?Ta(r):_a(e.serializer,r)}(e,t)}function Ca(e,t,n){return e instanceof Da?xa(e,t):e instanceof Na?Ra(e,t):n}function ka(e,t){return e instanceof Oa?no(n=t)||(r=n)&&"doubleValue"in r?t:{integerValue:0}:null;var n,r}class Aa extends Ea{}class Da extends Ea{constructor(e){super(),this.elements=e}}function xa(e,t){const n=La(t);for(const r of e.elements)n.some(e=>Ws(e,r))||n.push(r);return{arrayValue:{values:n}}}class Na extends Ea{constructor(e){super(),this.elements=e}}function Ra(e,t){let n=La(t);for(const r of e.elements)n=n.filter(e=>!Ws(e,r));return{arrayValue:{values:n}}}class Oa extends Ea{constructor(e,t){super(),this.serializer=e,this.Pe=t}}function Pa(e){return Fs(e.integerValue||e.doubleValue)}function La(e){return ro(e)&&e.arrayValue.values?e.arrayValue.values.slice():[]}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ma{constructor(e,t){this.field=e,this.transform=t}}class Va{constructor(e,t){this.version=e,this.transformResults=t}}class Fa{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new Fa}static exists(e){return new Fa(void 0,e)}static updateTime(e){return new Fa(e)}get isNone(){return void 0===this.updateTime&&void 0===this.exists}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ua(e,t){return void 0!==e.updateTime?t.isFoundDocument()&&t.version.isEqual(e.updateTime):void 0===e.exists||e.exists===t.isFoundDocument()}class Ba{}function ja(e,t){if(!e.hasLocalMutations||t&&0===t.fields.length)return null;if(null===t)return e.isNoDocument()?new Xa(e.key,Fa.none()):new $a(e.key,e.data,Fa.none());{const n=e.data,r=go.empty();let i=new xs(vi.comparator);for(let e of t.fields)if(!i.has(e)){let t=n.field(e);null===t&&e.length>1&&(e=e.popLast(),t=n.field(e)),null===t?r.delete(e):r.set(e,t),i=i.add(e)}return new Ha(e.key,r,new Os(i.toArray()),Fa.none())}}function qa(e,t,n){var r;e instanceof $a?function(e,t,n){const r=e.value.clone(),i=Qa(e.fieldTransforms,t,n.transformResults);r.setAll(i),t.convertToFoundDocument(n.version,r).setHasCommittedMutations()}(e,t,n):e instanceof Ha?function(e,t,n){if(!Ua(e.precondition,t))return void t.convertToUnknownDocument(n.version);const r=Qa(e.fieldTransforms,t,n.transformResults),i=t.data;i.setAll(Wa(e)),i.setAll(r),t.convertToFoundDocument(n.version,i).setHasCommittedMutations()}(e,t,n):(r=n,t.convertToNoDocument(r.version).setHasCommittedMutations())}function za(e,t,n,r){return e instanceof $a?function(e,t,n,r){if(!Ua(e.precondition,t))return n;const i=e.value.clone(),s=Ja(e.fieldTransforms,r,t);return i.setAll(s),t.convertToFoundDocument(t.version,i).setHasLocalMutations(),null}(e,t,n,r):e instanceof Ha?function(e,t,n,r){if(!Ua(e.precondition,t))return n;const i=Ja(e.fieldTransforms,r,t),s=t.data;return s.setAll(Wa(e)),s.setAll(i),t.convertToFoundDocument(t.version,s).setHasLocalMutations(),null===n?null:n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map(e=>e.field))}(e,t,n,r):(i=t,s=n,Ua(e.precondition,i)?(i.convertToNoDocument(i.version).setHasLocalMutations(),null):s);var i,s}function Ka(e,t){let n=null;for(const r of e.fieldTransforms){const e=t.data.field(r.field),i=ka(r.transform,e||null);null!=i&&(null===n&&(n=go.empty()),n.set(r.field,i))}return n||null}function Ga(e,t){return e.type===t.type&&!!e.key.isEqual(t.key)&&!!e.precondition.isEqual(t.precondition)&&(n=e.fieldTransforms,r=t.fieldTransforms,!!(void 0===n&&void 0===r||n&&r&&hi(n,r,(e,t)=>function(e,t){return e.field.isEqual(t.field)&&(n=e.transform,r=t.transform,n instanceof Da&&r instanceof Da||n instanceof Na&&r instanceof Na?hi(n.elements,r.elements,Ws):n instanceof Oa&&r instanceof Oa?Ws(n.Pe,r.Pe):n instanceof Aa&&r instanceof Aa);var n,r}(e,t)))&&(0===e.type?e.value.isEqual(t.value):1!==e.type||e.data.isEqual(t.data)&&e.fieldMask.isEqual(t.fieldMask)));var n,r}class $a extends Ba{constructor(e,t,n,r=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=r,this.type=0}getFieldMask(){return null}}class Ha extends Ba{constructor(e,t,n,r,i=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=r,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function Wa(e){const t=new Map;return e.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=e.data.field(n);t.set(n,r)}}),t}function Qa(e,t,n){const r=new Map;Qr(e.length===n.length);for(let i=0;i<n.length;i++){const s=e[i],o=s.transform,a=t.data.field(s.field);r.set(s.field,Ca(o,a,n[i]))}return r}function Ja(e,t,n){const r=new Map;for(const i of e){const e=i.transform,s=n.data.field(i.field);r.set(i.field,Sa(e,s,t))}return r}class Xa extends Ba{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Ya extends Ba{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Za{constructor(e,t,n,r){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=r}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let r=0;r<this.mutations.length;r++){const t=this.mutations[r];t.key.isEqual(e.key)&&qa(t,e,n[r])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=za(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=za(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=ga();return this.mutations.forEach(r=>{const i=e.get(r.key),s=i.overlayedDocument;let o=this.applyToLocalView(s,i.mutatedFields);o=t.has(r.key)?null:o;const a=ja(s,o);null!==a&&n.set(r.key,a),s.isValidDocument()||s.convertToNoDocument(pi.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),Ia())}isEqual(e){return this.batchId===e.batchId&&hi(this.mutations,e.mutations,(e,t)=>Ga(e,t))&&hi(this.baseMutations,e.baseMutations,(e,t)=>Ga(e,t))}}class ec{constructor(e,t,n,r){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=r}static from(e,t,n){Qr(e.mutations.length===n.length);let r=function(){return va}();const i=e.mutations;for(let s=0;s<i.length;s++)r=r.insert(i[s].key,n[s].version);return new ec(e,t,n,r)}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tc{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return null!==e&&this.mutation===e.mutation}toString(){return`Overlay{\n      largestBatchId: ${this.largestBatchId},\n      mutation: ${this.mutation.toString()}\n    }`}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nc{constructor(e,t){this.count=e,this.unchangedNames=t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var rc,ic;function sc(e){if(void 0===e)return Gr("GRPC error has no .code"),Xr.UNKNOWN;switch(e){case rc.OK:return Xr.OK;case rc.CANCELLED:return Xr.CANCELLED;case rc.UNKNOWN:return Xr.UNKNOWN;case rc.DEADLINE_EXCEEDED:return Xr.DEADLINE_EXCEEDED;case rc.RESOURCE_EXHAUSTED:return Xr.RESOURCE_EXHAUSTED;case rc.INTERNAL:return Xr.INTERNAL;case rc.UNAVAILABLE:return Xr.UNAVAILABLE;case rc.UNAUTHENTICATED:return Xr.UNAUTHENTICATED;case rc.INVALID_ARGUMENT:return Xr.INVALID_ARGUMENT;case rc.NOT_FOUND:return Xr.NOT_FOUND;case rc.ALREADY_EXISTS:return Xr.ALREADY_EXISTS;case rc.PERMISSION_DENIED:return Xr.PERMISSION_DENIED;case rc.FAILED_PRECONDITION:return Xr.FAILED_PRECONDITION;case rc.ABORTED:return Xr.ABORTED;case rc.OUT_OF_RANGE:return Xr.OUT_OF_RANGE;case rc.UNIMPLEMENTED:return Xr.UNIMPLEMENTED;case rc.DATA_LOSS:return Xr.DATA_LOSS;default:return Wr()}}(ic=rc||(rc={}))[ic.OK=0]="OK",ic[ic.CANCELLED=1]="CANCELLED",ic[ic.UNKNOWN=2]="UNKNOWN",ic[ic.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ic[ic.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ic[ic.NOT_FOUND=5]="NOT_FOUND",ic[ic.ALREADY_EXISTS=6]="ALREADY_EXISTS",ic[ic.PERMISSION_DENIED=7]="PERMISSION_DENIED",ic[ic.UNAUTHENTICATED=16]="UNAUTHENTICATED",ic[ic.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ic[ic.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ic[ic.ABORTED=10]="ABORTED",ic[ic.OUT_OF_RANGE=11]="OUT_OF_RANGE",ic[ic.UNIMPLEMENTED=12]="UNIMPLEMENTED",ic[ic.INTERNAL=13]="INTERNAL",ic[ic.UNAVAILABLE=14]="UNAVAILABLE",ic[ic.DATA_LOSS=15]="DATA_LOSS";
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const oc=new kr([4294967295,4294967295],0);function ac(e){const t=(new TextEncoder).encode(e),n=new Ar;return n.update(t),new Uint8Array(n.digest())}function cc(e){const t=new DataView(e.buffer),n=t.getUint32(0,!0),r=t.getUint32(4,!0),i=t.getUint32(8,!0),s=t.getUint32(12,!0);return[new kr([n,r],0),new kr([i,s],0)]}class uc{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new lc(`Invalid padding: ${t}`);if(n<0)throw new lc(`Invalid hash count: ${n}`);if(e.length>0&&0===this.hashCount)throw new lc(`Invalid hash count: ${n}`);if(0===e.length&&0!==t)throw new lc(`Invalid padding when bitmap length is 0: ${t}`);this.Ie=8*e.length-t,this.Te=kr.fromNumber(this.Ie)}Ee(e,t,n){let r=e.add(t.multiply(kr.fromNumber(n)));return 1===r.compare(oc)&&(r=new kr([r.getBits(0),r.getBits(1)],0)),r.modulo(this.Te).toNumber()}de(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(0===this.Ie)return!1;const t=ac(e),[n,r]=cc(t);for(let i=0;i<this.hashCount;i++){const e=this.Ee(n,r,i);if(!this.de(e))return!1}return!0}static create(e,t,n){const r=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),s=new uc(i,r,t);return n.forEach(e=>s.insert(e)),s}insert(e){if(0===this.Ie)return;const t=ac(e),[n,r]=cc(t);for(let i=0;i<this.hashCount;i++){const e=this.Ee(n,r,i);this.Ae(e)}}Ae(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class lc extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hc{constructor(e,t,n,r,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=r,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const r=new Map;return r.set(e,dc.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new hc(pi.min(),r,new ks(li),ha(),Ia())}}class dc{constructor(e,t,n,r,i){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=r,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new dc(n,t,Ia(),Ia(),Ia())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fc{constructor(e,t,n,r){this.Re=e,this.removedTargetIds=t,this.key=n,this.Ve=r}}class pc{constructor(e,t){this.targetId=e,this.me=t}}class mc{constructor(e,t,n=Ls.EMPTY_BYTE_STRING,r=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=r}}class gc{constructor(){this.fe=0,this.ge=wc(),this.pe=Ls.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return 0!==this.fe}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}ve(){let e=Ia(),t=Ia(),n=Ia();return this.ge.forEach((r,i)=>{switch(i){case 0:e=e.add(r);break;case 2:t=t.add(r);break;case 1:n=n.add(r);break;default:Wr()}}),new dc(this.pe,this.ye,e,t,n)}Ce(){this.we=!1,this.ge=wc()}Fe(e,t){this.we=!0,this.ge=this.ge.insert(e,t)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,Qr(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class yc{constructor(e){this.Le=e,this.Be=new Map,this.ke=ha(),this.qe=vc(),this.Qe=new ks(li)}Ke(e){for(const t of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(t,e.Ve):this.Ue(t,e.key,e.Ve);for(const t of e.removedTargetIds)this.Ue(t,e.key,e.Ve)}We(e){this.forEachTarget(e,t=>{const n=this.Ge(t);switch(e.state){case 0:this.ze(t)&&n.De(e.resumeToken);break;case 1:n.Oe(),n.Se||n.Ce(),n.De(e.resumeToken);break;case 2:n.Oe(),n.Se||this.removeTarget(t);break;case 3:this.ze(t)&&(n.Ne(),n.De(e.resumeToken));break;case 4:this.ze(t)&&(this.je(t),n.De(e.resumeToken));break;default:Wr()}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Be.forEach((e,n)=>{this.ze(n)&&t(n)})}He(e){const t=e.targetId,n=e.me.count,r=this.Je(t);if(r){const i=r.target;if(Ho(i))if(0===n){const e=new wi(i.path);this.Ue(t,e,vo.newNoDocument(e,pi.min()))}else Qr(1===n);else{const r=this.Ye(t);if(r!==n){const n=this.Ze(e),i=n?this.Xe(n,e,r):1;if(0!==i){this.je(t);const e=2===i?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(t,e)}}}}}Ze(e){const t=e.me.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:r=0},hashCount:i=0}=t;let s,o;try{s=Us(n).toUint8Array()}catch(a){if(a instanceof Ps)return $r("Decoding the base64 bloom filter in existence filter failed ("+a.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw a}try{o=new uc(s,r,i)}catch(a){return $r(a instanceof lc?"BloomFilter error: ":"Applying bloom filter failed: ",a),null}return 0===o.Ie?null:o}Xe(e,t,n){return t.me.count===n-this.nt(e,t.targetId)?0:2}nt(e,t){const n=this.Le.getRemoteKeysForTarget(t);let r=0;return n.forEach(n=>{const i=this.Le.tt(),s=`projects/${i.projectId}/databases/${i.database}/documents/${n.path.canonicalString()}`;e.mightContain(s)||(this.Ue(t,n,null),r++)}),r}rt(e){const t=new Map;this.Be.forEach((n,r)=>{const i=this.Je(r);if(i){if(n.current&&Ho(i.target)){const t=new wi(i.target.path);null!==this.ke.get(t)||this.it(r,t)||this.Ue(r,t,vo.newNoDocument(t,e))}n.be&&(t.set(r,n.ve()),n.Ce())}});let n=Ia();this.qe.forEach((e,t)=>{let r=!0;t.forEachWhile(e=>{const t=this.Je(e);return!t||"TargetPurposeLimboResolution"===t.purpose||(r=!1,!1)}),r&&(n=n.add(e))}),this.ke.forEach((t,n)=>n.setReadTime(e));const r=new hc(e,t,this.Qe,this.ke,n);return this.ke=ha(),this.qe=vc(),this.Qe=new ks(li),r}$e(e,t){if(!this.ze(e))return;const n=this.it(e,t.key)?2:0;this.Ge(e).Fe(t.key,n),this.ke=this.ke.insert(t.key,t),this.qe=this.qe.insert(t.key,this.st(t.key).add(e))}Ue(e,t,n){if(!this.ze(e))return;const r=this.Ge(e);this.it(e,t)?r.Fe(t,1):r.Me(t),this.qe=this.qe.insert(t,this.st(t).delete(e)),n&&(this.ke=this.ke.insert(t,n))}removeTarget(e){this.Be.delete(e)}Ye(e){const t=this.Ge(e).ve();return this.Le.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let t=this.Be.get(e);return t||(t=new gc,this.Be.set(e,t)),t}st(e){let t=this.qe.get(e);return t||(t=new xs(li),this.qe=this.qe.insert(e,t)),t}ze(e){const t=null!==this.Je(e);return t||Kr("WatchChangeAggregator","Detected inactive target",e),t}Je(e){const t=this.Be.get(e);return t&&t.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new gc),this.Le.getRemoteKeysForTarget(e).forEach(t=>{this.Ue(e,t,null)})}it(e,t){return this.Le.getRemoteKeysForTarget(e).has(t)}}function vc(){return new ks(wi.comparator)}function wc(){return new ks(wi.comparator)}const Ic=(()=>({asc:"ASCENDING",desc:"DESCENDING"}))(),bc=(()=>({"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"}))(),_c=(()=>({and:"AND",or:"OR"}))();class Tc{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function Ec(e,t){return e.useProto3Json||Gi(t)?t:{value:t}}function Sc(e,t){return e.useProto3Json?`${new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+t.nanoseconds).slice(-9)}Z`:{seconds:""+t.seconds,nanos:t.nanoseconds}}function Cc(e,t){return e.useProto3Json?t.toBase64():t.toUint8Array()}function kc(e,t){return Sc(e,t.toTimestamp())}function Ac(e){return Qr(!!e),pi.fromTimestamp(function(e){const t=Vs(e);return new fi(t.seconds,t.nanos)}(e))}function Dc(e,t){return xc(e,t).canonicalString()}function xc(e,t){const n=(r=e,new gi(["projects",r.projectId,"databases",r.database])).child("documents");var r;return void 0===t?n:n.child(t)}function Nc(e){const t=gi.fromString(e);return Qr(Yc(t)),t}function Rc(e,t){return Dc(e.databaseId,t.path)}function Oc(e,t){const n=Nc(t);if(n.get(1)!==e.databaseId.projectId)throw new Yr(Xr.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+e.databaseId.projectId);if(n.get(3)!==e.databaseId.database)throw new Yr(Xr.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+e.databaseId.database);return new wi(Vc(n))}function Pc(e,t){return Dc(e.databaseId,t)}function Lc(e){const t=Nc(e);return 4===t.length?gi.emptyPath():Vc(t)}function Mc(e){return new gi(["projects",e.databaseId.projectId,"databases",e.databaseId.database]).canonicalString()}function Vc(e){return Qr(e.length>4&&"documents"===e.get(4)),e.popFirst(5)}function Fc(e,t,n){return{name:Rc(e,t),fields:n.value.mapValue.fields}}function Uc(e,t){let n;if(t instanceof $a)n={update:Fc(e,t.key,t.value)};else if(t instanceof Xa)n={delete:Rc(e,t.key)};else if(t instanceof Ha)n={update:Fc(e,t.key,t.data),updateMask:Xc(t.fieldMask)};else{if(!(t instanceof Ya))return Wr();n={verify:Rc(e,t.key)}}return t.fieldTransforms.length>0&&(n.updateTransforms=t.fieldTransforms.map(e=>function(e,t){const n=t.transform;if(n instanceof Aa)return{fieldPath:t.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(n instanceof Da)return{fieldPath:t.field.canonicalString(),appendMissingElements:{values:n.elements}};if(n instanceof Na)return{fieldPath:t.field.canonicalString(),removeAllFromArray:{values:n.elements}};if(n instanceof Oa)return{fieldPath:t.field.canonicalString(),increment:n.Pe};throw Wr()}(0,e))),t.precondition.isNone||(n.currentDocument=(r=e,void 0!==(i=t.precondition).updateTime?{updateTime:kc(r,i.updateTime)}:void 0!==i.exists?{exists:i.exists}:Wr())),n;var r,i}function Bc(e,t){const n=t.currentDocument?void 0!==(i=t.currentDocument).updateTime?Fa.updateTime(Ac(i.updateTime)):void 0!==i.exists?Fa.exists(i.exists):Fa.none():Fa.none(),r=t.updateTransforms?t.updateTransforms.map(t=>function(e,t){let n=null;if("setToServerValue"in t)Qr("REQUEST_TIME"===t.setToServerValue),n=new Aa;else if("appendMissingElements"in t){const e=t.appendMissingElements.values||[];n=new Da(e)}else if("removeAllFromArray"in t){const e=t.removeAllFromArray.values||[];n=new Na(e)}else"increment"in t?n=new Oa(e,t.increment):Wr();const r=vi.fromServerFormat(t.fieldPath);return new Ma(r,n)}(e,t)):[];var i;if(t.update){t.update.name;const i=Oc(e,t.update.name),s=new go({mapValue:{fields:t.update.fields}});if(t.updateMask){const e=function(e){const t=e.fieldPaths||[];return new Os(t.map(e=>vi.fromServerFormat(e)))}(t.updateMask);return new Ha(i,s,e,n,r)}return new $a(i,s,n,r)}if(t.delete){const r=Oc(e,t.delete);return new Xa(r,n)}if(t.verify){const r=Oc(e,t.verify);return new Ya(r,n)}return Wr()}function jc(e,t){return{documents:[Pc(e,t.path)]}}function qc(e,t){const n={structuredQuery:{}},r=t.path;let i;null!==t.collectionGroup?(i=r,n.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(i=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=Pc(e,i);const s=function(e){if(0!==e.length)return Jc(Co.create(e,"and"))}(t.filters);s&&(n.structuredQuery.where=s);const o=function(e){if(0!==e.length)return e.map(e=>{return{field:Wc((t=e).field),direction:Gc(t.dir)};var t})}(t.orderBy);o&&(n.structuredQuery.orderBy=o);const a=Ec(e,t.limit);return null!==a&&(n.structuredQuery.limit=a),t.startAt&&(n.structuredQuery.startAt={before:(c=t.startAt).inclusive,values:c.position}),t.endAt&&(n.structuredQuery.endAt=function(e){return{before:!e.inclusive,values:e.position}}(t.endAt)),{_t:n,parent:i};var c}function zc(e){let t=Lc(e.parent);const n=e.structuredQuery,r=n.from?n.from.length:0;let i=null;if(r>0){Qr(1===r);const e=n.from[0];e.allDescendants?i=e.collectionId:t=t.child(e.collectionId)}let s=[];n.where&&(s=function(e){const t=Kc(e);return t instanceof Co&&Do(t)?t.getFilters():[t]}(n.where));let o=[];n.orderBy&&(o=n.orderBy.map(e=>{return new _o(Qc((t=e).field),function(e){switch(e){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(t.direction));var t}));let a=null;n.limit&&(a=function(e){let t;return t="object"==typeof e?e.value:e,Gi(t)?null:t}(n.limit));let c=null;n.startAt&&(c=function(e){const t=!!e.before,n=e.values||[];return new wo(n,t)}(n.startAt));let u=null;return n.endAt&&(u=function(e){const t=!e.before,n=e.values||[];return new wo(n,t)}(n.endAt)),function(e,t,n,r,i,s,o,a){return new Xo(e,t,n,r,i,"F",o,a)}(t,i,o,s,a,0,c,u)}function Kc(e){return void 0!==e.unaryFilter?function(e){switch(e.unaryFilter.op){case"IS_NAN":const t=Qc(e.unaryFilter.field);return So.create(t,"==",{doubleValue:NaN});case"IS_NULL":const n=Qc(e.unaryFilter.field);return So.create(n,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const r=Qc(e.unaryFilter.field);return So.create(r,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const i=Qc(e.unaryFilter.field);return So.create(i,"!=",{nullValue:"NULL_VALUE"});default:return Wr()}}(e):void 0!==e.fieldFilter?(t=e,So.create(Qc(t.fieldFilter.field),function(e){switch(e){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return Wr()}}(t.fieldFilter.op),t.fieldFilter.value)):void 0!==e.compositeFilter?function(e){return Co.create(e.compositeFilter.filters.map(e=>Kc(e)),function(e){switch(e){case"AND":return"and";case"OR":return"or";default:return Wr()}}(e.compositeFilter.op))}(e):Wr();var t}function Gc(e){return Ic[e]}function $c(e){return bc[e]}function Hc(e){return _c[e]}function Wc(e){return{fieldPath:e.canonicalString()}}function Qc(e){return vi.fromServerFormat(e.fieldPath)}function Jc(e){return e instanceof So?function(e){if("=="===e.op){if(so(e.value))return{unaryFilter:{field:Wc(e.field),op:"IS_NAN"}};if(io(e.value))return{unaryFilter:{field:Wc(e.field),op:"IS_NULL"}}}else if("!="===e.op){if(so(e.value))return{unaryFilter:{field:Wc(e.field),op:"IS_NOT_NAN"}};if(io(e.value))return{unaryFilter:{field:Wc(e.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Wc(e.field),op:$c(e.op),value:e.value}}}(e):e instanceof Co?function(e){const t=e.getFilters().map(e=>Jc(e));return 1===t.length?t[0]:{compositeFilter:{op:Hc(e.op),filters:t}}}(e):Wr()}function Xc(e){const t=[];return e.fields.forEach(e=>t.push(e.canonicalString())),{fieldPaths:t}}function Yc(e){return e.length>=4&&"projects"===e.get(0)&&"databases"===e.get(2)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zc{constructor(e,t,n,r,i=pi.min(),s=pi.min(),o=Ls.EMPTY_BYTE_STRING,a=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=r,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=s,this.resumeToken=o,this.expectedCount=a}withSequenceNumber(e){return new Zc(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Zc(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Zc(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Zc(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eu{constructor(e){this.ct=e}}function tu(e,t){const n=t.key,r={prefixPath:n.getCollectionPath().popLast().toArray(),collectionGroup:n.collectionGroup,documentId:n.path.lastSegment(),readTime:nu(t.readTime),hasCommittedMutations:t.hasCommittedMutations};if(t.isFoundDocument())r.document={name:Rc(i=e.ct,(s=t).key),fields:s.data.value.mapValue.fields,updateTime:Sc(i,s.version.toTimestamp()),createTime:Sc(i,s.createTime.toTimestamp())};else if(t.isNoDocument())r.noDocument={path:n.path.toArray(),readTime:ru(t.version)};else{if(!t.isUnknownDocument())return Wr();r.unknownDocument={path:n.path.toArray(),version:ru(t.version)}}var i,s;return r}function nu(e){const t=e.toTimestamp();return[t.seconds,t.nanoseconds]}function ru(e){const t=e.toTimestamp();return{seconds:t.seconds,nanoseconds:t.nanoseconds}}function iu(e){const t=new fi(e.seconds,e.nanoseconds);return pi.fromTimestamp(t)}function su(e,t){const n=(t.baseMutations||[]).map(t=>Bc(e.ct,t));for(let s=0;s<t.mutations.length-1;++s){const e=t.mutations[s];if(s+1<t.mutations.length&&void 0!==t.mutations[s+1].transform){const n=t.mutations[s+1];e.updateTransforms=n.transform.fieldTransforms,t.mutations.splice(s+1,1),++s}}const r=t.mutations.map(t=>Bc(e.ct,t)),i=fi.fromMillis(t.localWriteTimeMs);return new Za(t.batchId,i,n,r)}function ou(e){const t=iu(e.readTime),n=void 0!==e.lastLimboFreeSnapshotVersion?iu(e.lastLimboFreeSnapshotVersion):pi.min();let r;return r=void 0!==e.query.documents?(Qr(1===(i=e.query).documents.length),ta(Yo(Lc(i.documents[0])))):function(e){return ta(zc(e))}(e.query),new Zc(r,e.targetId,"TargetPurposeListen",e.lastListenSequenceNumber,t,n,Ls.fromBase64String(e.resumeToken));var i}function au(e,t){const n=ru(t.snapshotVersion),r=ru(t.lastLimboFreeSnapshotVersion);let i;i=Ho(t.target)?jc(e.ct,t.target):qc(e.ct,t.target)._t;const s=t.resumeToken.toBase64();return{targetId:t.targetId,canonicalId:Go(t.target),readTime:n,resumeToken:s,lastListenSequenceNumber:t.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:i}}function cu(e){const t=zc({parent:e.parent,structuredQuery:e.structuredQuery});return"LAST"===e.limitType?na(t,t.limit,"L"):t}function uu(e,t){return new tc(t.largestBatchId,Bc(e.ct,t.overlayMutation))}function lu(e,t){const n=t.path.lastSegment();return[e,Hi(t.path.popLast()),n]}function hu(e,t,n,r){return{indexId:e,uid:t,sequenceNumber:n,readTime:ru(r.readTime),documentKey:Hi(r.documentKey.path),largestBatchId:r.largestBatchId}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class du{getBundleMetadata(e,t){return fu(e).get(t).next(e=>{if(e)return{id:(t=e).bundleId,createTime:iu(t.createTime),version:t.version};var t})}saveBundleMetadata(e,t){return fu(e).put({bundleId:(n=t).id,createTime:ru(Ac(n.createTime)),version:n.version});var n}getNamedQuery(e,t){return pu(e).get(t).next(e=>{if(e)return{name:(t=e).name,query:cu(t.bundledQuery),readTime:iu(t.readTime)};var t})}saveNamedQuery(e,t){return pu(e).put({name:(n=t).name,readTime:ru(Ac(n.readTime)),bundledQuery:n.bundledQuery});var n}}function fu(e){return Ts(e,"bundles")}function pu(e){return Ts(e,"namedQueries")}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mu{constructor(e,t){this.serializer=e,this.userId=t}static lt(e,t){const n=t.uid||"";return new mu(e,n)}getOverlay(e,t){return gu(e).get(lu(this.userId,t)).next(e=>e?uu(this.serializer,e):null)}getOverlays(e,t){const n=ma();return Ni.forEach(t,t=>this.getOverlay(e,t).next(e=>{null!==e&&n.set(t,e)})).next(()=>n)}saveOverlays(e,t,n){const r=[];return n.forEach((n,i)=>{const s=new tc(t,i);r.push(this.ht(e,s))}),Ni.waitFor(r)}removeOverlaysForBatchId(e,t,n){const r=new Set;t.forEach(e=>r.add(Hi(e.getCollectionPath())));const i=[];return r.forEach(t=>{const r=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,n+1],!1,!0);i.push(gu(e).j("collectionPathOverlayIndex",r))}),Ni.waitFor(i)}getOverlaysForCollection(e,t,n){const r=ma(),i=Hi(t),s=IDBKeyRange.bound([this.userId,i,n],[this.userId,i,Number.POSITIVE_INFINITY],!0);return gu(e).U("collectionPathOverlayIndex",s).next(e=>{for(const t of e){const e=uu(this.serializer,t);r.set(e.getKey(),e)}return r})}getOverlaysForCollectionGroup(e,t,n,r){const i=ma();let s;const o=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return gu(e).J({index:"collectionGroupOverlayIndex",range:o},(e,t,n)=>{const o=uu(this.serializer,t);i.size()<r||o.largestBatchId===s?(i.set(o.getKey(),o),s=o.largestBatchId):n.done()}).next(()=>i)}ht(e,t){return gu(e).put(function(e,t,n){const[r,i,s]=lu(t,n.mutation.key);return{userId:t,collectionPath:i,documentId:s,collectionGroup:n.mutation.key.getCollectionGroup(),largestBatchId:n.largestBatchId,overlayMutation:Uc(e.ct,n.mutation)}}(this.serializer,this.userId,t))}}function gu(e){return Ts(e,"documentOverlays")}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yu{Pt(e){return Ts(e,"globals")}getSessionToken(e){return this.Pt(e).get("sessionToken").next(e=>{const t=null==e?void 0:e.value;return t?Ls.fromUint8Array(t):Ls.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.Pt(e).put({name:"sessionToken",value:t.toUint8Array()})}}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vu{constructor(){}It(e,t){this.Tt(e,t),t.Et()}Tt(e,t){if("nullValue"in e)this.dt(t,5);else if("booleanValue"in e)this.dt(t,10),t.At(e.booleanValue?1:0);else if("integerValue"in e)this.dt(t,15),t.At(Fs(e.integerValue));else if("doubleValue"in e){const n=Fs(e.doubleValue);isNaN(n)?this.dt(t,13):(this.dt(t,15),$i(n)?t.At(0):t.At(n))}else if("timestampValue"in e){let n=e.timestampValue;this.dt(t,20),"string"==typeof n&&(n=Vs(n)),t.Rt(`${n.seconds||""}`),t.At(n.nanos||0)}else if("stringValue"in e)this.Vt(e.stringValue,t),this.ft(t);else if("bytesValue"in e)this.dt(t,30),t.gt(Us(e.bytesValue)),this.ft(t);else if("referenceValue"in e)this.yt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.dt(t,45),t.At(n.latitude||0),t.At(n.longitude||0)}else"mapValue"in e?uo(e)?this.dt(t,Number.MAX_SAFE_INTEGER):ao(e)?this.wt(e.mapValue,t):(this.St(e.mapValue,t),this.ft(t)):"arrayValue"in e?(this.bt(e.arrayValue,t),this.ft(t)):Wr()}Vt(e,t){this.dt(t,25),this.Dt(e,t)}Dt(e,t){t.Rt(e)}St(e,t){const n=e.fields||{};this.dt(t,55);for(const r of Object.keys(n))this.Vt(r,t),this.Tt(n[r],t)}wt(e,t){var n,r;const i=e.fields||{};this.dt(t,53);const s="value",o=(null===(r=null===(n=i[s].arrayValue)||void 0===n?void 0:n.values)||void 0===r?void 0:r.length)||0;this.dt(t,15),t.At(Fs(o)),this.Vt(s,t),this.Tt(i[s],t)}bt(e,t){const n=e.values||[];this.dt(t,50);for(const r of n)this.Tt(r,t)}yt(e,t){this.dt(t,37),wi.fromName(e).path.forEach(e=>{this.dt(t,60),this.Dt(e,t)})}dt(e,t){e.At(t)}ft(e){e.At(2)}}function wu(e){if(0===e)return 8;let t=0;return!(e>>4)&&(t+=4,e<<=4),!(e>>6)&&(t+=2,e<<=2),!(e>>7)&&(t+=1),t}function Iu(e){const t=64-function(e){let t=0;for(let n=0;n<8;++n){const r=wu(255&e[n]);if(t+=r,8!==r)break}return t}(e);return Math.ceil(t/8)}vu.vt=new vu;class bu{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Ct(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ft(n.value),n=t.next();this.Mt()}xt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ot(n.value),n=t.next();this.Nt()}Lt(e){for(const t of e){const e=t.charCodeAt(0);if(e<128)this.Ft(e);else if(e<2048)this.Ft(960|e>>>6),this.Ft(128|63&e);else if(t<"\ud800"||"\udbff"<t)this.Ft(480|e>>>12),this.Ft(128|63&e>>>6),this.Ft(128|63&e);else{const e=t.codePointAt(0);this.Ft(240|e>>>18),this.Ft(128|63&e>>>12),this.Ft(128|63&e>>>6),this.Ft(128|63&e)}}this.Mt()}Bt(e){for(const t of e){const e=t.charCodeAt(0);if(e<128)this.Ot(e);else if(e<2048)this.Ot(960|e>>>6),this.Ot(128|63&e);else if(t<"\ud800"||"\udbff"<t)this.Ot(480|e>>>12),this.Ot(128|63&e>>>6),this.Ot(128|63&e);else{const e=t.codePointAt(0);this.Ot(240|e>>>18),this.Ot(128|63&e>>>12),this.Ot(128|63&e>>>6),this.Ot(128|63&e)}}this.Nt()}kt(e){const t=this.qt(e),n=Iu(t);this.Qt(1+n),this.buffer[this.position++]=255&n;for(let r=t.length-n;r<t.length;++r)this.buffer[this.position++]=255&t[r]}Kt(e){const t=this.qt(e),n=Iu(t);this.Qt(1+n),this.buffer[this.position++]=~(255&n);for(let r=t.length-n;r<t.length;++r)this.buffer[this.position++]=~(255&t[r])}$t(){this.Ut(255),this.Ut(255)}Wt(){this.Gt(255),this.Gt(255)}reset(){this.position=0}seed(e){this.Qt(e.length),this.buffer.set(e,this.position),this.position+=e.length}zt(){return this.buffer.slice(0,this.position)}qt(e){const t=function(e){const t=new DataView(new ArrayBuffer(8));return t.setFloat64(0,e,!1),new Uint8Array(t.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let r=1;r<t.length;++r)t[r]^=n?255:0;return t}Ft(e){const t=255&e;0===t?(this.Ut(0),this.Ut(255)):255===t?(this.Ut(255),this.Ut(0)):this.Ut(t)}Ot(e){const t=255&e;0===t?(this.Gt(0),this.Gt(255)):255===t?(this.Gt(255),this.Gt(0)):this.Gt(e)}Mt(){this.Ut(0),this.Ut(1)}Nt(){this.Gt(0),this.Gt(1)}Ut(e){this.Qt(1),this.buffer[this.position++]=e}Gt(e){this.Qt(1),this.buffer[this.position++]=~e}Qt(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const r=new Uint8Array(n);r.set(this.buffer),this.buffer=r}}class _u{constructor(e){this.jt=e}gt(e){this.jt.Ct(e)}Rt(e){this.jt.Lt(e)}At(e){this.jt.kt(e)}Et(){this.jt.$t()}}class Tu{constructor(e){this.jt=e}gt(e){this.jt.xt(e)}Rt(e){this.jt.Bt(e)}At(e){this.jt.Kt(e)}Et(){this.jt.Wt()}}class Eu{constructor(){this.jt=new bu,this.Ht=new _u(this.jt),this.Jt=new Tu(this.jt)}seed(e){this.jt.seed(e)}Yt(e){return 0===e?this.Ht:this.Jt}zt(){return this.jt.zt()}reset(){this.jt.reset()}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Su{constructor(e,t,n,r){this.indexId=e,this.documentKey=t,this.arrayValue=n,this.directionalValue=r}Zt(){const e=this.directionalValue.length,t=0===e||255===this.directionalValue[e-1]?e+1:e,n=new Uint8Array(t);return n.set(this.directionalValue,0),t!==e?n.set([0],this.directionalValue.length):++n[n.length-1],new Su(this.indexId,this.documentKey,this.arrayValue,n)}}function Cu(e,t){let n=e.indexId-t.indexId;return 0!==n?n:(n=ku(e.arrayValue,t.arrayValue),0!==n?n:(n=ku(e.directionalValue,t.directionalValue),0!==n?n:wi.comparator(e.documentKey,t.documentKey)))}function ku(e,t){for(let n=0;n<e.length&&n<t.length;++n){const r=e[n]-t[n];if(0!==r)return r}return e.length-t.length}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Au{constructor(e){this.Xt=new xs((e,t)=>vi.comparator(e.field,t.field)),this.collectionId=null!=e.collectionGroup?e.collectionGroup:e.path.lastSegment(),this.en=e.orderBy,this.tn=[];for(const t of e.filters){const e=t;e.isInequality()?this.Xt=this.Xt.add(e):this.tn.push(e)}}get nn(){return this.Xt.size>1}rn(e){if(Qr(e.collectionGroup===this.collectionId),this.nn)return!1;const t=bi(e);if(void 0!==t&&!this.sn(t))return!1;const n=_i(e);let r=new Set,i=0,s=0;for(;i<n.length&&this.sn(n[i]);++i)r=r.add(n[i].fieldPath.canonicalString());if(i===n.length)return!0;if(this.Xt.size>0){const e=this.Xt.getIterator().getNext();if(!r.has(e.field.canonicalString())){const t=n[i];if(!this.on(e,t)||!this._n(this.en[s++],t))return!1}++i}for(;i<n.length;++i){const e=n[i];if(s>=this.en.length||!this._n(this.en[s++],e))return!1}return!0}an(){if(this.nn)return null;let e=new xs(vi.comparator);const t=[];for(const n of this.tn)if(!n.field.isKeyField())if("array-contains"===n.op||"array-contains-any"===n.op)t.push(new Ti(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new Ti(n.field,0))}for(const n of this.en)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new Ti(n.field,"asc"===n.dir?0:1)));return new Ii(Ii.UNKNOWN_ID,this.collectionId,t,Ei.empty())}sn(e){for(const t of this.tn)if(this.on(t,e))return!0;return!1}on(e,t){if(void 0===e||!e.field.isEqual(t.fieldPath))return!1;const n="array-contains"===e.op||"array-contains-any"===e.op;return 2===t.kind===n}_n(e,t){return!!e.field.isEqual(t.fieldPath)&&(0===t.kind&&"asc"===e.dir||1===t.kind&&"desc"===e.dir)}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Du(e){var t,n;if(Qr(e instanceof So||e instanceof Co),e instanceof So){if(e instanceof Bo){const r=(null===(n=null===(t=e.value.arrayValue)||void 0===t?void 0:t.values)||void 0===n?void 0:n.map(t=>So.create(e.field,"==",t)))||[];return Co.create(r,"or")}return e}const r=e.filters.map(e=>Du(e));return Co.create(r,e.op)}function xu(e){if(0===e.getFilters().length)return[];const t=Pu(Du(e));return Qr(Ou(t)),Nu(t)||Ru(t)?[t]:t.getFilters()}function Nu(e){return e instanceof So}function Ru(e){return e instanceof Co&&Do(e)}function Ou(e){return Nu(e)||Ru(e)||function(e){if(e instanceof Co&&Ao(e)){for(const t of e.getFilters())if(!Nu(t)&&!Ru(t))return!1;return!0}return!1}(e)}function Pu(e){if(Qr(e instanceof So||e instanceof Co),e instanceof So)return e;if(1===e.filters.length)return Pu(e.filters[0]);const t=e.filters.map(e=>Pu(e));let n=Co.create(t,e.op);return n=Vu(n),Ou(n)?n:(Qr(n instanceof Co),Qr(ko(n)),Qr(n.filters.length>1),n.filters.reduce((e,t)=>Lu(e,t)))}function Lu(e,t){let n;return Qr(e instanceof So||e instanceof Co),Qr(t instanceof So||t instanceof Co),n=e instanceof So?t instanceof So?(r=e,i=t,Co.create([r,i],"and")):Mu(e,t):t instanceof So?Mu(t,e):function(e,t){if(Qr(e.filters.length>0&&t.filters.length>0),ko(e)&&ko(t))return Oo(e,t.getFilters());const n=Ao(e)?e:t,r=Ao(e)?t:e,i=n.filters.map(e=>Lu(e,r));return Co.create(i,"or")}(e,t),Vu(n);var r,i}function Mu(e,t){if(ko(t))return Oo(t,e.getFilters());{const n=t.filters.map(t=>Lu(e,t));return Co.create(n,"or")}}function Vu(e){if(Qr(e instanceof So||e instanceof Co),e instanceof So)return e;const t=e.getFilters();if(1===t.length)return Vu(t[0]);if(xo(e))return e;const n=t.map(e=>Vu(e)),r=[];return n.forEach(t=>{t instanceof So?r.push(t):t instanceof Co&&(t.op===e.op?r.push(...t.filters):r.push(t))}),1===r.length?r[0]:Co.create(r,e.op)
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Fu{constructor(){this.un=new Uu}addToCollectionParentIndex(e,t){return this.un.add(t),Ni.resolve()}getCollectionParents(e,t){return Ni.resolve(this.un.getEntries(t))}addFieldIndex(e,t){return Ni.resolve()}deleteFieldIndex(e,t){return Ni.resolve()}deleteAllFieldIndexes(e){return Ni.resolve()}createTargetIndexes(e,t){return Ni.resolve()}getDocumentsMatchingTarget(e,t){return Ni.resolve(null)}getIndexType(e,t){return Ni.resolve(0)}getFieldIndexes(e,t){return Ni.resolve([])}getNextCollectionGroupToUpdate(e){return Ni.resolve(null)}getMinOffset(e,t){return Ni.resolve(Ci.min())}getMinOffsetFromCollectionGroup(e,t){return Ni.resolve(Ci.min())}updateCollectionGroup(e,t,n){return Ni.resolve()}updateIndexEntries(e,t){return Ni.resolve()}}class Uu{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),r=this.index[t]||new xs(gi.comparator),i=!r.has(n);return this.index[t]=r.add(n),i}has(e){const t=e.lastSegment(),n=e.popLast(),r=this.index[t];return r&&r.has(n)}getEntries(e){return(this.index[e]||new xs(gi.comparator)).toArray()}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bu=new Uint8Array(0);class ju{constructor(e,t){this.databaseId=t,this.cn=new Uu,this.ln=new ua(e=>Go(e),(e,t)=>$o(e,t)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.cn.has(t)){const n=t.lastSegment(),r=t.popLast();e.addOnCommittedListener(()=>{this.cn.add(t)});const i={collectionId:n,parent:Hi(r)};return qu(e).put(i)}return Ni.resolve()}getCollectionParents(e,t){const n=[],r=IDBKeyRange.bound([t,""],[di(t),""],!1,!0);return qu(e).U(r).next(e=>{for(const r of e){if(r.collectionId!==t)break;n.push(Ji(r.parent))}return n})}addFieldIndex(e,t){const n=Ku(e),r={indexId:(i=t).indexId,collectionGroup:i.collectionGroup,fields:i.fields.map(e=>[e.fieldPath.canonicalString(),e.kind])};var i;delete r.indexId;const s=n.add(r);if(t.indexState){const n=Gu(e);return s.next(e=>{n.put(hu(e,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=Ku(e),r=Gu(e),i=zu(e);return n.delete(t.indexId).next(()=>r.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Ku(e),n=zu(e),r=Gu(e);return t.j().next(()=>n.j()).next(()=>r.j())}createTargetIndexes(e,t){return Ni.forEach(this.hn(t),t=>this.getIndexType(e,t).next(n=>{if(0===n||1===n){const n=new Au(t).an();if(null!=n)return this.addFieldIndex(e,n)}}))}getDocumentsMatchingTarget(e,t){const n=zu(e);let r=!0;const i=new Map;return Ni.forEach(this.hn(t),t=>this.Pn(e,t).next(e=>{r&&(r=!!e),i.set(t,e)})).next(()=>{if(r){let e=Ia();const r=[];return Ni.forEach(i,(i,s)=>{var o;Kr("IndexedDbIndexManager",`Using index ${o=i,`id=${o.indexId}|cg=${o.collectionGroup}|f=${o.fields.map(e=>`${e.fieldPath}:${e.kind}`).join(",")}`} to execute ${Go(t)}`);const a=function(e,t){const n=bi(t);if(void 0===n)return null;for(const r of Wo(e,n.fieldPath))switch(r.op){case"array-contains-any":return r.value.arrayValue.values||[];case"array-contains":return[r.value]}return null}(s,i),c=function(e,t){const n=new Map;for(const r of _i(t))for(const t of Wo(e,r.fieldPath))switch(t.op){case"==":case"in":n.set(r.fieldPath.canonicalString(),t.value);break;case"not-in":case"!=":return n.set(r.fieldPath.canonicalString(),t.value),Array.from(n.values())}return null}(s,i),u=function(e,t){const n=[];let r=!0;for(const i of _i(t)){const t=0===i.kind?Qo(e,i.fieldPath,e.startAt):Jo(e,i.fieldPath,e.startAt);n.push(t.value),r&&(r=t.inclusive)}return new wo(n,r)}(s,i),l=function(e,t){const n=[];let r=!0;for(const i of _i(t)){const t=0===i.kind?Jo(e,i.fieldPath,e.endAt):Qo(e,i.fieldPath,e.endAt);n.push(t.value),r&&(r=t.inclusive)}return new wo(n,r)}(s,i),h=this.In(i,s,u),d=this.In(i,s,l),f=this.Tn(i,s,c),p=this.En(i.indexId,a,h,u.inclusive,d,l.inclusive,f);return Ni.forEach(p,i=>n.G(i,t.limit).next(t=>{t.forEach(t=>{const n=wi.fromSegments(t.documentKey);e.has(n)||(e=e.add(n),r.push(n))})}))}).next(()=>r)}return Ni.resolve(null)})}hn(e){let t=this.ln.get(e);return t||(t=0===e.filters.length?[e]:xu(Co.create(e.filters,"and")).map(t=>Ko(e.path,e.collectionGroup,e.orderBy,t.getFilters(),e.limit,e.startAt,e.endAt)),this.ln.set(e,t),t)}En(e,t,n,r,i,s,o){const a=(null!=t?t.length:1)*Math.max(n.length,i.length),c=a/(null!=t?t.length:1),u=[];for(let l=0;l<a;++l){const a=t?this.dn(t[l/c]):Bu,h=this.An(e,a,n[l%c],r),d=this.Rn(e,a,i[l%c],s),f=o.map(t=>this.An(e,a,t,!0));u.push(...this.createRange(h,d,f))}return u}An(e,t,n,r){const i=new Su(e,wi.empty(),t,n);return r?i:i.Zt()}Rn(e,t,n,r){const i=new Su(e,wi.empty(),t,n);return r?i.Zt():i}Pn(e,t){const n=new Au(t),r=null!=t.collectionGroup?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,r).next(e=>{let t=null;for(const r of e)n.rn(r)&&(!t||r.fields.length>t.fields.length)&&(t=r);return t})}getIndexType(e,t){let n=2;const r=this.hn(t);return Ni.forEach(r,t=>this.Pn(e,t).next(e=>{e?0!==n&&e.fields.length<function(e){let t=new xs(vi.comparator),n=!1;for(const r of e.filters)for(const e of r.getFlattenedFilters())e.field.isKeyField()||("array-contains"===e.op||"array-contains-any"===e.op?n=!0:t=t.add(e.field));for(const r of e.orderBy)r.field.isKeyField()||(t=t.add(r.field));return t.size+(n?1:0)}(t)&&(n=1):n=0})).next(()=>null!==t.limit&&r.length>1&&2===n?1:n)}Vn(e,t){const n=new Eu;for(const r of _i(e)){const e=t.data.field(r.fieldPath);if(null==e)return null;const i=n.Yt(r.kind);vu.vt.It(e,i)}return n.zt()}dn(e){const t=new Eu;return vu.vt.It(e,t.Yt(0)),t.zt()}mn(e,t){const n=new Eu;return vu.vt.It(to(this.databaseId,t),n.Yt(function(e){const t=_i(e);return 0===t.length?0:t[t.length-1].kind}(e))),n.zt()}Tn(e,t,n){if(null===n)return[];let r=[];r.push(new Eu);let i=0;for(const s of _i(e)){const e=n[i++];for(const n of r)if(this.fn(t,s.fieldPath)&&ro(e))r=this.gn(r,s,e);else{const t=n.Yt(s.kind);vu.vt.It(e,t)}}return this.pn(r)}In(e,t,n){return this.Tn(e,t,n.position)}pn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].zt();return t}gn(e,t,n){const r=[...e],i=[];for(const s of n.arrayValue.values||[])for(const e of r){const n=new Eu;n.seed(e.zt()),vu.vt.It(s,n.Yt(t.kind)),i.push(n)}return i}fn(e,t){return!!e.filters.find(e=>e instanceof So&&e.field.isEqual(t)&&("in"===e.op||"not-in"===e.op))}getFieldIndexes(e,t){const n=Ku(e),r=Gu(e);return(t?n.U("collectionGroupIndex",IDBKeyRange.bound(t,t)):n.U()).next(e=>{const t=[];return Ni.forEach(e,e=>r.get([e.indexId,this.uid]).next(n=>{t.push(function(e,t){const n=t?new Ei(t.sequenceNumber,new Ci(iu(t.readTime),new wi(Ji(t.documentKey)),t.largestBatchId)):Ei.empty(),r=e.fields.map(([e,t])=>new Ti(vi.fromServerFormat(e),t));return new Ii(e.indexId,e.collectionGroup,r,n)}(e,n))})).next(()=>t)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(e=>0===e.length?null:(e.sort((e,t)=>{const n=e.indexState.sequenceNumber-t.indexState.sequenceNumber;return 0!==n?n:li(e.collectionGroup,t.collectionGroup)}),e[0].collectionGroup))}updateCollectionGroup(e,t,n){const r=Ku(e),i=Gu(e);return this.yn(e).next(e=>r.U("collectionGroupIndex",IDBKeyRange.bound(t,t)).next(t=>Ni.forEach(t,t=>i.put(hu(t.indexId,this.uid,e,n)))))}updateIndexEntries(e,t){const n=new Map;return Ni.forEach(t,(t,r)=>{const i=n.get(t.collectionGroup);return(i?Ni.resolve(i):this.getFieldIndexes(e,t.collectionGroup)).next(i=>(n.set(t.collectionGroup,i),Ni.forEach(i,n=>this.wn(e,t,n).next(t=>{const i=this.Sn(r,n);return t.isEqual(i)?Ni.resolve():this.bn(e,r,n,t,i)}))))})}Dn(e,t,n,r){return zu(e).put({indexId:r.indexId,uid:this.uid,arrayValue:r.arrayValue,directionalValue:r.directionalValue,orderedDocumentKey:this.mn(n,t.key),documentKey:t.key.path.toArray()})}vn(e,t,n,r){return zu(e).delete([r.indexId,this.uid,r.arrayValue,r.directionalValue,this.mn(n,t.key),t.key.path.toArray()])}wn(e,t,n){const r=zu(e);let i=new xs(Cu);return r.J({index:"documentKeyIndex",range:IDBKeyRange.only([n.indexId,this.uid,this.mn(n,t)])},(e,r)=>{i=i.add(new Su(n.indexId,t,r.arrayValue,r.directionalValue))}).next(()=>i)}Sn(e,t){let n=new xs(Cu);const r=this.Vn(t,e);if(null==r)return n;const i=bi(t);if(null!=i){const s=e.data.field(i.fieldPath);if(ro(s))for(const i of s.arrayValue.values||[])n=n.add(new Su(t.indexId,e.key,this.dn(i),r))}else n=n.add(new Su(t.indexId,e.key,Bu,r));return n}bn(e,t,n,r,i){Kr("IndexedDbIndexManager","Updating index entries for document '%s'",t.key);const s=[];return function(e,t,n,r,i){const s=e.getIterator(),o=t.getIterator();let a=Rs(s),c=Rs(o);for(;a||c;){let e=!1,t=!1;if(a&&c){const r=n(a,c);r<0?t=!0:r>0&&(e=!0)}else null!=a?t=!0:e=!0;e?(r(c),c=Rs(o)):t?(i(a),a=Rs(s)):(a=Rs(s),c=Rs(o))}}(r,i,Cu,r=>{s.push(this.Dn(e,t,n,r))},r=>{s.push(this.vn(e,t,n,r))}),Ni.waitFor(s)}yn(e){let t=1;return Gu(e).J({index:"sequenceNumberIndex",reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(e,n,r)=>{r.done(),t=n.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((e,t)=>Cu(e,t)).filter((e,t,n)=>!t||0!==Cu(e,n[t-1]));const r=[];r.push(e);for(const s of n){const n=Cu(s,e),i=Cu(s,t);if(0===n)r[0]=e.Zt();else if(n>0&&i<0)r.push(s),r.push(s.Zt());else if(i>0)break}r.push(t);const i=[];for(let s=0;s<r.length;s+=2){if(this.Cn(r[s],r[s+1]))return[];const e=[r[s].indexId,this.uid,r[s].arrayValue,r[s].directionalValue,Bu,[]],t=[r[s+1].indexId,this.uid,r[s+1].arrayValue,r[s+1].directionalValue,Bu,[]];i.push(IDBKeyRange.bound(e,t))}return i}Cn(e,t){return Cu(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next($u)}getMinOffset(e,t){return Ni.mapArray(this.hn(t),t=>this.Pn(e,t).next(e=>e||Wr())).next($u)}}function qu(e){return Ts(e,"collectionParents")}function zu(e){return Ts(e,"indexEntries")}function Ku(e){return Ts(e,"indexConfiguration")}function Gu(e){return Ts(e,"indexState")}function $u(e){Qr(0!==e.length);let t=e[0].indexState.offset,n=t.largestBatchId;for(let r=1;r<e.length;r++){const i=e[r].indexState.offset;ki(i,t)<0&&(t=i),n<i.largestBatchId&&(n=i.largestBatchId)}return new Ci(t.readTime,t.documentKey,n)}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hu={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0};class Wu{constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}static withCacheSize(e){return new Wu(e,Wu.DEFAULT_COLLECTION_PERCENTILE,Wu.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qu(e,t,n){const r=e.store("mutations"),i=e.store("documentMutations"),s=[],o=IDBKeyRange.only(n.batchId);let a=0;const c=r.J({range:o},(e,t,n)=>(a++,n.delete()));s.push(c.next(()=>{Qr(1===a)}));const u=[];for(const l of n.mutations){const e=Zi(t,l.key.path,n.batchId);s.push(i.delete(e)),u.push(l.key)}return Ni.waitFor(s).next(()=>u)}function Ju(e){if(!e)return 0;let t;if(e.document)t=e.document;else if(e.unknownDocument)t=e.unknownDocument;else{if(!e.noDocument)throw Wr();t=e.noDocument}return JSON.stringify(t).length}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Wu.DEFAULT_COLLECTION_PERCENTILE=10,Wu.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Wu.DEFAULT=new Wu(41943040,Wu.DEFAULT_COLLECTION_PERCENTILE,Wu.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Wu.DISABLED=new Wu(-1,0,0);class Xu{constructor(e,t,n,r){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=r,this.Fn={}}static lt(e,t,n,r){Qr(""!==e.uid);const i=e.isAuthenticated()?e.uid:"";return new Xu(i,t,n,r)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Zu(e).J({index:"userMutationsIndex",range:n},(e,n,r)=>{t=!1,r.done()}).next(()=>t)}addMutationBatch(e,t,n,r){const i=el(e),s=Zu(e);return s.add({}).next(o=>{Qr("number"==typeof o);const a=new Za(o,t,n,r),c=function(e,t,n){const r=n.baseMutations.map(t=>Uc(e.ct,t)),i=n.mutations.map(t=>Uc(e.ct,t));return{userId:t,batchId:n.batchId,localWriteTimeMs:n.localWriteTime.toMillis(),baseMutations:r,mutations:i}}(this.serializer,this.userId,a),u=[];let l=new xs((e,t)=>li(e.canonicalString(),t.canonicalString()));for(const e of r){const t=Zi(this.userId,e.key.path,o);l=l.add(e.key.path.popLast()),u.push(s.put(c)),u.push(i.put(t,es))}return l.forEach(t=>{u.push(this.indexManager.addToCollectionParentIndex(e,t))}),e.addOnCommittedListener(()=>{this.Fn[o]=a.keys()}),Ni.waitFor(u).next(()=>a)})}lookupMutationBatch(e,t){return Zu(e).get(t).next(e=>e?(Qr(e.userId===this.userId),su(this.serializer,e)):null)}Mn(e,t){return this.Fn[t]?Ni.resolve(this.Fn[t]):this.lookupMutationBatch(e,t).next(e=>{if(e){const n=e.keys();return this.Fn[t]=n,n}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,r=IDBKeyRange.lowerBound([this.userId,n]);let i=null;return Zu(e).J({index:"userMutationsIndex",range:r},(e,t,r)=>{t.userId===this.userId&&(Qr(t.batchId>=n),i=su(this.serializer,t)),r.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=-1;return Zu(e).J({index:"userMutationsIndex",range:t,reverse:!0},(e,t,r)=>{n=t.batchId,r.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return Zu(e).U("userMutationsIndex",t).next(e=>e.map(e=>su(this.serializer,e)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=Yi(this.userId,t.path),r=IDBKeyRange.lowerBound(n),i=[];return el(e).J({range:r},(n,r,s)=>{const[o,a,c]=n,u=Ji(a);if(o===this.userId&&t.path.isEqual(u))return Zu(e).get(c).next(e=>{if(!e)throw Wr();Qr(e.userId===this.userId),i.push(su(this.serializer,e))});s.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new xs(li);const r=[];return t.forEach(t=>{const i=Yi(this.userId,t.path),s=IDBKeyRange.lowerBound(i),o=el(e).J({range:s},(e,r,i)=>{const[s,o,a]=e,c=Ji(o);s===this.userId&&t.path.isEqual(c)?n=n.add(a):i.done()});r.push(o)}),Ni.waitFor(r).next(()=>this.xn(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,r=n.length+1,i=Yi(this.userId,n),s=IDBKeyRange.lowerBound(i);let o=new xs(li);return el(e).J({range:s},(e,t,i)=>{const[s,a,c]=e,u=Ji(a);s===this.userId&&n.isPrefixOf(u)?u.length===r&&(o=o.add(c)):i.done()}).next(()=>this.xn(e,o))}xn(e,t){const n=[],r=[];return t.forEach(t=>{r.push(Zu(e).get(t).next(e=>{if(null===e)throw Wr();Qr(e.userId===this.userId),n.push(su(this.serializer,e))}))}),Ni.waitFor(r).next(()=>n)}removeMutationBatch(e,t){return Qu(e._e,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.On(t.batchId)}),Ni.forEach(n,t=>this.referenceDelegate.markPotentiallyOrphaned(e,t))))}On(e){delete this.Fn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return Ni.resolve();const n=IDBKeyRange.lowerBound(function(e){return[e]}(this.userId)),r=[];return el(e).J({range:n},(e,t,n)=>{if(e[0]===this.userId){const t=Ji(e[1]);r.push(t)}else n.done()}).next(()=>{Qr(0===r.length)})})}containsKey(e,t){return Yu(e,this.userId,t)}Nn(e){return tl(e).get(this.userId).next(e=>e||{userId:this.userId,lastAcknowledgedBatchId:-1,lastStreamToken:""})}}function Yu(e,t,n){const r=Yi(t,n.path),i=r[1],s=IDBKeyRange.lowerBound(r);let o=!1;return el(e).J({range:s,H:!0},(e,n,r)=>{const[s,a,c]=e;s===t&&a===i&&(o=!0),r.done()}).next(()=>o)}function Zu(e){return Ts(e,"mutations")}function el(e){return Ts(e,"documentMutations")}function tl(e){return Ts(e,"mutationQueues")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nl{constructor(e){this.Ln=e}next(){return this.Ln+=2,this.Ln}static Bn(){return new nl(0)}static kn(){return new nl(-1)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rl{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.qn(e).next(t=>{const n=new nl(t.highestTargetId);return t.highestTargetId=n.next(),this.Qn(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.qn(e).next(e=>pi.fromTimestamp(new fi(e.lastRemoteSnapshotVersion.seconds,e.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.qn(e).next(e=>e.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.qn(e).next(r=>(r.highestListenSequenceNumber=t,n&&(r.lastRemoteSnapshotVersion=n.toTimestamp()),t>r.highestListenSequenceNumber&&(r.highestListenSequenceNumber=t),this.Qn(e,r)))}addTargetData(e,t){return this.Kn(e,t).next(()=>this.qn(e).next(n=>(n.targetCount+=1,this.$n(t,n),this.Qn(e,n))))}updateTargetData(e,t){return this.Kn(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>il(e).delete(t.targetId)).next(()=>this.qn(e)).next(t=>(Qr(t.targetCount>0),t.targetCount-=1,this.Qn(e,t)))}removeTargets(e,t,n){let r=0;const i=[];return il(e).J((s,o)=>{const a=ou(o);a.sequenceNumber<=t&&null===n.get(a.targetId)&&(r++,i.push(this.removeTargetData(e,a)))}).next(()=>Ni.waitFor(i)).next(()=>r)}forEachTarget(e,t){return il(e).J((e,n)=>{const r=ou(n);t(r)})}qn(e){return sl(e).get("targetGlobalKey").next(e=>(Qr(null!==e),e))}Qn(e,t){return sl(e).put("targetGlobalKey",t)}Kn(e,t){return il(e).put(au(this.serializer,t))}$n(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.qn(e).next(e=>e.targetCount)}getTargetData(e,t){const n=Go(t),r=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let i=null;return il(e).J({range:r,index:"queryTargetsIndex"},(e,n,r)=>{const s=ou(n);$o(t,s.target)&&(i=s,r.done())}).next(()=>i)}addMatchingKeys(e,t,n){const r=[],i=ol(e);return t.forEach(t=>{const s=Hi(t.path);r.push(i.put({targetId:n,path:s})),r.push(this.referenceDelegate.addReference(e,n,t))}),Ni.waitFor(r)}removeMatchingKeys(e,t,n){const r=ol(e);return Ni.forEach(t,t=>{const i=Hi(t.path);return Ni.waitFor([r.delete([n,i]),this.referenceDelegate.removeReference(e,n,t)])})}removeMatchingKeysForTargetId(e,t){const n=ol(e),r=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(r)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),r=ol(e);let i=Ia();return r.J({range:n,H:!0},(e,t,n)=>{const r=Ji(e[1]),s=new wi(r);i=i.add(s)}).next(()=>i)}containsKey(e,t){const n=Hi(t.path),r=IDBKeyRange.bound([n],[di(n)],!1,!0);let i=0;return ol(e).J({index:"documentTargetsIndex",H:!0,range:r},([e,t],n,r)=>{0!==e&&(i++,r.done())}).next(()=>i>0)}ot(e,t){return il(e).get(t).next(e=>e?ou(e):null)}}function il(e){return Ts(e,"targets")}function sl(e){return Ts(e,"targetGlobal")}function ol(e){return Ts(e,"targetDocuments")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function al([e,t],[n,r]){const i=li(e,n);return 0===i?li(t,r):i}class cl{constructor(e){this.Un=e,this.buffer=new xs(al),this.Wn=0}Gn(){return++this.Wn}zn(e){const t=[e,this.Gn()];if(this.buffer.size<this.Un)this.buffer=this.buffer.add(t);else{const e=this.buffer.last();al(t,e)<0&&(this.buffer=this.buffer.delete(e).add(t))}}get maxValue(){return this.buffer.last()[0]}}class ul{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.jn=null}start(){-1!==this.garbageCollector.params.cacheSizeCollectionThreshold&&this.Hn(6e4)}stop(){this.jn&&(this.jn.cancel(),this.jn=null)}get started(){return null!==this.jn}Hn(e){Kr("LruGarbageCollector",`Garbage collection scheduled in ${e}ms`),this.jn=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.jn=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(e){Vi(e)?Kr("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",e):await xi(e)}await this.Hn(3e5)})}}class ll{constructor(e,t){this.Jn=e,this.params=t}calculateTargetCount(e,t){return this.Jn.Yn(e).next(e=>Math.floor(t/100*e))}nthSequenceNumber(e,t){if(0===t)return Ni.resolve(Ki.oe);const n=new cl(t);return this.Jn.forEachTarget(e,e=>n.zn(e.sequenceNumber)).next(()=>this.Jn.Zn(e,e=>n.zn(e))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.Jn.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.Jn.removeOrphanedDocuments(e,t)}collect(e,t){return-1===this.params.cacheSizeCollectionThreshold?(Kr("LruGarbageCollector","Garbage collection skipped; disabled"),Ni.resolve(Hu)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(Kr("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Hu):this.Xn(e,t))}getCacheSize(e){return this.Jn.getCacheSize(e)}Xn(e,t){let n,r,i,s,o,a,c;const u=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(t=>(t>this.params.maximumSequenceNumbersToCollect?(Kr("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${t}`),r=this.params.maximumSequenceNumbersToCollect):r=t,s=Date.now(),this.nthSequenceNumber(e,r))).next(r=>(n=r,o=Date.now(),this.removeTargets(e,n,t))).next(t=>(i=t,a=Date.now(),this.removeOrphanedDocuments(e,n))).next(e=>(c=Date.now(),zr()<=k.DEBUG&&Kr("LruGarbageCollector",`LRU Garbage Collection\n\tCounted targets in ${s-u}ms\n\tDetermined least recently used ${r} in `+(o-s)+`ms\n\tRemoved ${i} targets in `+(a-o)+`ms\n\tRemoved ${e} documents in `+(c-a)+`ms\nTotal Duration: ${c-u}ms`),Ni.resolve({didRun:!0,sequenceNumbersCollected:r,targetsRemoved:i,documentsRemoved:e})))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class hl{constructor(e,t){this.db=e,this.garbageCollector=function(e,t){return new ll(e,t)}(this,t)}Yn(e){const t=this.er(e);return this.db.getTargetCache().getTargetCount(e).next(e=>t.next(t=>e+t))}er(e){let t=0;return this.Zn(e,e=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}Zn(e,t){return this.tr(e,(e,n)=>t(n))}addReference(e,t,n){return dl(e,n)}removeReference(e,t,n){return dl(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return dl(e,t)}nr(e,t){return function(e,t){let n=!1;return tl(e).Y(r=>Yu(e,r,t).next(e=>(e&&(n=!0),Ni.resolve(!e)))).next(()=>n)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),r=[];let i=0;return this.tr(e,(s,o)=>{if(o<=t){const t=this.nr(e,s).next(t=>{if(!t)return i++,n.getEntry(e,s).next(()=>(n.removeEntry(s,pi.min()),ol(e).delete([0,Hi(s.path)])))});r.push(t)}}).next(()=>Ni.waitFor(r)).next(()=>n.apply(e)).next(()=>i)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return dl(e,t)}tr(e,t){const n=ol(e);let r,i=Ki.oe;return n.J({index:"documentTargetsIndex"},([e,n],{path:s,sequenceNumber:o})=>{0===e?(i!==Ki.oe&&t(new wi(Ji(r)),i),i=o,r=s):i=Ki.oe}).next(()=>{i!==Ki.oe&&t(new wi(Ji(r)),i)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function dl(e,t){return ol(e).put((n=t,r=e.currentSequenceNumber,{targetId:0,path:Hi(n.path),sequenceNumber:r}));var n,r}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fl{constructor(){this.changes=new ua(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,vo.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return void 0!==n?Ni.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pl{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return vl(e).put(n)}removeEntry(e,t,n){return vl(e).delete(function(e,t){const n=e.path.toArray();return[n.slice(0,n.length-2),n[n.length-2],nu(t),n[n.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.rr(e,n)))}getEntry(e,t){let n=vo.newInvalidDocument(t);return vl(e).J({index:"documentKeyIndex",range:IDBKeyRange.only(wl(t))},(e,r)=>{n=this.ir(t,r)}).next(()=>n)}sr(e,t){let n={size:0,document:vo.newInvalidDocument(t)};return vl(e).J({index:"documentKeyIndex",range:IDBKeyRange.only(wl(t))},(e,r)=>{n={document:this.ir(t,r),size:Ju(r)}}).next(()=>n)}getEntries(e,t){let n=ha();return this._r(e,t,(e,t)=>{const r=this.ir(e,t);n=n.insert(e,r)}).next(()=>n)}ar(e,t){let n=ha(),r=new ks(wi.comparator);return this._r(e,t,(e,t)=>{const i=this.ir(e,t);n=n.insert(e,i),r=r.insert(e,Ju(t))}).next(()=>({documents:n,ur:r}))}_r(e,t,n){if(t.isEmpty())return Ni.resolve();let r=new xs(bl);t.forEach(e=>r=r.add(e));const i=IDBKeyRange.bound(wl(r.first()),wl(r.last())),s=r.getIterator();let o=s.getNext();return vl(e).J({index:"documentKeyIndex",range:i},(e,t,r)=>{const i=wi.fromSegments([...t.prefixPath,t.collectionGroup,t.documentId]);for(;o&&bl(o,i)<0;)n(o,null),o=s.getNext();o&&o.isEqual(i)&&(n(o,t),o=s.hasNext()?s.getNext():null),o?r.$(wl(o)):r.done()}).next(()=>{for(;o;)n(o,null),o=s.hasNext()?s.getNext():null})}getDocumentsMatchingQuery(e,t,n,r,i){const s=t.path,o=[s.popLast().toArray(),s.lastSegment(),nu(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],a=[s.popLast().toArray(),s.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return vl(e).U(IDBKeyRange.bound(o,a,!0)).next(e=>{null==i||i.incrementDocumentReadCount(e.length);let n=ha();for(const i of e){const e=this.ir(wi.fromSegments(i.prefixPath.concat(i.collectionGroup,i.documentId)),i);e.isFoundDocument()&&(oa(t,e)||r.has(e.key))&&(n=n.insert(e.key,e))}return n})}getAllFromCollectionGroup(e,t,n,r){let i=ha();const s=Il(t,n),o=Il(t,Ci.max());return vl(e).J({index:"collectionGroupIndex",range:IDBKeyRange.bound(s,o,!0)},(e,t,n)=>{const s=this.ir(wi.fromSegments(t.prefixPath.concat(t.collectionGroup,t.documentId)),t);i=i.insert(s.key,s),i.size===r&&n.done()}).next(()=>i)}newChangeBuffer(e){return new gl(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(e=>e.byteSize)}getMetadata(e){return yl(e).get("remoteDocumentGlobalKey").next(e=>(Qr(!!e),e))}rr(e,t){return yl(e).put("remoteDocumentGlobalKey",t)}ir(e,t){if(t){const e=function(e,t){let n;if(t.document)n=function(e,t,n){const r=Oc(e,t.name),i=Ac(t.updateTime),s=t.createTime?Ac(t.createTime):pi.min(),o=new go({mapValue:{fields:t.fields}}),a=vo.newFoundDocument(r,i,s,o);return n&&a.setHasCommittedMutations(),n?a.setHasCommittedMutations():a}(e.ct,t.document,!!t.hasCommittedMutations);else if(t.noDocument){const e=wi.fromSegments(t.noDocument.path),r=iu(t.noDocument.readTime);n=vo.newNoDocument(e,r),t.hasCommittedMutations&&n.setHasCommittedMutations()}else{if(!t.unknownDocument)return Wr();{const e=wi.fromSegments(t.unknownDocument.path),r=iu(t.unknownDocument.version);n=vo.newUnknownDocument(e,r)}}return t.readTime&&n.setReadTime(function(e){const t=new fi(e[0],e[1]);return pi.fromTimestamp(t)}(t.readTime)),n}(this.serializer,t);if(!e.isNoDocument()||!e.version.isEqual(pi.min()))return e}return vo.newInvalidDocument(e)}}function ml(e){return new pl(e)}class gl extends fl{constructor(e,t){super(),this.cr=e,this.trackRemovals=t,this.lr=new ua(e=>e.toString(),(e,t)=>e.isEqual(t))}applyChanges(e){const t=[];let n=0,r=new xs((e,t)=>li(e.canonicalString(),t.canonicalString()));return this.changes.forEach((i,s)=>{const o=this.lr.get(i);if(t.push(this.cr.removeEntry(e,i,o.readTime)),s.isValidDocument()){const a=tu(this.cr.serializer,s);r=r.add(i.path.popLast());const c=Ju(a);n+=c-o.size,t.push(this.cr.addEntry(e,i,a))}else if(n-=o.size,this.trackRemovals){const n=tu(this.cr.serializer,s.convertToNoDocument(pi.min()));t.push(this.cr.addEntry(e,i,n))}}),r.forEach(n=>{t.push(this.cr.indexManager.addToCollectionParentIndex(e,n))}),t.push(this.cr.updateMetadata(e,n)),Ni.waitFor(t)}getFromCache(e,t){return this.cr.sr(e,t).next(e=>(this.lr.set(t,{size:e.size,readTime:e.document.readTime}),e.document))}getAllFromCache(e,t){return this.cr.ar(e,t).next(({documents:e,ur:t})=>(t.forEach((t,n)=>{this.lr.set(t,{size:n,readTime:e.get(t).readTime})}),e))}}function yl(e){return Ts(e,"remoteDocumentGlobal")}function vl(e){return Ts(e,"remoteDocumentsV14")}function wl(e){const t=e.path.toArray();return[t.slice(0,t.length-2),t[t.length-2],t[t.length-1]]}function Il(e,t){const n=t.documentKey.path.toArray();return[e,nu(t.readTime),n.slice(0,n.length-2),n.length>0?n[n.length-1]:""]}function bl(e,t){const n=e.path.toArray(),r=t.path.toArray();let i=0;for(let s=0;s<n.length-2&&s<r.length-2;++s)if(i=li(n[s],r[s]),i)return i;return i=li(n.length,r.length),i||(i=li(n[n.length-2],r[r.length-2]),i||li(n[n.length-1],r[r.length-1])
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */)}class _l{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tl{constructor(e,t,n,r){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=r}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(r=>(n=r,this.remoteDocumentCache.getEntry(e,t))).next(e=>(null!==n&&za(n.mutation,e,Os.empty(),fi.now()),e))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(t=>this.getLocalViewOfDocuments(e,t,Ia()).next(()=>t))}getLocalViewOfDocuments(e,t,n=Ia()){const r=ma();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,n).next(e=>{let t=fa();return e.forEach((e,n)=>{t=t.insert(e,n.overlayedDocument)}),t}))}getOverlayedDocuments(e,t){const n=ma();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,Ia()))}populateOverlays(e,t,n){const r=[];return n.forEach(e=>{t.has(e)||r.push(e)}),this.documentOverlayCache.getOverlays(e,r).next(e=>{e.forEach((e,n)=>{t.set(e,n)})})}computeViews(e,t,n,r){let i=ha();const s=ya(),o=ya();return t.forEach((e,t)=>{const o=n.get(t.key);r.has(t.key)&&(void 0===o||o.mutation instanceof Ha)?i=i.insert(t.key,t):void 0!==o?(s.set(t.key,o.mutation.getFieldMask()),za(o.mutation,t,o.mutation.getFieldMask(),fi.now())):s.set(t.key,Os.empty())}),this.recalculateAndSaveOverlays(e,i).next(e=>(e.forEach((e,t)=>s.set(e,t)),t.forEach((e,t)=>{var n;return o.set(e,new _l(t,null!==(n=s.get(e))&&void 0!==n?n:null))}),o))}recalculateAndSaveOverlays(e,t){const n=ya();let r=new ks((e,t)=>e-t),i=Ia();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(e=>{for(const i of e)i.keys().forEach(e=>{const s=t.get(e);if(null===s)return;let o=n.get(e)||Os.empty();o=i.applyToLocalView(s,o),n.set(e,o);const a=(r.get(i.batchId)||Ia()).add(e);r=r.insert(i.batchId,a)})}).next(()=>{const s=[],o=r.getReverseIterator();for(;o.hasNext();){const r=o.getNext(),a=r.key,c=r.value,u=ga();c.forEach(e=>{if(!i.has(e)){const r=ja(t.get(e),n.get(e));null!==r&&u.set(e,r),i=i.add(e)}}),s.push(this.documentOverlayCache.saveOverlays(e,a,u))}return Ni.waitFor(s)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(t=>this.recalculateAndSaveOverlays(e,t))}getDocumentsMatchingQuery(e,t,n,r){return i=t,wi.isDocumentKey(i.path)&&null===i.collectionGroup&&0===i.filters.length?this.getDocumentsMatchingDocumentQuery(e,t.path):function(e){return null!==e.collectionGroup}(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,r):this.getDocumentsMatchingCollectionQuery(e,t,n,r);var i}getNextDocuments(e,t,n,r){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,r).next(i=>{const s=r-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,r-i.size):Ni.resolve(ma());let o=-1,a=i;return s.next(t=>Ni.forEach(t,(t,n)=>(o<n.largestBatchId&&(o=n.largestBatchId),i.get(t)?Ni.resolve():this.remoteDocumentCache.getEntry(e,t).next(e=>{a=a.insert(t,e)}))).next(()=>this.populateOverlays(e,t,i)).next(()=>this.computeViews(e,a,t,Ia())).next(e=>({batchId:o,changes:pa(e)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new wi(t)).next(e=>{let t=fa();return e.isFoundDocument()&&(t=t.insert(e.key,e)),t})}getDocumentsMatchingCollectionGroupQuery(e,t,n,r){const i=t.collectionGroup;let s=fa();return this.indexManager.getCollectionParents(e,i).next(o=>Ni.forEach(o,o=>{const a=(c=t,u=o.child(i),new Xo(u,null,c.explicitOrderBy.slice(),c.filters.slice(),c.limit,c.limitType,c.startAt,c.endAt));var c,u;return this.getDocumentsMatchingCollectionQuery(e,a,n,r).next(e=>{e.forEach((e,t)=>{s=s.insert(e,t)})})}).next(()=>s))}getDocumentsMatchingCollectionQuery(e,t,n,r){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(s=>(i=s,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,r))).next(e=>{i.forEach((t,n)=>{const r=n.getKey();null===e.get(r)&&(e=e.insert(r,vo.newInvalidDocument(r)))});let n=fa();return e.forEach((e,r)=>{const s=i.get(e);void 0!==s&&za(s.mutation,r,Os.empty(),fi.now()),oa(t,r)&&(n=n.insert(e,r))}),n})}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class El{constructor(e){this.serializer=e,this.hr=new Map,this.Pr=new Map}getBundleMetadata(e,t){return Ni.resolve(this.hr.get(t))}saveBundleMetadata(e,t){return this.hr.set(t.id,{id:(n=t).id,version:n.version,createTime:Ac(n.createTime)}),Ni.resolve();var n}getNamedQuery(e,t){return Ni.resolve(this.Pr.get(t))}saveNamedQuery(e,t){return this.Pr.set(t.name,{name:(n=t).name,query:cu(n.bundledQuery),readTime:Ac(n.readTime)}),Ni.resolve();var n}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sl{constructor(){this.overlays=new ks(wi.comparator),this.Ir=new Map}getOverlay(e,t){return Ni.resolve(this.overlays.get(t))}getOverlays(e,t){const n=ma();return Ni.forEach(t,t=>this.getOverlay(e,t).next(e=>{null!==e&&n.set(t,e)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((n,r)=>{this.ht(e,t,r)}),Ni.resolve()}removeOverlaysForBatchId(e,t,n){const r=this.Ir.get(n);return void 0!==r&&(r.forEach(e=>this.overlays=this.overlays.remove(e)),this.Ir.delete(n)),Ni.resolve()}getOverlaysForCollection(e,t,n){const r=ma(),i=t.length+1,s=new wi(t.child("")),o=this.overlays.getIteratorFrom(s);for(;o.hasNext();){const e=o.getNext().value,s=e.getKey();if(!t.isPrefixOf(s.path))break;s.path.length===i&&e.largestBatchId>n&&r.set(e.getKey(),e)}return Ni.resolve(r)}getOverlaysForCollectionGroup(e,t,n,r){let i=new ks((e,t)=>e-t);const s=this.overlays.getIterator();for(;s.hasNext();){const e=s.getNext().value;if(e.getKey().getCollectionGroup()===t&&e.largestBatchId>n){let t=i.get(e.largestBatchId);null===t&&(t=ma(),i=i.insert(e.largestBatchId,t)),t.set(e.getKey(),e)}}const o=ma(),a=i.getIterator();for(;a.hasNext()&&(a.getNext().value.forEach((e,t)=>o.set(e,t)),!(o.size()>=r)););return Ni.resolve(o)}ht(e,t,n){const r=this.overlays.get(n.key);if(null!==r){const e=this.Ir.get(r.largestBatchId).delete(n.key);this.Ir.set(r.largestBatchId,e)}this.overlays=this.overlays.insert(n.key,new tc(t,n));let i=this.Ir.get(t);void 0===i&&(i=Ia(),this.Ir.set(t,i)),this.Ir.set(t,i.add(n.key))}}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cl{constructor(){this.sessionToken=Ls.EMPTY_BYTE_STRING}getSessionToken(e){return Ni.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,Ni.resolve()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kl{constructor(){this.Tr=new xs(Al.Er),this.dr=new xs(Al.Ar)}isEmpty(){return this.Tr.isEmpty()}addReference(e,t){const n=new Al(e,t);this.Tr=this.Tr.add(n),this.dr=this.dr.add(n)}Rr(e,t){e.forEach(e=>this.addReference(e,t))}removeReference(e,t){this.Vr(new Al(e,t))}mr(e,t){e.forEach(e=>this.removeReference(e,t))}gr(e){const t=new wi(new gi([])),n=new Al(t,e),r=new Al(t,e+1),i=[];return this.dr.forEachInRange([n,r],e=>{this.Vr(e),i.push(e.key)}),i}pr(){this.Tr.forEach(e=>this.Vr(e))}Vr(e){this.Tr=this.Tr.delete(e),this.dr=this.dr.delete(e)}yr(e){const t=new wi(new gi([])),n=new Al(t,e),r=new Al(t,e+1);let i=Ia();return this.dr.forEachInRange([n,r],e=>{i=i.add(e.key)}),i}containsKey(e){const t=new Al(e,0),n=this.Tr.firstAfterOrEqual(t);return null!==n&&e.isEqual(n.key)}}class Al{constructor(e,t){this.key=e,this.wr=t}static Er(e,t){return wi.comparator(e.key,t.key)||li(e.wr,t.wr)}static Ar(e,t){return li(e.wr,t.wr)||wi.comparator(e.key,t.key)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dl{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Sr=1,this.br=new xs(Al.Er)}checkEmpty(e){return Ni.resolve(0===this.mutationQueue.length)}addMutationBatch(e,t,n,r){const i=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const s=new Za(i,t,n,r);this.mutationQueue.push(s);for(const o of r)this.br=this.br.add(new Al(o.key,i)),this.indexManager.addToCollectionParentIndex(e,o.key.path.popLast());return Ni.resolve(s)}lookupMutationBatch(e,t){return Ni.resolve(this.Dr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,r=this.vr(n),i=r<0?0:r;return Ni.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return Ni.resolve(0===this.mutationQueue.length?-1:this.Sr-1)}getAllMutationBatches(e){return Ni.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new Al(t,0),r=new Al(t,Number.POSITIVE_INFINITY),i=[];return this.br.forEachInRange([n,r],e=>{const t=this.Dr(e.wr);i.push(t)}),Ni.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new xs(li);return t.forEach(e=>{const t=new Al(e,0),r=new Al(e,Number.POSITIVE_INFINITY);this.br.forEachInRange([t,r],e=>{n=n.add(e.wr)})}),Ni.resolve(this.Cr(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,r=n.length+1;let i=n;wi.isDocumentKey(i)||(i=i.child(""));const s=new Al(new wi(i),0);let o=new xs(li);return this.br.forEachWhile(e=>{const t=e.key.path;return!!n.isPrefixOf(t)&&(t.length===r&&(o=o.add(e.wr)),!0)},s),Ni.resolve(this.Cr(o))}Cr(e){const t=[];return e.forEach(e=>{const n=this.Dr(e);null!==n&&t.push(n)}),t}removeMutationBatch(e,t){Qr(0===this.Fr(t.batchId,"removed")),this.mutationQueue.shift();let n=this.br;return Ni.forEach(t.mutations,r=>{const i=new Al(r.key,t.batchId);return n=n.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,r.key)}).next(()=>{this.br=n})}On(e){}containsKey(e,t){const n=new Al(t,0),r=this.br.firstAfterOrEqual(n);return Ni.resolve(t.isEqual(r&&r.key))}performConsistencyCheck(e){return this.mutationQueue.length,Ni.resolve()}Fr(e,t){return this.vr(e)}vr(e){return 0===this.mutationQueue.length?0:e-this.mutationQueue[0].batchId}Dr(e){const t=this.vr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xl{constructor(e){this.Mr=e,this.docs=new ks(wi.comparator),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,r=this.docs.get(n),i=r?r.size:0,s=this.Mr(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:s}),this.size+=s-i,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return Ni.resolve(n?n.document.mutableCopy():vo.newInvalidDocument(t))}getEntries(e,t){let n=ha();return t.forEach(e=>{const t=this.docs.get(e);n=n.insert(e,t?t.document.mutableCopy():vo.newInvalidDocument(e))}),Ni.resolve(n)}getDocumentsMatchingQuery(e,t,n,r){let i=ha();const s=t.path,o=new wi(s.child("")),a=this.docs.getIteratorFrom(o);for(;a.hasNext();){const{key:e,value:{document:o}}=a.getNext();if(!s.isPrefixOf(e.path))break;e.path.length>s.length+1||ki(Si(o),n)<=0||(r.has(o.key)||oa(t,o))&&(i=i.insert(o.key,o.mutableCopy()))}return Ni.resolve(i)}getAllFromCollectionGroup(e,t,n,r){Wr()}Or(e,t){return Ni.forEach(this.docs,e=>t(e))}newChangeBuffer(e){return new Nl(this)}getSize(e){return Ni.resolve(this.size)}}class Nl extends fl{constructor(e){super(),this.cr=e}applyChanges(e){const t=[];return this.changes.forEach((n,r)=>{r.isValidDocument()?t.push(this.cr.addEntry(e,r)):this.cr.removeEntry(n)}),Ni.waitFor(t)}getFromCache(e,t){return this.cr.getEntry(e,t)}getAllFromCache(e,t){return this.cr.getEntries(e,t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rl{constructor(e){this.persistence=e,this.Nr=new ua(e=>Go(e),$o),this.lastRemoteSnapshotVersion=pi.min(),this.highestTargetId=0,this.Lr=0,this.Br=new kl,this.targetCount=0,this.kr=nl.Bn()}forEachTarget(e,t){return this.Nr.forEach((e,n)=>t(n)),Ni.resolve()}getLastRemoteSnapshotVersion(e){return Ni.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return Ni.resolve(this.Lr)}allocateTargetId(e){return this.highestTargetId=this.kr.next(),Ni.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.Lr&&(this.Lr=t),Ni.resolve()}Kn(e){this.Nr.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.kr=new nl(t),this.highestTargetId=t),e.sequenceNumber>this.Lr&&(this.Lr=e.sequenceNumber)}addTargetData(e,t){return this.Kn(t),this.targetCount+=1,Ni.resolve()}updateTargetData(e,t){return this.Kn(t),Ni.resolve()}removeTargetData(e,t){return this.Nr.delete(t.target),this.Br.gr(t.targetId),this.targetCount-=1,Ni.resolve()}removeTargets(e,t,n){let r=0;const i=[];return this.Nr.forEach((s,o)=>{o.sequenceNumber<=t&&null===n.get(o.targetId)&&(this.Nr.delete(s),i.push(this.removeMatchingKeysForTargetId(e,o.targetId)),r++)}),Ni.waitFor(i).next(()=>r)}getTargetCount(e){return Ni.resolve(this.targetCount)}getTargetData(e,t){const n=this.Nr.get(t)||null;return Ni.resolve(n)}addMatchingKeys(e,t,n){return this.Br.Rr(t,n),Ni.resolve()}removeMatchingKeys(e,t,n){this.Br.mr(t,n);const r=this.persistence.referenceDelegate,i=[];return r&&t.forEach(t=>{i.push(r.markPotentiallyOrphaned(e,t))}),Ni.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.Br.gr(t),Ni.resolve()}getMatchingKeysForTargetId(e,t){const n=this.Br.yr(t);return Ni.resolve(n)}containsKey(e,t){return Ni.resolve(this.Br.containsKey(t))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ol{constructor(e,t){this.qr={},this.overlays={},this.Qr=new Ki(0),this.Kr=!1,this.Kr=!0,this.$r=new Cl,this.referenceDelegate=e(this),this.Ur=new Rl(this),this.indexManager=new Fu,this.remoteDocumentCache=new xl(e=>this.referenceDelegate.Wr(e)),this.serializer=new eu(t),this.Gr=new El(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Sl,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.qr[e.toKey()];return n||(n=new Dl(t,this.referenceDelegate),this.qr[e.toKey()]=n),n}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(e,t,n){Kr("MemoryPersistence","Starting transaction:",e);const r=new Pl(this.Qr.next());return this.referenceDelegate.zr(),n(r).next(e=>this.referenceDelegate.jr(r).next(()=>e)).toPromise().then(e=>(r.raiseOnCommittedEvent(),e))}Hr(e,t){return Ni.or(Object.values(this.qr).map(n=>()=>n.containsKey(e,t)))}}class Pl extends Di{constructor(e){super(),this.currentSequenceNumber=e}}class Ll{constructor(e){this.persistence=e,this.Jr=new kl,this.Yr=null}static Zr(e){return new Ll(e)}get Xr(){if(this.Yr)return this.Yr;throw Wr()}addReference(e,t,n){return this.Jr.addReference(n,t),this.Xr.delete(n.toString()),Ni.resolve()}removeReference(e,t,n){return this.Jr.removeReference(n,t),this.Xr.add(n.toString()),Ni.resolve()}markPotentiallyOrphaned(e,t){return this.Xr.add(t.toString()),Ni.resolve()}removeTarget(e,t){this.Jr.gr(t.targetId).forEach(e=>this.Xr.add(e.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(e=>{e.forEach(e=>this.Xr.add(e.toString()))}).next(()=>n.removeTargetData(e,t))}zr(){this.Yr=new Set}jr(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return Ni.forEach(this.Xr,n=>{const r=wi.fromPath(n);return this.ei(e,r).next(e=>{e||t.removeEntry(r,pi.min())})}).next(()=>(this.Yr=null,t.apply(e)))}updateLimboDocument(e,t){return this.ei(e,t).next(e=>{e?this.Xr.delete(t.toString()):this.Xr.add(t.toString())})}Wr(e){return 0}ei(e,t){return Ni.or([()=>Ni.resolve(this.Jr.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Hr(e,t)])}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ml{constructor(e){this.serializer=e}O(e,t,n,r){const i=new Ri("createOrUpgrade",t);var s;n<1&&r>=1&&(e.createObjectStore("owner"),(s=e).createObjectStore("mutationQueues",{keyPath:"userId"}),s.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",Xi,{unique:!0}),s.createObjectStore("documentMutations"),Vl(e),function(e){e.createObjectStore("remoteDocuments")}(e));let o=Ni.resolve();return n<3&&r>=3&&(0!==n&&(function(e){e.deleteObjectStore("targetDocuments"),e.deleteObjectStore("targets"),e.deleteObjectStore("targetGlobal")}(e),Vl(e)),o=o.next(()=>function(e){const t=e.store("targetGlobal"),n={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:pi.min().toTimestamp(),targetCount:0};return t.put("targetGlobalKey",n)}(i))),n<4&&r>=4&&(0!==n&&(o=o.next(()=>function(e,t){return t.store("mutations").U().next(n=>{e.deleteObjectStore("mutations"),e.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",Xi,{unique:!0});const r=t.store("mutations"),i=n.map(e=>r.put(e));return Ni.waitFor(i)})}(e,i))),o=o.next(()=>{!function(e){e.createObjectStore("clientMetadata",{keyPath:"clientId"})}(e)})),n<5&&r>=5&&(o=o.next(()=>this.ni(i))),n<6&&r>=6&&(o=o.next(()=>(function(e){e.createObjectStore("remoteDocumentGlobal")}(e),this.ri(i)))),n<7&&r>=7&&(o=o.next(()=>this.ii(i))),n<8&&r>=8&&(o=o.next(()=>this.si(e,i))),n<9&&r>=9&&(o=o.next(()=>{!function(e){e.objectStoreNames.contains("remoteDocumentChanges")&&e.deleteObjectStore("remoteDocumentChanges")}(e)})),n<10&&r>=10&&(o=o.next(()=>this.oi(i))),n<11&&r>=11&&(o=o.next(()=>{!function(e){e.createObjectStore("bundles",{keyPath:"bundleId"})}(e),function(e){e.createObjectStore("namedQueries",{keyPath:"name"})}(e)})),n<12&&r>=12&&(o=o.next(()=>{!function(e){const t=e.createObjectStore("documentOverlays",{keyPath:ds});t.createIndex("collectionPathOverlayIndex",fs,{unique:!1}),t.createIndex("collectionGroupOverlayIndex",ps,{unique:!1})}(e)})),n<13&&r>=13&&(o=o.next(()=>function(e){const t=e.createObjectStore("remoteDocumentsV14",{keyPath:ts});t.createIndex("documentKeyIndex",ns),t.createIndex("collectionGroupIndex",rs)}(e)).next(()=>this._i(e,i)).next(()=>e.deleteObjectStore("remoteDocuments"))),n<14&&r>=14&&(o=o.next(()=>this.ai(e,i))),n<15&&r>=15&&(o=o.next(()=>function(e){e.createObjectStore("indexConfiguration",{keyPath:"indexId",autoIncrement:!0}).createIndex("collectionGroupIndex","collectionGroup",{unique:!1}),e.createObjectStore("indexState",{keyPath:cs}).createIndex("sequenceNumberIndex",us,{unique:!1}),e.createObjectStore("indexEntries",{keyPath:ls}).createIndex("documentKeyIndex",hs,{unique:!1})}(e))),n<16&&r>=16&&(o=o.next(()=>{t.objectStore("indexState").clear()}).next(()=>{t.objectStore("indexEntries").clear()})),n<17&&r>=17&&(o=o.next(()=>{!function(e){e.createObjectStore("globals",{keyPath:"name"})}(e)})),o}ri(e){let t=0;return e.store("remoteDocuments").J((e,n)=>{t+=Ju(n)}).next(()=>{const n={byteSize:t};return e.store("remoteDocumentGlobal").put("remoteDocumentGlobalKey",n)})}ni(e){const t=e.store("mutationQueues"),n=e.store("mutations");return t.U().next(t=>Ni.forEach(t,t=>{const r=IDBKeyRange.bound([t.userId,-1],[t.userId,t.lastAcknowledgedBatchId]);return n.U("userMutationsIndex",r).next(n=>Ni.forEach(n,n=>{Qr(n.userId===t.userId);const r=su(this.serializer,n);return Qu(e,t.userId,r).next(()=>{})}))}))}ii(e){const t=e.store("targetDocuments"),n=e.store("remoteDocuments");return e.store("targetGlobal").get("targetGlobalKey").next(e=>{const r=[];return n.J((n,i)=>{const s=new gi(n),o=[0,Hi(s)];r.push(t.get(o).next(n=>{return n?Ni.resolve():(r=s,t.put({targetId:0,path:Hi(r),sequenceNumber:e.highestListenSequenceNumber}));var r}))}).next(()=>Ni.waitFor(r))})}si(e,t){e.createObjectStore("collectionParents",{keyPath:as});const n=t.store("collectionParents"),r=new Uu,i=e=>{if(r.add(e)){const t=e.lastSegment(),r=e.popLast();return n.put({collectionId:t,parent:Hi(r)})}};return t.store("remoteDocuments").J({H:!0},(e,t)=>{const n=new gi(e);return i(n.popLast())}).next(()=>t.store("documentMutations").J({H:!0},([e,t,n],r)=>{const s=Ji(t);return i(s.popLast())}))}oi(e){const t=e.store("targets");return t.J((e,n)=>{const r=ou(n),i=au(this.serializer,r);return t.put(i)})}_i(e,t){const n=t.store("remoteDocuments"),r=[];return n.J((e,n)=>{const i=t.store("remoteDocumentsV14"),s=(a=n,a.document?new wi(gi.fromString(a.document.name).popFirst(5)):a.noDocument?wi.fromSegments(a.noDocument.path):a.unknownDocument?wi.fromSegments(a.unknownDocument.path):Wr()).path.toArray(),o={prefixPath:s.slice(0,s.length-2),collectionGroup:s[s.length-2],documentId:s[s.length-1],readTime:n.readTime||[0,0],unknownDocument:n.unknownDocument,noDocument:n.noDocument,document:n.document,hasCommittedMutations:!!n.hasCommittedMutations};var a;r.push(i.put(o))}).next(()=>Ni.waitFor(r))}ai(e,t){const n=t.store("mutations"),r=ml(this.serializer),i=new Ol(Ll.Zr,this.serializer.ct);return n.U().next(e=>{const n=new Map;return e.forEach(e=>{var t;let r=null!==(t=n.get(e.userId))&&void 0!==t?t:Ia();su(this.serializer,e).keys().forEach(e=>r=r.add(e)),n.set(e.userId,r)}),Ni.forEach(n,(e,n)=>{const s=new Br(n),o=mu.lt(this.serializer,s),a=i.getIndexManager(s),c=Xu.lt(s,this.serializer,a,i.referenceDelegate);return new Tl(r,c,o,a).recalculateAndSaveOverlaysForDocumentKeys(new _s(t,Ki.oe),e).next()})})}}function Vl(e){e.createObjectStore("targetDocuments",{keyPath:ss}).createIndex("documentTargetsIndex",os,{unique:!0}),e.createObjectStore("targets",{keyPath:"targetId"}).createIndex("queryTargetsIndex",is,{unique:!0}),e.createObjectStore("targetGlobal")}const Fl="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";class Ul{constructor(e,t,n,r,i,s,o,a,c,u,l=17){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.ui=i,this.window=s,this.document=o,this.ci=c,this.li=u,this.hi=l,this.Qr=null,this.Kr=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Pi=null,this.inForeground=!1,this.Ii=null,this.Ti=null,this.Ei=Number.NEGATIVE_INFINITY,this.di=e=>Promise.resolve(),!Ul.D())throw new Yr(Xr.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new hl(this,r),this.Ai=t+"main",this.serializer=new eu(a),this.Ri=new Oi(this.Ai,this.hi,new Ml(this.serializer)),this.$r=new yu,this.Ur=new rl(this.referenceDelegate,this.serializer),this.remoteDocumentCache=ml(this.serializer),this.Gr=new du,this.window&&this.window.localStorage?this.Vi=this.window.localStorage:(this.Vi=null,!1===u&&Gr("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.mi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new Yr(Xr.FAILED_PRECONDITION,Fl);return this.fi(),this.gi(),this.pi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Ur.getHighestSequenceNumber(e))}).then(e=>{this.Qr=new Ki(e,this.ci)}).then(()=>{this.Kr=!0}).catch(e=>(this.Ri&&this.Ri.close(),Promise.reject(e)))}yi(e){return this.di=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ri.L(async t=>{null===t.newVersion&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.ui.enqueueAndForget(async()=>{this.started&&await this.mi()}))}mi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>jl(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.wi(e).next(e=>{e||(this.isPrimary=!1,this.ui.enqueueRetryable(()=>this.di(!1)))})}).next(()=>this.Si(e)).next(t=>this.isPrimary&&!t?this.bi(e).next(()=>!1):!!t&&this.Di(e).next(()=>!0))).catch(e=>{if(Vi(e))return Kr("IndexedDbPersistence","Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return Kr("IndexedDbPersistence","Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.ui.enqueueRetryable(()=>this.di(e)),this.isPrimary=e})}wi(e){return Bl(e).get("owner").next(e=>Ni.resolve(this.vi(e)))}Ci(e){return jl(e).delete(this.clientId)}async Fi(){if(this.isPrimary&&!this.Mi(this.Ei,18e5)){this.Ei=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",e=>{const t=Ts(e,"clientMetadata");return t.U().next(e=>{const n=this.xi(e,18e5),r=e.filter(e=>-1===n.indexOf(e));return Ni.forEach(r,e=>t.delete(e.clientId)).next(()=>r)})}).catch(()=>[]);if(this.Vi)for(const t of e)this.Vi.removeItem(this.Oi(t.clientId))}}pi(){this.Ti=this.ui.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.mi().then(()=>this.Fi()).then(()=>this.pi()))}vi(e){return!!e&&e.ownerId===this.clientId}Si(e){return this.li?Ni.resolve(!0):Bl(e).get("owner").next(t=>{if(null!==t&&this.Mi(t.leaseTimestampMs,5e3)&&!this.Ni(t.ownerId)){if(this.vi(t)&&this.networkEnabled)return!0;if(!this.vi(t)){if(!t.allowTabSynchronization)throw new Yr(Xr.FAILED_PRECONDITION,Fl);return!1}}return!(!this.networkEnabled||!this.inForeground)||jl(e).U().next(e=>void 0===this.xi(e,5e3).find(e=>{if(this.clientId!==e.clientId){const t=!this.networkEnabled&&e.networkEnabled,n=!this.inForeground&&e.inForeground,r=this.networkEnabled===e.networkEnabled;if(t||n&&r)return!0}return!1}))}).next(e=>(this.isPrimary!==e&&Kr("IndexedDbPersistence",`Client ${e?"is":"is not"} eligible for a primary lease.`),e))}async shutdown(){this.Kr=!1,this.Li(),this.Ti&&(this.Ti.cancel(),this.Ti=null),this.Bi(),this.ki(),await this.Ri.runTransaction("shutdown","readwrite",["owner","clientMetadata"],e=>{const t=new _s(e,Ki.oe);return this.bi(t).next(()=>this.Ci(t))}),this.Ri.close(),this.qi()}xi(e,t){return e.filter(e=>this.Mi(e.updateTimeMs,t)&&!this.Ni(e.clientId))}Qi(){return this.runTransaction("getActiveClients","readonly",e=>jl(e).U().next(e=>this.xi(e,18e5).map(e=>e.clientId)))}get started(){return this.Kr}getGlobalsCache(){return this.$r}getMutationQueue(e,t){return Xu.lt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new ju(e,this.serializer.ct.databaseId)}getDocumentOverlayCache(e){return mu.lt(this.serializer,e)}getBundleCache(){return this.Gr}runTransaction(e,t,n){Kr("IndexedDbPersistence","Starting transaction:",e);const r="readonly"===t?"readonly":"readwrite",i=17===(s=this.hi)?bs:16===s?Is:15===s?ws:14===s?vs:13===s?ys:12===s?gs:11===s?ms:void Wr();var s;let o;return this.Ri.runTransaction(e,r,i,r=>(o=new _s(r,this.Qr?this.Qr.next():Ki.oe),"readwrite-primary"===t?this.wi(o).next(e=>!!e||this.Si(o)).next(t=>{if(!t)throw Gr(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.ui.enqueueRetryable(()=>this.di(!1)),new Yr(Xr.FAILED_PRECONDITION,Ai);return n(o)}).next(e=>this.Di(o).next(()=>e)):this.Ki(o).next(()=>n(o)))).then(e=>(o.raiseOnCommittedEvent(),e))}Ki(e){return Bl(e).get("owner").next(e=>{if(null!==e&&this.Mi(e.leaseTimestampMs,5e3)&&!this.Ni(e.ownerId)&&!this.vi(e)&&!(this.li||this.allowTabSynchronization&&e.allowTabSynchronization))throw new Yr(Xr.FAILED_PRECONDITION,Fl)})}Di(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Bl(e).put("owner",t)}static D(){return Oi.D()}bi(e){const t=Bl(e);return t.get("owner").next(e=>this.vi(e)?(Kr("IndexedDbPersistence","Releasing primary lease."),t.delete("owner")):Ni.resolve())}Mi(e,t){const n=Date.now();return!(e<n-t||e>n&&(Gr(`Detected an update time that is in the future: ${e} > ${n}`),1))}fi(){null!==this.document&&"function"==typeof this.document.addEventListener&&(this.Ii=()=>{this.ui.enqueueAndForget(()=>(this.inForeground="visible"===this.document.visibilityState,this.mi()))},this.document.addEventListener("visibilitychange",this.Ii),this.inForeground="visible"===this.document.visibilityState)}Bi(){this.Ii&&(this.document.removeEventListener("visibilitychange",this.Ii),this.Ii=null)}gi(){var e;"function"==typeof(null===(e=this.window)||void 0===e?void 0:e.addEventListener)&&(this.Pi=()=>{this.Li();const e=/(?:Version|Mobile)\/1[456]/;d()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.ui.enterRestrictedMode(!0),this.ui.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Pi))}ki(){this.Pi&&(this.window.removeEventListener("pagehide",this.Pi),this.Pi=null)}Ni(e){var t;try{const n=null!==(null===(t=this.Vi)||void 0===t?void 0:t.getItem(this.Oi(e)));return Kr("IndexedDbPersistence",`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return Gr("IndexedDbPersistence","Failed to get zombied client id.",n),!1}}Li(){if(this.Vi)try{this.Vi.setItem(this.Oi(this.clientId),String(Date.now()))}catch(e){Gr("Failed to set zombie client id.",e)}}qi(){if(this.Vi)try{this.Vi.removeItem(this.Oi(this.clientId))}catch(e){}}Oi(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Bl(e){return Ts(e,"owner")}function jl(e){return Ts(e,"clientMetadata")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class ql{constructor(e,t,n,r){this.targetId=e,this.fromCache=t,this.$i=n,this.Ui=r}static Wi(e,t){let n=Ia(),r=Ia();for(const i of t.docChanges)switch(i.type){case 0:n=n.add(i.doc.key);break;case 1:r=r.add(i.doc.key)}return new ql(e,t.fromCache,n,r)}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zl{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kl{constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=d()?8:Pi(h())>0?6:4}initialize(e,t){this.Ji=e,this.indexManager=t,this.Gi=!0}getDocumentsMatchingQuery(e,t,n,r){const i={result:null};return this.Yi(e,t).next(e=>{i.result=e}).next(()=>{if(!i.result)return this.Zi(e,t,r,n).next(e=>{i.result=e})}).next(()=>{if(i.result)return;const n=new zl;return this.Xi(e,t,n).next(r=>{if(i.result=r,this.zi)return this.es(e,t,n,r.size)})}).next(()=>i.result)}es(e,t,n,r){return n.documentReadCount<this.ji?(zr()<=k.DEBUG&&Kr("QueryEngine","SDK will not create cache indexes for query:",sa(t),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),Ni.resolve()):(zr()<=k.DEBUG&&Kr("QueryEngine","Query:",sa(t),"scans",n.documentReadCount,"local documents and returns",r,"documents as results."),n.documentReadCount>this.Hi*r?(zr()<=k.DEBUG&&Kr("QueryEngine","The SDK decides to create cache indexes for query:",sa(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,ta(t))):Ni.resolve())}Yi(e,t){if(Zo(t))return Ni.resolve(null);let n=ta(t);return this.indexManager.getIndexType(e,n).next(r=>0===r?null:(null!==t.limit&&1===r&&(t=na(t,null,"F"),n=ta(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(r=>{const i=Ia(...r);return this.Ji.getDocuments(e,i).next(r=>this.indexManager.getMinOffset(e,n).next(n=>{const s=this.ts(t,r);return this.ns(t,s,i,n.readTime)?this.Yi(e,na(t,null,"F")):this.rs(e,s,t,n)}))})))}Zi(e,t,n,r){return Zo(t)||r.isEqual(pi.min())?Ni.resolve(null):this.Ji.getDocuments(e,n).next(i=>{const s=this.ts(t,i);return this.ns(t,s,n,r)?Ni.resolve(null):(zr()<=k.DEBUG&&Kr("QueryEngine","Re-using previous result from %s to execute query: %s",r.toString(),sa(t)),this.rs(e,s,t,function(e){const t=e.toTimestamp().seconds,n=e.toTimestamp().nanoseconds+1,r=pi.fromTimestamp(1e9===n?new fi(t+1,0):new fi(t,n));return new Ci(r,wi.empty(),-1)}(r)).next(e=>e))})}ts(e,t){let n=new xs(aa(e));return t.forEach((t,r)=>{oa(e,r)&&(n=n.add(r))}),n}ns(e,t,n,r){if(null===e.limit)return!1;if(n.size!==t.size)return!0;const i="F"===e.limitType?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(r)>0)}Xi(e,t,n){return zr()<=k.DEBUG&&Kr("QueryEngine","Using full collection scan to execute query:",sa(t)),this.Ji.getDocumentsMatchingQuery(e,t,Ci.min(),n)}rs(e,t,n,r){return this.Ji.getDocumentsMatchingQuery(e,n,r).next(e=>(t.forEach(t=>{e=e.insert(t.key,t)}),e))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gl{constructor(e,t,n,r){this.persistence=e,this.ss=t,this.serializer=r,this.os=new ks(li),this._s=new ua(e=>Go(e),$o),this.us=new Map,this.cs=e.getRemoteDocumentCache(),this.Ur=e.getTargetCache(),this.Gr=e.getBundleCache(),this.ls(n)}ls(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Tl(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.os))}}function $l(e,t,n,r){return new Gl(e,t,n,r)}async function Hl(e,t){const n=Jr(e);return await n.persistence.runTransaction("Handle user change","readonly",e=>{let r;return n.mutationQueue.getAllMutationBatches(e).next(i=>(r=i,n.ls(t),n.mutationQueue.getAllMutationBatches(e))).next(t=>{const i=[],s=[];let o=Ia();for(const e of r){i.push(e.batchId);for(const t of e.mutations)o=o.add(t.key)}for(const e of t){s.push(e.batchId);for(const t of e.mutations)o=o.add(t.key)}return n.localDocuments.getDocuments(e,o).next(e=>({hs:e,removedBatchIds:i,addedBatchIds:s}))})})}function Wl(e){const t=Jr(e);return t.persistence.runTransaction("Get last remote snapshot version","readonly",e=>t.Ur.getLastRemoteSnapshotVersion(e))}function Ql(e,t){const n=Jr(e);return n.persistence.runTransaction("Get next mutation batch","readonly",e=>(void 0===t&&(t=-1),n.mutationQueue.getNextMutationBatchAfterBatchId(e,t)))}async function Jl(e,t,n){const r=Jr(e),i=r.os.get(t),s=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",s,e=>r.persistence.referenceDelegate.removeTarget(e,i))}catch(o){if(!Vi(o))throw o;Kr("LocalStore",`Failed to update sequence numbers for target ${t}: ${o}`)}r.os=r.os.remove(t),r._s.delete(i.target)}function Xl(e,t,n){const r=Jr(e);let i=pi.min(),s=Ia();return r.persistence.runTransaction("Execute query","readwrite",e=>function(e,t,n){const r=Jr(e),i=r._s.get(n);return void 0!==i?Ni.resolve(r.os.get(i)):r.Ur.getTargetData(t,n)}(r,e,ta(t)).next(t=>{if(t)return i=t.lastLimboFreeSnapshotVersion,r.Ur.getMatchingKeysForTargetId(e,t.targetId).next(e=>{s=e})}).next(()=>r.ss.getDocumentsMatchingQuery(e,t,n?i:pi.min(),n?s:Ia())).next(e=>(function(e,t,n){let r=e.us.get(t)||pi.min();n.forEach((e,t)=>{t.readTime.compareTo(r)>0&&(r=t.readTime)}),e.us.set(t,r)}(r,function(e){return e.collectionGroup||(e.path.length%2==1?e.path.lastSegment():e.path.get(e.path.length-2))}(t),e),{documents:e,Ts:s})))}class Yl{constructor(){this.activeTargetIds=ba}fs(e){this.activeTargetIds=this.activeTargetIds.add(e)}gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Vs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Zl{constructor(){this.so=new Yl,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.so.fs(e),this.oo[e]||"not-current"}updateQueryState(e,t,n){this.oo[e]=t}removeLocalQueryTarget(e){this.so.gs(e)}isLocalQueryTarget(e){return this.so.activeTargetIds.has(e)}clearQueryState(e){delete this.oo[e]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(e){return this.so.activeTargetIds.has(e)}start(){return this.so=new Yl,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eh{_o(e){}shutdown(){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class th{constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}_o(e){this.ho.push(e)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){Kr("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const e of this.ho)e(0)}lo(){Kr("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const e of this.ho)e(1)}static D(){return"undefined"!=typeof window&&void 0!==window.addEventListener&&void 0!==window.removeEventListener}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let nh=null;function rh(){return null===nh?nh=268435456+Math.round(2147483648*Math.random()):nh++,"0x"+nh.toString(16)
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}const ih={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sh{constructor(e){this.Io=e.Io,this.To=e.To}Eo(e){this.Ao=e}Ro(e){this.Vo=e}mo(e){this.fo=e}onMessage(e){this.po=e}close(){this.To()}send(e){this.Io(e)}yo(){this.Ao()}wo(){this.Vo()}So(e){this.fo(e)}bo(e){this.po(e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oh="WebChannelConnection";class ah extends class{constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),r=encodeURIComponent(this.databaseId.database);this.Do=t+"://"+e.host,this.vo=`projects/${n}/databases/${r}`,this.Co="(default)"===this.databaseId.database?`project_id=${n}`:`project_id=${n}&database_id=${r}`}get Fo(){return!1}Mo(e,t,n,r,i){const s=rh(),o=this.xo(e,t.toUriEncodedString());Kr("RestConnection",`Sending RPC '${e}' ${s}:`,o,n);const a={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(a,r,i),this.No(e,o,a,n).then(t=>(Kr("RestConnection",`Received RPC '${e}' ${s}: `,t),t),t=>{throw $r("RestConnection",`RPC '${e}' ${s} failed with error: `,t,"url: ",o,"request:",n),t})}Lo(e,t,n,r,i,s){return this.Mo(e,t,n,r,i)}Oo(e,t,n){e["X-Goog-Api-Client"]="gl-js/ fire/"+jr,e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((t,n)=>e[n]=t),n&&n.headers.forEach((t,n)=>e[n]=t)}xo(e,t){const n=ih[e];return`${this.Do}/v1/${t}:${n}`}terminate(){}}{constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}No(e,t,n,r){const i=rh();return new Promise((s,o)=>{const a=new xr;a.setWithCredentials(!0),a.listenOnce(Rr.COMPLETE,()=>{try{switch(a.getLastErrorCode()){case Or.NO_ERROR:const t=a.getResponseJson();Kr(oh,`XHR for RPC '${e}' ${i} received:`,JSON.stringify(t)),s(t);break;case Or.TIMEOUT:Kr(oh,`RPC '${e}' ${i} timed out`),o(new Yr(Xr.DEADLINE_EXCEEDED,"Request time out"));break;case Or.HTTP_ERROR:const n=a.getStatus();if(Kr(oh,`RPC '${e}' ${i} failed with status:`,n,"response text:",a.getResponseText()),n>0){let e=a.getResponseJson();Array.isArray(e)&&(e=e[0]);const t=null==e?void 0:e.error;if(t&&t.status&&t.message){const e=function(e){const t=e.toLowerCase().replace(/_/g,"-");return Object.values(Xr).indexOf(t)>=0?t:Xr.UNKNOWN}(t.status);o(new Yr(e,t.message))}else o(new Yr(Xr.UNKNOWN,"Server responded with status "+a.getStatus()))}else o(new Yr(Xr.UNAVAILABLE,"Connection failed."));break;default:Wr()}}finally{Kr(oh,`RPC '${e}' ${i} completed.`)}});const c=JSON.stringify(r);Kr(oh,`RPC '${e}' ${i} sending request:`,r),a.send(t,"POST",c,n,15)})}Bo(e,t,n){const r=rh(),i=[this.Do,"/","google.firestore.v1.Firestore","/",e,"/channel"],s=Vr(),o=Mr(),a={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},c=this.longPollingOptions.timeoutSeconds;void 0!==c&&(a.longPollingTimeout=Math.round(1e3*c)),this.useFetchStreams&&(a.useFetchStreams=!0),this.Oo(a.initMessageHeaders,t,n),a.encodeInitMessageHeaders=!0;const u=i.join("");Kr(oh,`Creating RPC '${e}' stream ${r}: ${u}`,a);const l=s.createWebChannel(u,a);let h=!1,d=!1;const f=new sh({Io:t=>{d?Kr(oh,`Not sending because RPC '${e}' stream ${r} is closed:`,t):(h||(Kr(oh,`Opening RPC '${e}' stream ${r} transport.`),l.open(),h=!0),Kr(oh,`RPC '${e}' stream ${r} sending:`,t),l.send(t))},To:()=>l.close()}),p=(e,t,n)=>{e.listen(t,e=>{try{n(e)}catch(t){setTimeout(()=>{throw t},0)}})};return p(l,Nr.EventType.OPEN,()=>{d||(Kr(oh,`RPC '${e}' stream ${r} transport opened.`),f.yo())}),p(l,Nr.EventType.CLOSE,()=>{d||(d=!0,Kr(oh,`RPC '${e}' stream ${r} transport closed`),f.So())}),p(l,Nr.EventType.ERROR,t=>{d||(d=!0,$r(oh,`RPC '${e}' stream ${r} transport errored:`,t),f.So(new Yr(Xr.UNAVAILABLE,"The operation could not be completed")))}),p(l,Nr.EventType.MESSAGE,t=>{var n;if(!d){const i=t.data[0];Qr(!!i);const s=i,o=s.error||(null===(n=s[0])||void 0===n?void 0:n.error);if(o){Kr(oh,`RPC '${e}' stream ${r} received error:`,o);const t=o.status;let n=function(e){const t=rc[e];if(void 0!==t)return sc(t)}(t),i=o.message;void 0===n&&(n=Xr.INTERNAL,i="Unknown error status: "+t+" with message "+o.message),d=!0,f.So(new Yr(n,i)),l.close()}else Kr(oh,`RPC '${e}' stream ${r} received:`,i),f.bo(i)}}),p(o,Lr.STAT_EVENT,t=>{t.stat===Pr.PROXY?Kr(oh,`RPC '${e}' stream ${r} detected buffering proxy`):t.stat===Pr.NOPROXY&&Kr(oh,`RPC '${e}' stream ${r} detected no buffering proxy`)}),setTimeout(()=>{f.wo()},0),f}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ch(){return"undefined"!=typeof document?document:null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uh(e){return new Tc(e,!0)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lh{constructor(e,t,n=1e3,r=1.5,i=6e4){this.ui=e,this.timerId=t,this.ko=n,this.qo=r,this.Qo=i,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();const t=Math.floor(this.Ko+this.zo()),n=Math.max(0,Date.now()-this.Uo),r=Math.max(0,t-n);r>0&&Kr("ExponentialBackoff",`Backing off for ${r} ms (base delay: ${this.Ko} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,r,()=>(this.Uo=Date.now(),e())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){null!==this.$o&&(this.$o.skipDelay(),this.$o=null)}cancel(){null!==this.$o&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hh{constructor(e,t,n,r,i,s,o,a){this.ui=e,this.Ho=n,this.Jo=r,this.connection=i,this.authCredentialsProvider=s,this.appCheckCredentialsProvider=o,this.listener=a,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new lh(e,t)}n_(){return 1===this.state||5===this.state||this.r_()}r_(){return 2===this.state||3===this.state}start(){this.e_=0,4!==this.state?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&null===this.Zo&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,()=>this.__()))}a_(e){this.u_(),this.stream.send(e)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(e,t){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,4!==e?this.t_.reset():t&&t.code===Xr.RESOURCE_EXHAUSTED?(Gr(t.toString()),Gr("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):t&&t.code===Xr.UNAUTHENTICATED&&3!==this.state&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),null!==this.stream&&(this.l_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.mo(t)}l_(){}auth(){this.state=1;const e=this.h_(this.Yo),t=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([e,n])=>{this.Yo===t&&this.P_(e,n)},t=>{e(()=>{const e=new Yr(Xr.UNKNOWN,"Fetching auth token failed: "+t.message);return this.I_(e)})})}P_(e,t){const n=this.h_(this.Yo);this.stream=this.T_(e,t),this.stream.Eo(()=>{n(()=>this.listener.Eo())}),this.stream.Ro(()=>{n(()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,()=>(this.r_()&&(this.state=3),Promise.resolve())),this.listener.Ro()))}),this.stream.mo(e=>{n(()=>this.I_(e))}),this.stream.onMessage(e=>{n(()=>1==++this.e_?this.E_(e):this.onNext(e))})}i_(){this.state=5,this.t_.Go(async()=>{this.state=0,this.start()})}I_(e){return Kr("PersistentStream",`close with error: ${e}`),this.stream=null,this.close(4,e)}h_(e){return t=>{this.ui.enqueueAndForget(()=>this.Yo===e?t():(Kr("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class dh extends hh{constructor(e,t,n,r,i,s){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,r,s),this.serializer=i}T_(e,t){return this.connection.Bo("Listen",e,t)}E_(e){return this.onNext(e)}onNext(e){this.t_.reset();const t=function(e,t){let n;if("targetChange"in t){t.targetChange;const i="NO_CHANGE"===(r=t.targetChange.targetChangeType||"NO_CHANGE")?0:"ADD"===r?1:"REMOVE"===r?2:"CURRENT"===r?3:"RESET"===r?4:Wr(),s=t.targetChange.targetIds||[],o=function(e,t){return e.useProto3Json?(Qr(void 0===t||"string"==typeof t),Ls.fromBase64String(t||"")):(Qr(void 0===t||t instanceof Buffer||t instanceof Uint8Array),Ls.fromUint8Array(t||new Uint8Array))}(e,t.targetChange.resumeToken),a=t.targetChange.cause,c=a&&function(e){const t=void 0===e.code?Xr.UNKNOWN:sc(e.code);return new Yr(t,e.message||"")}(a);n=new mc(i,s,o,c||null)}else if("documentChange"in t){t.documentChange;const r=t.documentChange;r.document,r.document.name,r.document.updateTime;const i=Oc(e,r.document.name),s=Ac(r.document.updateTime),o=r.document.createTime?Ac(r.document.createTime):pi.min(),a=new go({mapValue:{fields:r.document.fields}}),c=vo.newFoundDocument(i,s,o,a),u=r.targetIds||[],l=r.removedTargetIds||[];n=new fc(u,l,c.key,c)}else if("documentDelete"in t){t.documentDelete;const r=t.documentDelete;r.document;const i=Oc(e,r.document),s=r.readTime?Ac(r.readTime):pi.min(),o=vo.newNoDocument(i,s),a=r.removedTargetIds||[];n=new fc([],a,o.key,o)}else if("documentRemove"in t){t.documentRemove;const r=t.documentRemove;r.document;const i=Oc(e,r.document),s=r.removedTargetIds||[];n=new fc([],s,i,null)}else{if(!("filter"in t))return Wr();{t.filter;const e=t.filter;e.targetId;const{count:r=0,unchangedNames:i}=e,s=new nc(r,i),o=e.targetId;n=new pc(o,s)}}var r;return n}(this.serializer,e),n=function(e){if(!("targetChange"in e))return pi.min();const t=e.targetChange;return t.targetIds&&t.targetIds.length?pi.min():t.readTime?Ac(t.readTime):pi.min()}(e);return this.listener.d_(t,n)}A_(e){const t={};t.database=Mc(this.serializer),t.addTarget=function(e,t){let n;const r=t.target;if(n=Ho(r)?{documents:jc(e,r)}:{query:qc(e,r)._t},n.targetId=t.targetId,t.resumeToken.approximateByteSize()>0){n.resumeToken=Cc(e,t.resumeToken);const r=Ec(e,t.expectedCount);null!==r&&(n.expectedCount=r)}else if(t.snapshotVersion.compareTo(pi.min())>0){n.readTime=Sc(e,t.snapshotVersion.toTimestamp());const r=Ec(e,t.expectedCount);null!==r&&(n.expectedCount=r)}return n}(this.serializer,e);const n=function(e,t){const n=function(e){switch(e){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return Wr()}}(t.purpose);return null==n?null:{"goog-listen-tags":n}}(this.serializer,e);n&&(t.labels=n),this.a_(t)}R_(e){const t={};t.database=Mc(this.serializer),t.removeTarget=e,this.a_(t)}}class fh extends hh{constructor(e,t,n,r,i,s){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,r,s),this.serializer=i}get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(e,t){return this.connection.Bo("Write",e,t)}E_(e){return Qr(!!e.streamToken),this.lastStreamToken=e.streamToken,Qr(!e.writeResults||0===e.writeResults.length),this.listener.f_()}onNext(e){Qr(!!e.streamToken),this.lastStreamToken=e.streamToken,this.t_.reset();const t=function(e,t){return e&&e.length>0?(Qr(void 0!==t),e.map(e=>function(e,t){let n=e.updateTime?Ac(e.updateTime):Ac(t);return n.isEqual(pi.min())&&(n=Ac(t)),new Va(n,e.transformResults||[])}(e,t))):[]}(e.writeResults,e.commitTime),n=Ac(e.commitTime);return this.listener.g_(n,t)}p_(){const e={};e.database=Mc(this.serializer),this.a_(e)}m_(e){const t={streamToken:this.lastStreamToken,writes:e.map(e=>Uc(this.serializer,e))};this.a_(t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ph extends class{}{constructor(e,t,n,r){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=r,this.y_=!1}w_(){if(this.y_)throw new Yr(Xr.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(e,t,n,r){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,s])=>this.connection.Mo(e,xc(t,n),r,i,s)).catch(e=>{throw"FirebaseError"===e.name?(e.code===Xr.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),e):new Yr(Xr.UNKNOWN,e.toString())})}Lo(e,t,n,r,i){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Lo(e,xc(t,n),r,s,o,i)).catch(e=>{throw"FirebaseError"===e.name?(e.code===Xr.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),e):new Yr(Xr.UNKNOWN,e.toString())})}terminate(){this.y_=!0,this.connection.terminate()}}class mh{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}v_(){0===this.S_&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve())))}M_(e){"Online"===this.state?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.C_("Offline")))}set(e){this.x_(),this.S_=0,"Online"===e&&(this.D_=!1),this.C_(e)}C_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}F_(e){const t=`Could not reach Cloud Firestore backend. ${e}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.D_?(Gr(t),this.D_=!1):Kr("OnlineStateTracker",t)}x_(){null!==this.b_&&(this.b_.cancel(),this.b_=null)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gh{constructor(e,t,n,r,i){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=i,this.k_._o(e=>{n.enqueueAndForget(async()=>{Sh(this)&&(Kr("RemoteStore","Restarting streams for network reachability change."),await async function(e){const t=Jr(e);t.L_.add(4),await vh(t),t.q_.set("Unknown"),t.L_.delete(4),await yh(t)}(this))})}),this.q_=new mh(n,r)}}async function yh(e){if(Sh(e))for(const t of e.B_)await t(!0)}async function vh(e){for(const t of e.B_)await t(!1)}function wh(e,t){const n=Jr(e);n.N_.has(t.targetId)||(n.N_.set(t.targetId,t),Eh(n)?Th(n):zh(n).r_()&&bh(n,t))}function Ih(e,t){const n=Jr(e),r=zh(n);n.N_.delete(t),r.r_()&&_h(n,t),0===n.N_.size&&(r.r_()?r.o_():Sh(n)&&n.q_.set("Unknown"))}function bh(e,t){if(e.Q_.xe(t.targetId),t.resumeToken.approximateByteSize()>0||t.snapshotVersion.compareTo(pi.min())>0){const n=e.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;t=t.withExpectedCount(n)}zh(e).A_(t)}function _h(e,t){e.Q_.xe(t),zh(e).R_(t)}function Th(e){e.Q_=new yc({getRemoteKeysForTarget:t=>e.remoteSyncer.getRemoteKeysForTarget(t),ot:t=>e.N_.get(t)||null,tt:()=>e.datastore.serializer.databaseId}),zh(e).start(),e.q_.v_()}function Eh(e){return Sh(e)&&!zh(e).n_()&&e.N_.size>0}function Sh(e){return 0===Jr(e).L_.size}function Ch(e){e.Q_=void 0}async function kh(e){e.q_.set("Online")}async function Ah(e){e.N_.forEach((t,n)=>{bh(e,t)})}async function Dh(e,t){Ch(e),Eh(e)?(e.q_.M_(t),Th(e)):e.q_.set("Unknown")}async function xh(e,t,n){if(e.q_.set("Online"),t instanceof mc&&2===t.state&&t.cause)try{await async function(e,t){const n=t.cause;for(const r of t.targetIds)e.N_.has(r)&&(await e.remoteSyncer.rejectListen(r,n),e.N_.delete(r),e.Q_.removeTarget(r))}(e,t)}catch(r){Kr("RemoteStore","Failed to remove targets %s: %s ",t.targetIds.join(","),r),await Nh(e,r)}else if(t instanceof fc?e.Q_.Ke(t):t instanceof pc?e.Q_.He(t):e.Q_.We(t),!n.isEqual(pi.min()))try{const t=await Wl(e.localStore);n.compareTo(t)>=0&&await function(e,t){const n=e.Q_.rt(t);return n.targetChanges.forEach((n,r)=>{if(n.resumeToken.approximateByteSize()>0){const i=e.N_.get(r);i&&e.N_.set(r,i.withResumeToken(n.resumeToken,t))}}),n.targetMismatches.forEach((t,n)=>{const r=e.N_.get(t);if(!r)return;e.N_.set(t,r.withResumeToken(Ls.EMPTY_BYTE_STRING,r.snapshotVersion)),_h(e,t);const i=new Zc(r.target,t,n,r.sequenceNumber);bh(e,i)}),e.remoteSyncer.applyRemoteEvent(n)}(e,n)}catch(i){Kr("RemoteStore","Failed to raise snapshot:",i),await Nh(e,i)}}async function Nh(e,t,n){if(!Vi(t))throw t;e.L_.add(1),await vh(e),e.q_.set("Offline"),n||(n=()=>Wl(e.localStore)),e.asyncQueue.enqueueRetryable(async()=>{Kr("RemoteStore","Retrying IndexedDB access"),await n(),e.L_.delete(1),await yh(e)})}function Rh(e,t){return t().catch(n=>Nh(e,n,t))}async function Oh(e){const t=Jr(e),n=Kh(t);let r=t.O_.length>0?t.O_[t.O_.length-1].batchId:-1;for(;Ph(t);)try{const e=await Ql(t.localStore,r);if(null===e){0===t.O_.length&&n.o_();break}r=e.batchId,Lh(t,e)}catch(i){await Nh(t,i)}Mh(t)&&Vh(t)}function Ph(e){return Sh(e)&&e.O_.length<10}function Lh(e,t){e.O_.push(t);const n=Kh(e);n.r_()&&n.V_&&n.m_(t.mutations)}function Mh(e){return Sh(e)&&!Kh(e).n_()&&e.O_.length>0}function Vh(e){Kh(e).start()}async function Fh(e){Kh(e).p_()}async function Uh(e){const t=Kh(e);for(const n of e.O_)t.m_(n.mutations)}async function Bh(e,t,n){const r=e.O_.shift(),i=ec.from(r,t,n);await Rh(e,()=>e.remoteSyncer.applySuccessfulWrite(i)),await Oh(e)}async function jh(e,t){t&&Kh(e).V_&&await async function(e,t){if(function(e){switch(e){default:return Wr();case Xr.CANCELLED:case Xr.UNKNOWN:case Xr.DEADLINE_EXCEEDED:case Xr.RESOURCE_EXHAUSTED:case Xr.INTERNAL:case Xr.UNAVAILABLE:case Xr.UNAUTHENTICATED:return!1;case Xr.INVALID_ARGUMENT:case Xr.NOT_FOUND:case Xr.ALREADY_EXISTS:case Xr.PERMISSION_DENIED:case Xr.FAILED_PRECONDITION:case Xr.ABORTED:case Xr.OUT_OF_RANGE:case Xr.UNIMPLEMENTED:case Xr.DATA_LOSS:return!0}}(n=t.code)&&n!==Xr.ABORTED){const n=e.O_.shift();Kh(e).s_(),await Rh(e,()=>e.remoteSyncer.rejectFailedWrite(n.batchId,t)),await Oh(e)}var n}(e,t),Mh(e)&&Vh(e)}async function qh(e,t){const n=Jr(e);n.asyncQueue.verifyOperationInProgress(),Kr("RemoteStore","RemoteStore received new credentials");const r=Sh(n);n.L_.add(3),await vh(n),r&&n.q_.set("Unknown"),await n.remoteSyncer.handleCredentialChange(t),n.L_.delete(3),await yh(n)}function zh(e){return e.K_||(e.K_=function(e,t,n){const r=Jr(e);return r.w_(),new dh(t,r.connection,r.authCredentials,r.appCheckCredentials,r.serializer,n)}(e.datastore,e.asyncQueue,{Eo:kh.bind(null,e),Ro:Ah.bind(null,e),mo:Dh.bind(null,e),d_:xh.bind(null,e)}),e.B_.push(async t=>{t?(e.K_.s_(),Eh(e)?Th(e):e.q_.set("Unknown")):(await e.K_.stop(),Ch(e))})),e.K_}function Kh(e){return e.U_||(e.U_=function(e,t,n){const r=Jr(e);return r.w_(),new fh(t,r.connection,r.authCredentials,r.appCheckCredentials,r.serializer,n)}(e.datastore,e.asyncQueue,{Eo:()=>Promise.resolve(),Ro:Fh.bind(null,e),mo:jh.bind(null,e),f_:Uh.bind(null,e),g_:Bh.bind(null,e)}),e.B_.push(async t=>{t?(e.U_.s_(),await Oh(e)):(await e.U_.stop(),e.O_.length>0&&(Kr("RemoteStore",`Stopping write stream with ${e.O_.length} pending writes`),e.O_=[]))})),e.U_
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Gh{constructor(e,t,n,r,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=r,this.removalCallback=i,this.deferred=new Zr,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(e=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,r,i){const s=Date.now()+n,o=new Gh(e,t,s,r,i);return o.start(n),o}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){null!==this.timerHandle&&(this.clearTimeout(),this.deferred.reject(new Yr(Xr.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>null!==this.timerHandle?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){null!==this.timerHandle&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function $h(e,t){if(Gr("AsyncQueue",`${t}: ${e}`),Vi(e))return new Yr(Xr.UNAVAILABLE,`${t}: ${e}`);throw e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hh{constructor(e){this.comparator=e?(t,n)=>e(t,n)||wi.comparator(t.key,n.key):(e,t)=>wi.comparator(e.key,t.key),this.keyedMap=fa(),this.sortedSet=new ks(this.comparator)}static emptySet(e){return new Hh(e.comparator)}has(e){return null!=this.keyedMap.get(e)}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Hh))return!1;if(this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const e=t.getNext().key,r=n.getNext().key;if(!e.isEqual(r))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),0===e.length?"DocumentSet ()":"DocumentSet (\n  "+e.join("  \n")+"\n)"}copy(e,t){const n=new Hh;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wh{constructor(){this.W_=new ks(wi.comparator)}track(e){const t=e.doc.key,n=this.W_.get(t);n?0!==e.type&&3===n.type?this.W_=this.W_.insert(t,e):3===e.type&&1!==n.type?this.W_=this.W_.insert(t,{type:n.type,doc:e.doc}):2===e.type&&2===n.type?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):2===e.type&&0===n.type?this.W_=this.W_.insert(t,{type:0,doc:e.doc}):1===e.type&&0===n.type?this.W_=this.W_.remove(t):1===e.type&&2===n.type?this.W_=this.W_.insert(t,{type:1,doc:n.doc}):0===e.type&&1===n.type?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):Wr():this.W_=this.W_.insert(t,e)}G_(){const e=[];return this.W_.inorderTraversal((t,n)=>{e.push(n)}),e}}class Qh{constructor(e,t,n,r,i,s,o,a,c){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=r,this.mutatedKeys=i,this.fromCache=s,this.syncStateChanged=o,this.excludesMetadataChanges=a,this.hasCachedResults=c}static fromInitialDocuments(e,t,n,r,i){const s=[];return t.forEach(e=>{s.push({type:0,doc:e})}),new Qh(e,t,Hh.emptySet(t),s,n,r,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&ra(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let r=0;r<t.length;r++)if(t[r].type!==n[r].type||!t[r].doc.isEqual(n[r].doc))return!1;return!0}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jh{constructor(){this.z_=void 0,this.j_=[]}H_(){return this.j_.some(e=>e.J_())}}class Xh{constructor(){this.queries=Yh(),this.onlineState="Unknown",this.Y_=new Set}terminate(){!function(e,t){const n=Jr(e),r=n.queries;n.queries=Yh(),r.forEach((e,n)=>{for(const r of n.j_)r.onError(t)})}(this,new Yr(Xr.ABORTED,"Firestore shutting down"))}}function Yh(){return new ua(e=>ia(e),ra)}function Zh(e,t){const n=Jr(e);let r=!1;for(const i of t){const e=i.query,t=n.queries.get(e);if(t){for(const e of t.j_)e.X_(i)&&(r=!0);t.z_=i}}r&&td(n)}function ed(e,t,n){const r=Jr(e),i=r.queries.get(t);if(i)for(const s of i.j_)s.onError(n);r.queries.delete(t)}function td(e){e.Y_.forEach(e=>{e.next()})}var nd,rd;(rd=nd||(nd={})).ea="default",rd.Cache="cache";class id{constructor(e,t,n){this.query=e,this.ta=t,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=n||{}}X_(e){if(!this.options.includeMetadataChanges){const t=[];for(const n of e.docChanges)3!==n.type&&t.push(n);e=new Qh(e.query,e.docs,e.oldDocs,t,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.na?this.ia(e)&&(this.ta.next(e),t=!0):this.sa(e,this.onlineState)&&(this.oa(e),t=!0),this.ra=e,t}onError(e){this.ta.error(e)}Z_(e){this.onlineState=e;let t=!1;return this.ra&&!this.na&&this.sa(this.ra,e)&&(this.oa(this.ra),t=!0),t}sa(e,t){if(!e.fromCache)return!0;if(!this.J_())return!0;const n="Offline"!==t;return(!this.options._a||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||"Offline"===t)}ia(e){if(e.docChanges.length>0)return!0;const t=this.ra&&this.ra.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&!0===this.options.includeMetadataChanges}oa(e){e=Qh.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.na=!0,this.ta.next(e)}J_(){return this.options.source!==nd.Cache}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sd{constructor(e){this.key=e}}class od{constructor(e){this.key=e}}class ad{constructor(e,t){this.query=e,this.Ta=t,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=Ia(),this.mutatedKeys=Ia(),this.Aa=aa(e),this.Ra=new Hh(this.Aa)}get Va(){return this.Ta}ma(e,t){const n=t?t.fa:new Wh,r=t?t.Ra:this.Ra;let i=t?t.mutatedKeys:this.mutatedKeys,s=r,o=!1;const a="F"===this.query.limitType&&r.size===this.query.limit?r.last():null,c="L"===this.query.limitType&&r.size===this.query.limit?r.first():null;if(e.inorderTraversal((e,t)=>{const u=r.get(e),l=oa(this.query,t)?t:null,h=!!u&&this.mutatedKeys.has(u.key),d=!!l&&(l.hasLocalMutations||this.mutatedKeys.has(l.key)&&l.hasCommittedMutations);let f=!1;u&&l?u.data.isEqual(l.data)?h!==d&&(n.track({type:3,doc:l}),f=!0):this.ga(u,l)||(n.track({type:2,doc:l}),f=!0,(a&&this.Aa(l,a)>0||c&&this.Aa(l,c)<0)&&(o=!0)):!u&&l?(n.track({type:0,doc:l}),f=!0):u&&!l&&(n.track({type:1,doc:u}),f=!0,(a||c)&&(o=!0)),f&&(l?(s=s.add(l),i=d?i.add(e):i.delete(e)):(s=s.delete(e),i=i.delete(e)))}),null!==this.query.limit)for(;s.size>this.query.limit;){const e="F"===this.query.limitType?s.last():s.first();s=s.delete(e.key),i=i.delete(e.key),n.track({type:1,doc:e})}return{Ra:s,fa:n,ns:o,mutatedKeys:i}}ga(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,r){const i=this.Ra;this.Ra=e.Ra,this.mutatedKeys=e.mutatedKeys;const s=e.fa.G_();s.sort((e,t)=>function(e,t){const n=e=>{switch(e){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return Wr()}};return n(e)-n(t)}(e.type,t.type)||this.Aa(e.doc,t.doc)),this.pa(n),r=null!=r&&r;const o=t&&!r?this.ya():[],a=0===this.da.size&&this.current&&!r?1:0,c=a!==this.Ea;return this.Ea=a,0!==s.length||c?{snapshot:new Qh(this.query,e.Ra,i,s,e.mutatedKeys,0===a,c,!1,!!n&&n.resumeToken.approximateByteSize()>0),wa:o}:{wa:o}}Z_(e){return this.current&&"Offline"===e?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new Wh,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(e){return!this.Ta.has(e)&&!!this.Ra.has(e)&&!this.Ra.get(e).hasLocalMutations}pa(e){e&&(e.addedDocuments.forEach(e=>this.Ta=this.Ta.add(e)),e.modifiedDocuments.forEach(e=>{}),e.removedDocuments.forEach(e=>this.Ta=this.Ta.delete(e)),this.current=e.current)}ya(){if(!this.current)return[];const e=this.da;this.da=Ia(),this.Ra.forEach(e=>{this.Sa(e.key)&&(this.da=this.da.add(e.key))});const t=[];return e.forEach(e=>{this.da.has(e)||t.push(new od(e))}),this.da.forEach(n=>{e.has(n)||t.push(new sd(n))}),t}ba(e){this.Ta=e.Ts,this.da=Ia();const t=this.ma(e.documents);return this.applyChanges(t,!0)}Da(){return Qh.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,0===this.Ea,this.hasCachedResults)}}class cd{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class ud{constructor(e){this.key=e,this.va=!1}}class ld{constructor(e,t,n,r,i,s){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=r,this.currentUser=i,this.maxConcurrentLimboResolutions=s,this.Ca={},this.Fa=new ua(e=>ia(e),ra),this.Ma=new Map,this.xa=new Set,this.Oa=new ks(wi.comparator),this.Na=new Map,this.La=new kl,this.Ba={},this.ka=new Map,this.qa=nl.kn(),this.onlineState="Unknown",this.Qa=void 0}get isPrimaryClient(){return!0===this.Qa}}async function hd(e,t,n=!0){const r=Nd(e);let i;const s=r.Fa.get(t);return s?(r.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.Da()):i=await fd(r,t,n,!0),i}async function dd(e,t){const n=Nd(e);await fd(n,t,!0,!1)}async function fd(e,t,n,r){const i=await function(e,t){const n=Jr(e);return n.persistence.runTransaction("Allocate target","readwrite",e=>{let r;return n.Ur.getTargetData(e,t).next(i=>i?(r=i,Ni.resolve(r)):n.Ur.allocateTargetId(e).next(i=>(r=new Zc(t,i,"TargetPurposeListen",e.currentSequenceNumber),n.Ur.addTargetData(e,r).next(()=>r))))}).then(e=>{const r=n.os.get(e.targetId);return(null===r||e.snapshotVersion.compareTo(r.snapshotVersion)>0)&&(n.os=n.os.insert(e.targetId,e),n._s.set(t,e.targetId)),e})}(e.localStore,ta(t)),s=i.targetId,o=e.sharedClientState.addLocalQueryTarget(s,n);let a;return r&&(a=await async function(e,t,n,r,i){e.Ka=(t,n,r)=>async function(e,t,n,r){let i=t.view.ma(n);i.ns&&(i=await Xl(e.localStore,t.query,!1).then(({documents:e})=>t.view.ma(e,i)));const s=r&&r.targetChanges.get(t.targetId),o=r&&null!=r.targetMismatches.get(t.targetId),a=t.view.applyChanges(i,e.isPrimaryClient,s,o);return Sd(e,t.targetId,a.wa),a.snapshot}(e,t,n,r);const s=await Xl(e.localStore,t,!0),o=new ad(t,s.Ts),a=o.ma(s.documents),c=dc.createSynthesizedTargetChangeForCurrentChange(n,r&&"Offline"!==e.onlineState,i),u=o.applyChanges(a,e.isPrimaryClient,c);Sd(e,n,u.wa);const l=new cd(t,n,o);return e.Fa.set(t,l),e.Ma.has(n)?e.Ma.get(n).push(t):e.Ma.set(n,[t]),u.snapshot}(e,t,s,"current"===o,i.resumeToken)),e.isPrimaryClient&&n&&wh(e.remoteStore,i),a}async function pd(e,t,n){const r=Jr(e),i=r.Fa.get(t),s=r.Ma.get(i.targetId);if(s.length>1)return r.Ma.set(i.targetId,s.filter(e=>!ra(e,t))),void r.Fa.delete(t);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(i.targetId),r.sharedClientState.isActiveQueryTarget(i.targetId)||await Jl(r.localStore,i.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(i.targetId),n&&Ih(r.remoteStore,i.targetId),Td(r,i.targetId)}).catch(xi)):(Td(r,i.targetId),await Jl(r.localStore,i.targetId,!0))}async function md(e,t){const n=Jr(e),r=n.Fa.get(t),i=n.Ma.get(r.targetId);n.isPrimaryClient&&1===i.length&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),Ih(n.remoteStore,r.targetId))}async function gd(e,t){const n=Jr(e);try{const e=await function(e,t){const n=Jr(e),r=t.snapshotVersion;let i=n.os;return n.persistence.runTransaction("Apply remote event","readwrite-primary",e=>{const s=n.cs.newChangeBuffer({trackRemovals:!0});i=n.os;const o=[];t.targetChanges.forEach((s,a)=>{const c=i.get(a);if(!c)return;o.push(n.Ur.removeMatchingKeys(e,s.removedDocuments,a).next(()=>n.Ur.addMatchingKeys(e,s.addedDocuments,a)));let u=c.withSequenceNumber(e.currentSequenceNumber);var l,h,d;null!==t.targetMismatches.get(a)?u=u.withResumeToken(Ls.EMPTY_BYTE_STRING,pi.min()).withLastLimboFreeSnapshotVersion(pi.min()):s.resumeToken.approximateByteSize()>0&&(u=u.withResumeToken(s.resumeToken,r)),i=i.insert(a,u),h=u,d=s,(0===(l=c).resumeToken.approximateByteSize()||h.snapshotVersion.toMicroseconds()-l.snapshotVersion.toMicroseconds()>=3e8||d.addedDocuments.size+d.modifiedDocuments.size+d.removedDocuments.size>0)&&o.push(n.Ur.updateTargetData(e,u))});let a=ha(),c=Ia();if(t.documentUpdates.forEach(r=>{t.resolvedLimboDocuments.has(r)&&o.push(n.persistence.referenceDelegate.updateLimboDocument(e,r))}),o.push(function(e,t,n){let r=Ia(),i=Ia();return n.forEach(e=>r=r.add(e)),t.getEntries(e,r).next(e=>{let r=ha();return n.forEach((n,s)=>{const o=e.get(n);s.isFoundDocument()!==o.isFoundDocument()&&(i=i.add(n)),s.isNoDocument()&&s.version.isEqual(pi.min())?(t.removeEntry(n,s.readTime),r=r.insert(n,s)):!o.isValidDocument()||s.version.compareTo(o.version)>0||0===s.version.compareTo(o.version)&&o.hasPendingWrites?(t.addEntry(s),r=r.insert(n,s)):Kr("LocalStore","Ignoring outdated watch update for ",n,". Current version:",o.version," Watch version:",s.version)}),{Ps:r,Is:i}})}(e,s,t.documentUpdates).next(e=>{a=e.Ps,c=e.Is})),!r.isEqual(pi.min())){const t=n.Ur.getLastRemoteSnapshotVersion(e).next(t=>n.Ur.setTargetsMetadata(e,e.currentSequenceNumber,r));o.push(t)}return Ni.waitFor(o).next(()=>s.apply(e)).next(()=>n.localDocuments.getLocalViewOfDocuments(e,a,c)).next(()=>a)}).then(e=>(n.os=i,e))}(n.localStore,t);t.targetChanges.forEach((e,t)=>{const r=n.Na.get(t);r&&(Qr(e.addedDocuments.size+e.modifiedDocuments.size+e.removedDocuments.size<=1),e.addedDocuments.size>0?r.va=!0:e.modifiedDocuments.size>0?Qr(r.va):e.removedDocuments.size>0&&(Qr(r.va),r.va=!1))}),await Ad(n,e,t)}catch(r){await xi(r)}}function yd(e,t,n){const r=Jr(e);if(r.isPrimaryClient&&0===n||!r.isPrimaryClient&&1===n){const e=[];r.Fa.forEach((n,r)=>{const i=r.view.Z_(t);i.snapshot&&e.push(i.snapshot)}),function(e,t){const n=Jr(e);n.onlineState=t;let r=!1;n.queries.forEach((e,n)=>{for(const i of n.j_)i.Z_(t)&&(r=!0)}),r&&td(n)}(r.eventManager,t),e.length&&r.Ca.d_(e),r.onlineState=t,r.isPrimaryClient&&r.sharedClientState.setOnlineState(t)}}async function vd(e,t,n){const r=Jr(e);r.sharedClientState.updateQueryState(t,"rejected",n);const i=r.Na.get(t),s=i&&i.key;if(s){let e=new ks(wi.comparator);e=e.insert(s,vo.newNoDocument(s,pi.min()));const n=Ia().add(s),i=new hc(pi.min(),new Map,new ks(li),e,n);await gd(r,i),r.Oa=r.Oa.remove(s),r.Na.delete(t),kd(r)}else await Jl(r.localStore,t,!1).then(()=>Td(r,t,n)).catch(xi)}async function wd(e,t){const n=Jr(e),r=t.batch.batchId;try{const e=await function(e,t){const n=Jr(e);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",e=>{const r=t.batch.keys(),i=n.cs.newChangeBuffer({trackRemovals:!0});return function(e,t,n,r){const i=n.batch,s=i.keys();let o=Ni.resolve();return s.forEach(e=>{o=o.next(()=>r.getEntry(t,e)).next(t=>{const s=n.docVersions.get(e);Qr(null!==s),t.version.compareTo(s)<0&&(i.applyToRemoteDocument(t,n),t.isValidDocument()&&(t.setReadTime(n.commitVersion),r.addEntry(t)))})}),o.next(()=>e.mutationQueue.removeMutationBatch(t,i))}(n,e,t,i).next(()=>i.apply(e)).next(()=>n.mutationQueue.performConsistencyCheck(e)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(e,r,t.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e,function(e){let t=Ia();for(let n=0;n<e.mutationResults.length;++n)e.mutationResults[n].transformResults.length>0&&(t=t.add(e.batch.mutations[n].key));return t}(t))).next(()=>n.localDocuments.getDocuments(e,r))})}(n.localStore,t);_d(n,r,null),bd(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await Ad(n,e)}catch(i){await xi(i)}}async function Id(e,t,n){const r=Jr(e);try{const e=await function(e,t){const n=Jr(e);return n.persistence.runTransaction("Reject batch","readwrite-primary",e=>{let r;return n.mutationQueue.lookupMutationBatch(e,t).next(t=>(Qr(null!==t),r=t.keys(),n.mutationQueue.removeMutationBatch(e,t))).next(()=>n.mutationQueue.performConsistencyCheck(e)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(e,r,t)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e,r)).next(()=>n.localDocuments.getDocuments(e,r))})}(r.localStore,t);_d(r,t,n),bd(r,t),r.sharedClientState.updateMutationState(t,"rejected",n),await Ad(r,e)}catch(i){await xi(i)}}function bd(e,t){(e.ka.get(t)||[]).forEach(e=>{e.resolve()}),e.ka.delete(t)}function _d(e,t,n){const r=Jr(e);let i=r.Ba[r.currentUser.toKey()];if(i){const e=i.get(t);e&&(n?e.reject(n):e.resolve(),i=i.remove(t)),r.Ba[r.currentUser.toKey()]=i}}function Td(e,t,n=null){e.sharedClientState.removeLocalQueryTarget(t);for(const r of e.Ma.get(t))e.Fa.delete(r),n&&e.Ca.$a(r,n);e.Ma.delete(t),e.isPrimaryClient&&e.La.gr(t).forEach(t=>{e.La.containsKey(t)||Ed(e,t)})}function Ed(e,t){e.xa.delete(t.path.canonicalString());const n=e.Oa.get(t);null!==n&&(Ih(e.remoteStore,n),e.Oa=e.Oa.remove(t),e.Na.delete(n),kd(e))}function Sd(e,t,n){for(const r of n)r instanceof sd?(e.La.addReference(r.key,t),Cd(e,r)):r instanceof od?(Kr("SyncEngine","Document no longer in limbo: "+r.key),e.La.removeReference(r.key,t),e.La.containsKey(r.key)||Ed(e,r.key)):Wr()}function Cd(e,t){const n=t.key,r=n.path.canonicalString();e.Oa.get(n)||e.xa.has(r)||(Kr("SyncEngine","New document in limbo: "+n),e.xa.add(r),kd(e))}function kd(e){for(;e.xa.size>0&&e.Oa.size<e.maxConcurrentLimboResolutions;){const t=e.xa.values().next().value;e.xa.delete(t);const n=new wi(gi.fromString(t)),r=e.qa.next();e.Na.set(r,new ud(n)),e.Oa=e.Oa.insert(n,r),wh(e.remoteStore,new Zc(ta(Yo(n.path)),r,"TargetPurposeLimboResolution",Ki.oe))}}async function Ad(e,t,n){const r=Jr(e),i=[],s=[],o=[];r.Fa.isEmpty()||(r.Fa.forEach((e,a)=>{o.push(r.Ka(a,t,n).then(e=>{var t;if((e||n)&&r.isPrimaryClient){const i=e?!e.fromCache:null===(t=null==n?void 0:n.targetChanges.get(a.targetId))||void 0===t?void 0:t.current;r.sharedClientState.updateQueryState(a.targetId,i?"current":"not-current")}if(e){i.push(e);const t=ql.Wi(a.targetId,e);s.push(t)}}))}),await Promise.all(o),r.Ca.d_(i),await async function(e,t){const n=Jr(e);try{await n.persistence.runTransaction("notifyLocalViewChanges","readwrite",e=>Ni.forEach(t,t=>Ni.forEach(t.$i,r=>n.persistence.referenceDelegate.addReference(e,t.targetId,r)).next(()=>Ni.forEach(t.Ui,r=>n.persistence.referenceDelegate.removeReference(e,t.targetId,r)))))}catch(r){if(!Vi(r))throw r;Kr("LocalStore","Failed to update sequence numbers: "+r)}for(const i of t){const e=i.targetId;if(!i.fromCache){const t=n.os.get(e),r=t.snapshotVersion,i=t.withLastLimboFreeSnapshotVersion(r);n.os=n.os.insert(e,i)}}}(r.localStore,s))}async function Dd(e,t){const n=Jr(e);if(!n.currentUser.isEqual(t)){Kr("SyncEngine","User change. New user:",t.toKey());const e=await Hl(n.localStore,t);n.currentUser=t,(r=n).ka.forEach(e=>{e.forEach(e=>{e.reject(new Yr(Xr.CANCELLED,"'waitForPendingWrites' promise is rejected due to a user change."))})}),r.ka.clear(),n.sharedClientState.handleUserChange(t,e.removedBatchIds,e.addedBatchIds),await Ad(n,e.hs)}var r}function xd(e,t){const n=Jr(e),r=n.Na.get(t);if(r&&r.va)return Ia().add(r.key);{let e=Ia();const r=n.Ma.get(t);if(!r)return e;for(const t of r){const r=n.Fa.get(t);e=e.unionWith(r.view.Va)}return e}}function Nd(e){const t=Jr(e);return t.remoteStore.remoteSyncer.applyRemoteEvent=gd.bind(null,t),t.remoteStore.remoteSyncer.getRemoteKeysForTarget=xd.bind(null,t),t.remoteStore.remoteSyncer.rejectListen=vd.bind(null,t),t.Ca.d_=Zh.bind(null,t.eventManager),t.Ca.$a=ed.bind(null,t.eventManager),t}function Rd(e){const t=Jr(e);return t.remoteStore.remoteSyncer.applySuccessfulWrite=wd.bind(null,t),t.remoteStore.remoteSyncer.rejectFailedWrite=Id.bind(null,t),t}class Od{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=uh(e.databaseInfo.databaseId),this.sharedClientState=this.Wa(e),this.persistence=this.Ga(e),await this.persistence.start(),this.localStore=this.za(e),this.gcScheduler=this.ja(e,this.localStore),this.indexBackfillerScheduler=this.Ha(e,this.localStore)}ja(e,t){return null}Ha(e,t){return null}za(e){return $l(this.persistence,new Kl,e.initialUser,this.serializer)}Ga(e){return new Ol(Ll.Zr,this.serializer)}Wa(e){return new Zl}async terminate(){var e,t;null===(e=this.gcScheduler)||void 0===e||e.stop(),null===(t=this.indexBackfillerScheduler)||void 0===t||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Od.provider={build:()=>new Od};class Pd extends Od{constructor(e,t,n){super(),this.Ja=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Ja.initialize(this,e),await Rd(this.Ja.syncEngine),await Oh(this.Ja.remoteStore),await this.persistence.yi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}za(e){return $l(this.persistence,new Kl,e.initialUser,this.serializer)}ja(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new ul(n,e.asyncQueue,t)}Ha(e,t){const n=new zi(t,this.persistence);return new qi(e.asyncQueue,n)}Ga(e){const t=function(e,t){let n=e.projectId;return e.isDefaultDatabase||(n+="."+e.database),"firestore/"+t+"/"+n+"/"}(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=void 0!==this.cacheSizeBytes?Wu.withCacheSize(this.cacheSizeBytes):Wu.DEFAULT;return new Ul(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,"undefined"!=typeof window?window:null,ch(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Wa(e){return new Zl}}class Ld{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=e=>yd(this.syncEngine,e,1),this.remoteStore.remoteSyncer.handleCredentialChange=Dd.bind(null,this.syncEngine),await async function(e,t){const n=Jr(e);t?(n.L_.delete(2),await yh(n)):t||(n.L_.add(2),await vh(n),n.q_.set("Unknown"))}(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return new Xh}createDatastore(e){const t=uh(e.databaseInfo.databaseId),n=(r=e.databaseInfo,new ah(r));var r;return function(e,t,n,r){return new ph(e,t,n,r)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return t=this.localStore,n=this.datastore,r=e.asyncQueue,i=e=>yd(this.syncEngine,e,0),s=th.D()?new th:new eh,new gh(t,n,r,i,s);var t,n,r,i,s}createSyncEngine(e,t){return function(e,t,n,r,i,s,o){const a=new ld(e,t,n,r,i,s);return o&&(a.Qa=!0),a}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(e){const t=Jr(e);Kr("RemoteStore","RemoteStore shutting down."),t.L_.add(5),await vh(t),t.k_.shutdown(),t.q_.set("Unknown")}(this.remoteStore),null===(e=this.datastore)||void 0===e||e.terminate(),null===(t=this.eventManager)||void 0===t||t.terminate()}}Ld.provider={build:()=>new Ld};
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Md{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ya(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ya(this.observer.error,e):Gr("Uncaught Error in snapshot listener:",e.toString()))}Za(){this.muted=!0}Ya(e,t){setTimeout(()=>{this.muted||e(t)},0)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vd{constructor(e,t,n,r,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=r,this.user=Br.UNAUTHENTICATED,this.clientId=ui.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(n,async e=>{Kr("FirestoreClient","Received user=",e.uid),await this.authCredentialListener(e),this.user=e}),this.appCheckCredentials.start(n,e=>(Kr("FirestoreClient","Received new app check token=",e),this.appCheckCredentialListener(e,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Zr;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=$h(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function Fd(e,t){e.asyncQueue.verifyOperationInProgress(),Kr("FirestoreClient","Initializing OfflineComponentProvider");const n=e.configuration;await t.initialize(n);let r=n.initialUser;e.setCredentialChangeListener(async e=>{r.isEqual(e)||(await Hl(t.localStore,e),r=e)}),t.persistence.setDatabaseDeletedListener(()=>e.terminate()),e._offlineComponents=t}async function Ud(e,t){e.asyncQueue.verifyOperationInProgress();const n=await async function(e){if(!e._offlineComponents)if(e._uninitializedComponentsProvider){Kr("FirestoreClient","Using user provided OfflineComponentProvider");try{await Fd(e,e._uninitializedComponentsProvider._offline)}catch(t){const i=t;if(!("FirebaseError"===(n=i).name?n.code===Xr.FAILED_PRECONDITION||n.code===Xr.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&n instanceof DOMException)||22===n.code||20===n.code||11===n.code))throw i;$r("Error using user provided cache. Falling back to memory cache: "+i),await Fd(e,new Od)}}else Kr("FirestoreClient","Using default OfflineComponentProvider"),await Fd(e,new Od);var n;return e._offlineComponents}(e);Kr("FirestoreClient","Initializing OnlineComponentProvider"),await t.initialize(n,e.configuration),e.setCredentialChangeListener(e=>qh(t.remoteStore,e)),e.setAppCheckTokenChangeListener((e,n)=>qh(t.remoteStore,n)),e._onlineComponents=t}async function Bd(e){return e._onlineComponents||(e._uninitializedComponentsProvider?(Kr("FirestoreClient","Using user provided OnlineComponentProvider"),await Ud(e,e._uninitializedComponentsProvider._online)):(Kr("FirestoreClient","Using default OnlineComponentProvider"),await Ud(e,new Ld))),e._onlineComponents}async function jd(e){const t=await Bd(e),n=t.eventManager;return n.onListen=hd.bind(null,t.syncEngine),n.onUnlisten=pd.bind(null,t.syncEngine),n.onFirstRemoteStoreListen=dd.bind(null,t.syncEngine),n.onLastRemoteStoreUnlisten=md.bind(null,t.syncEngine),n
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}function qd(e){const t={};return void 0!==e.timeoutSeconds&&(t.timeoutSeconds=e.timeoutSeconds),t
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}const zd=new Map;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kd(e,t,n){if(!n)throw new Yr(Xr.INVALID_ARGUMENT,`Function ${e}() cannot be called with an empty ${t}.`)}function Gd(e){if(!wi.isDocumentKey(e))throw new Yr(Xr.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${e} has ${e.length}.`)}function $d(e){if(wi.isDocumentKey(e))throw new Yr(Xr.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${e} has ${e.length}.`)}function Hd(e){if(void 0===e)return"undefined";if(null===e)return"null";if("string"==typeof e)return e.length>20&&(e=`${e.substring(0,20)}...`),JSON.stringify(e);if("number"==typeof e||"boolean"==typeof e)return""+e;if("object"==typeof e){if(e instanceof Array)return"an array";{const n=(t=e).constructor?t.constructor.name:null;return n?`a custom ${n} object`:"an object"}}var t;return"function"==typeof e?"a function":Wr()}function Wd(e,t){if("_delegate"in e&&(e=e._delegate),!(e instanceof t)){if(t.name===e.constructor.name)throw new Yr(Xr.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=Hd(e);throw new Yr(Xr.INVALID_ARGUMENT,`Expected type '${t.name}', but it was: ${n}`)}}return e}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qd{constructor(e){var t,n;if(void 0===e.host){if(void 0!==e.ssl)throw new Yr(Xr.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=null===(t=e.ssl)||void 0===t||t;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,void 0===e.cacheSizeBytes)this.cacheSizeBytes=41943040;else{if(-1!==e.cacheSizeBytes&&e.cacheSizeBytes<1048576)throw new Yr(Xr.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}(function(e,t,n,r){if(!0===t&&!0===r)throw new Yr(Xr.INVALID_ARGUMENT,"experimentalForceLongPolling and experimentalAutoDetectLongPolling cannot be used together.")})(0,e.experimentalForceLongPolling,0,e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:void 0===e.experimentalAutoDetectLongPolling?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=qd(null!==(n=e.experimentalLongPollingOptions)&&void 0!==n?n:{}),function(e){if(void 0!==e.timeoutSeconds){if(isNaN(e.timeoutSeconds))throw new Yr(Xr.INVALID_ARGUMENT,`invalid long polling timeout: ${e.timeoutSeconds} (must not be NaN)`);if(e.timeoutSeconds<5)throw new Yr(Xr.INVALID_ARGUMENT,`invalid long polling timeout: ${e.timeoutSeconds} (minimum allowed value is 5)`);if(e.timeoutSeconds>30)throw new Yr(Xr.INVALID_ARGUMENT,`invalid long polling timeout: ${e.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(t=this.experimentalLongPollingOptions,n=e.experimentalLongPollingOptions,t.timeoutSeconds===n.timeoutSeconds)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams;var t,n}}class Jd{constructor(e,t,n,r){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=r,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Qd({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}get app(){if(!this._app)throw new Yr(Xr.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return"notTerminated"!==this._terminateTask}_setSettings(e){if(this._settingsFrozen)throw new Yr(Xr.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Qd(e),void 0!==e.credentials&&(this._authCredentials=function(e){if(!e)return new ti;switch(e.type){case"firstParty":return new si(e.sessionIndex||"0",e.iamToken||null,e.authTokenFactory||null);case"provider":return e.client;default:throw new Yr(Xr.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return"notTerminated"===this._terminateTask&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){"notTerminated"===this._terminateTask?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(e){const t=zd.get(e);t&&(Kr("ComponentProvider","Removing Datastore"),zd.delete(e),t.terminate())}(this),Promise.resolve()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Xd{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new Xd(this.firestore,e,this._query)}}class Yd{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Zd(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Yd(this.firestore,e,this._key)}}class Zd extends Xd{constructor(e,t,n){super(e,t,Yo(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Yd(this.firestore,null,new wi(e))}withConverter(e){return new Zd(this.firestore,e,this._path)}}function ef(e,t,...n){if(e=_(e),Kd("collection","path",t),e instanceof Jd){const r=gi.fromString(t,...n);return $d(r),new Zd(e,null,r)}{if(!(e instanceof Yd||e instanceof Zd))throw new Yr(Xr.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=e._path.child(gi.fromString(t,...n));return $d(r),new Zd(e.firestore,null,r)}}function tf(e,t,...n){if(e=_(e),1===arguments.length&&(t=ui.newId()),Kd("doc","path",t),e instanceof Jd){const r=gi.fromString(t,...n);return Gd(r),new Yd(e,null,new wi(r))}{if(!(e instanceof Yd||e instanceof Zd))throw new Yr(Xr.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=e._path.child(gi.fromString(t,...n));return Gd(r),new Yd(e.firestore,e instanceof Zd?e.converter:null,new wi(r))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nf{constructor(e=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new lh(this,"async_queue_retry"),this.Vu=()=>{const e=ch();e&&Kr("AsyncQueue","Visibility state changed to "+e.visibilityState),this.t_.jo()},this.mu=e;const t=ch();t&&"function"==typeof t.addEventListener&&t.addEventListener("visibilitychange",this.Vu)}get isShuttingDown(){return this.Iu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.fu(),this.gu(e)}enterRestrictedMode(e){if(!this.Iu){this.Iu=!0,this.Au=e||!1;const t=ch();t&&"function"==typeof t.removeEventListener&&t.removeEventListener("visibilitychange",this.Vu)}}enqueue(e){if(this.fu(),this.Iu)return new Promise(()=>{});const t=new Zr;return this.gu(()=>this.Iu&&this.Au?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Pu.push(e),this.pu()))}async pu(){if(0!==this.Pu.length){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(e){if(!Vi(e))throw e;Kr("AsyncQueue","Operation failed with retryable error: "+e)}this.Pu.length>0&&this.t_.Go(()=>this.pu())}}gu(e){const t=this.mu.then(()=>(this.du=!0,e().catch(e=>{throw this.Eu=e,this.du=!1,Gr("INTERNAL UNHANDLED ERROR: ",function(e){let t=e.message||"";return e.stack&&(t=e.stack.includes(e.message)?e.stack:e.message+"\n"+e.stack),t}(e)),e}).then(e=>(this.du=!1,e))));return this.mu=t,t}enqueueAfterDelay(e,t,n){this.fu(),this.Ru.indexOf(e)>-1&&(t=0);const r=Gh.createAndSchedule(this,e,t,n,e=>this.yu(e));return this.Tu.push(r),r}fu(){this.Eu&&Wr()}verifyOperationInProgress(){}async wu(){let e;do{e=this.mu,await e}while(e!==this.mu)}Su(e){for(const t of this.Tu)if(t.timerId===e)return!0;return!1}bu(e){return this.wu().then(()=>{this.Tu.sort((e,t)=>e.targetTimeMs-t.targetTimeMs);for(const t of this.Tu)if(t.skipDelay(),"all"!==e&&t.timerId===e)break;return this.wu()})}Du(e){this.Ru.push(e)}yu(e){const t=this.Tu.indexOf(e);this.Tu.splice(t,1)}}function rf(e){return function(e){if("object"!=typeof e||null===e)return!1;const t=e;for(const n of["next","error","complete"])if(n in t&&"function"==typeof t[n])return!0;return!1}(e)}class sf extends Jd{constructor(e,t,n,r){super(e,t,n,r),this.type="firestore",this._queue=new nf,this._persistenceKey=(null==r?void 0:r.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new nf(e),this._firestoreClient=void 0,await e}}}function of(e,t){const n="string"==typeof e?e:"(default)",r=Oe("object"==typeof e?e:Ue(),"firestore").getImmediate({identifier:n});if(!r._initialized){const e=(()=>{const e=a("firestore");if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const n=parseInt(e.substring(t+1),10);return"["===e[0]?[e.substring(1,t-1),n]:[e.substring(0,t),n]})();e&&function(e,t,n,r={}){var s;const o=(e=Wd(e,Jd))._getSettings(),a=`${t}:${n}`;if("firestore.googleapis.com"!==o.host&&o.host!==a&&$r("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),e._setSettings(Object.assign(Object.assign({},o),{host:a,ssl:!1})),r.mockUserToken){let t,n;if("string"==typeof r.mockUserToken)t=r.mockUserToken,n=Br.MOCK_USER;else{t=function(e,t){if(e.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n=t||"demo-project",r=e.iat||0,s=e.sub||e.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${n}`,aud:n,iat:r,exp:r+3600,auth_time:r,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}}},e);return[i(JSON.stringify({alg:"none",type:"JWT"})),i(JSON.stringify(o)),""].join(".")}(r.mockUserToken,null===(s=e._app)||void 0===s?void 0:s.options.projectId);const o=r.mockUserToken.sub||r.mockUserToken.user_id;if(!o)throw new Yr(Xr.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");n=new Br(o)}e._authCredentials=new ni(new ei(t,n))}}(r,...e)}return r}function af(e){if(e._terminated)throw new Yr(Xr.FAILED_PRECONDITION,"The client has already been terminated.");return e._firestoreClient||cf(e),e._firestoreClient}function cf(e){var t,n,r;const i=e._freezeSettings(),s=(o=e._databaseId,a=(null===(t=e._app)||void 0===t?void 0:t.options.appId)||"",c=e._persistenceKey,new zs(o,a,c,(u=i).host,u.ssl,u.experimentalForceLongPolling,u.experimentalAutoDetectLongPolling,qd(u.experimentalLongPollingOptions),u.useFetchStreams));var o,a,c,u;e._componentsProvider||(null===(n=i.localCache)||void 0===n?void 0:n._offlineComponentProvider)&&(null===(r=i.localCache)||void 0===r?void 0:r._onlineComponentProvider)&&(e._componentsProvider={_offline:i.localCache._offlineComponentProvider,_online:i.localCache._onlineComponentProvider}),e._firestoreClient=new Vd(e._authCredentials,e._appCheckCredentials,e._queue,s,e._componentsProvider&&function(e){const t=null==e?void 0:e._online.build();return{_offline:null==e?void 0:e._offline.build(t),_online:t}}(e._componentsProvider))}function uf(e,t){$r("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const n=e._freezeSettings();return function(e,t,n){if((e=Wd(e,sf))._firestoreClient||e._terminated)throw new Yr(Xr.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(e._componentsProvider||e._getSettings().localCache)throw new Yr(Xr.FAILED_PRECONDITION,"SDK cache is already specified.");e._componentsProvider={_online:t,_offline:n},cf(e)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,Ld.provider,{build:e=>new Pd(e,n.cacheSizeBytes,void 0)}),Promise.resolve()}class lf{constructor(e){this._byteString=e}static fromBase64String(e){try{return new lf(Ls.fromBase64String(e))}catch(t){throw new Yr(Xr.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new lf(Ls.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hf{constructor(...e){for(let t=0;t<e.length;++t)if(0===e[t].length)throw new Yr(Xr.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new vi(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class df{constructor(e){this._methodName=e}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ff{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new Yr(Xr.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new Yr(Xr.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return li(this._lat,e._lat)||li(this._long,e._long)}}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pf{constructor(e){this._values=(e||[]).map(e=>e)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;++n)if(e[n]!==t[n])return!1;return!0}(this._values,e._values)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mf=/^__.*__$/;class gf{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return null!==this.fieldMask?new Ha(e,this.data,this.fieldMask,t,this.fieldTransforms):new $a(e,this.data,t,this.fieldTransforms)}}class yf{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new Ha(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function vf(e){switch(e){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw Wr()}}class wf{constructor(e,t,n,r,i,s){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=r,void 0===i&&this.vu(),this.fieldTransforms=i||[],this.fieldMask=s||[]}get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(e){return new wf(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(e){var t;const n=null===(t=this.path)||void 0===t?void 0:t.child(e),r=this.Fu({path:n,xu:!1});return r.Ou(e),r}Nu(e){var t;const n=null===(t=this.path)||void 0===t?void 0:t.child(e),r=this.Fu({path:n,xu:!1});return r.vu(),r}Lu(e){return this.Fu({path:void 0,xu:!0})}Bu(e){return Nf(e,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(e){return void 0!==this.fieldMask.find(t=>e.isPrefixOf(t))||void 0!==this.fieldTransforms.find(t=>e.isPrefixOf(t.field))}vu(){if(this.path)for(let e=0;e<this.path.length;e++)this.Ou(this.path.get(e))}Ou(e){if(0===e.length)throw this.Bu("Document fields must not be empty");if(vf(this.Cu)&&mf.test(e))throw this.Bu('Document fields cannot begin and end with "__"')}}class If{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||uh(e)}Qu(e,t,n,r=!1){return new wf({Cu:e,methodName:t,qu:n,path:vi.emptyPath(),xu:!1,ku:r},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function bf(e){const t=e._freezeSettings(),n=uh(e._databaseId);return new If(e._databaseId,!!t.ignoreUndefinedProperties,n)}function _f(e,t,n,r,i,s={}){const o=e.Qu(s.merge||s.mergeFields?2:0,t,n,i);kf("Data must be an object, but it was:",o,r);const a=Sf(r,o);let c,u;if(s.merge)c=new Os(o.fieldMask),u=o.fieldTransforms;else if(s.mergeFields){const e=[];for(const r of s.mergeFields){const i=Af(t,r,n);if(!o.contains(i))throw new Yr(Xr.INVALID_ARGUMENT,`Field '${i}' is specified in your field mask but missing from your input data.`);Rf(e,i)||e.push(i)}c=new Os(e),u=o.fieldTransforms.filter(e=>c.covers(e.field))}else c=null,u=o.fieldTransforms;return new gf(new go(a),c,u)}class Tf extends df{_toFieldTransform(e){if(2!==e.Cu)throw 1===e.Cu?e.Bu(`${this._methodName}() can only appear at the top level of your update data`):e.Bu(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Tf}}function Ef(e,t){if(Cf(e=_(e)))return kf("Unsupported field value:",t,e),Sf(e,t);if(e instanceof df)return function(e,t){if(!vf(t.Cu))throw t.Bu(`${e._methodName}() can only be used with update() and set()`);if(!t.path)throw t.Bu(`${e._methodName}() is not currently supported inside arrays`);const n=e._toFieldTransform(t);n&&t.fieldTransforms.push(n)}(e,t),null;if(void 0===e&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),e instanceof Array){if(t.settings.xu&&4!==t.Cu)throw t.Bu("Nested arrays are not supported");return function(e,t){const n=[];let r=0;for(const i of e){let e=Ef(i,t.Lu(r));null==e&&(e={nullValue:"NULL_VALUE"}),n.push(e),r++}return{arrayValue:{values:n}}}(e,t)}return function(e,t){if(null===(e=_(e)))return{nullValue:"NULL_VALUE"};if("number"==typeof e)return function(e,t){return function(e){return"number"==typeof e&&Number.isInteger(e)&&!$i(e)&&e<=Number.MAX_SAFE_INTEGER&&e>=Number.MIN_SAFE_INTEGER}(t)?Ta(t):_a(e,t)}(t.serializer,e);if("boolean"==typeof e)return{booleanValue:e};if("string"==typeof e)return{stringValue:e};if(e instanceof Date){const n=fi.fromDate(e);return{timestampValue:Sc(t.serializer,n)}}if(e instanceof fi){const n=new fi(e.seconds,1e3*Math.floor(e.nanoseconds/1e3));return{timestampValue:Sc(t.serializer,n)}}if(e instanceof ff)return{geoPointValue:{latitude:e.latitude,longitude:e.longitude}};if(e instanceof lf)return{bytesValue:Cc(t.serializer,e._byteString)};if(e instanceof Yd){const n=t.databaseId,r=e.firestore._databaseId;if(!r.isEqual(n))throw t.Bu(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${n.projectId}/${n.database}`);return{referenceValue:Dc(e.firestore._databaseId||t.databaseId,e._key.path)}}if(e instanceof pf)return n=t,{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:e.toArray().map(e=>{if("number"!=typeof e)throw n.Bu("VectorValues must only contain numeric values.");return _a(n.serializer,e)})}}}}};var n;throw t.Bu(`Unsupported field value: ${Hd(e)}`)}(e,t)}function Sf(e,t){const n={};return Cs(e)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):Ss(e,(e,r)=>{const i=Ef(r,t.Mu(e));null!=i&&(n[e]=i)}),{mapValue:{fields:n}}}function Cf(e){return!("object"!=typeof e||null===e||e instanceof Array||e instanceof Date||e instanceof fi||e instanceof ff||e instanceof lf||e instanceof Yd||e instanceof df||e instanceof pf)}function kf(e,t,n){if(!Cf(n)||"object"!=typeof(r=n)||null===r||Object.getPrototypeOf(r)!==Object.prototype&&null!==Object.getPrototypeOf(r)){const r=Hd(n);throw"an object"===r?t.Bu(e+" a custom object"):t.Bu(e+" "+r)}var r}function Af(e,t,n){if((t=_(t))instanceof hf)return t._internalPath;if("string"==typeof t)return xf(e,t);throw Nf("Field path arguments must be of type string or ",e,!1,void 0,n)}const Df=new RegExp("[~\\*/\\[\\]]");function xf(e,t,n){if(t.search(Df)>=0)throw Nf(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,e,!1,void 0,n);try{return new hf(...t.split("."))._internalPath}catch(r){throw Nf(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,e,!1,void 0,n)}}function Nf(e,t,n,r,i){const s=r&&!r.isEmpty(),o=void 0!==i;let a=`Function ${t}() called with invalid data`;n&&(a+=" (via `toFirestore()`)"),a+=". ";let c="";return(s||o)&&(c+=" (found",s&&(c+=` in field ${r}`),o&&(c+=` in document ${i}`),c+=")"),new Yr(Xr.INVALID_ARGUMENT,a+e+c)}function Rf(e,t){return e.some(e=>e.isEqual(t))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Of{constructor(e,t,n,r,i){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=r,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new Yd(this._firestore,this._converter,this._key)}exists(){return null!==this._document}data(){if(this._document){if(this._converter){const e=new Pf(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Lf("DocumentSnapshot.get",e));if(null!==t)return this._userDataWriter.convertValue(t)}}}class Pf extends Of{data(){return super.data()}}function Lf(e,t){return"string"==typeof t?xf(e,t):t instanceof hf?t._internalPath:t._delegate._internalPath}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mf{convertValue(e,t="none"){switch(Hs(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Fs(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Us(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw Wr()}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Ss(e,(e,r)=>{n[e]=this.convertValue(r,t)}),n}convertVectorValue(e){var t,n,r;const i=null===(r=null===(n=null===(t=e.fields)||void 0===t?void 0:t.value.arrayValue)||void 0===n?void 0:n.values)||void 0===r?void 0:r.map(e=>Fs(e.doubleValue));return new pf(i)}convertGeoPoint(e){return new ff(Fs(e.latitude),Fs(e.longitude))}convertArray(e,t){return(e.values||[]).map(e=>this.convertValue(e,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=js(e);return null==n?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(qs(e));default:return null}}convertTimestamp(e){const t=Vs(e);return new fi(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=gi.fromString(e);Qr(Yc(n));const r=new Ks(n.get(1),n.get(3)),i=new wi(n.popFirst(5));return r.isEqual(t)||Gr(`Document ${i} contains a document reference within a different database (${r.projectId}/${r.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Vf{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Ff extends Of{constructor(e,t,n,r,i,s){super(e,t,n,r,s),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Uf(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Lf("DocumentSnapshot.get",e));if(null!==n)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}}class Uf extends Ff{data(e={}){return super.data(e)}}class Bf{constructor(e,t,n,r){this._firestore=e,this._userDataWriter=t,this._snapshot=r,this.metadata=new Vf(r.hasPendingWrites,r.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return 0===this.size}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new Uf(this._firestore,this._userDataWriter,n.key,n,new Vf(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new Yr(Xr.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(e,t){if(e._snapshot.oldDocs.isEmpty()){let t=0;return e._snapshot.docChanges.map(n=>{const r=new Uf(e._firestore,e._userDataWriter,n.doc.key,n.doc,new Vf(e._snapshot.mutatedKeys.has(n.doc.key),e._snapshot.fromCache),e.query.converter);return n.doc,{type:"added",doc:r,oldIndex:-1,newIndex:t++}})}{let n=e._snapshot.oldDocs;return e._snapshot.docChanges.filter(e=>t||3!==e.type).map(t=>{const r=new Uf(e._firestore,e._userDataWriter,t.doc.key,t.doc,new Vf(e._snapshot.mutatedKeys.has(t.doc.key),e._snapshot.fromCache),e.query.converter);let i=-1,s=-1;return 0!==t.type&&(i=n.indexOf(t.doc.key),n=n.delete(t.doc.key)),1!==t.type&&(n=n.add(t.doc),s=n.indexOf(t.doc.key)),{type:jf(t.type),doc:r,oldIndex:i,newIndex:s}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}}function jf(e){switch(e){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return Wr()}}class qf extends Mf{constructor(e){super(),this.firestore=e}convertBytes(e){return new lf(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Yd(this.firestore,null,t)}}function zf(e,t,n){e=Wd(e,Yd);const r=Wd(e.firestore,sf),i=function(e,t){let n;return n=e?e.toFirestore(t):t,n}(e.converter,t);return Hf(r,[_f(bf(r),"setDoc",e._key,i,null!==e.converter,n).toMutation(e._key,Fa.none())])}function Kf(e,t,n,...r){e=Wd(e,Yd);const i=Wd(e.firestore,sf),s=bf(i);let o;return o="string"==typeof(t=_(t))||t instanceof hf?function(e,t,n,r,i,s){const o=e.Qu(1,t,n),a=[Af(t,r,n)],c=[i];if(s.length%2!=0)throw new Yr(Xr.INVALID_ARGUMENT,`Function ${t}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let d=0;d<s.length;d+=2)a.push(Af(t,s[d])),c.push(s[d+1]);const u=[],l=go.empty();for(let d=a.length-1;d>=0;--d)if(!Rf(u,a[d])){const e=a[d];let t=c[d];t=_(t);const n=o.Nu(e);if(t instanceof Tf)u.push(e);else{const r=Ef(t,n);null!=r&&(u.push(e),l.set(e,r))}}const h=new Os(u);return new yf(l,h,o.fieldTransforms)}(s,"updateDoc",e._key,t,n,r):function(e,t,n,r){const i=e.Qu(1,t,n);kf("Data must be an object, but it was:",i,r);const s=[],o=go.empty();Ss(r,(e,r)=>{const a=xf(t,e,n);r=_(r);const c=i.Nu(a);if(r instanceof Tf)s.push(a);else{const e=Ef(r,c);null!=e&&(s.push(a),o.set(a,e))}});const a=new Os(s);return new yf(o,a,i.fieldTransforms)}(s,"updateDoc",e._key,t),Hf(i,[o.toMutation(e._key,Fa.exists(!0))])}function Gf(e){return Hf(Wd(e.firestore,sf),[new Xa(e._key,Fa.none())])}function $f(e,...t){var n,r,i;e=_(e);let s={includeMetadataChanges:!1,source:"default"},o=0;"object"!=typeof t[o]||rf(t[o])||(s=t[o],o++);const a={includeMetadataChanges:s.includeMetadataChanges,source:s.source};if(rf(t[o])){const e=t[o];t[o]=null===(n=e.next)||void 0===n?void 0:n.bind(e),t[o+1]=null===(r=e.error)||void 0===r?void 0:r.bind(e),t[o+2]=null===(i=e.complete)||void 0===i?void 0:i.bind(e)}let c,u,l;if(e instanceof Yd)u=Wd(e.firestore,sf),l=Yo(e._key.path),c={next:n=>{t[o]&&t[o](function(e,t,n){const r=n.docs.get(t._key),i=new qf(e);return new Ff(e,i,t._key,r,new Vf(n.hasPendingWrites,n.fromCache),t.converter)}(u,e,n))},error:t[o+1],complete:t[o+2]};else{const n=Wd(e,Xd);u=Wd(n.firestore,sf),l=n._query;const r=new qf(u);c={next:e=>{t[o]&&t[o](new Bf(u,r,n,e))},error:t[o+1],complete:t[o+2]},function(e){if("L"===e.limitType&&0===e.explicitOrderBy.length)throw new Yr(Xr.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}(e._query)}return function(e,t,n,r){const i=new Md(r),s=new id(t,i,n);return e.asyncQueue.enqueueAndForget(async()=>async function(t,n){const r=Jr(t);let i=3;const s=n.query;let o=r.queries.get(s);o?!o.H_()&&n.J_()&&(i=2):(o=new Jh,i=n.J_()?0:1);try{switch(i){case 0:o.z_=await r.onListen(s,!0);break;case 1:o.z_=await r.onListen(s,!1);break;case 2:await r.onFirstRemoteStoreListen(s)}}catch(e){const r=$h(e,`Initialization of query '${sa(n.query)}' failed`);return void n.onError(r)}r.queries.set(s,o),o.j_.push(n),n.Z_(r.onlineState),o.z_&&n.X_(o.z_)&&td(r)}(await jd(e),s)),()=>{i.Za(),e.asyncQueue.enqueueAndForget(async()=>async function(e,t){const n=Jr(e),r=t.query;let i=3;const s=n.queries.get(r);if(s){const e=s.j_.indexOf(t);e>=0&&(s.j_.splice(e,1),0===s.j_.length?i=t.J_()?0:1:!s.H_()&&t.J_()&&(i=2))}switch(i){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}(await jd(e),s))}}(af(u),l,a,c)}function Hf(e,t){return function(e,t){const n=new Zr;return e.asyncQueue.enqueueAndForget(async()=>async function(t,n,r){const i=Rd(t);try{const e=await function(e,t){const n=Jr(e),r=fi.now(),i=t.reduce((e,t)=>e.add(t.key),Ia());let s,o;return n.persistence.runTransaction("Locally write mutations","readwrite",e=>{let a=ha(),c=Ia();return n.cs.getEntries(e,i).next(e=>{a=e,a.forEach((e,t)=>{t.isValidDocument()||(c=c.add(e))})}).next(()=>n.localDocuments.getOverlayedDocuments(e,a)).next(i=>{s=i;const o=[];for(const e of t){const t=Ka(e,s.get(e.key).overlayedDocument);null!=t&&o.push(new Ha(e.key,t,yo(t.value.mapValue),Fa.exists(!0)))}return n.mutationQueue.addMutationBatch(e,r,o,t)}).next(t=>{o=t;const r=t.applyToLocalDocumentSet(s,c);return n.documentOverlayCache.saveOverlays(e,t.batchId,r)})}).then(()=>({batchId:o.batchId,changes:pa(s)}))}(i.localStore,n);i.sharedClientState.addPendingMutation(e.batchId),function(e,t,n){let r=e.Ba[e.currentUser.toKey()];r||(r=new ks(li)),r=r.insert(t,n),e.Ba[e.currentUser.toKey()]=r}(i,e.batchId,r),await Ad(i,e.changes),await Oh(i.remoteStore)}catch(e){const n=$h(e,"Failed to persist write");r.reject(n)}}(await function(e){return Bd(e).then(e=>e.syncEngine)}(e),t,n)),n.promise}(af(e),t)}!function(e,t=!0){jr=Ve,Re(new T("firestore",(e,{instanceIdentifier:n,options:r})=>{const i=e.getProvider("app").getImmediate(),s=new sf(new ri(e.getProvider("auth-internal")),new ai(e.getProvider("app-check-internal")),function(e,t){if(!Object.prototype.hasOwnProperty.apply(e.options,["projectId"]))throw new Yr(Xr.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Ks(e.options.projectId,t)}(i,n),i);return r=Object.assign({useFetchStreams:t},r),s._setSettings(r),s},"PUBLIC").setMultipleInstances(!0)),je(Ur,"4.7.3",e),je(Ur,"4.7.3","esm2017")}();export{of as a,Sr as b,$f as c,ef as d,uf as e,tf as f,Be as g,Gf as h,Fe as i,bn as o,zf as s,Kf as u};
