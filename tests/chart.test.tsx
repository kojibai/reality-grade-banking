// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { ValueChart } from '../src/components/ValueChart';
import {sampleChartIndices} from '../src/core/chart-history';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('retains a valid chart render when a hovered selection outlives keyboard period activation', () => {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  function PeriodChart() { const [short, setShort] = useState(false); return <><ValueChart values={Array.from({ length: short ? 8 : 24 }, (_, i) => i + 1)} /><button onClick={() => setShort(true)}>1W</button></>; }
  act(() => root.render(<PeriodChart />));
  const button = host.querySelector('button')!; button.focus();
  const svg = host.querySelector('svg')!;
  Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ left: 0, width: 320 }) });
  act(() => svg.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 319 })));
  expect(() => act(() => button.click())).not.toThrow();
  expect(host.querySelector('svg')?.getAttribute('aria-label')).toContain('to 8');
  act(() => root.unmount()); host.remove();
});
it('shows exact touch tooltips and keeps an isolated live balance point centered', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<ValueChart values={[123]} tooltip={() => ({ value: '$123.00', label: 'Today · Settlement' })} />));
    const svg = host.querySelector('svg')!;
    Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ left: 0, width: 320 }) });
    act(() => svg.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 140 })));
    expect(host.textContent).toContain('$123.00'); expect(host.textContent).toContain('Today · Settlement');
    expect(host.querySelector('circle')?.getAttribute('cx')).toBe('160');
    act(() => root.render(<ValueChart values={[]} />));
    expect(host.innerHTML).not.toContain('NaN'); expect(host.innerHTML).not.toContain('undefined');
  } finally { act(() => root.unmount()); }
});
it('holds sparse values until their dated change without drawing an interpolated increase',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{
  act(()=>root.render(<ValueChart values={[10,100]} interpolation="step"/>));
  const line=host.querySelector('path[fill="none"]')!.getAttribute('d')!;
  expect(line).toContain('H308 V12');expect(line).not.toContain('C');
  act(()=>root.render(<ValueChart values={[10,100]}/>));expect(host.querySelector('path[fill="none"]')!.getAttribute('d')).toContain('C');
 }finally{act(()=>root.unmount());}
});
it('renders every temporal step instead of moving omitted transitions to a later sample',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{
  const values=Array.from({length:500},(_,i)=>i+1);
  act(()=>root.render(<ValueChart values={values} times={values.map(value=>value*1000)} interpolation="step"/>));
  const line=host.querySelector('path[fill="none"]')!.getAttribute('d')!;
  expect((line.match(/H/g)??[]).length).toBe(values.length-1);
 }finally{act(()=>root.unmount());}
});
it('keeps the inspection marker on a displayed line vertex after long-history sampling',()=>{
 const host=document.createElement('div'),root=createRoot(host),values=Array.from({length:1000},(_,i)=>100+Math.sin(i/3)*30),drawn=new Set(sampleChartIndices(values,320));
 const omitted=values.findIndex((_,i)=>i>100&&i<800&&!drawn.has(i));expect(omitted).toBeGreaterThan(100);
 try{
  act(()=>root.render(<ValueChart values={values} tooltip={index=>({value:String(values[index]),label:'Recorded point '+index})}/>));
  const svg=host.querySelector('svg')!;Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({left:0,width:320})});
  act(()=>svg.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,clientX:12+omitted/999*296})));
  const circle=host.querySelector('g circle')!,x=Number(circle.getAttribute('cx')),y=Number(circle.getAttribute('cy')),line=host.querySelector('path[fill="none"]')!.getAttribute('d')!;
  const vertices=[...line.matchAll(/[MC]([^MC]+)/g)].map(match=>match[1].trim().split(/[ ,]+/).map(Number).slice(-2));
  expect(vertices.some(([px,py])=>Math.abs(px-x)<1e-8&&Math.abs(py-y)<1e-8)).toBe(true);
 }finally{act(()=>root.unmount());}
});
