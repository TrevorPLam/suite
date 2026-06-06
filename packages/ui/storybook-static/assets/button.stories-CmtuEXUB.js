import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{B as s}from"./button-x6mjTnN0.js";import"./index-Y0gaZlcC.js";import"./index-CobTJpls.js";import"./utils-DCADjnpI.js";const l={title:"UI/Button",component:s,tags:["autodocs"],argTypes:{variant:{control:"select",options:["primary","secondary","danger"],description:"Button variant style"},disabled:{control:"boolean",description:"Disable the button"},children:{control:"text",description:"Button text content"}}},a={args:{variant:"primary",children:"Primary Button"}},e={args:{variant:"secondary",children:"Secondary Button"}},n={args:{variant:"danger",children:"Danger Button"}},t={args:{variant:"primary",children:"Disabled Button",disabled:!0}},o={render:()=>r.jsxs("div",{className:"flex gap-4",children:[r.jsx(s,{variant:"primary",children:"Primary"}),r.jsx(s,{variant:"secondary",children:"Secondary"}),r.jsx(s,{variant:"danger",children:"Danger"})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
}`,...a.parameters?.docs?.source}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
}`,...e.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'danger',
    children: 'Danger Button'
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    children: 'Disabled Button',
    disabled: true
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-4">\r
      <Button variant="primary">Primary</Button>\r
      <Button variant="secondary">Secondary</Button>\r
      <Button variant="danger">Danger</Button>\r
    </div>
}`,...o.parameters?.docs?.source}}};const u=["Primary","Secondary","Danger","Disabled","AllVariants"];export{o as AllVariants,n as Danger,t as Disabled,a as Primary,e as Secondary,u as __namedExportsOrder,l as default};
