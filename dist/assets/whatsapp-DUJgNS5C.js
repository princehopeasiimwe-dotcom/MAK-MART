function $(e=""){return String(e).replace(/\D/g,"").replace(/^0/,"256")}function m(e,n=""){const o=$(e),a=encodeURIComponent(n);return`https://wa.me/${o}?text=${a}`}function u(e,n=""){const o=m(e,n);window.open(o,"_blank","noopener,noreferrer")}function N(e,n={}){const{customerName:o="",customerPhone:a="",customerLocation:r="",quantity:i=1,notes:c=""}=n,s=Number((e==null?void 0:e.price)||0)*Number(i||1);return`
Hello, I'd like to place an order on KU Market.

Product: ${(e==null?void 0:e.name)||"Product"}
Price: UGX ${Number((e==null?void 0:e.price)||0).toLocaleString()}
Quantity: ${i}
Total: UGX ${s.toLocaleString()}

Name: ${o}
Phone: ${a}
${r?`Location: ${r}
`:""}${c?`Note: ${c}
`:""}
Please confirm availability. Thank you!
`.trim()}function b(e=[],n={}){const{customerName:o="",customerPhone:a="",customerLocation:r="",notes:i=""}=n,c=e.map(t=>`- ${t.name} x${t.quantity} = UGX ${(Number(t.price||0)*t.quantity).toLocaleString()}`).join(`
`),s=e.reduce((t,l)=>t+Number(l.price||0)*l.quantity,0);return`
Hello, I'd like to place an order on KU Market.

${c}

Total: UGX ${s.toLocaleString()}

Name: ${o}
Phone: ${a}
${r?`Location: ${r}
`:""}${i?`Note: ${i}
`:""}
Please confirm availability. Thank you!
`.trim()}export{b as a,m as b,N as c,u as o};
