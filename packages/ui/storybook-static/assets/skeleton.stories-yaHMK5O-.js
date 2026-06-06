import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as g}from"./index-Y0gaZlcC.js";import{c as h}from"./index-CobTJpls.js";import{c as v}from"./utils-DCADjnpI.js";const S=h("animate-pulse rounded-md bg-[--color-muted]",{variants:{variant:{text:"h-4 w-full",rectangular:"h-12 w-full",circular:"h-12 w-12 rounded-full"}},defaultVariants:{variant:"text"}}),e=g.forwardRef(({className:c,variant:d,height:l,width:p,style:m,...u},x)=>r.jsx("div",{ref:x,className:v(S({variant:d}),c),style:{height:l,width:p,...m},role:"status","aria-label":"Loading",...u}));e.displayName="Skeleton";e.__docgenInfo={description:"",methods:[],displayName:"Skeleton",props:{height:{required:!1,tsType:{name:"string"},description:""},width:{required:!1,tsType:{name:"string"},description:""}},composes:["VariantProps"]};const j={title:"UI/Skeleton",component:e,tags:["autodocs"],argTypes:{variant:{control:"select",options:["text","rectangular","circular"],description:"Skeleton variant style"},height:{control:"text",description:'Custom height (e.g., "100px")'},width:{control:"text",description:'Custom width (e.g., "200px")'}}},a={args:{variant:"text"}},t={args:{variant:"rectangular"}},s={args:{variant:"circular"}},n={args:{variant:"rectangular",height:"100px",width:"200px"}},i={render:()=>r.jsxs("div",{className:"w-[350px] space-y-4 rounded-lg border border-[--color-border] bg-[--color-card] p-6",children:[r.jsx(e,{variant:"circular",height:"40px",width:"40px"}),r.jsxs("div",{className:"space-y-2",children:[r.jsx(e,{variant:"text"}),r.jsx(e,{variant:"text",width:"80%"})]}),r.jsx(e,{variant:"rectangular",height:"100px"})]})},o={render:()=>r.jsx("div",{className:"space-y-4",children:[1,2,3].map(c=>r.jsxs("div",{className:"flex items-center space-x-4",children:[r.jsx(e,{variant:"circular",height:"40px",width:"40px"}),r.jsxs("div",{className:"space-y-2 flex-1",children:[r.jsx(e,{variant:"text"}),r.jsx(e,{variant:"text",width:"60%"})]})]},c))})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'text'
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'rectangular'
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'circular'
  }
}`,...s.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'rectangular',
    height: '100px',
    width: '200px'
  }
}`,...n.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-[350px] space-y-4 rounded-lg border border-[--color-border] bg-[--color-card] p-6">\r
      <Skeleton variant="circular" height="40px" width="40px" />\r
      <div className="space-y-2">\r
        <Skeleton variant="text" />\r
        <Skeleton variant="text" width="80%" />\r
      </div>\r
      <Skeleton variant="rectangular" height="100px" />\r
    </div>
}`,...i.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="space-y-4">\r
      {[1, 2, 3].map(i => <div key={i} className="flex items-center space-x-4">\r
          <Skeleton variant="circular" height="40px" width="40px" />\r
          <div className="space-y-2 flex-1">\r
            <Skeleton variant="text" />\r
            <Skeleton variant="text" width="60%" />\r
          </div>\r
        </div>)}\r
    </div>
}`,...o.parameters?.docs?.source}}};const N=["Text","Rectangular","Circular","CustomSize","CardSkeleton","ListSkeleton"];export{i as CardSkeleton,s as Circular,n as CustomSize,o as ListSkeleton,t as Rectangular,a as Text,N as __namedExportsOrder,j as default};
