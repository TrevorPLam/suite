import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as c}from"./index-Y0gaZlcC.js";import{c as C}from"./utils-DCADjnpI.js";import{B as j}from"./button-x6mjTnN0.js";import"./index-CobTJpls.js";const a=c.forwardRef(({className:e,...n},d)=>r.jsx("div",{ref:d,className:C("rounded-lg border border-[--color-border] bg-[--color-card] text-[--color-card-foreground] shadow-sm",e),...n}));a.displayName="Card";const s=c.forwardRef(({className:e,...n},d)=>r.jsx("div",{ref:d,className:C("flex flex-col space-y-1.5 p-6",e),...n}));s.displayName="CardHeader";const t=c.forwardRef(({className:e,...n},d)=>r.jsx("h3",{ref:d,className:C("text-2xl font-semibold leading-none tracking-tight text-[--color-foreground]",e),...n}));t.displayName="CardTitle";const o=c.forwardRef(({className:e,...n},d)=>r.jsx("p",{ref:d,className:C("text-sm text-[--color-muted-foreground]",e),...n}));o.displayName="CardDescription";const i=c.forwardRef(({className:e,...n},d)=>r.jsx("div",{ref:d,className:C("p-6 pt-0",e),...n}));i.displayName="CardContent";const h=c.forwardRef(({className:e,...n},d)=>r.jsx("div",{ref:d,className:C("flex items-center p-6 pt-0",e),...n}));h.displayName="CardFooter";a.__docgenInfo={description:"",methods:[],displayName:"Card"};s.__docgenInfo={description:"",methods:[],displayName:"CardHeader"};h.__docgenInfo={description:"",methods:[],displayName:"CardFooter"};t.__docgenInfo={description:"",methods:[],displayName:"CardTitle"};o.__docgenInfo={description:"",methods:[],displayName:"CardDescription"};i.__docgenInfo={description:"",methods:[],displayName:"CardContent"};const T={title:"UI/Card",component:a,tags:["autodocs"]},l={render:()=>r.jsxs(a,{className:"w-[350px]",children:[r.jsxs(s,{children:[r.jsx(t,{children:"Card Title"}),r.jsx(o,{children:"Card description goes here."})]}),r.jsx(i,{children:r.jsx("p",{children:"Card content goes here."})}),r.jsx(h,{children:r.jsx(j,{children:"Learn More"})})]})},p={render:()=>r.jsxs(a,{className:"w-[350px]",children:[r.jsxs(s,{children:[r.jsx(t,{children:"Card Title"}),r.jsx(o,{children:"Card description goes here."})]}),r.jsx(i,{children:r.jsx("p",{children:"Card content goes here."})})]})},m={render:()=>r.jsxs(a,{className:"w-[350px]",children:[r.jsxs(s,{children:[r.jsx(t,{children:"Card Title"}),r.jsx(o,{children:"Card description goes here."})]}),r.jsx(i,{children:r.jsx("p",{children:"Card content goes here."})}),r.jsxs(h,{className:"flex justify-between",children:[r.jsx(j,{variant:"secondary",children:"Cancel"}),r.jsx(j,{children:"Confirm"})]})]})},x={render:()=>r.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[r.jsxs(a,{children:[r.jsxs(s,{children:[r.jsx(t,{children:"Card 1"}),r.jsx(o,{children:"Description"})]}),r.jsx(i,{children:r.jsx("p",{children:"Content"})})]}),r.jsxs(a,{children:[r.jsxs(s,{children:[r.jsx(t,{children:"Card 2"}),r.jsx(o,{children:"Description"})]}),r.jsx(i,{children:r.jsx("p",{children:"Content"})})]}),r.jsxs(a,{children:[r.jsxs(s,{children:[r.jsx(t,{children:"Card 3"}),r.jsx(o,{children:"Description"})]}),r.jsx(i,{children:r.jsx("p",{children:"Content"})})]})]})};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-[350px]">\r
      <CardHeader>\r
        <CardTitle>Card Title</CardTitle>\r
        <CardDescription>Card description goes here.</CardDescription>\r
      </CardHeader>\r
      <CardContent>\r
        <p>Card content goes here.</p>\r
      </CardContent>\r
      <CardFooter>\r
        <Button>Learn More</Button>\r
      </CardFooter>\r
    </Card>
}`,...l.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-[350px]">\r
      <CardHeader>\r
        <CardTitle>Card Title</CardTitle>\r
        <CardDescription>Card description goes here.</CardDescription>\r
      </CardHeader>\r
      <CardContent>\r
        <p>Card content goes here.</p>\r
      </CardContent>\r
    </Card>
}`,...p.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-[350px]">\r
      <CardHeader>\r
        <CardTitle>Card Title</CardTitle>\r
        <CardDescription>Card description goes here.</CardDescription>\r
      </CardHeader>\r
      <CardContent>\r
        <p>Card content goes here.</p>\r
      </CardContent>\r
      <CardFooter className="flex justify-between">\r
        <Button variant="secondary">Cancel</Button>\r
        <Button>Confirm</Button>\r
      </CardFooter>\r
    </Card>
}`,...m.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-3 gap-4">\r
      <Card>\r
        <CardHeader>\r
          <CardTitle>Card 1</CardTitle>\r
          <CardDescription>Description</CardDescription>\r
        </CardHeader>\r
        <CardContent>\r
          <p>Content</p>\r
        </CardContent>\r
      </Card>\r
      <Card>\r
        <CardHeader>\r
          <CardTitle>Card 2</CardTitle>\r
          <CardDescription>Description</CardDescription>\r
        </CardHeader>\r
        <CardContent>\r
          <p>Content</p>\r
        </CardContent>\r
      </Card>\r
      <Card>\r
        <CardHeader>\r
          <CardTitle>Card 3</CardTitle>\r
          <CardDescription>Description</CardDescription>\r
        </CardHeader>\r
        <CardContent>\r
          <p>Content</p>\r
        </CardContent>\r
      </Card>\r
    </div>
}`,...x.parameters?.docs?.source}}};const y=["Default","WithoutFooter","WithMultipleActions","Grid"];export{l as Default,x as Grid,m as WithMultipleActions,p as WithoutFooter,y as __namedExportsOrder,T as default};
