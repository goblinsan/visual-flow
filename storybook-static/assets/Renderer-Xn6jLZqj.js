import{j as a}from"./jsx-runtime-BjG_zV1W.js";function u(...e){return e.filter(Boolean).join(" ")}function c({node:e}){const r="text-slate-900 dark:text-slate-100",n=e.align==="center"?"text-center":e.align==="end"?"text-right":"text-left",i=e.variant==="h1"?"text-3xl font-bold":e.variant==="h2"?"text-2xl font-semibold":e.variant==="h3"?"text-xl font-semibold":e.variant==="caption"?"text-xs opacity-70":"text-base";return a.jsx("div",{className:u(r,n,i),children:e.text})}function o({node:e}){const r=e.direction==="horizontal"?"flex-row":"flex-col",n=e.gap?`gap-${e.gap}`:"gap-2",i=e.padding?`p-${e.padding}`:void 0,t=e.align==="center"?"items-center":e.align==="end"?"items-end":e.align==="stretch"?"items-stretch":"items-start",d=e.justify==="center"?"justify-center":e.justify==="end"?"justify-end":e.justify==="between"?"justify-between":"justify-start";return a.jsx("div",{className:u("flex",r,n,i,t,d,e.className),children:e.children.map((l,m)=>a.jsx(s,{node:l},"id"in l&&l.id?l.id:m))})}function v({node:e}){const r=`grid-cols-${e.columns}`,n=e.gap?`gap-${e.gap}`:void 0,i=e.padding?`p-${e.padding}`:void 0;return a.jsx("div",{className:u("grid",r,n,i,e.className),children:e.children.map((t,d)=>a.jsx(s,{node:t},"id"in t&&t.id?t.id:d))})}function s({node:e}){switch(e.type){case"text":return a.jsx(c,{node:e});case"stack":return a.jsx(o,{node:e});case"grid":return a.jsx(v,{node:e});default:return null}}function g({spec:e}){const r=e.background==="slate"?"bg-slate-50 dark:bg-slate-900":"bg-white dark:bg-slate-950",n=e.padding?`p-${e.padding}`:void 0;return a.jsx("div",{className:u("w-full h-full",r,n,e.className),children:a.jsx(s,{node:e.body})})}s.__docgenInfo={description:"",methods:[],displayName:"NodeView",props:{node:{required:!0,tsType:{name:"union",raw:"TextNode | StackNode | GridNode",elements:[{name:"signature",type:"object",raw:`{\r
  type: "text";\r
  id?: string;\r
  text: string;\r
  variant?: "h1" | "h2" | "h3" | "body" | "caption";\r
  align?: "start" | "center" | "end";\r
}`,signature:{properties:[{key:"type",value:{name:"literal",value:'"text"',required:!0}},{key:"id",value:{name:"string",required:!1}},{key:"text",value:{name:"string",required:!0}},{key:"variant",value:{name:"union",raw:'"h1" | "h2" | "h3" | "body" | "caption"',elements:[{name:"literal",value:'"h1"'},{name:"literal",value:'"h2"'},{name:"literal",value:'"h3"'},{name:"literal",value:'"body"'},{name:"literal",value:'"caption"'}],required:!1}},{key:"align",value:{name:"union",raw:'"start" | "center" | "end"',elements:[{name:"literal",value:'"start"'},{name:"literal",value:'"center"'},{name:"literal",value:'"end"'}],required:!1}}]}},{name:"signature",type:"object",raw:`{\r
  type: "stack";\r
  id?: string;\r
  direction?: "vertical" | "horizontal"; // default vertical\r
  gap?: number; // tailwind gap-x, gap-y in rem scale (use 1..8)\r
  padding?: number; // p-*\r
  align?: "start" | "center" | "end" | "stretch";\r
  justify?: "start" | "center" | "end" | "between";\r
  className?: string;\r
  children: NodeSpec[];\r
}`,signature:{properties:[{key:"type",value:{name:"literal",value:'"stack"',required:!0}},{key:"id",value:{name:"string",required:!1}},{key:"direction",value:{name:"union",raw:'"vertical" | "horizontal"',elements:[{name:"literal",value:'"vertical"'},{name:"literal",value:'"horizontal"'}],required:!1}},{key:"gap",value:{name:"number",required:!1}},{key:"padding",value:{name:"number",required:!1}},{key:"align",value:{name:"union",raw:'"start" | "center" | "end" | "stretch"',elements:[{name:"literal",value:'"start"'},{name:"literal",value:'"center"'},{name:"literal",value:'"end"'},{name:"literal",value:'"stretch"'}],required:!1}},{key:"justify",value:{name:"union",raw:'"start" | "center" | "end" | "between"',elements:[{name:"literal",value:'"start"'},{name:"literal",value:'"center"'},{name:"literal",value:'"end"'},{name:"literal",value:'"between"'}],required:!1}},{key:"className",value:{name:"string",required:!1}},{key:"children",value:{name:"Array",elements:[{name:"NodeSpec"}],raw:"NodeSpec[]",required:!0}}]}},{name:"signature",type:"object",raw:`{\r
  type: "grid";\r
  id?: string;\r
  columns: number; // grid-cols-*\r
  gap?: number;\r
  padding?: number;\r
  className?: string;\r
  children: NodeSpec[];\r
}`,signature:{properties:[{key:"type",value:{name:"literal",value:'"grid"',required:!0}},{key:"id",value:{name:"string",required:!1}},{key:"columns",value:{name:"number",required:!0}},{key:"gap",value:{name:"number",required:!1}},{key:"padding",value:{name:"number",required:!1}},{key:"className",value:{name:"string",required:!1}},{key:"children",value:{name:"Array",elements:[{name:"NodeSpec"}],raw:"NodeSpec[]",required:!0}}]}}]},description:""}}};g.__docgenInfo={description:"",methods:[],displayName:"Renderer",props:{spec:{required:!0,tsType:{name:"signature",type:"object",raw:`{\r
  id?: string;\r
  background?: "white" | "slate";\r
  padding?: number;\r
  className?: string;\r
  body: NodeSpec;\r
}`,signature:{properties:[{key:"id",value:{name:"string",required:!1}},{key:"background",value:{name:"union",raw:'"white" | "slate"',elements:[{name:"literal",value:'"white"'},{name:"literal",value:'"slate"'}],required:!1}},{key:"padding",value:{name:"number",required:!1}},{key:"className",value:{name:"string",required:!1}},{key:"body",value:{name:"union",raw:"TextNode | StackNode | GridNode",elements:[{name:"signature",type:"object",raw:`{\r
  type: "text";\r
  id?: string;\r
  text: string;\r
  variant?: "h1" | "h2" | "h3" | "body" | "caption";\r
  align?: "start" | "center" | "end";\r
}`,signature:{properties:[{key:"type",value:{name:"literal",value:'"text"',required:!0}},{key:"id",value:{name:"string",required:!1}},{key:"text",value:{name:"string",required:!0}},{key:"variant",value:{name:"union",raw:'"h1" | "h2" | "h3" | "body" | "caption"',elements:[{name:"literal",value:'"h1"'},{name:"literal",value:'"h2"'},{name:"literal",value:'"h3"'},{name:"literal",value:'"body"'},{name:"literal",value:'"caption"'}],required:!1}},{key:"align",value:{name:"union",raw:'"start" | "center" | "end"',elements:[{name:"literal",value:'"start"'},{name:"literal",value:'"center"'},{name:"literal",value:'"end"'}],required:!1}}]}},{name:"signature",type:"object",raw:`{\r
  type: "stack";\r
  id?: string;\r
  direction?: "vertical" | "horizontal"; // default vertical\r
  gap?: number; // tailwind gap-x, gap-y in rem scale (use 1..8)\r
  padding?: number; // p-*\r
  align?: "start" | "center" | "end" | "stretch";\r
  justify?: "start" | "center" | "end" | "between";\r
  className?: string;\r
  children: NodeSpec[];\r
}`,signature:{properties:[{key:"type",value:{name:"literal",value:'"stack"',required:!0}},{key:"id",value:{name:"string",required:!1}},{key:"direction",value:{name:"union",raw:'"vertical" | "horizontal"',elements:[{name:"literal",value:'"vertical"'},{name:"literal",value:'"horizontal"'}],required:!1}},{key:"gap",value:{name:"number",required:!1}},{key:"padding",value:{name:"number",required:!1}},{key:"align",value:{name:"union",raw:'"start" | "center" | "end" | "stretch"',elements:[{name:"literal",value:'"start"'},{name:"literal",value:'"center"'},{name:"literal",value:'"end"'},{name:"literal",value:'"stretch"'}],required:!1}},{key:"justify",value:{name:"union",raw:'"start" | "center" | "end" | "between"',elements:[{name:"literal",value:'"start"'},{name:"literal",value:'"center"'},{name:"literal",value:'"end"'},{name:"literal",value:'"between"'}],required:!1}},{key:"className",value:{name:"string",required:!1}},{key:"children",value:{name:"Array",elements:[{name:"NodeSpec"}],raw:"NodeSpec[]",required:!0}}]}},{name:"signature",type:"object",raw:`{\r
  type: "grid";\r
  id?: string;\r
  columns: number; // grid-cols-*\r
  gap?: number;\r
  padding?: number;\r
  className?: string;\r
  children: NodeSpec[];\r
}`,signature:{properties:[{key:"type",value:{name:"literal",value:'"grid"',required:!0}},{key:"id",value:{name:"string",required:!1}},{key:"columns",value:{name:"number",required:!0}},{key:"gap",value:{name:"number",required:!1}},{key:"padding",value:{name:"number",required:!1}},{key:"className",value:{name:"string",required:!1}},{key:"children",value:{name:"Array",elements:[{name:"NodeSpec"}],raw:"NodeSpec[]",required:!0}}]}}],required:!0}}]}},description:""}}};export{g as R};
