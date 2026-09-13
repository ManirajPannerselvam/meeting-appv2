import"../chunks/DsnmJJEf.js";import"../chunks/69_IOA4Y.js";import{s as e,f as b,t as y,g as t,a as A,e as i,c as w,m as n,aH as I,d as p,r as d}from"../chunks/CDaHMpGh.js";import{s as v}from"../chunks/CQ9sofQU.js";import{d as k,a as M}from"../chunks/CRXaRzmp.js";import{b as S}from"../chunks/Bbx_4QV2.js";var j=w('<h1>AI Meeting Assistant</h1> <textarea rows="10" placeholder="Paste meeting notes here..." class="svelte-tv7u40"></textarea> <button class="svelte-tv7u40">Generate Summary</button> <h2>Meeting Summary</h2> <pre class="svelte-tv7u40"> </pre> <h2>Action Items</h2> <pre class="svelte-tv7u40"> </pre>',1);function N(f){let a=n(""),o=n(""),l=n("");function g(){if(!t(a).trim()){alert("Enter meeting notes");return}i(o,`AI Summary:

Meeting discussion analyzed successfully.
Key decisions identified.`),i(l,`1. Review pending issues
2. Update project status
3. Follow up with stakeholders`)}var m=j(),s=e(b(m),2);I(s);var c=e(s,2),r=e(c,4),h=p(r,!0);d(r);var u=e(r,4),_=p(u,!0);d(u),y(()=>{v(h,t(o)),v(_,t(l))}),S(s,()=>t(a),x=>i(a,x)),M("click",c,g),A(f,m)}k(["click"]);export{N as component};
