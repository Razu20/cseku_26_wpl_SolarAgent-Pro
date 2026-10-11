/* eslint-disable no-undef */
import { NextRequest, NextResponse } from 'next/server';

export type Request = {
  method: string;
  body: any;
  params: Record<string, string>;
  query: Record<string, any>;
  headers: Record<string, string>;
  user?: any;
};
export type Response = { status: (code:number)=>Response; json:(data:any)=>Response; send:(data?:any)=>Response; redirect:(url:string)=>Response; headers?: Headers };
export type NextFunction = (error?: unknown)=>void;
type Handler = (req: Request, res: Response, next: NextFunction)=>unknown;
type Layer = { method?: string; path:string; handlers: Handler[]; router?: Router };

function pattern(path:string, partial=false) {
  if (partial && (!path || path === '/')) return { re: /^\/(?:.*)?$/, keys: [] };
  const keys:string[]=[];
  const source=path.split('/').filter(Boolean).map(part=> {
    if (part.startsWith(':')) { keys.push(part.slice(1)); return '([^/]+)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }).join('/');
  return { re:new RegExp(`^/${source}${partial?'(?:/|$)':'/?$'}`), keys };
}
export class Router {
  layers: Layer[]=[];
  get(path:string,...handlers:Handler[]) { this.layers.push({method:'GET',path,handlers}); return this; }
  post(path:string,...handlers:Handler[]) { this.layers.push({method:'POST',path,handlers}); return this; }
  patch(path:string,...handlers:Handler[]) { this.layers.push({method:'PATCH',path,handlers}); return this; }
  put(path:string,...handlers:Handler[]) { this.layers.push({method:'PUT',path,handlers}); return this; }
  delete(path:string,...handlers:Handler[]) { this.layers.push({method:'DELETE',path,handlers}); return this; }
  use(path:string|string[], ...handlers:any[]) {
    const paths=Array.isArray(path)?path:[path];
    for (const p of paths) for (const h of handlers) this.layers.push(h instanceof Router ? {path:p,handlers:[],router:h} : {path:p,handlers:[h]});
    return this;
  }
  async dispatch(req:Request,res:Response, pathname:string, prefix=''):Promise<boolean> {
    for (const layer of this.layers) {
      const full=`${prefix}${layer.path==='/'?'':layer.path}` || '/';
      const match=pattern(full, !!layer.router || !layer.method).re.exec(pathname);
      if (!match || (layer.method && layer.method!==req.method)) continue;
      const keys=pattern(full, !!layer.router || !layer.method).keys;
      const params={...req.params}; keys.forEach((k,i)=>{req.params[k]=decodeURIComponent(match[i+1]);});
      if (layer.router) { if (await layer.router.dispatch(req,res,pathname,full)) return true; Object.assign(req.params,params); continue; }
      let index=0; let ended=false;
      const next:NextFunction=async (error?)=>{ if(error) throw error; const h=layer.handlers[index++]; if(h) await h(req,res,next); else ended=true; };
      try { await next(); } catch(error) { console.error(error); if(!ended) res.status(500).json({error:'internal_server_error'}); }
      if ((res as any).statusCode !== undefined || ended) return true;
    }
    return false;
  }
}
export function createRequest(request:NextRequest, body:any):Request {
  const query:Record<string,any>={}; request.nextUrl.searchParams.forEach((v,k)=>{query[k]=v;});
  const headers:Record<string,string>={}; request.headers.forEach((v,k)=>{headers[k]=v;});
  return {
    method: request.method,
    body,
    params: {},
    query,
    headers,
  };
}
export function createResponse():Response & {response?:NextResponse; statusCode?:number} {
  const state:any={statusCode:200, headers:new Headers()}; 
  const out:any={status(code:number){state.statusCode=code; return out;},json(data:any){state.response=NextResponse.json(data,{status:state.statusCode,headers:state.headers}); return out;},send(data:any=''){state.response=new NextResponse(typeof data==='string'?data:JSON.stringify(data),{status:state.statusCode,headers:state.headers}); return out;}}; out.redirect=(url:string)=>{state.response=NextResponse.redirect(url,state.statusCode); return out;};
  Object.defineProperties(out,{response:{get:()=>state.response},statusCode:{get:()=>state.statusCode}}); return out;
}






