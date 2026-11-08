import{c as r,s as n}from"./index-mptPNDzf.js";import{r as s}from"./react-D3ABeba6.js";import{M as u}from"./messageService-DTXsk9Ty.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=r("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=r("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);function f(a){const[o,t]=s.useState(0),e=s.useCallback(()=>{a&&u.unreadCount().then(t).catch(()=>t(0))},[a]);return s.useEffect(()=>{if(!a)return;e();const c=setInterval(e,6e4),m=n.channel(`unread-messages:${a}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},e).subscribe();return window.addEventListener("mm:messages-read",e),()=>{clearInterval(c),window.removeEventListener("mm:messages-read",e),n.removeChannel(m)}},[a,e]),o}export{d as C,p as M,f as u};
