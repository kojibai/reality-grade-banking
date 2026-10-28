// @vitest-environment happy-dom
import{act}from'react';import{createRoot}from'react-dom/client';import{it,expect,vi}from'vitest';
import{StartMeetingPage}from'../src/features/meeting/StartMeetingPage';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('does not create an identity or room before the person chooses Enter on the entrance',async()=>{
 const host=document.createElement('div'),root=createRoot(host),start=vi.fn(async()=>'/meet/accepted/'),navigate=vi.fn(),entry={importIdentity:vi.fn(),recoverPbi:vi.fn()};
 try{await act(async()=>root.render(<StartMeetingPage start={start} navigate={navigate} entry={entry as never}/>));expect(start).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();
 const enter=[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Enter'))!;expect(enter).toBeDefined();await act(async()=>enter.click());expect(start).toHaveBeenCalledOnce();expect(navigate).toHaveBeenCalledWith('/meet/accepted/');
 }finally{act(()=>root.unmount());}
});
