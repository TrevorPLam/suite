import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as x}from"./index-Y0gaZlcC.js";import{c as f}from"./index-CobTJpls.js";import{c as g}from"./utils-DCADjnpI.js";const v=f("flex min-h-[80px] w-full rounded-md border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm ring-offset-[--color-background] placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",{variants:{resize:{none:"resize-none",vertical:"resize-y",horizontal:"resize-x",both:"resize"},variant:{default:"border-[--color-border]",error:"border-[--color-destructive] focus-visible:ring-[--color-destructive]",success:"border-[--color-success] focus-visible:ring-[--color-success]"}},defaultVariants:{resize:"vertical",variant:"default"}}),e=x.forwardRef(({className:i,variant:d,resize:u,...p},m)=>r.jsx("textarea",{className:g(v({variant:d,resize:u}),i),ref:m,...p}));e.displayName="Textarea";e.__docgenInfo={description:"",methods:[],displayName:"Textarea",composes:["VariantProps"]};const E={title:"UI/Textarea",component:e,tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","error","success"],description:"Textarea variant style"},resize:{control:"select",options:["none","vertical","horizontal","both"],description:"Textarea resize behavior"},placeholder:{control:"text",description:"Placeholder text"},disabled:{control:"boolean",description:"Disable the textarea"}}},a={args:{variant:"default",placeholder:"Enter your message..."}},s={args:{variant:"error",placeholder:"Enter your message..."}},o={args:{variant:"success",placeholder:"Enter your message..."}},t={args:{variant:"default",resize:"none",placeholder:"Fixed size textarea"}},n={args:{variant:"default",resize:"horizontal",placeholder:"Horizontal resize only"}},c={args:{variant:"default",placeholder:"Disabled textarea",disabled:!0}},l={render:()=>r.jsxs("div",{className:"flex flex-col gap-4",children:[r.jsx(e,{variant:"default",placeholder:"Default textarea"}),r.jsx(e,{variant:"error",placeholder:"Error textarea"}),r.jsx(e,{variant:"success",placeholder:"Success textarea"})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    placeholder: 'Enter your message...'
  }
}`,...a.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'error',
    placeholder: 'Enter your message...'
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'success',
    placeholder: 'Enter your message...'
  }
}`,...o.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    resize: 'none',
    placeholder: 'Fixed size textarea'
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    resize: 'horizontal',
    placeholder: 'Horizontal resize only'
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'default',
    placeholder: 'Disabled textarea',
    disabled: true
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">\r
      <Textarea variant="default" placeholder="Default textarea" />\r
      <Textarea variant="error" placeholder="Error textarea" />\r
      <Textarea variant="success" placeholder="Success textarea" />\r
    </div>
}`,...l.parameters?.docs?.source}}};const S=["Default","Error","Success","NoResize","HorizontalResize","Disabled","AllVariants"];export{l as AllVariants,a as Default,c as Disabled,s as Error,n as HorizontalResize,t as NoResize,o as Success,S as __namedExportsOrder,E as default};
