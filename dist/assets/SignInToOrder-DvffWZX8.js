import{c as o,j as e}from"./index-CHVkWm83.js";import{M as l}from"./modal-Dm2QwW4t.js";import{r as u}from"./returnTo-Cf3hA0Hp.js";import{a as y,b as d}from"./react-BL1_SiB8.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=o("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=o("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);function k({isOpen:s,onClose:r}){const c=y(),t=d(),a=i=>{const n=`${t.pathname}${t.search}`;u(n),c(i,{state:{from:n}})};return e.jsx(l,{isOpen:s,onClose:r,title:"Create an account to continue",children:e.jsxs("div",{className:"signin-to-order",children:[e.jsx("p",{children:"To place an order or request a service you first need a free MAK MART account. It takes about a minute, and you'll come straight back here to message the seller on WhatsApp."}),e.jsx("p",{className:"field-hint",children:"An account also lets you track your orders, confirm delivery and rate sellers."}),e.jsxs("button",{type:"button",className:"primary-button full-width",onClick:()=>a("/signup"),children:[e.jsx(m,{size:18})," Create an account"]}),e.jsxs("button",{type:"button",className:"secondary-button full-width",onClick:()=>a("/login"),children:[e.jsx(h,{size:18})," I already have an account"]})]})})}export{k as S};
