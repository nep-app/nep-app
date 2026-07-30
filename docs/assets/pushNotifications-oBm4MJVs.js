import{r as e,_ as t,C as n,p as i,E as a,t as o,F as r,v as s,u as c,x as u,y as d,z as p,A as f,s as l,d as g,B as w,D as h}from"./vendor-firebase-BDIhAYEZ.js";import{N as m,x as y,O as b,Q as v,w as k}from"./index-BtCEI2Ti.js";import"./vendor-react-C_6PPKRX.js";const S="@firebase/installations",I="0.6.9",T=`w:${I}`,C="FIS_v2",D=new a("installations","Installations",{"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."});function P(e){return e instanceof r&&e.code.includes("request-failed")}
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
 */function O({projectId:e}){return`https://firebaseinstallations.googleapis.com/v1/projects/${e}/installations`}function j(e){return{token:e.token,requestStatus:2,expiresIn:(t=e.expiresIn,Number(t.replace("s","000"))),creationTime:Date.now()};var t}async function E(e,t){const n=(await t.json()).error;return D.create("request-failed",{requestName:e,serverCode:n.code,serverMessage:n.message,serverStatus:n.status})}function _({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}async function A(e){const t=await e();return t.status>=500&&t.status<600?e():t}
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
function K(e){return new Promise(t=>{setTimeout(t,e)})}
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
const M=/^[cdef][\w-]{21}$/;function N(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const t=function(e){var t;return(t=e,btoa(String.fromCharCode(...t)).replace(/\+/g,"-").replace(/\//g,"_")).substr(0,22)}
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
 */(e);return M.test(t)?t:""}catch(e){return""}}function $(e){return`${e.appName}!${e.appId}`}
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
 */const x=new Map;function F(e,t){const n=$(e);q(n,t),function(e,t){const n=(!R&&"BroadcastChannel"in self&&(R=new BroadcastChannel("[Firebase] FID Change"),R.onmessage=e=>{q(e.data.key,e.data.fid)}),R);n&&n.postMessage({key:e,fid:t}),0===x.size&&R&&(R.close(),R=null)}(n,t)}function q(e,t){const n=x.get(e);if(n)for(const i of n)i(t)}let R=null;
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
const H="firebase-installations-store";let W=null;function U(){return W||(W=o("firebase-installations-database",1,{upgrade:(e,t)=>{0===t&&e.createObjectStore(H)}})),W}async function L(e,t){const n=$(e),i=(await U()).transaction(H,"readwrite"),a=i.objectStore(H),o=await a.get(n);return await a.put(t,n),await i.done,o&&o.fid===t.fid||F(e,t.fid),t}async function B(e){const t=$(e),n=(await U()).transaction(H,"readwrite");await n.objectStore(H).delete(t),await n.done}async function V(e,t){const n=$(e),i=(await U()).transaction(H,"readwrite"),a=i.objectStore(H),o=await a.get(n),r=t(o);return void 0===r?await a.delete(n):await a.put(r,n),await i.done,!r||o&&o.fid===r.fid||F(e,r.fid),r}
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
 */async function z(e){let t;const n=await V(e.appConfig,n=>{const i=function(e){return Q(e||{fid:N(),registrationStatus:0})}(n),a=function(e,t){if(0===t.registrationStatus){if(!navigator.onLine)return{installationEntry:t,registrationPromise:Promise.reject(D.create("app-offline"))};const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},i=async function(e,t){try{const n=
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
 */await async function({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const i=O(e),a=_(e),o=t.getImmediate({optional:!0});if(o){const e=await o.getHeartbeatsHeader();e&&a.append("x-firebase-client",e)}const r={fid:n,authVersion:C,appId:e.appId,sdkVersion:T},s={method:"POST",headers:a,body:JSON.stringify(r)},c=await A(()=>fetch(i,s));if(c.ok){const e=await c.json();return{fid:e.fid||n,registrationStatus:2,refreshToken:e.refreshToken,authToken:j(e.authToken)}}throw await E("Create Installation",c)}(e,t);return L(e.appConfig,n)}catch(n){throw P(n)&&409===n.customData.serverCode?await B(e.appConfig):await L(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}(e,n);return{installationEntry:n,registrationPromise:i}}return 1===t.registrationStatus?{installationEntry:t,registrationPromise:J(e)}:{installationEntry:t}}(e,i);return t=a.registrationPromise,a.installationEntry});return""===n.fid?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}async function J(e){let t=await G(e.appConfig);for(;1===t.registrationStatus;)await K(100),t=await G(e.appConfig);if(0===t.registrationStatus){const{installationEntry:t,registrationPromise:n}=await z(e);return n||t}return t}function G(e){return V(e,e=>{if(!e)throw D.create("installation-not-found");return Q(e)})}function Q(e){return 1===(t=e).registrationStatus&&t.registrationTime+1e4<Date.now()?{fid:e.fid,registrationStatus:0}:e;var t;
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
 */}async function Y({appConfig:e,heartbeatServiceProvider:t},n){const i=function(e,{fid:t}){return`${O(e)}/${t}/authTokens:generate`}
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
 */(e,n),a=function(e,{refreshToken:t}){const n=_(e);return n.append("Authorization",function(e){return`${C} ${e}`}(t)),n}(e,n),o=t.getImmediate({optional:!0});if(o){const e=await o.getHeartbeatsHeader();e&&a.append("x-firebase-client",e)}const r={installation:{sdkVersion:T,appId:e.appId}},s={method:"POST",headers:a,body:JSON.stringify(r)},c=await A(()=>fetch(i,s));if(c.ok)return j(await c.json());throw await E("Generate Auth Token",c)}async function Z(e,t=!1){let n;const i=await V(e.appConfig,i=>{if(!ee(i))throw D.create("not-registered");const a=i.authToken;if(!t&&(2===(o=a).requestStatus&&!function(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+36e5}(o)))return i;var o;if(1===a.requestStatus)return n=async function(e,t){let n=await X(e.appConfig);for(;1===n.authToken.requestStatus;)await K(100),n=await X(e.appConfig);const i=n.authToken;return 0===i.requestStatus?Z(e,t):i}(e,t),i;{if(!navigator.onLine)throw D.create("app-offline");const t=function(e){const t={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},e),{authToken:t})}(i);return n=async function(e,t){try{const n=await Y(e,t),i=Object.assign(Object.assign({},t),{authToken:n});return await L(e.appConfig,i),n}catch(n){if(!P(n)||401!==n.customData.serverCode&&404!==n.customData.serverCode){const n=Object.assign(Object.assign({},t),{authToken:{requestStatus:0}});await L(e.appConfig,n)}else await B(e.appConfig);throw n}}(e,t),t}});return n?await n:i.authToken}function X(e){return V(e,e=>{if(!ee(e))throw D.create("not-registered");return 1===(t=e.authToken).requestStatus&&t.requestTime+1e4<Date.now()?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e;var t;
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
 */})}function ee(e){return void 0!==e&&2===e.registrationStatus}function te(e){return D.create("missing-app-config-values",{valueName:e})}
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
 */const ne="installations";t(new n(ne,e=>{const t=e.getProvider("app").getImmediate(),n=
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
function(e){if(!e||!e.options)throw te("App Configuration");if(!e.name)throw te("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw te(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}(t);return{app:t,appConfig:n,heartbeatServiceProvider:i(t,"heartbeat"),_delete:()=>Promise.resolve()}},"PUBLIC")),t(new n("installations-internal",e=>{const t=e.getProvider("app").getImmediate(),n=i(t,ne).getImmediate();return{getId:()=>async function(e){const t=e,{installationEntry:n,registrationPromise:i}=await z(t);return i?i.catch(console.error):Z(t).catch(console.error),n.fid}
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
 */(n),getToken:e=>async function(e,t=!1){const n=e;return await async function(e){const{registrationPromise:t}=await z(e);t&&await t}(n),(await Z(n,t)).token}(n,e)}},"PRIVATE")),e(S,I),e(S,I,"esm2017");
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
const ie="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",ae="google.c.a.c_id";var oe,re,se;
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
function ce(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function ue(e){const t=(e+"=".repeat((4-e.length%4)%4)).replace(/\-/g,"+").replace(/_/g,"/"),n=atob(t),i=new Uint8Array(n.length);for(let a=0;a<n.length;++a)i[a]=n.charCodeAt(a);return i}
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
 */(re=oe||(oe={}))[re.DATA_MESSAGE=1]="DATA_MESSAGE",re[re.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION",function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"}(se||(se={}));const de="fcm_token_details_db",pe="fcm_token_object_Store",fe="firebase-messaging-store";let le=null;function ge(){return le||(le=o("firebase-messaging-database",1,{upgrade:(e,t)=>{0===t&&e.createObjectStore(fe)}})),le}async function we(e){const t=me(e),n=await ge(),i=await n.transaction(fe).objectStore(fe).get(t);if(i)return i;{const t=await async function(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(e=>e.name).includes(de))return null;let t=null;return(await o(de,5,{upgrade:async(n,i,a,o)=>{var r;if(i<2)return;if(!n.objectStoreNames.contains(pe))return;const s=o.objectStore(pe),c=await s.index("fcmSenderId").get(e);if(await s.clear(),c)if(2===i){const e=c;if(!e.auth||!e.p256dh||!e.endpoint)return;t={token:e.fcmToken,createTime:null!==(r=e.createTime)&&void 0!==r?r:Date.now(),subscriptionOptions:{auth:e.auth,p256dh:e.p256dh,endpoint:e.endpoint,swScope:e.swScope,vapidKey:"string"==typeof e.vapidKey?e.vapidKey:ce(e.vapidKey)}}}else if(3===i){const e=c;t={token:e.fcmToken,createTime:e.createTime,subscriptionOptions:{auth:ce(e.auth),p256dh:ce(e.p256dh),endpoint:e.endpoint,swScope:e.swScope,vapidKey:ce(e.vapidKey)}}}else if(4===i){const e=c;t={token:e.fcmToken,createTime:e.createTime,subscriptionOptions:{auth:ce(e.auth),p256dh:ce(e.p256dh),endpoint:e.endpoint,swScope:e.swScope,vapidKey:ce(e.vapidKey)}}}}})).close(),await f(de),await f("fcm_vapid_details_db"),await f("undefined"),function(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return"number"==typeof e.createTime&&e.createTime>0&&"string"==typeof e.token&&e.token.length>0&&"string"==typeof t.auth&&t.auth.length>0&&"string"==typeof t.p256dh&&t.p256dh.length>0&&"string"==typeof t.endpoint&&t.endpoint.length>0&&"string"==typeof t.swScope&&t.swScope.length>0&&"string"==typeof t.vapidKey&&t.vapidKey.length>0}
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
 */(t)?t:null}(e.appConfig.senderId);if(t)return await he(e,t),t}}async function he(e,t){const n=me(e),i=(await ge()).transaction(fe,"readwrite");return await i.objectStore(fe).put(t,n),await i.done,t}function me({appConfig:e}){return e.appId}
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
 */const ye=new a("messaging","Messaging",{"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."});async function be(e,t){const n={method:"DELETE",headers:await ke(e)};try{const i=await fetch(`${ve(e.appConfig)}/${t}`,n),a=await i.json();if(a.error){const e=a.error.message;throw ye.create("token-unsubscribe-failed",{errorInfo:e})}}catch(i){throw ye.create("token-unsubscribe-failed",{errorInfo:null==i?void 0:i.toString()})}}function ve({projectId:e}){return`https://fcmregistrations.googleapis.com/v1/projects/${e}/registrations`}async function ke({appConfig:e,installations:t}){const n=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})}function Se({p256dh:e,auth:t,endpoint:n,vapidKey:i}){const a={web:{endpoint:n,auth:t,p256dh:e}};return i!==ie&&(a.web.applicationPubKey=i),a}
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
 */async function Ie(e,t){const n=
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
 */await async function(e,t){const n=await ke(e),i=Se(t),a={method:"POST",headers:n,body:JSON.stringify(i)};let o;try{const t=await fetch(ve(e.appConfig),a);o=await t.json()}catch(r){throw ye.create("token-subscribe-failed",{errorInfo:null==r?void 0:r.toString()})}if(o.error){const e=o.error.message;throw ye.create("token-subscribe-failed",{errorInfo:e})}if(!o.token)throw ye.create("token-subscribe-no-token");return o.token}(e,t),i={token:n,createTime:Date.now(),subscriptionOptions:t};return await he(e,i),i.token}
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
function Te(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return function(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const i=t.notification.body;i&&(e.notification.body=i);const a=t.notification.image;a&&(e.notification.image=a);const o=t.notification.icon;o&&(e.notification.icon=o)}(t,e),function(e,t){t.data&&(e.data=t.data)}(t,e),function(e,t){var n,i,a,o,r;if(!t.fcmOptions&&!(null===(n=t.notification)||void 0===n?void 0:n.click_action))return;e.fcmOptions={};const s=null!==(a=null===(i=t.fcmOptions)||void 0===i?void 0:i.link)&&void 0!==a?a:null===(o=t.notification)||void 0===o?void 0:o.click_action;s&&(e.fcmOptions.link=s);const c=null===(r=t.fcmOptions)||void 0===r?void 0:r.analytics_label;c&&(e.fcmOptions.analyticsLabel=c)}
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
 */(t,e),t}function Ce(e){return ye.create("missing-app-config-values",{valueName:e})}
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
 */class De{constructor(e,t,n){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const i=
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
function(e){if(!e||!e.options)throw Ce("App Configuration Object");if(!e.name)throw Ce("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const i of t)if(!n[i])throw Ce(i);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}(e);this.firebaseDependencies={app:e,appConfig:i,installations:t,analyticsProvider:n}}_delete(){return Promise.resolve()}}
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
 */async function Pe(e){try{e.swRegistration=await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/firebase-cloud-messaging-push-scope"}),e.swRegistration.update().catch(()=>{})}catch(t){throw ye.create("failed-service-worker-registration",{browserErrorMessage:null==t?void 0:t.message})}}
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
async function Oe(e,t){if(!navigator)throw ye.create("only-available-in-window");if("default"===Notification.permission&&await Notification.requestPermission(),"granted"!==Notification.permission)throw ye.create("permission-blocked");
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
return await async function(e,t){t?e.vapidKey=t:e.vapidKey||(e.vapidKey=ie)}(e,null==t?void 0:t.vapidKey),await async function(e,t){if(t||e.swRegistration||await Pe(e),t||!e.swRegistration){if(!(t instanceof ServiceWorkerRegistration))throw ye.create("invalid-sw-registration");e.swRegistration=t}}(e,null==t?void 0:t.serviceWorkerRegistration),async function(e){const t=await async function(e,t){return await e.pushManager.getSubscription()||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:ue(t)})}(e.swRegistration,e.vapidKey),n={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:ce(t.getKey("auth")),p256dh:ce(t.getKey("p256dh"))},i=await we(e.firebaseDependencies);if(i){if(function(e,t){const n=t.vapidKey===e.vapidKey,i=t.endpoint===e.endpoint,a=t.auth===e.auth,o=t.p256dh===e.p256dh;return n&&i&&a&&o}(i.subscriptionOptions,n))return Date.now()>=i.createTime+6048e5?async function(e,t){try{const n=await async function(e,t){const n=await ke(e),i=Se(t.subscriptionOptions),a={method:"PATCH",headers:n,body:JSON.stringify(i)};let o;try{const n=await fetch(`${ve(e.appConfig)}/${t.token}`,a);o=await n.json()}catch(r){throw ye.create("token-update-failed",{errorInfo:null==r?void 0:r.toString()})}if(o.error){const e=o.error.message;throw ye.create("token-update-failed",{errorInfo:e})}if(!o.token)throw ye.create("token-update-no-token");return o.token}(e.firebaseDependencies,t),i=Object.assign(Object.assign({},t),{token:n,createTime:Date.now()});return await he(e.firebaseDependencies,i),n}catch(n){throw n}}(e,{token:i.token,createTime:Date.now(),subscriptionOptions:n}):i.token;try{await be(e.firebaseDependencies,i.token)}catch(a){}return Ie(e.firebaseDependencies,n)}return Ie(e.firebaseDependencies,n)}(e)}
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
async function je(e,t){const n=t.data;if(!n.isFirebaseMessaging)return;e.onMessageHandler&&n.messageType===se.PUSH_RECEIVED&&("function"==typeof e.onMessageHandler?e.onMessageHandler(Te(n)):e.onMessageHandler.next(Te(n)));const i=n.data;var a;"object"==typeof(a=i)&&a&&ae in a&&"1"===i["google.c.a.e"]&&await async function(e,t,n){const i=function(e){switch(e){case se.NOTIFICATION_CLICKED:return"notification_open";case se.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}(t);(await e.firebaseDependencies.analyticsProvider.get()).logEvent(i,{message_id:n[ae],message_name:n["google.c.a.c_l"],message_time:n["google.c.a.ts"],message_device_time:Math.floor(Date.now()/1e3)})}(e,n.messageType,i)}const Ee="@firebase/messaging",_e="0.12.12";
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
async function Ae(){try{await s()}catch(e){return!1}return"undefined"!=typeof window&&c()&&u()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}
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
function Ke(e=p()){return Ae().then(e=>{if(!e)throw ye.create("unsupported-browser")},e=>{throw ye.create("indexed-db-unsupported")}),i(d(e),"messaging").getImmediate()}async function Me(e,t){return Oe(e=d(e),t)}function Ne(e){return async function(e){if(!navigator)throw ye.create("only-available-in-window");return e.swRegistration||await Pe(e),async function(e){const t=await we(e.firebaseDependencies);t&&(await be(e.firebaseDependencies,t.token),await async function(e){const t=me(e),n=(await ge()).transaction(fe,"readwrite");await n.objectStore(fe).delete(t),await n.done}(e.firebaseDependencies));const n=await e.swRegistration.pushManager.getSubscription();return!n||n.unsubscribe()}(e)}(e=d(e))}t(new n("messaging",e=>{const t=new De(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",e=>je(t,e)),t},"PUBLIC")),t(new n("messaging-internal",e=>{const t=e.getProvider("messaging").getImmediate();return{getToken:e=>Oe(t,e)}},"PRIVATE")),e(Ee,_e),e(Ee,_e,"esm2017");const $e="BF0WrNv1scVewl7OoCnzwyYaf_uS91k-2mep9Uh6bcQuHBsGFog-f1FxjWGJ_9HcHDinb0Mnuyvk5e8AJ73NUUM";function xe(){const e=v().currentUser;if(!e)throw new Error("Sem sessão Firebase — inicia sessão primeiro.");return e.uid}function Fe(){let e=k.get("nep_device_id",null);return"string"==typeof e&&e||(e="undefined"!=typeof crypto&&crypto.randomUUID?crypto.randomUUID():"dev-"+Math.random().toString(36).slice(2)+Date.now().toString(36),k.set("nep_device_id",e)),e}async function qe(e){const t=b(),n=g(t,"users",xe(),"push","prefs"),i=Fe(),a=Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Lisbon";await l(n,{tokens:{[i]:{token:e,tz:a,updatedAt:(new Date).toISOString()}},tz:a,token:h(),updatedAt:(new Date).toISOString()},{merge:!0})}async function Re(){if(!("serviceWorker"in navigator))throw new Error("Service workers não suportados.");const e=await navigator.serviceWorker.register("/nep-app/firebase-messaging-sw.js");return await navigator.serviceWorker.ready,e}async function He(){var e,t;if(!(await Ae()))throw new Error("Este dispositivo/navegador não suporta notificações push.");if("granted"!==await Notification.requestPermission())throw new Error("Permissão de notificações não concedida.");const n=await Re(),i=Ke(m());await async function(e){try{const t=await e.pushManager.getSubscription();if(!t)return;const n=t.options&&t.options.applicationServerKey;(n?function(e){const t=new Uint8Array(e);let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return btoa(n).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}(n):null)!==($e||"").replace(/=+$/,"")&&(await t.unsubscribe(),y.log("[Push] Subscrição antiga (chave diferente) removida."))}catch(t){try{const t=await e.pushManager.getSubscription();t&&await t.unsubscribe()}catch{}}}(n);let a=null,o=null;for(let s=1;s<=3;s++)try{if(a=await Me(i,{vapidKey:$e,serviceWorkerRegistration:n}),a)break}catch(r){o=r,y.error(`[Push] Tentativa ${s} falhou:`,(null==r?void 0:r.message)||r),s<3&&await new Promise(e=>setTimeout(e,1500*s))}if(!a){const n=(null==(e=null==o?void 0:o.customData)?void 0:e.serverResponse)||(null==(t=null==o?void 0:o.customData)?void 0:t._serverResponse)||((null==o?void 0:o.customData)?JSON.stringify(o.customData):"")||"",i=`${(null==o?void 0:o.code)||""} ${(null==o?void 0:o.message)||"Falha ao obter token"}`.trim();throw new Error(n?`${i}\n\nDETALHE: ${n}`:i)}return await qe(a),a}async function We(){try{if("undefined"==typeof Notification||"granted"!==Notification.permission)return;if(!(await Ae()))return;if(!v().currentUser)return;const e=await Re(),t=Ke(m()),n=await Me(t,{vapidKey:$e,serviceWorkerRegistration:e});if(!n)return;await qe(n),y.log("[Push] Token atualizado em silêncio no arranque (morada deste aparelho).")}catch(e){y.error("[Push] refresh silencioso falhou (ignorado):",(null==e?void 0:e.message)||e)}}async function Ue(e){const t=b();await l(g(t,"users",xe(),"push","prefs"),{reminders:e,updatedAt:(new Date).toISOString()},{merge:!0})}async function Le(){try{if(await Ae()){const e=Ke(m());await Ne(e).catch(()=>{})}const e=b(),t=g(e,"users",xe(),"push","prefs"),n=Fe();await w(t,{[`tokens.${n}`]:h(),token:h()}).catch(()=>{})}catch(e){y.error("[Push] Erro ao desativar:",e)}}export{Le as disablePushReminders,He as enablePushReminders,We as refreshPushTokenIfEnabled,Ue as saveReminderConfig};
