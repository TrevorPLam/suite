import{j as n}from"./jsx-runtime-D_zvdyIk.js";import{r as s}from"./index-Y0gaZlcC.js";import{u as P,a as $,b as ge,c as F,P as N,d as v,e as pe,f as me,h as fe,R as De,g as xe,F as he,D as ve,i as Ne,j as ye,k as Ce}from"./createLucideIcon-DvC00dT6.js";import{c as h}from"./utils-DCADjnpI.js";import{B as m}from"./button-x6mjTnN0.js";import"./index-B0RnMFtL.js";import"./index-CRgkZpeb.js";import"./index-CobTJpls.js";function je(e,t){return s.useReducer((o,r)=>t[o][r]??o,e)}var w=e=>{const{present:t,children:o}=e,r=Te(t),i=typeof o=="function"?o({present:r.isPresent}):s.Children.only(o),a=P(r.ref,Re(i));return typeof o=="function"||r.isPresent?s.cloneElement(i,{ref:a}):null};w.displayName="Presence";function Te(e){const[t,o]=s.useState(),r=s.useRef(null),i=s.useRef(e),a=s.useRef("none"),d=e?"mounted":"unmounted",[l,u]=je(d,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return s.useEffect(()=>{const c=b(r.current);a.current=l==="mounted"?c:"none"},[l]),$(()=>{const c=r.current,p=i.current;if(p!==e){const _=a.current,D=b(c);e?u("MOUNT"):D==="none"||c?.display==="none"?u("UNMOUNT"):u(p&&_!==D?"ANIMATION_OUT":"UNMOUNT"),i.current=e}},[e,u]),$(()=>{if(t){let c;const p=t.ownerDocument.defaultView??window,f=D=>{const de=b(r.current).includes(CSS.escape(D.animationName));if(D.target===t&&de&&(u("ANIMATION_END"),!i.current)){const ue=t.style.animationFillMode;t.style.animationFillMode="forwards",c=p.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=ue)})}},_=D=>{D.target===t&&(a.current=b(r.current))};return t.addEventListener("animationstart",_),t.addEventListener("animationcancel",f),t.addEventListener("animationend",f),()=>{p.clearTimeout(c),t.removeEventListener("animationstart",_),t.removeEventListener("animationcancel",f),t.removeEventListener("animationend",f)}}else u("ANIMATION_END")},[t,u]),{isPresent:["mounted","unmountSuspended"].includes(l),ref:s.useCallback(c=>{r.current=c?getComputedStyle(c):null,o(c)},[])}}function b(e){return e?.animationName||"none"}function Re(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}var M="Dialog",[q]=me(M),[_e,g]=q(M),H=e=>{const{__scopeDialog:t,children:o,open:r,defaultOpen:i,onOpenChange:a,modal:d=!0}=e,l=s.useRef(null),u=s.useRef(null),[c,p]=ge({prop:r,defaultProp:i??!1,onChange:a,caller:M});return n.jsx(_e,{scope:t,triggerRef:l,contentRef:u,contentId:F(),titleId:F(),descriptionId:F(),open:c,onOpenChange:p,onOpenToggle:s.useCallback(()=>p(f=>!f),[p]),modal:d,children:o})};H.displayName=M;var G="DialogTrigger",z=s.forwardRef((e,t)=>{const{__scopeDialog:o,...r}=e,i=g(G,o),a=P(t,i.triggerRef);return n.jsx(N.button,{type:"button","aria-haspopup":"dialog","aria-expanded":i.open,"aria-controls":i.contentId,"data-state":W(i.open),...r,ref:a,onClick:v(e.onClick,i.onOpenToggle)})});z.displayName=G;var B="DialogPortal",[be,V]=q(B,{forceMount:void 0}),K=e=>{const{__scopeDialog:t,forceMount:o,children:r,container:i}=e,a=g(B,t);return n.jsx(be,{scope:t,forceMount:o,children:s.Children.map(r,d=>n.jsx(w,{present:o||a.open,children:n.jsx(pe,{asChild:!0,container:i,children:d})}))})};K.displayName=B;var A="DialogOverlay",X=s.forwardRef((e,t)=>{const o=V(A,e.__scopeDialog),{forceMount:r=o.forceMount,...i}=e,a=g(A,e.__scopeDialog);return a.modal?n.jsx(w,{present:r||a.open,children:n.jsx(Ee,{...i,ref:t})}):null});X.displayName=A;var Oe=Ne("DialogOverlay.RemoveScroll"),Ee=s.forwardRef((e,t)=>{const{__scopeDialog:o,...r}=e,i=g(A,o);return n.jsx(De,{as:Oe,allowPinchZoom:!0,shards:[i.contentRef],children:n.jsx(N.div,{"data-state":W(i.open),...r,ref:t,style:{pointerEvents:"auto",...r.style}})})}),x="DialogContent",Y=s.forwardRef((e,t)=>{const o=V(x,e.__scopeDialog),{forceMount:r=o.forceMount,...i}=e,a=g(x,e.__scopeDialog);return n.jsx(w,{present:r||a.open,children:a.modal?n.jsx(Ie,{...i,ref:t}):n.jsx(Ae,{...i,ref:t})})});Y.displayName=x;var Ie=s.forwardRef((e,t)=>{const o=g(x,e.__scopeDialog),r=s.useRef(null),i=P(t,o.contentRef,r);return s.useEffect(()=>{const a=r.current;if(a)return fe(a)},[]),n.jsx(Z,{...e,ref:i,trapFocus:o.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:v(e.onCloseAutoFocus,a=>{a.preventDefault(),o.triggerRef.current?.focus()}),onPointerDownOutside:v(e.onPointerDownOutside,a=>{const d=a.detail.originalEvent,l=d.button===0&&d.ctrlKey===!0;(d.button===2||l)&&a.preventDefault()}),onFocusOutside:v(e.onFocusOutside,a=>a.preventDefault())})}),Ae=s.forwardRef((e,t)=>{const o=g(x,e.__scopeDialog),r=s.useRef(!1),i=s.useRef(!1);return n.jsx(Z,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:a=>{e.onCloseAutoFocus?.(a),a.defaultPrevented||(r.current||o.triggerRef.current?.focus(),a.preventDefault()),r.current=!1,i.current=!1},onInteractOutside:a=>{e.onInteractOutside?.(a),a.defaultPrevented||(r.current=!0,a.detail.originalEvent.type==="pointerdown"&&(i.current=!0));const d=a.target;o.triggerRef.current?.contains(d)&&a.preventDefault(),a.detail.originalEvent.type==="focusin"&&i.current&&a.preventDefault()}})}),Z=s.forwardRef((e,t)=>{const{__scopeDialog:o,trapFocus:r,onOpenAutoFocus:i,onCloseAutoFocus:a,...d}=e,l=g(x,o),u=s.useRef(null),c=P(t,u);return xe(),n.jsxs(n.Fragment,{children:[n.jsx(he,{asChild:!0,loop:!0,trapped:r,onMountAutoFocus:i,onUnmountAutoFocus:a,children:n.jsx(ve,{role:"dialog",id:l.contentId,"aria-describedby":l.descriptionId,"aria-labelledby":l.titleId,"data-state":W(l.open),...d,ref:c,onDismiss:()=>l.onOpenChange(!1)})}),n.jsxs(n.Fragment,{children:[n.jsx(Pe,{titleId:l.titleId}),n.jsx(Me,{contentRef:u,descriptionId:l.descriptionId})]})]})}),L="DialogTitle",J=s.forwardRef((e,t)=>{const{__scopeDialog:o,...r}=e,i=g(L,o);return n.jsx(N.h2,{id:i.titleId,...r,ref:t})});J.displayName=L;var Q="DialogDescription",ee=s.forwardRef((e,t)=>{const{__scopeDialog:o,...r}=e,i=g(Q,o);return n.jsx(N.p,{id:i.descriptionId,...r,ref:t})});ee.displayName=Q;var te="DialogClose",ne=s.forwardRef((e,t)=>{const{__scopeDialog:o,...r}=e,i=g(te,o);return n.jsx(N.button,{type:"button",...r,ref:t,onClick:v(e.onClick,()=>i.onOpenChange(!1))})});ne.displayName=te;function W(e){return e?"open":"closed"}var oe="DialogTitleWarning",[Ye,re]=ye(oe,{contentName:x,titleName:L,docsSlug:"dialog"}),Pe=({titleId:e})=>{const t=re(oe),o=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return s.useEffect(()=>{e&&(document.getElementById(e)||console.error(o))},[o,e]),null},we="DialogDescriptionWarning",Me=({contentRef:e,descriptionId:t})=>{const r=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${re(we).contentName}}.`;return s.useEffect(()=>{const i=e.current?.getAttribute("aria-describedby");t&&i&&(document.getElementById(t)||console.warn(r))},[r,e,t]),null},Se=H,Fe=z,Be=K,ae=X,ie=Y,se=J,le=ee,Le=ne;/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const We=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],ke=Ce("x",We),S=Se,k=Fe,Ue=Be,U=s.forwardRef(({className:e,...t},o)=>n.jsx(ae,{ref:o,className:h("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...t}));U.displayName=ae.displayName;const y=s.forwardRef(({className:e,children:t,...o},r)=>n.jsxs(Ue,{children:[n.jsx(U,{}),n.jsxs(ie,{ref:r,className:h("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[--color-border] bg-[--color-background] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",e),...o,children:[t,n.jsxs(Le,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-[--color-background] transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[--color-ring] focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",children:[n.jsx(ke,{className:"h-4 w-4"}),n.jsx("span",{className:"sr-only",children:"Close"})]})]})]}));y.displayName=ie.displayName;const C=({className:e,...t})=>n.jsx("div",{className:h("flex flex-col space-y-1.5 text-center sm:text-left",e),...t});C.displayName="DialogHeader";const j=({className:e,...t})=>n.jsx("div",{className:h("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",e),...t});j.displayName="DialogFooter";const T=s.forwardRef(({className:e,...t},o)=>n.jsx(se,{ref:o,className:h("text-lg font-semibold leading-none tracking-tight text-[--color-foreground]",e),...t}));T.displayName=se.displayName;const R=s.forwardRef(({className:e,...t},o)=>n.jsx(le,{ref:o,className:h("text-sm text-[--color-muted-foreground]",e),...t}));R.displayName=le.displayName;U.__docgenInfo={description:"",methods:[]};y.__docgenInfo={description:"",methods:[]};C.__docgenInfo={description:"",methods:[],displayName:"DialogHeader"};j.__docgenInfo={description:"",methods:[],displayName:"DialogFooter"};T.__docgenInfo={description:"",methods:[]};R.__docgenInfo={description:"",methods:[]};const Ze={title:"UI/Dialog",component:S,tags:["autodocs"],argTypes:{open:{control:"boolean",description:"Control dialog open state"}}},O={render:()=>n.jsxs(S,{children:[n.jsx(k,{asChild:!0,children:n.jsx(m,{children:"Open Dialog"})}),n.jsxs(y,{children:[n.jsxs(C,{children:[n.jsx(T,{children:"Dialog Title"}),n.jsx(R,{children:"This is a dialog description. It provides additional context about the dialog."})]}),n.jsx("div",{className:"py-4",children:n.jsx("p",{children:"Dialog content goes here."})}),n.jsxs(j,{children:[n.jsx(m,{variant:"secondary",children:"Cancel"}),n.jsx(m,{children:"Confirm"})]})]})]})},E={render:()=>n.jsxs(S,{children:[n.jsx(k,{asChild:!0,children:n.jsx(m,{children:"Open Dialog"})}),n.jsxs(y,{children:[n.jsxs(C,{children:[n.jsx(T,{children:"Terms of Service"}),n.jsx(R,{children:"Please read and accept the terms to continue."})]}),n.jsxs("div",{className:"py-4 max-h-60 overflow-y-auto",children:[n.jsx("p",{className:"mb-4",children:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}),n.jsx("p",{className:"mb-4",children:"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}),n.jsx("p",{className:"mb-4",children:"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."}),n.jsx("p",{children:"Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."})]}),n.jsxs(j,{children:[n.jsx(m,{variant:"secondary",children:"Cancel"}),n.jsx(m,{children:"Accept"})]})]})]})},I={render:()=>n.jsxs(S,{children:[n.jsx(k,{asChild:!0,children:n.jsx(m,{variant:"danger",children:"Delete Item"})}),n.jsxs(y,{children:[n.jsxs(C,{children:[n.jsx(T,{children:"Are you sure?"}),n.jsx(R,{children:"This action cannot be undone. This will permanently delete the item."})]}),n.jsxs(j,{children:[n.jsx(m,{variant:"secondary",children:"Cancel"}),n.jsx(m,{variant:"danger",children:"Delete"})]})]})]})};O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <Dialog>\r
      <DialogTrigger asChild>\r
        <Button>Open Dialog</Button>\r
      </DialogTrigger>\r
      <DialogContent>\r
        <DialogHeader>\r
          <DialogTitle>Dialog Title</DialogTitle>\r
          <DialogDescription>\r
            This is a dialog description. It provides additional context about the dialog.\r
          </DialogDescription>\r
        </DialogHeader>\r
        <div className="py-4">\r
          <p>Dialog content goes here.</p>\r
        </div>\r
        <DialogFooter>\r
          <Button variant="secondary">Cancel</Button>\r
          <Button>Confirm</Button>\r
        </DialogFooter>\r
      </DialogContent>\r
    </Dialog>
}`,...O.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => <Dialog>\r
      <DialogTrigger asChild>\r
        <Button>Open Dialog</Button>\r
      </DialogTrigger>\r
      <DialogContent>\r
        <DialogHeader>\r
          <DialogTitle>Terms of Service</DialogTitle>\r
          <DialogDescription>\r
            Please read and accept the terms to continue.\r
          </DialogDescription>\r
        </DialogHeader>\r
        <div className="py-4 max-h-60 overflow-y-auto">\r
          <p className="mb-4">\r
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\r
          </p>\r
          <p className="mb-4">\r
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\r
          </p>\r
          <p className="mb-4">\r
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\r
          </p>\r
          <p>\r
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\r
          </p>\r
        </div>\r
        <DialogFooter>\r
          <Button variant="secondary">Cancel</Button>\r
          <Button>Accept</Button>\r
        </DialogFooter>\r
      </DialogContent>\r
    </Dialog>
}`,...E.parameters?.docs?.source}}};I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <Dialog>\r
      <DialogTrigger asChild>\r
        <Button variant="danger">Delete Item</Button>\r
      </DialogTrigger>\r
      <DialogContent>\r
        <DialogHeader>\r
          <DialogTitle>Are you sure?</DialogTitle>\r
          <DialogDescription>\r
            This action cannot be undone. This will permanently delete the item.\r
          </DialogDescription>\r
        </DialogHeader>\r
        <DialogFooter>\r
          <Button variant="secondary">Cancel</Button>\r
          <Button variant="danger">Delete</Button>\r
        </DialogFooter>\r
      </DialogContent>\r
    </Dialog>
}`,...I.parameters?.docs?.source}}};const Je=["Default","WithLongContent","ConfirmationDialog"];export{I as ConfirmationDialog,O as Default,E as WithLongContent,Je as __namedExportsOrder,Ze as default};
