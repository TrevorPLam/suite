import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{c as u}from"./index-CobTJpls.js";import{c as g}from"./utils-DCADjnpI.js";const p=u("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[--color-ring] focus:ring-offset-2",{variants:{variant:{default:"border-transparent bg-[--color-primary] text-[--color-primary-foreground] hover:bg-[--color-primary]/80",success:"border-transparent bg-[--color-success] text-[--color-success-foreground] hover:bg-[--color-success]/80",error:"border-transparent bg-[--color-destructive] text-[--color-destructive-foreground] hover:bg-[--color-destructive]/80",warning:"border-transparent bg-[--color-warning] text-[--color-warning-foreground] hover:bg-[--color-warning]/80",outline:"text-[--color-foreground] border-[--color-border]"}},defaultVariants:{variant:"default"}});function e({className:i,variant:d,...l}){return r.jsx("div",{className:g(p({variant:d}),i),...l})}e.__docgenInfo={description:"",methods:[],displayName:"Badge",composes:["VariantProps"]};const x={title:"UI/Badge",component:e,tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","success","error","warning","outline"],description:"Badge variant style"}}},a={args:{variant:"default",children:"Default"}},n={args:{variant:"success",children:"Success"}},s={args:{variant:"error",children:"Error"}},o={args:{variant:"warning",children:"Warning"}},t={args:{variant:"outline",children:"Outline"}},c={render:()=>r.jsxs("div",{className:"flex gap-2",children:[r.jsx(e,{variant:"default",children:"Default"}),r.jsx(e,{variant:"success",children:"Success"}),r.jsx(e,{variant:"error",children:"Error"}),r.jsx(e,{variant:"warning",children:"Warning"}),r.jsx(e,{variant:"outline",children:"Outline"})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    children: 'Default'
  }
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'success',
    children: 'Success'
  }
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'error',
    children: 'Error'
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'warning',
    children: 'Warning'
  }
}`,...o.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'outline',
    children: 'Outline'
  }
}`,...t.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-2">\r
      <Badge variant="default">Default</Badge>\r
      <Badge variant="success">Success</Badge>\r
      <Badge variant="error">Error</Badge>\r
      <Badge variant="warning">Warning</Badge>\r
      <Badge variant="outline">Outline</Badge>\r
    </div>
}`,...c.parameters?.docs?.source}}};const h=["Default","Success","Error","Warning","Outline","AllVariants"];export{c as AllVariants,a as Default,s as Error,t as Outline,n as Success,o as Warning,h as __namedExportsOrder,x as default};
