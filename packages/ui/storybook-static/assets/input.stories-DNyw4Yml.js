import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as f}from"./index-Y0gaZlcC.js";import{c as g}from"./index-CobTJpls.js";import{c as x}from"./utils-DCADjnpI.js";const v=g("flex h-10 w-full rounded-md border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm ring-offset-[--color-background] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",{variants:{variant:{default:"border-[--color-border]",error:"border-[--color-destructive] focus-visible:ring-[--color-destructive]",success:"border-[--color-success] focus-visible:ring-[--color-success]"}},defaultVariants:{variant:"default"}}),e=f.forwardRef(({className:i,variant:d,type:p,...u},m)=>r.jsx("input",{type:p,className:x(v({variant:d}),i),ref:m,...u}));e.displayName="Input";e.__docgenInfo={description:"",methods:[],displayName:"Input",composes:["VariantProps"]};const I={title:"UI/Input",component:e,tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","error","success"],description:"Input variant style"},type:{control:"select",options:["text","email","password","number"],description:"Input type"},placeholder:{control:"text",description:"Placeholder text"},disabled:{control:"boolean",description:"Disable the input"}}},a={args:{variant:"default",type:"text",placeholder:"Enter text..."}},t={args:{variant:"error",type:"text",placeholder:"Enter text..."}},s={args:{variant:"success",type:"text",placeholder:"Enter text..."}},o={args:{variant:"default",type:"email",placeholder:"Enter email..."}},n={args:{variant:"default",type:"password",placeholder:"Enter password..."}},c={args:{variant:"default",type:"text",placeholder:"Disabled input",disabled:!0}},l={render:()=>r.jsxs("div",{className:"flex flex-col gap-4",children:[r.jsx(e,{variant:"default",placeholder:"Default input"}),r.jsx(e,{variant:"error",placeholder:"Error input"}),r.jsx(e,{variant:"success",placeholder:"Success input"})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    type: 'text',
    placeholder: 'Enter text...'
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'error',
    type: 'text',
    placeholder: 'Enter text...'
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'success',
    type: 'text',
    placeholder: 'Enter text...'
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    type: 'email',
    placeholder: 'Enter email...'
  }
}`,...o.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    type: 'password',
    placeholder: 'Enter password...'
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">\r
      <Input variant="default" placeholder="Default input" />\r
      <Input variant="error" placeholder="Error input" />\r
      <Input variant="success" placeholder="Success input" />\r
    </div>
}`,...l.parameters?.docs?.source}}};const S=["Default","Error","Success","Email","Password","Disabled","AllVariants"];export{l as AllVariants,a as Default,c as Disabled,o as Email,t as Error,n as Password,s as Success,S as __namedExportsOrder,I as default};
