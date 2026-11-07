import{c as t,j as s}from"./index-DkHNMs1t.js";import{L as n}from"./react-CnqQ6nVx.js";import{P as o}from"./productcard-mxC7KX2F.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=t("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);function x({title:i="Campus favourites",subtitle:r="TRENDING ON MAK MART",products:e=[],loading:c=!1,viewAllTo:a="/marketplace/products"}){return s.jsxs("section",{className:"mm-section mm-container",children:[s.jsxs("div",{className:"mm-section__head",children:[s.jsxs("div",{children:[s.jsx("span",{className:"mm-eyebrow",children:r}),s.jsx("h2",{children:i})]}),a&&s.jsxs(n,{to:a,className:"mm-viewall",children:["View all ",s.jsx(d,{size:18})]})]}),c?s.jsx("p",{className:"mm-empty",children:"Loading products..."}):e.length===0?s.jsx("p",{className:"mm-empty",children:"No products available yet."}):s.jsx("div",{className:"mm-grid",children:e.map(m=>s.jsx(o,{product:m},m.id))})]})}export{d as A,x as P};
