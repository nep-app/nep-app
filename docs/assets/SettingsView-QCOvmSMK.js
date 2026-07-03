const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-Ci7GHt0n.js","assets/vendor-react-C_6PPKRX.js","assets/vendor-firebase-BBjUxxCC.js","assets/index-BoG6Pybs.css"])))=>i.map(i=>d[i]);
import{v as e,w as t,x as s,y as a,u as n,z as i,j as r,D as o,F as c,S as l,G as d,U as u,_ as g,L as p,R as m,I as f,J as h,K as x,c as b,M as y,N as w}from"./index-Ci7GHt0n.js";import{r as v}from"./vendor-react-C_6PPKRX.js";import{r as j,_ as N,C as k,p as S,E as I,t as C,F as T,v as D,u as O,x as E,y as A,z as _,A as P,s as M,d as K,h as H}from"./vendor-firebase-BBjUxxCC.js";const L="@firebase/installations",q="0.6.9",R=`w:${q}`,$="FIS_v2",F=new I("installations","Installations",{"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."});function W(e){return e instanceof T&&e.code.includes("request-failed")}
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
 */function U({projectId:e}){return`https://firebaseinstallations.googleapis.com/v1/projects/${e}/installations`}function B(e){return{token:e.token,requestStatus:2,expiresIn:(t=e.expiresIn,Number(t.replace("s","000"))),creationTime:Date.now()};var t}async function V(e,t){const s=(await t.json()).error;return F.create("request-failed",{requestName:e,serverCode:s.code,serverMessage:s.message,serverStatus:s.status})}function G({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}async function J(e){const t=await e();return t.status>=500&&t.status<600?e():t}
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
function z(e){return new Promise(t=>{setTimeout(t,e)})}
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
const Y=/^[cdef][\w-]{21}$/;function Q(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const t=function(e){var t;return(t=e,btoa(String.fromCharCode(...t)).replace(/\+/g,"-").replace(/\//g,"_")).substr(0,22)}
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
 */(e);return Y.test(t)?t:""}catch(e){return""}}function X(e){return`${e.appName}!${e.appId}`}
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
 */const Z=new Map;function ee(e,t){const s=X(e);te(s,t),function(e,t){const s=(!se&&"BroadcastChannel"in self&&(se=new BroadcastChannel("[Firebase] FID Change"),se.onmessage=e=>{te(e.data.key,e.data.fid)}),se);s&&s.postMessage({key:e,fid:t}),0===Z.size&&se&&(se.close(),se=null)}(s,t)}function te(e,t){const s=Z.get(e);if(s)for(const a of s)a(t)}let se=null;
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
const ae="firebase-installations-store";let ne=null;function ie(){return ne||(ne=C("firebase-installations-database",1,{upgrade:(e,t)=>{0===t&&e.createObjectStore(ae)}})),ne}async function re(e,t){const s=X(e),a=(await ie()).transaction(ae,"readwrite"),n=a.objectStore(ae),i=await n.get(s);return await n.put(t,s),await a.done,i&&i.fid===t.fid||ee(e,t.fid),t}async function oe(e){const t=X(e),s=(await ie()).transaction(ae,"readwrite");await s.objectStore(ae).delete(t),await s.done}async function ce(e,t){const s=X(e),a=(await ie()).transaction(ae,"readwrite"),n=a.objectStore(ae),i=await n.get(s),r=t(i);return void 0===r?await n.delete(s):await n.put(r,s),await a.done,!r||i&&i.fid===r.fid||ee(e,r.fid),r}
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
 */async function le(e){let t;const s=await ce(e.appConfig,s=>{const a=function(e){return ge(e||{fid:Q(),registrationStatus:0})}(s),n=function(e,t){if(0===t.registrationStatus){if(!navigator.onLine)return{installationEntry:t,registrationPromise:Promise.reject(F.create("app-offline"))};const s={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},a=async function(e,t){try{const s=
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
 */await async function({appConfig:e,heartbeatServiceProvider:t},{fid:s}){const a=U(e),n=G(e),i=t.getImmediate({optional:!0});if(i){const e=await i.getHeartbeatsHeader();e&&n.append("x-firebase-client",e)}const r={fid:s,authVersion:$,appId:e.appId,sdkVersion:R},o={method:"POST",headers:n,body:JSON.stringify(r)},c=await J(()=>fetch(a,o));if(c.ok){const e=await c.json();return{fid:e.fid||s,registrationStatus:2,refreshToken:e.refreshToken,authToken:B(e.authToken)}}throw await V("Create Installation",c)}(e,t);return re(e.appConfig,s)}catch(s){throw W(s)&&409===s.customData.serverCode?await oe(e.appConfig):await re(e.appConfig,{fid:t.fid,registrationStatus:0}),s}}(e,s);return{installationEntry:s,registrationPromise:a}}return 1===t.registrationStatus?{installationEntry:t,registrationPromise:de(e)}:{installationEntry:t}}(e,a);return t=n.registrationPromise,n.installationEntry});return""===s.fid?{installationEntry:await t}:{installationEntry:s,registrationPromise:t}}async function de(e){let t=await ue(e.appConfig);for(;1===t.registrationStatus;)await z(100),t=await ue(e.appConfig);if(0===t.registrationStatus){const{installationEntry:t,registrationPromise:s}=await le(e);return s||t}return t}function ue(e){return ce(e,e=>{if(!e)throw F.create("installation-not-found");return ge(e)})}function ge(e){return 1===(t=e).registrationStatus&&t.registrationTime+1e4<Date.now()?{fid:e.fid,registrationStatus:0}:e;var t;
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
 */}async function pe({appConfig:e,heartbeatServiceProvider:t},s){const a=function(e,{fid:t}){return`${U(e)}/${t}/authTokens:generate`}
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
 */(e,s),n=function(e,{refreshToken:t}){const s=G(e);return s.append("Authorization",function(e){return`${$} ${e}`}(t)),s}(e,s),i=t.getImmediate({optional:!0});if(i){const e=await i.getHeartbeatsHeader();e&&n.append("x-firebase-client",e)}const r={installation:{sdkVersion:R,appId:e.appId}},o={method:"POST",headers:n,body:JSON.stringify(r)},c=await J(()=>fetch(a,o));if(c.ok)return B(await c.json());throw await V("Generate Auth Token",c)}async function me(e,t=!1){let s;const a=await ce(e.appConfig,a=>{if(!he(a))throw F.create("not-registered");const n=a.authToken;if(!t&&(2===(i=n).requestStatus&&!function(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+36e5}(i)))return a;var i;if(1===n.requestStatus)return s=async function(e,t){let s=await fe(e.appConfig);for(;1===s.authToken.requestStatus;)await z(100),s=await fe(e.appConfig);const a=s.authToken;return 0===a.requestStatus?me(e,t):a}(e,t),a;{if(!navigator.onLine)throw F.create("app-offline");const t=function(e){const t={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},e),{authToken:t})}(a);return s=async function(e,t){try{const s=await pe(e,t),a=Object.assign(Object.assign({},t),{authToken:s});return await re(e.appConfig,a),s}catch(s){if(!W(s)||401!==s.customData.serverCode&&404!==s.customData.serverCode){const s=Object.assign(Object.assign({},t),{authToken:{requestStatus:0}});await re(e.appConfig,s)}else await oe(e.appConfig);throw s}}(e,t),t}});return s?await s:a.authToken}function fe(e){return ce(e,e=>{if(!he(e))throw F.create("not-registered");return 1===(t=e.authToken).requestStatus&&t.requestTime+1e4<Date.now()?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e;var t;
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
 */})}function he(e){return void 0!==e&&2===e.registrationStatus}function xe(e){return F.create("missing-app-config-values",{valueName:e})}
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
 */const be="installations";N(new k(be,e=>{const t=e.getProvider("app").getImmediate(),s=
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
function(e){if(!e||!e.options)throw xe("App Configuration");if(!e.name)throw xe("App Name");const t=["projectId","apiKey","appId"];for(const s of t)if(!e.options[s])throw xe(s);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}(t);return{app:t,appConfig:s,heartbeatServiceProvider:S(t,"heartbeat"),_delete:()=>Promise.resolve()}},"PUBLIC")),N(new k("installations-internal",e=>{const t=e.getProvider("app").getImmediate(),s=S(t,be).getImmediate();return{getId:()=>async function(e){const t=e,{installationEntry:s,registrationPromise:a}=await le(t);return a?a.catch(console.error):me(t).catch(console.error),s.fid}
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
 */(s),getToken:e=>async function(e,t=!1){const s=e;return await async function(e){const{registrationPromise:t}=await le(e);t&&await t}(s),(await me(s,t)).token}(s,e)}},"PRIVATE")),j(L,q),j(L,q,"esm2017");
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
const ye="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",we="google.c.a.c_id";var ve,je,Ne;
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
function ke(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function Se(e){const t=(e+"=".repeat((4-e.length%4)%4)).replace(/\-/g,"+").replace(/_/g,"/"),s=atob(t),a=new Uint8Array(s.length);for(let n=0;n<s.length;++n)a[n]=s.charCodeAt(n);return a}
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
 */(je=ve||(ve={}))[je.DATA_MESSAGE=1]="DATA_MESSAGE",je[je.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION",function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"}(Ne||(Ne={}));const Ie="fcm_token_details_db",Ce="fcm_token_object_Store",Te="firebase-messaging-store";let De=null;function Oe(){return De||(De=C("firebase-messaging-database",1,{upgrade:(e,t)=>{0===t&&e.createObjectStore(Te)}})),De}async function Ee(e){const t=_e(e),s=await Oe(),a=await s.transaction(Te).objectStore(Te).get(t);if(a)return a;{const t=await async function(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(e=>e.name).includes(Ie))return null;let t=null;return(await C(Ie,5,{upgrade:async(s,a,n,i)=>{var r;if(a<2)return;if(!s.objectStoreNames.contains(Ce))return;const o=i.objectStore(Ce),c=await o.index("fcmSenderId").get(e);if(await o.clear(),c)if(2===a){const e=c;if(!e.auth||!e.p256dh||!e.endpoint)return;t={token:e.fcmToken,createTime:null!==(r=e.createTime)&&void 0!==r?r:Date.now(),subscriptionOptions:{auth:e.auth,p256dh:e.p256dh,endpoint:e.endpoint,swScope:e.swScope,vapidKey:"string"==typeof e.vapidKey?e.vapidKey:ke(e.vapidKey)}}}else if(3===a){const e=c;t={token:e.fcmToken,createTime:e.createTime,subscriptionOptions:{auth:ke(e.auth),p256dh:ke(e.p256dh),endpoint:e.endpoint,swScope:e.swScope,vapidKey:ke(e.vapidKey)}}}else if(4===a){const e=c;t={token:e.fcmToken,createTime:e.createTime,subscriptionOptions:{auth:ke(e.auth),p256dh:ke(e.p256dh),endpoint:e.endpoint,swScope:e.swScope,vapidKey:ke(e.vapidKey)}}}}})).close(),await P(Ie),await P("fcm_vapid_details_db"),await P("undefined"),function(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return"number"==typeof e.createTime&&e.createTime>0&&"string"==typeof e.token&&e.token.length>0&&"string"==typeof t.auth&&t.auth.length>0&&"string"==typeof t.p256dh&&t.p256dh.length>0&&"string"==typeof t.endpoint&&t.endpoint.length>0&&"string"==typeof t.swScope&&t.swScope.length>0&&"string"==typeof t.vapidKey&&t.vapidKey.length>0}
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
 */(t)?t:null}(e.appConfig.senderId);if(t)return await Ae(e,t),t}}async function Ae(e,t){const s=_e(e),a=(await Oe()).transaction(Te,"readwrite");return await a.objectStore(Te).put(t,s),await a.done,t}function _e({appConfig:e}){return e.appId}
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
 */const Pe=new I("messaging","Messaging",{"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."});async function Me(e,t){const s={method:"DELETE",headers:await He(e)};try{const a=await fetch(`${Ke(e.appConfig)}/${t}`,s),n=await a.json();if(n.error){const e=n.error.message;throw Pe.create("token-unsubscribe-failed",{errorInfo:e})}}catch(a){throw Pe.create("token-unsubscribe-failed",{errorInfo:null==a?void 0:a.toString()})}}function Ke({projectId:e}){return`https://fcmregistrations.googleapis.com/v1/projects/${e}/registrations`}async function He({appConfig:e,installations:t}){const s=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${s}`})}function Le({p256dh:e,auth:t,endpoint:s,vapidKey:a}){const n={web:{endpoint:s,auth:t,p256dh:e}};return a!==ye&&(n.web.applicationPubKey=a),n}
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
 */async function qe(e,t){const s=
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
 */await async function(e,t){const s=await He(e),a=Le(t),n={method:"POST",headers:s,body:JSON.stringify(a)};let i;try{const t=await fetch(Ke(e.appConfig),n);i=await t.json()}catch(r){throw Pe.create("token-subscribe-failed",{errorInfo:null==r?void 0:r.toString()})}if(i.error){const e=i.error.message;throw Pe.create("token-subscribe-failed",{errorInfo:e})}if(!i.token)throw Pe.create("token-subscribe-no-token");return i.token}(e,t),a={token:s,createTime:Date.now(),subscriptionOptions:t};return await Ae(e,a),a.token}
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
function Re(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return function(e,t){if(!t.notification)return;e.notification={};const s=t.notification.title;s&&(e.notification.title=s);const a=t.notification.body;a&&(e.notification.body=a);const n=t.notification.image;n&&(e.notification.image=n);const i=t.notification.icon;i&&(e.notification.icon=i)}(t,e),function(e,t){t.data&&(e.data=t.data)}(t,e),function(e,t){var s,a,n,i,r;if(!t.fcmOptions&&!(null===(s=t.notification)||void 0===s?void 0:s.click_action))return;e.fcmOptions={};const o=null!==(n=null===(a=t.fcmOptions)||void 0===a?void 0:a.link)&&void 0!==n?n:null===(i=t.notification)||void 0===i?void 0:i.click_action;o&&(e.fcmOptions.link=o);const c=null===(r=t.fcmOptions)||void 0===r?void 0:r.analytics_label;c&&(e.fcmOptions.analyticsLabel=c)}
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
 */(t,e),t}function $e(e){return Pe.create("missing-app-config-values",{valueName:e})}
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
 */class Fe{constructor(e,t,s){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const a=
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
function(e){if(!e||!e.options)throw $e("App Configuration Object");if(!e.name)throw $e("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:s}=e;for(const a of t)if(!s[a])throw $e(a);return{appName:e.name,projectId:s.projectId,apiKey:s.apiKey,appId:s.appId,senderId:s.messagingSenderId}}(e);this.firebaseDependencies={app:e,appConfig:a,installations:t,analyticsProvider:s}}_delete(){return Promise.resolve()}}
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
 */async function We(e){try{e.swRegistration=await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/firebase-cloud-messaging-push-scope"}),e.swRegistration.update().catch(()=>{})}catch(t){throw Pe.create("failed-service-worker-registration",{browserErrorMessage:null==t?void 0:t.message})}}
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
async function Ue(e,t){if(!navigator)throw Pe.create("only-available-in-window");if("default"===Notification.permission&&await Notification.requestPermission(),"granted"!==Notification.permission)throw Pe.create("permission-blocked");
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
return await async function(e,t){t?e.vapidKey=t:e.vapidKey||(e.vapidKey=ye)}(e,null==t?void 0:t.vapidKey),await async function(e,t){if(t||e.swRegistration||await We(e),t||!e.swRegistration){if(!(t instanceof ServiceWorkerRegistration))throw Pe.create("invalid-sw-registration");e.swRegistration=t}}(e,null==t?void 0:t.serviceWorkerRegistration),async function(e){const t=await async function(e,t){return await e.pushManager.getSubscription()||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Se(t)})}(e.swRegistration,e.vapidKey),s={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:ke(t.getKey("auth")),p256dh:ke(t.getKey("p256dh"))},a=await Ee(e.firebaseDependencies);if(a){if(function(e,t){const s=t.vapidKey===e.vapidKey,a=t.endpoint===e.endpoint,n=t.auth===e.auth,i=t.p256dh===e.p256dh;return s&&a&&n&&i}(a.subscriptionOptions,s))return Date.now()>=a.createTime+6048e5?async function(e,t){try{const s=await async function(e,t){const s=await He(e),a=Le(t.subscriptionOptions),n={method:"PATCH",headers:s,body:JSON.stringify(a)};let i;try{const s=await fetch(`${Ke(e.appConfig)}/${t.token}`,n);i=await s.json()}catch(r){throw Pe.create("token-update-failed",{errorInfo:null==r?void 0:r.toString()})}if(i.error){const e=i.error.message;throw Pe.create("token-update-failed",{errorInfo:e})}if(!i.token)throw Pe.create("token-update-no-token");return i.token}(e.firebaseDependencies,t),a=Object.assign(Object.assign({},t),{token:s,createTime:Date.now()});return await Ae(e.firebaseDependencies,a),s}catch(s){throw s}}(e,{token:a.token,createTime:Date.now(),subscriptionOptions:s}):a.token;try{await Me(e.firebaseDependencies,a.token)}catch(n){}return qe(e.firebaseDependencies,s)}return qe(e.firebaseDependencies,s)}(e)}
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
async function Be(e,t){const s=t.data;if(!s.isFirebaseMessaging)return;e.onMessageHandler&&s.messageType===Ne.PUSH_RECEIVED&&("function"==typeof e.onMessageHandler?e.onMessageHandler(Re(s)):e.onMessageHandler.next(Re(s)));const a=s.data;var n;"object"==typeof(n=a)&&n&&we in n&&"1"===a["google.c.a.e"]&&await async function(e,t,s){const a=function(e){switch(e){case Ne.NOTIFICATION_CLICKED:return"notification_open";case Ne.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}(t);(await e.firebaseDependencies.analyticsProvider.get()).logEvent(a,{message_id:s[we],message_name:s["google.c.a.c_l"],message_time:s["google.c.a.ts"],message_device_time:Math.floor(Date.now()/1e3)})}(e,s.messageType,a)}const Ve="@firebase/messaging",Ge="0.12.12";
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
async function Je(){try{await D()}catch(e){return!1}return"undefined"!=typeof window&&O()&&E()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}
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
 */function ze(e){return async function(e){if(!navigator)throw Pe.create("only-available-in-window");return e.swRegistration||await We(e),async function(e){const t=await Ee(e.firebaseDependencies);t&&(await Me(e.firebaseDependencies,t.token),await async function(e){const t=_e(e),s=(await Oe()).transaction(Te,"readwrite");await s.objectStore(Te).delete(t),await s.done}(e.firebaseDependencies));const s=await e.swRegistration.pushManager.getSubscription();return!s||s.unsubscribe()}(e)}
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
 */(e=A(e))}function Ye(){const e=s().currentUser;if(!e)throw new Error("Sem sessão Firebase — inicia sessão primeiro.");return e.uid}async function Qe(t){const s=e();await M(K(s,"users",Ye(),"push","prefs"),{reminders:t,updatedAt:(new Date).toISOString()},{merge:!0})}N(new k("messaging",e=>{const t=new Fe(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",e=>Be(t,e)),t},"PUBLIC")),N(new k("messaging-internal",e=>{const t=e.getProvider("messaging").getImmediate();return{getToken:e=>Ue(t,e)}},"PRIVATE")),j(Ve,Ge),j(Ve,Ge,"esm2017");const Xe=[{id:"log-mg",pt:"Registar mg do dia",en:"Log daily mg",defH:21,defM:0},{id:"log-emotions",pt:"Registar emoções",en:"Log emotions",defH:13,defM:0},{id:"log-wellbeing",pt:"Registar bem-estar",en:"Log wellbeing",defH:20,defM:0},{id:"log-reflection",pt:"Reflexão do dia",en:"Daily reflection",defH:22,defM:0},{id:"bedtime",pt:"Hora de ir dormir",en:"Time to wind down",defH:23,defM:0}],Ze="nep_push_reminders";function et({showToast:s}){const{i18n:o}=n(),c="en"===o.language?"en":"pt",[l,d]=v.useState(()=>{const e=i.get(Ze,null);return Array.isArray(e)?Xe.map(t=>e.find(e=>e.id===t.id)||{id:t.id,hour:t.defH,minute:t.defM,enabled:!1}):Xe.map(e=>({id:e.id,hour:e.defH,minute:e.defM,enabled:!1}))}),[u,g]=v.useState(!1),[p,m]=v.useState(()=>i.get("nep_push_enabled",!1)),[f,h]=v.useState(null),x=(e,t)=>{h({text:e,type:t}),null==s||s(e,t)},b=e=>{d(e),i.set(Ze,e),p&&Qe(e).catch(e=>a.error("[Push] guardar config:",e))},y=e=>{const t=Xe.find(t=>t.id===e);return t?t[c]:e},w=e=>`${String(e.hour).padStart(2,"0")}:${String(e.minute).padStart(2,"0")}`;return r.jsxs("div",{className:"bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4",children:[r.jsxs("div",{children:[r.jsxs("h3",{className:"text-white font-semibold flex items-center gap-2",children:["🔔 ","pt"===c?"Lembretes (mesmo com a app fechada)":"Reminders (even when the app is closed)"]}),r.jsx("p",{className:"text-gray-400 text-sm mt-1",children:"pt"===c?"Escolhe o que queres que te lembre e a que horas. Os avisos são discretos — não mostram nada sobre consumo.":"Choose what to be reminded of and when. Alerts are discreet — they never reveal anything about use."})]}),p?r.jsxs("div",{className:"flex items-center justify-between bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2",children:[r.jsxs("span",{className:"text-green-300 text-sm",children:["✅ ","pt"===c?"Ativado neste dispositivo":"Enabled on this device"]}),r.jsx("button",{onClick:async()=>{await async function(){try{if(await Je()){const e=function(e=_()){return Je().then(e=>{if(!e)throw Pe.create("unsupported-browser")},e=>{throw Pe.create("indexed-db-unsupported")}),S(A(e),"messaging").getImmediate()}(t());await ze(e).catch(()=>{})}const s=e();await H(K(s,"users",Ye(),"push","prefs")).catch(()=>{})}catch(s){a.error("[Push] Erro ao desativar:",s)}}(),m(!1),i.set("nep_push_enabled",!1),x("pt"===c?"Notificações desativadas.":"Notifications disabled.","info")},className:"text-red-400 text-sm hover:text-red-300",children:"pt"===c?"Desativar":"Disable"})]}):r.jsx("button",{onClick:async()=>{g(!0);try{await async function(){if(!(await Je()))throw new Error("Este dispositivo/navegador não suporta notificações push.");throw new Error("Falta a chave de notificações (VAPID). Ainda não foi configurada.")}(),await Qe(l),m(!0),i.set("nep_push_enabled",!0),x("pt"===c?"Notificações ativadas neste dispositivo.":"Notifications enabled on this device.","success")}catch(e){x(e.message||("pt"===c?"Não foi possível ativar.":"Could not enable."),"error")}finally{g(!1)}},disabled:u,className:"w-full py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50",children:u?"pt"===c?"A ativar…":"Enabling…":"pt"===c?"Ativar notificações neste dispositivo":"Enable notifications on this device"}),f&&r.jsx("div",{className:"rounded-lg px-3 py-2 text-sm "+("error"===f.type?"bg-red-900/20 border border-red-700/40 text-red-300":"success"===f.type?"bg-green-900/20 border border-green-700/40 text-green-300":"bg-gray-900/40 text-gray-300"),children:f.text}),r.jsx("div",{className:"space-y-2",children:l.map(e=>r.jsxs("div",{className:"flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2",children:[r.jsx("input",{type:"checkbox",checked:e.enabled,onChange:()=>{return t=e.id,b(l.map(e=>e.id===t?{...e,enabled:!e.enabled}:e));var t},className:"w-5 h-5 accent-purple-600 flex-shrink-0"}),r.jsx("span",{className:"flex-1 text-sm "+(e.enabled?"text-white":"text-gray-400"),children:y(e.id)}),r.jsx("input",{type:"time",value:w(e),onChange:t=>((e,t)=>{const[s,a]=t.split(":").map(Number);b(l.map(t=>t.id===e?{...t,hour:s||0,minute:a||0}:t))})(e.id,t.target.value),className:"bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"})]},e.id))}),r.jsx("p",{className:"text-xs text-gray-500",children:"pt"===c?"Nota: os toques podem chegar alguns minutos depois da hora certa. O lembrete aparece à hora marcada mesmo que já tenhas registado.":"Note: alerts may arrive a few minutes late. The reminder fires at the set time even if you already logged it."})]})}function tt(){const{t:e,i18n:t}=n(),[s,a]=v.useState(!1),[i,o]=v.useState(null),c=t.t("settings.guide",{returnObjects:!0});return r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl border overflow-hidden",children:[r.jsxs("button",{onClick:()=>a(e=>!e),className:"w-full flex items-center justify-between p-6 text-left",children:[r.jsxs("h3",{className:"font-semibold text-white flex items-center gap-2",children:[r.jsx(y,{className:"w-5 h-5 text-purple-400"}),e("settings.guideHeader")]}),r.jsx(b,{className:"w-5 h-5 text-gray-400 transition-transform "+(s?"rotate-90":"")})]}),s&&r.jsxs("div",{className:"px-6 pb-6 space-y-2",children:[r.jsx("p",{className:"text-xs text-gray-400 mb-3",children:e("settings.guideTapToLearn")}),c.map((e,t)=>r.jsxs("div",{className:"rounded-lg overflow-hidden border border-gray-700",children:[r.jsxs("button",{onClick:()=>o(i===t?null:t),className:"w-full flex items-center justify-between px-4 py-3 text-left bg-gray-700 hover:bg-gray-600 transition-colors",children:[r.jsxs("span",{className:"flex items-center gap-2 text-sm font-medium text-gray-200",children:[r.jsx("span",{children:e.emoji}),r.jsx("span",{children:e.title})]}),r.jsx(b,{className:"w-4 h-4 text-gray-400 transition-transform flex-shrink-0 "+(i===t?"rotate-90":"")})]}),i===t&&r.jsx("div",{className:"px-4 py-3 bg-gray-800 text-sm text-gray-300 leading-relaxed",children:e.content})]},t))]})]})}const st=({user:e,handleLogout:t,notificationsEnabled:s,requestNotificationPermission:a,onOpenLegalDoc:j,onOpenExport:N,onExportJSON:k,onForceSync:S,isSyncing:I,lastSyncTime:C,firstUseDate:T,firstUseDateLocked:D})=>{const{t:O,i18n:E}=n(),[A,_]=v.useState(null),[P,M]=v.useState(E.language||"pt"),[K,H]=v.useState(()=>i.get("wellbeingAlarmEnabled",!1)),[L,q]=v.useState(()=>"false"!==localStorage.getItem("nep_urge_exercise")),[R,$]=v.useState(()=>{const e=localStorage.getItem("bagWeighAlarmHour");return null!==e&&"null"!==e}),[F,W]=v.useState(()=>{const e=localStorage.getItem("bagWeighAlarmHour");if(null===e||"null"===e)return"10:00";const t=parseInt(e);return isNaN(t)?"10:00":String(t).padStart(2,"0")+":00"}),{lockMode:U,setLockMode:B}=o(),[V,G]=v.useState(()=>c()||"cloud"),[J,z]=v.useState(!1),[Y,Q]=v.useState(()=>T?T.toISOString().slice(0,10):""),X=[{value:"never",label:O("settings.lockNever"),desc:O("settings.lockNeverDesc")},{value:"on_hide",label:O("settings.lockOnHide"),desc:O("settings.lockOnHideDesc")},{value:"5",label:O("settings.lock5min"),desc:O("settings.lock5minDesc")},{value:"15",label:O("settings.lock15min"),desc:O("settings.lock15minDesc")},{value:"60",label:O("settings.lock60min"),desc:O("settings.lock60minDesc")}],Z=e=>{E.changeLanguage(e),localStorage.setItem("nep_lang",e),M(e)};return r.jsxs("div",{className:"space-y-6",children:[r.jsx("h2",{className:"text-2xl font-bold text-white",children:O("settings.title")}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[r.jsx(l,{className:"w-5 h-5"}),O("settings.language")]}),r.jsxs("div",{className:"flex gap-3",children:[r.jsx("button",{onClick:()=>Z("pt"),className:"flex-1 py-3 rounded-lg font-medium transition-all border-2 "+("pt"===P?"bg-purple-600 border-purple-500 text-white":"bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"),children:"🇵🇹 Português"}),r.jsx("button",{onClick:()=>Z("en"),className:"flex-1 py-3 rounded-lg font-medium transition-all border-2 "+("en"===P?"bg-purple-600 border-purple-500 text-white":"bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"),children:"ENG"})]})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-1 flex items-center gap-2",children:["🛡️","pt"===E.language?"Modo de Dados":"Data Mode"]}),r.jsx("p",{className:"text-xs text-gray-400 mb-4",children:"pt"===E.language?"Como os teus dados são guardados e partilhados.":"How your data is stored and shared."}),r.jsx("div",{className:"space-y-2",children:[{id:"local",icon:"📱",label:"pt"===E.language?"Só local":"Local only",desc:"pt"===E.language?"Dados só neste dispositivo, sem backup na cloud.":"Data only on this device, no cloud backup."},{id:"cloud",icon:"🔒",label:"pt"===E.language?"Cloud encriptado":"Cloud encrypted",desc:"pt"===E.language?"Backup seguro na cloud. Recomendado.":"Secure cloud backup. Recommended."},{id:"research",icon:"🔬",label:"pt"===E.language?"Partilhar investigação":"Share research",desc:"pt"===E.language?"Cloud + resumos semanais anónimos para investigação.":"Cloud + anonymous weekly summaries for research."}].map(e=>r.jsxs("button",{onClick:()=>{return t=e.id,w(t),void G(t);var t},className:"w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-start gap-3 "+(V===e.id?"bg-purple-900/40 border-purple-500":"bg-gray-700 border-gray-600 hover:bg-gray-600"),children:[r.jsx("span",{className:"text-xl mt-0.5",children:e.icon}),r.jsxs("div",{children:[r.jsx("div",{className:"font-medium text-sm text-white",children:e.label}),r.jsx("div",{className:"text-xs text-gray-400 mt-0.5",children:e.desc})]}),V===e.id&&r.jsx("span",{className:"ml-auto text-purple-400 text-lg",children:"✓"})]},e.id))})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-1 flex items-center gap-2",children:[r.jsx(d,{className:"w-5 h-5"}),O("settings.autoLock")]}),r.jsx("p",{className:"text-xs text-gray-400 mb-4",children:O("settings.autoLockSubtitle")}),r.jsx("div",{className:"space-y-2",children:X.map(e=>r.jsxs("button",{onClick:()=>B(e.value),className:"w-full text-left px-4 py-3 rounded-lg border-2 transition-all "+(U===e.value?"bg-purple-900/40 border-purple-500 text-white":"bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"),children:[r.jsx("div",{className:"font-medium text-sm",children:e.label}),r.jsx("div",{className:"text-xs text-gray-400 mt-0.5",children:e.desc})]},e.value))}),"never"===U&&r.jsx("div",{className:"mt-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg text-xs text-yellow-400",children:O("settings.autoLockWarning")})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[r.jsx(u,{className:"w-5 h-5"}),O("settings.account")]}),r.jsxs("div",{className:"space-y-3 text-gray-300",children:[r.jsxs("div",{className:"flex items-center gap-2",children:[r.jsx("span",{className:"text-sm font-medium",children:O("settings.emailLabel")}),r.jsx("span",{className:"text-sm",children:(null==e?void 0:e.email)||O("settings.emailNotAvailable")})]}),r.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[r.jsxs("span",{className:"text-sm font-medium",children:["📅 ",O("settings.firstUseLabel")]}),J?r.jsxs("div",{className:"flex items-center gap-2",children:[r.jsx("input",{type:"date",value:Y,onChange:e=>Q(e.target.value),className:"bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"}),r.jsx("button",{onClick:()=>{Y&&(g(async()=>{const{setMetadata:e}=await import("./index-Ci7GHt0n.js").then(e=>e.O);return{setMetadata:e}},__vite__mapDeps([0,1,2,3])).then(({setMetadata:e})=>{e("firstUseDate",new Date(Y).toISOString())}),"undefined"!=typeof window&&window.dispatchEvent(new Event("firstUseDateChanged"))),z(!1)},className:"text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded",children:"✓"}),r.jsx("button",{onClick:()=>z(!1),className:"text-xs text-gray-400 hover:text-white px-1",children:"✕"})]}):r.jsxs("div",{className:"flex items-center gap-2",children:[r.jsx("span",{className:"text-sm",children:T?T.toLocaleDateString("pt"===E.language?"pt-PT":"en-GB",{day:"numeric",month:"long",year:"numeric"}):"—"}),!D&&r.jsx("button",{onClick:()=>{Q(T?T.toISOString().slice(0,10):""),z(!0)},className:"text-xs text-gray-500 hover:text-gray-300",title:O("settings.firstUseEdit"),children:"✏️"})]})]}),r.jsxs("button",{onClick:t,className:"bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50 w-full py-3 rounded-lg transition-all font-medium border flex items-center justify-center gap-2",children:[r.jsx(p,{className:"w-4 h-4"}),O("settings.logout")]})]})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[r.jsx(m,{className:"w-5 h-5"}),O("settings.sync")]}),r.jsxs("div",{className:"space-y-3 text-gray-300",children:[r.jsx("p",{className:"text-sm",children:O("settings.syncDescription")}),C&&r.jsxs("div",{className:"text-xs text-gray-400 bg-gray-900/50 rounded p-2",children:[O("settings.lastSync")," ",new Date(C).toLocaleString("pt"===P?"pt-PT":"en-GB")]}),r.jsxs("button",{onClick:async()=>{_({type:"loading",message:O("settings.syncing")});try{const e=await S(),t=((null==e?void 0:e.pushed)||0)+((null==e?void 0:e.pulled)||0);_({type:"success",message:t>0?O("settings.syncRecords",{count:t}):O("settings.syncUpToDate")})}catch(e){_({type:"error",message:`❌ ${(null==e?void 0:e.message)||O("common.error")}`})}setTimeout(()=>_(null),8e3)},disabled:I,className:"w-full py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 "+(I?"bg-gray-600 text-gray-300 cursor-not-allowed":"bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"),children:[r.jsx(m,{className:"w-4 h-4"+(I?" animate-spin":"")}),O(I?"settings.syncing":"settings.syncNow")]}),A&&r.jsxs("div",{className:"rounded p-3 text-sm flex items-start justify-between gap-2 "+("success"===A.type?"bg-green-900/40 border border-green-600/50 text-green-300":"loading"===A.type?"bg-gray-700 border border-gray-600 text-gray-300":"bg-red-900/40 border border-red-600/50 text-red-300"),children:[r.jsx("span",{children:A.message}),"loading"!==A.type&&r.jsx("button",{onClick:()=>_(null),className:"text-current opacity-60 hover:opacity-100 shrink-0",children:"✕"})]})]})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[r.jsx(f,{className:"w-5 h-5"}),O("settings.exportTitle")]}),r.jsxs("div",{className:"space-y-3 text-gray-300",children:[r.jsx("p",{className:"text-sm",children:O("settings.exportDescription")}),r.jsxs("button",{onClick:N,className:"w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium flex items-center justify-center gap-2",children:[r.jsx(f,{className:"w-4 h-4"}),O("settings.exportButton")]}),r.jsxs("button",{onClick:k,className:"w-full bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2",children:[r.jsx(f,{className:"w-4 h-4"}),O("settings.backupJSONButton")]}),r.jsx("p",{className:"text-xs text-gray-500",children:O("settings.backupJSONDescription")})]})]}),r.jsx(et,{}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-4 flex items-center gap-2",children:[r.jsx(h,{className:"w-5 h-5"}),O("settings.alarmsTitle")]}),r.jsxs("div",{className:"space-y-5",children:[r.jsxs("div",{children:[r.jsxs("div",{className:"flex items-center justify-between",children:[r.jsxs("div",{children:[r.jsx("p",{className:"text-sm font-medium text-gray-200",children:O("settings.alarmWellbeing")}),r.jsx("p",{className:"text-xs text-gray-500 mt-0.5",children:O("settings.alarmWellbeingDesc")})]}),r.jsx("button",{onClick:()=>{return H(e=!K),void i.set("wellbeingAlarmEnabled",e);var e},className:"relative w-12 h-6 rounded-full transition-colors "+(K?"bg-blue-500":"bg-gray-600"),children:r.jsx("span",{className:"absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform "+(K?"translate-x-7":"translate-x-1")})})]}),K&&r.jsx("p",{className:"text-xs text-blue-400 mt-1.5",children:O("settings.alarmWellbeingActive")})]}),r.jsx("div",{className:"border-t border-gray-700"}),r.jsxs("div",{children:[r.jsxs("div",{className:"flex items-center justify-between",children:[r.jsxs("div",{children:[r.jsx("p",{className:"text-sm font-medium text-gray-200",children:O("settings.alarmDose")}),r.jsx("p",{className:"text-xs text-gray-500 mt-0.5",children:O("settings.alarmDoseDesc")})]}),r.jsx("button",{onClick:()=>(e=>{if($(e),e){const e=parseInt(F.split(":")[0]);i.set("bagWeighAlarmHour",e)}else i.set("bagWeighAlarmHour",null)})(!R),className:"relative w-12 h-6 rounded-full transition-colors "+(R?"bg-rose-500":"bg-gray-600"),children:r.jsx("span",{className:"absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform "+(R?"translate-x-7":"translate-x-1")})})]}),R&&r.jsxs("div",{className:"mt-2 flex items-center gap-3",children:[r.jsx("input",{type:"time",value:F,onChange:e=>{return t=e.target.value,W(t),void(R&&t&&i.set("bagWeighAlarmHour",parseInt(t.split(":")[0])));var t},className:"bg-gray-700 border-gray-600 text-white px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-rose-500"}),r.jsxs("p",{className:"text-xs text-rose-400",children:[O("settings.alarmDoseActive")," ",F.slice(0,5)]})]})]})]}),r.jsxs("div",{className:"flex items-center justify-between",children:[r.jsxs("div",{children:[r.jsx("p",{className:"text-sm font-medium text-gray-200",children:O("settings.urgeExercise")}),r.jsx("p",{className:"text-xs text-gray-500 mt-0.5",children:O("settings.urgeExerciseDesc")})]}),r.jsx("button",{onClick:()=>{return q(e=!L),void localStorage.setItem("nep_urge_exercise",e?"true":"false");var e},className:"relative w-12 h-6 rounded-full transition-colors flex-shrink-0 "+(L?"bg-purple-500":"bg-gray-600"),children:r.jsx("span",{className:"absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform "+(L?"translate-x-7":"translate-x-1")})})]}),r.jsx("p",{className:"text-xs text-gray-600 mt-4",children:O("settings.alarmNote")})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[r.jsx(x,{className:"w-5 h-5"}),O("settings.legal")]}),r.jsxs("div",{className:"space-y-2",children:[r.jsxs("button",{onClick:()=>j("license"),className:"bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between",children:[r.jsxs("span",{className:"flex items-center gap-2",children:[r.jsx("span",{children:"📜"}),r.jsx("span",{children:O("settings.license")})]}),r.jsx(b,{className:"w-4 h-4"})]}),r.jsxs("button",{onClick:()=>j("terms"),className:"bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between",children:[r.jsxs("span",{className:"flex items-center gap-2",children:[r.jsx("span",{children:"📋"}),r.jsx("span",{children:O("settings.terms")})]}),r.jsx(b,{className:"w-4 h-4"})]}),r.jsxs("button",{onClick:()=>j("governance"),className:"bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between",children:[r.jsxs("span",{className:"flex items-center gap-2",children:[r.jsx("span",{children:"⚖️"}),r.jsx("span",{children:O("settings.governance")})]}),r.jsx(b,{className:"w-4 h-4"})]})]})]}),r.jsxs("div",{className:"bg-gray-800 border-gray-700 rounded-xl p-6 border",children:[r.jsxs("h3",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[r.jsx(y,{className:"w-5 h-5"}),O("settings.about")]}),r.jsxs("div",{className:"space-y-2 text-sm text-gray-300",children:[r.jsx("p",{children:r.jsx("strong",{children:O("settings.appName")})}),r.jsx("p",{className:"text-xs italic",children:O("settings.tagline")}),r.jsx("p",{className:"text-xs italic",children:O("settings.motto")}),r.jsxs("div",{className:"mt-4 pt-4 border-t text-xs border-gray-700 text-gray-400",children:[r.jsx("p",{children:O("settings.version",{version:"5.0.0"})}),r.jsx("p",{className:"mt-1",children:O("settings.copyright")}),r.jsx("p",{className:"mt-1",children:O("settings.privacyNote")})]})]})]}),r.jsx(tt,{}),r.jsx("div",{className:"bg-purple-900/20 rounded-xl p-4 border border-purple-700/50",children:r.jsxs("div",{className:"flex items-start gap-2",children:[r.jsx(d,{className:"w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"}),r.jsxs("div",{className:"text-sm text-purple-300",children:[r.jsx("p",{className:"font-medium mb-1",children:O("settings.privacy")}),r.jsx("p",{className:"text-xs opacity-90",children:O("settings.privacyText")})]})]})})]})};export{st as SettingsView};
