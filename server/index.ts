import { createClient } from '@supabase/supabase-js';
import { parseAction } from '../shared/game';
interface Env {SUPABASE_URL?:string;SUPABASE_ANON_KEY?:string;ASSETS?:{fetch:(r:Request)=>Promise<Response>}}
declare const EMBEDDED_ASSETS:Record<string,string>;
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function api(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url), path=url.pathname;
 const configured=!!(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY);
 if(path==='/api/config'&&request.method==='GET')return json({configured,url:configured?env.SUPABASE_URL:null,key:configured?env.SUPABASE_ANON_KEY:null});
 if(!configured)return json({error:'Máy chủ chưa được kết nối Supabase. Bạn có thể thử bản chơi thử.'},503);
 if(request.method!=='GET'&&request.method!=='POST')return json({error:'Phương thức không hỗ trợ.'},405);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Nguồn yêu cầu không hợp lệ.'},403);
 const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return json({error:'Vui lòng đăng nhập.'},401);
 const auth=createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return json({error:'Phiên đăng nhập đã hết hạn.'},401);
 const db=createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 if(path==='/api/farm'&&request.method==='GET'){
  const name=typeof user.user_metadata.name==='string'?user.user_metadata.name:'Người làm vườn';
  const {data,error}=await db.rpc('ensure_farm',{p_user:user.id,p_name:name});
  if(error){console.error('ensure_farm',error.code);return json({error:'Không tải được nông trại. Kiểm tra migration Supabase.'},500)}return json(data);
 }
 if(path==='/api/leaderboard'&&request.method==='GET'){
  const {data,error}=await db.rpc('farm_leaderboard');
  return error?json({error:'Chưa tải được bảng xếp hạng.'},500):json(data);
 }
 if(path==='/api/actions'&&request.method==='POST'){
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'Yêu cầu phải là JSON.'},415);
  const raw=await request.text();if(raw.length>2048)return json({error:'Yêu cầu quá lớn.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'JSON không hợp lệ.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Yêu cầu không hợp lệ.'},400);
  let action;try{action=parseAction(body.action)}catch(e){return json({error:(e as Error).message},400)}
  if(typeof body.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))return json({error:'Mã thao tác không hợp lệ.'},400);
  const {data,error}=await db.rpc('perform_farm_action',{p_user:user.id,p_request:body.requestId,p_action:action});
  if(error){if(error.code==='P0001')return json({error:error.message},409);console.error('perform_farm_action',error.code);return json({error:'Không lưu được thao tác. Vui lòng thử lại.'},500)}return json(data);
 }
 return json({error:'Không tìm thấy API.'},404);
}
export default {async fetch(request:Request,env:Env):Promise<Response>{
 try{
 if(new URL(request.url).pathname.startsWith('/api/'))return await api(request,env);
 if(env.ASSETS)return env.ASSETS.fetch(request);
 let path=new URL(request.url).pathname;
 if(!EMBEDDED_ASSETS[path]){if(path.includes('.'))return new Response('Not found',{status:404});path='/index.html'}
 const b64=EMBEDDED_ASSETS[path];if(!b64)return new Response('Not found',{status:404});
 const ext=path.split('.').pop();const mime:Record<string,string>={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',png:'image/png'};
 const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 return new Response(bytes,{headers:{'Content-Type':mime[ext||'']||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':path==='/index.html'?'no-cache':'public, max-age=31536000, immutable'}});
 }catch(e){console.error('request failed',e instanceof Error?e.message:'unknown');return json({error:'Máy chủ đang bận. Vui lòng thử lại.'},500)}
}};
